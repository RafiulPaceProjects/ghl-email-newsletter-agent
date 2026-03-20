import assert from 'node:assert/strict';
import {rm} from 'node:fs/promises';
import {afterEach, beforeEach, test} from 'node:test';

import {viewPreviewUrlDumpFromEnv} from '../src/viewPreviewUrl.js';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_TOKEN = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
const ORIGINAL_LOCATION_ID = process.env.GHL_LOCATION_ID;

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

beforeEach(() => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
});

afterEach(() => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
});

void test('returns SELECTION_FAILED when template selection cannot start', async () => {
  delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  process.env.GHL_LOCATION_ID = 'loc-123';

  const result = await viewPreviewUrlDumpFromEnv();

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'SELECTION_FAILED');
});

void test('returns INVALID_PREVIEW_URL for malformed preview links', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  installFetchMock([
    new Response(JSON.stringify({builders: []}), {status: 200}),
    new Response(JSON.stringify({users: []}), {status: 200}),
    new Response(
      JSON.stringify({
        builders: [
          {
            id: 'tmpl-1',
            name: 'Weekly Update',
            previewUrl: 'not-a-url',
            templateType: 'builder',
            isPlainText: false,
            updatedBy: 'qa',
            dateAdded: '2026-03-20T00:00:00.000Z',
            lastUpdated: '2026-03-20T00:00:00.000Z',
            version: '2',
          },
        ],
        total: [{total: 1}],
      }),
      {status: 200},
    ),
    new Response(
      JSON.stringify({
        builders: [
          {
            id: 'tmpl-1',
            name: 'Weekly Update',
            previewUrl: 'not-a-url',
            templateType: 'builder',
            isPlainText: false,
            updatedBy: 'qa',
            dateAdded: '2026-03-20T00:00:00.000Z',
            lastUpdated: '2026-03-20T00:00:00.000Z',
            version: '2',
          },
        ],
        total: [{total: 1}],
      }),
      {status: 200},
    ),
  ]);

  const result = await viewPreviewUrlDumpFromEnv({
    templateName: 'Weekly Update',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_PREVIEW_URL');
});

void test('fetches preview HTML and writes it to disk', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  installFetchMock([
    new Response(JSON.stringify({builders: []}), {status: 200}),
    new Response(JSON.stringify({users: []}), {status: 200}),
    new Response(
      JSON.stringify({
        builders: [
          {
            id: 'tmpl-1',
            name: 'Weekly Update',
            previewUrl: 'https://example.com/preview-1',
            templateType: 'builder',
            isPlainText: false,
            updatedBy: 'qa',
            dateAdded: '2026-03-20T00:00:00.000Z',
            lastUpdated: '2026-03-20T00:00:00.000Z',
            version: '2',
          },
        ],
        total: [{total: 1}],
      }),
      {status: 200},
    ),
    new Response(
      JSON.stringify({
        builders: [
          {
            id: 'tmpl-1',
            name: 'Weekly Update',
            previewUrl: 'https://example.com/preview-1',
            templateType: 'builder',
            isPlainText: false,
            updatedBy: 'qa',
            dateAdded: '2026-03-20T00:00:00.000Z',
            lastUpdated: '2026-03-20T00:00:00.000Z',
            version: '2',
          },
        ],
        total: [{total: 1}],
      }),
      {status: 200},
    ),
    new Response('<html><body><div>Hello newsletter</div></body></html>', {
      status: 200,
    }),
  ]);

  const result = await viewPreviewUrlDumpFromEnv({
    templateName: 'Weekly Update',
  });

  assert.equal(result.ok, true);
  assert.match(result.outputPath ?? '', /tmpl-1-.*\.html$/);
  await rm(result.outputPath ?? '', {force: true});
});
