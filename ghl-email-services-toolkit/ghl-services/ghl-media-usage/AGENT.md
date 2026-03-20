# AGENT.md

## Purpose

Implemented service boundary for GHL media upload and hosted-link resolution in the
newsletter image pipeline.

## Status

- `ghl-media-usage/ghl_uploader` is now an implemented runtime subpackage
  for uploading qualified artifacts to GHL and directly resolving final CDN URLs.
- `ghl-media-usage/pexel_downloader` is now an implemented runtime subpackage
  for Pexels auth, search, normalization, and local downloads.
- `ghl-media-usage/Image_Qualifyer` is now an implemented runtime subpackage
  for editorial scoring, ranking, and final slot selection before upload.

## Intended Position In Pipeline

```text
research-driven pexels candidates -> pexel_downloader downloads ->
Image_Qualifyer final selection -> ghl-uploader -> inject-content final render
```

## Intended Inputs

- downloader manifests and normalized Pexels candidate images
- final selected `Hero` and `Secondary` images from `Image_Qualifyer`
- shared auth env from `authentication-ghl/.env`
- target location id

## Storage Boundary

- Candidate downloads belong under
  `ghl-media-usage/pexel_downloader/downloads/`.
- `Image_Qualifyer/output/` should keep only qualifier JSON artifacts and the
  two approved images copied for handoff.

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
