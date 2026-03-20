import "dotenv/config";
import { checkGhlConnectionFromEnv } from "./checkGhlConnection.js";

async function run(): Promise<void> {
  const result = await checkGhlConnectionFromEnv();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unexpected CLI error";

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: false,
        message: "CLI execution failed unexpectedly.",
        errorCode: "UNKNOWN_ERROR",
        diagnostics: {
          status: null,
          responseSnippet: message
        }
      },
      null,
      2
    )}\n`
  );
  process.exitCode = 1;
});
