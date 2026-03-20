# AGENT.md

## Purpose
Planned service for creating a new template shell before content injection.

## Current Status
Planned only. No implementation files exist yet.

## Intended Responsibility
- Implement template creation using POST /emails/builder.
- Accept input describing new template metadata.
- Return created templateId and minimal metadata for downstream steps.

## Expected Inputs
- locationId (from shared env)
- auth token (from shared env)
- template name and optional metadata fields

## Expected Outputs
- Structured JSON with ok/status/message/errorCode.
- createdTemplate summary including templateId/name.

## Integration Dependencies
- Must reuse auth checks from authentication-ghl.
- Should align request semantics with endpoint docs in ghl-email-endpoints-reference/create-new-template.md.

## Guardrails for Future Implementation
- Keep CLI contract machine-readable and consistent with other services.
- Validate required fields before making API calls.
- Include HTTP-specific error mapping and diagnostics snippets.

## Routing Rule
- Route any "create template" feature work to this folder.
