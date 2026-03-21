import readline from 'node:readline/promises';

import {
  checkGhlConnectionFromEnv,
  type GhlConnectionResult,
} from '../../authentication-ghl/src/checkGhlConnection.js';
import {
  buildGhlEndpoint,
  loadToolkitEnv,
  readGhlEnvConfig,
  requestGhl,
} from '../../internal-core/src/index.js';

/**
 * Template selection stage for CLI-driven workflows. It fetches the current
 * builder inventory once, normalizes the candidate list, then resolves either
 * an explicit flag-based selection or an interactive numbered choice.
 */
export type SelectTemplateErrorCode =
  | 'AUTH_CHECK_FAILED'
  | 'MISSING_TOKEN'
  | 'MISSING_LOCATION_ID'
  | 'FETCH_FAILED'
  | 'NETWORK_ERROR'
  | 'TEMPLATE_NOT_FOUND'
  | 'NO_TEMPLATES_FOUND'
  | 'INVALID_SELECTION'
  | 'NON_INTERACTIVE_SELECTION_REQUIRED'
  | 'UNKNOWN_ERROR';

export interface SelectableTemplate {
  id: string;
  name: string;
  templateType: string;
  previewUrl: string;
  isPlainText: boolean;
  updatedBy: string;
  dateAdded: string;
  lastUpdated: string;
  version: string;
}

export interface SelectTemplateDiagnostics {
  status: number | null;
  responseSnippet: string | null;
}

export interface SearchSelector {
  type: 'id' | 'name';
  value: string;
}

export interface FetchTemplateCandidatesResult {
  ok: boolean;
  fetchedAt: string;
  locationId: string | null;
  endpoint: string;
  status: number | null;
  candidateCount: number;
  candidates: SelectableTemplate[];
  diagnostics: SelectTemplateDiagnostics;
  auth: GhlConnectionResult;
  message: string;
  errorCode?: SelectTemplateErrorCode;
}

export interface SelectTemplateOptions {
  templateId?: string;
  templateName?: string;
}

export interface PromptIo {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
}

export interface SelectTemplateRuntime {
  io?: PromptIo;
  isInteractive?: boolean;
  promptSelection?: (
    candidates: SelectableTemplate[],
    io: PromptIo,
  ) => Promise<string>;
}

export interface SelectTemplateResult {
  ok: boolean;
  fetchedAt: string;
  locationId: string | null;
  mode: 'interactive' | 'flag';
  searchedBy?: SearchSelector;
  endpoint: string;
  status: number | null;
  candidateCount: number;
  selectedTemplate: SelectableTemplate | null;
  diagnostics: SelectTemplateDiagnostics;
  auth: GhlConnectionResult;
  message: string;
  errorCode?: SelectTemplateErrorCode;
}

function buildEndpoint(locationId: string): string {
  return buildGhlEndpoint('/emails/builder', {locationId});
}

function normalizeTemplate(raw: unknown): SelectableTemplate | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.name !== 'string') {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    templateType:
      typeof record.templateType === 'string' ? record.templateType : '',
    previewUrl: typeof record.previewUrl === 'string' ? record.previewUrl : '',
    isPlainText: Boolean(record.isPlainText),
    updatedBy: typeof record.updatedBy === 'string' ? record.updatedBy : '',
    dateAdded: typeof record.dateAdded === 'string' ? record.dateAdded : '',
    lastUpdated:
      typeof record.lastUpdated === 'string' ? record.lastUpdated : '',
    version: typeof record.version === 'string' ? record.version : '',
  };
}

function deriveCandidates(payload: unknown): SelectableTemplate[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const rawCandidates = Array.isArray(record.builders)
    ? record.builders
    : Array.isArray(record.templates)
      ? record.templates
      : [];

  return rawCandidates
    .map(normalizeTemplate)
    .filter((template): template is SelectableTemplate => template !== null);
}

function resolveSearchSelector(
  options: SelectTemplateOptions,
): SearchSelector | null {
  const templateId = options.templateId?.trim();
  if (templateId) {
    return {
      type: 'id',
      value: templateId,
    };
  }

  const templateName = options.templateName?.trim();
  if (templateName) {
    return {
      type: 'name',
      value: templateName,
    };
  }

  return null;
}

function resolveTemplateBySelector(
  candidates: SelectableTemplate[],
  selector: SearchSelector,
): SelectableTemplate | null {
  if (selector.type === 'id') {
    return (
      candidates.find(candidate => candidate.id === selector.value) ?? null
    );
  }

  const loweredName = selector.value.trim().toLowerCase();
  return (
    candidates.find(
      candidate => candidate.name.trim().toLowerCase() === loweredName,
    ) ?? null
  );
}

