# AGENT.md

## Purpose

Service for selecting a target template and optionally fetching and saving
preview HTML for analysis.

## How An Agent Should Use This Package

- Use this package when the task is "find the right template" or "inspect
  preview HTML".
- Keep this package read-only with respect to the GHL template lifecycle.
- Treat preview HTML as analysis input and future render context, not as final
  publish state.

## Entry Points

- `src/viewTemplate.ts`: selection flow by template name or template id.
- `src/viewPreviewUrl.ts`: preview URL fetch and HTML dump.
- `src/view-template.cli.ts`: CLI for selection output.
- `src/view-preview-url.cli.ts`: CLI for preview fetch and file save.

## Commands

- `npm run view:template -- --template-name=<name>`
- `npm run view:template -- --template-id=<id>`
- `npm run view:preview-url -- --template-name=<name>`
- `npm run view:preview-url -- --template-id=<id>`

## Inputs / Outputs / Contracts

- Inputs:
  - shared env from `authentication-ghl/.env`
  - optional `templateName`
  - optional `templateId`
- Outputs:
  - selected template summary
  - optional preview dump payload
  - preview HTML file under `previews/`
  - structured preview information useful for slot validation and future render
    planning

## Defaults

- If no selector is provided, defaults to template name `nycpolicyscopebase`.

## Behavior Summary

- Validates auth, token, and location before template queries.
- Fetches builders from `GET /emails/builder` with `limit=100`.
- Supports case-insensitive name match and exact id match.
- If preview flow succeeds, saves HTML under `previews/<templateId>-<timestamp>.html`.
- Extracts structural body/asset information that can help future final-render
  planning.

## Output Direction

This package should feed:

- current clone flow
- future render planning in `inject-content`
- future slot-validation or preview-shape analysis before research/image
  injection work

## Error Codes (Selection)

- `AUTH_CHECK_FAILED`
- `MISSING_TOKEN`
- `MISSING_LOCATION_ID`
- `FETCH_400`
- `FETCH_401`
- `FETCH_404`
- `FETCH_422`
- `FETCH_FAILED`
- `NETWORK_ERROR`
- `TEMPLATE_NOT_FOUND`
- `UNKNOWN_ERROR`

## Error Codes (Preview)

- `SELECTION_FAILED`
- `MISSING_PREVIEW_URL`
- `INVALID_PREVIEW_URL`
- `PREVIEW_FETCH_HTTP_ERROR`
- `PREVIEW_FETCH_NETWORK_ERROR`
- `PARSE_ERROR`
- `WRITE_ERROR`
- `UNKNOWN_ERROR`

## Test Contract

- Automated tests use Node's built-in test runner.
- Primary coverage targets:
  - `src/viewTemplate.ts`
  - `src/viewPreviewUrl.ts`
- Keep CLI testing thin; most assertions belong on the exported functions.

## References

- Package sources:
  - `./src/viewTemplate.ts`
  - `./src/viewPreviewUrl.ts`
- Existing tests:
  - `./test/viewTemplate.test.ts`
  - `./test/viewPreviewUrl.test.ts`
- Shared testing guide: `../../testing/AGENT.md`
- Endpoint notes:
  - `../../../ghl-email-endpoints-reference/templates-fetch.md`
  - `../../../ghl-email-endpoints-reference/update-template.md`

## Routing Rules

- Route template lookup and validation tasks here.
- Route preview HTML retrieval and preview-structure inspection here.
- Do not implement create or update API mutations in this folder.

## Example

- `npm --prefix ghl-services/ghl-update-template/view-content run view:preview-url -- --template-name="Weekly Update"`
