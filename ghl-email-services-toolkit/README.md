# GHL Email Services Toolkit

This repository is a GoHighLevel email-template toolkit for newsletter work.
It currently contains a working auth/fetch/view/clone flow plus an explicit
render-to-publish handoff for newsletter HTML. The docs in this repo now align
to the intended next pipeline as well as the current runtime reality.

## V1 Production Scope

Treat this as the stable automation boundary for NanoClaw and other runners:

```text
auth -> fetch/view template -> render explicit HTML artifact -> clone/publish draft
```

The following remain outside v1 production scope:

- implicit "latest artifact on disk" publish behavior
- local-only `inject-sample.mjs` experiments
- fully automated image sourcing ahead of `ghl-media-usage`

## Current Runtime Flow

Implemented today:

1. validate auth and location scope
2. fetch template inventory
3. select a template and optionally dump preview HTML
4. normalize ordered content fragments in `research-content`
5. normalize render-ready image metadata in `ghl-media-usage`
6. render one explicit newsletter HTML artifact from preview HTML plus JSON input
7. clone preview HTML into a new draft
8. publish the provided rendered HTML artifact into the cloned draft

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
| Research content | `ghl-services/research-content` now normalizes ordered content fragments and is covered by package tests. | Wire it into a higher-level orchestration entry point when the repo needs one command for the full flow. |
| Pexels image sourcing | `pexels-api-references` defines the sourcing contract, but there is no execution module yet. | Build a Pexels execution module that follows `pexels-api-references` and outputs normalized image selections. |
| GHL media upload/link resolution | `ghl-services/ghl-media-usage` now uploads approved images, resolves the managed folder, and returns render-ready image objects. | Wire it into a higher-level orchestration entry point after image sourcing/qualification is finalized. |
| Final Jinja render | `ghl-services/ghl-update-template/inject-content/render-newsletter.mjs` now renders one explicit HTML artifact from preview HTML and structured JSON input. | Upgrade `inject-content` from the current single-newsletter render contract to the full research/images-driven render boundary. |
| Draft create/update | `ghl-services/ghl-update-template/clone-content` already creates a draft and updates HTML through GHL, and `publish-injected-draft.mjs` now requires `--rendered-html`. | Refine `clone-content` to expose first-class create/update entry points that consume rendered HTML directly without a transitional wrapper. |

### Short version

- Already usable now:
  - auth
  - template fetch/view
  - explicit rendered HTML handoff
  - draft clone/update
  - legacy sample local injection
- Must be built next for the target pipeline:
  - Pexels execution module
  - orchestration that connects `research-content` and `ghl-media-usage` to the render/publish flow
  - richer final-render layouts beyond the current single-newsletter block contract
  - direct first-class publish usage in callers instead of the compatibility wrapper

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
- Includes `publish-injected-draft.mjs` as the current transitional publish
  path, but it now requires one explicit `--rendered-html` artifact path.

#### `ghl-services/ghl-update-template/inject-content`
- Renders one explicit newsletter artifact from preview HTML plus structured
  JSON input through `render-newsletter.mjs`.
- Writes rendered artifacts under `render-output/`.
- Still keeps `inject-sample.mjs` as a local-only legacy helper.

### Planned next

#### `ghl-services/research-content`
- Produces ordered raw HTML fragments from story or research inputs.
- Does not upload images or publish templates directly.

#### `pexels-api-references`
- Documents the future Pexels image-sourcing contract.
- The future execution module should output normalized image selections.

#### `ghl-services/ghl-media-usage`
- Uploads qualified image inputs into the scoped GHL media folder and returns
  rich render-ready GHL image objects.
- Still expects upstream image sourcing/qualification to happen elsewhere.

## Contract Direction

The intended next-state handoffs are:

- Research output: ordered raw HTML fragments
- Pexels output: normalized image selections
- Media output: rich GHL image objects with slot, GHL URL, media/file id, alt
  text, attribution, and retained provider metadata as needed
- Final render input: base preview/template HTML + ordered research fragments +
  rich GHL image objects
- Publish input: explicit rendered HTML from `inject-content`

## Current Runtime Schemas

Machine-readable schemas for the current executable boundary live under
`contracts/current-runtime/`.

Current schema set:

- `auth-check-result`
- `fetch-templates-result`
- `view-selected-template-result`
- `view-preview-dump-result`
- `render-newsletter-input`
- `render-newsletter-result`
- `clone-template-result`
- `publish-rendered-draft-result`

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
npm --prefix ghl-services/internal-core install
npm --prefix ghl-services/authentication-ghl install
npm --prefix ghl-services/ghl-fetch-templates install
npm --prefix ghl-services/ghl-update-template/view-content install
npm --prefix ghl-services/ghl-update-template/clone-content install
npm --prefix ghl-services/ghl-update-template/inject-content install
npm --prefix ghl-services/research-content install
npm --prefix ghl-services/ghl-media-usage install
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
npm --prefix ghl-services/ghl-update-template/inject-content run render:newsletter -- --preview-html ./path/to/preview.html --render-input ./path/to/render-input.json
npm --prefix ghl-services/ghl-update-template/clone-content run clone:template -- --template-id="template_id" --draft-name="Newsletter Draft"
node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html
node ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs --rendered-html ./path/to/rendered.html --template-id="template_id" --draft-name="Newsletter Draft"
```

## Newsletter Rendering Status

### Implemented now
- One explicit slot token: `[[[NEWSLETTER_BODY_SLOT]]]`
- One bundled newsletter block template
- Explicit HTML artifact generation through `render-newsletter.mjs`
- Transitional draft publish handoff through
  `clone-content/publish-injected-draft.mjs --rendered-html ...`
- Legacy local sample helper through `inject-sample.mjs`

### Planned next
- Ordered research HTML fragments as upstream content input
- Pexels image selection followed by GHL media upload/link resolution
- Final Jinja render as the last content-assembly step
- Better Jinja renderer and injection behavior aligned to the base template
- Explicit rendered HTML handoff from `inject-content` to `clone-content`
- Stronger validation for URLs, image presence, and render inputs

### Still missing in runtime
- Higher-level orchestration that runs research -> media -> render -> publish as one command
- Automated upstream image sourcing/qualification before `ghl-media-usage`

## Critical Flow

### Current executable flow
1. Run auth validation.
2. Fetch or select the base template.
3. Save preview HTML locally.
4. Render one explicit HTML artifact from preview HTML and structured input.
5. Clone the base template into a fresh draft.
6. Publish that exact rendered artifact into the cloned draft.

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
  - render explicit html -> publish draft
- Confirm generated files under `previews/`, `injection-output/`, and
  `render-output/`, and `data/templates.json` are not staged for commit.
- Confirm the docs are understood as:
  - current runtime: explicit render artifact handoff
  - planned next architecture: research/images first, final Jinja render last
