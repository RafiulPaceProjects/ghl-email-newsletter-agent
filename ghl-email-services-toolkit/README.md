# GHL Email Services Toolkit

This repository provides a small GoHighLevel email-template toolchain for
newsletter work. The current implemented flow is:

1. validate auth and location scope
2. fetch template inventory
3. select a template and optionally dump preview HTML
4. clone preview HTML into a new draft
5. inject a local newsletter block into a preview artifact
6. publish the newest injected artifact into a cloned draft

## Modules

### `ghl-services/authentication-ghl`
- Verifies the private integration token and location scope.
- Probes `GET /emails/builder` and `GET /users/`.

### `ghl-services/ghl-fetch-templates`
- Fetches template metadata from `GET /emails/builder`.
- Writes a local snapshot to `ghl-services/ghl-fetch-templates/data/templates.json`.

### `ghl-services/ghl-update-template/view-content`
- Finds one template by name or id.
- Fetches preview HTML and saves it under `previews/`.

### `ghl-services/ghl-update-template/clone-content`
- Clones preview HTML into a new HTML draft.
- Calls `POST /emails/builder`, then `POST /emails/builder/data`.
- Includes `publish-injected-draft.mjs`, which republishes the newest injected
  HTML artifact into the newly cloned draft.

### `ghl-services/ghl-update-template/inject-content`
- Replaces a single `[[[NEWSLETTER_BODY_SLOT]]]` token in a local preview file.
- Writes a local injected artifact under `injection-output/`.
- Does not call the GoHighLevel API directly.

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

## Newsletter Injection Status

### What works now
- One explicit slot token: `[[[NEWSLETTER_BODY_SLOT]]]`
- One bundled newsletter block partial
- Local HTML artifact generation
- Draft publish handoff through `clone-content/publish-injected-draft.mjs`

### What is still missing
- 10 repeatable news blocks
- Structured heading/body/image/CTA input
- Optional-image rendering
- Input validation for block count, CTA URLs, and text shape
- Direct API publish inside `inject-content`

The current system does not yet satisfy the full target contract of "up to 10
ordered blocks with heading + body + image + CTA". It only supports a single
hardcoded sample block today.

## Critical Flow

### Fetch -> Inject -> Draft publish
1. Run auth validation.
2. Fetch or select the base template.
3. Save preview HTML locally.
4. Inject the local newsletter block into the preview artifact.
5. Clone the base template into a fresh draft.
6. Publish the newest injected HTML artifact into that cloned draft.

## Ready For Push

- Confirm `ghl-services/authentication-ghl/.env` is present locally and not staged.
- Run `npm run validate` from the repo root.
- Smoke test the critical path:
  - auth -> fetch
  - view -> preview dump
  - inject -> publish draft
- Confirm generated files under `previews/`, `injection-output/`, and
  `data/templates.json` are not staged for commit.
- Confirm the newsletter limitation is understood: current injection is
  single-block and local-first, not yet 10-block structured rendering.
