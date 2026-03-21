import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {
  access,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, beforeEach, test} from 'node:test';

import {assertContract} from '../contracts/current-runtime/validateContract.mjs';
import {fetchAndSaveTemplatesFromEnv} from '../ghl-services/ghl-fetch-templates/src/fetchTemplates.js';
import {viewPreviewUrlDumpFromEnv} from '../ghl-services/ghl-update-template/view-content/src/viewPreviewUrl.js';
import {publishRenderedHtmlFromEnv} from '../ghl-services/ghl-update-template/clone-content/src/publishRenderedHtml.js';
import {buildResearchContent} from '../ghl-services/research-content/src/buildFragments.js';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const TOOLKIT_ROOT = resolve(CURRENT_DIR, '..');
const FETCH_OUTPUT_PATH = resolve(
  TOOLKIT_ROOT,
  'ghl-services/ghl-fetch-templates/data/templates.json',
);
const RENDER_SCRIPT_PATH = resolve(
  TOOLKIT_ROOT,
  'ghl-services/ghl-update-template/inject-content/render-newsletter.mjs',
);

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_TOKEN = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
const ORIGINAL_LOCATION_ID = process.env.GHL_LOCATION_ID;

let originalSnapshotContent = null;
const createdFiles = [];

function restoreEnv() {
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

async function captureSnapshotState() {
  try {
    originalSnapshotContent = await readFile(FETCH_OUTPUT_PATH, 'utf-8');
  } catch {
    originalSnapshotContent = null;
  }
}

async function restoreSnapshotState() {
  if (originalSnapshotContent === null) {
    await rm(FETCH_OUTPUT_PATH, {force: true});
    return;
  }

  await writeFile(FETCH_OUTPUT_PATH, originalSnapshotContent, 'utf-8');
}

function installFetchMock(steps, observed = []) {
  global.fetch = (async (input, init) => {
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
  });
}

async function runNodeScript(scriptPath, args, cwd = TOOLKIT_ROOT) {
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

beforeEach(async () => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
  createdFiles.length = 0;
  await captureSnapshotState();
});

afterEach(async () => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;

  await Promise.all(
    createdFiles.splice(0).map(path => rm(path, {force: true})),
  );
  await restoreSnapshotState();
});

