# Golden fixture roadsign

## Job
Own small, immutable input fixtures for deterministic offline tests. Fixtures
describe intended contracts; they are not production model responses or proof.

## Conventions
Use descriptive lower-case .json filenames; valid JSON only, no executable code.
Review added fixtures with their owning test. Do not weaken an existing fixture
to make a failing implementation pass.

## Dependencies and permission boundaries
No imports or runtime writes. Operations tests read fixtures; production never
loads this directory. No captured sessions, API responses or secrets.

## Entrypoints and map
- [plan.json](plan.json): two-node implementation/documentation DAG with acceptance
  coverage and a locked Node-test proof.
- Consumers: [core tests](../03_ops/core.test.mjs) validate its DAG,
  [runner tests](../03_ops/runner.test.mjs) exercise host transitions.

Next: [runtime domain map](../02_app/README.md) or
[verification map](../03_ops/README.md).
Parent: [package hub](../README.md).

Last updated: 2026-10-09
