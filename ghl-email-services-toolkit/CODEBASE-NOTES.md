# CODEBASE-NOTES

This document summarizes how the toolkit currently works and records documentation changes made for agent routing.

## Implementation Summary

### 1) authentication-ghl
- Purpose: verifies API connectivity and location scope.
- Probe endpoints: /emails/builder and /users/.
- Returns detailed JSON diagnostics with status and response snippet.
- Failure here should block downstream operations.

### 2) ghl-fetch-templates
- Purpose: fetches templates from /emails/builder and saves snapshot.
- Depends on authentication-ghl check before request execution.
- Output file: ghl-services/ghl-fetch-templates/data/templates.json.

### 3) ghl-update-template/view-content
- Purpose: finds templates by id or name and returns selected template summary.
- Default template name when not provided: nycpolicyscopebase.
- Also supports preview retrieval via previewUrl and writes HTML to previews directory.

### 4) ghl-update-template/clone-content
- Implemented clone step. Selects a base template, fetches preview HTML,
  creates a new draft with POST /emails/builder, and pushes the fetched HTML
  into that draft with POST /emails/builder/data.

### 5) ghl-update-template/inject-content
- Planned only. Intended for POST /emails/builder/data.

## Shared Runtime Conventions
- Node >= 20, TypeScript ESM.
- CLI outputs structured JSON and sets exit codes.
- Shared auth env loaded from authentication-ghl/.env.
- API header Version set to 2021-07-28.

## Documentation Changes Added (This Implementation)
The following AGENT.md files were created:
- AGENT.md
- ghl-email-endpoints-reference/AGENT.md
- ghl-services/AGENT.md
- ghl-services/authentication-ghl/AGENT.md
- ghl-services/ghl-fetch-templates/AGENT.md
- ghl-services/ghl-update-template/AGENT.md
- ghl-services/ghl-update-template/view-content/AGENT.md
- ghl-services/ghl-update-template/clone-content/AGENT.md
- ghl-services/ghl-update-template/inject-content/AGENT.md

## Notes for Repository Publish
- Proposed repository name: ghl-email-newsletter-agent.
- Current working folder name is ghl-email-agent.
- No git repository was detected at toolkit root during earlier checks, so initialize git at ghl-email-agent before first push.
