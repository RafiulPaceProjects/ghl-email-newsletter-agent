import {
  publishQualifiedImagesFromFile,
  parsePublishQualifiedImagesArgs,
} from './publishQualifiedImages.js';

async function run(): Promise<void> {
  const args = parsePublishQualifiedImagesArgs(process.argv.slice(2));
  if (!args.manifestPath) {
    throw new Error('Missing required --manifest argument.');
  }

  const result = await publishQualifiedImagesFromFile(args.manifestPath, {
    managedFolderName: args.managedFolderName,
    runDate: args.runDate,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

run().catch((error: unknown) => {
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: false,
        managedFolderId: null,
        managedFolderName: 'News Letter images',
        uploadedCount: 0,
        renderReadyImages: [],
        message:
          error instanceof Error
            ? error.message
            : 'Unknown ghl-media-usage error',
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
});
