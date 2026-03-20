import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {afterEach, test} from 'node:test';

/**
 * These tests pin down the current local-only injector contract:
 * one preview HTML file in, one slot token replaced, one HTML artifact out.
 * They intentionally do not model multi-block rendering yet because that
 * feature does not exist in the implementation.
 */
const currentDir = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(currentDir, '../inject-sample.mjs');
const sampleBlockPath = resolve(currentDir, '../sample-newsletter-block.jinja.html');

const tempDirs = [];

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'inject-sample-test-'));
  tempDirs.push(dir);
  return dir;
}

// Spawn the CLI exactly as a user would so stdout JSON and exit codes remain
// part of the tested contract.
async function runInjectSample(args, cwd) {
  return await new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

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

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})),
  );
});

// Happy path: inject the bundled sample block into the single allowed slot.
void test('succeeds with an explicit preview html file containing exactly one slot token', async () => {
  const tempDir = await makeTempDir();
  const previewPath = resolve(tempDir, 'preview.html');
  await writeFile(
    previewPath,
    '<html><body>before [[[NEWSLETTER_BODY_SLOT]]] after</body></html>',
    'utf-8',
  );

  const result = await runInjectSample(['--preview-html', previewPath], currentDir);

  assert.equal(result.code, 0);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.sourcePreview, previewPath);

  const outputHtml = await readFile(result.json.outputPath, 'utf-8');
  const sampleBlock = await readFile(sampleBlockPath, 'utf-8');
  assert.match(outputHtml, new RegExp(sampleBlock.trim().slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(outputHtml, /\[\[\[NEWSLETTER_BODY_SLOT]]]/);
});

// Validation failures keep the current injector predictable before it writes an
// artifact that downstream publish scripts might accidentally use.
void test('fails when --preview-html is missing', async () => {
  const tempDir = await makeTempDir();

  const result = await runInjectSample([], tempDir);

  assert.equal(result.code, 1);
  assert.equal(result.json.ok, false);
  assert.equal(result.json.message, 'Missing required --preview-html argument.');
});

void test('fails when the preview path does not exist', async () => {
  const tempDir = await makeTempDir();
  const missingPath = resolve(tempDir, 'missing.html');

  const result = await runInjectSample(['--preview-html', missingPath], tempDir);

  assert.equal(result.code, 1);
  assert.equal(result.json.ok, false);
  assert.match(result.json.message, /Preview HTML file not found:/);
});

void test('fails when the preview path is not an html file', async () => {
  const tempDir = await makeTempDir();
  const previewPath = resolve(tempDir, 'preview.txt');
  await writeFile(previewPath, 'text', 'utf-8');

  const result = await runInjectSample(['--preview-html', previewPath], tempDir);

  assert.equal(result.code, 1);
  assert.equal(result.json.ok, false);
  assert.match(result.json.message, /must point to an \.html file/);
});

void test('fails when the slot token is missing', async () => {
  const tempDir = await makeTempDir();
  const previewPath = resolve(tempDir, 'preview.html');
  await writeFile(previewPath, '<html><body>no slot</body></html>', 'utf-8');

  const result = await runInjectSample(['--preview-html', previewPath], tempDir);

  assert.equal(result.code, 1);
  assert.equal(result.json.ok, false);
  assert.equal(
    result.json.message,
    'Expected exactly 1 slot token [[[NEWSLETTER_BODY_SLOT]]], found 0.',
  );
});

void test('fails when the slot token appears more than once', async () => {
  const tempDir = await makeTempDir();
  const previewPath = resolve(tempDir, 'preview.html');
  await writeFile(
    previewPath,
    '<html><body>[[[NEWSLETTER_BODY_SLOT]]] and [[[NEWSLETTER_BODY_SLOT]]]</body></html>',
    'utf-8',
  );

  const result = await runInjectSample(['--preview-html', previewPath], tempDir);

  assert.equal(result.code, 1);
  assert.equal(result.json.ok, false);
  assert.equal(
    result.json.message,
    'Expected exactly 1 slot token [[[NEWSLETTER_BODY_SLOT]]], found 2.',
  );
});
