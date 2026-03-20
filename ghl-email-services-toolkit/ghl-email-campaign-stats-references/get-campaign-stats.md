````markdown
# 📊 GoHighLevel Email API
## Get Campaign Statistics (`GET /emails/stats/location/{locationId}/{source}/{sourceId}`)

---

## Overview

The **Get Campaign Statistics** endpoint is used to retrieve statistics for a specific email-related source in a given sub-account. According to the official HighLevel docs, it supports statistics for **email campaigns, workflows, or bulk actions**. :contentReference[oaicite:0]{index=0}

---

## Endpoint

```http
GET https://services.leadconnectorhq.com/emails/stats/location/{locationId}/{source}/{sourceId}
````

The official route is documented as:

```http
GET /emails/stats/location/:locationId/:source/:sourceId
```

([App Marketplace][1])

---

## What This Endpoint Is For

Use this endpoint when you want stats for one specific email send source, such as:

* an **email campaign**
* a **workflow**
* a **bulk action**

That mapping is stated directly in the HighLevel docs. ([App Marketplace][2])

Typical use cases include:

* checking delivery performance for a campaign
* reading stats for an automation email sent from a workflow
* pulling reporting data into your own dashboard

The first two uses are directly supported by the official description; the third is an implementation use inferred from the endpoint’s purpose. ([App Marketplace][1])

---

## Authentication

This endpoint is part of the HighLevel Email API and is hosted under the LeadConnector API base domain shown in other HighLevel endpoint patterns. You should connect using a valid HighLevel bearer token in the `Authorization` header. The official page confirms this is a HighLevel API endpoint, but the specific auth header format is not shown on this page, so the exact header pattern below follows normal HighLevel API usage rather than explicit text on this endpoint page. ([App Marketplace][1])

### Recommended headers

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Version: 2021-07-28
Accept: application/json
```

> Note: the official endpoint page viewed here does **not** expose the full request schema, required scopes, or example headers, so those details should be verified in your app’s working auth setup if you are implementing this in production. ([App Marketplace][1])

---

## Path Parameters

This endpoint uses **three required path parameters**:

| Parameter    | Type   | Required | Description                            |
| ------------ | ------ | -------: | -------------------------------------- |
| `locationId` | string |      Yes | The sub-account / location identifier  |
| `source`     | string |      Yes | The source type for the stats request  |
| `sourceId`   | string |      Yes | The specific object ID for that source |

These parameter names come directly from the documented route. The page does **not** publish an expanded schema describing allowed values for `source` on the visible page, but the description says the endpoint is for **campaigns, workflows, or bulk actions**, so `source` should correspond to one of those source categories. ([App Marketplace][1])

---

## Request Body

This is a `GET` endpoint, so it does **not** require a request body. The visible official page shows only the path-based route and does not document a request JSON body. ([App Marketplace][1])

### Input JSON

```json
null
```

---

## Example Request

```bash
curl --request GET \
  --url "https://services.leadconnectorhq.com/emails/stats/location/LOCATION_ID/SOURCE/SOURCE_ID" \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --header "Version: 2021-07-28" \
  --header "Accept: application/json"
```

---

## Response Codes

The official documentation page explicitly lists these response codes:

| Status Code | Meaning              |
| ----------- | -------------------- |
| `200`       | Success              |
| `400`       | Bad Request          |
| `401`       | Unauthorized         |
| `422`       | Unprocessable Entity |

([App Marketplace][1])

---

## Response Details

### `200 OK`

A successful response returns statistics for the requested source. The visible official page confirms success is available, but it does **not** show the response schema or a concrete JSON example on the accessible page. ([App Marketplace][1])

Because the visible doc does not expose the full schema, the exact output shape is **not specified** in the source we could access. In practice, a stats response would reasonably be expected to contain reporting metrics, but the exact field names should be treated as undocumented unless you confirm them from a live API response or a fuller schema view. ([App Marketplace][1])

### Example output JSON shape

```json
{
  "data": {
    "source": "campaign",
    "sourceId": "abc123",
    "locationId": "loc_123",
    "stats": {
      "sent": 0,
      "delivered": 0,
      "opened": 0,
      "clicked": 0,
      "bounced": 0,
      "unsubscribed": 0
    }
  }
}
```

