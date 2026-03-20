# Clone Content Dataflow Map

## Purpose
This package turns an existing GoHighLevel email template into a new draft by:

1. selecting a base template through `view-content`
2. fetching that template's preview HTML
3. creating a new HTML draft shell
4. uploading the fetched HTML into the new draft

The package also includes a wrapper script that takes the clone result and
replaces the new draft HTML with the latest injected newsletter artifact.

## Inputs

### `src/cloneTemplate.ts`
- `templateName` or `templateId` via `CloneTemplateOptions`
- optional `draftName`
- `GHL_PRIVATE_INTEGRATION_TOKEN`
- `GHL_LOCATION_ID`

### `src/clone-template.cli.ts`
- `--template-name`
- `--template-id`
- `--draft-name`

### `publish-injected-draft.mjs`
- clone CLI path override via `PUBLISH_INJECTED_DRAFT_CLI_PATH`
- env file path override via `PUBLISH_INJECTED_DRAFT_ENV_PATH`
- injection directory override via `PUBLISH_INJECTED_DRAFT_INJECTION_DIR`
- API base URL override via `PUBLISH_INJECTED_DRAFT_BASE_URL`

## Output Contract

### Clone service
`cloneTemplateFromEnv()` returns a `CloneTemplateResult` that keeps each
boundary visible:
- `baseTemplate`: selected upstream template summary
- `clonedTemplate`: new draft metadata when create/update succeeds
- `previewFetch`: diagnostics for preview HTML retrieval
- `createRequest`: diagnostics for `POST /emails/builder`
- `updateRequest`: diagnostics for `POST /emails/builder/data`
- `errorCode` and `message`: stable failure summary

### CLI
`src/clone-template.cli.ts` writes the service result as formatted JSON and
sets exit code `0` on success, `1` on failure.

### Publish wrapper
`publish-injected-draft.mjs` writes JSON describing:
- the clone result
- the injected HTML source file that was published
- the final publish request result

## Step-by-Step Execution Path

### `src/cloneTemplate.ts`
1. Capture `fetchedAt` for result tracing.
2. Call `viewSelectedTemplateFromEnv(options)` to delegate base-template
   selection to the existing `view-content` package.
3. Read and trim `GHL_PRIVATE_INTEGRATION_TOKEN` and `GHL_LOCATION_ID`.
4. Fail early if selection, token, location, or `previewUrl` is missing.
5. Call `fetchPreviewHtml(previewUrl)` to download the source HTML.
6. Build the target draft name from the override or a UTC timestamp.
7. Call `callMutation('/emails/builder', ...)` to create an empty HTML draft.
8. Extract the new template id from the create response with
   `extractTemplateId()`.
9. Call `callMutation('/emails/builder/data', ...)` with the fetched preview
   HTML to overwrite the draft body.
10. Return the new draft metadata plus diagnostics for preview/create/update.

### `src/clone-template.cli.ts`
1. Parse `process.argv` into the clone service options contract.
2. Call `cloneTemplateFromEnv(...)`.
3. Write the result to stdout as JSON.
4. If the service throws before returning, emit a fallback JSON failure object.

### `publish-injected-draft.mjs`
1. Find the newest HTML file inside `inject-content/injection-output`.
2. Read that HTML into memory.
3. Spawn the clone CLI and capture stdout/stderr.
4. If the child fails before returning JSON, emit wrapper-owned JSON with
   diagnostic snippets.
5. If the child returned a clone failure JSON result, pass it through unchanged.
6. Load env values from the configured `.env` file, with process env as backup.
7. Call `POST /emails/builder/data` using the cloned template id and the latest
   injected HTML.
8. Return a combined JSON payload covering clone stage, publish stage, and
   final preview/download URLs.

## Dataflow Table

| Stage | Input | Transform | Output |
| --- | --- | --- | --- |
| Template selection | `templateName` / `templateId`, shared env | `viewSelectedTemplateFromEnv` resolves template metadata | `baseTemplate`, especially `id` and `previewUrl` |
| Preview fetch | `baseTemplate.previewUrl` | `fetchPreviewHtml` downloads raw HTML and captures diagnostics | `previewFetch.html`, `previewFetch.diagnostics` |
| Draft create | `locationId`, token, `draftName` | `POST /emails/builder` creates empty HTML draft | `templateId`, `createRequest` |
| Draft update | `templateId`, `previewFetch.html` | `POST /emails/builder/data` uploads HTML into the draft | `clonedTemplate`, `updateRequest` |
| Publish wrapper | newest injected HTML file, clone result | wrapper reuses cloned template id and publishes injected HTML | combined publish JSON |

## Failure Paths

### Clone service
- `SELECTION_FAILED`: upstream `view-content` could not resolve a template
- `MISSING_TOKEN`: auth token missing after env read
- `MISSING_LOCATION_ID`: location id missing after env read
- `MISSING_PREVIEW_URL`: selected template has no preview URL
- `INVALID_PREVIEW_URL`: preview URL cannot be parsed as a URL
- `PREVIEW_FETCH_HTTP_ERROR`: preview request returned non-2xx
- `PREVIEW_FETCH_NETWORK_ERROR`: preview request threw before response
- `CREATE_*`: create-draft request returned a mapped HTTP failure
- `CREATE_MISSING_TEMPLATE_ID`: create response succeeded but no id was found
- `UPDATE_*`: update request returned a mapped HTTP failure
- `UNKNOWN_ERROR`: runtime/network failure after preview fetch succeeded

### Publish wrapper
- clone subprocess error before JSON output
- clone subprocess returned structured failure JSON
- missing token or location during publish step
- runtime error while discovering HTML, reading files, or publishing

## Test Coverage Map

### `test/cloneTemplate.test.ts`
- verifies early stop on failed upstream selection
- verifies happy-path request order across selection, preview fetch, create,
  and update
- verifies create payload shape
- verifies update payload contains fetched HTML and cloned template id

### `test/publishInjectedDraft.test.ts`
- verifies the wrapper preserves successful clone output and publishes the
  latest injected HTML
- verifies clone failure JSON is passed through unchanged
- verifies wrapper-owned JSON is emitted when the clone subprocess fails before
  returning JSON

## Documentation Rules for Future Edits
- Add comments above logical blocks, not above every line
- Comment boundaries, invariants, and data movement rather than syntax
- Keep source comments short; put near line-by-line walkthrough detail here
- When clone flow behavior changes, update both the source comments and the
  matching section in this document in the same change
