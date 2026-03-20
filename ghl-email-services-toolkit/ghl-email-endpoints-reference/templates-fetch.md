# GoHighLevel API - Fetch Email Templates

## Endpoint

- Method: `GET`
- Path: `/emails/builder`
- Base URL: `https://services.leadconnectorhq.com`

## Purpose

Fetch template metadata for a location. This endpoint is the starting point for:

- auth probing
- template inventory snapshots
- template lookup before view, clone, or publish flows

## Request Contract

### Required query parameter

| Parameter | Type | Required | Notes |
| --- | --- | --- | --- |
| `locationId` | string | yes | scopes the request to one sub-account |

### Typical headers

```http
Authorization: Bearer <ACCESS_TOKEN>
Accept: application/json
Content-Type: application/json
Version: 2021-07-28
```

## What This Repo Observes

- `authentication-ghl` uses this endpoint as one of its two auth probes.
- `ghl-fetch-templates` calls it to persist a local snapshot.
- `view-content` calls it with `limit=100`, optional `name`, and optional
  `offset` while searching.
- The response body can contain `builders[]` or `templates[]`; this repo handles
  both for counting.

## Response Notes

- Returns metadata only.
- Does not return the full builder structure used by drag-and-drop templates.
- `previewUrl` is the important bridge for downstream preview fetch and clone work.

Example response shape seen by this repo:

```json
{
  "builders": [
    {
      "id": "template_123",
      "name": "Weekly Newsletter",
      "previewUrl": "https://example.com/preview",
      "templateType": "builder"
    }
  ],
  "total": [
    {
      "total": 1
    }
  ]
}
```

## Error Handling

- `400`: invalid request parameters
- `401`: invalid or missing token
- `404`: route or resource not found
- `422`: location or request cannot be processed

This repo preserves response snippets and status codes in JSON diagnostics.

## Limitations

- No full template content is returned here.
- No direct "get one full template" endpoint is used in this repo.
- HTML preview must be fetched separately through the returned `previewUrl`.

## Example

```bash
curl --request GET \
  --url 'https://services.leadconnectorhq.com/emails/builder?locationId=YOUR_LOCATION_ID' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'Version: 2021-07-28'
```
