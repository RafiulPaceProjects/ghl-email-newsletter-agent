# GHL Email Services Toolkit

Turn a GoHighLevel email template into a ready-to-publish draft without rebuilding it in the UI.

This repository is a developer-facing toolkit for automating the repetitive parts of GHL email-template workflows. Today, the MVP covers auth, template discovery, template selection, preview download, draft cloning, local HTML injection, and a publish wrapper that updates the cloned draft.

The workflow is modular by design. It works today, but it is not yet a single-command product, and the newsletter injection layer is still proof-of-flow rather than the final structured content system.

## Why This Matters

GoHighLevel email work is easy to understand but slow to execute by hand.

Teams often need to:
- verify the right location and token
- find the correct base template
- inspect or download the template HTML
- create a fresh draft from that template
- inject newsletter content
- publish the updated draft

Doing that through the GHL UI is repetitive and error-prone.

The harder problem is that there is not a clean public API path for working with full builder JSON in a way that makes newsletter automation straightforward. In practice, this repo works from the preview HTML layer and wraps the available email-template endpoints into stages that are easier to script, inspect, and debug.

For developers, that matters because it turns a manual workflow into something more repeatable, testable, and automatable.

## What This Tool Does

Current pipeline:

- Validate GoHighLevel auth and location access
- Fetch the template inventory for a location
- Select a template by ID or exact name match
- Download the template preview HTML
- Inject newsletter HTML into a saved preview artifact
- Clone that template into a new HTML draft
- Publish the updated draft through the clone-content publish wrapper

In repo terms, the working path is:

`auth -> fetch templates -> view/select template -> download preview HTML -> inject local HTML -> clone draft -> publish updated draft`

Notes:
- `clone-content` can clone a draft on its own.
- `publish-injected-draft.mjs` performs its own clone step before publishing.
- There is no single orchestration CLI that runs the full flow end to end.

## Current Status

### What works today (MVP)

- Auth validation against GHL email-builder and users endpoints
- Template inventory fetch with JSON snapshot output
- Template selection by template ID or case-insensitive exact name match
- Preview HTML download and local preview artifact generation
- Draft cloning via `POST /emails/builder` and `POST /emails/builder/data`
- Local HTML injection using a required slot token in a preview file
- Publish wrapper that clones a fresh draft and overwrites it with the newest injected HTML artifact on disk
- JSON-first CLI output across the implemented command-line steps

### What is partial

- `inject-content` is a proof-of-flow layer, not the final newsletter rendering system
- Injection currently replaces a single `[[[NEWSLETTER_BODY_SLOT]]]` token with one bundled sample block
- The publish flow is available through the wrapper script, but it depends on clone-content and local artifact discovery
- Artifact selection is convenient but fragile because the publish wrapper always picks the newest injected `.html` file it finds
- The workflow is split across packages instead of exposed as one top-level command

### What is planned

- Structured newsletter input for up to 10 ordered blocks
- Block-level heading, body, image, and CTA fields
- Validation for URLs, optional images, and content shape
- A stronger injection/rendering engine
- A cleaner orchestration CLI for the full pipeline
- Better explicit control over which injected artifact gets published

## How It Works

The codebase is split into small packages so each stage can be used and tested independently.

### `ghl-services/authentication-ghl`

Purpose: validate that the configured private integration token and location can reach the required GHL endpoints.

What it does:
- loads the shared `.env`
- probes `GET /emails/builder`
- probes `GET /users/`
- returns structured JSON with diagnostics and machine-readable error codes

### `ghl-services/ghl-fetch-templates`

Purpose: fetch template inventory for a location and persist a local snapshot.

What it does:
- reuses the shared auth env
- reruns auth validation before fetching
- calls `GET /emails/builder`
- writes `ghl-services/ghl-fetch-templates/data/templates.json`

### `ghl-services/ghl-update-template/view-content`

Purpose: resolve a template and inspect its preview HTML.

What it does:
- selects a template by `--template-id` or `--template-name`
- falls back to the current default template name when no selector is passed
- fetches preview HTML from the template's `previewUrl`
- writes preview artifacts under `ghl-services/ghl-update-template/view-content/previews/`
- returns both raw HTML and a lightweight structural summary

### `ghl-services/ghl-update-template/clone-content`

