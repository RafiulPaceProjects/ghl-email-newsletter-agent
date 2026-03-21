# CODEBASE-NOTES

This document captures the current repository state as it exists on disk in
this checkout. It separates verified runtime behavior from planned next-stage
architecture so future work lands in the right package.

## System Summary

### Current runtime

The executable flow currently validated in this checkout is:

1. authenticate against the target location
2. fetch template inventory
3. select a template and optionally download its preview HTML
4. normalize ordered content fragments in `research-content`
5. normalize render-ready image metadata in `ghl-media-usage`
6. render one explicit newsletter HTML artifact from preview HTML plus JSON input
7. clone that preview HTML into a new draft template
8. publish the explicit rendered artifact into the cloned draft

### Planned next architecture

The target pipeline remains:

```text
auth -> fetch/view template -> research content -> image sourcing -> GHL media upload/link resolution -> final render -> draft create/update
```

## Verified Packages In This Checkout

### `authentication-ghl`

- Validates `GHL_PRIVATE_INTEGRATION_TOKEN` and `GHL_LOCATION_ID`.
- Probes `GET /emails/builder` and `GET /users/`.
- Acts as the auth gate for downstream services.

### `ghl-fetch-templates`

- Loads the shared auth env file.
- Re-runs auth validation before fetching.
- Calls `GET /emails/builder`.
- Writes the snapshot to
  `ghl-services/ghl-fetch-templates/data/templates.json`.

### `ghl-update-template/view-content`

- Resolves a template by exact id or case-insensitive name.
- Fetches preview HTML from the template `previewUrl`.
- Writes preview files to
  `ghl-services/ghl-update-template/view-content/previews/`.
- Produces a lightweight structural summary for local inspection.

### `ghl-update-template/clone-content`

- Delegates template lookup to `view-content`.
- Fetches preview HTML from the selected template.
- Creates a new draft with `POST /emails/builder`.
- Uploads HTML into that draft with `POST /emails/builder/data`.
- Exposes `publishRenderedHtmlFromEnv()` plus
  `src/publish-rendered.cli.ts` for explicit rendered-HTML publish handoff.
- Keeps `publish-injected-draft.mjs` as a thin compatibility wrapper around the
  explicit publish CLI.

### `ghl-update-template/inject-content`

- Validates one explicit render contract for preview HTML plus structured JSON
  input.
- Requires one `[[[NEWSLETTER_BODY_SLOT]]]` token in a preview file.
- Renders one newsletter artifact with `nunjucks`, `zod`, and `parse5`.
- Writes explicit render artifacts to
  `ghl-services/ghl-update-template/inject-content/render-output/`.
- Keeps `inject-sample.mjs` as a legacy local helper that writes to
  `injection-output/`.

### `research-content`

- Is now a validated runtime package.
- Produces ordered `contentFragments[]` from either sections or direct fragment
  input.
- Acts as the contract-first upstream content boundary for rendering.

### `ghl-media-usage`

- Is now a validated runtime package.
- Resolves the managed GHL media folder, uploads qualified images, and returns
  normalized `renderReadyImages[]`.
- Still contains early uploader internals under `ghl_uploader/`, but the
  package itself is now part of root validation.

## Partial Or Planned Areas

### Image sourcing upstream of media upload

- `pexels-api-references` still documents a future sourcing stage.
- There is not yet a root-level end-to-end runtime that discovers images,
  qualifies them, and feeds them into `ghl-media-usage` automatically.

### Reference folders

- `pexels-api-references`, `ghl-email-endpoints-reference`, and
  `ghl-medias-enpoints-reference` document contracts and endpoint behavior.
- These references may describe the intended future pipeline beyond the code
  that is runnable today.

## Main Contracts Today

- Shared env input: `ghl-services/authentication-ghl/.env`
- CLI output: structured JSON with explicit `ok`, `message`, and `errorCode`
  boundaries where relevant
- Shared library/runtime helpers in `ghl-services/internal-core`
- Current runtime schemas under `contracts/current-runtime/`
- Operational artifacts:
  - template snapshot JSON
  - preview HTML dumps
  - rendered HTML artifacts
  - legacy injected HTML artifacts

## Fragile Or Transitional Areas

- `publish-injected-draft.mjs` remains as a compatibility entry point even
  though the preferred publish contract is explicit `--rendered-html`.
- Generated preview, snapshot, and injection artifacts are written inside the
  repository tree.
- The shared `.env` file lives under one package and is reused from adjacent
  packages by relative path.

## Documentation Rule

When editing docs, keep these labels explicit:

- `current runtime`: verified executable behavior in this checkout
- `planned next`: intended architecture not fully implemented yet

That distinction is the main safeguard against misleading future agents.
