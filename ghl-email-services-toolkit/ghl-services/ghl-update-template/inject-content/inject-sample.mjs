import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {basename, dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Current inject-content implementation:
 * - read a preview HTML file produced earlier in the pipeline
 * - require exactly one explicit body slot token
 * - replace that slot with one hardcoded sample newsletter block
 * - write a timestamped HTML artifact for downstream publish experiments
 *
 * This is intentionally local-only. It does not parse structured newsletter
 * data and it does not call the GHL update endpoint directly.
 */
const SLOT_TOKEN = '[[[NEWSLETTER_BODY_SLOT]]]';

const currentDir = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(currentDir, 'injection-output');
const sampleBlockPath = resolve(currentDir, 'sample-newsletter-block.jinja.html');

// Match the timestamp style used by adjacent tooling so injection artifacts sort
// cleanly and can be picked up by the clone-content publish wrapper.
function toStamp(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

// Keep CLI parsing minimal for now: this utility only needs one required
// argument and accepts either `--key value` or `--key=value`.
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

// Resolve and validate the preview HTML early so later stages can assume they
// are operating on a real local `.html` file.
async function resolvePreviewHtmlPath(rawPath) {
  if (!rawPath) {
    throw new Error('Missing required --preview-html argument.');
  }

  const previewPath = resolve(process.cwd(), rawPath);
  if (extname(previewPath).toLowerCase() !== '.html') {
    throw new Error(`Preview HTML path must point to an .html file: ${previewPath}`);
  }

  let fileStat;
  try {
    fileStat = await stat(previewPath);
  } catch {
    throw new Error(`Preview HTML file not found: ${previewPath}`);
  }

  if (!fileStat.isFile()) {
    throw new Error(`Preview HTML path is not a file: ${previewPath}`);
  }

  return previewPath;
}

async function main() {
  const previewHtmlArg = parseArgValue(process.argv.slice(2), '--preview-html');
  const previewHtmlPath = await resolvePreviewHtmlPath(previewHtmlArg);
  const baseHtml = await readFile(previewHtmlPath, 'utf-8');
  const sampleBlock = await readFile(sampleBlockPath, 'utf-8');

  // The current contract is one explicit insertion point. Multiple slots would
  // make block ordering ambiguous; zero slots means there is nowhere safe to
  // inject newsletter content.
  const slotTokenCount = countOccurrences(baseHtml, SLOT_TOKEN);
  if (slotTokenCount !== 1) {
    throw new Error(
      `Expected exactly 1 slot token ${SLOT_TOKEN}, found ${slotTokenCount}.`,
    );
  }

  // Today the inject step is a plain string replacement using a single sample
  // block. Future newsletter support should replace this with a renderer that
  // assembles validated repeatable blocks before injection.
  const finalHtml = baseHtml.replace(SLOT_TOKEN, sampleBlock);

  await mkdir(outputDir, {recursive: true});

  const baseName = basename(previewHtmlPath, '.html');
  const outputPath = resolve(outputDir, `${baseName}-injected-${toStamp()}.html`);
  await writeFile(outputPath, finalHtml, 'utf-8');

  const result = {
    ok: true,
    sourcePreview: previewHtmlPath,
    sampleBlockPath,
    outputPath,
    slotToken: SLOT_TOKEN,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch(error => {
  const result = {
    ok: false,
    message: error instanceof Error ? error.message : 'Unknown injection error',
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 1;
});
