import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';

import {
  checkGhlConnectionFromEnv,
  type GhlConnectionResult,
} from '../../../authentication-ghl/src/checkGhlConnection.js';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';
const DEFAULT_TEMPLATE_NAME = 'nycpolicyscopebase';
const RESPONSE_SNIPPET_MAX_LENGTH = 280;

const CURRENT_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const AUTH_ENV_PATH = resolve(
  CURRENT_FILE_DIR,
  '../../../authentication-ghl/.env',
);

export type ViewTemplateErrorCode =
  | 'AUTH_CHECK_FAILED'
  | 'MISSING_TOKEN'
  | 'MISSING_LOCATION_ID'
  | 'FETCH_400'
  | 'FETCH_401'
  | 'FETCH_404'
  | 'FETCH_422'
  | 'FETCH_FAILED'
  | 'NETWORK_ERROR'
  | 'TEMPLATE_NOT_FOUND'
  | 'UNKNOWN_ERROR';

export interface GhlEmailBuilder {
  id: string;
  name: string;
  updatedBy: string;
  isPlainText: boolean;
  lastUpdated: string;
  dateAdded: string;
  previewUrl: string;
  version: string;
  templateType: string;
}

export interface GhlFetchTemplatesResponse {
  builders: GhlEmailBuilder[];
  total: Array<{total: number}>;
}

export interface SelectedTemplateSummary {
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

export interface ViewTemplateOptions {
  templateName?: string;
  templateId?: string;
}

export interface ViewTemplateDiagnostics {
  status: number | null;
  responseSnippet: string | null;
}

export interface ViewTemplateResult {
  ok: boolean;
  fetchedAt: string;
  locationId: string | null;
  searchedBy: {
    type: 'id' | 'name';
    value: string;
  };
  endpoint: string;
  apiTotal: number | null;
  returnedCount: number;
  selectedTemplate: SelectedTemplateSummary | null;
  auth: GhlConnectionResult;
  message: string;
  diagnostics: ViewTemplateDiagnostics;
  errorCode?: ViewTemplateErrorCode;
}

function loadSharedEnv(): void {
  dotenv.config({path: AUTH_ENV_PATH});
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

function parseJsonBody(raw: string): unknown {
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function toNumberOrNull(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }
  return null;
}

function mapErrorCodeByStatus(status: number): ViewTemplateErrorCode {
  if (status === 400) {
    return 'FETCH_400';
  }
  if (status === 401) {
    return 'FETCH_401';
  }
  if (status === 404) {
    return 'FETCH_404';
  }
  if (status === 422) {
    return 'FETCH_422';
  }
  return 'FETCH_FAILED';
}

function buildEndpoint(
  locationId: string,
  query: Record<string, string> = {},
): string {
  const params = new URLSearchParams({locationId, ...query});
  return `/emails/builder?${params.toString()}`;
}

function safeBuilder(raw: unknown): GhlEmailBuilder | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== 'string' || typeof obj.name !== 'string') {
    return null;
  }

  return {
    id: obj.id,
    name: obj.name,
    updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : '',
    isPlainText: Boolean(obj.isPlainText),
    lastUpdated: typeof obj.lastUpdated === 'string' ? obj.lastUpdated : '',
    dateAdded: typeof obj.dateAdded === 'string' ? obj.dateAdded : '',
    previewUrl: typeof obj.previewUrl === 'string' ? obj.previewUrl : '',
    version: typeof obj.version === 'string' ? obj.version : '',
    templateType: typeof obj.templateType === 'string' ? obj.templateType : '',
  };
}

function toSelectedTemplateSummary(
  template: GhlEmailBuilder,
): SelectedTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    templateType: template.templateType,
    previewUrl: template.previewUrl,
    isPlainText: template.isPlainText,
    updatedBy: template.updatedBy,
    dateAdded: template.dateAdded,
    lastUpdated: template.lastUpdated,
    version: template.version,
  };
}

function resolveSearch(options: ViewTemplateOptions): {
  type: 'id' | 'name';
  value: string;
} {
  const templateId = options.templateId?.trim();
  if (templateId) {
    return {type: 'id', value: templateId};
  }

  const templateName = options.templateName?.trim() || DEFAULT_TEMPLATE_NAME;
  return {type: 'name', value: templateName};
}

