# Verification and release roadsign

## Job
Own deterministic quality gates, optional real-Pi integration and share-asset
packaging. Runtime execution must not depend on this directory.

## Conventions
*.test.mjs are Node test suites. Other .mjs files are explicit operator commands.
Write generated archives outside the source root; never commit test scratch,
provider credentials or session data.

## Dependencies and permission boundaries
Tests may import app modules and read golden fixtures. Packaging uses Node and
Python 3 stdlib; no personal state or model artifacts are copied. Offline tests
must never call a cloud provider. Live smoke testing is explicit and billable.

## Entrypoints and map
| File | Check / owner |
|---|---|
| [audit.mjs](audit.mjs) | auditPackage: roadsigns, links, root, import graph and portability |
| [audit.test.mjs](audit.test.mjs) | Negative structure/link/map/boundary fixtures |
| [core.test.mjs](core.test.mjs) | DAG, schema, state, config, reviewer path boundaries |
| [runner.test.mjs](runner.test.mjs) | Consent, recovery, final reruns, cancellation/budgets |
| [roles.test.mjs](roles.test.mjs) | Provider-neutral dispatch, JSON/errors/read budgets |
| [hud.test.mjs](hud.test.mjs) | Theme/width/lifecycle and stationary paused frames |
| [host-smoke.mjs](host-smoke.mjs) | Real Pi loader/bash/read; scripted cloud and worker |
| [package.mjs](package.mjs) | Full offline gate, allowlisted deterministic ZIP |

## Golden commands
- Narrow: node --test 03_ops/<owner>.test.mjs.
- Broad: npm run verify (audit, then all tests).
- Integration: node 03_ops/host-smoke.mjs <installed-pi-package-directory>.
- Release: npm run pack -- ../pi-goal-portable.zip; npm pack also runs prepack.
- Never infer real cloud quality from scripted model answers.

Next: [validation receipt](../00_system/VALIDATION.md) and
[manual cloud smoke test](../00_system/CONFIGURATION.md).
Parent: [package hub](../README.md).

Last updated: 2026-10-09
