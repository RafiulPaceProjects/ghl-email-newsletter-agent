import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {basename, dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import nunjucks from 'nunjucks';
import * as parse5 from 'parse5';
import {z} from 'zod';

const SLOT_TOKEN = '[[[NEWSLETTER_BODY_SLOT]]]';
const RENDER_CONTRACT_VERSION = 'v2';

const currentDir = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(currentDir, 'render-output');
const blockTemplatePath = resolve(
  currentDir,
  'sample-newsletter-block.jinja.html',
);

const fragmentSchema = z.object({
  slotId: z.string().trim().min(1).optional(),
  order: z.number().int().positive().optional(),
  html: z.string().trim().min(1),
});

const legacyImageSchema = z.object({
  slot: z.string().trim().min(1).optional(),
  url: z.string().trim().url(),
  alt: z.string().trim().min(1).optional(),
});

const renderReadyImageSchema = z.object({
  slotId: z.string().trim().min(1),
  ghlUrl: z.string().trim().url(),
  altText: z.string().trim().min(1).optional(),
  ghlFileId: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1).optional(),
  providerImageId: z.string().trim().min(1).optional(),
  providerUrl: z.string().trim().url().optional(),
});

const renderInputSchema = z.object({
  newsletter: z.object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    ctaLabel: z.string().trim().min(1),
    ctaUrl: z.string().trim().url(),
    kicker: z.string().trim().min(1).optional(),
    bodyHtml: z.string().trim().min(1).optional(),
  }),
  contentFragments: z.array(fragmentSchema).optional(),
  images: z.array(legacyImageSchema).optional(),
  renderReadyImages: z.array(renderReadyImageSchema).optional(),
});

function toStamp(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function parseArgValue(args, key) {
  const withEqualsPrefix = `${key}=`;
  const withEquals = args.find(arg => arg.startsWith(withEqualsPrefix));
  if (withEquals) {
    return withEquals.slice(withEqualsPrefix.length).trim() || undefined;
  }

  const index = args.findIndex(arg => arg === key);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1].trim() || undefined;
  }

  return undefined;
}

function countOccurrences(input, token) {
  return input.split(token).length - 1;
}

async function resolveExistingFile(rawPath, label, expectedExtension) {
  if (!rawPath) {
    throw new Error(`Missing required ${label} argument.`);
  }

  const resolvedPath = resolve(process.cwd(), rawPath);
  if (
    expectedExtension &&
    extname(resolvedPath).toLowerCase() !== expectedExtension
  ) {
    throw new Error(
      `${label} must point to a ${expectedExtension} file: ${resolvedPath}`,
    );
  }

  let fileStat;
  try {
    fileStat = await stat(resolvedPath);
  } catch {
    throw new Error(`${label} file not found: ${resolvedPath}`);
  }

  if (!fileStat.isFile()) {
    throw new Error(`${label} path is not a file: ${resolvedPath}`);
  }

  return resolvedPath;
}

function normalizeContentFragments(parsed) {
  if (parsed.newsletter.bodyHtml) {
    return [
      {
        slotId: 'body',
        order: 1,
        html: parsed.newsletter.bodyHtml,
      },
    ];
  }

  if (!parsed.contentFragments?.length) {
    throw new Error(
      'Render input must include newsletter.bodyHtml or contentFragments[].',
    );
  }

  return [...parsed.contentFragments].sort(
    (left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER),
  );
}

function normalizeRenderReadyImages(parsed) {
  if (parsed.renderReadyImages?.length) {
    return parsed.renderReadyImages;
  }

  if (!parsed.images?.length) {
    return [];
  }

  return parsed.images.map((image, index) => ({
    slotId: image.slot ?? (index === 0 ? 'hero' : `image-${index + 1}`),
    ghlUrl: image.url,
    altText: image.alt ?? 'Newsletter image',
  }));
}

function buildImageHtml(image) {
  if (!image) {
    return '';
  }

  return `<img
        src="${image.ghlUrl}"
        alt="${image.altText ?? 'Newsletter image'}"
        width="512"
        style="display: block; width: 100%; max-width: 512px; height: auto; border-radius: 10px; border: 0; margin: 0 0 18px;"
      />`;
}

function validateHtmlDocument(html, label) {
  parse5.parse(html);
  if (!html.includes('<html') && !html.includes('<body')) {
    throw new Error(`${label} must contain HTML document markup.`);
  }
}

function renderNewsletterBlock(template, input) {
  const heroImage =
    input.renderReadyImages.find(image => image.slotId === 'hero') ??
    input.renderReadyImages[0] ??
    null;

  return nunjucks.renderString(template, {
    newsletter: {
      ...input.newsletter,
      body_html: input.contentFragments.map(fragment => fragment.html).join('\n'),
      image_block_html: buildImageHtml(heroImage),
    },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const previewHtmlArg = parseArgValue(args, '--preview-html');
  const renderInputArg = parseArgValue(args, '--render-input');

  const previewHtmlPath = await resolveExistingFile(
    previewHtmlArg,
    '--preview-html',
    '.html',
  );
  const renderInputPath = await resolveExistingFile(
    renderInputArg,
    '--render-input',
    '.json',
  );

  const baseHtml = await readFile(previewHtmlPath, 'utf-8');
  validateHtmlDocument(baseHtml, 'Preview HTML');

  const slotTokenCount = countOccurrences(baseHtml, SLOT_TOKEN);
  if (slotTokenCount !== 1) {
    throw new Error(
      `Expected exactly 1 slot token ${SLOT_TOKEN}, found ${slotTokenCount}.`,
    );
  }

  const template = await readFile(blockTemplatePath, 'utf-8');
  const renderInput = renderInputSchema.parse(
    JSON.parse(await readFile(renderInputPath, 'utf-8')),
  );

  const normalizedInput = {
    newsletter: {
      kicker: renderInput.newsletter.kicker ?? 'Weekly Brief',
      title: renderInput.newsletter.title,
      summary: renderInput.newsletter.summary,
      ctaLabel: renderInput.newsletter.ctaLabel,
      ctaUrl: renderInput.newsletter.ctaUrl,
    },
    contentFragments: normalizeContentFragments(renderInput),
    renderReadyImages: normalizeRenderReadyImages(renderInput),
  };

  const renderedBlock = renderNewsletterBlock(template, normalizedInput);
  const finalHtml = baseHtml.replace(SLOT_TOKEN, renderedBlock);
  parse5.parse(finalHtml);

  await mkdir(outputDir, {recursive: true});

  const baseName = basename(previewHtmlPath, '.html');
  const outputPath = resolve(outputDir, `${baseName}-rendered-${toStamp()}.html`);
  await writeFile(outputPath, finalHtml, 'utf-8');

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        renderContractVersion: RENDER_CONTRACT_VERSION,
        sourcePreview: previewHtmlPath,
        renderInputPath,
        blockTemplatePath,
        outputPath,
        slotToken: SLOT_TOKEN,
        contentFragmentCount: normalizedInput.contentFragments.length,
        imageCount: normalizedInput.renderReadyImages.length,
        imageSlots: normalizedInput.renderReadyImages.map(image => image.slotId),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch(error => {
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Unknown newsletter render error',
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
});
