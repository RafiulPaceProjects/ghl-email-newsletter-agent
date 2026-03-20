````markdown
# GoHighLevel API — Create a New Template

## Overview

This endpoint creates a new email template in GoHighLevel.

- **Method:** `POST`
- **Path:** `/emails/builder`

---

## Endpoint

```http
POST /emails/builder
````

**Base URL:**

```
https://services.leadconnectorhq.com
```

**Full URL:**

```
https://services.leadconnectorhq.com/emails/builder
```

---

## Purpose

Use this endpoint to create a new email template programmatically.

### Common Use Cases

* Create a base newsletter template
* Generate reusable campaign templates
* Create a template before injecting dynamic content
* Build templates from automation workflows

---

## Authentication

Requires Bearer token authentication.

```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
Accept: application/json
```

### Token Types

* **Private Integration Token (PIT)** → for internal tools
* **OAuth Access Token** → for public apps

---

## Request Notes

The official documentation defines:

* endpoint
* method
* response codes

However, it does **not explicitly expose the full request body schema**.

### Implementation Guidance

* Request body must be JSON
* Must include sufficient data to define the template
* Exact fields should be verified via:

  * API explorer
  * Postman testing
  * known working payload

---

## Response Codes

### ✅ `201 Created`

Template created successfully.

---

### ❌ `400 Bad Request`

Malformed request.

**Possible causes:**

* Invalid JSON
* Missing required fields
* Incorrect payload structure

---

### ❌ `401 Unauthorized`

Authentication failed.

**Possible causes:**

* Missing token
* Invalid token
* Expired token

---

### ❌ `404 Not Found`

Resource or route not found.

**Possible causes:**

* Incorrect endpoint
* Wrong base URL

---

### ❌ `422 Unprocessable Entity`

Payload is valid JSON but cannot be processed.

**Possible causes:**

* Invalid template structure
* Unsupported fields
* Missing logical data

---

## Recommended Workflow

1. Create template
2. Capture returned template ID
3. Inject content using update endpoint
4. Store template for reuse

---

## Error Handling Strategy

### Handle `400`

* Validate payload before request
* Ensure required fields exist

### Handle `401`

* Refresh token
* Verify permissions

### Handle `404`

* Check endpoint URL
* Confirm API base URL

### Handle `422`

* Simplify payload
* Compare with known working request

---

## cURL Example

```bash
curl --request POST \
  --url https://services.leadconnectorhq.com/emails/builder \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data '{
    "...": "..."
  }'
```

---

## TypeScript Example (Axios)

```ts
import axios from "axios";

export async function createEmailTemplate(payload: Record<string, unknown>) {
  const response = await axios.post(
    "https://services.leadconnectorhq.com/emails/builder",
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

* Separate template creation and update logic
* Store template ID immediately after creation
* Maintain a known-good payload for testing
* Validate inputs before API calls
* Log full error responses during development
* Use create → then update pattern for content injection

---

## Limitations

* Request schema is not fully exposed in visible docs
* Requires testing to confirm exact payload structure
* Some fields may not behave consistently without validation

---

## Summary

* **Endpoint:** `POST /emails/builder`
* **Purpose:** Create a new email template
* **Auth:** Bearer token required
* **Responses:** `201`, `400`, `401`, `404`, `422`

This endpoint is typically used to create a template shell, followed by content injection using the update endpoint.

```
```
