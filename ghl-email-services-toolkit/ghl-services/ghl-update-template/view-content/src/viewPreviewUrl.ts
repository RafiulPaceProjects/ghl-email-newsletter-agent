import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  viewSelectedTemplateFromEnv,
  type SelectedTemplateSummary,
  type ViewTemplateOptions,
} from './viewTemplate.js';

const RESPONSE_SNIPPET_MAX_LENGTH = 280;
const PREVIEW_FETCH_TIMEOUT_MS = 12_000;

const CURRENT_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const PREVIEWS_DIR = resolve(CURRENT_FILE_DIR, '../previews');

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

export type ViewPreviewErrorCode =
  | 'SELECTION_FAILED'
  | 'MISSING_PREVIEW_URL'
  | 'INVALID_PREVIEW_URL'
  | 'PREVIEW_FETCH_HTTP_ERROR'
  | 'PREVIEW_FETCH_NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'WRITE_ERROR'
  | 'UNKNOWN_ERROR';

export interface PreviewFetchDiagnostics {
  status: number | null;
  responseSnippet: string | null;
}

export interface PreviewChildSummary {
  tag: string;
  text: string;
}

export interface PreviewStructuredBlock {
  tag: string;
  text: string;
  attrs: Record<string, string>;
  links: string[];
  images: string[];
  children: PreviewChildSummary[];
}

export interface PreviewAssets {
  links: string[];
  images: string[];
  stylesheets: string[];
  scripts: string[];
}

export interface PreviewDumpPayload {
  metadata: {
    fetchedAt: string;
    templateId: string;
    templateName: string;
    templateType: string;
    previewUrl: string;
    sourceStep: 'view-preview-url';
  };
  rawHtml: string;
  structured: {
    blocks: PreviewStructuredBlock[];
  };
  assets: PreviewAssets;
}

export interface ViewPreviewDumpResult {
  ok: boolean;
  fetchedAt: string;
  locationId: string | null;
  selectedTemplate: SelectedTemplateSummary | null;
  outputPath?: string;
  previewFetch: PreviewFetchDiagnostics;
  dump?: PreviewDumpPayload;
  message: string;
  errorCode?: ViewPreviewErrorCode;
}

interface ParsedTag {
  name: string;
  attrsRaw: string;
  rawStart: number;
  openTagEnd: number;
  closeTagEnd: number;
  innerHtml: string;
}

