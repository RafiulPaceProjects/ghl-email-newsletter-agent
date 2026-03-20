# AGENT.md

## Purpose
Own the newsletter injection step for `ghl-update-template`.

## How An Agent Should Use This Package
- Use this package for local newsletter artifact generation only.
- Do not treat it as the live API publish layer.
- Document missing newsletter features explicitly instead of implying they already exist.
- Remember that downstream publishing currently happens through `clone-content/publish-injected-draft.mjs`.

## Current Status
- `inject-sample.mjs` works today as a local HTML artifact generator.
- API-backed template update execution belongs to clone-content's publish wrapper boundary.
- Structured multi-block newsletter injection is not implemented yet.

## Entry Points
- `inject-sample.mjs`: replace the slot token with the sample newsletter block and write an output artifact.
- `sample-newsletter-block.jinja.html`: source HTML fragment injected into the slot.
- `test/inject-sample.test.mjs`: current package-local test coverage.

## Inputs / Outputs / Contracts
- Input: `--preview-html` path to a local preview file.
- The script validates that the file exists, is `.html`, and contains exactly one `[[[NEWSLETTER_BODY_SLOT]]]` token.
- It reads one hardcoded partial from `sample-newsletter-block.jinja.html`.
- It performs a plain string replacement and writes a timestamped artifact to `injection-output/`.
- Output is structured JSON with `sourcePreview`, `sampleBlockPath`, `outputPath`, and `slotToken`.

## Responsibility
- Validate the preview HTML input file.
- Enforce single-slot replacement for `[[[NEWSLETTER_BODY_SLOT]]]`.
- Generate a timestamped injected HTML artifact under `injection-output/`.
- Hand off publication responsibility to `../clone-content/publish-injected-draft.mjs`.

## Expected Inputs
- preview HTML path from a prior `view-content` run
- local newsletter HTML fragment from `sample-newsletter-block.jinja.html`

## Expected Outputs
- Structured JSON describing the source preview, injected output path, and slot token used.
- A local injected HTML artifact ready for publish-wrapper pickup.

## Limitations
- Only one hardcoded block can be injected today.
- No structured content input exists for headings, bodies, CTAs, or images.
- Optional-image rendering is not implemented.
- The target "up to 10 ordered blocks" newsletter contract is not implemented.
- No builder JSON or drag-and-drop model is generated; this remains HTML-only.
- This folder does not call `POST /emails/builder/data` directly.
- This folder does not choose which artifact gets published; the wrapper currently publishes the newest injected `.html` file it finds.

## Test Contract
- Automated tests use Node's built-in test runner.
- Primary coverage target: `inject-sample.mjs`
- Publish execution belongs to clone-content's wrapper boundary, not this package.

## References
- Existing test: `./test/inject-sample.test.mjs`
- Publish wrapper: `../clone-content/publish-injected-draft.mjs`
- Workflow doc: `../clone-content/DATAFLOW.md`
- Shared testing guide: `../../testing/AGENT.md`
- Endpoint notes: `../../../ghl-email-endpoints-reference/update-template.md`

## Routing Rule
- Route any "inject local newsletter content into preview HTML" implementation to this folder.
- Route direct live publish features elsewhere until this package actually owns that API boundary.

## Example
- `node ghl-services/ghl-update-template/inject-content/inject-sample.mjs --preview-html ./path/to/preview.html`
