import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const SLOT_TOKEN = "[[[NEWSLETTER_BODY_SLOT]]]";

const currentDir = dirname(fileURLToPath(import.meta.url));
const previewsDir = resolve(currentDir, "../view-content/previews");
const outputDir = resolve(currentDir, "injection-output");
const sampleBlockPath = resolve(currentDir, "sample-newsletter-block.jinja.html");

function toStamp(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

async function pickLatestPreviewHtmlFile() {
  const entries = await readdir(previewsDir, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".html")
    .map((entry) => entry.name);

  if (htmlFiles.length === 0) {
    throw new Error(`No preview HTML files found in: ${previewsDir}`);
  }

  const withTimes = await Promise.all(
    htmlFiles.map(async (name) => {
      const path = resolve(previewsDir, name);
      const fileStat = await stat(path);
      return { name, path, mtimeMs: fileStat.mtimeMs };
    })
  );

  withTimes.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withTimes[0];
}

async function main() {
  const latestPreview = await pickLatestPreviewHtmlFile();
  const baseHtml = await readFile(latestPreview.path, "utf-8");
  const sampleBlock = await readFile(sampleBlockPath, "utf-8");

  if (!baseHtml.includes(SLOT_TOKEN)) {
    throw new Error(`Slot token ${SLOT_TOKEN} not found in preview template.`);
  }

  const finalHtml = baseHtml.replace(SLOT_TOKEN, sampleBlock);

  await mkdir(outputDir, { recursive: true });

  const baseName = basename(latestPreview.name, ".html");
  const outputPath = resolve(outputDir, `${baseName}-injected-${toStamp()}.html`);
  await writeFile(outputPath, finalHtml, "utf-8");

  const result = {
    ok: true,
    sourcePreview: latestPreview.path,
    sampleBlockPath,
    outputPath,
    slotToken: SLOT_TOKEN
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const result = {
    ok: false,
    message: error instanceof Error ? error.message : "Unknown injection error"
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 1;
});
