<a id="readme-top"></a>

# GHL Email Newsletter Agent

A GoHighLevel email-template toolkit for validating access, fetching template inventory, inspecting templates, downloading preview HTML, injecting a sample newsletter block into a local preview artifact, and cloning or publishing updated drafts through focused CLI packages.

## Table of Contents

- [About The Project](#about-the-project)
  - [Current Status](#current-status)
  - [Built With](#built-with)
- [Repository Layout](#repository-layout)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
- [Usage](#usage)
  - [Recommended Workflow](#recommended-workflow)
  - [Available Commands](#available-commands)
  - [Outputs](#outputs)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)

## About The Project

This repository contains a staged GoHighLevel newsletter workflow. Instead of one monolithic CLI, the implementation is split into small packages that each own a specific step:

1. validate token and location access,
2. fetch template inventory,
3. resolve a template and inspect its preview HTML,
4. inject one local sample newsletter block into a saved preview artifact, and
5. either clone that template into a new HTML draft or publish the newest injected artifact into a freshly cloned draft.

The main code lives in `ghl-email-services-toolkit/`, with package-level scripts and implementation notes inside the toolkit itself.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Current Status

The repository is currently strongest as a practical MVP for **template access, discovery, preview inspection, draft cloning, and publish-wrapper experiments**.

What is working now:

- Authentication checks against the required GoHighLevel endpoints.
- Template inventory fetches saved to local JSON.
- Template selection by exact ID or case-insensitive name.
- Preview HTML download plus lightweight structural analysis.
- Draft cloning through the email builder create/update flow.
- Local newsletter injection using a single explicit `[[[NEWSLETTER_BODY_SLOT]]]` token.
- A publish wrapper that clones a fresh draft and overwrites it with the newest injected HTML artifact on disk.

What is still limited or partial:

- There is **no single top-level CLI** that runs the whole flow end to end.
- The injection step currently supports **one bundled sample block**, not a full multi-block newsletter schema.
- The publish wrapper always chooses the **newest** injected HTML file rather than an explicitly selected artifact path.
- Generated operational artifacts are written inside the repository tree.

### Built With

- Node.js 20+
- TypeScript
- `tsx`
- `dotenv`
- `gts`
- Node's built-in test runner

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Repository Layout

```text
.
├── README.md
└── ghl-email-services-toolkit/
    ├── README.md
    ├── CODEBASE-NOTES.md
    ├── package.json
    ├── ghl-email-endpoints-reference/
    │   ├── templates-fetch.md
    │   ├── create-new-template.md
    │   └── update-template.md
    └── ghl-services/
        ├── authentication-ghl/
        ├── ghl-fetch-templates/
        └── ghl-update-template/
            ├── view-content/
            ├── inject-content/
            └── clone-content/
```

Package responsibilities:

- `authentication-ghl/` — validates token and location access.
- `ghl-fetch-templates/` — fetches and saves template inventory.
- `ghl-update-template/view-content/` — selects templates and downloads preview HTML.
- `ghl-update-template/inject-content/` — performs local single-slot HTML injection.
- `ghl-update-template/clone-content/` — clones templates and provides the publish wrapper.
- `ghl-email-endpoints-reference/` — request-shape and endpoint behavior notes.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A GoHighLevel Private Integration Token
- A GoHighLevel location ID

### Installation

The toolkit uses package-local installs. From the repository root:

```bash
npm --prefix ghl-email-services-toolkit/ghl-services/authentication-ghl install
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-fetch-templates install
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content install
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/clone-content install
npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/inject-content install
```

### Environment Setup

Create the shared env file from the example:

```bash
cp ghl-email-services-toolkit/ghl-services/authentication-ghl/.env.example \
  ghl-email-services-toolkit/ghl-services/authentication-ghl/.env
```

Set at least:

```bash
GHL_PRIVATE_INTEGRATION_TOKEN=your_token_here
GHL_LOCATION_ID=your_location_id_here
```

All implemented packages reuse this shared env contract.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

### Recommended Workflow

1. **Validate authentication and scope**

   ```bash
   npm --prefix ghl-email-services-toolkit/ghl-services/authentication-ghl run check:connection
   ```

2. **Fetch template inventory when you need a fresh snapshot**

   ```bash
   npm --prefix ghl-email-services-toolkit/ghl-services/ghl-fetch-templates run fetch:templates
   ```

3. **Inspect a template by name or ID**

   ```bash
   npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content run view:template -- --template-name="Weekly Newsletter"
   npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content run view:template -- --template-id="template_123"
   ```

4. **Download preview HTML for local review**

   ```bash
   npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content run view:preview-url -- --template-id="template_123"
   ```

5. **Inject the bundled sample newsletter block into a local preview HTML file**

   ```bash
   node ghl-email-services-toolkit/ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html
   ```

6. **Clone a draft or publish the newest injected artifact**

   ```bash
   npm --prefix ghl-email-services-toolkit/ghl-services/ghl-update-template/clone-content run clone:template -- --template-id="template_123" --draft-name="Newsletter Draft"
   node ghl-email-services-toolkit/ghl-services/ghl-update-template/clone-content/publish-injected-draft.mjs --template-id="template_123" --draft-name="Newsletter Draft"
   ```

### Available Commands

From `ghl-email-services-toolkit/` you can also run the cross-package maintenance scripts:

```bash
npm run test
npm run lint
npm run typecheck
npm run validate
npm run fix
```

Notes:

- `validate` runs `typecheck`, `test`, then `lint`.
- Root `typecheck` covers the TypeScript packages.
- `inject-content` participates in `test`, `lint`, and `fix`, but not the root `typecheck` script.

### Outputs

The workflow produces machine-readable JSON plus local artifacts, including:

- `ghl-email-services-toolkit/ghl-services/ghl-fetch-templates/data/templates.json`
- `ghl-email-services-toolkit/ghl-services/ghl-update-template/view-content/previews/`
- `ghl-email-services-toolkit/ghl-services/ghl-update-template/inject-content/injection-output/`

These are operational outputs and should usually stay uncommitted.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- Add a true end-to-end orchestration command for the staged workflow.
- Support structured newsletter input with repeatable ordered blocks.
- Add optional image and CTA handling for newsletter sections.
- Allow explicit selection of which injected HTML artifact should be published.
- Continue refining endpoint reference notes as API behavior becomes clearer.

## Contributing

Contributions that improve documentation clarity, package contracts, and low-risk workflow reliability are welcome.

Before opening a change, it helps to:

1. keep docs aligned with the current implementation,
2. avoid implying a single end-to-end CLI when the workflow is still split by package,
3. avoid committing secrets or generated artifacts, and
4. run the relevant package or root validation commands.

## Acknowledgments

- README structure adapted from [othneildrew/Best-README-Template](https://github.com/othneildrew/Best-README-Template).
- GoHighLevel endpoint notes are documented in `ghl-email-services-toolkit/ghl-email-endpoints-reference/`.
- Additional implementation status and handoff notes live in `ghl-email-services-toolkit/CODEBASE-NOTES.md`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
