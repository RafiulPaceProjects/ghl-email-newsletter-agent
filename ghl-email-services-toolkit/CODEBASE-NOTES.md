# CODEBASE-NOTES

This document captures the current repository state as it exists on disk today.
It is the internal companion to `README.md` and focuses on implementation
status, handoff boundaries, and push-readiness notes.

## System Summary

The repository is a GoHighLevel email-template toolkit built around a narrow,
working pipeline:

1. authenticate against the target location
2. fetch template inventory when needed
3. select a template and optionally download its preview HTML
4. inject one bundled newsletter fragment into a saved preview HTML artifact
5. either clone the base template into a new draft, or run the publish wrapper,
   which clones a fresh draft and then publishes the newest injected artifact

The codebase is intentionally split by service boundary rather than by one
large end-to-end command. The root package only provides maintenance scripts
such as `test`, `lint`, `typecheck`, `validate`, and `fix`.

## Modules And Flows

### 1) `authentication-ghl`
- Validates `GHL_PRIVATE_INTEGRATION_TOKEN` and `GHL_LOCATION_ID`.
- Probes `GET /emails/builder` and `GET /users/`.
- Returns structured diagnostics for downstream gating.
- This service should fail fast before any fetch, view, clone, inject, or publish step.

### 2) `ghl-fetch-templates`
- Loads the shared auth env file.
- Re-runs auth validation before the template fetch.
- Calls `GET /emails/builder`.
- Writes the raw metadata snapshot to
  `ghl-services/ghl-fetch-templates/data/templates.json`.

### 3) `ghl-update-template/view-content`
- Uses auth validation before template lookup.
- Supports selection by exact id or case-insensitive name.
- Defaults to template name `nycpolicyscopebase` when no selector is given.
- Starts with `limit=100`, then falls back to a name query and pagination when
  needed.
- Can fetch preview HTML from the selected template's `previewUrl`.
- Writes preview files to `ghl-services/ghl-update-template/view-content/previews/`.
- Returns a preview dump with raw HTML plus a lightweight structural summary.

### 4) `ghl-update-template/clone-content`
- Delegates template lookup to `view-content`.
- Fetches the selected template's preview HTML.
- Creates a new draft with `POST /emails/builder`.
- Pushes HTML into that draft with `POST /emails/builder/data`.
- Exposes a standalone clone CLI.
- Exposes a publish wrapper, `publish-injected-draft.mjs`, that:
  - discovers the newest injected HTML artifact on disk
  - clones a fresh draft
  - republishes that artifact into the new draft

### 5) `ghl-update-template/inject-content`
- Is implemented, but only as a local artifact generator today.
- Requires one `[[[NEWSLETTER_BODY_SLOT]]]` token in a local preview file.
- Replaces that slot with one bundled sample block from
  `sample-newsletter-block.jinja.html`.
- Writes injected artifacts to
  `ghl-services/ghl-update-template/inject-content/injection-output/`.
- Does not perform direct API publishing.

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

## Root Script Audit

Root scripts are operationally useful but narrow:
- `npm run test`: runs package tests across all services
- `npm run lint`: runs package lint across all services
- `npm run typecheck`: runs only the TypeScript packages
- `npm run validate`: runs `typecheck`, `test`, then `lint`
- `npm run fix`: runs package fix scripts across all services

There is still no root script that executes auth -> view -> inject -> publish.

## Newsletter System Audit

### Current state
- Supports exactly one explicit slot token in the base HTML.
- Supports exactly one bundled block partial.
- Produces a local HTML artifact that can be picked up by the publish wrapper.
- Supports live draft cloning through `clone-content`.
- Supports live publish through `publish-injected-draft.mjs`, but only by
  choosing the newest injected HTML artifact on disk.

### Missing pieces
- No support for 10 repeatable blocks.
- No structured input schema for ordered blocks.
- No optional-image rendering path.
- No CTA or URL validation.
- No escaping or sanitization layer.
- No render-stage separation between "render one block" and "inject assembled newsletter".
- No direct `inject-content` API publish command.
- No wrapper flag for "publish this exact injected file".

### Practical conclusion
The repository supports a proof-of-flow newsletter pipeline with working clone
and publish steps, but not yet the full target newsletter contract of up to 10
repeatable blocks with structured heading, body, image, and CTA data.

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
- `publish-injected-draft.mjs` clones a fresh draft internally before it
  publishes the newest injected artifact.
- The repository uses Node's built-in test runner today.
- The recommended operational flow is auth -> fetch/view -> inject -> publish
  wrapper, with standalone clone available as a separate operation.

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
- Preview -> confirm one template can be resolved and dumped locally.
- Inject -> confirm one preview artifact can be transformed into one injected artifact.
- Draft publish -> confirm the wrapper can create a fresh draft and overwrite it with the newest injected HTML.

### Final check before push
- Run validation commands successfully.
- Confirm `.env`, `node_modules`, `previews/`, `injection-output/`, and
  `data/templates.json` are ignored or unstaged.
- Confirm stakeholders understand the current newsletter limitation:
  single-block injection only.
