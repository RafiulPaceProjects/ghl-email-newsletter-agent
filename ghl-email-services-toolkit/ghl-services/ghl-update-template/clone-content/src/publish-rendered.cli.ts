import {
  parsePublishRenderedHtmlArgs,
  publishRenderedHtmlFromEnv,
} from './publishRenderedHtml.js';

async function run(): Promise<void> {
  const options = parsePublishRenderedHtmlArgs(process.argv.slice(2));
  const result = await publishRenderedHtmlFromEnv(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

run().catch((error: unknown) => {
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: false,
        stage: 'publishRenderedHtml',
        message:
          error instanceof Error
            ? error.message
            : 'Unknown publish-rendered-draft error',
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
});
