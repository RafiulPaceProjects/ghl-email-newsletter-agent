import assert from 'node:assert/strict';
import {afterEach, beforeEach, test} from 'node:test';

import {viewSelectedTemplateFromEnv} from '../src/viewTemplate.js';

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = globalThis.fetch;

function createJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function createBuilder(id: string, name: string) {
  return {
    id,
    name,
    updatedBy: 'tester',
    isPlainText: false,
    lastUpdated: '2026-03-20T00:00:00.000Z',
    dateAdded: '2026-03-20T00:00:00.000Z',
    previewUrl: `https://example.com/${id}`,
    version: '1',
    templateType: 'newsletter',
  };
}

function installFetchMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
  globalThis.fetch = handler as typeof fetch;
}

function resetEnvironment(): void {
  process.env = {
    ...ORIGINAL_ENV,
    GHL_PRIVATE_INTEGRATION_TOKEN: 'test-token',
    GHL_LOCATION_ID: 'test-location',
  };
}

beforeEach(() => {
  resetEnvironment();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = ORIGINAL_ENV;
});

void test('returns page fetch error instead of TEMPLATE_NOT_FOUND when a later page returns 401', async () => {
  let emailBuilderCalls = 0;

  installFetchMock(async input => {
    const url = String(input);

    if (url.includes('/users/')) {
      return createJsonResponse(200, {users: []});
    }

    if (url.includes('/emails/builder')) {
      emailBuilderCalls += 1;

      if (!url.includes('limit=100') && !url.includes('offset=')) {
        return createJsonResponse(200, {builders: []});
      }

      if (url.includes('limit=100') && !url.includes('offset=')) {
        return createJsonResponse(200, {
          builders: [createBuilder('template-1', 'first-template')],
          total: [{total: 2}],
        });
      }

      if (url.includes('offset=1')) {
        return createJsonResponse(401, {
          message: 'Unauthorized later page',
        });
      }
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  const result = await viewSelectedTemplateFromEnv({
    templateName: 'missing-template',
  });

  assert.equal(emailBuilderCalls, 4);
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'FETCH_401');
  assert.equal(result.message, 'Template view fetch failed with HTTP 401.');
  assert.equal(
    result.endpoint,
    '/emails/builder?locationId=test-location&limit=100&offset=1',
  );
  assert.equal(result.returnedCount, 1);
  assert.equal(result.selectedTemplate, null);
});

void test('returns NETWORK_ERROR instead of TEMPLATE_NOT_FOUND when a later page throws', async () => {
  installFetchMock(async input => {
    const url = String(input);

    if (url.includes('/users/')) {
      return createJsonResponse(200, {users: []});
    }

    if (url.includes('/emails/builder')) {
      if (!url.includes('limit=100') && !url.includes('offset=')) {
        return createJsonResponse(200, {builders: []});
      }

      if (url.includes('limit=100') && !url.includes('offset=')) {
        return createJsonResponse(200, {
          builders: [createBuilder('template-1', 'first-template')],
          total: [{total: 2}],
        });
      }

      if (url.includes('offset=1')) {
        throw new Error('later page network failure');
      }
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  const result = await viewSelectedTemplateFromEnv({
    templateName: 'missing-template',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'NETWORK_ERROR');
  assert.equal(
    result.message,
    'Template view failed due to network/runtime error.',
  );
  assert.equal(
    result.endpoint,
    '/emails/builder?locationId=test-location&limit=100&offset=1',
  );
  assert.equal(result.returnedCount, 1);
  assert.equal(result.selectedTemplate, null);
});

void test('returns success when a later page contains the requested template', async () => {
  installFetchMock(async input => {
    const url = String(input);

    if (url.includes('/users/')) {
      return createJsonResponse(200, {users: []});
    }

    if (url.includes('/emails/builder')) {
      if (!url.includes('limit=100') && !url.includes('offset=')) {
        return createJsonResponse(200, {builders: []});
      }

      if (url.includes('name=target-template')) {
        return createJsonResponse(200, {
          builders: [],
          total: [{total: 3}],
        });
      }

      if (url.includes('limit=100') && !url.includes('offset=')) {
        return createJsonResponse(200, {
          builders: [createBuilder('template-1', 'first-template')],
          total: [{total: 2}],
        });
      }

      if (url.includes('offset=1')) {
        return createJsonResponse(200, {
          builders: [createBuilder('template-2', 'target-template')],
          total: [{total: 2}],
        });
      }
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  const result = await viewSelectedTemplateFromEnv({
    templateName: 'target-template',
  });

  assert.equal(result.ok, true);
  assert.equal(result.selectedTemplate?.id, 'template-2');
  assert.equal(result.returnedCount, 2);
});

void test('returns TEMPLATE_NOT_FOUND after all pages succeed and no match exists', async () => {
  installFetchMock(async input => {
    const url = String(input);

    if (url.includes('/users/')) {
      return createJsonResponse(200, {users: []});
    }

    if (url.includes('/emails/builder')) {
      if (!url.includes('limit=100') && !url.includes('offset=')) {
        return createJsonResponse(200, {builders: []});
      }

      if (url.includes('name=missing-template')) {
        return createJsonResponse(200, {
          builders: [],
          total: [{total: 2}],
        });
      }

      if (url.includes('limit=100') && !url.includes('offset=')) {
        return createJsonResponse(200, {
          builders: [createBuilder('template-1', 'first-template')],
          total: [{total: 2}],
        });
      }

      if (url.includes('offset=1')) {
        return createJsonResponse(200, {
          builders: [createBuilder('template-2', 'second-template')],
          total: [{total: 2}],
        });
      }
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  const result = await viewSelectedTemplateFromEnv({
    templateName: 'missing-template',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'TEMPLATE_NOT_FOUND');
  assert.equal(result.returnedCount, 2);
});

void test('preserves existing first-page failure behavior', async () => {
  installFetchMock(async input => {
    const url = String(input);

    if (url.includes('/users/')) {
      return createJsonResponse(200, {users: []});
    }

    if (url.endsWith('/emails/builder?locationId=test-location')) {
      return createJsonResponse(200, {builders: []});
    }

    if (
      url.includes('/emails/builder') &&
      url.includes('limit=100') &&
      !url.includes('offset=')
    ) {
      return createJsonResponse(401, {
        message: 'Unauthorized first page',
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  const result = await viewSelectedTemplateFromEnv({
    templateName: 'missing-template',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'FETCH_401');
  assert.equal(result.returnedCount, 0);
  assert.equal(result.selectedTemplate, null);
});
