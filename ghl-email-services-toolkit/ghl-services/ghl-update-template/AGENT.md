# AGENT.md

## Purpose

Container for template update pipeline services.

## How To Think About This Pipeline

### Current runtime
- `view-content` resolves identity and preview context.
- `clone-content` handles live draft creation and draft update.
- `inject-content` handles local sample artifact generation.
- The current publish wrapper lives in
  `clone-content/publish-injected-draft.mjs`.

### Intended next architecture
- `view-content` remains read-only preview and template analysis.
- `inject-content` becomes the final Jinja render boundary.
- `clone-content` becomes explicit draft create/update only.

## Current Status

- `view-content`: implemented
- `clone-content`: implemented
- `inject-content`: implemented for local sample artifact generation only

## Intended Next Pipeline

```text
view-content -> research-content -> pexels selection -> ghl-media-usage -> inject-content render -> clone-content publish
```

## Inputs / Outputs / Contracts

### `view-content`
- outputs:
  - `selectedTemplate`
  - optional preview dump artifact
  - structural preview information useful for future render planning

### `inject-content`
- current runtime output:
  - one injected local HTML artifact
  - JSON describing the source preview and output path
- target documented output:
  - final rendered newsletter HTML
  - JSON metadata describing the preview/template input, research fragments,
    image objects, and render artifact

### `clone-content`
- current runtime output:
  - `clonedTemplate`
  - create/update diagnostics
- target documented input:
  - selected template identity
  - explicit rendered HTML from `inject-content`

## Routing Rules

- Template discovery or preview extraction: `view-content`
- Final render contract work: `inject-content`
- Draft creation or explicit publish work: `clone-content`

## Newsletter Contract Status

### Supported today
- one slot token
- one bundled sample block
- local artifact handoff
- transitional publish wrapper

### Planned next
- ordered research HTML fragments
- normalized image selections upstream of render
- GHL-hosted image links resolved before render
- final Jinja render as the last content-assembly step
- explicit rendered HTML handoff into `clone-content`

## Test Ownership

- Automated tests use Node's built-in test runner.
- `view-content` owns selection and preview tests.
- `clone-content` owns clone and publish-wrapper tests.
- `inject-content` owns sample injection tests today and should own render-stage
  tests in the next implementation phase.
- Manual smoke tests remain the right place for live API confirmation.

## References

- `../../ghl-email-endpoints-reference/templates-fetch.md`
- `../../ghl-email-endpoints-reference/create-new-template.md`
- `../../ghl-email-endpoints-reference/update-template.md`
- `./clone-content/DATAFLOW.md`

## Constraints And Rules

- Keep each child folder single-purpose.
- Do not claim multi-input final render support until code exists.
- Avoid blending preview analysis, final render, and live publish logic into
  one module.
