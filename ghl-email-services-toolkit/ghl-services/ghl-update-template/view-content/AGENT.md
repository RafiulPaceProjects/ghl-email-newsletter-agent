# AGENT.md

## Purpose
Service for selecting a target template and optionally fetching/saving preview HTML for analysis.

## Current Status
Implemented and active.

## Primary Entry Points
- src/viewTemplate.ts: selection flow by template name or template id.
- src/viewPreviewUrl.ts: preview URL fetch and HTML dump.
- src/view-template.cli.ts: CLI for selection output.
- src/view-preview-url.cli.ts: CLI for preview fetch and file save.

## Commands
- npm run view:template -- --template-name=<name>
- npm run view:template -- --template-id=<id>
- npm run view:preview-url -- --template-name=<name>
- npm run view:preview-url -- --template-id=<id>

## Defaults
- If no template selector is provided, defaults to template name nycpolicyscopebase.

## Dependencies
- Reuses authentication check from authentication-ghl.
- Uses same shared env values from authentication-ghl/.env.

## Behavior Summary
- Validates auth, token, and location before template queries.
- Fetches builders list from GET /emails/builder with limit=100.
- Supports case-insensitive name match and exact id match.
- If preview flow succeeds, saves HTML under previews/<templateId>-<timestamp>.html.

## Error Codes (Selection)
- AUTH_CHECK_FAILED
- MISSING_TOKEN
- MISSING_LOCATION_ID
- FETCH_400
- FETCH_401
- FETCH_404
- FETCH_422
- FETCH_FAILED
- NETWORK_ERROR
- TEMPLATE_NOT_FOUND
- UNKNOWN_ERROR

## Error Codes (Preview)
- SELECTION_FAILED
- MISSING_PREVIEW_URL
- INVALID_PREVIEW_URL
- PREVIEW_FETCH_HTTP_ERROR
- PREVIEW_FETCH_NETWORK_ERROR
- PARSE_ERROR
- WRITE_ERROR
- UNKNOWN_ERROR

## Output Contract
- Selection returns selectedTemplate summary and diagnostics.
- Preview flow returns outputPath when write succeeds.
- Both CLIs return JSON and set non-zero exit code on failure.

## Routing Rules
- Route template lookup and validation tasks here.
- Route preview HTML retrieval and basic DOM-asset extraction tasks here.
- Do not implement create/update API mutations in this folder.
