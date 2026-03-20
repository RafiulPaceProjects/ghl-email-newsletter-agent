# AGENT.md

## Purpose
This is the routing document for the `ghl-email-services-toolkit` repository.
Start here before changing code or docs.

## How To Think About This Repo
- Treat the system as a staged pipeline, not one monolith.
- Use runtime code as the source of truth when docs drift.
- Prefer the narrowest package that owns the current step.
- Keep agent changes practical: fix docs, contracts, and low-risk logic before
  inventing new abstractions.
- Do not imply there is one end-to-end CLI when the workflow is still split
  across packages.

## Folder Map
- `ghl-email-endpoints-reference`: endpoint behavior docs and request-shape notes
- `ghl-services`: executable services, CLIs, and package-local tests
- `README.md`: human-facing setup, flow, and push checklist
- `CODEBASE-NOTES.md`: current-state implementation audit

## Current Workflow
1. Validate auth in `ghl-services/authentication-ghl`.
2. Fetch template inventory in `ghl-services/ghl-fetch-templates` when needed.
3. Select a template or dump preview HTML in `ghl-services/ghl-update-template/view-content`.
4. Inject a local newsletter artifact in `ghl-services/ghl-update-template/inject-content`.
5. Either clone preview HTML into a new draft in `ghl-services/ghl-update-template/clone-content`, or publish the newest injected artifact through `ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs`.

## Inputs / Outputs / Contracts
- Shared inputs:
  - `ghl-services/authentication-ghl/.env`
  - `GHL_PRIVATE_INTEGRATION_TOKEN`
  - `GHL_LOCATION_ID`
- Shared output style:
  - CLI commands emit structured JSON
  - success returns exit code `0`
  - failure returns exit code `1`
- Generated artifacts:
  - template snapshot JSON
  - preview HTML dumps
  - injected HTML artifacts

## Routing Rules
- Token, permission, or location issues: `ghl-services/authentication-ghl`
- Template inventory snapshot work: `ghl-services/ghl-fetch-templates`
- Template lookup or preview analysis: `ghl-services/ghl-update-template/view-content`
- Draft creation or publish-wrapper behavior: `ghl-services/ghl-update-template/clone-content`
- Newsletter slot replacement or injection contract work: `ghl-services/ghl-update-template/inject-content`
- Request-shape or API behavior questions: `ghl-email-endpoints-reference`

## Constraints And Rules
- Do not hardcode secrets or location ids.
- Reuse the shared env contract from `authentication-ghl/.env`.
- Keep CLI JSON contracts stable and machine-readable.
- Keep docs aligned with the current implementation, especially around clone and inject status.
- Generated artifacts under `data/`, `previews/`, and `injection-output/` are operational outputs, not source files.

## Current Newsletter Status
- Implemented now:
  - one slot token
  - one bundled sample block
  - local artifact generation
  - standalone draft clone
  - publish wrapper handoff
- Missing now:
  - 10 repeatable news blocks
  - structured heading/body/image/CTA payloads
  - optional image rendering
  - direct publish command inside `inject-content`
  - explicit wrapper selection of a specific injected artifact path

## Root Scripts
- `npm run test`: runs package tests across all services
- `npm run lint`: runs package lint across all services
- `npm run typecheck`: runs TypeScript package checks only
- `npm run validate`: runs `typecheck`, `test`, then `lint`
- `npm run fix`: runs package fix scripts across all services

## Example Commands
- `npm run validate`
- `npm --prefix ghl-services/authentication-ghl run check:connection`
- `npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id=<id>`
- `node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html`
- `node ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs --template-id=<id>`
