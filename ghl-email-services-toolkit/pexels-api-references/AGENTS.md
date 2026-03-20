# AGENTS.md

## Purpose

This folder is the agent-facing reference contract for the planned Pexels
image-sourcing module used by the newsletter pipeline.

Important repo reality:

- this folder is a reference/spec boundary
- it does not represent a fully implemented executable service in this repo
- docs here should describe expected behavior and stable contracts, not invent
  runtime features elsewhere in the repository

## System Position

- Upstream input: newsletter topic or story context
- This module boundary: query, search, selection, normalization
- Downstream handoff: normalized image metadata for upload or rendering systems

Mode 1 scope is fixed:

- exactly 2 slots
- `Hero` first
- `Secondary` second
- photos only

## Core Responsibilities

This folder's contract says the Pexels module should:

- build deterministic query chains per slot
- call the Pexels photo search endpoint efficiently
- gather candidate images from bounded page-1 searches
- rank candidates for editorial fit and slot fit
- normalize selected images into a stable internal schema
- return machine-safe, downstream-ready normalized output

This folder's contract says the Pexels module should not:

- upload files to GHL
- manage template rendering or HTML injection
- define storage retention policy
- expose raw Pexels payloads as the downstream interface
- expand beyond Mode 1 without explicit design changes

## Documentation Map

Read in this order for a new session:

1. `README.md`
2. `AUTHENTICATION.md`
3. `SEARCH_API.md`
4. `QUERY.md`
5. `IMAGE_SELECTION.md`
6. `IMAGE_SLOTS.md`
7. `NORMALIZATION.md`
8. `ERROR_AND_RETRIES.md`

Use these combinations by task:

- auth or API key issues: `AUTHENTICATION.md`
- request shape or endpoint defaults: `SEARCH_API.md`
- retrieval relevance or fallback tuning: `QUERY.md`
- ranking or editorial-fit changes: `IMAGE_SELECTION.md`
- slot-specific behavior: `IMAGE_SLOTS.md`
- output contract work: `NORMALIZATION.md`
- retry and failure policy: `ERROR_AND_RETRIES.md`

## Operating Model

Expected pipeline:

```text
query -> search -> candidates -> selection -> normalization -> output
```

Expected order of operations:

1. Build a slot-specific query chain.
2. Search page 1 with Mode 1 defaults.
3. Validate the response and collect candidates.
4. Rank candidates deterministically.
5. Select one `Hero` image and one `Secondary` image.
6. Normalize the selected images before any downstream use.
7. Return normalized output or a structured error.

## Non-Negotiable Rules

- Do not bypass normalization.
- Do not return raw Pexels response objects as the downstream contract.
- Do not add randomness to query generation, scoring, or tie-breaks.
- Do not paginate beyond page 1 in Mode 1.
- Do not keep retrying `401` or `429` responses.
- Do not expand slot count without explicit doc updates across this folder.

## Consistency Rules

Treat the following as source-of-truth expectations across the folder:

- authentication uses the `Authorization` header
- photo search uses `GET https://api.pexels.com/v1/search`
- `Hero` and `Secondary` both prefer `src.landscape`
- fallback source priority is `src.large2x`, then `src.large`
- fallback queries are bounded and deterministic
- downstream consumers depend on normalized output fields such as `pexelsUrl`,
  `source.preferred`, and `variants.*`

## Attribution And Limits

Keep documentation aligned with current official Pexels guidance:

- attribution back to Pexels should be visible in the consuming product flow
- photographers should be credited when possible
- default rate limits are `200/hour` and `20,000/month`

If official Pexels docs change, update this folder to match the current
provider contract.

## Error Handling Expectations

Follow `ERROR_AND_RETRIES.md` as the failure-policy source of truth.

High-level rules:

- `401`: fail fast, do not retry
- `429`: surface rate-limit state, do not immediate-retry
- empty results: advance through the bounded fallback query chain
- network or timeout failures: bounded retry with backoff
- normalization failures: reject the candidate and continue with the next one

Always return machine-readable error context when the contract cannot be
satisfied.

## Summary

This folder should be treated as a deterministic, contract-first design
boundary for Mode 1 Pexels sourcing. Keep it narrow, reproducible, and aligned
with the actual supporting docs in this folder and the official Pexels API
documentation.
