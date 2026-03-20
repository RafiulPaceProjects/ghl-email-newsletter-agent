# CODEBASE-NOTES

This document captures the current repository state as it exists on disk today.
It is the internal companion to `README.md` and focuses on implementation
status, handoff boundaries, and push-readiness notes.

## System Summary

The repository is a GoHighLevel email-template toolkit built around a narrow
pipeline:

1. authenticate against the target location
2. fetch template inventory
3. select a template and optionally download its preview HTML
4. clone that preview HTML into a new draft template
5. inject a local newsletter fragment into preview HTML
6. publish the newest injected artifact into the cloned draft

The codebase is intentionally split by service boundary rather than by one
large end-to-end command.

## Modules And Flows

### 1) `authentication-ghl`
- Validates `GHL_PRIVATE_INTEGRATION_TOKEN` and `GHL_LOCATION_ID`.
- Probes `GET /emails/builder` and `GET /users/`.
- Returns structured diagnostics for downstream gating.
- This service should fail fast before any fetch, view, clone, or publish step.

### 2) `ghl-fetch-templates`
- Loads the shared auth env file.
- Re-runs auth validation before the template fetch.
- Calls `GET /emails/builder`.
- Writes the raw metadata snapshot to
  `ghl-services/ghl-fetch-templates/data/templates.json`.

### 3) `ghl-update-template/view-content`
- Uses auth validation before template lookup.
- Supports selection by exact id or case-insensitive name.
- Starts with `limit=100`, then falls back to a name query and pagination when
  needed.
- Can fetch preview HTML from the selected template's `previewUrl`.
- Writes preview files to `ghl-services/ghl-update-template/view-content/previews/`.

### 4) `ghl-update-template/clone-content`
- Delegates template lookup to `view-content`.
- Fetches the selected template's preview HTML.
- Creates a new draft with `POST /emails/builder`.
- Pushes HTML into that draft with `POST /emails/builder/data`.
- Exposes a publish wrapper, `publish-injected-draft.mjs`, that:
  - clones a fresh draft
  - discovers the newest injected HTML artifact
  - republishes that artifact into the new draft

### 5) `ghl-update-template/inject-content`
- Is implemented, but only as a local artifact generator today.
- Requires one `[[[NEWSLETTER_BODY_SLOT]]]` token in a local preview file.
- Replaces that slot with one bundled sample block.
- Writes injected artifacts to
  `ghl-services/ghl-update-template/inject-content/injection-output/`.
- Does not yet perform direct API publishing or structured multi-block render.

## Dependencies

### Runtime
- Node.js 20+
- Built-in `fetch`
- Built-in `AbortSignal.timeout`
- `dotenv` for shared env loading in TypeScript packages
- `tsx` for CLI execution in TypeScript packages
- `gts` for lint/fix

### Testing
- Node's built-in test runner, not Vitest
- TypeScript packages run tests with `node --import tsx --test`
- `inject-content` runs tests with `node --test`

## Newsletter System Audit

### Current state
- Supports exactly one explicit slot token in the base HTML.
- Supports exactly one bundled block partial:
  - heading
  - body
  - image
  - CTA
- Produces a local HTML artifact that can be picked up by the publish wrapper.

### Missing pieces
- No support for 10 repeatable blocks.
- No structured input schema for ordered blocks.
- No optional-image rendering path.
- No CTA or URL validation.
- No escaping or sanitization layer.
- No render-stage separation between "render one block" and "inject assembled newsletter".
- No direct `inject-content` API publish command.

### Practical conclusion
The repository supports a proof-of-flow newsletter pipeline, but not yet the
full target newsletter contract of up to 10 repeatable blocks with structured
heading, body, image, and CTA data.

## Incomplete Or Fragile Areas

### Implemented but fragile
- `publish-injected-draft.mjs` publishes the newest injected artifact it can
  find on disk, which is convenient but can target the wrong file if multiple
  runs are present.
- Generated preview, snapshot, and injection artifacts are written inside the
  repo tree.
- The shared env file lives under one package and is reused across others by
  relative path.

### Incomplete by design
- The inject step is still single-block and sample-driven.
- Endpoint docs for create/update remain partly based on observed payloads
  because the public docs do not expose full request schemas clearly.
- There is no single top-level command that executes the full flow from auth to
  publish.

## Documentation Alignment Notes

This audit updates docs to reflect the actual runtime state:
- `clone-content` is implemented, not planned.
- `inject-content` is implemented as local artifact generation, not as a full
  structured publisher.
- The repository uses Node's built-in test runner today.
- The recommended operational flow is auth -> fetch -> view -> clone ->
  inject/publish.

## Ready For Push

### Env setup
- Create `ghl-services/authentication-ghl/.env` from `.env.example`.
- Never commit the real `.env` file.

### Key commands
- `npm run validate`
- `npm --prefix ghl-services/authentication-ghl run check:connection`
- `npm --prefix ghl-services/ghl-fetch-templates run fetch:templates`
- `npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id=<id>`
- `node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html <path>`
- `node ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs --template-id=<id>`

### Critical flows
- Fetch -> confirm template inventory is reachable and saved.
- Inject -> confirm one preview artifact can be transformed into one injected artifact.
- Draft publish -> confirm a fresh draft is created and overwritten with the injected HTML.

### Final check before push
- Run validation commands successfully.
- Confirm `.env`, `node_modules`, `previews/`, `injection-output/`, and
  `data/templates.json` are ignored or unstaged.
- Confirm stakeholders understand the current newsletter limitation:
  single-block injection only.
