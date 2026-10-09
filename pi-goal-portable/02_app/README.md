# Runtime roadsign

## Job
Own executable /goal orchestration and presentation. The extension is the Pi
adapter; domain state, cloud roles and the HUD are separate local concerns.

## Conventions
extension.ts is the only registered extension. .mjs files are direct Node modules,
one concern per file. Named exports are internal APIs unless used by the adapter.
skills/ contains discoverable instruction bundles, not executable extensions.

## Dependencies and permission boundaries
No ops, fixture, archive or governance-code imports. External imports are Node
stdlib and Pi-provided peers. Cloud requests go through Pi's registry; host
commands go through nested tools so ordinary permission hooks remain active.
The exact dependency graph is enforced by [policy](../00_system/scaffolding.json).
HUD is presentation-only; roles cannot execute shell commands or mutate state
except through the host's explicit bookkeeping callbacks.

## Entrypoints and map
| File/directory | Owner / useful symbols | Verify |
|---|---|---|
| [extension.ts](extension.ts) | Registers /goal, goal_update and lifecycle hooks | host-smoke |
| [runner.mjs](runner.mjs) | createRunner: consent, baselines, gates, recovery, final audit | runner.test |
| [core.mjs](core.mjs) | validatePlan, fingerprint, capsule, restore: DAG/session invariants | core.test |
| [config.mjs](config.mjs) | defaults, validateConfig, loadConfig: project-relative options | core.test |
| [roles.mjs](roles.mjs) | callRole, safeReadPath: bounded cloud calls/read access | roles.test |
| [hud.mjs](hud.mjs) | frameLines, createHud: pure pixel frames and disposable binding | hud.test |
| [skills/](skills/README.md) | Model-facing /goal procedure | audit + host-smoke |

Read just the owner and its direct dependencies:
extension -> runner + hud; runner -> config + core + roles; roles/hud -> core.
core/config use only Node stdlib. Tests flow in the opposite direction.

Next: [operations/test map](../03_ops/README.md) or
[configuration contract](../00_system/CONFIGURATION.md).
Parent: [package hub](../README.md).

Last updated: 2026-10-09
