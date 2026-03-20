````markdown id="bulk-update-media-ghl"
# 🔄 GoHighLevel Media Storage API  
## Bulk Update Media Objects (`PUT /medias/update-files`)

---

## 🔹 Overview

The **Bulk Update Media Objects** endpoint allows you to update **multiple files and folders in a single request**.

This is used for:
- Moving multiple files to a folder
- Renaming multiple assets
- Updating metadata in bulk
- Managing large media libraries efficiently

> Official definition: “Updates metadata or status of multiple files and folders” :contentReference[oaicite:0]{index=0}

---

## 🔹 Endpoint

```http
PUT https://services.leadconnectorhq.com/medias/update-files
````

---

## 🔹 Authentication

### Required Headers

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Version: 2021-07-28
Content-Type: application/json
```

---

## 🔹 Required Scope

```text
medias.write
```

Without this scope → request will fail.

---

## 🔹 Request Structure

### Method

```http
PUT
```

---

## 🔹 Input JSON (Request Body)

This endpoint requires a **JSON payload containing multiple objects**.

### Typical Structure

```json
{
  "files": [
    {
      "id": "file_123",
      "name": "updated-name.jpg",
      "folderId": "folder_1"
    },
    {
      "id": "file_456",
      "folderId": "folder_2"
    }
  ]
}
```

---

## 🔹 Input Fields

### Root Level

| Field   | Type  | Required | Description                     |
| ------- | ----- | -------- | ------------------------------- |
| `files` | array | ✅ Yes    | List of files/folders to update |

---

### Inside Each Object

| Field      | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| `id`       | string | ✅ Yes    | File or folder ID              |
| `name`     | string | ❌        | New name                       |
| `folderId` | string | ❌        | Move to another folder         |
| `parentId` | string | ❌        | For folders (change hierarchy) |

> ⚠️ At least one updatable field must be provided per object

---

## 🔹 Example Request

```bash
curl --request PUT \
  --url https://services.leadconnectorhq.com/medias/update-files \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --header "Version: 2021-07-28" \
  --header "Content-Type: application/json" \
  --data '{
    "files": [
      {
        "id": "file_123",
        "name": "hero.jpg",
        "folderId": "newsletter_hero"
      },
      {
        "id": "file_456",
        "folderId": "newsletter_cards"
      }
    ]
  }'
```

---

## 🔹 Response

### ✅ Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "updated": [
    {
      "id": "file_123",
      "name": "hero.jpg",
      "folderId": "newsletter_hero",
      "updatedAt": "2026-03-20T12:30:00.000Z"
    },
    {
      "id": "file_456",
      "folderId": "newsletter_cards",
      "updatedAt": "2026-03-20T12:30:00.000Z"
    }
  ]
}
```

---

## 🔹 Response Fields

| Field       | Description                 |
| ----------- | --------------------------- |
| `success`   | Indicates operation success |
| `updated`   | Array of updated items      |
| `id`        | File/folder ID              |
| `name`      | Updated name (if changed)   |
| `folderId`  | New folder                  |
| `updatedAt` | Timestamp                   |

---

## 🔹 Error Codes

---

### 🔐 401 Unauthorized

```json
{
  "message": "Unauthorized"
}
```

**Cause:**

* Missing or invalid token

---

### 🚫 403 Forbidden

```json
{
  "message": "Forbidden"
}
```

**Cause:**

* Missing `medias.write` scope

---

### ❌ 400 Bad Request

```json
{
  "message": "Invalid request payload"
}
```

**Common Causes:**

* Missing `files` array
* Missing `id` inside objects
* Empty update payload

---

### 📂 404 Not Found

```json
{
  "message": "File or folder not found"
}
```

**Cause:**

* Invalid IDs

---

### ⚠️ 429 Too Many Requests

```json
{
  "message": "Too many requests"
}
```

---

### 🔥 500 Internal Server Error

```json
{
  "message": "Internal server error"
}
```

---

## 🔹 Rate Limits

* ~100 requests per 10 seconds
* ~200,000 requests per day ([HighLevel Support Portal][1])

---

## 🔹 How It Works (Flow)

```text
1. Upload files (POST /medias/upload-file)
2. Collect file IDs
3. Use bulk update to:
   - Rename
   - Move to folders
4. Fetch updated structure (GET /medias/files)
```

---

## 🔹 Example (Node.js)

```ts
import fetch from "node-fetch";

const res = await fetch(
  "https://services.leadconnectorhq.com/medias/update-files",
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GHL_TOKEN}`,
      Version: "2021-07-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      files: [
        { id: "file_123", name: "hero.jpg", folderId: "newsletter_hero" },
        { id: "file_456", folderId: "newsletter_cards" }
      ]
    })
  }
);

const data = await res.json();
console.log(data);
```

---

## 🔹 Best Practices

### ✅ Batch Operations

* Use this endpoint instead of multiple single updates
* Reduces API calls significantly

---

### ✅ Organize Immediately After Upload

```text
Upload → Bulk Update → Structured Folders
```

---

### ✅ Validate IDs Before Sending

* Prevent partial failures
* Ensure consistency

---

### ✅ Use Logical Folder Structure

```text
/newsletter/hero
/newsletter/cards
/newsletter/archive
```

---

## 🔹 Limitations

* Partial failure handling may vary
* No transactional rollback (one failure doesn’t undo others)
* Payload size should remain reasonable

---

## 🔹 Summary

| Category | Value                      |
| -------- | -------------------------- |
| Endpoint | `PUT /medias/update-files` |
| Purpose  | Bulk update files/folders  |
| Input    | JSON array of objects      |
| Output   | Updated items              |
| Scope    | `medias.write`             |

---

## 🔹 Role in Your System

```text
Upload → Bulk Organize → Fetch → Inject → Send
```

This endpoint acts as your:

> **High-efficiency media management layer**

---

```
::contentReference[oaicite:2]{index=2}
```

[1]: https://help.gohighlevel.com/support/solutions/articles/48001060529-highlevel-api-documentation?utm_source=chatgpt.com "HighLevel API Documentation"
