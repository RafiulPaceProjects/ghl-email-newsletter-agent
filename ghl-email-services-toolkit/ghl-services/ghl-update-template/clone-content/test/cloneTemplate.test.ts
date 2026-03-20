/**
 * Clone-flow tests model the request pipeline without hitting live GHL APIs:
 * select the base template, fetch preview HTML, create a draft shell, then
 * update that draft with the fetched HTML.
 */
import assert from 'node:assert/strict';
import {afterEach, beforeEach, test} from 'node:test';

import {cloneTemplateFromEnv} from '../src/cloneTemplate.js';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_TOKEN = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
const ORIGINAL_LOCATION_ID = process.env.GHL_LOCATION_ID;

// Each test mutates process env to simulate different entry conditions, so
// restore the original auth context before and after every scenario.
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

// Queue deterministic fetch responses so each assertion can map a specific
// outbound request to a specific stage in the clone pipeline.
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

// Reset global state before each test starts so one mocked pipeline cannot
// leak requests or env changes into the next scenario.
beforeEach(() => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
});

afterEach(() => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
});

// The clone flow must stop immediately if the upstream selection step cannot
// produce a base template from env-backed configuration.
void test('returns SELECTION_FAILED when auth is not available', async () => {
  delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  process.env.GHL_LOCATION_ID = 'loc-123';

  const result = await cloneTemplateFromEnv({
    templateName: 'Weekly Update',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'SELECTION_FAILED');
});

// This test walks the happy-path pipeline end to end:
// 1. selection bootstrap calls from view-content
// 2. preview HTML fetch from the chosen template
// 3. create empty draft shell
// 4. update that draft with the fetched HTML
void test('clones a new draft from the base template preview HTML', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  const observed: Array<{url: string; init?: RequestInit}> = [];
  installFetchMock(
    [
      // view-content auth/bootstrap request sequence
      new Response(JSON.stringify({builders: []}), {status: 200}),
      new Response(JSON.stringify({users: []}), {status: 200}),
      // view-content template selection result
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
      // clone-content preview HTML fetch
      new Response('<html><body><div>Base template html</div></body></html>', {
        status: 200,
      }),
      // clone-content create draft shell
      new Response(JSON.stringify({id: 'tmpl-clone'}), {status: 201}),
      // clone-content upload preview HTML into the new draft
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

  // The create step should only establish the new draft identity.
  const createBody = JSON.parse(String(observed[4]?.init?.body));
  assert.deepEqual(createBody, {
    locationId: 'loc-123',
    name: 'Weekly Update Draft',
    type: 'html',
  });

  // The update step should carry the fetched preview HTML into the new draft.
  const updateBody = JSON.parse(String(observed[5]?.init?.body));
  assert.equal(updateBody.locationId, 'loc-123');
  assert.equal(updateBody.templateId, 'tmpl-clone');
  assert.equal(updateBody.editorType, 'html');
  assert.match(String(updateBody.html), /Base template html/);
});
