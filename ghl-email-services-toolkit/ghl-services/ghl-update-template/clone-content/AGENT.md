# AGENT.md

## Purpose

Service for creating or updating GoHighLevel HTML drafts from explicit HTML
input.

## How An Agent Should Use This Package

### Current runtime
- Use this package for live draft creation and the current transitional publish
  wrapper.
- Reuse `view-content` for selection instead of reimplementing lookup.
- Treat preview HTML as the current clone payload source.

### Intended next responsibility
- Use this package for explicit draft create/update only.
- Accept rendered HTML from `inject-content` as the preferred publish input.
- Do not make artifact discovery on disk the preferred steady-state contract.

## Responsibility

### Current runtime
- Select a base template by id or name.
- Fetch HTML from the selected template preview URL.
- Create a new draft template using `POST /emails/builder`.
- Push HTML into the new template with `POST /emails/builder/data`.
- Return created template metadata for downstream steps.

### Planned next
- Consume explicit rendered HTML from `inject-content`.
- Create a fresh draft or update a selected draft with that HTML.
- Return publish diagnostics without taking ownership of final render assembly.

## Inputs / Outputs / Contracts

- `locationId` from shared env
- auth token from shared env
- base template name or template id
- optional draft name override
- structured JSON with `ok`, `status`, `message`, and `errorCode`
- `baseTemplate` summary and `clonedTemplate` summary

### Preferred next-state publish input
- selected template identity
- explicit rendered HTML from `inject-content`

### Transitional current wrapper output
- clone result
- injected HTML source file path
- final publish request result

## Integration Dependencies

- Must reuse auth checks from `authentication-ghl`.
- Must reuse template lookup behavior from `view-content`.
- Should align request semantics with endpoint docs in
  `../../../ghl-email-endpoints-reference/create-new-template.md`.

## Guardrails

- Keep CLI contract machine-readable and consistent with other services.
- Validate required fields before making API calls.
- Include HTTP-specific error mapping and diagnostics snippets.
- Keep final render assembly outside this package in the intended next design.

## Test Contract

- Automated tests use Node's built-in test runner.
- Primary coverage targets:
  - `src/cloneTemplate.ts`
  - `publish-injected-draft.mjs`
- Future tests should prefer explicit rendered-HTML handoff over artifact
  discovery.

## References

- Workflow doc: `./DATAFLOW.md`
- Package sources:
  - `./src/cloneTemplate.ts`
  - `./publish-injected-draft.mjs`
- Existing tests:
  - `./test/cloneTemplate.test.ts`
  - `./test/publishInjectedDraft.test.ts`
- Shared testing guide: `../../testing/AGENT.md`
- Endpoint notes:
  - `../../../ghl-email-endpoints-reference/create-new-template.md`
  - `../../../ghl-email-endpoints-reference/update-template.md`

## Routing Rule

- Route draft creation and explicit HTML publish work to this folder.
- Treat newest-artifact publishing as current transitional behavior, not the
  desired long-term contract.

## Example

- `npm --prefix ghl-services/ghl-update-template/clone-content run clone:template -- --template-id=<id> --draft-name="Newsletter Draft"`
