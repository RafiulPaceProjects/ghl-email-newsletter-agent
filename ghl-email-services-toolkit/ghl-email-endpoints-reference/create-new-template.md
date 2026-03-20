# GoHighLevel API - Create A New Template

## Endpoint

- Method: `POST`
- Path: `/emails/builder`
- Base URL: `https://services.leadconnectorhq.com`

## Purpose

Create a new draft template shell before HTML is uploaded through the update
endpoint.

## What This Repo Sends Today

`ghl-update-template/clone-content` currently creates drafts with this observed
payload:

```json
{
  "locationId": "loc_123",
  "name": "Newsletter Draft",
  "type": "html"
}
```

This is the most important repo-specific detail for this endpoint.

## Headers

```http
Authorization: Bearer <ACCESS_TOKEN>
Accept: application/json
Content-Type: application/json
Version: 2021-07-28
```

## Response Handling In This Repo

- Success is expected as `201`.
- The create response is parsed defensively because id fields may vary.
- `clone-content` tries to extract the new template id from common shapes such as:
  - `id`
  - `templateId`
  - `builderId`
  - nested `builder`, `template`, or `data`

## Error Handling

- `400`: invalid create body
- `401`: auth failure
- `404`: bad route or inaccessible resource
- `422`: payload accepted as JSON but rejected semantically

The clone service maps these to `CREATE_*` error codes in its JSON contract.

## Limitations

- Public docs do not clearly expose the full request schema in a way this repo
  can rely on completely.
- The current implementation is intentionally conservative and uses the smallest
  observed working payload.

## Example

```bash
curl --request POST \
  --url https://services.leadconnectorhq.com/emails/builder \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'Version: 2021-07-28' \
  --data '{
    "locationId": "YOUR_LOCATION_ID",
    "name": "Newsletter Draft",
    "type": "html"
  }'
```
