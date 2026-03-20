# AGENT.md

## Purpose

This is the routing document for the `ghl-email-services-toolkit` repository.
Start here before changing code or docs.

## How To Think About This Repo

- Treat the system as a staged pipeline, not one monolith.
- Use runtime code as the source of truth for what works now.
- Use docs as the source of truth for the intended next architecture.
- Keep current behavior and planned behavior clearly separated in wording.

## Folder Map

- `ghl-email-endpoints-reference`: email builder endpoint behavior and current
  publish-path notes
- `ghl-medias-enpoints-reference`: media endpoint behavior for future image
  upload and link resolution
- `pexels-api-references`: Pexels sourcing contract for future image selection
- `ghl-services`: executable services and planned service boundaries
- `README.md`: human-facing setup, flow, and push checklist
- `CODEBASE-NOTES.md`: current-state implementation audit

## Current Workflow

Implemented today:

1. Validate auth in `ghl-services/authentication-ghl`.
2. Fetch template inventory in `ghl-services/ghl-fetch-templates`.
3. Select a template or dump preview HTML in
   `ghl-services/ghl-update-template/view-content`.
4. Clone preview HTML into a new draft in
   `ghl-services/ghl-update-template/clone-content`.
5. Inject a local sample newsletter artifact in
   `ghl-services/ghl-update-template/inject-content`.
6. Publish the newest injected artifact through
   `ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs`.

## Intended Next Workflow

The docs in this repo now align to this next target pipeline:

```text
auth -> fetch/view template -> research content -> Pexels image sourcing -> GHL media upload/link resolution -> final Jinja render -> draft create/update
```

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
  - injected/rendered HTML artifacts

## Routing Rules

- Token, permission, or location issues: `ghl-services/authentication-ghl`
- Template inventory snapshot work: `ghl-services/ghl-fetch-templates`
- Template lookup or preview analysis:
  `ghl-services/ghl-update-template/view-content`
- Final render contract work:
  `ghl-services/ghl-update-template/inject-content`
- Draft creation or explicit publish work:
  `ghl-services/ghl-update-template/clone-content`
- Planned research-content contract work:
  `ghl-services/research-content`
- Planned GHL media upload/link-resolution contract work:
  `ghl-services/ghl-media-usage`
- Pexels sourcing and normalization contract questions:
  `pexels-api-references`
- Email endpoint request-shape or API behavior questions:
  `ghl-email-endpoints-reference`
- Media endpoint request-shape or scope-guard behavior questions:
  `ghl-medias-enpoints-reference`

## Constraints And Rules

- Do not hardcode secrets or location ids.
- Reuse the shared env contract from `authentication-ghl/.env`.
- Keep CLI JSON contracts stable and machine-readable.
- Keep docs aligned with both:
  - current implementation status
  - intended next architecture
- Generated artifacts under `data/`, `previews/`, and `injection-output/` are
  operational outputs, not source files.

## Newsletter Contract Status

### Implemented now
- one slot token
- one bundled sample block
- local artifact generation
- transitional publish wrapper handoff

### Planned next
- ordered research HTML fragments
- normalized Pexels image selections
- GHL media upload and hosted-link resolution
- final Jinja render inside `inject-content`
- explicit rendered HTML publish through `clone-content`

## Example Commands

- `npm run validate`
- `npm --prefix ghl-services/authentication-ghl run check:connection`
- `npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id=<id>`
- `node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html`
