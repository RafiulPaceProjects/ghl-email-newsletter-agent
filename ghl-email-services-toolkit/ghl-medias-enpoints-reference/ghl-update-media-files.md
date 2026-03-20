````markdown
# 🔄 GoHighLevel Media Storage API  
## Update Media Object (`PUT /medias/files/{id}`)

---

## 🔹 Overview

The **Update Media Object** endpoint allows you to update metadata or properties of an existing file or folder in GoHighLevel Media Storage.

This includes:
- Renaming files or folders
- Moving files to another folder
- Updating metadata (where supported)

> Official definition: “Updates a single file or folder by ID” :contentReference[oaicite:0]{index=0}

---

## 🔹 Endpoint

```http
PUT https://services.leadconnectorhq.com/medias/files/{id}
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

Without this scope → request will fail with `403 Forbidden`.

---

## 🔹 Path Parameters

| Parameter | Type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| `id`      | string | ✅ Yes    | File or Folder ID to update |

---

## 🔹 Request Body (Input JSON)

This endpoint uses a **JSON payload** to update properties.

### Typical Input Structure

```json
{
  "name": "new-file-name.jpg",
  "folderId": "new_folder_id"
}
```

---

## 🔹 Input Fields

| Field      | Type   | Required | Description                        |
| ---------- | ------ | -------- | ---------------------------------- |
| `name`     | string | ❌        | New file or folder name            |
| `folderId` | string | ❌        | Move file to another folder        |
| `parentId` | string | ❌        | For folders (change parent folder) |

> ⚠️ At least one field must be provided

---

## 🔹 Example Request

```bash
curl --request PUT \
  --url https://services.leadconnectorhq.com/medias/files/file_123 \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --header "Version: 2021-07-28" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "updated-image.jpg",
    "folderId": "folder_2"
  }'
```

---

## 🔹 Response

### ✅ Success Response

**Status:** `200 OK`

```json
{
  "id": "file_123",
  "name": "updated-image.jpg",
  "locationId": "abc123",
  "folderId": "folder_2",
  "updatedAt": "2026-03-20T12:00:00.000Z"
}
```

---

## 🔹 Response Fields

| Field        | Description             |
| ------------ | ----------------------- |
| `id`         | File/folder ID          |
| `name`       | Updated name            |
| `locationId` | Sub-account             |
| `folderId`   | Current folder          |
| `updatedAt`  | Last modified timestamp |

---

## 🔹 Common Use Cases

### 1. Rename File

```json
{
  "name": "hero-banner.jpg"
}
```

---

### 2. Move File to Folder

```json
{
  "folderId": "newsletter_folder"
}
```

---

### 3. Rename + Move

```json
{
  "name": "card-1.jpg",
  "folderId": "cards_folder"
}
```

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

* Invalid or missing token

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

**Cause:**

* Empty body
* Invalid fields

---

### 📂 404 Not Found

```json
{
  "message": "File or folder not found"
}
```

**Cause:**

* Invalid `id`

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

## 🔹 How It Works (Flow)

```text
1. Upload file (POST /medias/upload-file)
2. Get file ID
3. Update metadata using this endpoint
4. Fetch updated file via GET /medias/files
```

---

## 🔹 Example (Node.js)

```ts
import fetch from "node-fetch";

const res = await fetch(
  "https://services.leadconnectorhq.com/medias/files/file_123",
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GHL_TOKEN}`,
      Version: "2021-07-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "updated-image.jpg",
      folderId: "folder_2"
    })
  }
);

const data = await res.json();
console.log(data);
```

---

## 🔹 Best Practices

### ✅ Validate Before Updating

* Ensure file exists
* Confirm folder ID is valid

---

### ✅ Use for Organization

* Rename assets for clarity
* Maintain structured folders

---

### ✅ Avoid Frequent Updates

* Batch updates if possible (use bulk endpoints if needed)

---

## 🔹 Summary

| Category | Value                       |
| -------- | --------------------------- |
| Endpoint | `PUT /medias/files/{id}`    |
| Purpose  | Update file/folder metadata |
| Input    | JSON body                   |
| Output   | Updated object              |
| Scope    | `medias.write`              |

---

## 🔹 Role in Your System

```text
Upload → Update (organize) → Fetch → Inject → Send
```

This endpoint acts as your:

> **Media organization layer**

---

```
::contentReference[oaicite:1]{index=1}
```
