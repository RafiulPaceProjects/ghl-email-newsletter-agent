# AGENT.md

## Purpose

Own the newsletter render step for `ghl-update-template`.

## How An Agent Should Use This Package

### Current runtime reality
- This package is only a local sample-injection utility today.
- `inject-sample.mjs` performs one string replacement into one preview file.
- It does not yet own final multi-input rendering or direct publish.

### Intended next responsibility
- This package becomes the final Jinja render boundary.
- It should assemble final publishable HTML only after upstream content and
  final GHL-hosted image links are ready.
- It should hand explicit rendered HTML to `../clone-content`, not rely on
  newest-artifact discovery as the preferred steady state.

## Current Entry Points

- `inject-sample.mjs`: replace the slot token with the sample newsletter block
  and write an output artifact.
- `sample-newsletter-block.jinja.html`: source HTML fragment injected into the
  slot.
- `test/inject-sample.test.mjs`: current package-local test coverage.

## Target Contract

### Target inputs
- base preview/template HTML
- ordered raw HTML fragments from `ghl-services/research-content`
- rich GHL image objects from `ghl-services/ghl-media-usage`

### Target output
- rendered HTML artifact
- structured JSON metadata describing:
  - source preview or template input
  - research fragment inputs
  - image inputs
  - output artifact path or rendered result summary

## Current Inputs / Outputs / Contracts

- Input: `--preview-html` path to a local preview file.
- The current script validates that the file exists, is `.html`, and contains
  exactly one `[[[NEWSLETTER_BODY_SLOT]]]` token.
- It reads one hardcoded partial from `sample-newsletter-block.jinja.html`.
- It performs a plain string replacement and writes a timestamped artifact to
  `injection-output/`.
- Output is structured JSON with `sourcePreview`, `sampleBlockPath`,
  `outputPath`, and `slotToken`.

## Responsibility

### Current runtime
- Validate the preview HTML input file.
- Enforce single-slot replacement for `[[[NEWSLETTER_BODY_SLOT]]]`.
- Generate a timestamped injected HTML artifact under `injection-output/`.
- Hand off publication responsibility to
  `../clone-content/publish-injected-draft.mjs`.

### Planned next
- Accept explicit upstream content and image contracts.
- Render final publishable HTML as the last content-assembly step.
- Keep render logic separate from live GoHighLevel mutation.

## Limitations In Runtime

- Only one hardcoded block can be injected today.
- No structured content input exists for multiple render inputs.
- No explicit research-content handoff exists yet.
- No GHL image-object handoff exists yet.
- No optional-image rendering is implemented.
- No direct render-to-publish handoff exists yet.

## Test Contract

- Automated tests use Node's built-in test runner.
- Primary current coverage target: `inject-sample.mjs`
- Future render coverage should validate:
  - ordered fragment assembly
  - GHL image object injection
  - final render artifact output
- Publish execution belongs to `clone-content`, not this package.

## References

- Existing test: `./test/inject-sample.test.mjs`
- Current sample template: `./sample-newsletter-block.jinja.html`
- Current publish wrapper: `../clone-content/publish-injected-draft.mjs`
- Shared testing guide: `../../testing/AGENT.md`
- Endpoint notes: `../../../ghl-email-endpoints-reference/update-template.md`

## Routing Rule

- Route final render and template-content assembly work to this folder.
- Route current sample local injection fixes here too, but keep them labeled as
  current runtime work rather than next-state architecture.

## Example

- `node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html`
