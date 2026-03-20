# AGENT.md

## Purpose
Owns tests for `authentication-ghl`.

## Coverage Focus
- Missing env handling for token and location.
- Probe success and failure behavior.
- Error-code mapping for auth, scope, and network cases.

## Test Style
- Test `checkGhlConnectionFromEnv` directly.
- Mock `global.fetch` instead of calling live endpoints.
- Keep assertions centered on structured JSON contract fields.

## Guardrails
- Restore `process.env` and `global.fetch` after each test.
- Do not depend on `.env` file contents.
- Prefer one behavior per test.

## Validation
- `npm run fix`
- `npm run typecheck`
- `npm test`
- `npm run lint`
