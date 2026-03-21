import {
  DEFAULT_MANAGED_FOLDER_NAME,
  type GhlUploaderDiagnostics,
  type GhlUploaderErrorCode,
  type GhlRequestContext,
} from './types.js';
import {
  loadToolkitEnv,
  readGhlEnvConfig,
} from '../../../internal-core/src/index.js';

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
  loadToolkitEnv();

  const {token, locationId} = readGhlEnvConfig();

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
      managedFolderName:
        managedFolderName.trim() || DEFAULT_MANAGED_FOLDER_NAME,
    },
  };
}