function cleanSnippet(input: string): string {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= RESPONSE_SNIPPET_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, RESPONSE_SNIPPET_MAX_LENGTH)}...`;
}

function normalizeText(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex =
    /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  let match: RegExpExecArray | null = attrRegex.exec(raw);
  while (match) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = value;
    match = attrRegex.exec(raw);
  }

  return attrs;
}

function extractBodyHtml(html: string): string {
  // Prefer the `<body>` contents when present so structured block extraction
  // focuses on the email payload rather than the full document wrapper.
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1];
  }
  return html;
}

function extractAllMatches(input: string, regex: RegExp): string[] {
  const values: string[] = [];
  let match: RegExpExecArray | null = regex.exec(input);
  while (match) {
    const value = match.slice(1).find(entry => typeof entry === 'string');
    const trimmed = value?.trim();
    if (trimmed) {
      values.push(trimmed);
    }
    match = regex.exec(input);
  }
  return dedupe(values);
}

function extractAllLinks(input: string): string[] {
  return extractAllMatches(
    input,
    /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
  );
}

function extractAllImages(input: string): string[] {
  return extractAllMatches(
    input,
    /<img\b[^>]*src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
  );
}

function extractStylesheets(input: string): string[] {
  return extractAllMatches(
    input,
    /<link\b[^>]*rel\s*=\s*(?:"stylesheet"|'stylesheet'|stylesheet)[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
  );
}

function extractScripts(input: string): string[] {
  return extractAllMatches(
    input,
    /<script\b[^>]*src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
  );
}

function extractTopLevelTags(html: string): ParsedTag[] {
  const tagRegex = /<\/?([A-Za-z][A-Za-z0-9:-]*)(\s[^>]*?)?\s*(\/?)>/g;
  const stack: Array<{
    name: string;
    attrsRaw: string;
    rawStart: number;
    openTagEnd: number;
  }> = [];
  const topLevel: ParsedTag[] = [];

  let match: RegExpExecArray | null = tagRegex.exec(html);
  while (match) {
    const fullTag = match[0];
    const name = (match[1] || '').toLowerCase();
    const attrsRaw = match[2] || '';
    const selfClosedBySlash = Boolean(match[3]);
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing = selfClosedBySlash || VOID_TAGS.has(name);

    if (!isClosing && !isSelfClosing) {
      stack.push({
        name,
        attrsRaw,
        rawStart: match.index,
        openTagEnd: tagRegex.lastIndex,
      });
      match = tagRegex.exec(html);
      continue;
    }

    if (!isClosing && isSelfClosing) {
      if (stack.length === 0) {
        topLevel.push({
          name,
          attrsRaw,
          rawStart: match.index,
          openTagEnd: tagRegex.lastIndex,
          closeTagEnd: tagRegex.lastIndex,
          innerHtml: '',
        });
      }
      match = tagRegex.exec(html);
      continue;
    }

    if (isClosing) {
      let openTag = stack.pop();
      while (openTag && openTag.name !== name) {
        openTag = stack.pop();
      }

      if (!openTag) {
        match = tagRegex.exec(html);
        continue;
      }

      if (stack.length === 0) {
        topLevel.push({
          name: openTag.name,
          attrsRaw: openTag.attrsRaw,
          rawStart: openTag.rawStart,
          openTagEnd: openTag.openTagEnd,
          closeTagEnd: tagRegex.lastIndex,
          innerHtml: html.slice(openTag.openTagEnd, match.index),
        });
      }
    }

    match = tagRegex.exec(html);
  }

  return topLevel;
}

function toChildrenSummary(innerHtml: string): PreviewChildSummary[] {
  const childTags = extractTopLevelTags(innerHtml);
  return childTags.slice(0, 12).map(child => ({
    tag: child.name,
    text: cleanSnippet(normalizeText(child.innerHtml || '')),
  }));
}

function toStructuredBlocks(bodyHtml: string): PreviewStructuredBlock[] {
  const topLevel = extractTopLevelTags(bodyHtml);
  if (topLevel.length === 0) {
    return [
      {
        tag: 'body',
        text: cleanSnippet(normalizeText(bodyHtml)),
        attrs: {},
        links: extractAllLinks(bodyHtml),
        images: extractAllImages(bodyHtml),
        children: [],
      },
    ];
  }

  return topLevel.map(node => {
    const blockHtml = bodyHtml.slice(node.rawStart, node.closeTagEnd);
    const links = extractAllLinks(blockHtml);
    const images = extractAllImages(blockHtml);

    return {
      tag: node.name,
      text: cleanSnippet(normalizeText(node.innerHtml)),
      attrs: parseAttrs(node.attrsRaw),
      links,
      images,
      children: toChildrenSummary(node.innerHtml),
    };
  });
}

function collectAssets(
  html: string,
  blocks: PreviewStructuredBlock[],
): PreviewAssets {
  const linksFromBlocks = dedupe(blocks.flatMap(b => b.links));
  const imagesFromBlocks = dedupe(blocks.flatMap(b => b.images));

  const stylesheetUrls = extractStylesheets(html);
  const scriptUrls = extractScripts(html);

  return {
    links: linksFromBlocks,
    images: imagesFromBlocks,
    stylesheets: dedupe(stylesheetUrls),
    scripts: dedupe(scriptUrls),
  };
}

function formatTimestampForFile(input: Date): string {
  const y = input.getUTCFullYear();
  const m = String(input.getUTCMonth() + 1).padStart(2, '0');
  const d = String(input.getUTCDate()).padStart(2, '0');
  const hh = String(input.getUTCHours()).padStart(2, '0');
  const mm = String(input.getUTCMinutes()).padStart(2, '0');
  const ss = String(input.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function buildDumpPayload(
  fetchedAt: string,
  selectedTemplate: SelectedTemplateSummary,
  html: string,
): PreviewDumpPayload {
  // The dump keeps both the raw HTML and a lightweight structural summary so
  // downstream analysis can inspect content without reparsing everything.
  const bodyHtml = extractBodyHtml(html);
  const blocks = toStructuredBlocks(bodyHtml);
  const assets = collectAssets(html, blocks);

  return {
    metadata: {
      fetchedAt,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      templateType: selectedTemplate.templateType,
      previewUrl: selectedTemplate.previewUrl,
      sourceStep: 'view-preview-url',
    },
    rawHtml: html,
    structured: {
      blocks,
    },
    assets,
  };
}

export async function viewPreviewUrlDumpFromEnv(
  options: ViewTemplateOptions = {},
): Promise<ViewPreviewDumpResult> {
  const fetchedAt = new Date().toISOString();
  const viewResult = await viewSelectedTemplateFromEnv(options);

  if (!viewResult.ok || !viewResult.selectedTemplate) {
    return {
      ok: false,
      fetchedAt,
      locationId: viewResult.locationId,
      selectedTemplate: viewResult.selectedTemplate,
      previewFetch: {
        status: null,
        responseSnippet: viewResult.message,
      },
      message: 'Template selection failed before preview fetch.',
      errorCode: 'SELECTION_FAILED',
    };
  }

  const selectedTemplate = viewResult.selectedTemplate;
  const previewUrlRaw = selectedTemplate.previewUrl?.trim();
  if (!previewUrlRaw) {
    return {
      ok: false,
      fetchedAt,
      locationId: viewResult.locationId,
      selectedTemplate,
      previewFetch: {
        status: null,
        responseSnippet: null,
      },
      message: 'Selected template has no previewUrl.',
      errorCode: 'MISSING_PREVIEW_URL',
    };
  }

  let previewUrl: URL;
  try {
    previewUrl = new URL(previewUrlRaw);
  } catch {
    return {
      ok: false,
      fetchedAt,
      locationId: viewResult.locationId,
      selectedTemplate,
      previewFetch: {
        status: null,
        responseSnippet: previewUrlRaw,
      },
      message: 'Selected template previewUrl is not a valid URL.',
      errorCode: 'INVALID_PREVIEW_URL',
    };
  }

  let html = '';
  let fetchDiagnostics: PreviewFetchDiagnostics = {
    status: null,
    responseSnippet: null,
  };

  try {
    const response = await fetch(previewUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(PREVIEW_FETCH_TIMEOUT_MS),
    });
    html = await response.text();
    fetchDiagnostics = {
      status: response.status,
      responseSnippet: cleanSnippet(html) || null,
    };

    if (!response.ok) {
      return {
        ok: false,
        fetchedAt,
        locationId: viewResult.locationId,
        selectedTemplate,
        previewFetch: fetchDiagnostics,
        message: `Preview URL fetch failed with HTTP ${response.status}.`,
        errorCode: 'PREVIEW_FETCH_HTTP_ERROR',
      };
    }
  } catch (error) {
    const snippet =
      error instanceof Error ? cleanSnippet(error.message) : 'Unknown error';

    return {
      ok: false,
      fetchedAt,
      locationId: viewResult.locationId,
      selectedTemplate,
      previewFetch: {
        status: null,
        responseSnippet: snippet,
      },
      message: 'Preview URL fetch failed due to network/runtime error.',
      errorCode: 'PREVIEW_FETCH_NETWORK_ERROR',
    };
  }

  let dump: PreviewDumpPayload;
  try {
    dump = buildDumpPayload(fetchedAt, selectedTemplate, html);
  } catch (error) {
    const snippet =
      error instanceof Error ? cleanSnippet(error.message) : 'Unknown error';
    return {
      ok: false,
      fetchedAt,
      locationId: viewResult.locationId,
      selectedTemplate,
      previewFetch: {
        status: fetchDiagnostics.status,
        responseSnippet: snippet,
      },
      message: 'Failed to parse preview HTML.',
      errorCode: 'PARSE_ERROR',
    };
  }

  try {
    await mkdir(PREVIEWS_DIR, {recursive: true});
    const fileStamp = formatTimestampForFile(new Date(fetchedAt));
    const fileName = `${selectedTemplate.id}-${fileStamp}.html`;
    const outputPath = resolve(PREVIEWS_DIR, fileName);
    await writeFile(outputPath, html, 'utf-8');

    return {
      ok: true,
      fetchedAt,
      locationId: viewResult.locationId,
      selectedTemplate,
      outputPath,
      dump,
      previewFetch: fetchDiagnostics,
      message: 'Preview HTML saved successfully.',
    };
  } catch (error) {
    const snippet =
      error instanceof Error ? cleanSnippet(error.message) : 'Unknown error';
    return {
      ok: false,
      fetchedAt,
      locationId: viewResult.locationId,
      selectedTemplate,
      previewFetch: {
        status: fetchDiagnostics.status,
        responseSnippet: snippet,
      },
      dump,
      message: 'Failed to write preview dump file.',
      errorCode: 'WRITE_ERROR',
    };
  }
}
