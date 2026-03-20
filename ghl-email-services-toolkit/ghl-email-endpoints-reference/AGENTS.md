# AGENTS.md

## Purpose

This document describes how an automation agent should reason about the
GoHighLevel email-template endpoints used by this repository.

Covered endpoints:

- `GET /emails/builder`
- `POST /emails/builder`
- `POST /emails/builder/data`

## Current Repository Reality

The repository does not expose one single "do everything" command. The current
implemented flow is split across services:

1. auth validation
2. template fetch or selection
3. preview HTML retrieval
4. draft clone
5. local sample newsletter injection
6. injected draft publish

The inject step is local-first today. Structured final multi-input rendering is
not implemented yet.

## Intended Next Publish Shape

The preferred target architecture is:

```text
view-content -> research-content -> pexels selection -> ghl-media-usage -> inject-content final render -> clone-content explicit publish
```

The desired steady-state publish input is explicit rendered HTML from
`inject-content`, not implicit "newest artifact on disk" discovery.

## Agent Responsibilities

- Validate auth before downstream operations.
- Fetch template metadata before assuming a template id.
- Use `view-content` to resolve the template and preview URL.
- Use `inject-content` as the documented final render owner in the target flow.
- Use `clone-content` to create drafts and publish explicit HTML.
- Treat `publish-injected-draft.mjs` as the current transitional publish path.

## Agent Non-Responsibilities

- Do not send campaigns or emails.
- Do not manage CRM records.
- Do not claim builder JSON support that the repo does not implement.

## Location And Identity Rules

- Always operate with a valid `locationId`.
- Never assume a template id without fetching or selecting it first.
- Prefer `templateId` for live mutations.
- Treat `previewUrl` as a useful bridge for clone analysis and future render
  planning, not as proof of final publish state.

## Current Endpoint Usage In This Repo

### Fetch templates
- Endpoint: `GET /emails/builder`
- Used by:
  - `authentication-ghl` as a probe
  - `ghl-fetch-templates` for inventory snapshot
  - `view-content` for selection and pagination

### Create draft
- Endpoint: `POST /emails/builder`
- Current observed payload in `clone-content`:

```json
{
  "locationId": "loc_123",
  "name": "Newsletter Draft",
  "type": "html"
}
```

### Update draft HTML
- Endpoint: `POST /emails/builder/data`
- Current observed payloads in this repo:

Clone step:

```json
{
  "locationId": "loc_123",
  "templateId": "tmpl_123",
  "html": "<html>...</html>",
  "editorType": "html",
  "updatedBy": "clone-content"
}
```

Transitional publish wrapper step:

```json
{
  "locationId": "loc_123",
  "templateId": "tmpl_123",
  "html": "<html>...</html>",
  "editorType": "html",
  "updatedBy": "publish-injected-draft"
}
```

## Contract Direction

### Supported now
- one explicit body slot token
- one bundled newsletter sample partial
- local injected HTML artifact generation
- publish handoff through the transitional clone wrapper

### Planned next
- ordered research HTML fragments upstream of render
- rich GHL image objects upstream of render
- final Jinja render in `inject-content`
- explicit rendered HTML handoff into `clone-content`

## Error Handling Rules

- Handle `400`, `401`, `404`, and `422` distinctly when possible.
- Preserve response snippets for diagnostics.
- Fail fast on missing env or missing template identity.
- Do not downgrade pagination or preview-fetch failures into "template not found".

## Best Practices

- Keep create and update logic separate.
- Log enough response context to troubleshoot safely.
- Keep rendered HTML handoff explicit in the target design.
- Preserve machine-readable JSON at CLI boundaries.

## Summary

This repo currently supports a practical clone plus local sample-injection flow.
The docs now align to a target architecture where `inject-content` owns final
render and `clone-content` owns explicit publish from rendered HTML.
