````markdown
# 📂 GoHighLevel Media Storage API  
## Get List of Files / Folders (`GET /medias/files`)

---

## 🔹 Overview

This endpoint retrieves a **list of files and folders** from GoHighLevel Media Storage.

- Returns **metadata only** (not file content)
- Used for browsing media library programmatically
- Commonly used to fetch image URLs for emails, funnels, and automation systems

> Official definition: “Fetches list of files and folders from the media storage” :contentReference[oaicite:0]{index=0}

---

## 🔹 Endpoint

```http
GET https://services.leadconnectorhq.com/medias/files
````

---

## 🔹 Authentication

### Required

* **Bearer Token (JWT)**
* Must be generated from:

  * OAuth flow OR
  * Private Integration (Sub-Account)

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Version: 2021-07-28
```

> Media APIs require Sub-Account scoped tokens ([App Marketplace][1])

---

## 🔹 Required Scope

```text
medias.readonly
```

This scope is required to access:

```text
GET /medias/files
```

([App Marketplace][2])

---

## 🔹 Request

### Method

```http
GET
```

### Request Body

❌ No request body required

---

### Query Parameters

| Parameter    | Type   | Required | Description                 |
| ------------ | ------ | -------- | --------------------------- |
| `locationId` | string | ✅ Yes    | Sub-account (location) ID   |
| `limit`      | number | ❌ No     | Number of results per page  |
| `offset`     | number | ❌ No     | Pagination offset           |
| `parentId`   | string | ❌ No     | Fetch files inside a folder |
| `type`       | string | ❌ No     | Filter by file type         |
| `search`     | string | ❌ No     | Search by file name         |

---

### Example Request

```bash
curl --request GET \
  --url "https://services.leadconnectorhq.com/medias/files?locationId=abc123&limit=20&offset=0" \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --header "Version: 2021-07-28"
```

---

## 🔹 Response

### ✅ Success Response

**Status:** `200 OK`

```json
{
  "files": [
    {
      "id": "file_123",
      "name": "image.jpg",
      "url": "https://storage.googleapis.com/...",
      "type": "image/jpeg",
      "size": 123456,
      "height": 800,
      "width": 1200,
      "createdAt": "2026-03-19T12:00:00.000Z",
      "updatedAt": "2026-03-19T12:00:00.000Z",
      "locationId": "abc123",
      "folderId": "folder_1"
    }
  ],
  "folders": [
    {
      "id": "folder_1",
      "name": "My Folder",
      "parentId": null,
      "createdAt": "2026-03-01T10:00:00.000Z",
      "updatedAt": "2026-03-01T10:00:00.000Z",
      "locationId": "abc123"
    }
  ],
  "meta": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

---

## 🔹 Response Fields

### 📁 Files

| Field        | Type   | Description                  |
| ------------ | ------ | ---------------------------- |
| `id`         | string | Unique file ID               |
| `name`       | string | File name                    |
| `url`        | string | Public CDN URL               |
| `type`       | string | MIME type                    |
| `size`       | number | File size in bytes           |
| `height`     | number | Image height (if applicable) |
| `width`      | number | Image width                  |
| `createdAt`  | string | Upload timestamp             |
| `updatedAt`  | string | Last modified timestamp      |
| `locationId` | string | Sub-account ID               |
| `folderId`   | string | Parent folder                |

---

### 📁 Folders

| Field        | Type        | Description    |
| ------------ | ----------- | -------------- |
| `id`         | string      | Folder ID      |
| `name`       | string      | Folder name    |
| `parentId`   | string/null | Parent folder  |
| `createdAt`  | string      | Creation date  |
| `updatedAt`  | string      | Last updated   |
| `locationId` | string      | Sub-account ID |

---

### 📊 Meta

| Field    | Description           |
| -------- | --------------------- |
| `total`  | Total number of items |
| `limit`  | Items per request     |
| `offset` | Pagination offset     |

---

## 🔹 Error Codes

### 🔐 401 Unauthorized

```json
{
  "message": "Unauthorized"
}
```

**Reason:**

* Missing or invalid token

---

### 🚫 403 Forbidden

```json
{
  "message": "Forbidden"
}
```

**Reason:**

* Missing `medias.readonly` scope

---

### ❌ 400 Bad Request

```json
{
  "message": "Invalid request parameters"
}
```

**Reason:**

* Missing `locationId`
* Invalid query params

---

### 📂 404 Not Found

```json
{
  "message": "Resource not found"
}
```

**Reason:**

* Invalid `parentId`
* Folder/file does not exist

---

### ⚠️ 429 Too Many Requests

```json
{
  "message": "Too many requests"
}
```

**Reason:**

* Rate limit exceeded

---

### 🔥 500 Internal Server Error

```json
{
  "message": "Internal server error"
}
```

---

## 🔹 Rate Limits

Typical limits:

* ~100 requests per 10 seconds
* Daily cap (varies by plan)

---

## 🔹 How It Works (Flow)

```text
1. Authenticate with Bearer Token
2. Send GET request with locationId
3. Receive files + folders metadata
4. Extract URLs for usage
```

---

## 🔹 Example Usage (Node.js)

```ts
import fetch from "node-fetch";

const res = await fetch(
  "https://services.leadconnectorhq.com/medias/files?locationId=abc123",
  {
    headers: {
      Authorization: `Bearer ${process.env.GHL_TOKEN}`,
      Version: "2021-07-28"
    }
  }
);

const data = await res.json();
console.log(data.files);
```

---

## 🔹 Key Notes

* This endpoint is **read-only**
* No request body is required
* Returns both:

  * Files
  * Folder structure
* File URLs are **ready-to-use CDN links**

---

## 🔹 Summary

| Category | Value                      |
| -------- | -------------------------- |
| Endpoint | `GET /medias/files`        |
| Purpose  | List files and folders     |
| Input    | Query params only          |
| Output   | Metadata (files + folders) |
| Auth     | Bearer token               |
| Scope    | `medias.readonly`          |

---

## 🔹 Core Use Case (Your System)

```text
Fetch media → Get image URLs → Inject into email templates
```

This endpoint acts as your:

> **Media retrieval layer for automation systems**

---

```
::contentReference[oaicite:3]{index=3}
```

[1]: https://marketplace.gohighlevel.com/docs/ghl/medias/media-storage-api?utm_source=chatgpt.com "Media Storage API | HighLevel API"
[2]: https://marketplace.gohighlevel.com/docs/Authorization/Scopes/index.html?utm_source=chatgpt.com "**Scopes** | HighLevel API"
