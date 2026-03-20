import {
  type SelectedTemplateSummary,
  viewSelectedTemplateFromEnv,
  type ViewTemplateOptions,
} from '../../view-content/src/viewTemplate.js';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';
const RESPONSE_SNIPPET_MAX_LENGTH = 280;
const REQUEST_TIMEOUT_MS = 12_000;

export interface CloneTemplateOptions extends ViewTemplateOptions {
  draftName?: string;
}

export type CloneTemplateErrorCode =
  | 'SELECTION_FAILED'
  | 'MISSING_TOKEN'
  | 'MISSING_LOCATION_ID'
  | 'MISSING_PREVIEW_URL'
  | 'INVALID_PREVIEW_URL'
  | 'PREVIEW_FETCH_HTTP_ERROR'
  | 'PREVIEW_FETCH_NETWORK_ERROR'
  | 'CREATE_400'
  | 'CREATE_401'
  | 'CREATE_404'
  | 'CREATE_422'
  | 'CREATE_FAILED'
  | 'CREATE_MISSING_TEMPLATE_ID'
  | 'UPDATE_400'
  | 'UPDATE_401'
  | 'UPDATE_404'
  | 'UPDATE_422'
  | 'UPDATE_FAILED'
  | 'UNKNOWN_ERROR';

export interface CloneTemplateMutationDiagnostics {
  status: number | null;
  responseSnippet: string | null;
}

export interface ClonedTemplateSummary {
  id: string;
  name: string;
  editorType: 'html';
  sourceTemplateId: string;
  sourcePreviewUrl: string;
  previewUrl: string | null;
  templateDataDownloadUrl: string | null;
}

