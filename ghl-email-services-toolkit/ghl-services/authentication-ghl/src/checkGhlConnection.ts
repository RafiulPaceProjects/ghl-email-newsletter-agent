import {
  loadToolkitEnv,
  readGhlEnvConfig,
  requestGhl,
} from '../../internal-core/src/index.js';

/**
 * Shared auth gate for the toolkit. Downstream packages call this first so
 * they can fail fast on missing env, bad token scope, or location issues
 * before doing template fetches or draft mutations.
 */

export type GhlConnectionErrorCode =
  | 'MISSING_TOKEN'
  | 'MISSING_LOCATION_ID'
  | 'AUTH_FAILED'
  | 'LOCATION_SCOPE_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface ProbeDiagnostics {
  status: number | null;
  responseSnippet: string | null;
}

export interface ProbeResult {
  ok: boolean;
  endpoint: string;
  status: number | null;
  message: string;
  diagnostics: ProbeDiagnostics;
}

export interface GhlConnectionResult {
  ok: boolean;
  timestamp: string;
  locationId: string | null;
  checks: {
    emailBuilder: ProbeResult;
    users: ProbeResult;
  };
  errorCode?: GhlConnectionErrorCode;
  message: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyProbe(endpoint: string, message: string): ProbeResult {
  return {
    ok: false,
    endpoint,
    status: null,
    message,
    diagnostics: {
      status: null,
      responseSnippet: null,
    },
  };
}

async function runProbe(
  endpointPath: string,
  token: string,
  locationId: string,
): Promise<ProbeResult> {
  const endpointWithQuery = `${endpointPath}?locationId=${locationId}`;

  const response = await requestGhl(endpointPath, {
    token,
    query: {locationId},
  });

  if (!response.ok) {
    return {
      ok: false,
      endpoint: endpointWithQuery,
      status: response.status,
      message:
        response.status === null
          ? 'Probe failed due to network/runtime error.'
          : `Probe failed with HTTP ${response.status}.`,
      diagnostics: {
        status: response.status,
        responseSnippet: response.responseSnippet,
      },
    };
  }

  return {
    ok: true,
    endpoint: endpointWithQuery,
    status: response.status,
    message: 'Probe passed.',
    diagnostics: {
      status: response.status,
      responseSnippet: response.responseSnippet,
    },
  };
}

function deriveErrorCode(
  checks: GhlConnectionResult['checks'],
): GhlConnectionErrorCode | undefined {
  const probeList = [checks.emailBuilder, checks.users];

  if (probeList.some(probe => probe.status === 401)) {
    return 'AUTH_FAILED';
  }

  if (probeList.some(probe => probe.status === null && !probe.ok)) {
    return 'NETWORK_ERROR';
  }

  if (probeList.some(probe => !probe.ok)) {
    return 'LOCATION_SCOPE_FAILED';
  }

  return undefined;
}

export async function checkGhlConnectionFromEnv(): Promise<GhlConnectionResult> {
  loadToolkitEnv();
  const {token, locationId} = readGhlEnvConfig();
  const timestamp = nowIso();

  const emailBuilderEndpoint = '/emails/builder';
  const usersEndpoint = '/users/';

  if (!token) {
    return {
      ok: false,
      timestamp,
      locationId: locationId || null,
      checks: {
        emailBuilder: emptyProbe(
          emailBuilderEndpoint,
          'Skipped: missing GHL_PRIVATE_INTEGRATION_TOKEN.',
        ),
        users: emptyProbe(
          usersEndpoint,
          'Skipped: missing GHL_PRIVATE_INTEGRATION_TOKEN.',
        ),
      },
      errorCode: 'MISSING_TOKEN',
      message: 'Missing GHL_PRIVATE_INTEGRATION_TOKEN.',
    };
  }

  if (!locationId) {
    return {
      ok: false,
      timestamp,
      locationId: null,
      checks: {
        emailBuilder: emptyProbe(
          emailBuilderEndpoint,
          'Skipped: missing GHL_LOCATION_ID.',
        ),
        users: emptyProbe(usersEndpoint, 'Skipped: missing GHL_LOCATION_ID.'),
      },
      errorCode: 'MISSING_LOCATION_ID',
      message: 'Missing GHL_LOCATION_ID.',
    };
  }

  const [emailBuilder, users] = await Promise.all([
    runProbe(emailBuilderEndpoint, token, locationId),
    runProbe(usersEndpoint, token, locationId),
  ]);

  const checks = {emailBuilder, users};
  const ok = emailBuilder.ok && users.ok;
  const errorCode = deriveErrorCode(checks);

  if (ok) {
    return {
      ok: true,
      timestamp,
      locationId,
      checks,
      message: 'Connection check passed for both probes.',
    };
  }

  return {
    ok: false,
    timestamp,
    locationId,
    checks,
    errorCode: errorCode ?? 'UNKNOWN_ERROR',
    message: 'Connection check failed for one or more probes.',
  };
}
