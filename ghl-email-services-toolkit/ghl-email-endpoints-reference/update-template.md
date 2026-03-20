# GoHighLevel API - Update A Template

## Endpoint

- Method: `POST`
- Path: `/emails/builder/data`
- Base URL: `https://services.leadconnectorhq.com`

## Purpose

Upload HTML into an existing template or draft.

This repo uses the endpoint in two places:

- `clone-content` uploads fetched preview HTML into a new draft
- `publish-injected-draft.mjs` uploads the newest injected HTML artifact into the cloned draft

## What This Repo Sends Today

### Clone step payload

```json
{
  "locationId": "loc_123",
  "templateId": "tmpl_123",
  "html": "<html>...</html>",
  "editorType": "html",
  "updatedBy": "clone-content"
}
```

### Publish wrapper payload

```json
{
  "locationId": "loc_123",
  "templateId": "tmpl_123",
  "html": "<html>...</html>",
  "editorType": "html",
  "updatedBy": "publish-injected-draft"
}
```

## Headers

```http
Authorization: Bearer <ACCESS_TOKEN>
Accept: application/json
Content-Type: application/json
Version: 2021-07-28
```

## Error Handling In This Repo

The services map endpoint failures distinctly:

- `400` -> `UPDATE_400`
- `401` -> `UPDATE_401`
- `404` -> `UPDATE_404`
- `422` -> `UPDATE_422`
- other non-2xx -> `UPDATE_FAILED`

The publish wrapper preserves the raw response body as JSON when possible and
falls back to a raw text snippet when not.

## Newsletter Contract Reality

This endpoint is the final publish target, but the upstream newsletter renderer
is still incomplete:

- supported now:
  - one injected HTML artifact
  - one sample block
- missing now:
  - up to 10 repeatable structured blocks
  - optional-image rendering
  - validated heading/body/image/CTA payload parsing

## Limitations

- Public docs do not expose a complete request-body schema clearly enough to
  rely on alone.
- This repo currently uses observed working payloads centered on raw HTML.
- The update path is HTML-first, not builder-JSON-first.

## Example

```bash
curl --request POST \
  --url https://services.leadconnectorhq.com/emails/builder/data \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'Version: 2021-07-28' \
  --data '{
    "locationId": "YOUR_LOCATION_ID",
    "templateId": "YOUR_TEMPLATE_ID",
    "html": "<html>...</html>",
    "editorType": "html",
    "updatedBy": "manual-test"
  }'
```
