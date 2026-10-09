# Governance roadsign

## Job
Own the portable package's architecture, configuration, provenance and structural
contract. Start here for policy, not runtime execution.

## Conventions
Upper-case Markdown names denote authoritative references; JSON files are
machine-readable examples/policies. Keep receipts separate from normative rules.
These are repository documents, not Obsidian notes: vault frontmatter is not
required here; the discoverable skill has its own portable frontmatter.

## Dependencies and permission boundaries
Guides constrain runtime/operations; runtime must not import governance scripts.
Change scaffolding.json only with a reviewed contract/map change and gate tests.
No secrets, endpoint configuration or personal runtime state belongs here.

## Entrypoints and map
| File | Responsibility |
|---|---|
| [ACLSD.md](ACLSD.md) | Scoped compliance rules and enforcement coverage |
| [scaffolding.json](scaffolding.json) | Root, layer and runtime-import allowlists |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Goal flow, state lifecycle and portability differences |
| [CONFIGURATION.md](CONFIGURATION.md) | Options, consent, security and live-cloud smoke test |
| [goal.config.example.json](goal.config.example.json) | Safe project configuration template |
| [NOTICE.md](NOTICE.md) | Provenance, excluded artwork and licensing |
| [VALIDATION.md](VALIDATION.md) | Executed evidence and explicit unverified boundaries |
| [diagrams/](diagrams/README.md) | Portable workflow image and editable Mermaid source |

Next: [runtime](../02_app/README.md) for implementation,
[operations](../03_ops/README.md) for verification.
Parent: [package hub](../README.md).

Last updated: 2026-10-09
