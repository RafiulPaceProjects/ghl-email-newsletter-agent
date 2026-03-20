# AGENT.md

## Purpose
This folder is the execution layer for GoHighLevel email-template operations.
Each child folder owns one stage of the pipeline.

## How To Think About This Folder
- Keep service boundaries narrow.
- Reuse upstream contracts instead of duplicating logic.
- Let auth gate everything downstream.
- Preserve JSON-first CLI output because other wrappers depend on it.
- Be explicit when a step is standalone versus part of the publish wrapper.

## Service Routing
- `authentication-ghl`: validate token and location scope
- `ghl-fetch-templates`: fetch template metadata and persist a snapshot
- `ghl-update-template/view-content`: locate a template and save preview HTML
- `ghl-update-template/clone-content`: clone preview HTML into a new draft and own the publish wrapper
- `ghl-update-template/inject-content`: create local injected newsletter artifacts

## Inputs / Outputs / Contracts
- Shared inputs:
  - Node.js 20+
  - `ghl-services/authentication-ghl/.env`
  - GoHighLevel API base URL and version header
- Shared outputs:
  - structured JSON from CLIs
  - generated artifacts written under each package's output folder

## Practical Dependency Order
1. `authentication-ghl`
2. `ghl-fetch-templates` when inventory refresh is needed
3. `ghl-update-template/view-content`
4. `ghl-update-template/inject-content` for local artifact generation
5. either `ghl-update-template/clone-content` for standalone cloning, or `publish-injected-draft.mjs` for clone + publish

## Constraints And Rules
- Do not duplicate auth checks in ad hoc ways.
- Keep `errorCode` values explicit and machine-readable.
- Do not blur the boundary between local artifact generation and live API mutation.
- Do not describe `inject-content` as a live publisher.

## Example Commands
- `npm --prefix ghl-services/authentication-ghl run check:connection`
- `npm --prefix ghl-services/ghl-fetch-templates run fetch:templates`
- `npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id=<id>`
- `node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html`
- `npm --prefix ghl-services/ghl-update-template/clone-content run clone:template -- --template-id=<id>`
- `node ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs --template-id=<id>`
