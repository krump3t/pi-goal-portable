# Goal skill roadsign

## Job
Own the model-facing procedure for an active host-controlled goal. This skill
coordinates the worker; it does not implement a second goal state machine.

## Conventions
[SKILL.md](SKILL.md) is the single procedure. Its frontmatter name is goal, matching
this folder; instructions refer to the registered goal_update tool by name.

## Dependencies and permission boundaries
Requires [the Pi adapter](../../extension.ts) and its goal_update tool.
Never run alternate gates, resolve credentials, self-certify success or bypass
owner consent. Host capsule and latest Wizard/Priest redirect control execution.

## Entrypoints and map
- [SKILL.md](SKILL.md): discovery, plan, check, blocked, done and evidence rules.
- /goal command starts the host; /skill:goal alone supplies instructions, not state.
- Validation: [structure audit](../../../03_ops/audit.mjs) checks frontmatter;
  [host-smoke](../../../03_ops/host-smoke.mjs) loads the executable integration.

Parent: [skill discovery roadsign](../README.md).
Return to [runtime component map](../../README.md).

Last updated: 2026-10-09
