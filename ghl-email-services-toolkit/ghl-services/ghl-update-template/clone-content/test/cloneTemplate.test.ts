import assert from 'node:assert/strict';
import {afterEach, beforeEach, test} from 'node:test';

import {cloneTemplateFromEnv} from '../src/cloneTemplate.js';

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

function installFetchMock(
  steps: Array<Response | Error>,
  observed: Array<{url: string; init?: RequestInit}>,
): void {
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    observed.push({
      url:
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url,
      init,
    });

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

void test('returns SELECTION_FAILED when auth is not available', async () => {
  delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  process.env.GHL_LOCATION_ID = 'loc-123';

  const result = await cloneTemplateFromEnv({
    templateName: 'Weekly Update',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'SELECTION_FAILED');
});

void test('clones a new draft from the base template preview HTML', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  const observed: Array<{url: string; init?: RequestInit}> = [];
  installFetchMock(
    [
      new Response(JSON.stringify({builders: []}), {status: 200}),
      new Response(JSON.stringify({users: []}), {status: 200}),
      new Response(
        JSON.stringify({
          builders: [
            {
              id: 'tmpl-base',
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
      new Response('<html><body><div>Base template html</div></body></html>', {
        status: 200,
      }),
      new Response(JSON.stringify({id: 'tmpl-clone'}), {status: 201}),
      new Response(
        JSON.stringify({
          previewUrl: 'https://example.com/preview-clone',
          templateDataDownloadUrl: 'https://example.com/template-data-clone',
        }),
        {status: 201},
      ),
    ],
    observed,
  );

  const result = await cloneTemplateFromEnv({
    templateName: 'Weekly Update',
    draftName: 'Weekly Update Draft',
  });

  assert.equal(result.ok, true);
  assert.equal(result.clonedTemplate?.id, 'tmpl-clone');
  assert.equal(result.clonedTemplate?.name, 'Weekly Update Draft');
  assert.equal(result.clonedTemplate?.sourceTemplateId, 'tmpl-base');
  assert.equal(result.sourceHtmlLength, 55);

  assert.equal(observed[3]?.url, 'https://example.com/preview-1');

  const createBody = JSON.parse(String(observed[4]?.init?.body));
  assert.deepEqual(createBody, {
    locationId: 'loc-123',
    name: 'Weekly Update Draft',
    type: 'html',
  });

  const updateBody = JSON.parse(String(observed[5]?.init?.body));
  assert.equal(updateBody.locationId, 'loc-123');
  assert.equal(updateBody.templateId, 'tmpl-clone');
  assert.equal(updateBody.editorType, 'html');
  assert.match(String(updateBody.html), /Base template html/);
});
