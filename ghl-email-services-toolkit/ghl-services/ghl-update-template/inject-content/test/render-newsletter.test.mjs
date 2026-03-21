import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {afterEach, test} from 'node:test';

import {assertContract} from '../../../../contracts/current-runtime/validateContract.mjs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(currentDir, '../render-newsletter.mjs');

const tempDirs = [];

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'render-newsletter-test-'));
  tempDirs.push(dir);
  return dir;
}

async function runRenderNewsletter(args, cwd) {
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

void test('renders explicit newsletter input into a preview slot and writes an explicit artifact', async () => {
  const tempDir = await makeTempDir();
  const previewPath = resolve(tempDir, 'preview.html');
  const renderInputPath = resolve(tempDir, 'render-input.json');

  await writeFile(
    previewPath,
    '<html><body>before [[[NEWSLETTER_BODY_SLOT]]] after</body></html>',
    'utf-8',
  );
  await writeFile(
    renderInputPath,
    JSON.stringify(
      {
        newsletter: {
          title: 'Weekly Update',
          summary: 'A concise summary.',
          kicker: 'Policy Brief',
          ctaLabel: 'Read More',
          ctaUrl: 'https://example.com/read-more',
        },
        contentFragments: [
          {html: '<p>First paragraph.</p>'},
          {html: '<p>Second paragraph.</p>'},
        ],
        images: [
          {
            slot: 'hero',
            url: 'https://example.com/image.jpg',
            alt: 'City skyline',
          },
        ],
      },
      null,
      2,
    ),
    'utf-8',
  );

  const result = await runRenderNewsletter(
    ['--preview-html', previewPath, '--render-input', renderInputPath],
    currentDir,
  );

  await assertContract('render-newsletter-result', result.json);
  assert.equal(result.code, 0);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.renderContractVersion, 'v2');
  assert.equal(result.json.renderInputPath, renderInputPath);
  assert.match(result.json.outputPath, /render-output\/preview-rendered-.*\.html$/);

  const outputHtml = await readFile(result.json.outputPath, 'utf-8');
  assert.match(outputHtml, /Weekly Update/);
  assert.match(outputHtml, /Policy Brief/);
  assert.match(outputHtml, /First paragraph/);
  assert.match(outputHtml, /https:\/\/example\.com\/image\.jpg/);
  assert.doesNotMatch(outputHtml, /\[\[\[NEWSLETTER_BODY_SLOT]]]/);
});

void test('accepts renderReadyImages as the preferred image contract', async () => {
  const tempDir = await makeTempDir();
  const previewPath = resolve(tempDir, 'preview.html');
  const renderInputPath = resolve(tempDir, 'render-input.json');

  await writeFile(
    previewPath,
    '<html><body>before [[[NEWSLETTER_BODY_SLOT]]] after</body></html>',
    'utf-8',
  );
  await writeFile(
    renderInputPath,
    JSON.stringify(
      {
        newsletter: {
          title: 'Weekly Update',
          summary: 'A concise summary.',
          ctaLabel: 'Read More',
          ctaUrl: 'https://example.com/read-more',
        },
        contentFragments: [
          {slotId: 'body', order: 1, html: '<p>First paragraph.</p>'},
        ],
        renderReadyImages: [
          {
            slotId: 'hero',
            ghlUrl: 'https://ghl.example/image.jpg',
            altText: 'Managed image',
          },
        ],
      },
      null,
      2,
    ),
    'utf-8',
  );

  const result = await runRenderNewsletter(
    ['--preview-html', previewPath, '--render-input', renderInputPath],
    currentDir,
  );

  await assertContract('render-newsletter-result', result.json);
  assert.equal(result.code, 0);
  assert.deepEqual(result.json.imageSlots, ['hero']);
});

void test('fails when rendered-html input json is missing', async () => {
  const tempDir = await makeTempDir();
  const previewPath = resolve(tempDir, 'preview.html');
  await writeFile(
    previewPath,
    '<html><body>before [[[NEWSLETTER_BODY_SLOT]]] after</body></html>',
    'utf-8',
  );

  const result = await runRenderNewsletter(
    ['--preview-html', previewPath],
    currentDir,
  );

  await assertContract('render-newsletter-result', result.json);
  assert.equal(result.code, 1);
  assert.equal(result.json.ok, false);
  assert.equal(result.json.message, 'Missing required --render-input argument.');
});

void test('fails when content fragments and newsletter.bodyHtml are both missing', async () => {
  const tempDir = await makeTempDir();
  const previewPath = resolve(tempDir, 'preview.html');
  const renderInputPath = resolve(tempDir, 'render-input.json');

  await writeFile(
    previewPath,
    '<html><body>before [[[NEWSLETTER_BODY_SLOT]]] after</body></html>',
    'utf-8',
  );
  await writeFile(
    renderInputPath,
    JSON.stringify(
      {
        newsletter: {
          title: 'Weekly Update',
          summary: 'A concise summary.',
          ctaLabel: 'Read More',
          ctaUrl: 'https://example.com/read-more',
        },
      },
      null,
      2,
    ),
    'utf-8',
  );

  const result = await runRenderNewsletter(
    ['--preview-html', previewPath, '--render-input', renderInputPath],
    currentDir,
  );

  assert.equal(result.code, 1);
  assert.equal(result.json.ok, false);
  assert.match(
    result.json.message,
    /must include newsletter\.bodyHtml or contentFragments\[\]/,
  );
});
