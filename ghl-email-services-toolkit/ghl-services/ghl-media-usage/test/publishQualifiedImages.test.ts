import assert from 'node:assert/strict';
import {test} from 'node:test';

import {publishQualifiedImages} from '../src/publishQualifiedImages.js';

const originalToken = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
const originalLocationId = process.env.GHL_LOCATION_ID;

test.afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  } else {
    process.env.GHL_PRIVATE_INTEGRATION_TOKEN = originalToken;
  }

  if (originalLocationId === undefined) {
    delete process.env.GHL_LOCATION_ID;
  } else {
    process.env.GHL_LOCATION_ID = originalLocationId;
  }
});

void test('uploads approved images after resolving the managed folder', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  const calls: string[] = [];
  const result = await publishQualifiedImages(
    {
      topicSlug: 'housing',
      approvedImages: [
        {
          slotId: 'hero',
          sourceUrl: 'https://example.com/image.jpg',
          imageAltText: 'A skyline',
          provider: {
            provider: 'pexels',
            providerImageId: 'img-1',
            providerUrl: 'https://pexels.com/img-1',
          },
        },
      ],
    },
    {
      runtime: {
        fetchImpl: async (input, init) => {
          const url = String(input);
          calls.push(url);

          if (url.includes('/medias/files') && url.includes('type=folder')) {
            return new Response(
              JSON.stringify({
                folders: [{id: 'folder-1', name: 'News Letter images'}],
              }),
              {status: 200},
            );
          }

          if (url.includes('/medias/upload-file')) {
            return new Response(
              JSON.stringify({id: 'file-1', url: 'https://ghl.example/file-1'}),
              {status: 201},
            );
          }

          throw new Error(`Unexpected request: ${url} ${init?.method ?? ''}`);
        },
      },
      runDate: '2026-03-20',
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.managedFolderId, 'folder-1');
  assert.equal(result.uploadedCount, 1);
  assert.equal(result.renderReadyImages[0]?.ghlFileId, 'file-1');
  assert.match(calls.join('\n'), /medias\/files/);
  assert.match(calls.join('\n'), /medias\/upload-file/);
});

void test('fails closed when the managed folder is missing', async () => {
  process.env.GHL_PRIVATE_INTEGRATION_TOKEN = 'token-123';
  process.env.GHL_LOCATION_ID = 'loc-123';

  const result = await publishQualifiedImages(
    {
      topicSlug: 'housing',
      approvedImages: [],
    },
    {
      runtime: {
        fetchImpl: async () =>
          new Response(JSON.stringify({folders: []}), {status: 200}),
      },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'MANAGED_FOLDER_NOT_FOUND');
});
