# GHL Email Services Toolkit

This repository is a GoHighLevel email-template toolkit for newsletter work.
It currently contains a working auth/fetch/view/clone flow plus a local
sample-based inject step. The docs in this repo now align to the intended next
pipeline as well as the current runtime reality.

## Current Runtime Flow

Implemented today:

1. validate auth and location scope
2. fetch template inventory
3. select a template and optionally dump preview HTML
4. clone preview HTML into a new draft
5. inject a local sample newsletter block into a preview artifact
6. publish the newest injected artifact into the cloned draft

This remains the current executable behavior on disk.

## Intended Next Pipeline

The next documented target pipeline is:

```text
auth -> fetch/view template -> research content -> Pexels image sourcing -> GHL media upload/link resolution -> final Jinja render -> draft create/update
```

The key architectural shift is:

- `inject-content` becomes the documented final render boundary
- `clone-content` becomes the documented explicit draft create/update boundary

## Build Checklist

This checklist maps the desired flow to the current codebase and the next module
or capability that still needs to be built.

| Desired flow step | What already exists | What module must be built next |
| --- | --- | --- |
| Auth | `ghl-services/authentication-ghl` validates token and location scope. | Nothing new for v1 pipeline order; reuse the existing auth gate. |
| Fetch/view template | `ghl-services/ghl-fetch-templates` fetches inventory and `ghl-services/ghl-update-template/view-content` resolves template and preview HTML. | Nothing new for the basic step; later refine preview inspection if stricter slot validation is needed. |
| Research content | No runtime research-content module exists yet. Docs now reserve `ghl-services/research-content`. | Build `ghl-services/research-content` to output ordered raw HTML fragments. |
| Pexels image sourcing | `pexels-api-references` defines the sourcing contract, but there is no execution module yet. | Build a Pexels execution module that follows `pexels-api-references` and outputs normalized image selections. |
| GHL media upload/link resolution | `ghl-medias-enpoints-reference` documents the APIs and `ghl-services/ghl-media-usage` is reserved as a planned folder, but no runtime implementation exists yet. | Build `ghl-services/ghl-media-usage` to upload approved images, resolve hosted GHL links, and return rich render-ready image objects. |
| Final Jinja render | `ghl-services/ghl-update-template/inject-content` exists, but only as `inject-sample.mjs` for one local sample block. | Upgrade `ghl-services/ghl-update-template/inject-content` into the real final render stage that accepts preview/template HTML, ordered research fragments, and rich GHL image objects, and improve the Jinja renderer and injection tool so they fit the evolving base template correctly. |
| Draft create/update | `ghl-services/ghl-update-template/clone-content` already creates a draft and updates HTML through GHL. | Refine `clone-content` to consume explicit rendered HTML from `inject-content` instead of relying on the newest injected artifact as the preferred path. |

### Short version

- Already usable now:
  - auth
  - template fetch/view
  - draft clone/update
  - sample local injection
- Must be built next for the target pipeline:
  - `ghl-services/research-content`
  - Pexels execution module
  - `ghl-services/ghl-media-usage`
  - final-render version of `ghl-services/ghl-update-template/inject-content`
  - better Jinja renderer and injection tooling aligned to the base template
  - explicit rendered-HTML handoff into `clone-content`

## Modules

### Implemented now

#### `ghl-services/authentication-ghl`
- Verifies the private integration token and location scope.
- Probes `GET /emails/builder` and `GET /users/`.

#### `ghl-services/ghl-fetch-templates`
- Fetches template metadata from `GET /emails/builder`.
- Writes a local snapshot to `ghl-services/ghl-fetch-templates/data/templates.json`.

#### `ghl-services/ghl-update-template/view-content`
- Finds one template by name or id.
- Fetches preview HTML and saves it under `previews/`.
- Provides structural preview data that can support future render planning.

#### `ghl-services/ghl-update-template/clone-content`
- Clones preview HTML into a new HTML draft.
- Calls `POST /emails/builder`, then `POST /emails/builder/data`.
- Still includes `publish-injected-draft.mjs` as the current transitional
  publish path.

#### `ghl-services/ghl-update-template/inject-content`
- Replaces one `[[[NEWSLETTER_BODY_SLOT]]]` token in a local preview file.
- Writes a local injected artifact under `injection-output/`.
- Still only supports `inject-sample.mjs` at runtime today.

