# GoHighLevel API — Update a Template

## Overview

This endpoint updates an existing email template in GoHighLevel.

* **Method:** `POST`
* **Path:** `/emails/builder/data`
* **Purpose:** Update a template

---

## Endpoint

```http
POST /emails/builder/data
```

In the HighLevel API docs, this endpoint is listed under **Email → Templates → Update a template**.

---

## Officially Documented Responses

The official documentation lists these response codes for this endpoint:

* `201` — Success
* `400` — Bad Request
* `401` — Unauthorized
* `404` — Not Found
* `422` — Unprocessable Entity

---

## What This Endpoint Is For

Use this endpoint when you want to update the content of an existing email template in your GoHighLevel account.

Typical use cases:

* updating newsletter template content
* replacing existing email body content
* injecting generated HTML into a saved template
* programmatically modifying a draft-like template before later scheduling or sending

---

## Authentication

This endpoint is part of the HighLevel API and uses Bearer-token-based authentication consistent with the rest of the API platform.

Typical header pattern:

```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
Accept: application/json
```

For private/internal builds, this is commonly a **Private Integration Token (PIT)**. For public apps, this is typically an OAuth access token.

---

## Base URL

HighLevel API v2 endpoints use the LeadConnector base domain:

```text
https://services.leadconnectorhq.com
```

So the full request URL is:

```text
https://services.leadconnectorhq.com/emails/builder/data
```

---

## Request Notes

The official endpoint page clearly documents the method, route, and response codes, but the parsed public docs page does **not expose the request schema details in visible text**.

Because of that, you should treat the following as implementation guidance rather than fully confirmed field-level documentation from the visible page:

* this endpoint updates an existing template
* the request will need enough identifying information to target the template being updated
* the request body will need the updated template data/content

When implementing against this endpoint, verify the exact body shape in the live API reference UI or through a successful test request in Postman/cURL.

---

## Error Reference

### `201 Created`

The template update request succeeded.

### `400 Bad Request`

The request was malformed or missing required data.

Possible causes:

* invalid JSON
* missing required fields
* wrong payload format

### `401 Unauthorized`

Authentication failed.

Possible causes:

* missing token
* invalid token
* expired token
* token does not have access to the target resource

### `404 Not Found`

The requested resource could not be found.

Possible causes:

* incorrect endpoint path
* referenced template does not exist
* referenced resource is not available in the account/location context used

### `422 Unprocessable Entity`

The request was understood, but the payload could not be processed.

Possible causes:

* invalid template data structure
* unsupported field values
* incomplete update payload

---

## Recommended Developer Workflow

A practical workflow for using this endpoint in your app:

1. Fetch available email templates.
2. Choose the target template.
3. Generate or inject updated email content.
4. Send the update request to `/emails/builder/data`.
5. Confirm success from the response.
6. Log and handle `400`, `401`, `404`, and `422` separately.

---

## Suggested Error-Handling Strategy

### Handle `400`

Validate your payload before sending.

### Handle `401`

Check token validity, expiration, and scopes.

### Handle `404`

Verify the template identifier and account/location context.

### Handle `422`

Log the payload and compare it against a known-good request.

---

## cURL Skeleton

```bash
curl --request POST \
  --url https://services.leadconnectorhq.com/emails/builder/data \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data '{
    "...": "..."
  }'
```

---

## TypeScript Skeleton

```ts
import axios from "axios";

export async function updateEmailTemplate(payload: Record<string, unknown>) {
  const response = await axios.post(
    "https://services.leadconnectorhq.com/emails/builder/data",
    payload,
    {
      headers: {
        Authorization: `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  return response.data;
}
```

---

## Best Practices

* keep one known-good payload example for testing
* validate request data before calling the API
* separate template selection logic from template update logic
* log full error responses in development
* wrap this endpoint in its own service/module in your codebase

---

## Summary

The GoHighLevel **Update a template** endpoint is:

* **Method:** `POST`
* **Path:** `/emails/builder/data`
* **Use:** update an existing email template
* **Documented responses:** `201`, `400`, `401`, `404`, `422`

The official page confirms the route and response codes, but the visible parsed docs do not fully expose the request-body schema, so field-level implementation should be verified during testing.
