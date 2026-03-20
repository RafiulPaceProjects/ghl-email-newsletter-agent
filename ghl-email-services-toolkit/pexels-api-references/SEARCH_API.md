# Pexels Search API

## Overview

Mode 1 uses the Pexels photo search endpoint only. This document describes the
request shape, defaults, and response expectations that the rest of this folder
depends on.

This is a reference contract for planned image sourcing behavior, not proof
that a full runtime client already exists in the repository.

## Endpoint

```http
GET https://api.pexels.com/v1/search
```

Authentication is required through the `Authorization` header described in
`AUTHENTICATION.md`.

## Supported Parameters

Required:

- `query` (`string`)

Optional and relevant to this folder:

- `orientation` (`landscape`, `portrait`, `square`)
- `size` (`large`, `medium`, `small`)
- `page` (`integer`, default `1`)
- `per_page` (`integer`, default `15`, max `80`)

## Mode 1 Defaults

The expected Mode 1 request shape is:

```ts
{
  query: "<slot-specific query>",
  orientation: "landscape",
  size: "large",
  page: 1,
  per_page: 10
}
```

These defaults are folder-level recommendations chosen to keep candidate
quality high while avoiding unnecessary requests.

## Example Request

```http
GET https://api.pexels.com/v1/search?query=new%20york%20city&orientation=landscape&size=large&page=1&per_page=10
Authorization: YOUR_API_KEY
```

## Response Expectations

Expected top-level fields:

```json
{
  "page": 1,
  "per_page": 10,
  "photos": [],
  "total_results": 1000,
  "prev_page": "https://api.pexels.com/v1/search?page=0&...",
  "next_page": "https://api.pexels.com/v1/search?page=2&..."
}
```

Mode 1 depends on:

- `photos`
- `page`
- `per_page`
- `total_results`
- `next_page` only as pagination metadata, not for actual use

## Candidate Handling

For each query:

1. Send one page-1 request.
2. Read the `photos` array.
3. Validate the response shape.
4. Pass valid photo objects to selection logic.

Mode 1 does not paginate beyond page 1.

## Source Variant Guidance

Preferred variant order across this folder:

1. `src.landscape`
2. `src.large2x`
3. `src.large`

Both `Hero` and `Secondary` use the same variant priority. Slot differences are
about editorial fit, not different variant ordering.

## Rate Limits

Current official Pexels guidance says API keys are rate-limited by default to:

- `200` requests per hour
- `20,000` requests per month

If a request is rate-limited:

- treat `429` as a stop condition for the current run
- log rate-limit headers when present
- do not loop retries immediately

## Error Handling Summary

- `401`: invalid or missing auth; stop
- `429`: rate limited; surface state and stop
- empty `photos`: advance through the fallback query chain
- network or timeout failures: retry according to `ERROR_AND_RETRIES.md`
- malformed responses: validate, retry only within policy, then fail clearly

## Summary

This folder uses `GET /v1/search` as a narrow, page-1-only photo retrieval
contract with deterministic defaults and strict downstream normalization.
