# ACLSD package contract

The contract is about responsibilities, navigation and mechanical enforcement,
not numeric directory names. The existing folders are retained because each
already has one clear role.

## Three-tier entrypoints
1. README.md: human hub, mission, quickstart and layer exits; <=100 lines.
2. AGENTS.md: canonical agent invariants, navigation and validation; <=200 lines.
3. Other harness bindings are not shipped for this Pi-only package. If added,
   they must symlink to AGENTS.md, never duplicate its instructions; packaging
   must preserve those links before such bindings can be released.

## Layer map
| Layer | Folder | Permitted dependency / writes |
|---|---|---|
| Governance | 00_system | Contract/config/provenance; reviewed policy changes |
| Immutable inputs | 01_raw | Golden JSON fixtures; no runtime writes/imports |
| Production | 02_app | Node/Pi peers and allowlisted inward runtime imports |
| Operations | 03_ops | May consume production/fixtures; never imported by runtime |
| Quarantine | 99_archive | Move-only retirement; no production imports/discovery |

No exploratory-write folder is shipped: use a designated disposable workspace
outside the package. Archive outputs also go outside the source root.
Root is only README, AGENTS, package manifest and Git ignore metadata.
.git is a VCS boundary, not source to traverse.

## Effective roadsigns
Every directory has a <=150-line README with:
- Job: its single responsibility.
- Conventions: actual file types/names and structure, not generic filler.
- Dependencies and permission boundaries: permitted reads/writes/imports.
- Entrypoints and map: relative links covering immediate files and child roadsigns.
- A parent exit, onward navigation where relevant and Last updated: YYYY-MM-DD.

The root hub links all primary roadsigns. Agent navigation links the owning layer.
Module responsibilities and owning tests are local to the runtime roadsign.
Documents use ordinary Markdown; only skill files require skill frontmatter.
Vault-note metadata is not imposed on repository README files.

## Mechanical gates and scope
[npm run check](../03_ops/audit.mjs) enforces perimeter, README sections/content
and limits, link existence, immediate map coverage, parent/root roadsigns,
required layers, runtime static-import allowlists and Pi resource boundaries.
The policy is [scaffolding.json](scaffolding.json); negative tests exercise drift.
Import analysis checks literal static module declarations, not a complete JS AST
or transitive behavioral sandbox. Computed runtime imports are prohibited.

npm run verify adds behavioral tests. ZIP packaging and npm prepack both require
that gate, so a broken roadsign or dependency prevents normal asset production.
Gate consent, project-read confinement and budgets are separate runtime controls;
the scaffold audit is not an OS sandbox, complete secret scanner, or CI service.
No automatic git hooks or GitHub workflow is installed; teams should run
npm run verify in their existing CI and protect their release branch.

## Maintenance
Read the owner's roadsign, then relevant symbols/callers/tests before editing.
Update links/maps alongside file moves. Preserve fixtures; move retired artifacts
to archive. Keep proof receipts distinct from normative rules. Report actual
VERIFIED / INFERRED / UNVERIFIED results, never turn failed checks into success.
