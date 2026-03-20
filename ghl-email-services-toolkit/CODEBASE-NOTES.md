# CODEBASE-NOTES

This document captures the current repository state as it exists on disk today.
It is the internal companion to `README.md` and separates current runtime
behavior from the intended next architecture.

## System Summary

### Current runtime

The repository currently supports this executable flow:

1. authenticate against the target location
2. fetch template inventory
3. select a template and optionally download its preview HTML
4. clone that preview HTML into a new draft template
5. inject a local sample newsletter fragment into preview HTML
6. publish the newest injected artifact into the cloned draft

### Intended next architecture

The docs now align to this target pipeline:

```text
auth -> fetch/view template -> research content -> Pexels image sourcing -> GHL media upload/link resolution -> final Jinja render -> draft create/update
```

## Modules And Flows

### Implemented services

#### `authentication-ghl`
- Validates `GHL_PRIVATE_INTEGRATION_TOKEN` and `GHL_LOCATION_ID`.
- Probes `GET /emails/builder` and `GET /users/`.
- Should fail fast before any downstream step.

#### `ghl-fetch-templates`
- Loads the shared auth env file.
- Re-runs auth validation before the template fetch.
- Calls `GET /emails/builder`.
- Writes the raw metadata snapshot to
  `ghl-services/ghl-fetch-templates/data/templates.json`.

#### `ghl-update-template/view-content`
- Uses auth validation before template lookup.
- Supports selection by exact id or case-insensitive name.
- Can fetch preview HTML from the selected template's `previewUrl`.
- Writes preview files to
  `ghl-services/ghl-update-template/view-content/previews/`.
- Already exposes useful structural preview data for future render planning.

#### `ghl-update-template/clone-content`
- Delegates template lookup to `view-content`.
- Fetches the selected template's preview HTML.
- Creates a new draft with `POST /emails/builder`.
- Pushes HTML into that draft with `POST /emails/builder/data`.
- Exposes `publish-injected-draft.mjs` as the current transitional publish path.

#### `ghl-update-template/inject-content`
- Is implemented, but only as a local artifact generator today.
- Requires one `[[[NEWSLETTER_BODY_SLOT]]]` token in a local preview file.
- Replaces that slot with one bundled sample block.
- Writes injected artifacts to
  `ghl-services/ghl-update-template/inject-content/injection-output/`.
- Does not yet perform final multi-input Jinja rendering.

### Planned service boundaries

#### `research-content`
- Planned upstream content stage.
- Expected output: ordered raw HTML fragments.
- Not responsible for image upload or template publish.

#### `pexels-api-references`
- Already defines the future Pexels sourcing contract.
- Expected future execution output: normalized image selections.

#### `ghl-media-usage`
- Existing empty folder reserved for the planned GHL media stage.
- Expected input: normalized Pexels image selections.
- Expected output: rich GHL image objects for render.

## Contract Direction

The intended next-state handoffs are:

- Research output: ordered raw HTML fragments
- Pexels output: normalized image selections
- Media output: rich GHL image objects with slot, hosted GHL URL, media/file
  id, alt text, attribution, and retained provider metadata as needed
- Final render input: base preview/template HTML + ordered research fragments +
  rich GHL image objects
- Publish input: explicit rendered HTML from `inject-content`

## Newsletter System Audit

### Current runtime state
- Supports exactly one explicit slot token in the base HTML.
- Supports exactly one bundled sample partial with:
  - heading
  - body
  - image
  - CTA
- Produces a local HTML artifact that can be picked up by the publish wrapper.

### Missing in runtime
- Ordered research-content input
- Pexels execution module
- GHL media-upload/link-resolution module
- Final Jinja render as the last content-assembly step
- Better Jinja renderer and injection tooling aligned to the evolving base template
- Explicit render-to-publish handoff
- Structured multi-block render support
- Optional-image rendering path
- Strong validation and sanitization for render inputs

## Incomplete Or Fragile Areas

### Implemented but fragile
- `publish-injected-draft.mjs` publishes the newest injected artifact it can
  find on disk, which is convenient but can target the wrong file if multiple
  runs are present.
- Generated preview, snapshot, and injection artifacts are written inside the
  repo tree.
- The shared env file lives under one package and is reused across others by
  relative path.

### Transitional by design
- The inject step is still sample-driven and local-first.
- The preferred docs now describe explicit rendered HTML handoff, but runtime
  still uses latest-artifact discovery.
- The research and media service boundaries are documented before they are
  implemented so future work lands in the right packages.

## Documentation Alignment Notes

This doc set is aligned so that:

- `view-content` remains read-only preview/template analysis
- `inject-content` is the documented final render owner in the target
  architecture
- `clone-content` is the documented draft create/update boundary in the target
  architecture
- `ghl-media-usage` is the planned GHL image upload/link-resolution boundary
- current sample/local injection behavior is still called out explicitly as the
  runtime reality

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
- Current runtime flow:
  - auth -> fetch/view -> clone -> sample inject -> publish wrapper
- Planned next flow:
  - auth -> fetch/view -> research -> pexels -> media -> final render -> publish

### Final check before push
- Run validation commands successfully.
- Confirm `.env`, `node_modules`, `previews/`, `injection-output/`, and
  `data/templates.json` are ignored or unstaged.
- Confirm stakeholders understand the split between:
  - implemented runtime behavior
  - documented next architecture
