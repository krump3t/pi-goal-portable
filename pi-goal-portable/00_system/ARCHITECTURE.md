# Architecture

## Flow

![Portable goal workflow](diagrams/goal-workflow.svg)

[Diagram source and scope](diagrams/README.md). This overview shows default
owner consent; trusted-project CI approval is an explicit opt-in.

Owner objective -> Soldier discovery/approach -> Navigator constructs a bounded
dependency DAG and acceptance criteria -> Wizard audits -> owner approves
commands -> host dry-runs baselines -> Soldier executes one ready node -> host
runs its gate -> Wizard audits node -> Priest diagnoses every red -> repeat.
All nodes green -> host re-runs all gates + locked proof -> fresh Wizard final
audit -> durable done acceptance -> advisory Scholar lesson.

The host validates DAG shape, dependencies and limits. Reviews run in fresh
cloud contexts with read-only project file access and bounded tool budgets.
The worker cannot call a judge to grade itself or provide a replacement proof.
Priest can propose an unpassed node's gate amendment; Wizard must accept it
and the owner must reapprove all commands. No weakening is claimed to be
mechanically provable: owner review is the last authority for gate semantics.

## Differences from the local installation

- No local models, sidecars, GPU routing, worker/background local-model lanes.
- All role requests use Pi's provider registry (OAuth/API keys managed by Pi).
- No Obsidian/Mnemosyne dependency, policy ledger, service controls or git merging.
- Lessons are per-session only; no global learning/consolidation/backlog chaining.
- No host-specific ACL or transparent shell confinement. Use an OS sandbox and
  your team's permission extensions for that separate concern.
- No automatic deferred owner-node execution. Owner-only blockers pause safely.
- State is portable via Pi sessions, not an external project state database.
- AI-authored compact pixel sprites defined in code, not third-party sprite assets.

## State and lifecycle

Versioned custom entries follow the active session branch. Fork/resume restores
the branch's last goal snapshot but pauses it and clears gate approvals. Old
schemas fail closed. Plan approval and baselines are repeated on explicit resume.
The package never scans unrelated harness/session files.
One in-process mutation at a time; cross-process workspace isolation is not
provided. Use separate checkouts for simultaneous developers.

## Evidence

Host bash structured results supply exact exit codes; missing exit evidence is
failure. Output is bounded and marked truncated. Reviews can request project
files; they do not execute code. A gate is necessary, not sufficient.
Final all-gate reruns catch regressions; final audit checks scope and criteria.
Gate baselines may be red by design, and are recorded without certifying them.
Role call counts include failed calls. Cancellation/provider errors pause;
the runtime never silently switches providers or retries billable requests.
