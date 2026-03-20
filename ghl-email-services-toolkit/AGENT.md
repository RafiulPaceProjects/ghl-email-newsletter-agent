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
4. Generate structured newsletter research JSON in
   `ghl-services/research-content`.
5. Clone preview HTML into a new draft in
   `ghl-services/ghl-update-template/clone-content`.
6. Inject a local sample newsletter artifact in
   `ghl-services/ghl-update-template/inject-content`.
7. Publish the newest injected artifact through
   `ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs`.

The current GHL publish path is still preview -> local sample injection ->
clone/publish. `research-content` is implemented, but it is not yet wired into
that publish path.

## Intended Next Workflow

The docs in this repo now align to this next target pipeline:

```text
auth -> fetch/view template -> research content -> Pexels candidate download -> Image_Qualifyer final selection -> GHL media upload/link resolution -> final Jinja render -> draft create/update
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
  - Pexels candidate downloads under `ghl-media-usage/pexel_downloader/downloads/`
  - final approved images and JSON under `ghl-media-usage/Image_Qualifyer/output/`

## Routing Rules

- Token, permission, or location issues: `ghl-services/authentication-ghl`
- Template inventory snapshot work: `ghl-services/ghl-fetch-templates`
- Template lookup or preview analysis:
  `ghl-services/ghl-update-template/view-content`
- Final render contract work:
  `ghl-services/ghl-update-template/inject-content`
- Draft creation or explicit publish work:
  `ghl-services/ghl-update-template/clone-content`
- Research brief to newsletter JSON work:
  `ghl-services/research-content`
- Shared cross-package JSON contract work:
  `ghl-services/contracts`
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
- Keep candidate downloads out of `Image_Qualifyer/output/`.
- Keep only the two final approved images in `Image_Qualifyer/output/`.

## Newsletter Contract Status

### Implemented now
- one slot token
- one bundled sample block
- local artifact generation
- transitional publish wrapper handoff

### Planned next
- ordered research HTML fragments
- downloader-owned Pexels candidate batches
- final `Hero` and `Secondary` image approval in `Image_Qualifyer`
- GHL media upload and hosted-link resolution
- final Jinja render inside `inject-content`
- explicit rendered HTML publish through `clone-content`

## Example Commands

- `npm run validate`
- `npm --prefix ghl-services/authentication-ghl run check:connection`
- `npm --prefix ghl-services/ghl-media-usage/pexel_downloader run download:images -- --query=<query>`
- `npm --prefix ghl-services/ghl-media-usage/Image_Qualifyer run qualify:images -- --input-file=<path>`
- `npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id=<id>`
- `node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html`
