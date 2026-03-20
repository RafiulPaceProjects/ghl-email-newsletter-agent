# Pexels Image Sourcing References

## Overview

This folder documents the planned Pexels image-sourcing boundary for the
newsletter pipeline. It is a reference/spec set for a future execution module,
not an implemented runtime service in this repository today.

The documented contract covers this boundary:

```text
query -> search -> selection -> normalization -> ghl-media-usage handoff
```

The next downstream stage after this folder is the planned
`ghl-services/ghl-media-usage` module, which should upload approved images to
GHL and resolve final hosted image links before render.

## Mode 1 Scope

Mode 1 is intentionally narrow:

- exactly 2 image slots per issue
- slot order is `Hero` then `Secondary`
- photos only; no video, curated, or collections endpoints
- first-page search results only
- bounded fallback queries only when needed

This folder does not define GHL upload behavior, storage lifecycle, template
rendering, or newsletter HTML injection.

## Responsibilities

The Pexels module spec is responsible for:

1. Building deterministic query chains for each slot.
2. Calling `GET https://api.pexels.com/v1/search`.
3. Collecting a small candidate set from page 1 only.
4. Ranking and selecting one image for `Hero` and one for `Secondary`.
5. Normalizing the selected images into a stable internal schema.
6. Returning contract-safe output for `ghl-media-usage`.

## Downstream Contract

The output from this boundary should be:

- normalized image selections
- never raw Pexels payloads as the downstream interface

The next documented handoff is:

```text
pexels normalized selections -> ghl-media-usage -> rich GHL image objects -> inject-content final render
```

## Pexels API Facts Used By This Folder

- Base URL for photo endpoints: `https://api.pexels.com/v1/`
- Search endpoint: `GET /search`
- Authentication: `Authorization` header with a Pexels API key
- `per_page` default: `15`
- `per_page` max: `80`
- Default rate limit: `200` requests/hour and `20,000` requests/month

## Attribution Expectations

Pexels requires visible attribution in the product flow using the API. The
official guidance is to link back to Pexels prominently and credit the
photographer when possible.

This folder treats attribution as data that should survive into downstream
contracts so GHL-hosted image objects still carry enough metadata for final
render decisions.

## Design Principles

- Deterministic behavior over heuristic randomness.
- Minimal API usage over broad fetching.
- Editorial fit over generic stock imagery.
- Normalized output over raw-provider coupling.
- Clear failure behavior over silent fallbacks.

## Documentation Map

- `AUTHENTICATION.md`: API key handling and fail-fast auth rules
- `SEARCH_API.md`: request parameters, defaults, and response expectations
- `QUERY.md`: query-building and fallback-chain rules
- `IMAGE_SELECTION.md`: ranking, rejection, and slot-fit expectations
- `IMAGE_SLOTS.md`: `Hero` and `Secondary` slot definitions
- `NORMALIZATION.md`: normalized output contract and field mapping
- `ERROR_AND_RETRIES.md`: retry boundaries and machine-readable failure policy
- `AGENTS.md`: agent-facing routing and operating contract for this folder

## Summary

Use this folder as the contract for a future Pexels sourcing module. For Mode 1
it is intentionally limited to two slot-specific photo selections whose output
should feed `ghl-media-usage`, then final render.
