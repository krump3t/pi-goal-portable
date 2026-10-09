# Skill discovery roadsign

## Job
Own Pi-discoverable agent instruction bundles. This directory is the skill root
named by the package's Pi manifest.

## Conventions
One lower-case directory per skill; its SKILL.md has matching name, description
and compatibility frontmatter. Directory READMEs are navigation, not skills.

## Dependencies and permission boundaries
Instructions guide the worker; they cannot replace the executable host contract.
No scripts, credentials, global policy or duplicated runtime state are stored here.
The extension explicitly invokes /skill:goal when a goal starts/resumes planning.

## Entrypoints and map
- [goal/](goal/README.md): canonical host-verified goal procedure.
- Discovery owner: [package manifest](../../package.json).
- Executable adapter: [extension.ts](../extension.ts).

Next: [goal skill roadsign](goal/README.md).
Parent: [runtime roadsign](../README.md).

Last updated: 2026-10-09
