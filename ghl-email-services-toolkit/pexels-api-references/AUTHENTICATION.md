# Pexels API Authentication

## Overview

All Pexels API requests require an API key sent in the `Authorization` header.
This folder treats missing or invalid credentials as a fail-fast configuration
error.

## Required Environment Variable

```env
PEXELS_API_KEY=your_api_key_here
```

The key should be stored in environment configuration, never hardcoded in
source files.

## Request Contract

Every request must include:

```http
Authorization: YOUR_API_KEY
```

Example:

```http
GET https://api.pexels.com/v1/search?query=new%20york%20city
Authorization: YOUR_API_KEY
```

## Validation Rules

- The key must exist before any request is attempted.
- The client should fail fast if `PEXELS_API_KEY` is missing.
- Search fallbacks do not apply when authentication is invalid.

## Example Client Setup

```ts
import axios from "axios";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  throw new Error("PEXELS_API_KEY is not defined");
}

export const pexelsClient = axios.create({
  baseURL: "https://api.pexels.com/v1",
  headers: {
    Authorization: PEXELS_API_KEY,
  },
});
```

## Failure Policy

Common auth failures:

- missing API key
- invalid API key
- revoked API key

Expected response:

- `401 Unauthorized`

Expected handling:

- stop the request immediately
- log clear auth context without exposing the key
- return a structured error to the caller
- do not retry automatically

## Rate-Limit Headers

Pexels responses may include:

- `X-Ratelimit-Limit`
- `X-Ratelimit-Remaining`
- `X-Ratelimit-Reset`

These headers are useful for diagnostics, but they do not change the auth
policy above.

## Security Notes

- Never commit secrets.
- Never log raw API keys.
- Rotate the key if exposure is suspected.
- Restrict access to environments that hold the key.

## Summary

Authentication for this folder is intentionally simple: one API key in one
header, with fail-fast handling for any missing or invalid credential state.
