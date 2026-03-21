import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';

const AUTH_ENV_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../authentication-ghl/.env',
);

export interface GhlEnvConfig {
  token: string;
  locationId: string;
}

export function getToolkitAuthEnvPath(): string {
  return AUTH_ENV_PATH;
}

export function loadToolkitEnv(): void {
  dotenv.config({path: AUTH_ENV_PATH});
}

export function readGhlEnvConfig(): GhlEnvConfig {
  return {
    token: process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() ?? '',
    locationId: process.env.GHL_LOCATION_ID?.trim() ?? '',
  };
}
