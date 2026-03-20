# AGENT.md

## Purpose
Service for fetching email-template metadata from GoHighLevel and saving a local JSON snapshot.

## Current Status
Implemented and active.

## Primary Entry Points
- src/fetchTemplates.ts: fetch + save workflow.
- src/fetch-templates.cli.ts: CLI wrapper.

## Command
- npm run fetch:templates

## Dependencies
- Imports and runs checkGhlConnectionFromEnv from authentication-ghl.
- Loads shared env from authentication-ghl/.env.

## Behavior Summary
- Validates auth first; aborts fetch if auth fails.
- Calls GET /emails/builder with locationId.
- Parses JSON response safely.
- Derives templateCount from builders[] or templates[].
- Writes snapshot to data/templates.json when successful.

## Error Codes
- AUTH_CHECK_FAILED
- MISSING_TOKEN
- MISSING_LOCATION_ID
- FETCH_FAILED
- NETWORK_ERROR
- WRITE_ERROR
- UNKNOWN_ERROR

## Output Contract
- Returns ok, fetchedAt, locationId, endpoint, status, templateCount, diagnostics, auth.
- On successful save, returns outputPath and fileWritten=true.

## Routing Rules
- Route all "pull latest template inventory" tasks here.
- If user needs one specific template with richer metadata, hand off to view-content.

## Do Not
- Do not perform template update/create operations here.
- Do not assume this snapshot is always fresh; rerun command when needed.
