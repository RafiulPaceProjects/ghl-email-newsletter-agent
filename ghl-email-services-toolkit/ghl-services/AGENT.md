# AGENT.md

## Purpose
This folder is the execution layer for GoHighLevel email-template operations.
Each child folder is a service with a focused CLI and result contract.

## Service Routing
- authentication-ghl: validate token and location scope.
- ghl-fetch-templates: fetch templates and persist JSON snapshot.
- ghl-update-template/view-content: search/select template and dump preview HTML.
- ghl-update-template/clone-content: planned create-template service.
- ghl-update-template/inject-content: planned content-injection service.

## Shared Conventions
- Node.js >= 20.
- TypeScript with module type set to ESM.
- CLI output is structured JSON and non-zero exit code on failure.
- Environment values are loaded from authentication-ghl/.env.
- API base URL: https://services.leadconnectorhq.com.
- API version header: 2021-07-28.

## Dependency Order
1. Run auth checks before fetch/view/update workflows.
2. Use fetch/view to locate template ids before update operations.
3. Planned clone/inject services should consume auth + selection outputs.

## Guardrails
- Keep service boundaries narrow and explicit.
- Do not duplicate auth logic in every service; reuse authentication-ghl contracts.
- Keep errorCode unions explicit and machine-parseable.
