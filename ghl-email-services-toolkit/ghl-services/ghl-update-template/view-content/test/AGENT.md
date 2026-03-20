# AGENT.md

## Purpose
Owns tests for `ghl-update-template/view-content`.

## Coverage Focus
- Template selection by id and name.
- Search fallback behavior and not-found cases.
- Preview URL validation, fetch behavior, and preview file output.

## Test Style
- Test `viewSelectedTemplateFromEnv` and `viewPreviewUrlDumpFromEnv` directly.
- Mock multi-step fetch flows in call order.
- Clean up any generated preview files during the test run.

## Guardrails
- Keep preview HTML fixtures minimal.
- Do not rely on existing files in `previews/`.
- When testing selection behavior, assert both chosen template data and summary counts.

## Validation
- `npm run fix`
- `npm run typecheck`
- `npm test`
- `npm run lint`
