import {readFile, stat} from 'node:fs/promises';
import {extname, resolve} from 'node:path';

import {parseFlagValue, requestGhl} from '../../../internal-core/src/index.js';
import {
  cloneTemplateFromEnv,
  type CloneTemplateOptions,
  type CloneTemplateResult,
} from './cloneTemplate.js';

export interface PublishRenderedHtmlOptions extends CloneTemplateOptions {
  renderedHtmlPath: string;
  baseUrl?: string;
}

export interface PublishRenderedHtmlResult {
  ok: boolean;
  stage: string | null;
  message: string;
  sourceRenderedHtml: string;
  sourceRenderedHtmlBytes: number;
  cloneDraft: CloneTemplateResult;
  publishRenderedHtml: {
    status: number | null;
    responseSnippet: string | null;
    data: unknown;
  };
  templateId: string | null;
  previewUrl: string | null;
  templateDataDownloadUrl: string | null;
}

async function resolveRenderedHtmlPath(rawPath: string): Promise<string> {
  const renderedHtmlPath = resolve(process.cwd(), rawPath);
  if (extname(renderedHtmlPath).toLowerCase() !== '.html') {
    throw new Error(
      `--rendered-html must point to an .html file: ${renderedHtmlPath}`,
    );
  }

  let fileStat;
  try {
    fileStat = await stat(renderedHtmlPath);
  } catch {
    throw new Error(`Rendered HTML file not found: ${renderedHtmlPath}`);
  }

  if (!fileStat.isFile()) {
    throw new Error(`Rendered HTML path is not a file: ${renderedHtmlPath}`);
  }

  return renderedHtmlPath;
}

export function parsePublishRenderedHtmlArgs(
  args: string[],
): PublishRenderedHtmlOptions {
  const renderedHtmlPath = parseFlagValue(args, '--rendered-html');
  if (!renderedHtmlPath) {
    throw new Error('Missing required --rendered-html argument.');
  }

  return {
    renderedHtmlPath,
    templateId: parseFlagValue(args, '--template-id'),
    templateName: parseFlagValue(args, '--template-name'),
    draftName: parseFlagValue(args, '--draft-name'),
  };
}

export async function publishRenderedHtmlFromEnv(
  options: PublishRenderedHtmlOptions,
): Promise<PublishRenderedHtmlResult> {
  const renderedHtmlPath = await resolveRenderedHtmlPath(
    options.renderedHtmlPath,
  );
  const renderedHtml = await readFile(renderedHtmlPath, 'utf-8');
  const cloneDraft = await cloneTemplateFromEnv(options);

  if (!cloneDraft.ok || !cloneDraft.clonedTemplate?.id) {
    return {
      ok: false,
      stage: 'cloneDraft',
      message: cloneDraft.message,
      sourceRenderedHtml: renderedHtmlPath,
      sourceRenderedHtmlBytes: renderedHtml.length,
      cloneDraft,
      publishRenderedHtml: {
        status: null,
        responseSnippet: null,
        data: null,
      },
      templateId: cloneDraft.clonedTemplate?.id ?? null,
      previewUrl: cloneDraft.clonedTemplate?.previewUrl ?? null,
      templateDataDownloadUrl:
        cloneDraft.clonedTemplate?.templateDataDownloadUrl ?? null,
    };
  }

  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() ?? '';
  const locationId = cloneDraft.locationId ?? '';
  if (!token || !locationId) {
    return {
      ok: false,
      stage: 'publishRenderedHtml',
      message: 'Missing GHL_PRIVATE_INTEGRATION_TOKEN or GHL_LOCATION_ID.',
      sourceRenderedHtml: renderedHtmlPath,
      sourceRenderedHtmlBytes: renderedHtml.length,
      cloneDraft,
      publishRenderedHtml: {
        status: null,
        responseSnippet: null,
        data: null,
      },
      templateId: cloneDraft.clonedTemplate.id,
      previewUrl: cloneDraft.clonedTemplate.previewUrl,
      templateDataDownloadUrl:
        cloneDraft.clonedTemplate.templateDataDownloadUrl,
    };
  }

  const publish = await requestGhl('/emails/builder/data', {
    method: 'POST',
    token,
    baseUrl:
      options.baseUrl ??
      process.env.PUBLISH_INJECTED_DRAFT_BASE_URL ??
      undefined,
    jsonBody: {
      locationId,
      templateId: cloneDraft.clonedTemplate.id,
      html: renderedHtml,
      editorType: 'html',
      updatedBy: 'publish-rendered-draft',
    },
  });

  const publishData =
    publish.data && typeof publish.data === 'object'
      ? (publish.data as Record<string, unknown>)
      : {};

  return {
    ok: publish.ok,
    stage: publish.ok ? null : 'publishRenderedHtml',
    message: publish.ok
      ? 'Draft created and overwritten with the provided rendered HTML.'
      : `Rendered HTML publish failed (${publish.status ?? 'network'}).`,
    sourceRenderedHtml: renderedHtmlPath,
    sourceRenderedHtmlBytes: renderedHtml.length,
    cloneDraft,
    publishRenderedHtml: {
      status: publish.status,
      responseSnippet: publish.responseSnippet,
      data: publish.data,
    },
    templateId: cloneDraft.clonedTemplate.id,
    previewUrl:
      typeof publishData.previewUrl === 'string'
        ? publishData.previewUrl
        : cloneDraft.clonedTemplate.previewUrl,
    templateDataDownloadUrl:
      typeof publishData.templateDataDownloadUrl === 'string'
        ? publishData.templateDataDownloadUrl
        : cloneDraft.clonedTemplate.templateDataDownloadUrl,
  };
}
