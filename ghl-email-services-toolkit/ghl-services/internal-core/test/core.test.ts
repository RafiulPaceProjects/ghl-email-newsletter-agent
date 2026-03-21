import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
  buildGhlEndpoint,
  cleanSnippet,
  extractFlag,
  mapHttpErrorCode,
  parseFlagValue,
  parseJsonBody,
  resolveArtifactPath,
  requestGhl,
} from '../src/index.js';

void test('buildGhlEndpoint appends encoded query params', () => {
  assert.equal(
    buildGhlEndpoint('/emails/builder', {
      locationId: 'loc 123',
      page: 2,
      includeDrafts: true,
    }),
    '/emails/builder?locationId=loc+123&page=2&includeDrafts=true',
  );
});

void test('cleanSnippet normalizes whitespace and truncates', () => {
  const snippet = cleanSnippet(`  alpha \n beta ${'x'.repeat(400)}  `);
  assert.match(snippet, /^alpha beta/);
  assert.equal(snippet.endsWith('...'), true);
  assert.equal(snippet.length, 283);
});

void test('parseJsonBody falls back to raw text for invalid JSON', () => {
  assert.deepEqual(parseJsonBody(''), {});
  assert.deepEqual(parseJsonBody('{"ok":true}'), {ok: true});
  assert.equal(parseJsonBody('{broken json'), '{broken json');
});

void test('mapHttpErrorCode centralizes common status mapping', () => {
  assert.equal(mapHttpErrorCode('FETCH', 400), 'FETCH_400');
  assert.equal(mapHttpErrorCode('UPDATE', 422), 'UPDATE_422');
  assert.equal(mapHttpErrorCode('CREATE', 500), 'CREATE_FAILED');
});

void test('parseFlagValue handles --flag and --flag=value styles', () => {
  assert.equal(
    parseFlagValue(['--template-id=tmpl-1'], '--template-id'),
    'tmpl-1',
  );
  assert.equal(
    parseFlagValue(['--template-id', 'tmpl-2'], '--template-id'),
    'tmpl-2',
  );
});

void test('extractFlag returns the remaining args', () => {
  assert.deepEqual(
    extractFlag(['--rendered-html', 'x.html', '--draft'], '--rendered-html'),
    {
      value: 'x.html',
      rest: ['--draft'],
    },
  );
});

void test('resolveArtifactPath normalizes output location', () => {
  assert.deepEqual(
    resolveArtifactPath('/tmp/work', 'artifacts/output', 'file.json'),
    {
      outputDir: '/tmp/work/artifacts/output',
      outputPath: '/tmp/work/artifacts/output/file.json',
    },
  );
});

void test('requestGhl parses JSON and captures snippets', async () => {
  const seen: Array<{input: string; init?: RequestInit}> = [];

  const result = await requestGhl<{builders: unknown[]}>('/emails/builder', {
    token: 'token-123',
    query: {locationId: 'loc-123'},
    fetchImpl: async (input, init) => {
      seen.push({input: String(input), init});
      return new Response(JSON.stringify({builders: []}), {status: 200});
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.endpoint, '/emails/builder?locationId=loc-123');
  assert.deepEqual(result.data, {builders: []});
  assert.equal(
    seen[0]?.input,
    'https://services.leadconnectorhq.com/emails/builder?locationId=loc-123',
  );
  assert.equal(
    new Headers(seen[0]?.init?.headers).get('Authorization'),
    'Bearer token-123',
  );
});

void test('requestGhl returns network snippets on fetch failures', async () => {
  const result = await requestGhl('/emails/builder', {
    fetchImpl: async () => {
      throw new Error('network timeout');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, null);
  assert.match(result.responseSnippet ?? '', /network timeout/);
});
