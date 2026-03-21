# AGENT.md

## Purpose

Routing document for the `ghl-email-services-toolkit` repository. Start here
before changing code or docs inside the toolkit.

## How To Think About This Repo

- Treat the system as a staged pipeline, not one monolith.
- Keep current runtime behavior and planned next-state architecture separate.
- Prefer package-local `AGENT.md` files once the target package is known.
- Use the runtime code as the source of truth when docs drift.

## Folder Map

- `README.md`: human-facing setup and workflow overview
- `CODEBASE-NOTES.md`: implementation audit and current checkout status
- `ghl-email-endpoints-reference`: request-shape and endpoint behavior notes
- `ghl-medias-enpoints-reference`: media endpoint notes for future work
- `pexels-api-references`: future image-sourcing contract docs
- `ghl-services`: executable services plus planned boundaries

## Current Runtime Flow

Implemented and reliable in this checkout:

1. Validate auth in `ghl-services/authentication-ghl`.
2. Fetch template inventory in `ghl-services/ghl-fetch-templates`.
3. Resolve a template or save preview HTML in
   `ghl-services/ghl-update-template/view-content`.
4. Normalize content fragments in `ghl-services/research-content`.
5. Normalize render-ready image metadata in
   `ghl-services/ghl-media-usage`.
6. Render one explicit newsletter artifact in
   `ghl-services/ghl-update-template/inject-content`.
7. Clone preview HTML into a new draft and publish the explicit rendered HTML
   in `ghl-services/ghl-update-template/clone-content`.

## Partial Or Planned Areas

- Reference docs may still describe the target pipeline beyond what the
  runnable packages currently orchestrate end to end.
- Image sourcing ahead of `ghl-services/ghl-media-usage` is still a planned
  stage rather than a validated runtime package in this checkout.

## Intended Next Workflow

The documented target pipeline remains:

```text
auth -> fetch/view template -> research content -> image sourcing -> GHL media upload/link resolution -> final render -> draft create/update
```

## Routing Rules

- Token, permission, or location issues: `ghl-services/authentication-ghl`
- Template inventory snapshot work: `ghl-services/ghl-fetch-templates`
- Template lookup or preview analysis:
  `ghl-services/ghl-update-template/view-content`
- Local sample injection or future final render work:
  `ghl-services/ghl-update-template/inject-content`
- Draft creation or publish-wrapper work:
  `ghl-services/ghl-update-template/clone-content`
- Upstream content fragment generation:
  `ghl-services/research-content`
- Media upload and render-ready image normalization:
  `ghl-services/ghl-media-usage`
- Email endpoint behavior questions: `ghl-email-endpoints-reference`
- Media endpoint behavior questions: `ghl-medias-enpoints-reference`
- Future Pexels contract questions: `pexels-api-references`

## Constraints And Rules

- Do not hardcode secrets or location ids.
- Reuse the shared env contract from `ghl-services/authentication-ghl/.env`.
- Keep CLI JSON contracts stable and machine-readable.
- Label planned modules as planned only when code does not exist yet.
- Generated artifacts under `data/`, `previews/`, and `injection-output/` are
  operational outputs, not source files.
- Treat `render-output/` the same way.

## Validation

The root maintenance scripts currently cover:

- `internal-core`
- `authentication-ghl`
- `ghl-fetch-templates`
- `research-content`
- `ghl-media-usage`
- `ghl-update-template/view-content`
- `ghl-update-template/clone-content`
- `ghl-update-template/inject-content`

## Example Commands

- `npm run validate`
- `npm --prefix ghl-services/authentication-ghl run check:connection`
- `npm --prefix ghl-services/ghl-fetch-templates run fetch:templates`
- `npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id=<id>`
- `npm --prefix ghl-services/research-content test`
- `npm --prefix ghl-services/ghl-media-usage test`
- `node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html`