interface FetchBuildersPageResult {
  ok: boolean;
  status: number | null;
  endpoint: string;
  diagnostics: ViewTemplateDiagnostics;
  builders: GhlEmailBuilder[];
  apiTotal: number | null;
  errorCode?: ViewTemplateErrorCode;
  message: string;
}

function findSelectedTemplate(
  builders: GhlEmailBuilder[],
  searchedBy: {type: 'id' | 'name'; value: string},
): GhlEmailBuilder | undefined {
  if (searchedBy.type === 'id') {
    return builders.find(template => template.id === searchedBy.value);
  }

  const loweredName = searchedBy.value.trim().toLowerCase();
  return builders.find(
    template => template.name.trim().toLowerCase() === loweredName,
  );
}

function mergeUniqueBuilders(
  base: GhlEmailBuilder[],
  incoming: GhlEmailBuilder[],
): GhlEmailBuilder[] {
  const byId = new Map<string, GhlEmailBuilder>();
  for (const template of base) {
    byId.set(template.id, template);
  }
  for (const template of incoming) {
    byId.set(template.id, template);
  }
  return Array.from(byId.values());
}

async function fetchBuildersPage(
  token: string,
  locationId: string,
  query: Record<string, string>,
): Promise<FetchBuildersPageResult> {
  const endpoint = buildEndpoint(locationId, query);
  const url = new URL(`${GHL_BASE_URL}${endpoint}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Version: GHL_API_VERSION,
      },
      signal: AbortSignal.timeout(12_000),
    });

    const rawBody = await response.text();
    const parsedBody = parseJsonBody(rawBody);
    const snippet = cleanSnippet(rawBody) || null;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        endpoint,
        diagnostics: {
          status: response.status,
          responseSnippet: snippet,
        },
        builders: [],
        apiTotal: null,
        errorCode: mapErrorCodeByStatus(response.status),
        message: `Template view fetch failed with HTTP ${response.status}.`,
      };
    }

    const data =
      parsedBody && typeof parsedBody === 'object'
        ? (parsedBody as Record<string, unknown>)
        : {};

    const rawBuilders = Array.isArray(data.builders) ? data.builders : [];
    const builders = rawBuilders
      .map(safeBuilder)
      .filter((b): b is GhlEmailBuilder => b !== null);

    const totalArray = Array.isArray(data.total) ? data.total : [];
    const apiTotal = toNumberOrNull(
      totalArray[0] && typeof totalArray[0] === 'object'
        ? (totalArray[0] as Record<string, unknown>).total
        : null,
    );

    return {
      ok: true,
      status: response.status,
      endpoint,
      diagnostics: {
        status: response.status,
        responseSnippet: snippet,
      },
      builders,
      apiTotal,
      message: 'Template view fetch succeeded.',
    };
  } catch (error) {
    const snippet =
      error instanceof Error ? cleanSnippet(error.message) : 'Unknown error';

    return {
      ok: false,
      status: null,
      endpoint,
      diagnostics: {
        status: null,
        responseSnippet: snippet,
      },
      builders: [],
      apiTotal: null,
      errorCode: 'NETWORK_ERROR',
      message: 'Template view failed due to network/runtime error.',
    };
  }
}

export async function viewSelectedTemplateFromEnv(
  options: ViewTemplateOptions = {},
): Promise<ViewTemplateResult> {
  loadSharedEnv();

  const auth = await checkGhlConnectionFromEnv();
  const fetchedAt = new Date().toISOString();
  const locationId = process.env.GHL_LOCATION_ID?.trim() ?? '';
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() ?? '';
  const searchedBy = resolveSearch(options);
  const endpoint = buildEndpoint(locationId || '<missing-location-id>');

  if (!auth.ok) {
    return {
      ok: false,
      fetchedAt,
      locationId: auth.locationId,
      searchedBy,
      endpoint,
      apiTotal: null,
      returnedCount: 0,
      selectedTemplate: null,
      auth,
      message: 'Auth check failed. View step was not attempted.',
      diagnostics: {
        status: null,
        responseSnippet: auth.message,
      },
      errorCode: 'AUTH_CHECK_FAILED',
    };
  }

  if (!token) {
    return {
      ok: false,
      fetchedAt,
      locationId: locationId || null,
      searchedBy,
      endpoint,
      apiTotal: null,
      returnedCount: 0,
      selectedTemplate: null,
      auth,
      message: 'Missing GHL_PRIVATE_INTEGRATION_TOKEN.',
      diagnostics: {
        status: null,
        responseSnippet: null,
      },
      errorCode: 'MISSING_TOKEN',
    };
  }

  if (!locationId) {
    return {
      ok: false,
      fetchedAt,
      locationId: null,
      searchedBy,
      endpoint,
      apiTotal: null,
      returnedCount: 0,
      selectedTemplate: null,
      auth,
      message: 'Missing GHL_LOCATION_ID.',
      diagnostics: {
        status: null,
        responseSnippet: null,
      },
      errorCode: 'MISSING_LOCATION_ID',
    };
  }

  const primaryPage = await fetchBuildersPage(token, locationId, {
    limit: '100',
  });
  if (!primaryPage.ok) {
    return {
      ok: false,
      fetchedAt,
      locationId,
      searchedBy,
      endpoint: primaryPage.endpoint,
      apiTotal: null,
      returnedCount: 0,
      selectedTemplate: null,
      auth,
      message: primaryPage.message,
      diagnostics: primaryPage.diagnostics,
      errorCode: primaryPage.errorCode ?? 'UNKNOWN_ERROR',
    };
  }

  let builders = primaryPage.builders;
  let apiTotal = primaryPage.apiTotal;
  let diagnostics = primaryPage.diagnostics;
  let usedEndpoint = primaryPage.endpoint;

  let selected = findSelectedTemplate(builders, searchedBy);

  if (!selected && searchedBy.type === 'name') {
    const namePage = await fetchBuildersPage(token, locationId, {
      name: searchedBy.value,
    });

    if (namePage.ok) {
      builders = mergeUniqueBuilders(builders, namePage.builders);
      selected = findSelectedTemplate(builders, searchedBy);
      diagnostics = namePage.diagnostics;
      usedEndpoint = namePage.endpoint;
      if (namePage.apiTotal !== null) {
        apiTotal = namePage.apiTotal;
      }
    }
  }

  if (!selected && apiTotal !== null && builders.length < apiTotal) {
    let offset = builders.length;

    while (offset < apiTotal) {
      const page = await fetchBuildersPage(token, locationId, {
        limit: '100',
        offset: String(offset),
      });

      // Do not convert incomplete pagination into TEMPLATE_NOT_FOUND.
      if (!page.ok) {
        return {
          ok: false,
          fetchedAt,
          locationId,
          searchedBy,
          endpoint: page.endpoint,
          apiTotal,
          returnedCount: builders.length,
          selectedTemplate: null,
          auth,
          message: page.message,
          diagnostics: page.diagnostics,
          errorCode: page.errorCode ?? 'UNKNOWN_ERROR',
        };
      }

      if (page.builders.length === 0) {
        break;
      }

      builders = mergeUniqueBuilders(builders, page.builders);
      selected = findSelectedTemplate(builders, searchedBy);
      diagnostics = page.diagnostics;
      usedEndpoint = page.endpoint;

      if (selected) {
        break;
      }

      offset += page.builders.length;
    }
  }

  const returnedCount = builders.length;

  if (!selected) {
    return {
      ok: false,
      fetchedAt,
      locationId,
      searchedBy,
      endpoint: usedEndpoint,
      apiTotal,
      returnedCount,
      selectedTemplate: null,
      auth,
      message: 'Selected template was not found in fetched builders.',
      diagnostics,
      errorCode: 'TEMPLATE_NOT_FOUND',
    };
  }

  return {
    ok: true,
    fetchedAt,
    locationId,
    searchedBy,
    endpoint: usedEndpoint,
    apiTotal,
    returnedCount,
    selectedTemplate: toSelectedTemplateSummary(selected),
    auth,
    message: 'Selected template view payload is ready.',
    diagnostics,
  };
}
