# Errors and Retries

## Overview

This document defines the failure policy for the planned Pexels image-sourcing
flow described in this folder.

The guiding rules are:

- fail fast on configuration and auth problems
- retry only temporary transport failures
- use fallback queries for search-quality problems
- keep errors structured and machine-readable

## Error Categories

1. Authentication
2. Rate limit
3. Empty results
4. Malformed response
5. Network
6. Timeout
7. Normalization

## Authentication

Examples:

- missing API key
- invalid API key
- revoked API key

Response:

- `401 Unauthorized`

Policy:

- do not retry
- stop immediately
- return structured auth error context

## Rate Limit

Examples:

- hourly limit exceeded
- monthly quota exhausted

Response:

- `429 Too Many Requests`

Policy:

- do not immediate-retry
- log `X-Ratelimit-Limit`, `X-Ratelimit-Remaining`, and
  `X-Ratelimit-Reset` when present
- stop the current run and surface the rate-limit state

## Empty Results

Examples:

- query too narrow
- query wording poorly matched to available photos

Response:

- `200 OK` with an empty or unusable candidate set

Policy:

- advance through the slot's bounded fallback query chain
- stop once all fallback queries are exhausted

## Malformed Response

Examples:

- missing `photos`
- unexpected response shape
- photo objects missing required structures

Policy:

- validate before selection
- retry once only if the failure appears transient
- fail clearly if the issue persists

## Network

Examples:

- connection reset
- DNS failure
- temporary connectivity issue

Policy:

- retry with backoff
- maximum `2` retries

Backoff:

- retry 1: `500ms`
- retry 2: `1000ms`

## Timeout

Examples:

- slow upstream response
- client timeout exceeded

Policy:

- retry with backoff
- maximum `2` retries

## Normalization

Examples:

- no usable source URL
- invalid or missing required fields
- selected candidate cannot satisfy the normalized contract

Policy:

- do not retry the same candidate
- move to the next ranked candidate
- fail only when no valid candidate remains

## Retry Matrix

| Error type | Retry | Strategy |
| --- | --- | --- |
| Authentication (`401`) | No | Fail immediately |
| Rate limit (`429`) | No | Stop and wait for reset window |
| Empty results | Yes | Use fallback queries |
| Malformed response | Once | Retry once, then fail |
| Network | Yes | Backoff, max 2 |
| Timeout | Yes | Backoff, max 2 |
| Normalization | No | Reject candidate, use next |

## Logging Contract

Errors should include enough context for machine parsing and debugging.

Recommended fields:

- `provider`
- `category`
- `slot`
- `query`
- `attempt`
- `status`
- `retryable`
- `action`
- `reason`

Example:

```json
{
  "provider": "pexels",
  "category": "rate_limit",
  "slot": "hero",
  "query": "new york city housing",
  "attempt": 1,
  "status": 429,
  "retryable": false,
  "action": "stop",
  "reason": "rate_limited"
}
```

## Recommended Error Type

```ts
export type PexelsError = {
  provider: "pexels";
  category:
    | "auth"
    | "rate_limit"
    | "empty_results"
    | "malformed_response"
    | "network"
    | "timeout"
    | "normalization";
  message: string;
  query?: string;
  slot?: "hero" | "secondary";
  retryable: boolean;
};
```

## Summary

This folder's failure policy is intentionally narrow: stop on auth and
rate-limit failures, retry only bounded transport problems, and use fallback
queries or next-ranked candidates for search and normalization failures.
