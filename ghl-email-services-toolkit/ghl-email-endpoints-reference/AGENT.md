# AGENT.md

## Purpose
This folder documents API endpoint behavior and operating rules for email template automation.

## What This Folder Owns
- Endpoint-level guidance for fetch/create/update flows.
- Canonical workflow and constraints for template operations.
- Error-class guidance for HTTP 400/401/404/422 paths.

## What This Folder Does Not Own
- Runtime execution code.
- CLI argument parsing.
- File writing behavior.

## Files
- AGENTS.md: high-level policy and canonical workflow for agents.
- templates-fetch.md: fetch endpoint details.
- create-new-template.md: create endpoint details.
- update-template.md: update endpoint details.

## Routing Rules
- If the task asks "what should the request look like?" route here first.
- If the task asks "where in code should I implement it?" route to ghl-services.
- When docs conflict with runtime behavior, treat runtime code as current truth and update docs here.

## Integration Notes
- Implementations in ghl-services should align with the endpoint version and constraints documented here.
- Planned services in clone-content and inject-content should use this folder as primary reference.
