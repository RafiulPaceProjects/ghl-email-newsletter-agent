# AGENT.md

## Purpose
Service for creating a new draft template by cloning HTML from a base
template preview URL.

## Current Status
Implemented and active.

## Intended Responsibility
- Select a base template by id or name.
- Fetch HTML from the selected template preview URL.
- Create a new draft template using POST /emails/builder.
- Push the fetched HTML into the new template with POST /emails/builder/data.
- Return created template metadata for downstream steps.

## Expected Inputs
- locationId (from shared env)
- auth token (from shared env)
- base template name or template id
- optional draft name override

## Expected Outputs
- Structured JSON with ok/status/message/errorCode.
- baseTemplate summary and clonedTemplate summary.

## Integration Dependencies
- Must reuse auth checks from authentication-ghl.
- Must reuse template lookup behavior from view-content.
- Should align request semantics with endpoint docs in
  ghl-email-endpoints-reference/create-new-template.md.

## Guardrails
- Keep CLI contract machine-readable and consistent with other services.
- Validate required fields before making API calls.
- Include HTTP-specific error mapping and diagnostics snippets.
- Treat preview HTML as the source payload for the clone step only.

## Routing Rule
- Route any "clone template into a new draft" feature work to this folder.
