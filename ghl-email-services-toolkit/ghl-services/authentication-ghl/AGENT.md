# AGENT.md

## Purpose
Service for validating GoHighLevel connectivity and account scope before downstream operations.

## Current Status
Implemented and active.

## Primary Entry Points
- src/checkGhlConnection.ts: core logic.
- src/check-connection.cli.ts: CLI wrapper.

## Command
- npm run check:connection

## Required Environment
- GHL_PRIVATE_INTEGRATION_TOKEN
- GHL_LOCATION_ID

## Behavior Summary
- Runs two probes with locationId query:
  - GET /emails/builder
  - GET /users/
- Returns structured diagnostics, status codes, and response snippets.
- Uses 12s timeout per probe.

## Error Codes
- MISSING_TOKEN
- MISSING_LOCATION_ID
- AUTH_FAILED
- LOCATION_SCOPE_FAILED
- NETWORK_ERROR
- UNKNOWN_ERROR

## Output Contract
- ok boolean indicates both probes passed.
- checks.emailBuilder and checks.users include per-endpoint result details.
- timestamp is ISO UTC for traceability.

## Routing Rules
- Route any token/location/permission troubleshooting here first.
- If this service fails, stop and fix auth before editing fetch/view/update flows.

## Do Not
- Do not add template business logic here.
- Do not write template payload files from this service.
