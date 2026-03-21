import {
  DEFAULT_GHL_REQUEST_TIMEOUT_MS,
  GHL_API_VERSION,
  GHL_BASE_URL,
  RESPONSE_SNIPPET_MAX_LENGTH,
} from './constants.js';

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface ParsedJsonResponse<T> {
  data: T | null;
  text: string;
}

export interface GhlRequestOptions {
  method?: string;
  token?: string;
  baseUrl?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: HeadersInit;
  jsonBody?: unknown;
  body?: BodyInit | null;
  contentType?: string | null;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

export interface GhlRequestResult<T> {
  ok: boolean;
  status: number | null;
  endpoint: string;
  text: string | null;
  data: T | string | Record<string, never> | null;
  responseSnippet: string | null;
}

export function cleanSnippet(input: string): string {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= RESPONSE_SNIPPET_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, RESPONSE_SNIPPET_MAX_LENGTH)}...`;
}

export function parseJsonBody<T = unknown>(
  raw: string,
): T | string | Record<string, never> {
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw;
  }
}

export async function parseJsonResponse<T>(
  response: Pick<Response, 'text'>,
): Promise<ParsedJsonResponse<T>> {
  const text = await response.text();
  if (!text.trim()) {
    return {data: null, text};
  }

  try {
    return {data: JSON.parse(text) as T, text};
  } catch {
    return {data: null, text};
  }
}

export function toErrorSnippet(error: unknown): string {
  return cleanSnippet(
    error instanceof Error ? error.message : 'Unknown network/runtime error.',
  );
}

export function buildGhlEndpoint(
  endpointPath: string,
  query: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }

  if (!params.size) {
    return endpointPath;
  }

  return `${endpointPath}?${params.toString()}`;
}

export function buildGhlUrl(
  endpointPath: string,
  query: Record<string, string | number | boolean | null | undefined> = {},
  baseUrl = GHL_BASE_URL,
): URL {
  return new URL(`${baseUrl}${buildGhlEndpoint(endpointPath, query)}`);
}

export function buildGhlHeaders(
  token?: string,
  headers: HeadersInit = {},
  contentType: string | null = 'application/json',
): Headers {
  const normalized = new Headers(headers);
  normalized.set('Accept', 'application/json');
  normalized.set('Version', GHL_API_VERSION);
  if (contentType) {
    normalized.set('Content-Type', contentType);
  }
  if (token) {
    normalized.set('Authorization', `Bearer ${token}`);
  }
  return normalized;
}

export async function requestGhl<T = unknown>(
  endpointPath: string,
  options: GhlRequestOptions = {},
): Promise<GhlRequestResult<T>> {
  const {
    method = 'GET',
    token,
    baseUrl = GHL_BASE_URL,
    query = {},
    headers = {},
    jsonBody,
    body,
    contentType = 'application/json',
    timeoutMs = DEFAULT_GHL_REQUEST_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;

  const endpoint = buildGhlEndpoint(endpointPath, query);
  const requestBody = jsonBody === undefined ? body : JSON.stringify(jsonBody);
  const responseContentType =
    jsonBody === undefined ? contentType : 'application/json';

  try {
    const response = await fetchImpl(
      buildGhlUrl(endpointPath, query, baseUrl),
      {
        method,
        headers: buildGhlHeaders(token, headers, responseContentType),
        body: requestBody,
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      endpoint,
      text,
      data: parseJsonBody<T>(text),
      responseSnippet: cleanSnippet(text) || null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      endpoint,
      text: null,
      data: null,
      responseSnippet: toErrorSnippet(error) || null,
    };
  }
}

export function mapHttpErrorCode<T extends string>(
  prefix: T,
  status: number,
): `${T}_400` | `${T}_401` | `${T}_404` | `${T}_422` | `${T}_FAILED` {
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