void test('runs the current toolkit critical path across fetch, preview, render, and publish', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  const observed = [];
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
      new Response(
        '<html><body><div>Before [[[NEWSLETTER_BODY_SLOT]]]</div></body></html>',
        {status: 200},
      ),
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
      new Response(
        '<html><body><div>Before [[[NEWSLETTER_BODY_SLOT]]]</div></body></html>',
        {status: 200},
      ),
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
          templateDataDownloadUrl: 'https://example.com/published-template-data',
        }),
        {status: 201},
      ),
    ],
    observed,
  );

  const fetchResult = await fetchAndSaveTemplatesFromEnv();
  await assertContract('fetch-templates-result', fetchResult);
  assert.equal(fetchResult.ok, true);
  assert.equal(fetchResult.fileWritten, true);
  assert.equal(fetchResult.templateCount, 1);
  await access(FETCH_OUTPUT_PATH);

  const savedSnapshot = JSON.parse(
    await readFile(FETCH_OUTPUT_PATH, 'utf-8'),
  );
  assert.equal(savedSnapshot.payload.builders[0]?.id, 'tmpl-base');

  const previewResult = await viewPreviewUrlDumpFromEnv({
    templateName: 'Weekly Update',
  });
  await assertContract('view-preview-dump-result', previewResult);
  assert.equal(previewResult.ok, true);
  assert.equal(previewResult.selectedTemplate?.id, 'tmpl-base');
  assert.match(previewResult.outputPath ?? '', /tmpl-base-.*\.html$/);
  assert.match(previewResult.dump?.rawHtml ?? '', /\[\[\[NEWSLETTER_BODY_SLOT]]]/);
  createdFiles.push(previewResult.outputPath);

  const researchResult = buildResearchContent({
    topic: 'Weekly Update',
    sections: [
      {
        heading: 'Lead Story',
        bodyHtml: '<p>First paragraph.</p>',
      },
      {
        heading: 'Follow Up',
        bodyHtml: '<p>Second paragraph.</p>',
      },
    ],
  });

  const renderInputPath = resolve(CURRENT_DIR, 'render-input.test.json');
  await writeFile(
    renderInputPath,
    JSON.stringify(
      {
        newsletter: {
          title: 'Weekly Update',
          summary: 'A concise summary.',
          kicker: 'Policy Brief',
          ctaLabel: 'Read More',
          ctaUrl: 'https://example.com/read-more'
        },
        contentFragments: researchResult.contentFragments,
        renderReadyImages: [
          {
            slotId: 'hero',
            ghlUrl: 'https://ghl.example/image.jpg',
            altText: 'Managed image',
          },
        ]
      },
      null,
      2,
    ),
    'utf-8',
  );
  createdFiles.push(renderInputPath);

  const renderResult = await runNodeScript(RENDER_SCRIPT_PATH, [
    '--preview-html',
    previewResult.outputPath,
    '--render-input',
    renderInputPath,
  ]);
  await assertContract('render-newsletter-result', renderResult.json);
  assert.equal(renderResult.code, 0);
  assert.equal(renderResult.json.ok, true);
  createdFiles.push(renderResult.json.outputPath);

  const renderedHtml = await readFile(renderResult.json.outputPath, 'utf-8');
  assert.doesNotMatch(renderedHtml, /\[\[\[NEWSLETTER_BODY_SLOT]]]/);
  assert.match(renderedHtml, /Weekly Update/);
  assert.match(renderedHtml, /First paragraph/);

  const publishResult = await publishRenderedHtmlFromEnv({
    templateName: 'Weekly Update',
    draftName: 'Weekly Update Draft',
    renderedHtmlPath: renderResult.json.outputPath,
  });
  await assertContract('publish-rendered-draft-result', publishResult);
  assert.equal(publishResult.ok, true);
  assert.equal(publishResult.templateId, 'tmpl-clone');

  const createRequest = JSON.parse(String(observed[11]?.init?.body));
  assert.deepEqual(createRequest, {
    locationId: 'loc-123',
    name: 'Weekly Update Draft',
    type: 'html',
  });

  const updateRequest = JSON.parse(String(observed[12]?.init?.body));
  assert.equal(updateRequest.locationId, 'loc-123');
  assert.equal(updateRequest.templateId, 'tmpl-clone');
  assert.equal(updateRequest.editorType, 'html');
  assert.match(String(updateRequest.html), /\[\[\[NEWSLETTER_BODY_SLOT]]]/);

  const publishRequest = JSON.parse(String(observed[13]?.init?.body));
  assert.equal(publishRequest.locationId, 'loc-123');
  assert.equal(publishRequest.templateId, 'tmpl-clone');
  assert.match(String(publishRequest.html), /First paragraph/);
});

void test('short-circuits downstream stages when auth prerequisites are missing', async () => {
  delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  process.env.GHL_LOCATION_ID = 'loc-123';

  let fetchCalls = 0;
  global.fetch = (async () => {
    fetchCalls += 1;
    throw new Error('Fetch should not be called when auth is missing.');
  });

  const fetchResult = await fetchAndSaveTemplatesFromEnv();
  const previewResult = await viewPreviewUrlDumpFromEnv({
    templateName: 'Weekly Update',
  });
  const renderedHtmlPath = resolve(CURRENT_DIR, 'rendered-short-circuit.html');
  await writeFile(renderedHtmlPath, '<html>Rendered</html>', 'utf-8');
  createdFiles.push(renderedHtmlPath);
  const cloneResult = await publishRenderedHtmlFromEnv({
    templateName: 'Weekly Update',
    renderedHtmlPath,
  });

  assert.equal(fetchResult.ok, false);
  assert.equal(fetchResult.errorCode, 'AUTH_CHECK_FAILED');
  assert.equal(previewResult.ok, false);
  assert.equal(previewResult.errorCode, 'SELECTION_FAILED');
  assert.equal(cloneResult.ok, false);
  assert.equal(cloneResult.stage, 'cloneDraft');
  assert.equal(cloneResult.cloneDraft.errorCode, 'SELECTION_FAILED');
  assert.equal(fetchCalls, 0);
});
