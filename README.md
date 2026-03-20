# GHL Email Newsletter Agent

A small TypeScript toolkit for working with GoHighLevel email templates from the command line.

This repository is focused on a practical newsletter workflow:

1. verify that your GoHighLevel credentials and location access work,
2. fetch the templates available in a location,
3. inspect a specific template by name or ID, and
4. download that template's preview HTML for analysis or downstream processing.

At the moment, the repository is strongest on **read / inspect** workflows. The create and update endpoint notes are included as reference material, while some write-oriented implementation folders are still planned rather than complete.

## What this repo includes

The main toolkit lives in `ghl-email-services-toolkit/` and is split into two parts:

- **`ghl-email-endpoints-reference/`** — markdown notes describing the relevant GoHighLevel email template endpoints.
- **`ghl-services/`** — executable TypeScript services and CLI entry points.

### Implemented services

- **Authentication check**
  - Validates that the configured token and location can reach the expected GoHighLevel endpoints.
- **Fetch templates**
  - Pulls template metadata from the email builder API.
  - Saves a JSON snapshot locally for reuse.
- **View template**
  - Finds a template by ID or exact name match.
  - Returns a concise summary of the selected template.
- **View preview URL**
  - Fetches the selected template's preview HTML.
  - Saves the HTML locally for review.

### Planned / partial areas

The repository also contains folders for cloning template content and injecting newsletter content, but those are not yet full production-ready services. Treat them as work-in-progress until their implementation is completed.

## Repository structure

```text
.
├── README.md
└── ghl-email-services-toolkit/
    ├── ghl-email-endpoints-reference/
    │   ├── templates-fetch.md
    │   ├── create-new-template.md
    │   └── update-template.md
    └── ghl-services/
        ├── authentication-ghl/
        ├── ghl-fetch-templates/
        └── ghl-update-template/
            ├── view-content/
            ├── clone-content/       # planned
            └── inject-content/      # planned
```

## Requirements

- **Node.js 20+**
- npm
- A valid **GoHighLevel Private Integration Token** with access to the relevant location
- A valid **GoHighLevel location ID**

## Environment setup

The services share environment values from:

```text
ghl-email-services-toolkit/ghl-services/authentication-ghl/.env
```

Create that file with at least:

```bash
GHL_PRIVATE_INTEGRATION_TOKEN=your_token_here
GHL_LOCATION_ID=your_location_id_here
```

## Install dependencies

Each service is an independent Node package, so install dependencies inside the package you want to run.

### 1) Authentication service

```bash
cd ghl-email-services-toolkit/ghl-services/authentication-ghl
npm install
```

### 2) Template fetch service

```bash
cd ghl-email-services-toolkit/ghl-services/ghl-fetch-templates
npm install
```

### 3) Template view / preview service

```bash
cd ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content
npm install
```

## Quick start

A typical workflow looks like this.

### Step 1: Verify connectivity

```bash
cd ghl-email-services-toolkit/ghl-services/authentication-ghl
npm run check:connection
```

Expected behavior:

- prints structured JSON,
- returns exit code `0` on success,
- returns exit code `1` when authentication, scope, location, or network checks fail.

### Step 2: Fetch templates for the location

```bash
cd ../ghl-fetch-templates
npm run fetch:templates
```

This command:

- reuses the shared `.env` file,
- checks authentication before attempting the fetch,
- calls the GoHighLevel email builder endpoint, and
- writes a snapshot to:

```text
ghl-email-services-toolkit/ghl-services/ghl-fetch-templates/data/templates.json
```

### Step 3: View a specific template

By name:

```bash
cd ../ghl-update-template/view-content
npm run view:template -- --template-name "Weekly Newsletter"
```

By ID:

```bash
npm run view:template -- --template-id "template_123"
```

Notes:

- Name matching is exact after trimming and lowercasing.
- If you do not pass a name or ID, the service falls back to its current default template name.

### Step 4: Download preview HTML

By name:

```bash
npm run view:preview-url -- --template-name "Weekly Newsletter"
```

By ID:

```bash
npm run view:preview-url -- --template-id "template_123"
```

This command saves the fetched HTML into:

```text
ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content/previews/
```

## Available commands

### `authentication-ghl`

```bash
npm run check:connection
npm run typecheck
```

### `ghl-fetch-templates`

```bash
npm run fetch:templates
npm run typecheck
```

### `ghl-update-template/view-content`

```bash
npm run view:template -- --template-name "..."
npm run view:template -- --template-id "..."
npm run view:preview-url -- --template-name "..."
npm run view:preview-url -- --template-id "..."
npm run typecheck
```

## Output behavior

All implemented CLIs return structured JSON so they are easy to:

- inspect manually,
- pipe into logs,
- parse in scripts, or
- use in automation.

Common response fields include:

- `ok`
- `message`
- status and diagnostic details
- location information
- selected template information when applicable
- error codes on failure

## Endpoint reference docs

If you need API context while building on top of this repo, start here:

- `ghl-email-services-toolkit/ghl-email-endpoints-reference/templates-fetch.md`
- `ghl-email-services-toolkit/ghl-email-endpoints-reference/create-new-template.md`
- `ghl-email-services-toolkit/ghl-email-endpoints-reference/update-template.md`

These notes summarize the intended GoHighLevel email-template workflow and known limitations of the publicly exposed endpoints.

## Current limitations

- The repository currently emphasizes **template discovery and inspection**, not full end-to-end template authoring.
- Publicly accessible template APIs appear to expose metadata and preview-oriented workflows more clearly than full builder-content retrieval.
- Create/update write flows are documented, but parts of the implementation are still planned.
- Each service manages its own dependencies, so there is no single workspace-level install command yet.

## Recommended usage pattern

If you are using this repo to support a newsletter pipeline, the safest order is:

1. run the authentication check,
2. fetch templates,
3. select the right template by ID or exact name,
4. pull preview HTML for validation or analysis,
5. add creation/update automation only after you have confirmed the exact payloads you need.

## Future improvements

Good next steps for this repository would be:

- add a top-level workspace package or task runner,
- include a root `.env.example`,
- finish the clone/inject/update implementation path,
- add automated tests for CLI contracts and API error handling,
- document known-good request payloads for template creation and update.
