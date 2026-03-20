# AGENT.md

## Purpose
Owns tests for `authentication-ghl`.

## How An Agent Should Think About These Tests
- Test the exported function contract before testing the CLI.
- Model network behavior with `global.fetch` mocks only.
- Keep each test focused on one failure mode or one success path.

## Inputs / Outputs / Contracts
- Inputs:
  - env values set in-process
  - mocked fetch responses or thrown errors
- Outputs:
  - assertions over `GhlConnectionResult`
  - no dependency on a real `.env` file

## Coverage Focus
- Missing env handling for token and location
- Probe success and failure behavior
- Error-code mapping for auth, scope, and network cases

## Constraints And Rules
- Restore `process.env` and `global.fetch` after each test.
- Do not call live endpoints.
- Prefer direct assertions on `ok`, `errorCode`, status, and diagnostics.

## Example Command
- `npm --prefix ghl-services/authentication-ghl test`
