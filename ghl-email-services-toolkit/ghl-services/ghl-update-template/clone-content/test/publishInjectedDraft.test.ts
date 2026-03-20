/**
 * Wrapper-script tests exercise the clone-then-publish boundary end to end
 * using temp files and a local HTTP server so the dataflow stays observable
 * without talking to live GoHighLevel services.
 */
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawn} from 'node:child_process';
import test from 'node:test';
import {createServer} from 'node:http';

const scriptPath = resolve(
  import.meta.dirname,
  '../publish-injected-draft.mjs',
);

const tempDirs: string[] = [];

// Each scenario gets its own workspace because the wrapper discovers the
// latest injected HTML file from disk at runtime.
async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'publish-injected-draft-test-'));
  tempDirs.push(dir);
  return dir;
}

// Spawn the wrapper as a real child process so tests validate its JSON/stdout
// contract, exit code propagation, and env/path override behavior together.
async function runScript(options: {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  args?: string[];
}): Promise<{code: number; stdout: string; stderr: string; json: unknown}> {
  return await new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [scriptPath, ...(options.args ?? [])],
      {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += String(chunk);
    });
    child.stderr.on('data', chunk => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', code => {
      resolveResult({
        code: code ?? 1,
        stdout,
        stderr,
        json: JSON.parse(stdout),
      });
    });
  });
}

// Remove all temp workspaces between tests so filesystem-discovery assertions
// remain deterministic.
test.afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})),
  );
});

// Happy path: a successful clone response should hand its template id into the
// publish request, which then uploads the latest injected HTML artifact.
void test('preserves successful child execution and returns success JSON', async () => {
  const tempDir = await makeTempDir();
  const cliPath = resolve(tempDir, 'fake-clone-success.mjs');
  const envPath = resolve(tempDir, '.env');
  const injectionDir = resolve(tempDir, 'injected');
  await writeFile(
    cliPath,
    `process.stdout.write(JSON.stringify({
      ok: true,
      locationId: 'loc-123',
      clonedTemplate: {
        id: 'tmpl-clone',
        previewUrl: 'https://example.com/preview-clone'
      }
    }) + '\\n');`,
    'utf-8',
  );
  await writeFile(
    envPath,
    'GHL_PRIVATE_INTEGRATION_TOKEN=test-token\nGHL_LOCATION_ID=loc-123\n',
    'utf-8',
  );
  await mkdir(injectionDir, {recursive: true});
  await writeFile(
    resolve(injectionDir, 'draft.html'),
    '<html>Injected</html>',
    'utf-8',
  );

  const requests: Array<{url: string; body: string}> = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += String(chunk);
    });
    req.on('end', () => {
      requests.push({
        url: req.url ?? '',
        body,
      });
      res.writeHead(201, {'Content-Type': 'application/json'});
      res.end(
        JSON.stringify({
          previewUrl: 'https://example.com/published-preview',
          templateDataDownloadUrl: 'https://example.com/template-data',
        }),
      );
    });
  });
  await new Promise<void>(resolveServer => {
    server.listen(0, '127.0.0.1', () => resolveServer());
  });

  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected http server address.');
    }

    const result = await runScript({
      cwd: tempDir,
      env: {
        PUBLISH_INJECTED_DRAFT_CLI_PATH: cliPath,
        PUBLISH_INJECTED_DRAFT_ENV_PATH: envPath,
        PUBLISH_INJECTED_DRAFT_INJECTION_DIR: injectionDir,
        PUBLISH_INJECTED_DRAFT_BASE_URL: `http://127.0.0.1:${address.port}`,
      },
    });

    assert.equal(result.code, 0);
    assert.equal((result.json as {ok: boolean}).ok, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.url, '/emails/builder/data');

    const body = JSON.parse(requests[0]?.body ?? '{}');
    assert.equal(body.templateId, 'tmpl-clone');
    assert.equal(body.locationId, 'loc-123');
    assert.match(String(body.html), /Injected/);
  } finally {
    await new Promise<void>((resolveServer, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolveServer();
      });
    });
  }
});

// If cloning already failed with structured JSON, the wrapper should return
// that same JSON instead of masking the original failure stage.
void test('preserves child failure exit code and JSON output', async () => {
  const tempDir = await makeTempDir();
  const cliPath = resolve(tempDir, 'fake-clone-failure.mjs');
  const injectionDir = resolve(tempDir, 'injected');
  await writeFile(
    cliPath,
    `process.stdout.write(JSON.stringify({
      ok: false,
      errorCode: 'SELECTION_FAILED',
      message: 'Selection failed'
    }) + '\\n');
    process.exitCode = 1;`,
    'utf-8',
  );
  await mkdir(injectionDir, {recursive: true});
  await writeFile(
    resolve(injectionDir, 'draft.html'),
    '<html>Injected</html>',
    'utf-8',
  );

  const result = await runScript({
    cwd: tempDir,
    env: {
      PUBLISH_INJECTED_DRAFT_CLI_PATH: cliPath,
      PUBLISH_INJECTED_DRAFT_INJECTION_DIR: injectionDir,
    },
  });

  assert.equal(result.code, 1);
  assert.deepEqual(result.json, {
    ok: false,
    errorCode: 'SELECTION_FAILED',
    message: 'Selection failed',
  });
});

// When the clone subprocess crashes before producing JSON, the wrapper owns
// the failure response and includes stderr for debugging.
void test('emits wrapper JSON when the child fails before returning JSON', async () => {
  const tempDir = await makeTempDir();
  const injectionDir = resolve(tempDir, 'injected');
  await mkdir(injectionDir, {recursive: true});
  await writeFile(
    resolve(injectionDir, 'draft.html'),
    '<html>Injected</html>',
    'utf-8',
  );

  const result = await runScript({
    cwd: tempDir,
    env: {
      PUBLISH_INJECTED_DRAFT_CLI_PATH: resolve(tempDir, 'missing-cli.mjs'),
      PUBLISH_INJECTED_DRAFT_INJECTION_DIR: injectionDir,
    },
  });

  assert.equal(result.code, 1);
  assert.equal((result.json as {ok: boolean}).ok, false);
  assert.equal(
    (result.json as {message: string}).message,
    'Clone step failed before returning valid JSON.',
  );
  assert.equal((result.json as {stage: string}).stage, 'cloneDraft');
  assert.match(
    String(
      (result.json as {diagnostics?: {stderr?: string | null}}).diagnostics
        ?.stderr,
    ),
    /Cannot find module|ERR_MODULE_NOT_FOUND/,
  );
});