> This example is a **recommended placeholder structure for internal documentation only**. It is **not** taken from the official page, because the official page available here does not publish the response body example. ([App Marketplace][1])

---

## Error Responses

### `400 Bad Request`

Returned when the request is malformed. The official page lists this status code, but does not provide the body schema or exact reasons on the visible page. ([App Marketplace][1])

Possible causes in practice:

* missing or invalid `locationId`
* invalid `source`
* malformed `sourceId`

These are reasonable implementation assumptions based on the route shape, not explicitly listed on the visible page. ([App Marketplace][1])

### Example placeholder

```json
{
  "message": "Bad Request"
}
```

---

### `401 Unauthorized`

Returned when authentication fails. The official page lists `401`, but does not show the exact response body on the visible page. ([App Marketplace][1])

### Example placeholder

```json
{
  "message": "Unauthorized"
}
```

---

### `422 Unprocessable Entity`

Returned when the request is syntactically valid but cannot be processed. The official page lists `422`, but does not expose the detailed reason schema on the visible page. ([App Marketplace][1])

### Example placeholder

```json
{
  "message": "Unprocessable Entity"
}
```

---

## Source Parameter Guidance

The official description says this endpoint works for:

* campaigns
* workflows
* bulk actions

However, the visible page does **not** list the exact accepted string values for the `source` path parameter. Because of that, you should document this field carefully in your codebase:

```text
source = one of the HighLevel-supported email stat source types
```

and verify the exact values from a successful implementation or a fuller internal schema. ([App Marketplace][1])

---

## How To Connect

### 1. Get a valid HighLevel access token

Use your existing OAuth or private integration authentication flow for HighLevel API access. The endpoint itself is clearly part of the HighLevel API docs, though this page does not spell out the token acquisition flow. ([App Marketplace][1])

### 2. Identify the location

You need the `locationId` for the sub-account whose email stats you want. This requirement is explicit in the route. ([App Marketplace][1])

### 3. Identify the source type

Choose the source category matching the object you are measuring:

* campaign
* workflow
* bulk action

This is based on the official description. ([App Marketplace][2])

### 4. Identify the source object ID

Pass the ID of that specific campaign, workflow email source, or bulk action as `sourceId`. The parameter itself is explicit in the route; the page does not provide a lookup method for obtaining it. ([App Marketplace][1])

### 5. Send the GET request

Call the endpoint and parse the returned stats payload.

---

## Example Internal Documentation Snippet

```ts
async function getCampaignStats({
  locationId,
  source,
  sourceId,
  token
}: {
  locationId: string;
  source: string;
  sourceId: string;
  token: string;
}) {
  const res = await fetch(
    `https://services.leadconnectorhq.com/emails/stats/location/${locationId}/${source}/${sourceId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json"
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Stats request failed: ${res.status}`);
  }

  return res.json();
}
```

---

## Documentation Notes For Your Repo

Because the official page visible here is very sparse, the safest way to document this endpoint in your project is:

1. Keep the route and response codes exactly as documented.
2. Mark the response schema as **“official schema not shown on public page.”**
3. Add a **captured real sample response** from your own working integration once you hit the endpoint successfully.
4. Lock down accepted `source` values in code only after confirming them from live responses or deeper official schema access.

Those cautions follow directly from what is and is not visible on the official page we accessed. ([App Marketplace][1])

---

## Minimal Summary

* **Endpoint:** `GET /emails/stats/location/{locationId}/{source}/{sourceId}` ([App Marketplace][1])
* **Purpose:** get statistics for email campaigns, workflows, or bulk actions ([App Marketplace][2])
* **Body:** none ([App Marketplace][1])
* **Documented responses:** `200`, `400`, `401`, `422` ([App Marketplace][1])
* **Official page limitation:** no visible response JSON example or expanded schema on the accessible page ([App Marketplace][1])

```
::contentReference[oaicite:27]{index=27}
```

[1]: https://marketplace.gohighlevel.com/docs/ghl/emails/get-campaign-stats "Get Campaign Statistics | HighLevel API"
[2]: https://marketplace.gohighlevel.com/docs/ghl/emails/get-campaign-stats?utm_source=chatgpt.com "Get Campaign Statistics | HighLevel API"
