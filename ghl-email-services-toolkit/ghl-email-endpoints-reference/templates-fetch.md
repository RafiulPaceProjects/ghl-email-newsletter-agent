# 📧 GoHighLevel API — Fetch Email Templates

## Endpoint Overview

Retrieve all email builder templates associated with a specific location.

* **Method:** `GET`
* **Endpoint:** `/emails/builder`
* **Base URL:** `https://services.leadconnectorhq.com`

**Full URL Example:**

```
GET https://services.leadconnectorhq.com/emails/builder
```

**Description:**
Fetches a list of email templates created within a GoHighLevel location.

---

## 🔐 Authentication

This endpoint requires a **Private Integration Token (PIT)** or OAuth token.

### Required Header

```
Authorization: Bearer <YOUR_ACCESS_TOKEN>
Content-Type: application/json
```

### Required Scopes

* `emails/builder.readonly` (minimum)
* or broader scopes including:

  * `View Email Templates`

---

## 📥 Request Parameters

### Query Parameters

| Parameter  | Type   | Required | Description                       |
| ---------- | ------ | -------- | --------------------------------- |
| locationId | string | Yes      | Unique identifier of the location |

> The location ID defines which sub-account’s templates you retrieve.

---

## 📤 Response Structure

### ✅ Success — `200 OK`

Returns a list of email templates.

#### Example Response

```
{
  "templates": [
    {
      "id": "template_123",
      "name": "Weekly Newsletter",
      "type": "builder",
      "previewUrl": "https://..."
    }
  ]
}
```

### Response Fields

| Field      | Type   | Description                       |
| ---------- | ------ | --------------------------------- |
| id         | string | Template ID                       |
| name       | string | Template name                     |
| type       | string | Template type (`builder`, `html`) |
| previewUrl | string | Preview link                      |

---

## ⚠️ Important Behavior / Limitations

* This endpoint returns **template metadata only**
* It **does NOT return full template content (editorData)**
* Full builder JSON is **not exposed via public API**

### Implication

* You **cannot directly fetch drag-and-drop structure**
* Only HTML preview or metadata is accessible

---

## ❌ Error Handling

The API returns standard HTTP status codes.

### 🔴 400 Bad Request

**Cause:**

* Missing or invalid parameters
* Incorrect request format

**Example:**

```
{
  "message": "Invalid request"
}
```

---

### 🔴 401 Unauthorized

**Cause:**

* Missing or invalid token
* Expired token
* Missing required scopes

**Fix:**

* Ensure correct Authorization header
* Verify token scopes

---

### 🔴 404 Not Found

**Cause:**

* Endpoint not found
* Incorrect base URL or route

---

### 🔴 422 Unprocessable Entity

**Cause:**

* Invalid `locationId`
* Location exists but data cannot be processed

---

## ⚡ Rate Limits

* Burst: 100 requests / 10 seconds
* Daily: 200,000 requests per app per location

---

## 🧠 Usage Patterns

### Typical Workflow

1. Fetch all templates
2. Select template by ID
3. Inject content (HTML or dynamic data)
4. Update or duplicate template

---

## 🧩 Example (cURL)

```
curl --request GET \
  --url https://services.leadconnectorhq.com/emails/builder \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json'
```

---

## 🧩 Example (TypeScript / Axios)

```ts
import axios from "axios";

const fetchTemplates = async () => {
  const response = await axios.get(
    "https://services.leadconnectorhq.com/emails/builder",
    {
      headers: {
        Authorization: `Bearer ${process.env.GHL_TOKEN}`,
        "Content-Type": "application/json",
      },
      params: {
        locationId: "YOUR_LOCATION_ID",
      },
    }
  );

  return response.data;
};
```

---

## 🏗️ Best Practices

* Cache templates locally to reduce API calls
* Always validate `locationId` before requests
* Handle `401` errors with token refresh logic
* Build abstraction layer (service class) around API

---

## 🚧 Known Gaps

* No endpoint to fetch full template builder JSON
* No direct GET for single template content
* Requires workaround using HTML preview for migration

---

## 🔗 Related Endpoints

| Action          | Endpoint                                       |
| --------------- | ---------------------------------------------- |
| Create Template | POST /emails/builder                           |
| Update Template | POST /emails/builder/data                      |
| Delete Template | DELETE /emails/builder/:locationId/:templateId |

---

## 📌 Summary

* Retrieves all email templates for a location
* Metadata-only response
* Requires authentication and proper scopes
* Designed for automation workflows and template selection
