# AGENT.md

## Purpose
Container for template update pipeline services.

## How To Think About This Pipeline
- `view-content` resolves identity and preview context.
- `inject-content` handles local newsletter artifact generation from a saved preview.
- `clone-content` handles live draft creation.
- The current publish boundary lives in `clone-content/publish-injected-draft.mjs`, which clones a fresh draft and then publishes the newest injected artifact.

## Current Status
- `view-content`: implemented
- `clone-content`: implemented
- `inject-content`: implemented for local artifact generation only
- publish wrapper: implemented in `clone-content`

## Inputs / Outputs / Contracts
- `view-content` outputs:
  - `selectedTemplate`
  - optional preview dump artifact
- `inject-content` outputs:
  - one injected local HTML artifact
  - JSON describing the source preview and output path
- `clone-content` outputs:
  - `clonedTemplate`
  - create/update diagnostics
- `publish-injected-draft.mjs` outputs:
  - clone stage result
  - source injected artifact path
  - publish result diagnostics

## Routing Rules
- Template discovery or preview extraction: `view-content`
- Newsletter slot replacement or injection contract work: `inject-content`
- Draft creation or publish wrapper work: `clone-content`

## Newsletter Contract Status
- Supported today:
  - one slot token
  - one bundled block
  - local artifact handoff
  - standalone draft clone
  - wrapper-based draft publish
- Missing today:
  - 10 repeatable blocks
  - structured heading/body/image/CTA input
  - optional image handling
  - direct publish command inside `inject-content`
  - explicit selection of an injected artifact path in the wrapper

## Test Ownership
- Automated tests use Node's built-in test runner.
- `view-content` owns selection and preview tests.
- `clone-content` owns clone and publish-wrapper tests.
- `inject-content` owns slot replacement and artifact-generation tests.
- Manual smoke tests remain the right place for live API confirmation.

## References
- `../../ghl-email-endpoints-reference/templates-fetch.md`
- `../../ghl-email-endpoints-reference/create-new-template.md`
- `../../ghl-email-endpoints-reference/update-template.md`
- `./clone-content/DATAFLOW.md`

## Constraints And Rules
- Keep each child folder single-purpose.
- Do not claim structured multi-block newsletter support until code exists.
- Avoid blending preview parsing, local rendering, and live publish logic into one module.
- Do not imply that the repo already has a one-command end-to-end workflow.
