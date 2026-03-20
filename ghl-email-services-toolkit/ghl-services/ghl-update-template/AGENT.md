# AGENT.md

## Purpose
Container for template update pipeline services.

## Current Status
Partially implemented.
- view-content: implemented.
- clone-content: implemented.
- inject-content: planned.

## Folder Roles
- view-content: locate template by id/name and pull preview HTML.
- clone-content: clone preview HTML from a base template into a new draft.
- inject-content: planned content injection/update step.

## Routing Rules
- Need template discovery or preview extraction: route to view-content.
- Need create-template shell implementation: route to clone-content.
- Need update-template payload implementation: route to inject-content.

## Handoff Contract
- view-content should produce validated template identity and preview context.
- clone-content should eventually produce a templateId for downstream update.
- inject-content should eventually produce update request payload and execution result.

## Guardrails
- Keep each child folder single-purpose.
- Clearly mark planned behavior vs implemented behavior in docs and code.
- Avoid blending preview parsing logic with update payload execution logic.