export interface CloneTemplateResult {
  ok: boolean;
  fetchedAt: string;
  locationId: string | null;
  baseTemplate: SelectedTemplateSummary | null;
  clonedTemplate: ClonedTemplateSummary | null;
  sourceHtmlLength: number | null;
  previewFetch: CloneTemplateMutationDiagnostics;
  createRequest: CloneTemplateMutationDiagnostics;
  updateRequest: CloneTemplateMutationDiagnostics;
  message: string;
  errorCode?: CloneTemplateErrorCode;
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

function buildDraftName(
  baseTemplate: SelectedTemplateSummary,
  override?: string,
  now = new Date(),
): string {
  const explicit = override?.trim();
  if (explicit) {
    return explicit;
  }

  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');

  return `${baseTemplate.name} Draft Copy ${y}-${m}-${d} ${hh}:${mm} UTC`;
}

function mapMutationErrorCode(
  prefix: 'CREATE' | 'UPDATE',
  status: number,
): CloneTemplateErrorCode {
  if (status === 400) {
    return `${prefix}_400`;
  }
  if (status === 401) {
    return `${prefix}_401`;
  }
  if (status === 404) {
    return `${prefix}_404`;
  }
  if (status === 422) {
    return `${prefix}_422`;
  }
  return `${prefix}_FAILED`;
}

function parseResponseData(raw: string): unknown {
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function extractTemplateId(data: unknown): string | null {
  const root = asObject(data);
  const directKeys = ['id', 'templateId', 'builderId', 'redirect'];

  for (const key of directKeys) {
    const value = root[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const nestedKeys = ['builder', 'template', 'data'];
  for (const key of nestedKeys) {
    const nested = root[key];
    if (nested && typeof nested === 'object') {
      const nestedId = extractTemplateId(nested);
      if (nestedId) {
        return nestedId;
      }
    }
  }

  return null;
}

async function fetchPreviewHtml(previewUrl: string): Promise<
  | {
      ok: true;
      html: string;
      diagnostics: CloneTemplateMutationDiagnostics;
    }
  | {
      ok: false;
      errorCode: CloneTemplateErrorCode;
      message: string;
      diagnostics: CloneTemplateMutationDiagnostics;
    }
> {
  let url: URL;
  try {
    url = new URL(previewUrl);
  } catch {
    return {
      ok: false,
      errorCode: 'INVALID_PREVIEW_URL',
      message: 'Selected template previewUrl is not a valid URL.',
      diagnostics: {
        status: null,
        responseSnippet: previewUrl,
      },
    };
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const html = await response.text();
    const diagnostics = {
      status: response.status,
      responseSnippet: cleanSnippet(html) || null,
    };

    if (!response.ok) {
      return {
        ok: false,
        errorCode: 'PREVIEW_FETCH_HTTP_ERROR',
        message: `Preview URL fetch failed with HTTP ${response.status}.`,
        diagnostics,
      };
    }

    return {
      ok: true,
      html,
      diagnostics,
    };
  } catch (error) {
    return {
      ok: false,
      errorCode: 'PREVIEW_FETCH_NETWORK_ERROR',
      message: 'Preview URL fetch failed due to network/runtime error.',
      diagnostics: {
        status: null,
        responseSnippet:
          error instanceof Error
            ? cleanSnippet(error.message)
            : 'Unknown error',
      },
    };
  }
}

async function callMutation(
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{
  ok: boolean;
  status: number;
  diagnostics: CloneTemplateMutationDiagnostics;
  data: unknown;
}> {
  const response = await fetch(new URL(`${GHL_BASE_URL}${path}`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Version: GHL_API_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const rawBody = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    diagnostics: {
      status: response.status,
      responseSnippet: cleanSnippet(rawBody) || null,
    },
    data: parseResponseData(rawBody),
  };
}

export async function cloneTemplateFromEnv(
  options: CloneTemplateOptions = {},
): Promise<CloneTemplateResult> {
  const fetchedAt = new Date().toISOString();
  const selection = await viewSelectedTemplateFromEnv(options);
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() ?? '';
  const locationId = process.env.GHL_LOCATION_ID?.trim() ?? '';

  const emptyDiagnostics: CloneTemplateMutationDiagnostics = {
    status: null,
    responseSnippet: null,
  };

  if (!selection.ok || !selection.selectedTemplate) {
    return {
      ok: false,
      fetchedAt,
      locationId: selection.locationId,
      baseTemplate: selection.selectedTemplate,
      clonedTemplate: null,
      sourceHtmlLength: null,
      previewFetch: {
        status: null,
        responseSnippet: selection.message,
      },
      createRequest: emptyDiagnostics,
      updateRequest: emptyDiagnostics,
      message: 'Base template selection failed before clone request.',
      errorCode: 'SELECTION_FAILED',
    };
  }

  if (!token) {
    return {
      ok: false,
      fetchedAt,
      locationId: locationId || null,
      baseTemplate: selection.selectedTemplate,
      clonedTemplate: null,
      sourceHtmlLength: null,
      previewFetch: emptyDiagnostics,
      createRequest: emptyDiagnostics,
      updateRequest: emptyDiagnostics,
      message: 'Missing GHL_PRIVATE_INTEGRATION_TOKEN.',
      errorCode: 'MISSING_TOKEN',
    };
  }

  if (!locationId) {
    return {
      ok: false,
      fetchedAt,
      locationId: null,
      baseTemplate: selection.selectedTemplate,
      clonedTemplate: null,
      sourceHtmlLength: null,
      previewFetch: emptyDiagnostics,
      createRequest: emptyDiagnostics,
      updateRequest: emptyDiagnostics,
      message: 'Missing GHL_LOCATION_ID.',
      errorCode: 'MISSING_LOCATION_ID',
    };
  }

  const baseTemplate = selection.selectedTemplate;
  const previewUrl = baseTemplate.previewUrl?.trim();
  if (!previewUrl) {
    return {
      ok: false,
      fetchedAt,
      locationId,
      baseTemplate,
      clonedTemplate: null,
      sourceHtmlLength: null,
      previewFetch: emptyDiagnostics,
      createRequest: emptyDiagnostics,
      updateRequest: emptyDiagnostics,
      message: 'Selected template has no previewUrl.',
      errorCode: 'MISSING_PREVIEW_URL',
    };
  }

  const previewFetch = await fetchPreviewHtml(previewUrl);
  if (!previewFetch.ok) {
    return {
      ok: false,
      fetchedAt,
      locationId,
      baseTemplate,
      clonedTemplate: null,
      sourceHtmlLength: null,
      previewFetch: previewFetch.diagnostics,
      createRequest: emptyDiagnostics,
      updateRequest: emptyDiagnostics,
      message: previewFetch.message,
      errorCode: previewFetch.errorCode,
    };
  }

  const draftName = buildDraftName(
    baseTemplate,
    options.draftName,
    new Date(fetchedAt),
  );

  let createRequest = emptyDiagnostics;
  try {
    const create = await callMutation('/emails/builder', token, {
      locationId,
      name: draftName,
      type: 'html',
    });
    createRequest = create.diagnostics;

    if (!create.ok) {
      return {
        ok: false,
        fetchedAt,
        locationId,
        baseTemplate,
        clonedTemplate: null,
        sourceHtmlLength: previewFetch.html.length,
        previewFetch: previewFetch.diagnostics,
        createRequest,
        updateRequest: emptyDiagnostics,
        message: `Create draft failed with HTTP ${create.status}.`,
        errorCode: mapMutationErrorCode('CREATE', create.status),
      };
    }

    const templateId = extractTemplateId(create.data);
    if (!templateId) {
      return {
        ok: false,
        fetchedAt,
        locationId,
        baseTemplate,
        clonedTemplate: null,
        sourceHtmlLength: previewFetch.html.length,
        previewFetch: previewFetch.diagnostics,
        createRequest,
        updateRequest: emptyDiagnostics,
        message: 'Create draft response did not include a template id.',
        errorCode: 'CREATE_MISSING_TEMPLATE_ID',
      };
    }

    const update = await callMutation('/emails/builder/data', token, {
      locationId,
      templateId,
      html: previewFetch.html,
      editorType: 'html',
      updatedBy: 'clone-content',
    });

    if (!update.ok) {
      return {
        ok: false,
        fetchedAt,
        locationId,
        baseTemplate,
        clonedTemplate: null,
        sourceHtmlLength: previewFetch.html.length,
        previewFetch: previewFetch.diagnostics,
        createRequest,
        updateRequest: update.diagnostics,
        message: `Draft HTML update failed with HTTP ${update.status}.`,
        errorCode: mapMutationErrorCode('UPDATE', update.status),
      };
    }

    const updateData = asObject(update.data);
    return {
      ok: true,
      fetchedAt,
      locationId,
      baseTemplate,
      clonedTemplate: {
        id: templateId,
        name: draftName,
        editorType: 'html',
        sourceTemplateId: baseTemplate.id,
        sourcePreviewUrl: previewUrl,
        previewUrl:
          typeof updateData.previewUrl === 'string'
            ? updateData.previewUrl
            : null,
        templateDataDownloadUrl:
          typeof updateData.templateDataDownloadUrl === 'string'
            ? updateData.templateDataDownloadUrl
            : null,
      },
      sourceHtmlLength: previewFetch.html.length,
      previewFetch: previewFetch.diagnostics,
      createRequest,
      updateRequest: update.diagnostics,
      message: 'Draft clone completed from base template preview HTML.',
    };
  } catch (error) {
    return {
      ok: false,
      fetchedAt,
      locationId,
      baseTemplate,
      clonedTemplate: null,
      sourceHtmlLength: previewFetch.html.length,
      previewFetch: previewFetch.diagnostics,
      createRequest,
      updateRequest: {
        status: null,
        responseSnippet:
          error instanceof Error
            ? cleanSnippet(error.message)
            : 'Unknown error',
      },
      message: 'Clone request failed due to network/runtime error.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}