Purpose: turn a selected template into a fresh editable draft.

What it does:
- reuses template selection from `view-content`
- fetches the source preview HTML
- creates a new draft shell with `POST /emails/builder`
- pushes HTML into that draft with `POST /emails/builder/data`
- exposes a standalone clone CLI
- includes `publish-injected-draft.mjs`, which clones a draft and then publishes injected HTML into it

### `ghl-services/ghl-update-template/inject-content`

Purpose: create a local injected HTML artifact from a saved preview file.

What it does today:
- reads a local preview HTML file
- requires exactly one `[[[NEWSLETTER_BODY_SLOT]]]` token
- replaces that token with one bundled sample newsletter block
- writes an injected artifact under `ghl-services/ghl-update-template/inject-content/injection-output/`
- does not call the GHL API directly

## Example Workflow

A realistic developer workflow today looks like this:

### 1. Verify auth

```bash
npm --prefix ghl-email-services-toolkit/ghl-services/authentication-ghl run check:connection
```

### 2. Fetch template inventory

```bash
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-fetch-templates run fetch:templates
```

### 3. Select a template or inspect it by ID/name

```bash
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content run view:template -- --template-name="Weekly Newsletter"
```

Or:

```bash
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content run view:template -- --template-id="template_123"
```

### 4. Download preview HTML

```bash
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id="template_123"
```

### 5. Inject newsletter HTML locally

```bash
node ghl-email-services-toolkit/ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html
```

### 6. Publish through the wrapper

```bash
node ghl-email-services-toolkit/ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs --template-id="template_123" --draft-name="Newsletter Draft"
```

If you only want the cloned draft without the publish-wrapper step:

```bash
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/clone-content run clone:template -- --template-id="template_123" --draft-name="Newsletter Draft"
```

## Design Principles

This toolkit follows a few clear constraints:

- Modular stages instead of one opaque script
- API-first approach rather than UI automation
- JSON outputs that are easy to inspect and automate against
- Narrow package boundaries with explicit responsibilities
- Reusable intermediate artifacts such as template snapshots, preview HTML, and injected HTML
- Honest separation between what is implemented now and what is still planned

A key design choice is that the repo does not try to fake full builder-level control when the public API surface does not cleanly expose that path. The current implementation works with the HTML/preview layer because that is the practical path the code can support today.

## Limitations

Current limitations are important if you plan to build on this repo:

- No structured multi-block newsletter schema yet
- No support for the planned 10 ordered newsletter blocks
- No final heading/body/image/CTA rendering contract yet
- No campaign sending or broader CRM automation layer
- No direct publish command inside `inject-content`
- No single root-level command that runs the full workflow
- Injection relies on preview HTML and slot replacement, not full builder JSON
- Publish wrapper selects the newest injected artifact on disk, which can be fragile in multi-run environments
- Generated artifacts are written inside the repository tree

## Roadmap

Based on the current implementation and product direction, the next practical steps are:

- Add a structured newsletter schema for ordered content blocks
- Implement validation for CTA links, image handling, and content shape
- Separate rendering from injection so newsletter generation becomes composable
- Replace the single sample block flow with a real injection engine
- Add an orchestration CLI for the full auth-to-publish workflow
- Improve publish controls so callers can target an explicit injected artifact

## Who This Is For

This toolkit is best suited for:

- Internal dev teams automating repeat newsletter production
- Builders creating GHL-based content automation pipelines
- GHL power users who want a scriptable workflow instead of repetitive UI work

It is a good fit if you want a real MVP you can inspect, extend, and automate around.

It is not yet a complete newsletter platform.

## Setup Notes

Runtime requirements:
- Node.js 20+
- npm
- a GoHighLevel private integration token
- a GoHighLevel location ID

Shared env file:

```bash
ghl-email-services-toolkit/ghl-services/authentication-ghl/.env
```

Expected variables:

```bash
GHL_PRIVATE_INTEGRATION_TOKEN=your_token_here
GHL_LOCATION_ID=your_location_id_here
```

Each package manages its own dependencies, so install dependencies inside the package you want to run.

Root maintenance scripts live in:

```bash
ghl-email-services-toolkit/package.json
```

Those scripts cover validation tasks like `test`, `lint`, `typecheck`, `validate`, and `fix`. They do not provide a full pipeline command.
