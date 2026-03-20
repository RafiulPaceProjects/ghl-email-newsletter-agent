````markdown id="bulk-delete-media-ghl"
# 🗑️ GoHighLevel Media Storage API  
## Bulk Delete / Trash Media Objects (`PUT /medias/delete-files`)

---

## 🔹 Overview

The **Bulk Delete Media Objects** endpoint allows you to **soft-delete (trash)** multiple files and folders in a single request.

- Deletes multiple media items at once
- Moves items to **trash (soft delete)**, not permanent deletion
- Used for large-scale cleanup and automation workflows

> Official definition: “Soft-deletes or trashes multiple files and folders in a single request” :contentReference[oaicite:0]{index=0}

---

## 🔹 ⚠️ IMPORTANT SYSTEM RULE (FOR YOUR IMPLEMENTATION)

Your **Media Program MUST enforce strict scope boundaries**:

```text
The system should ONLY:
- Access a predefined folder scope
- Delete/update files INSIDE that folder ONLY
- NEVER modify or delete files outside that scope
````

### Recommended Enforcement Strategy

```text
1. Store allowedFolderId in config
2. Fetch all files via GET /medias/files
3. Filter:
   file.folderId === allowedFolderId
4. Only pass those IDs into bulk delete
```

> This ensures:

* Data safety
* Multi-tenant isolation
* No accidental deletion across the account

---

## 🔹 Endpoint

```http
PUT https://services.leadconnectorhq.com/medias/delete-files
```

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

### Typical Structure

```json
{
  "files": [
    {
      "id": "file_123"
    },
    {
      "id": "folder_456"
    }
  ]
}
```

---

## 🔹 Input Fields

### Root

| Field   | Type  | Required | Description                     |
| ------- | ----- | -------- | ------------------------------- |
| `files` | array | ✅ Yes    | List of files/folders to delete |

---

### Each Object

| Field | Type   | Required | Description       |
| ----- | ------ | -------- | ----------------- |
| `id`  | string | ✅ Yes    | File or folder ID |

---

## 🔹 Example Request

```bash
curl --request PUT \
  --url https://services.leadconnectorhq.com/medias/delete-files \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --header "Version: 2021-07-28" \
  --header "Content-Type: application/json" \
  --data '{
    "files": [
      { "id": "file_123" },
      { "id": "file_456" },
      { "id": "folder_789" }
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
  "deleted": [
    {
      "id": "file_123",
      "deleted": true
    },
    {
      "id": "file_456",
      "deleted": true
    }
  ]
}
```

---

## 🔹 Response Fields

| Field     | Description                 |
| --------- | --------------------------- |
| `success` | Indicates operation success |
| `deleted` | Array of processed items    |
| `id`      | File/folder ID              |
| `deleted` | Boolean flag                |

---

## 🔹 Behavior Notes

### 🧠 Soft Delete (Important)

* Files are **not permanently removed immediately**
* They are moved to **trash**
* Can potentially be recovered depending on system behavior

---

### 📂 Folder Behavior

* Deleting a folder may:

  * Delete all nested files
  * Or move entire structure to trash

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
* Missing `id` field
* Empty payload

---

### 📂 404 Not Found

```json
{
  "message": "File or folder not found"
}
```

**Cause:**

* Invalid ID

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

Typical:

* ~100 requests / 10 seconds
* Daily limits apply

---

## 🔹 Safe Deletion Flow (Recommended for Your System)

```text
1. Fetch files (GET /medias/files)
2. Filter by allowedFolderId
3. Validate IDs
4. Send bulk delete request
5. Log deleted items
```

---

## 🔹 Example (Node.js)

```ts
import fetch from "node-fetch";

const res = await fetch(
  "https://services.leadconnectorhq.com/medias/delete-files",
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GHL_TOKEN}`,
      Version: "2021-07-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      files: [
        { id: "file_123" },
        { id: "file_456" }
      ]
    })
  }
);

const data = await res.json();
console.log(data);
```

---

## 🔹 Best Practices

### ✅ Always Scope Deletion

```text
ONLY delete within:
- /newsletter/tmp
- /newsletter/generated
```

Never allow:

```text
Global deletion without filtering
```

---

### ✅ Add Confirmation Layer

```text
- Require double confirmation for bulk delete
- Log all deletions
```

---

### ✅ Batch Carefully

* Avoid sending extremely large arrays
* Chunk into groups if needed

---

### ✅ Audit Logs

Track:

* Deleted IDs
* Timestamp
* Folder scope

---

## 🔹 Limitations

* No guaranteed rollback
* Partial failures possible
* Soft delete behavior may vary

---

## 🔹 Summary

| Category | Value                          |
| -------- | ------------------------------ |
| Endpoint | `PUT /medias/delete-files`     |
| Purpose  | Bulk soft delete files/folders |
| Input    | JSON array of IDs              |
| Output   | Deleted items                  |
| Scope    | `medias.write`                 |

---

## 🔹 Role in Your System

```text
Fetch → Filter (Scoped Folder) → Bulk Delete → Cleanup
```

This endpoint acts as your:

> **Media cleanup and lifecycle management layer**

---

```
::contentReference[oaicite:1]{index=1}
```
