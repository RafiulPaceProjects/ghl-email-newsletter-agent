# AGENT.md

## Purpose
Shared routing guide for all service-level tests in `ghl-services`.
Use this folder as the top-level entry point when the task is about test coverage, test structure, or cross-package verification.

## Scope
- Package-local unit and integration-style tests under each service `test/` folder.
- Test runner setup using Node's built-in test runner.
- Shared testing conventions for mocks, fixtures, temp files, and side-effect control.
- Style and quality checks driven by `gts`, `tsc`, and package scripts.

## Test Layout
- `authentication-ghl/test`: auth probe behavior and error mapping.
- `ghl-fetch-templates/test`: fetch workflow and snapshot persistence.
- `ghl-update-template/view-content/test`: template selection and preview retrieval.

## Default Workflow
1. Keep tests close to the package they validate.
2. Prefer exported function tests over shelling out to CLIs unless CLI behavior is the target.
3. Mock network calls deterministically.
4. Restore environment variables and filesystem state after each test.
5. Run `npm run fix`, `npm run typecheck`, `npm test`, and `npm run lint` in the touched package.

## Guardrails
- Do not hit live GHL endpoints in automated tests.
- Keep tests fast, isolated, and repeatable.
- Avoid writing persistent artifacts unless the test also cleans them up.
- When adding a new service package, add its `test/AGENT.md` alongside the first test file.

## Routing Rule
- Route broad "add or improve tests" work here first, then continue into the specific package test folder.
