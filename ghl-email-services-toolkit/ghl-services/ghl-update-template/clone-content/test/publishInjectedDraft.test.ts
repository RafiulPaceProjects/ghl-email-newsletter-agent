import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {afterEach, beforeEach, test} from 'node:test';

import {assertContract} from '../../../../contracts/current-runtime/validateContract.mjs';
import {publishRenderedHtmlFromEnv} from '../src/publishRenderedHtml.js';

const originalFetch = global.fetch;
const originalToken = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
const originalLocationId = process.env.GHL_LOCATION_ID;

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'publish-rendered-draft-test-'));
  tempDirs.push(dir);
  return dir;
}

function restoreEnv(): void {
  if (originalToken === undefined) {
    delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  } else {
    process.env.GHL_PRIVATE_INTEGRATION_TOKEN = originalToken;
  }

  if (originalLocationId === undefined) {
    delete process.env.GHL_LOCATION_ID;
  } else {
    process.env.GHL_LOCATION_ID = originalLocationId;
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
  global.fetch = originalFetch;
});

afterEach(async () => {
  restoreEnv();
  global.fetch = originalFetch;
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})),
  );
});

void test('publishes explicit rendered html after cloning the selected template', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  const tempDir = await makeTempDir();
  const renderedHtmlPath = resolve(tempDir, 'rendered.html');
  await writeFile(renderedHtmlPath, '<html>Rendered</html>', 'utf-8');

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
              previewUrl: 'https://example.com/preview-base',
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
      new Response('<html><body>Base preview</body></html>', {status: 200}),
      new Response(JSON.stringify({id: 'tmpl-clone'}), {status: 201}),
      new Response(
        JSON.stringify({
          previewUrl: 'https://example.com/preview-clone',
          templateDataDownloadUrl: 'https://example.com/template-data-clone',
        }),
        {status: 201},
      ),
      new Response(
        JSON.stringify({
          previewUrl: 'https://example.com/published-preview',
          templateDataDownloadUrl: 'https://example.com/published-data',
        }),
        {status: 201},
      ),
    ],
    observed,
  );

  const result = await publishRenderedHtmlFromEnv({
    renderedHtmlPath,
    templateName: 'Weekly Update',
    draftName: 'Weekly Update Draft',
  });

  await assertContract('publish-rendered-draft-result', result);
  assert.equal(result.ok, true);
  assert.equal(result.templateId, 'tmpl-clone');

  const publishBody = JSON.parse(String(observed[6]?.init?.body));
  assert.equal(publishBody.templateId, 'tmpl-clone');
  assert.match(String(publishBody.html), /Rendered/);
});

void test('propagates clone-stage failure details', async () => {
  delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  process.env.GHL_LOCATION_ID = 'loc-123';

  const tempDir = await makeTempDir();
  const renderedHtmlPath = resolve(tempDir, 'rendered.html');
  await writeFile(renderedHtmlPath, '<html>Rendered</html>', 'utf-8');

  const result = await publishRenderedHtmlFromEnv({
    renderedHtmlPath,
    templateName: 'Weekly Update',
  });

  await assertContract('publish-rendered-draft-result', result);
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'cloneDraft');
  assert.equal(result.cloneDraft.errorCode, 'SELECTION_FAILED');
});

void test('fails early when rendered html is missing', async () => {
  await assert.rejects(
    publishRenderedHtmlFromEnv({
      renderedHtmlPath: '/tmp/missing-rendered.html',
      templateName: 'Weekly Update',
    }),
    /Rendered HTML file not found/,
  );
});
