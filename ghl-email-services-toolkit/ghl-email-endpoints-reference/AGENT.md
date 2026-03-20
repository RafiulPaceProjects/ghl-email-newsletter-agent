# AGENT.md

## Purpose
This folder owns endpoint-level documentation for GoHighLevel email-template
automation.

## How An Agent Should Use This Folder
- Start here when the question is about request shape, response behavior, or
  API constraints.
- Compare these docs against the current runtime code before changing them.
- Prefer documenting observed request bodies when the public docs do not expose
  full schemas clearly.

## Inputs / Outputs / Contracts
- Inputs:
  - current runtime behavior from `ghl-services`
  - published HighLevel route and status-code behavior
- Outputs:
  - endpoint-specific docs for fetch, create, and update
  - workflow notes for how the repo currently uses those endpoints

## Files
- `AGENTS.md`: higher-level automation behavior and workflow policy
- `templates-fetch.md`: `GET /emails/builder`
- `create-new-template.md`: `POST /emails/builder`
- `update-template.md`: `POST /emails/builder/data`

## Constraints And Rules
- Do not claim unsupported features are already implemented.
- When runtime code and docs conflict, update the docs to match runtime code.
- Keep endpoint docs explicit about what is observed in this repo versus what is
  inferred from public API docs.

## Example Use Cases
- "What body does clone-content send to create a draft?"
- "What fields does the publish wrapper send to update a template?"
- "Which HTTP failures are handled separately?"
