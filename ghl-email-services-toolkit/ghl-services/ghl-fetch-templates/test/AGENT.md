# AGENT.md

## Purpose
Owns tests for `ghl-fetch-templates`.

## How An Agent Should Think About These Tests
- Focus on the service function contract, not shell behavior.
- Treat auth validation and the fetch call as one pipeline with ordered mocks.
- Protect the snapshot file from test residue.

## Inputs / Outputs / Contracts
- Inputs:
  - in-process env values
  - mocked fetch responses
  - temporary or restored snapshot file state
- Outputs:
  - assertions over fetch metadata and file-writing behavior

## Coverage Focus
- Auth-gated fetch behavior
- Response parsing and `templateCount` derivation
- Snapshot file writing and failure handling

## Constraints And Rules
- Never leave modified snapshot data behind.
- Keep fixture payloads small but representative.
- Assert both service metadata and persistence side effects when relevant.

## Example Command
- `npm --prefix ghl-services/ghl-fetch-templates test`
