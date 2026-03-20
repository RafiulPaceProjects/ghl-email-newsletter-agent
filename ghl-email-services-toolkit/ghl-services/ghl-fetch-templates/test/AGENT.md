# AGENT.md

## Purpose
Owns tests for `ghl-fetch-templates`.

## Coverage Focus
- Auth-gated fetch behavior.
- Response parsing and `templateCount` derivation.
- Snapshot file writing and failure handling.

## Test Style
- Test exported fetch helpers instead of the CLI by default.
- Mock the auth probes and template fetch sequence through `global.fetch`.
- Preserve and restore `data/templates.json` when a test touches it.

## Guardrails
- Never leave modified snapshot data behind.
- Keep fixture payloads small but representative.
- Assert both result metadata and persistence side effects when relevant.

## Validation
- `npm run fix`
- `npm run typecheck`
- `npm test`
- `npm run lint`
