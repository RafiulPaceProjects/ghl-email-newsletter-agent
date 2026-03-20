# AGENT.md

## Purpose
Shared routing guide for all service-level tests in `ghl-services`.
Use this folder as the top-level entry point when the task is about test coverage, test structure, or cross-package verification.

## How An Agent Should Think About Tests Here
- The current repository uses Node's built-in test runner.
- Most coverage should target importable functions, not CLI wrappers.
- Use deterministic mocks and temp files instead of live GHL traffic.

## Inputs / Outputs / Contracts
- Inputs:
  - package-local source modules
  - mocked `global.fetch`, child-process boundaries, env state, and temp files
- Outputs:
  - package-local tests under each `test/` folder
  - repeatable assertions over JSON contracts and side effects

## Scope
- Shared testing conventions for mocks, fixtures, temp files, and side-effect control
- Package-level validation commands driven by `gts`, `tsc`, and package scripts
- Guidance for when to use direct function tests versus wrapper-level tests

## Current Conventions
- Keep tests inside each package `test/` folder.
- Use `node --import tsx --test` for TypeScript packages.
- Use `node --test` for plain `.mjs` packages.
- Restore `process.env`, `global.fetch`, and any filesystem changes between tests.
- Use temp directories where practical.
- Use a local HTTP server only when a wrapper test needs realistic request inspection.

## Constraints And Rules
- Do not hit live GHL endpoints in automated tests.
- Keep tests fast, isolated, and repeatable.
- Avoid writing persistent artifacts unless the test also cleans them up.
- When adding a new service package, add its `test/AGENT.md` alongside the first test file if the package does not already have one.

## References
- `../authentication-ghl/test/checkGhlConnection.test.ts`
- `../ghl-fetch-templates/test/fetchTemplates.test.ts`
- `../ghl-update-template/view-content/test/viewTemplate.test.ts`
- `../ghl-update-template/view-content/test/viewPreviewUrl.test.ts`
- `../ghl-update-template/clone-content/test/cloneTemplate.test.ts`
- `../ghl-update-template/clone-content/test/publishInjectedDraft.test.ts`
- `../ghl-update-template/inject-content/test/inject-sample.test.mjs`
- `../ghl-update-template/clone-content/DATAFLOW.md`

## Example Commands
- `npm run test`
- `npm --prefix ghl-services/ghl-update-template/view-content test`
