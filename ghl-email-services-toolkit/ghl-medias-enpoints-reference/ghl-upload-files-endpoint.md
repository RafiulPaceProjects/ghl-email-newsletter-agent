````markdown id="9xuploadghl"
# 📤 GoHighLevel Media Storage API  
## Upload Media Content (`POST /medias/upload-file`)

---

## 🔹 Overview

The **Upload Media Content** endpoint allows you to upload files (images, videos, documents) into GoHighLevel Media Storage.

This endpoint is used to:
- Upload images for email templates
- Store assets for funnels/websites
- Build automated pipelines (e.g., Pexels → GHL → Email)
- Centralize media for reuse across the platform

> Supports both **direct file upload** and **hosted file ingestion (via URL)** :contentReference[oaicite:0]{index=0}

---

## 🔹 Endpoint

```http
POST https://services.leadconnectorhq.com/medias/upload-file
````

---

## 🔹 Authentication

### Required Headers

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Version: 2021-07-28
```

---

### Required Scope

```text
medias.write
```

Without this scope → request will fail.

---

## 🔹 Upload Modes (Important)

This endpoint supports **two ways to upload files**:

---

### 1. Direct File Upload (Multipart)

* You upload a file buffer directly
* Uses `multipart/form-data`

---

### 2. Hosted File Upload (URL-based)

* You provide a `fileUrl`
* GHL fetches and stores the file internally

> Rule:

```text
If hosted = true → fileUrl is required  
Else → file (binary) is required
```

([App Marketplace][1])

---

## 🔹 File Size Limits

| Type           | Limit  |
| -------------- | ------ |
| Standard files | 25 MB  |
| Video files    | 500 MB |

([App Marketplace][1])

---

## 🔹 Request Structure

### Method

```http
POST
```

---

## 🔹 Request Body (Multipart Form)

### Option A — Direct File Upload

```http
Content-Type: multipart/form-data
```

#### Fields

| Field        | Type   | Required | Description      |
| ------------ | ------ | -------- | ---------------- |
| `file`       | binary | ✅ Yes    | File buffer      |
| `locationId` | string | ✅ Yes    | Sub-account ID   |
| `folderId`   | string | ❌ No     | Target folder    |
| `name`       | string | ❌ No     | Custom file name |

---

### Example (cURL)

```bash
curl --request POST \
  --url https://services.leadconnectorhq.com/medias/upload-file \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --header "Version: 2021-07-28" \
  --form "file=@/path/to/image.jpg" \
  --form "locationId=abc123"
```

---

## 🔹 Request Body (Hosted Upload)

### Option B — Upload via URL

```json
{
  "hosted": true,
  "fileUrl": "https://example.com/image.jpg",
  "locationId": "abc123",
  "folderId": "folder_1"
}
```

---

## 🔹 Input JSON Summary

| Field        | Type    | Required        | Notes              |
| ------------ | ------- | --------------- | ------------------ |
| `hosted`     | boolean | ❌               | Enables URL upload |
| `fileUrl`    | string  | ✅ if hosted     | External file URL  |
| `file`       | binary  | ✅ if NOT hosted | File buffer        |
| `locationId` | string  | ✅               | Sub-account        |
| `folderId`   | string  | ❌               | Target folder      |
| `name`       | string  | ❌               | Custom file name   |

---

## 🔹 Response

### ✅ Success Response

**Status:** `200 OK`

```json
{
  "id": "file_abc123",
  "name": "image.jpg",
  "locationId": "abc123",
  "folderId": "folder_1",
  "createdAt": "2026-03-20T10:00:00.000Z"
}
```

---

## 🔹 Important Behavior

* API typically returns **file ID**, not always the URL directly ([HighLevel Ideas][2])
* To get the public URL:
  → Call `GET /medias/files` and match the file

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

* Missing/invalid token

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
  "message": "Invalid request"
}
```

**Common Causes:**

* Missing `file` or `fileUrl`
* Missing `locationId`
* Invalid payload

---

### 📦 413 Payload Too Large

```json
{
  "message": "File too large"
}
```

**Cause:**

* File exceeds size limits

---

### 📂 404 Not Found

```json
{
  "message": "Folder not found"
}
```

**Cause:**

* Invalid `folderId`

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

## 🔹 End-to-End Flow (Your Use Case)

```text
1. Fetch image from Pexels
2. Upload via this endpoint
3. Receive file ID
4. Call GET /medias/files
5. Extract URL
6. Inject into email template
```

---

## 🔹 Example (Node.js)

```ts
import FormData from "form-data";
import fetch from "node-fetch";
import fs from "fs";

const form = new FormData();
form.append("file", fs.createReadStream("./image.jpg"));
form.append("locationId", "abc123");

const res = await fetch(
  "https://services.leadconnectorhq.com/medias/upload-file",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GHL_TOKEN}`,
      Version: "2021-07-28"
    },
    body: form
  }
);

const data = await res.json();
console.log(data);
```

---

## 🔹 Best Practices

### ✅ Use Hosted Upload for Automation

* Faster pipelines
* No file buffering required

---

### ✅ Store Folder Structure

```text
/newsletter/hero
/newsletter/cards
/newsletter/archive
```

---

### ✅ Immediately Sync After Upload

* Call `GET /medias/files`
* Cache URL for reuse

---

### ✅ Validate File Type Before Upload

* Avoid invalid formats
* Keep emails optimized

---

## 🔹 Summary

| Category | Value                       |
| -------- | --------------------------- |
| Endpoint | `POST /medias/upload-file`  |
| Purpose  | Upload media to GHL         |
| Input    | Multipart OR JSON           |
| Output   | File ID                     |
| Scope    | `medias.write`              |
| Max Size | 25MB (files), 500MB (video) |

---

## 🔹 Key Insight for Your System

This endpoint is your:

> **Media ingestion layer**

Combined with:

```text
Upload → Fetch → Inject → Send
```

You now have a full:
**AI-powered newsletter media pipeline**

---

```
::contentReference[oaicite:4]{index=4}
```

[1]: https://marketplace.gohighlevel.com/docs/ghl/medias/upload-media-content/index.html?utm_source=chatgpt.com "Upload File into Media Storage | HighLevel API"
[2]: https://ideas.gohighlevel.com/apis/p/return-url-of-file-upload-to-media-library?utm_source=chatgpt.com "Return URL of File Upload to Media Library | Voters"

---

## 🔹 Developer Notes & Troubleshooting (March 20, 2026)

### Fixed Payload Too Large / Invalid File Type (HTTP 400)
When doing direct `multipart/form-data` uploads using standard JS `Blob` logic, the upload will return **400 Invalid File Type** if you do not explicitly declare the MIME type of the Blob.

**Fix:** Ensure the type options object sets `type: "image/jpeg"` (or png/gif) when constructing the Blob object within the form data allocation.

```ts
form.set(
  'file',
  new Blob([fileBuffer], { type: 'image/jpeg' }), 
  finalName
);
```

### File URLs returned directly on upload
While old documentation suggests the URL cannot be known without a subsequent `GET /medias/files` query, doing an immediate sync has proven unstable due to propagation delays (Empty results despite success). **Fortunately, testing reveals GHL POST `/medias/upload-file` will directly return the file URL underneath `result.data.url` (sometimes alongside `_id` or `fileId` based on internal schemas)**. Always extract the `url` from the initial upload payload to bypass unreliable polling.
