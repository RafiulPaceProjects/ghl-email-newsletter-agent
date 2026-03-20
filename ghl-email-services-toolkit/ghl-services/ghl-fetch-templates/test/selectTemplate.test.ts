import assert from 'node:assert/strict';
import {afterEach, beforeEach, test} from 'node:test';

import {
  fetchTemplateCandidatesFromEnv,
  runInteractiveTemplateSelection,
  selectTemplateFromEnv,
  type SelectableTemplate,
} from '../src/selectTemplate.js';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_TOKEN = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
const ORIGINAL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const BASE_TEMPLATES: SelectableTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Weekly Update',
    templateType: 'builder',
    previewUrl: 'https://example.com/preview-1',
    isPlainText: false,
    updatedBy: 'user-1',
    dateAdded: '2026-01-01T00:00:00.000Z',
    lastUpdated: '2026-01-02T00:00:00.000Z',
    version: '1',
  },
  {
    id: 'tmpl-2',
    name: 'Monthly Digest',
    templateType: 'builder',
    previewUrl: 'https://example.com/preview-2',
    isPlainText: false,
    updatedBy: 'user-2',
    dateAdded: '2026-01-03T00:00:00.000Z',
    lastUpdated: '2026-01-04T00:00:00.000Z',
    version: '2',
  },
];

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

function installSuccessfulFetch(
  templates: SelectableTemplate[] = BASE_TEMPLATES,
): void {
  installFetchMock([
    new Response(JSON.stringify({builders: []}), {status: 200}),
    new Response(JSON.stringify({users: []}), {status: 200}),
    new Response(JSON.stringify({builders: templates}), {status: 200}),
  ]);
}

beforeEach(() => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
});

afterEach(() => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
});

void test('fetches and normalizes template candidates', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch();

  const result = await fetchTemplateCandidatesFromEnv();

  assert.equal(result.ok, true);
  assert.equal(result.candidateCount, 2);
  assert.equal(result.candidates[0]?.id, 'tmpl-1');
  assert.equal(result.candidates[1]?.name, 'Monthly Digest');
});

void test('selects a template by id', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch();

  const result = await selectTemplateFromEnv({templateId: 'tmpl-2'});

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'flag');
  assert.deepEqual(result.searchedBy, {type: 'id', value: 'tmpl-2'});
  assert.equal(result.selectedTemplate?.name, 'Monthly Digest');
});

void test('selects a template by case-insensitive name', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch();

  const result = await selectTemplateFromEnv({templateName: 'weekly update'});

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'flag');
  assert.deepEqual(result.searchedBy, {type: 'name', value: 'weekly update'});
  assert.equal(result.selectedTemplate?.id, 'tmpl-1');
});

void test('supports interactive success with numbered selection', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch();

  const result = await selectTemplateFromEnv(
    {},
    {
      isInteractive: true,
      promptSelection: async () => '2',
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'interactive');
  assert.equal(result.selectedTemplate?.id, 'tmpl-2');
});

void test('reports template not found for unmatched selector', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch();

  const result = await selectTemplateFromEnv({templateId: 'missing-id'});

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'TEMPLATE_NOT_FOUND');
});

void test('reports no templates found when fetch succeeds with no candidates', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch([]);

  const result = await selectTemplateFromEnv({templateName: 'anything'});

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'NO_TEMPLATES_FOUND');
  assert.equal(result.candidateCount, 0);
});

void test('reports invalid selection for non-numeric interactive input', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch();

  const result = await selectTemplateFromEnv(
    {},
    {
      isInteractive: true,
      promptSelection: async () => 'abc',
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_SELECTION');
});

void test('reports invalid selection for out-of-range interactive input', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch();

  const result = await selectTemplateFromEnv(
    {},
    {
      isInteractive: true,
      promptSelection: async () => '99',
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_SELECTION');
});

void test('requires selector flags when no tty is available', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installSuccessfulFetch();

  const result = await selectTemplateFromEnv({}, {isInteractive: false});

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'NON_INTERACTIVE_SELECTION_REQUIRED');
});

void test('passes through auth failures', async () => {
  delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  process.env.GHL_LOCATION_ID = 'loc-123';

  const result = await selectTemplateFromEnv({templateId: 'tmpl-1'});

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'AUTH_CHECK_FAILED');
});

void test('maps fetch runtime failures to NETWORK_ERROR', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';
  installFetchMock([
    new Response(JSON.stringify({builders: []}), {status: 200}),
    new Response(JSON.stringify({users: []}), {status: 200}),
    new Error('network timeout'),
  ]);

  const result = await selectTemplateFromEnv({templateId: 'tmpl-1'});

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'NETWORK_ERROR');
  assert.match(result.diagnostics.responseSnippet ?? '', /network timeout/);
});

void test('runInteractiveTemplateSelection returns null for blank input', async () => {
  const result = await runInteractiveTemplateSelection(BASE_TEMPLATES, {
    promptSelection: async () => '   ',
  });

  assert.equal(result, null);
});
