# Agent operating contract

## Non-negotiable invariants
- Portable Pi package: Node 22.19+, Pi 1.1.0 API baseline.
- No machine paths, local model servers, credentials, memories or production policy.
- Cloud calls use Pi's registry; never resolve credentials yourself.
- Host evidence and independent reviews, never worker claims, decide completion.
- Gate commands require owner consent or explicit trusted-project CI opt-in.
- Preserve Pi permission hooks; this workflow is not an OS sandbox.
- Judge reads stay inside the real project root; apply secret/symlink checks.
- State follows the Pi session branch; reject concurrent goal mutations.
- Passed gates/proof remain locked; amendments need review and reapproval.
- Final acceptance re-runs every gate and the locked proof.
- Rendering cannot alter goal state; timers start only in active TUI sessions.

## Authoritative navigation
| Concern | Start here | Owning entrypoint |
|---|---|---|
| Human onboarding | [root hub](README.md) | package.json Pi manifest |
| Contracts/configuration | [governance roadsign](00_system/README.md) | CONFIGURATION.md |
| Golden fixtures | [fixture roadsign](01_raw/README.md) | plan.json |
| Runtime and component boundaries | [runtime roadsign](02_app/README.md) | extension.ts |
| Model-facing procedure | [skill roadsign](02_app/skills/goal/README.md) | SKILL.md |
| Validation/release | [operations roadsign](03_ops/README.md) | audit.mjs |
| Superseded material | [quarantine roadsign](99_archive/README.md) | move-only archive |

Follow roadsigns before opening implementation. Scope searches to the owning
layer; do not load the entire package or unrelated harness/session state.

## Structure and change boundaries
- [ACLSD contract](00_system/ACLSD.md) governs docs and layer responsibilities.
- [Mechanical policy](00_system/scaffolding.json) is the root/import allowlist.
- Root holds only entrypoints and required package metadata, never loose scripts.
- READMEs: root <=100 lines, every directory <=150; AGENTS.md <=200.
- Each directory roadsign answers job, conventions, permission/dependency
  boundaries and entrypoints; includes links, parent exit and Last updated.
- Runtime imports only allowed app modules, Node stdlib and declared Pi peers.
- Tests/release tools may depend on runtime; runtime never depends on ops/archive.
- 01_raw fixtures are immutable baselines; add reviewed fixtures, do not weaken them.
- Move superseded material to 99_archive; never delete it as cleanup.
- Exploratory artifacts belong outside the source package in a designated
  disposable workspace. Never ship scratch files, sessions or credentials.
- Only AGENTS.md is canonical for this Pi package. Other harness bindings, if
  introduced, must be symlinks to it, not independent instruction copies.
- Keep source/runtime contracts stable; preserve user work and use small edits.

## Golden paths and validation hierarchy
1. Read the subsystem roadsign, relevant code, callers/configuration and tests.
2. Core change: `node --test 03_ops/core.test.mjs`.
3. Cloud adapter: `node --test 03_ops/roles.test.mjs`; HUD: hud.test.mjs.
4. Orchestration: `node --test 03_ops/runner.test.mjs`.
5. Structure policy: `node --test 03_ops/audit.test.mjs`.
6. Whole package: `npm run verify` (audit first, all offline tests second).
7. Optional real-Pi offline adapter check:
   `node 03_ops/host-smoke.mjs <installed-pi-package-directory>`.
8. Release: `npm run pack -- ../pi-goal-portable.zip` or `npm pack`;
   both must pass offline verification first.

Report VERIFIED, INFERRED or UNVERIFIED with actual exit status. Live cloud
tests are manual/billable; never substitute mock-model proof for live evidence.
Select licensing before public open-source release.
