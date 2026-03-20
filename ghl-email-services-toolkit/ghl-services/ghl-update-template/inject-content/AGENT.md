# AGENT.md

## Purpose
Planned service for injecting rendered newsletter HTML into a template and sending update requests.

## Current Status
Planned only. No implementation files exist yet.

## Intended Responsibility
- Implement content update flow using POST /emails/builder/data.
- Build and validate dnd/html payload structure.
- Execute update and return deterministic JSON result.

## Expected Inputs
- locationId and token from shared env.
- templateId from view-content or clone-content output.
- rendered HTML content payload.

## Expected Outputs
- Structured result with status, diagnostics, and errorCode.
- Update confirmation metadata for downstream verification.

## Integration Dependencies
- Must reuse authentication checks.
- Should use template identity from view-content results.
- Must follow endpoint guidance in ghl-email-endpoints-reference/update-template.md.

## Guardrails for Future Implementation
- Keep payload validation strict before API call.
- Preserve a debug-safe response snippet strategy.
- Avoid mixing preview-scraping concerns into update logic.

## Routing Rule
- Route any "inject/update template content" implementation to this folder.
