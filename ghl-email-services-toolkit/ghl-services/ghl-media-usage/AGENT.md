# AGENT.md

## Purpose

Document the media-upload boundary that is planned for the newsletter image
pipeline and describe the partial uploader source already present here.

## Current Status In This Checkout

- `ghl_uploader/src/` exists and contains early upload-oriented source files.
- No package-local `package.json`, tests, or root validation wiring exist for
  this folder yet.
- Treat this area as partial implementation work, not as a finished runtime
  stage.

## Intended Position In Pipeline

```text
research-driven image candidates -> media qualification -> ghl-media-usage -> inject-content final render
```

## Intended Responsibilities

- Resolve or create the scoped GHL media folder when needed.
- Upload approved image inputs into the managed GHL media scope.
- Return rich image objects that are ready for final render use.

## Non-Responsibilities

- Do not source images from Pexels directly in this folder.
- Do not assemble final newsletter HTML.
- Do not publish templates through the email builder endpoints.

## Storage Boundary

- Keep any future media artifacts clearly separated from template previews and
  injected HTML artifacts.
- When this folder gains runtime tooling, document its output locations before
  wiring it into root validation.

## Routing Rule

- Route future "upload newsletter images to GHL and return render-ready image
  metadata" work to this folder.
- Route doc-only future-media planning here as well, but label it as planned or
  partial when the runtime implementation is not complete.
