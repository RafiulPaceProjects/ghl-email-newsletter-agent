/**
 * CLI wrapper for the clone flow. It only parses selectors and a draft-name
 * override, then delegates the actual data movement to `cloneTemplateFromEnv`
 * so the CLI output stays a thin JSON envelope around the service result.
 */
import {cloneTemplateFromEnv} from './cloneTemplate.js';

// Support both `--flag value` and `--flag=value` so shell scripts can invoke
// the clone flow without additional argument parsing helpers.
function parseArgValue(
  args: string[],
  key: '--template-name' | '--template-id' | '--draft-name',
): string | undefined {
  const withEqualsPrefix = `${key}=`;
  const withEquals = args.find(arg => arg.startsWith(withEqualsPrefix));
  if (withEquals) {
    return withEquals.slice(withEqualsPrefix.length).trim() || undefined;
  }

  const index = args.findIndex(arg => arg === key);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1].trim() || undefined;
  }

  return undefined;
}

async function run(): Promise<void> {
  // Map CLI selectors directly onto the service options contract.
  const args = process.argv.slice(2);
  const templateName = parseArgValue(args, '--template-name');
  const templateId = parseArgValue(args, '--template-id');
  const draftName = parseArgValue(args, '--draft-name');

  const result = await cloneTemplateFromEnv({
    templateName,
    templateId,
    draftName,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

run().catch((error: unknown) => {
  // Preserve a machine-readable failure payload even when execution fails
  // before the service can return its normal result shape.
  const message =
    error instanceof Error ? error.message : 'Unexpected CLI error';

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: false,
        message: 'CLI execution failed unexpectedly.',
        errorCode: 'UNKNOWN_ERROR',
        previewFetch: {
          status: null,
          responseSnippet: message,
        },
        createRequest: {
          status: null,
          responseSnippet: null,
        },
        updateRequest: {
          status: null,
          responseSnippet: null,
        },
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
});
