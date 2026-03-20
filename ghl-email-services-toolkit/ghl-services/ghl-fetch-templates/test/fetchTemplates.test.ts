import assert from 'node:assert/strict';
import {access, readFile, rm, writeFile} from 'node:fs/promises';
import {afterEach, beforeEach, test} from 'node:test';

import {
  fetchAndSaveTemplatesFromEnv,
  fetchTemplatesFromEnv,
} from '../src/fetchTemplates.js';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_TOKEN = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
const ORIGINAL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const OUTPUT_PATH =
  '/Users/rafiulhaider/go/ghl-email-agent/ghl-email-services-toolkit/ghl-services/ghl-fetch-templates/data/templates.json';

let originalOutputContent: string | null = null;

function restoreEnv(): void {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  } else {
    process.env.GHL_PRIVATE_INTEGRATION_TOKEN = ORIGINAL_TOKEN;
  }

  if (ORIGINAL_LOCATION_ID === undefined) {
    delete process.env.GHL_LOCATION_ID;
  } else {
    process.env.GHL_LOCATION_ID = ORIGINAL_LOCATION_ID;
  }
}

async function captureOutputState(): Promise<void> {
  try {
    originalOutputContent = await readFile(OUTPUT_PATH, 'utf-8');
  } catch {
    originalOutputContent = null;
  }
}

async function restoreOutputState(): Promise<void> {
  if (originalOutputContent === null) {
    await rm(OUTPUT_PATH, {force: true});
    return;
  }

  await writeFile(OUTPUT_PATH, originalOutputContent, 'utf-8');
}

function installFetchMock(steps: Array<Response | Error>): void {
  global.fetch = (async () => {
    const next = steps.shift();
    if (!next) {
      throw new Error('Unexpected fetch call.');
    }

    if (next instanceof Error) {
      throw next;
    }

    return next;
  }) as typeof global.fetch;
}

beforeEach(async () => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
  await captureOutputState();
});

afterEach(async () => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
  await restoreOutputState();
});

void test('stops early when auth prerequisites are missing', async () => {
  delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  process.env.GHL_LOCATION_ID = 'loc-123';

  const result = await fetchTemplatesFromEnv();

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'AUTH_CHECK_FAILED');
  assert.match(result.message, /Auth check failed/);
});

void test('fetches template inventory after auth succeeds', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  installFetchMock([
    new Response(JSON.stringify({builders: []}), {status: 200}),
    new Response(JSON.stringify({users: []}), {status: 200}),
    new Response(
      JSON.stringify({
        builders: [{id: 'tmpl-1', name: 'Weekly Update'}],
        total: [{total: 1}],
      }),
      {status: 200},
    ),
  ]);

  const result = await fetchTemplatesFromEnv();

  assert.equal(result.ok, true);
  assert.equal(result.templateCount, 1);
  assert.equal(result.status, 200);
  assert.equal(result.locationId, 'loc-123');
});

void test('writes fetched templates to the snapshot file', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  installFetchMock([
    new Response(JSON.stringify({builders: []}), {status: 200}),
    new Response(JSON.stringify({users: []}), {status: 200}),
    new Response(
      JSON.stringify({
        builders: [{id: 'tmpl-1', name: 'Weekly Update'}],
        total: [{total: 1}],
      }),
      {status: 200},
    ),
  ]);

  const result = await fetchAndSaveTemplatesFromEnv();

  assert.equal(result.ok, true);
  assert.equal(result.fileWritten, true);
  await access(OUTPUT_PATH);

  const saved = JSON.parse(await readFile(OUTPUT_PATH, 'utf-8')) as {
    templateCount: number | null;
    payload: {builders: Array<{id: string}>};
  };

  assert.equal(saved.templateCount, 1);
  assert.equal(saved.payload.builders[0]?.id, 'tmpl-1');
});

void test('maps fetch runtime failures to NETWORK_ERROR', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  installFetchMock([
    new Response(JSON.stringify({builders: []}), {status: 200}),
    new Response(JSON.stringify({users: []}), {status: 200}),
    new Error('network timeout'),
  ]);

  const result = await fetchTemplatesFromEnv();

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'NETWORK_ERROR');
  assert.match(result.diagnostics.responseSnippet ?? '', /network timeout/);
});
