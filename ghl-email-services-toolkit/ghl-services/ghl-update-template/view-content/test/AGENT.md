# AGENT.md

## Purpose
Owns tests for `ghl-update-template/view-content`.

## How An Agent Should Think About These Tests
- Keep selection and preview-fetch assertions separate.
- Model ordered fetch behavior explicitly because auth, lookup, and preview fetch share one pipeline.
- Clean up generated preview files immediately.

## Inputs / Outputs / Contracts
- Inputs:
  - env values set in-process
  - mocked `global.fetch` responses
- Outputs:
  - assertions over selection summaries, pagination behavior, and preview file output

## Coverage Focus
- Template selection by id and name
- Search fallback behavior and not-found cases
- Preview URL validation, fetch behavior, and preview file output

## Constraints And Rules
- Keep preview HTML fixtures minimal.
- Do not rely on existing files in `previews/`.
- When testing selection behavior, assert both chosen template data and summary counts.

## Example Command
- `npm --prefix ghl-services/ghl-update-template/view-content test`
