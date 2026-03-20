# AGENT.md

## Purpose

This folder is the execution layer for GoHighLevel email-template operations
and planned adjacent newsletter services. Each child folder owns one stage of
the pipeline or one planned stage boundary.

## How To Think About This Folder

- Keep service boundaries narrow.
- Reuse upstream contracts instead of duplicating logic.
- Let auth gate everything downstream.
- Preserve JSON-first CLI output because other wrappers depend on it.
- When a module is only planned, label it clearly as planned.

## Service Routing

### Implemented now
- `authentication-ghl`: validate token and location scope
- `ghl-fetch-templates`: fetch template metadata and persist a snapshot
- `ghl-update-template/view-content`: locate a template and save preview HTML
- `ghl-update-template/clone-content`: create a draft and update draft HTML
- `ghl-update-template/inject-content`: current local sample-injection utility

### Planned next
- `research-content`: produce ordered raw HTML fragments
- `ghl-media-usage`: upload normalized image selections to GHL and resolve
  render-ready hosted image links

## Current Dependency Order

1. `authentication-ghl`
2. `ghl-fetch-templates` or `ghl-update-template/view-content`
3. `ghl-update-template/clone-content`
4. `ghl-update-template/inject-content`
5. `publish-injected-draft.mjs` when using the current transitional publish path

## Intended Next Dependency Order

```text
authentication-ghl
-> ghl-fetch-templates or ghl-update-template/view-content
-> research-content
-> pexels execution module (future implementation of pexels-api-references)
-> ghl-media-usage
-> ghl-update-template/inject-content
-> ghl-update-template/clone-content
```

## Inputs / Outputs / Contracts

- Shared inputs:
  - Node.js 20+
  - `ghl-services/authentication-ghl/.env`
  - GoHighLevel API base URL and version header
- Shared outputs:
  - structured JSON from CLIs
  - generated artifacts written under each package's output folder when needed

## Contract Direction

- `research-content` output: ordered raw HTML fragments
- Pexels output: normalized image selections
- `ghl-media-usage` output: rich GHL image objects for render
- `inject-content` target input: preview/template HTML + research fragments +
  rich GHL image objects
- `clone-content` target input: explicit rendered HTML

## Constraints And Rules

- Do not duplicate auth checks in ad hoc ways.
- Keep `errorCode` values explicit and machine-readable.
- Do not blur the boundary between final render and live API mutation.
- Do not describe planned modules as implemented runtime packages.

## Example Commands

- `npm --prefix ghl-services/authentication-ghl run check:connection`
- `npm --prefix ghl-services/ghl-fetch-templates run fetch:templates`
- `npm --prefix ghl-services/ghl-update-template/clone-content run clone:template -- --template-id=<id>`
