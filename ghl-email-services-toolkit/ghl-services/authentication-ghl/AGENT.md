# AGENT.md

## Purpose
Service for validating GoHighLevel connectivity and account scope before downstream operations.

## How An Agent Should Use This Package
- Start here when any downstream service reports auth, permission, or location problems.
- Treat a failing auth result as a hard blocker for fetch, view, clone, or publish work.
- Keep this package focused on connectivity diagnostics, not business logic.

## Entry Points
- `src/checkGhlConnection.ts`: core logic.
- `src/check-connection.cli.ts`: CLI wrapper.

## Inputs / Outputs / Contracts
- Inputs:
  - `GHL_PRIVATE_INTEGRATION_TOKEN`
  - `GHL_LOCATION_ID`
- Outputs:
  - structured JSON diagnostics
  - per-probe status codes and response snippets
  - `errorCode` values for missing env, auth failure, location scope failure, or network failure

## Command
- `npm run check:connection`

## Behavior Summary
- Runs two probes with `locationId` query:
  - `GET /emails/builder`
  - `GET /users/`
- Returns structured diagnostics, status codes, and response snippets.
- Uses a 12s timeout per probe.

## Error Codes
- `MISSING_TOKEN`
- `MISSING_LOCATION_ID`
- `AUTH_FAILED`
- `LOCATION_SCOPE_FAILED`
- `NETWORK_ERROR`
- `UNKNOWN_ERROR`

## Output Contract
- `ok` indicates whether both probes passed.
- `checks.emailBuilder` and `checks.users` include per-endpoint result details.
- `timestamp` is ISO UTC for traceability.

## Test Contract
- Automated tests use Node's built-in test runner.
- Primary coverage target: `src/checkGhlConnection.ts`
- Keep CLI testing thin; most coverage belongs at the function boundary.

## References
- Endpoint notes: `../../ghl-email-endpoints-reference/templates-fetch.md`
- Existing test: `./test/checkGhlConnection.test.ts`
- Shared testing guide: `../testing/AGENT.md`

## Routing Rules
- Route any token, location, or permission troubleshooting here first.
- If this service fails, stop and fix auth before editing fetch, view, or update flows.

## Do Not
- Do not add template business logic here.
- Do not write template payload files from this service.

## Example
- `npm --prefix ghl-services/authentication-ghl run check:connection`
