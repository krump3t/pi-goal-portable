# Configuration and security

Configuration is optional, project-relative `.pi/goal.config.json`.
Invalid/unknown fields fail closed. Defaults are in `02_app/config.mjs`.
No config contains API keys, auth files, endpoint URLs or machine paths.

| Key | Default | Bounds / meaning |
|---|---|---|
| animation | true | Animated TUI HUD; no UI in RPC/print |
| autoContinue | true | Bounded continuation if worker ends without finishing |
| trustedGates | false | CI consent for reviewed shell gates; requires Pi project trust |
| maxTurns | 100 | 1..200 actual worker turns per goal |
| maxRoleCalls | 60 | 1..200 billable role calls, including failures |
| maxHeals | 3 | 0..10 recovery attempts per goal |
| gateTimeoutSeconds | 120 | 1..900 per host gate |
| roleTimeoutSeconds | 120 | 1..900 per role request |
| maxRoleTokens | 4096 | 256..16384 output tokens per request |
| maxReadCalls | 8 | 0..16 project reads per role invocation |
| roles | {} | Optional navigator/wizard/priest/scholar: provider/model-id |

Worker model is chosen normally by Pi. Role overrides use the same registry
and authentication as Pi; no separate credential store.
Limits bound calls/time/output, **not dollars**; enable provider budget limits.
The project source, objective, selected gate output and reviewer-requested files
are sent to the chosen cloud provider. Do not use confidential repos without
your team's approval. Stored session evidence may contain sensitive stdout.

## Gate consent

`/goal approve` approves the contract's **exact shell command strings**.
Gate execution is through Pi's nested bash tool, including permission hooks,
not through a direct process spawn. Gate timeout is passed to that tool.
Missing structured exit status, blocked tools and cancelled tools never pass.
Planning and consent stages block executable/mutating tools until approved
baselines have run. This is workflow gating, not general tool confinement.
In non-interactive mode, approve with `/goal approve` through the client, or set
`trustedGates: true` only inside a sandbox whose contents you trust.

Commands may mutate files, access the network or execute arbitrary programs.
Approval is **not** sandboxing. Static gate lint rejects obvious always-success
or error-swallowing commands, but cannot prove shell semantics.
The worker still has ordinary Pi tools: this package is not an autonomy guard.
No automatic push, merge, deployment, credential access or service restart.
Use disposable workspaces and standard permission controls.

## Reviewer reads

Only regular files under the current real project root are readable, bounded
to 64 KiB per file and 200 lines per request. Outside-root symlinks, .git,
node_modules, .pi, .env*, common key/token/auth filenames and private-key
extensions are denied. This is conservative name filtering, not DLP.
Credentials embedded in ordinary source are still your responsibility.

## Recovery

On a red, Priest provides advice or a proposed gate amendment; an owner-only
need pauses. A passed node cannot be amended. Amended gates are re-audited
and require reapproval. Invalid JSON/provider errors pause without inference
of acceptance. `/goal resume` repeats owner consent and gate baselines.
Model switch is supported; the next role call uses the current worker model
unless that role is configured explicitly. Existing counts do not reset.

## Cloud smoke test (manual, billable)

In a disposable fixture project, authenticate with your provider, install this
package, run `/goal Create sum.mjs exporting sum(a,b); verify it with Node tests`.
Approve the proposed commands after inspection. Observe plan audit, baselines,
worker gate, node review, all-gate/proof reruns, final audit and lesson.
Try an intentionally failing test and `/goal pause` / `resume`.
Do not point a smoke test at production or silently use a local model.
