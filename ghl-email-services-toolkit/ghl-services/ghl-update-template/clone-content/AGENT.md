# AGENT.md

## Purpose
Service for creating a new draft template by cloning HTML from a base template preview URL.

## How An Agent Should Use This Package
- Use this package for live draft creation and live publish handoff.
- Reuse `view-content` for selection instead of reimplementing lookup.
- Treat preview HTML as transport content for cloning, not as something to transform here.

## Responsibility
- Select a base template by id or name.
- Fetch HTML from the selected template preview URL.
- Create a new draft template using `POST /emails/builder`.
- Push the fetched HTML into the new template with `POST /emails/builder/data`.
- Return created template metadata for downstream steps.

## Inputs / Outputs / Contracts
- `locationId` from shared env
- auth token from shared env
- base template name or template id
- optional draft name override
- Structured JSON with `ok`, `status`, `message`, and `errorCode`.
- `baseTemplate` summary and `clonedTemplate` summary.
- Publish wrapper output includes:
  - the clone result
  - the injected HTML source file path
  - the final publish request result

## Integration Dependencies
- Must reuse auth checks from `authentication-ghl`.
- Must reuse template lookup behavior from `view-content`.
- Should align request semantics with endpoint docs in `../../../ghl-email-endpoints-reference/create-new-template.md`.

## Guardrails
- Keep CLI contract machine-readable and consistent with other services.
- Validate required fields before making API calls.
- Include HTTP-specific error mapping and diagnostics snippets.
- Treat preview HTML as the source payload for the clone step only.

## Test Contract
- Automated tests use Node's built-in test runner.
- Primary coverage targets:
  - `src/cloneTemplate.ts`
  - `publish-injected-draft.mjs`
- CLI wrappers should only need thin contract checks.

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
- Route any "clone template into a new draft" feature work to this folder.

## Example
- `npm --prefix ghl-services/ghl-update-template/clone-content run clone:template -- --template-id=<id> --draft-name="Newsletter Draft"`