function formatInteractiveList(candidates: SelectableTemplate[]): string {
  return candidates
    .map((candidate, index) => {
      const number = String(index + 1).padStart(2, ' ');
      const templateType = candidate.templateType || 'unknown';
      return `${number}. ${candidate.name} [${candidate.id}] (${templateType})`;
    })
    .join('\n');
}

function createInvalidSelectionResult(
  base: FetchTemplateCandidatesResult,
  mode: 'interactive' | 'flag',
  message: string,
): SelectTemplateResult {
  return {
    ok: false,
    fetchedAt: base.fetchedAt,
    locationId: base.locationId,
    mode,
    endpoint: base.endpoint,
    status: base.status,
    candidateCount: base.candidateCount,
    selectedTemplate: null,
    diagnostics: base.diagnostics,
    auth: base.auth,
    message,
    errorCode: 'INVALID_SELECTION',
  };
}

async function defaultPromptSelection(
  candidates: SelectableTemplate[],
  io: PromptIo,
): Promise<string> {
  io.output.write(`${formatInteractiveList(candidates)}\n`);
  const rl = readline.createInterface({
    input: io.input,
    output: io.output,
  });

  try {
    return await rl.question('Choose a base template by number: ');
  } finally {
    rl.close();
  }
}

export async function fetchTemplateCandidatesFromEnv(): Promise<FetchTemplateCandidatesResult> {
  loadToolkitEnv();

  const auth = await checkGhlConnectionFromEnv();
  const fetchedAt = new Date().toISOString();
  const {locationId, token} = readGhlEnvConfig();
  const endpoint = buildEndpoint(locationId || '<missing-location-id>');

  if (!auth.ok) {
    return {
      ok: false,
      fetchedAt,
      locationId: auth.locationId,
      endpoint,
      status: null,
      candidateCount: 0,
      candidates: [],
      diagnostics: {
        status: null,
        responseSnippet: auth.message,
      },
      auth,
      message: 'Auth check failed. Template selection was not attempted.',
      errorCode: 'AUTH_CHECK_FAILED',
    };
  }

  if (!token) {
    return {
      ok: false,
      fetchedAt,
      locationId: locationId || null,
      endpoint,
      status: null,
      candidateCount: 0,
      candidates: [],
      diagnostics: {
        status: null,
        responseSnippet: null,
      },
      auth,
      message: 'Missing GHL_PRIVATE_INTEGRATION_TOKEN.',
      errorCode: 'MISSING_TOKEN',
    };
  }

  if (!locationId) {
    return {
      ok: false,
      fetchedAt,
      locationId: null,
      endpoint,
      status: null,
      candidateCount: 0,
      candidates: [],
      diagnostics: {
        status: null,
        responseSnippet: null,
      },
      auth,
      message: 'Missing GHL_LOCATION_ID.',
      errorCode: 'MISSING_LOCATION_ID',
    };
  }

  const response = await requestGhl('/emails/builder', {
    token,
    query: {locationId},
  });
  const candidates = deriveCandidates(response.data);

  if (!response.ok) {
    return {
      ok: false,
      fetchedAt,
      locationId,
      endpoint: buildEndpoint(locationId),
      status: response.status,
      candidateCount: response.status === null ? 0 : candidates.length,
      candidates: response.status === null ? [] : candidates,
      diagnostics: {
        status: response.status,
        responseSnippet: response.responseSnippet,
      },
      auth,
      message:
        response.status === null
          ? 'Template fetch failed due to network/runtime error.'
          : `Template fetch failed with HTTP ${response.status}.`,
      errorCode: response.status === null ? 'NETWORK_ERROR' : 'FETCH_FAILED',
    };
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      fetchedAt,
      locationId,
      endpoint: buildEndpoint(locationId),
      status: response.status,
      candidateCount: 0,
      candidates: [],
      diagnostics: {
        status: response.status,
        responseSnippet: response.responseSnippet,
      },
      auth,
      message: 'Template fetch succeeded but no templates were returned.',
      errorCode: 'NO_TEMPLATES_FOUND',
    };
  }

  return {
    ok: true,
    fetchedAt,
    locationId,
    endpoint: buildEndpoint(locationId),
    status: response.status,
    candidateCount: candidates.length,
    candidates,
    diagnostics: {
      status: response.status,
      responseSnippet: response.responseSnippet,
    },
    auth,
    message: 'Template candidates are ready for selection.',
  };
}

