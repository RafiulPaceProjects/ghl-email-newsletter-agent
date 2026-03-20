import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';

import {
  checkGhlConnectionFromEnv,
  type GhlConnectionResult,
} from '../../authentication-ghl/src/checkGhlConnection.js';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';
const RESPONSE_SNIPPET_MAX_LENGTH = 280;

const CURRENT_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const AUTH_ENV_PATH = resolve(
  CURRENT_FILE_DIR,
  '../../authentication-ghl/.env',
);
const OUTPUT_FILE_PATH = resolve(CURRENT_FILE_DIR, '../data/templates.json');

export type FetchTemplatesErrorCode =
  | 'AUTH_CHECK_FAILED'
  | 'MISSING_TOKEN'
  | 'MISSING_LOCATION_ID'
  | 'FETCH_FAILED'
  | 'NETWORK_ERROR'
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

function deriveTemplateCount(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

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
  return `/emails/builder?locationId=${locationId}`;
}

export async function fetchTemplatesFromEnv(): Promise<FetchTemplatesResult> {
  loadSharedEnv();

  const auth = await checkGhlConnectionFromEnv();
  const fetchedAt = new Date().toISOString();
  const locationId = process.env.GHL_LOCATION_ID?.trim() ?? '';
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() ?? '';
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

  const url = new URL(`${GHL_BASE_URL}/emails/builder`);
  url.searchParams.set('locationId', locationId);

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
    const templateCount = deriveTemplateCount(parsedBody);

    if (!response.ok) {
      return {
        ok: false,
        fetchedAt,
        locationId,
        endpoint: buildEndpoint(locationId),
        status: response.status,
        templateCount,
        message: `Template fetch failed with HTTP ${response.status}.`,
        diagnostics: {
          status: response.status,
          responseSnippet: snippet,
        },
        payload: parsedBody,
        auth,
        errorCode: 'FETCH_FAILED',
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
        responseSnippet: snippet,
      },
      payload: parsedBody,
      auth,
    };
  } catch (error) {
    const snippet =
      error instanceof Error ? cleanSnippet(error.message) : 'Unknown error';

    return {
      ok: false,
      fetchedAt,
      locationId,
      endpoint: buildEndpoint(locationId),
      status: null,
      templateCount: null,
      message: 'Template fetch failed due to network/runtime error.',
      diagnostics: {
        status: null,
        responseSnippet: snippet,
      },
      auth,
      errorCode: 'NETWORK_ERROR',
    };
  }
}

export async function fetchAndSaveTemplatesFromEnv(): Promise<FetchAndSaveTemplatesResult> {
  const result = await fetchTemplatesFromEnv();

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
  await mkdir(outputDir, {recursive: true});
  await writeFile(
    OUTPUT_FILE_PATH,
    `${JSON.stringify(filePayload, null, 2)}\n`,
    'utf-8',
  );

  return {
    ...result,
    outputPath: OUTPUT_FILE_PATH,
    fileWritten: true,
  };
}
