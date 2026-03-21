/**
 * Clone flow core: select a base template through `view-content`, fetch its
 * preview HTML, create a new draft shell, then overwrite that draft with the
 * fetched HTML. The result object keeps each boundary visible so downstream
 * agents can trace selection, preview fetch, create, and update separately.
 */
import {
  type SelectedTemplateSummary,
  viewSelectedTemplateFromEnv,
  type ViewTemplateOptions,
} from '../../view-content/src/viewTemplate.js';
import {
  cleanSnippet,
  DEFAULT_GHL_REQUEST_TIMEOUT_MS,
  mapHttpErrorCode,
  parseJsonBody,
  readGhlEnvConfig,
  requestGhl,
} from '../../../internal-core/src/index.js';

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

// Use an explicit override when provided; otherwise stamp the derived draft
// name with UTC time so repeated clones remain distinguishable.
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

// Keep HTTP-specific error mapping centralized so both mutation stages emit the
// same external contract even when upstream API bodies vary.
function mapMutationErrorCode(
  prefix: 'CREATE' | 'UPDATE',
  status: number,
): CloneTemplateErrorCode {
  return mapHttpErrorCode(prefix, status) as CloneTemplateErrorCode;
}

// Convert unknown values into safe object access at the response boundary.
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

// Walk the common top-level and nested response shapes until a template id is
// found. This keeps the clone step tolerant of small API shape differences.
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

// Pull the base template's preview HTML into memory before any mutation calls.
// This isolates preview validation from create/update failures in diagnostics.
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
      signal: AbortSignal.timeout(DEFAULT_GHL_REQUEST_TIMEOUT_MS),
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

// Wrap POST mutations so create and update share auth headers, timeout rules,
// response parsing, and diagnostic snippet capture.
async function callMutation(
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{
  ok: boolean;
  status: number | null;
  diagnostics: CloneTemplateMutationDiagnostics;
  data: unknown;
}> {
  const response = await requestGhl(path, {
    method: 'POST',
    token,
    jsonBody: body,
  });

  return {
    ok: response.ok,
    status: response.status,
    diagnostics: {
      status: response.status,
      responseSnippet: response.responseSnippet,
    },
    data: response.text === null ? null : parseJsonBody(response.text),
  };
}

export async function cloneTemplateFromEnv(
  options: CloneTemplateOptions = {},
): Promise<CloneTemplateResult> {
  const fetchedAt = new Date().toISOString();

  // Delegate template selection to the existing view-content flow so this
  // service only owns cloning, not lookup semantics.
  const selection = await viewSelectedTemplateFromEnv(options);
  const {token, locationId} = readGhlEnvConfig();

  const emptyDiagnostics: CloneTemplateMutationDiagnostics = {
    status: null,
    responseSnippet: null,
  };

  // Fail fast when the upstream selection step cannot provide a base template.
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

  // Validate env-driven auth context before doing preview or mutation work.
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

  // The preview URL is the handoff from selection into clone execution.
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

  // Capture the source HTML first so later failures can still report how far
  // the pipeline got and how much content was fetched.
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
    // Create an empty HTML draft first. The returned id becomes the key for
    // the second mutation that uploads the fetched preview HTML.
    const create = await callMutation('/emails/builder', token, {
      locationId,
      name: draftName,
      type: 'html',
    });
    createRequest = create.diagnostics;

    if (!create.ok || create.status === null) {
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
        message:
          create.status === null
            ? 'Create draft failed due to network/runtime error.'
            : `Create draft failed with HTTP ${create.status}.`,
        errorCode:
          create.status === null
            ? 'CREATE_FAILED'
            : mapMutationErrorCode('CREATE', create.status),
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

    // Reuse the fetched preview HTML verbatim as the new draft body so clone
    // remains a transport step rather than a content transformation step.
    const update = await callMutation('/emails/builder/data', token, {
      locationId,
      templateId,
      html: previewFetch.html,
      editorType: 'html',
      updatedBy: 'clone-content',
    });

    if (!update.ok || update.status === null) {
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
        message:
          update.status === null
            ? 'Draft HTML update failed due to network/runtime error.'
            : `Draft HTML update failed with HTTP ${update.status}.`,
        errorCode:
          update.status === null
            ? 'UPDATE_FAILED'
            : mapMutationErrorCode('UPDATE', update.status),
      };
    }

    // Surface the new template identity plus any API-returned preview URLs for
    // downstream inject/publish steps.
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
    // Network/runtime errors after preview fetch still preserve the completed
    // diagnostics so callers can tell whether create or update failed.
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