export async function runInteractiveTemplateSelection(
  candidates: SelectableTemplate[],
  runtime: SelectTemplateRuntime = {},
): Promise<SelectableTemplate | null> {
  const io = runtime.io ?? {
    input: process.stdin,
    output: process.stdout,
  };
  const promptSelection = runtime.promptSelection ?? defaultPromptSelection;
  const rawChoice = await promptSelection(candidates, io);
  const normalizedChoice = rawChoice.trim();

  if (!/^\d+$/.test(normalizedChoice)) {
    return null;
  }

  const selectedIndex = Number(normalizedChoice) - 1;
  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= candidates.length
  ) {
    return null;
  }

  return candidates[selectedIndex] ?? null;
}

export async function selectTemplateFromEnv(
  options: SelectTemplateOptions = {},
  runtime: SelectTemplateRuntime = {},
): Promise<SelectTemplateResult> {
  const candidatesResult = await fetchTemplateCandidatesFromEnv();
  const selector = resolveSearchSelector(options);
  const mode = selector ? 'flag' : 'interactive';

  if (!candidatesResult.ok) {
    return {
      ok: false,
      fetchedAt: candidatesResult.fetchedAt,
      locationId: candidatesResult.locationId,
      mode,
      searchedBy: selector ?? undefined,
      endpoint: candidatesResult.endpoint,
      status: candidatesResult.status,
      candidateCount: candidatesResult.candidateCount,
      selectedTemplate: null,
      diagnostics: candidatesResult.diagnostics,
      auth: candidatesResult.auth,
      message: candidatesResult.message,
      errorCode: candidatesResult.errorCode ?? 'UNKNOWN_ERROR',
    };
  }

  if (selector) {
    const selectedTemplate = resolveTemplateBySelector(
      candidatesResult.candidates,
      selector,
    );

    if (!selectedTemplate) {
      return {
        ok: false,
        fetchedAt: candidatesResult.fetchedAt,
        locationId: candidatesResult.locationId,
        mode: 'flag',
        searchedBy: selector,
        endpoint: candidatesResult.endpoint,
        status: candidatesResult.status,
        candidateCount: candidatesResult.candidateCount,
        selectedTemplate: null,
        diagnostics: candidatesResult.diagnostics,
        auth: candidatesResult.auth,
        message: 'Selected template was not found in fetched candidates.',
        errorCode: 'TEMPLATE_NOT_FOUND',
      };
    }

    return {
      ok: true,
      fetchedAt: candidatesResult.fetchedAt,
      locationId: candidatesResult.locationId,
      mode: 'flag',
      searchedBy: selector,
      endpoint: candidatesResult.endpoint,
      status: candidatesResult.status,
      candidateCount: candidatesResult.candidateCount,
      selectedTemplate,
      diagnostics: candidatesResult.diagnostics,
      auth: candidatesResult.auth,
      message: 'Selected base template is ready.',
    };
  }

  const isInteractive = runtime.isInteractive ?? Boolean(process.stdin.isTTY);
  if (!isInteractive) {
    return {
      ok: false,
      fetchedAt: candidatesResult.fetchedAt,
      locationId: candidatesResult.locationId,
      mode: 'interactive',
      endpoint: candidatesResult.endpoint,
      status: candidatesResult.status,
      candidateCount: candidatesResult.candidateCount,
      selectedTemplate: null,
      diagnostics: candidatesResult.diagnostics,
      auth: candidatesResult.auth,
      message:
        'Interactive template selection requires a TTY or an explicit selector flag.',
      errorCode: 'NON_INTERACTIVE_SELECTION_REQUIRED',
    };
  }

  const selectedTemplate = await runInteractiveTemplateSelection(
    candidatesResult.candidates,
    runtime,
  );

  if (!selectedTemplate) {
    return createInvalidSelectionResult(
      candidatesResult,
      'interactive',
      'Interactive selection input was invalid.',
    );
  }

  return {
    ok: true,
    fetchedAt: candidatesResult.fetchedAt,
    locationId: candidatesResult.locationId,
    mode: 'interactive',
    endpoint: candidatesResult.endpoint,
    status: candidatesResult.status,
    candidateCount: candidatesResult.candidateCount,
    selectedTemplate,
    diagnostics: candidatesResult.diagnostics,
    auth: candidatesResult.auth,
    message: 'Selected base template is ready.',
  };
}
