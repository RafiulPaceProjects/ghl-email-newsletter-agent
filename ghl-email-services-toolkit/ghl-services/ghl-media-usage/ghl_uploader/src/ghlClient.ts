import {readFile} from 'node:fs/promises';
import {
  cleanSnippet,
  DEFAULT_GHL_REQUEST_TIMEOUT_MS,
  DEFAULT_GHL_UPLOAD_TIMEOUT_MS,
  parseJsonResponse,
} from '../../../internal-core/src/index.js';

import {
  GHL_API_VERSION,
  GHL_BASE_URL,
  type GhlApiFailure,
  type GhlApiResult,
  type GhlMediaFile,
  type GhlMediaFolder,
  type GhlRequestContext,
  type GhlUploaderRuntime,
  type QualifiedImage,
} from './types.js';

interface RawMediaEntity {
  id?: string;
  _id?: string;
  name?: string;
  folderId?: string;
  parentId?: string;
  url?: string;
  type?: string;
  mimetype?: string;
  mimeType?: string;
}

async function performRequest<T>(
  endpoint: string,
  init: RequestInit,
  runtime: GhlUploaderRuntime = {},
): Promise<GhlApiResult<T>> {
  const fetchImpl = runtime.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`${GHL_BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Version: GHL_API_VERSION,
        ...(init.headers ?? {}),
      },
    });
    const {data, text} = await parseJsonResponse<T>(response);
    if (!response.ok || data === null) {
      return {
        ok: false,
        status: response.status,
        endpoint,
        message: `Request failed with HTTP ${response.status}.`,
        responseSnippet: cleanSnippet(text) || null,
      };
    }

    return {
      ok: true,
      status: response.status,
      endpoint,
      data,
      responseSnippet: cleanSnippet(text) || null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      endpoint,
      message:
        error instanceof Error
          ? error.message
          : 'Unknown network/runtime error.',
      responseSnippet:
        cleanSnippet(
          error instanceof Error ? error.message : 'unknown error',
        ) || null,
    };
  }
}

function authHeaders(context: GhlRequestContext): Record<string, string> {
  return {
    Authorization: `Bearer ${context.token}`,
  };
}

function normalizeFolder(candidate: RawMediaEntity): GhlMediaFolder | null {
  const id = candidate.id ?? candidate._id;
  const name = candidate.name;
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    parentId: candidate.parentId ?? null,
  };
}

function normalizeFile(candidate: RawMediaEntity): GhlMediaFile | null {
  const id = candidate.id ?? candidate._id;
  const name = candidate.name;
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    folderId: candidate.folderId ?? candidate.parentId ?? null,
    url: candidate.url ?? null,
    mimeType: candidate.mimeType ?? candidate.mimetype ?? null,
  };
}

export async function listFolders(
  context: GhlRequestContext,
  runtime: GhlUploaderRuntime = {},
): Promise<GhlApiResult<GhlMediaFolder[]>> {
  const endpoint = `/medias/files?locationId=${encodeURIComponent(
    context.locationId,
  )}&type=folder`;
  const result = await performRequest<{
    files?: RawMediaEntity[];
    folders?: RawMediaEntity[];
  }>(
    endpoint,
    {
      method: 'GET',
      headers: authHeaders(context),
      signal: AbortSignal.timeout(DEFAULT_GHL_REQUEST_TIMEOUT_MS),
    },
    runtime,
  );

  if (!result.ok) {
    return result;
  }

  const entities = [
    ...(result.data.files ?? []),
    ...(result.data.folders ?? []),
  ];
  return {
    ...result,
    data: entities
      .map(normalizeFolder)
      .filter((entry): entry is GhlMediaFolder => entry !== null),
  };
}

export async function listFilesInFolder(
  context: GhlRequestContext,
  folderId: string,
  runtime: GhlUploaderRuntime = {},
): Promise<GhlApiResult<GhlMediaFile[]>> {
  const endpoint =
    `/medias/files?locationId=${encodeURIComponent(context.locationId)}` +
    `&parentId=${encodeURIComponent(folderId)}&type=file`;
  const result = await performRequest<{
    files?: RawMediaEntity[];
    folders?: RawMediaEntity[];
  }>(
    endpoint,
    {
      method: 'GET',
      headers: authHeaders(context),
      signal: AbortSignal.timeout(DEFAULT_GHL_REQUEST_TIMEOUT_MS),
    },
    runtime,
  );

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: (result.data.files ?? [])
      .map(normalizeFile)
      .filter((entry): entry is GhlMediaFile => entry !== null),
  };
}

export async function uploadImageToFolder(
  context: GhlRequestContext,
  folderId: string,
  image: QualifiedImage,
  finalName: string,
  runtime: GhlUploaderRuntime = {},
): Promise<GhlApiResult<{id: string; url?: string}>> {
  if (image.sourcePath) {
    const fileBuffer = await (runtime.readFile ?? readFile)(image.sourcePath);
    const fileBytes = new Uint8Array(fileBuffer);
    const form = new FormData();
    form.set('locationId', context.locationId);
    form.set('folderId', folderId);
    form.set('name', finalName);
    form.set(
      'file',
      new Blob([fileBytes], {
        type: finalName.toLowerCase().endsWith('.png')
          ? 'image/png'
          : finalName.toLowerCase().endsWith('.gif')
            ? 'image/gif'
            : 'image/jpeg',
      }),
      finalName,
    );

    const result = await performRequest<{
      id?: string;
      _id?: string;
      fileId?: string;
      url?: string;
    }>(
      '/medias/upload-file',
      {
        method: 'POST',
        headers: authHeaders(context),
        body: form,
        signal: AbortSignal.timeout(DEFAULT_GHL_UPLOAD_TIMEOUT_MS),
      },
      runtime,
    );

    if (!result.ok) {
      return result;
    }

    const id = result.data.id ?? result.data._id ?? result.data.fileId;
    if (!id) {
      return {
        ok: false,
        status: result.status,
        endpoint: result.endpoint,
        message: 'Upload succeeded but no file id was returned.',
        responseSnippet: result.responseSnippet,
      };
    }

    return {...result, data: {id, url: result.data.url}};
  }

  const result = await performRequest<{
    id?: string;
    _id?: string;
    fileId?: string;
    url?: string;
  }>(
    '/medias/upload-file',
    {
      method: 'POST',
      headers: {
        ...authHeaders(context),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hosted: true,
        fileUrl: image.sourceUrl,
        locationId: context.locationId,
        folderId,
        name: finalName,
      }),
      signal: AbortSignal.timeout(DEFAULT_GHL_UPLOAD_TIMEOUT_MS),
    },
    runtime,
  );

  if (!result.ok) {
    return result;
  }

  const id = result.data.id ?? result.data._id ?? result.data.fileId;
  if (!id) {
    return {
      ok: false,
      status: result.status,
      endpoint: result.endpoint,
      message: 'Hosted upload succeeded but no file id was returned.',
      responseSnippet: result.responseSnippet,
    };
  }

  return {...result, data: {id, url: result.data.url}};
}

export async function bulkDeleteFiles(
  context: GhlRequestContext,
  fileIds: string[],
  runtime: GhlUploaderRuntime = {},
): Promise<GhlApiResult<{deletedCount: number}>> {
  const result = await performRequest<{
    deleted?: Array<{id?: string; deleted?: boolean}>;
  }>(
    '/medias/delete-files',
    {
      method: 'PUT',
      headers: {
        ...authHeaders(context),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: fileIds.map(id => ({id})),
      }),
      signal: AbortSignal.timeout(DEFAULT_GHL_REQUEST_TIMEOUT_MS),
    },
    runtime,
  );

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: {
      deletedCount: (result.data.deleted ?? []).filter(
        entry => entry.deleted === true,
      ).length,
    },
  };
}

export function toFailureMessage(result: GhlApiFailure): string {
  return result.responseSnippet
    ? `${result.message} ${result.responseSnippet}`
    : result.message;
}
