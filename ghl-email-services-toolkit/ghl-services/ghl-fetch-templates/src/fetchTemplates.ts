import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  checkGhlConnectionFromEnv,
  type GhlConnectionResult,
} from '../../authentication-ghl/src/checkGhlConnection.js';
import {
  buildGhlEndpoint,
  cleanSnippet,
  loadToolkitEnv,
  readGhlEnvConfig,
  requestGhl,
} from '../../internal-core/src/index.js';

/**
 * Template inventory stage. This package keeps the fetch boundary narrow:
 * reuse the shared auth probe, call the builder listing endpoint, then write
 * the raw response snapshot to disk for later selection and inspection flows.
 */
const CURRENT_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE_PATH = resolve(CURRENT_FILE_DIR, '../data/templates.json');

export type FetchTemplatesErrorCode =
  | 'AUTH_CHECK_FAILED'
  | 'MISSING_TOKEN'
  | 'MISSING_LOCATION_ID'
  | 'FETCH_FAILED'
  | 'NETWORK_ERROR'
  | 'WRITE_ERROR'
  | 'UNKNOWN_ERROR';

export interface FetchTemplatesDiagnostics {
  status: number | null;
  responseSnippet: string | null;
}

export interface TemplatesFilePayload {
  fetchedAt: string;
  locationId: string;
  endpoint: string;
  status: number;
  templateCount: number | null;
  payload: unknown;
}

export interface FetchTemplatesResult {
  ok: boolean;
  fetchedAt: string;
  locationId: string | null;
  endpoint: string;
  status: number | null;
  templateCount: number | null;
  message: string;
  diagnostics: FetchTemplatesDiagnostics;
  payload?: unknown;
  auth: GhlConnectionResult;
  errorCode?: FetchTemplatesErrorCode;
}

export interface FetchAndSaveTemplatesResult extends FetchTemplatesResult {
  outputPath: string;
  fileWritten: boolean;
}

function deriveTemplateCount(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  // The API has been observed returning either `builders[]` or `templates[]`
  // across different callers and docs, so count defensively at the boundary.
  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.builders)) {
    return record.builders.length;
  }

  if (Array.isArray(record.templates)) {
    return record.templates.length;
  }

  return null;
}

function buildEndpoint(locationId: string): string {
  return buildGhlEndpoint('/emails/builder', {locationId});
}

export async function fetchTemplatesFromEnv(): Promise<FetchTemplatesResult> {
  loadToolkitEnv();

  // Reuse the auth gate before attempting the inventory fetch so downstream
  // consumers always receive both fetch diagnostics and auth context together.
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
      templateCount: null,
      message: 'Auth check failed. Fetch was not attempted.',
      diagnostics: {
        status: null,
        responseSnippet: auth.message,
      },
      auth,
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
      templateCount: null,
      message: 'Missing GHL_PRIVATE_INTEGRATION_TOKEN.',
      diagnostics: {
        status: null,
        responseSnippet: null,
      },
      auth,
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
      templateCount: null,
      message: 'Missing GHL_LOCATION_ID.',
      diagnostics: {
        status: null,
        responseSnippet: null,
      },
      auth,
      errorCode: 'MISSING_LOCATION_ID',
    };
  }

  const response = await requestGhl('/emails/builder', {
    token,
    query: {locationId},
  });
  const parsedBody = response.data;
  const templateCount = deriveTemplateCount(parsedBody);

  if (!response.ok) {
    return {
      ok: false,
      fetchedAt,
      locationId,
      endpoint: buildEndpoint(locationId),
      status: response.status,
      templateCount: response.status === null ? null : templateCount,
      message:
        response.status === null
          ? 'Template fetch failed due to network/runtime error.'
          : `Template fetch failed with HTTP ${response.status}.`,
      diagnostics: {
        status: response.status,
        responseSnippet: response.responseSnippet,
      },
      auth,
      payload: response.status === null ? undefined : parsedBody,
      errorCode: response.status === null ? 'NETWORK_ERROR' : 'FETCH_FAILED',
    };
  }

  return {
    ok: true,
    fetchedAt,
    locationId,
    endpoint: buildEndpoint(locationId),
    status: response.status,
    templateCount,
    message: 'Template fetch succeeded.',
    diagnostics: {
      status: response.status,
      responseSnippet: response.responseSnippet,
    },
    payload: parsedBody,
    auth,
  };
}

export async function fetchAndSaveTemplatesFromEnv(): Promise<FetchAndSaveTemplatesResult> {
  const result = await fetchTemplatesFromEnv();

  // Only persist successful, fully-formed fetches. Failure results still return
  // the intended output path so callers can report where the snapshot would live.
  if (!result.ok || !result.payload || !result.locationId || !result.status) {
    return {
      ...result,
      outputPath: OUTPUT_FILE_PATH,
      fileWritten: false,
      errorCode: result.errorCode ?? 'UNKNOWN_ERROR',
    };
  }

  const filePayload: TemplatesFilePayload = {
    fetchedAt: result.fetchedAt,
    locationId: result.locationId,
    endpoint: result.endpoint,
    status: result.status,
    templateCount: result.templateCount,
    payload: result.payload,
  };

  const outputDir = dirname(OUTPUT_FILE_PATH);
  try {
    await mkdir(outputDir, {recursive: true});
    await writeFile(
      OUTPUT_FILE_PATH,
      `${JSON.stringify(filePayload, null, 2)}\n`,
      'utf-8',
    );
  } catch (error) {
    const snippet =
      error instanceof Error ? cleanSnippet(error.message) : 'Unknown error';
    return {
      ...result,
      outputPath: OUTPUT_FILE_PATH,
      fileWritten: false,
      errorCode: 'WRITE_ERROR',
      message: 'Template fetch succeeded but file write failed.',
      diagnostics: {
        status: result.diagnostics.status,
        responseSnippet: snippet,
      },
    };
  }

  return {
    ...result,
    outputPath: OUTPUT_FILE_PATH,
    fileWritten: true,
  };
}
