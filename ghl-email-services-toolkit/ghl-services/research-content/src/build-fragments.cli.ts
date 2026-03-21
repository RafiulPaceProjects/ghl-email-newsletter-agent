import {parseFlagValue} from '../../internal-core/src/index.js';
import {buildResearchContentFromFile} from './buildFragments.js';

async function run(): Promise<void> {
  const inputPath = parseFlagValue(process.argv.slice(2), '--input');
  if (!inputPath) {
    throw new Error('Missing required --input argument.');
  }

  const result = await buildResearchContentFromFile(inputPath);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

run().catch((error: unknown) => {
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unknown research-content error',
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
});
