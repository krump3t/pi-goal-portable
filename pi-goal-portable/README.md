# Pi Goal Portable

Shareable cloud-native `/goal` package: Soldier execution, Navigator contracts,
Wizard audits, Priest recovery, Scholar lessons, and an animated pixel-party HUD.

**Quickstart:** `pi install ./pi-goal-portable`, start Pi in your project,
run `/login`, select a cloud model with `/model`, then `/goal <objective>`.

## Install / share

Requires Node **22.19+** and **Pi 1.1.0 or a compatible API**.
Install Pi: `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`.
Unzip this folder wherever you like; no build or local inference server is needed.

- Local/team project: `pi install --local ./pi-goal-portable`
- GitHub (replace team/repo): `pi install git:github.com/team/repo@v0.1.0`
- Try without installation: `pi -e ./pi-goal-portable`
- Remove using `pi remove <the-same-source>`, then restart Pi.
- Do not load beside another extension registering `/goal` or `goal_update`.

Commit **this folder's contents** as the repo root. Never commit runtime sessions
or provider credentials. Review licensing in [NOTICE](00_system/NOTICE.md)
before making a public open-source release.

## Run

1. Authenticate with Pi's `/login`, or your provider's environment variables
   (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`).
2. `/model` chooses the cloud model used by the worker and, by default, all roles.
3. `/goal Add a feature and verify it with the project's tests`.
4. Review the displayed contract and commands. Run `/goal approve`.
5. The worker executes only the NEXT ACTION. Host gates + Wizard review advance it.
6. At completion, all gates and the locked proof run again; a fresh Wizard audits
   the result. Scholar records a short lesson in the session.

Commands: `/goal status`, `/goal pause`, `/goal resume`, `/goal cancel`.
Reserved command words can be objectives with `/goal start <objective>`.
Resume is explicit after reload/session navigation; approvals are cleared.

## Configure

No config required. Optional project file: `.pi/goal.config.json`.
Copy [example](00_system/goal.config.example.json) there, edit, then restart.
Cloud role overrides are optional `provider/model-id` values. No endpoints,
GPU flags, folders named after this machine, MCP servers, or extra daemons.
[Configuration and security](00_system/CONFIGURATION.md) explains all options.

## Animation compatibility

The portable skin uses **AI-authored geometric pixel sprites defined in code**,
not image-model output or modified third-party sprites. It has five roles, conveyor,
role highlights, gate verdicts and recovery. It is not a byte-identical export
of the local full-size sprite skin: that skin includes a **non-redistributable
Cute Fantasy asset**, deliberately excluded along with all third-party packs.
The portable HUD adapts to terminal size, renders below the editor, and is
disabled in RPC/print modes. `animation: false` removes the animation.

## Developer map

- [00_system](00_system/README.md): architecture, config, provenance.
- [01_raw](01_raw/README.md): deterministic fixtures.
- [02_app](02_app/README.md): runtime, roles, HUD and goal skill.
- [03_ops](03_ops/README.md): tests, portability/doc audits and packaging.
- [99_archive](99_archive/README.md): quarantine.
- [AGENTS.md](AGENTS.md): agent maintenance rules.

ACLSD governs responsibilities, not folder spellings: every directory has a
four-question roadsign, parent exits and an actionable component map.
[Compliance contract](00_system/ACLSD.md) and the release gate enforce README
limits, navigation/link coverage, root cleanliness and runtime import boundaries.

Verify offline: `npm run verify`. Optional real-Pi offline integration:
`node 03_ops/host-smoke.mjs <installed-pi-package-directory>`.
Create npm tarball: `npm pack`. Create ZIP: `npm run pack -- ../pi-goal-portable.zip`.
The ZIP builder uses Python 3 stdlib; no dependencies or credentials are copied.
[Validation receipt](00_system/VALIDATION.md) distinguishes offline proof
from the cloud smoke test you should run with your team's provider.
