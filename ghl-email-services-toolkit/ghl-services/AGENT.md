# AGENT.md

## Purpose

Execution-layer routing guide for `ghl-services`.

## How To Think About This Folder

- Each child folder owns one stage of the pipeline.
- Auth should fail fast before downstream work starts.
- Keep JSON-first CLI output because wrappers and tests depend on it.
- Keep current runtime boundaries explicit even when some stages are still
  transitional.

## Service Routing

### Implemented and validated now

- `internal-core`: shared env, request, artifact, and CLI helpers
- `authentication-ghl`: validate token and location scope
- `ghl-fetch-templates`: fetch template metadata and persist a snapshot
- `research-content`: normalize ordered content fragments
- `ghl-media-usage`: resolve media folder state and return render-ready image
  metadata
- `ghl-update-template/view-content`: locate a template and save preview HTML
- `ghl-update-template/inject-content`: render explicit newsletter HTML
  artifacts
- `ghl-update-template/clone-content`: create a draft and publish explicit
  rendered HTML

### Partial or planned

- image sourcing ahead of `ghl-media-usage`

## Current Dependency Order

1. `authentication-ghl`
2. `ghl-fetch-templates` or `ghl-update-template/view-content`
3. `research-content`
4. `ghl-media-usage`
5. `ghl-update-template/inject-content`
6. `ghl-update-template/clone-content`

## Intended Next Dependency Order

```text
authentication-ghl
-> ghl-fetch-templates or ghl-update-template/view-content
-> research-content
-> image sourcing
-> ghl-media-usage
-> ghl-update-template/inject-content
-> ghl-update-template/clone-content
```

## Inputs / Outputs / Contracts

- Shared inputs:
  - Node.js 20+
  - `ghl-services/authentication-ghl/.env`
- Shared outputs:
  - structured JSON from CLIs
  - generated artifacts written under each package's output folder when needed

## Constraints And Rules

- Do not duplicate auth checks in ad hoc ways.
- Keep `errorCode` values explicit and machine-readable.
- Do not blur preview analysis, final render, and live publish logic together.
- Do not describe image-sourcing docs as a finished runtime module.

## Example Commands

- `npm --prefix ghl-services/authentication-ghl run check:connection`
- `npm --prefix ghl-services/ghl-fetch-templates run fetch:templates`
- `npm --prefix ghl-services/ghl-update-template/clone-content run clone:template -- --template-id=<id>`
