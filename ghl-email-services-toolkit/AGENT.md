# AGENT.md

## Purpose
This is the routing document for the ghl-email-services-toolkit workspace.
Use this file first when deciding where to edit code.

## Scope
- Owns routing across toolkit folders.
- Defines implementation status and handoff order.
- Does not define low-level endpoint payload contracts (see endpoint reference docs).

## Folder Map
- ghl-email-endpoints-reference: API behavior docs and workflow constraints.
- ghl-services: executable TypeScript services and CLIs.

## Canonical Workflow
1. Validate environment and API access in ghl-services/authentication-ghl.
2. Fetch available templates in ghl-services/ghl-fetch-templates.
3. Locate a specific template and optionally pull preview HTML in ghl-services/ghl-update-template/view-content.
4. Planned next steps (not yet implemented): clone-content then inject-content.

## Task Routing
- Task: token/location troubleshooting.
  - Route to: ghl-services/authentication-ghl.
- Task: pull latest template list to JSON.
  - Route to: ghl-services/ghl-fetch-templates.
- Task: select template by id/name or fetch preview URL HTML.
  - Route to: ghl-services/ghl-update-template/view-content.
- Task: create template shell.
  - Route to: ghl-services/ghl-update-template/clone-content (planned).
- Task: inject newsletter HTML into template structure.
  - Route to: ghl-services/ghl-update-template/inject-content (planned).

## Guardrails
- Do not hardcode token or location values in source files.
- Keep cross-service behavior consistent with shared env usage from authentication-ghl/.env.
- Preserve structured JSON result contracts in CLI outputs.
- Mark planned folders as planned until code exists.

## Handoff Rules
- Authentication failures always block downstream fetch/view/update tasks.
- Fetch output can be used as a quick index, but view-content should still query live data when precision is required.
- Preview dump is auxiliary and should not be treated as update payload source without validation.
