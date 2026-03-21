# AGENT.md

## Purpose

Own the newsletter render step for `ghl-update-template`.

## How An Agent Should Use This Package

### Current runtime reality
- This package now owns one explicit render contract for newsletter HTML.
- `render-newsletter.mjs` renders one output artifact from preview HTML and
  structured JSON input.
- `inject-sample.mjs` remains available as a legacy local helper, not the
  preferred automation contract.

### Intended next responsibility
- This package becomes the final Jinja render boundary.
- It should assemble final publishable HTML only after upstream content and
  final GHL-hosted image links are ready.
- It should hand explicit rendered HTML to `../clone-content`, not rely on
  newest-artifact discovery as the preferred steady state.

## Current Entry Points

- `render-newsletter.mjs`: render one explicit newsletter artifact from
  `--preview-html` plus `--render-input`.
- `inject-sample.mjs`: replace the slot token with the sample newsletter block
  and write a legacy output artifact.
- `sample-newsletter-block.jinja.html`: block template used by both the
  explicit renderer and the legacy helper.
- `test/inject-sample.test.mjs`: current package-local test coverage.
- `test/render-newsletter.test.mjs`: explicit render contract coverage.

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

### Explicit render contract
- Inputs:
  - `--preview-html` path to a local preview file
  - `--render-input` path to a JSON file containing newsletter fields plus
    either `newsletter.bodyHtml` or `contentFragments[]`
- Behavior:
  - validates the preview file and JSON input
  - enforces exactly one `[[[NEWSLETTER_BODY_SLOT]]]` token
  - renders one newsletter block from explicit input
  - writes a timestamped artifact to `render-output/`
- Output:
  - structured JSON with `sourcePreview`, `renderInputPath`, `outputPath`,
    `contentFragmentCount`, `imageCount`, and `slotToken`

### Legacy sample helper
- Input: `--preview-html` path to a local preview file.
- Output: structured JSON with `sourcePreview`, `sampleBlockPath`,
  `outputPath`, and `slotToken`.

## Responsibility

### Current runtime
- Validate preview HTML and render-input files.
- Enforce single-slot replacement for `[[[NEWSLETTER_BODY_SLOT]]]`.
- Generate a timestamped rendered HTML artifact under `render-output/`.
- Hand off publication responsibility to
  `../clone-content/publish-injected-draft.mjs --rendered-html ...`.

### Planned next
- Accept explicit upstream content and image contracts.
- Render final publishable HTML as the last content-assembly step.
- Keep render logic separate from live GoHighLevel mutation.

## Limitations In Runtime

- Only one newsletter block layout is supported today.
- No explicit research-content handoff exists yet.
- No GHL image-object handoff exists yet.
- No direct render-to-publish API exists yet; the package still hands off a
  rendered artifact path to `clone-content`.

## Test Contract

- Automated tests use Node's built-in test runner.
- Primary current coverage targets:
  - `render-newsletter.mjs`
  - `inject-sample.mjs`
- Future render coverage should validate:
  - ordered fragment assembly
  - GHL image object injection
  - final render artifact output
- Publish execution belongs to `clone-content`, not this package.

## References

- Existing test: `./test/inject-sample.test.mjs`
- Explicit render test: `./test/render-newsletter.test.mjs`
- Current runtime schemas: `../../../contracts/current-runtime/`
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
- `node ghl-services/ghl-update-template/inject-content/render-newsletter.mjs --preview-html ./path/to/preview.html --render-input ./path/to/render-input.json`
