/**
 * Wrapper script that turns the clone step into a publish step: it runs the
 * clone CLI, reads the latest injected HTML artifact, and overwrites the new
 * draft with that artifact. Each stage returns JSON so other agents can trace
 * clone and publish boundaries independently.
 */
import {spawnSync} from 'node:child_process';
import {readdir, readFile, stat} from 'node:fs/promises';
import {dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Allow local overrides for script orchestration while keeping the production
// defaults aligned with the LeadConnector API and adjacent package layout.
const BASE_URL = process.env.PUBLISH_INJECTED_DRAFT_BASE_URL
  ? process.env.PUBLISH_INJECTED_DRAFT_BASE_URL
  : 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

const currentDir = dirname(fileURLToPath(import.meta.url));
const cliPath = process.env.PUBLISH_INJECTED_DRAFT_CLI_PATH
  ? resolve(process.cwd(), process.env.PUBLISH_INJECTED_DRAFT_CLI_PATH)
  : resolve(currentDir, './src/clone-template.cli.ts');
const envPath = process.env.PUBLISH_INJECTED_DRAFT_ENV_PATH
  ? resolve(process.cwd(), process.env.PUBLISH_INJECTED_DRAFT_ENV_PATH)
  : resolve(currentDir, '../../authentication-ghl/.env');
const injectionOutputDir = process.env.PUBLISH_INJECTED_DRAFT_INJECTION_DIR
  ? resolve(process.cwd(), process.env.PUBLISH_INJECTED_DRAFT_INJECTION_DIR)
  : resolve(currentDir, '../inject-content/injection-output');

// Reuse the auth `.env` file rather than hardcoding token/location in the
// wrapper so clone and publish read from the same configuration source.
function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    map[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return map;
}

// Child-process output is expected to be JSON; return null when the wrapper
// needs to emit its own machine-readable failure envelope instead.
function extractJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Keep stderr/stdout diagnostics compact when surfacing wrapper failures.
function cleanSnippet(raw) {
  if (typeof raw !== 'string') {
    return null;
  }
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 280);
}

// Publish always targets the newest injected artifact, so discover that file
// at runtime instead of requiring callers to pass a specific HTML path.
async function findLatestInjectedHtml() {
  const entries = await readdir(injectionOutputDir, {withFileTypes: true});
  const htmlFiles = entries
    .filter(entry => entry.isFile() && extname(entry.name).toLowerCase() === '.html')
    .map(entry => entry.name);

  if (htmlFiles.length === 0) {
    throw new Error(`No injected HTML files found in ${injectionOutputDir}`);
  }

  const withTimes = await Promise.all(
    htmlFiles.map(async name => {
      const path = resolve(injectionOutputDir, name);
      const fileStat = await stat(path);
      return {name, path, mtimeMs: fileStat.mtimeMs};
    }),
  );

  withTimes.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withTimes[0];
}

// The publish step reuses the same POST shape as clone-content's update call,
// but swaps in the injected HTML artifact as the payload body.
async function callApi(url, token, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Version: API_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });

  const text = await response.text();
  const data = extractJson(text) || {raw: text};

  return {
    ok: response.ok,
    status: response.status,
    data,
    responseSnippet: typeof text === 'string' ? text.slice(0, 280) : null,
  };
}

async function main() {
  // Resolve the injected HTML before cloning so wrapper failures can always
  // identify the artifact that was intended for publication.
  const latestInjected = await findLatestInjectedHtml();
  const injectedHtml = await readFile(latestInjected.path, 'utf-8');

  // Run the clone CLI as a subprocess so this wrapper stays compatible with
  // the CLI contract instead of importing package internals directly.
  const clone = spawnSync(
    process.execPath,
    ['--import', 'tsx', cliPath, ...process.argv.slice(2)],
    {
      cwd: currentDir,
      encoding: 'utf8',
    },
  );

  if (clone.error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          message: clone.error.message,
          stage: 'cloneDraft',
          diagnostics: {
            stdout: cleanSnippet(clone.stdout),
            stderr: cleanSnippet(clone.stderr),
          },
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
    return;
  }

  // If the child did not return JSON, emit wrapper-owned diagnostics that
  // preserve the child stdout/stderr for troubleshooting.
  const cloneOutput = extractJson(clone.stdout || '');
  if (!cloneOutput || typeof cloneOutput !== 'object') {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          message:
            clone.status === 0
              ? 'Clone step did not return valid JSON.'
              : 'Clone step failed before returning valid JSON.',
          stage: 'cloneDraft',
          status: clone.status === null ? 1 : clone.status,
          diagnostics: {
            stdout: cleanSnippet(clone.stdout),
            stderr: cleanSnippet(clone.stderr),
          },
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
    return;
  }

  // Propagate clone failures unchanged so callers can see the original stage
  // result instead of a second wrapper-specific error.
  if (!cloneOutput.ok || !cloneOutput.clonedTemplate?.id) {
    process.stdout.write(`${JSON.stringify(cloneOutput, null, 2)}\n`);
    process.exitCode = clone.status === null ? 1 : clone.status;
    return;
  }

  const envRaw = await readFile(envPath, 'utf-8');
  const env = parseEnv(envRaw);
  const token =
    env.GHL_PRIVATE_INTEGRATION_TOKEN || process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId =
    cloneOutput.locationId || env.GHL_LOCATION_ID || process.env.GHL_LOCATION_ID;

  // Publishing requires the same auth context plus the clone-produced template
  // id, so validate those handoffs before issuing the final API call.
  if (!token || !locationId) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          message: 'Missing GHL_PRIVATE_INTEGRATION_TOKEN or GHL_LOCATION_ID.',
          stage: 'publishInjectedHtml',
          sourceInjectedHtml: latestInjected.path,
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
    return;
  }

  // Overwrite the freshly cloned draft with the latest injected HTML.
  const publish = await callApi(`${BASE_URL}/emails/builder/data`, token, {
    locationId,
    templateId: cloneOutput.clonedTemplate.id,
    html: injectedHtml,
    editorType: 'html',
    updatedBy: 'publish-injected-draft',
  });

  const result = {
    ok: publish.ok,
    stage: publish.ok ? null : 'publishInjectedHtml',
    message: publish.ok
      ? 'Draft created and overwritten with latest injected HTML.'
      : `Injected HTML publish failed (${publish.status}).`,
    sourceInjectedHtml: latestInjected.path,
    sourceInjectedHtmlBytes: injectedHtml.length,
    cloneDraft: cloneOutput,
    publishInjectedHtml: {
      status: publish.status,
      responseSnippet: publish.responseSnippet,
      data: publish.data,
    },
    templateId: cloneOutput.clonedTemplate.id,
    previewUrl:
      publish.data && typeof publish.data.previewUrl === 'string'
        ? publish.data.previewUrl
        : cloneOutput.clonedTemplate.previewUrl || null,
    templateDataDownloadUrl:
      publish.data && typeof publish.data.templateDataDownloadUrl === 'string'
        ? publish.data.templateDataDownloadUrl
        : cloneOutput.clonedTemplate.templateDataDownloadUrl || null,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = publish.ok ? 0 : 1;
}

main().catch(error => {
  // Preserve JSON output even for top-level wrapper failures such as missing
  // files or unexpected runtime errors.
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Unknown publish-injected-draft error',
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
});
