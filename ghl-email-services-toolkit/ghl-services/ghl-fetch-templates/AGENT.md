# AGENT.md

## Purpose
Service for fetching email-template metadata from GoHighLevel and saving a local JSON snapshot.

## How An Agent Should Use This Package
- Use this package for inventory snapshots, not for selecting one final template.
- Expect auth validation to happen before the live fetch.
- Treat the saved JSON file as an operational snapshot, not durable truth.

## Entry Points
- `src/fetchTemplates.ts`: fetch and save workflow.
- `src/fetch-templates.cli.ts`: CLI wrapper.

## Inputs / Outputs / Contracts
- Inputs:
  - shared env from `authentication-ghl/.env`
  - valid token and location id
- Outputs:
  - structured JSON fetch result
  - optional `data/templates.json` snapshot

## Command
- `npm run fetch:templates`

## Dependencies
- Imports and runs `checkGhlConnectionFromEnv` from `authentication-ghl`.
- Loads shared env from `authentication-ghl/.env`.

## Behavior Summary
- Validates auth first and aborts fetch if auth fails.
- Calls `GET /emails/builder` with `locationId`.
- Parses JSON response safely.
- Derives `templateCount` from `builders[]` or `templates[]`.
- Writes snapshot to `data/templates.json` when successful.

## Error Codes
- `AUTH_CHECK_FAILED`
- `MISSING_TOKEN`
- `MISSING_LOCATION_ID`
- `FETCH_FAILED`
- `NETWORK_ERROR`
- `UNKNOWN_ERROR`

## Output Contract
- Returns `ok`, `fetchedAt`, `locationId`, `endpoint`, `status`, `templateCount`, `diagnostics`, and `auth`.
- On successful save, returns `outputPath` and `fileWritten=true`.

## Test Contract
- Automated tests use Node's built-in test runner.
- Primary coverage target: `src/fetchTemplates.ts`
- Keep CLI testing thin; most assertions belong on the exported functions.

## References
- Endpoint notes: `../../ghl-email-endpoints-reference/templates-fetch.md`
- Existing test: `./test/fetchTemplates.test.ts`
- Shared testing guide: `../testing/AGENT.md`

## Routing Rules
- Route all "pull latest template inventory" tasks here.
- If a user needs one specific template with richer metadata, hand off to `view-content`.

## Do Not
- Do not perform template update or create operations here.
- Do not assume this snapshot is always fresh; rerun the command when needed.

## Example
- `npm --prefix ghl-services/ghl-fetch-templates run fetch:templates`
