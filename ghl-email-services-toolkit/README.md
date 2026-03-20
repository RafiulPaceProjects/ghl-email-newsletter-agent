# GHL Email Services Toolkit

This repository is a working GoHighLevel email-template MVP for a staged
newsletter workflow. It already includes live auth, template fetch, template
selection, preview download, draft cloning, local newsletter injection, and a
publish wrapper that combines clone + publish.

The flow is intentionally split across small packages. There is no single
root-level command that runs auth -> view -> inject -> publish end to end.
Today you run the stages separately.

## Implemented flow

1. validate auth and location scope
2. fetch template inventory when needed
3. select a template and optionally dump preview HTML
4. inject one bundled newsletter block into a saved preview artifact
5. either:
   - clone the base template into a new HTML draft, or
   - run the publish wrapper, which clones a fresh draft and then publishes the
     newest injected HTML artifact into it

## Modules

### `ghl-services/authentication-ghl`
- Verifies the private integration token and location scope.
- Probes `GET /emails/builder` and `GET /users/`.
- Returns structured JSON for downstream gating.

### `ghl-services/ghl-fetch-templates`
- Fetches template metadata from `GET /emails/builder`.
- Re-runs auth before fetching.
- Writes a local snapshot to `ghl-services/ghl-fetch-templates/data/templates.json`.

### `ghl-services/ghl-update-template/view-content`
- Finds one template by exact id or case-insensitive name.
- Defaults to template name `nycpolicyscopebase` when no selector is passed.
- Fetches preview HTML and saves it under `previews/`.
- Returns both the raw HTML dump and a lightweight structural summary.

### `ghl-services/ghl-update-template/clone-content`
- Reuses `view-content` to resolve the base template.
- Fetches the base template preview HTML.
- Calls `POST /emails/builder`, then `POST /emails/builder/data`.
- Supports standalone draft cloning through `clone:template`.
- Includes `publish-injected-draft.mjs`, which clones a fresh draft and then
  republishes the newest injected HTML artifact it finds on disk.

### `ghl-services/ghl-update-template/inject-content`
- Replaces a single `[[[NEWSLETTER_BODY_SLOT]]]` token in a local preview file.
- Reads one hardcoded partial from `sample-newsletter-block.jinja.html`.
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
dependencies per package before using root scripts or package CLIs:

```bash
npm --prefix ghl-services/authentication-ghl install
npm --prefix ghl-services/ghl-fetch-templates install
npm --prefix ghl-services/ghl-update-template/view-content install
npm --prefix ghl-services/ghl-update-template/clone-content install
npm --prefix ghl-services/ghl-update-template/inject-content install
```

## Root scripts

The root `package.json` is only for cross-package maintenance commands. It does
not provide an end-to-end publish command.

```bash
npm run test
npm run lint
npm run typecheck
npm run validate
npm run fix
```

Notes:
- `npm run validate` runs `typecheck`, `test`, then `lint` across the repo.
- Root `typecheck` covers the TypeScript packages only.
- `inject-content` is plain `.mjs`, so it participates in root `test`, `lint`,
  and `fix`, but not root `typecheck`.

## Package commands

```bash
npm --prefix ghl-services/authentication-ghl run check:connection
npm --prefix ghl-services/ghl-fetch-templates run fetch:templates
npm --prefix ghl-services/ghl-update-template/view-content run view:template -- --template-name="Weekly Update"
npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id="template_id"
npm --prefix ghl-services/ghl-update-template/clone-content run clone:template -- --template-id="template_id" --draft-name="Newsletter Draft"
node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html
node ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs --template-id="template_id" --draft-name="Newsletter Draft"
```

The publish wrapper accepts the same selector args as the clone CLI because it
passes its arguments through to `clone-template.cli.ts`.

## Current MVP boundaries

### What works now
- Auth validation against both required probes
- Template inventory snapshot fetch
- Template lookup by id or case-insensitive name
- Preview HTML download and local preview artifacts
- Standalone clone into a new HTML draft
- One-slot local newsletter injection
- Publish wrapper that clones a fresh draft and overwrites it with the newest
  injected HTML artifact

### What is still partial or missing
- No single command runs the full workflow from auth to publish
- `inject-content` only supports one hardcoded sample block
- No structured heading/body/image/CTA input
- No support for up to 10 ordered blocks
- No optional-image rendering path
- No direct publish command inside `inject-content`
- No explicit wrapper argument for "publish this exact injected file"; the
  wrapper always chooses the newest `.html` file in `inject-content/injection-output/`

## Practical workflow

### Inventory and preview
1. Run auth validation.
2. Fetch template inventory if you need a fresh list.
3. Save preview HTML for the template you want to work from.

### Local injection and publish
1. Run `view:preview-url` to create a local preview artifact.
2. Run `inject-sample.mjs --preview-html <that preview file>`.
3. Run `publish-injected-draft.mjs` with the same template selector you want to
   clone from.

The publish wrapper does the clone step internally. You do not need to run
`clone:template` first unless you specifically want a cloned draft without the
injected artifact publish step.

## Current injection limitations

The current system does not satisfy the full target contract of "up to 10
ordered blocks with heading + body + image + CTA". Today it only supports:
- one explicit slot token: `[[[NEWSLETTER_BODY_SLOT]]]`
- one bundled sample block partial
- plain string replacement into HTML
- local artifact generation before the publish wrapper picks up the newest file

## Ready for push

- Confirm `ghl-services/authentication-ghl/.env` is present locally and not staged.
- Run `npm run validate` from the repo root.
- Smoke test the critical path in package-sized steps:
  - auth
  - fetch or view
  - preview dump
  - inject
  - publish wrapper
- Confirm generated files under `previews/`, `injection-output/`, and
  `data/templates.json` are not staged for commit.
- Confirm stakeholders understand the current MVP boundary: working clone and
  publish flow, but only single-block local injection today.