### Planned next

#### `ghl-services/research-content`
- Will produce ordered raw HTML fragments from story or research inputs.
- Will not upload images or publish templates directly.

#### `pexels-api-references`
- Documents the future Pexels image-sourcing contract.
- The future execution module should output normalized image selections.

#### `ghl-services/ghl-media-usage`
- Planned GHL media upload and link-resolution stage.
- Will take normalized Pexels image selections, upload them into the scoped GHL
  media folder, and return rich render-ready GHL image objects.

## Contract Direction

The intended next-state handoffs are:

- Research output: ordered raw HTML fragments
- Pexels output: normalized image selections
- Media output: rich GHL image objects with slot, GHL URL, media/file id, alt
  text, attribution, and retained provider metadata as needed
- Final render input: base preview/template HTML + ordered research fragments +
  rich GHL image objects
- Publish input: explicit rendered HTML from `inject-content`

## Setup

### Runtime requirements
- Node.js 20+
- A GoHighLevel private integration token
- A GoHighLevel location id

### Shared env file
Create `ghl-services/authentication-ghl/.env` from
`ghl-services/authentication-ghl/.env.example`.

Required variables:

```bash
GHL_PRIVATE_INTEGRATION_TOKEN=your_token
GHL_LOCATION_ID=your_location_id
```

### Install dependencies
Each service package has its own `package.json` and lockfile. Install
dependencies per package before running the root scripts:

```bash
npm --prefix ghl-services/authentication-ghl install
npm --prefix ghl-services/ghl-fetch-templates install
npm --prefix ghl-services/ghl-update-template/view-content install
npm --prefix ghl-services/ghl-update-template/clone-content install
npm --prefix ghl-services/ghl-update-template/inject-content install
```

## Key Commands

```bash
npm run test
npm run lint
npm run typecheck
npm run validate
```

```bash
npm --prefix ghl-services/authentication-ghl run check:connection
npm --prefix ghl-services/ghl-fetch-templates run fetch:templates
npm --prefix ghl-services/ghl-update-template/view-content run view:template -- --template-name="Weekly Update"
npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id="template_id"
npm --prefix ghl-services/ghl-update-template/clone-content run clone:template -- --template-id="template_id" --draft-name="Newsletter Draft"
node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html
node ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs --template-id="template_id" --draft-name="Newsletter Draft"
```

## Newsletter Rendering Status

### Implemented now
- One explicit slot token: `[[[NEWSLETTER_BODY_SLOT]]]`
- One bundled newsletter sample partial
- Local HTML artifact generation
- Transitional draft publish handoff through
  `clone-content/publish-injected-draft.mjs`

### Planned next
- Ordered research HTML fragments as upstream content input
- Pexels image selection followed by GHL media upload/link resolution
- Final Jinja render as the last content-assembly step
- Better Jinja renderer and injection behavior aligned to the base template
- Explicit rendered HTML handoff from `inject-content` to `clone-content`
- Stronger validation for URLs, image presence, and render inputs

### Still missing in runtime
- Structured multi-block newsletter support
- Optional-image rendering logic
- Direct render-to-publish flow inside the documented next pipeline

## Critical Flow

### Current executable flow
1. Run auth validation.
2. Fetch or select the base template.
3. Save preview HTML locally.
4. Inject the local sample block into the preview artifact.
5. Clone the base template into a fresh draft.
6. Publish the newest injected artifact into that cloned draft.

### Intended next flow
1. Run auth validation.
2. Fetch or select the base template and preview context.
3. Produce ordered research HTML fragments.
4. Select and normalize Pexels images.
5. Upload images to GHL and resolve final hosted links.
6. Render final Jinja HTML in `inject-content`.
7. Create or update the draft using explicit rendered HTML.

## Ready For Push

- Confirm `ghl-services/authentication-ghl/.env` is present locally and not staged.
- Run `npm run validate` from the repo root.
- Smoke test the current critical path:
  - auth -> fetch
  - view -> preview dump
  - inject -> publish draft
- Confirm generated files under `previews/`, `injection-output/`, and
  `data/templates.json` are not staged for commit.
- Confirm the docs are understood as:
  - current runtime: sample/local-first injection
  - planned next architecture: research/images first, final Jinja render last
