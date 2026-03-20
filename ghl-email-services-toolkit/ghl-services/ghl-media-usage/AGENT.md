# AGENT.md

## Purpose

Planned service boundary for GHL media upload and hosted-link resolution in the
newsletter image pipeline.

## Status

- Planned module only.
- No runtime implementation exists in this folder yet.

## Intended Position In Pipeline

```text
pexels normalized selections -> ghl-media-usage -> inject-content final render
```

## Intended Inputs

- normalized Pexels image selections
- shared auth env from `authentication-ghl/.env`
- target location id

## Intended Responsibilities

- Resolve or create the scoped GHL media folder when needed.
- Upload approved image inputs into the managed GHL media scope.
- Re-read media records to resolve canonical hosted GHL URLs.
- Return rich image objects that are ready for final render use.

## Intended Outputs

Per image, the documented target output should include:

- slot name
- GHL hosted URL
- GHL media or file id
- alt text
- attribution metadata
- retained provider metadata needed downstream

These outputs are render-ready objects, not raw Pexels payloads and not generic
file URLs alone.

## Non-Responsibilities

- Do not source images from Pexels directly.
- Do not assemble final newsletter HTML.
- Do not publish templates through the email builder endpoints.

## References

- `../../ghl-medias-enpoints-reference/AGENTS.md`
- `../../pexels-api-references/NORMALIZATION.md`
- `../ghl-update-template/inject-content/AGENT.md`

## Routing Rule

- Route future "upload newsletter images to GHL and resolve final render-ready
  links" work to this folder.
