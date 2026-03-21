import assert from 'node:assert/strict';
import {afterEach, beforeEach, test} from 'node:test';

import {assertContract} from '../../../contracts/current-runtime/validateContract.mjs';
import {checkGhlConnectionFromEnv} from '../src/checkGhlConnection.js';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_TOKEN = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
const ORIGINAL_LOCATION_ID = process.env.GHL_LOCATION_ID;

function restoreEnv(): void {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  } else {
    process.env.GHL_PRIVATE_INTEGRATION_TOKEN = ORIGINAL_TOKEN;
  }

  if (ORIGINAL_LOCATION_ID === undefined) {
    delete process.env.GHL_LOCATION_ID;
  } else {
    process.env.GHL_LOCATION_ID = ORIGINAL_LOCATION_ID;
  }
}

function installFetchMock(
  steps: Array<Response | Error>,
  seenUrls: string[] = [],
): void {
  global.fetch = (async input => {
    seenUrls.push(String(input));
    const next = steps.shift();
    if (!next) {
      throw new Error('Unexpected fetch call.');
    }

    if (next instanceof Error) {
      throw next;
    }

    return next;
  }) as typeof global.fetch;
}

beforeEach(() => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
});

afterEach(() => {
  restoreEnv();
  global.fetch = ORIGINAL_FETCH;
});

void test('returns MISSING_TOKEN when the token is absent', async () => {
  delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  process.env.GHL_LOCATION_ID = 'loc-123';

  const result = await checkGhlConnectionFromEnv();

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'MISSING_TOKEN');
  assert.equal(result.locationId, 'loc-123');
  assert.match(result.message, /Missing GHL_PRIVATE_INTEGRATION_TOKEN/);
});

void test('returns MISSING_LOCATION_ID when the location is absent', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  delete process.env.GHL_LOCATION_ID;

  const result = await checkGhlConnectionFromEnv();

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'MISSING_LOCATION_ID');
  assert.equal(result.locationId, null);
  assert.match(result.message, /Missing GHL_LOCATION_ID/);
});

void test('returns success when both probes pass', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  const seenUrls: string[] = [];
  installFetchMock(
    [
      new Response(JSON.stringify({builders: []}), {status: 200}),
      new Response(JSON.stringify({users: []}), {status: 200}),
    ],
    seenUrls,
  );

  const result = await checkGhlConnectionFromEnv();

  await assertContract('auth-check-result', result);
  assert.equal(result.ok, true);
  assert.equal(result.errorCode, undefined);
  assert.equal(result.checks.emailBuilder.status, 200);
  assert.equal(result.checks.users.status, 200);
  assert.deepEqual(seenUrls, [
    'https://services.leadconnectorhq.com/emails/builder?locationId=loc-123',
    'https://services.leadconnectorhq.com/users/?locationId=loc-123',
  ]);
});

void test('maps HTTP 401 responses to AUTH_FAILED', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  installFetchMock([
    new Response(JSON.stringify({message: 'denied'}), {status: 401}),
    new Response(JSON.stringify({users: []}), {status: 200}),
  ]);

  const result = await checkGhlConnectionFromEnv();

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'AUTH_FAILED');
  assert.equal(result.checks.emailBuilder.status, 401);
});

void test('maps runtime fetch failures to NETWORK_ERROR', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  installFetchMock([
    new Error('socket hang up'),
    new Response(JSON.stringify({users: []}), {status: 200}),
  ]);

  const result = await checkGhlConnectionFromEnv();

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'NETWORK_ERROR');
  assert.match(
    result.checks.emailBuilder.diagnostics.responseSnippet ?? '',
    /socket hang up/,
  );
});
