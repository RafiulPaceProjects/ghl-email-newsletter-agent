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
5. local newsletter injection
6. injected draft publish

The inject step is local-first today. Structured 10-block newsletter rendering
is not implemented yet.

## Agent Responsibilities

- Validate auth before downstream operations.
- Fetch template metadata before assuming a template id.
- Use `view-content` to resolve the template and preview URL.
- Use `clone-content` to create a draft and upload HTML.
- Use `inject-content` only for local slot replacement.
- Use `publish-injected-draft.mjs` for the current injected-artifact publish path.

## Agent Non-Responsibilities

- Do not send campaigns or emails.
- Do not manage CRM records.
- Do not claim builder JSON support that the repo does not implement.

## Location And Identity Rules

- Always operate with a valid `locationId`.
- Never assume a template id without fetching or selecting it first.
- Prefer `templateId` for live mutations.
- Treat `previewUrl` as a useful bridge for clone analysis, not as proof of
  final publish state.

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

Publish wrapper step:

```json
{
  "locationId": "loc_123",
  "templateId": "tmpl_123",
  "html": "<html>...</html>",
  "editorType": "html",
  "updatedBy": "publish-injected-draft"
}
```

## Newsletter Injection Status

### Supported now
- one explicit body slot token
- one bundled newsletter block partial
- local injected HTML artifact generation
- publish handoff through the clone wrapper

### Missing now
- up to 10 repeatable blocks
- structured heading/body/image/CTA input contract
- optional-image rendering
- dedicated direct publish command inside `inject-content`

## Error Handling Rules

- Handle `400`, `401`, `404`, and `422` distinctly when possible.
- Preserve response snippets for diagnostics.
- Fail fast on missing env or missing template identity.
- Do not downgrade pagination or preview-fetch failures into "template not found".

## Best Practices

- Keep create and update logic separate.
- Log enough response context to troubleshoot safely.
- Keep generated HTML simple and deterministic.
- Preserve machine-readable JSON at CLI boundaries.

## Summary

This repo currently supports a practical draft-clone and local injection flow,
but not yet a fully structured 10-block newsletter publishing engine.
