import dotenv from 'dotenv';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  DEFAULT_MANAGED_FOLDER_NAME,
  type GhlUploaderDiagnostics,
  type GhlUploaderErrorCode,
  type GhlRequestContext,
} from './types.js';

const AUTH_ENV_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../authentication-ghl/.env',
);

export interface LoadGhlUploaderEnvSuccess {
  ok: true;
  context: GhlRequestContext;
}

export interface LoadGhlUploaderEnvFailure {
  ok: false;
  errorCode: GhlUploaderErrorCode;
  message: string;
  diagnostics: GhlUploaderDiagnostics;
}

export type LoadGhlUploaderEnvResult =
  | LoadGhlUploaderEnvSuccess
  | LoadGhlUploaderEnvFailure;

export function loadGhlUploaderEnv(
  managedFolderName = DEFAULT_MANAGED_FOLDER_NAME,
): LoadGhlUploaderEnvResult {
  dotenv.config({path: AUTH_ENV_PATH});

  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() ?? '';
  const locationId = process.env.GHL_LOCATION_ID?.trim() ?? '';

  if (!token) {
    return {
      ok: false,
      errorCode: 'MISSING_TOKEN',
      message: 'Missing GHL_PRIVATE_INTEGRATION_TOKEN.',
      diagnostics: {
        status: null,
        responseSnippet: null,
        endpoint: null,
      },
    };
  }

  if (!locationId) {
    return {
      ok: false,
      errorCode: 'MISSING_LOCATION_ID',
      message: 'Missing GHL_LOCATION_ID.',
      diagnostics: {
        status: null,
        responseSnippet: null,
        endpoint: null,
      },
    };
  }

  return {
    ok: true,
    context: {
      token,
      locationId,
      managedFolderName: managedFolderName.trim() || DEFAULT_MANAGED_FOLDER_NAME,
    },
  };
}
