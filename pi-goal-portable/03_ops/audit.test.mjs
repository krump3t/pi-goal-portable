import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { auditPackage } from "./audit.mjs";
const policy = JSON.parse(readFileSync(new URL("../00_system/scaffolding.json", import.meta.url), "utf8"));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "pi-goal-audit-"));
  const write = (path, text) => writeFileSync(join(root, path), text);
  for (const layer of policy.layers) mkdirSync(join(root, layer));
  const navigation = policy.layers.map((p) => "[" + p + "](" + p + "/README.md)").join("\n");
  write("README.md", "# Fixture hub\nQuickstart: example only.\n" + navigation);
  write("AGENTS.md", "# Contract\n## Non-negotiable invariants\nFixture rules.\n## Authoritative navigation\n" + navigation + "\n## Structure and change boundaries\nFixture layers.\n## Golden paths and validation hierarchy\nOffline audit.");
  write(".gitignore", "");
  write("package.json", JSON.stringify({ peerDependencies: Object.fromEntries(policy.runtimePeers.map((p) => [p, "*"])),
    pi: { extensions: ["./02_app/extension.ts"], skills: ["./02_app/skills"] } }));
  write("00_system/scaffolding.json", JSON.stringify(policy));
  for (const file of Object.keys(policy.runtimeImports)) write("02_app/" + file, "// fixture module\n");
  mkdirSync(join(root, "02_app/skills")); mkdirSync(join(root, "02_app/skills/goal"));
  write("02_app/skills/goal/SKILL.md", "---\nname: goal\ndescription: Fixture-only goal skill.\n---\n");
  const docs = [
    ["00_system", "[policy](scaffolding.json)"],
    ["01_raw", "No fixture files are owned by this minimal test."],
    ["02_app", Object.keys(policy.runtimeImports).map((p) => "[" + p + "](" + p + ")").join("\n") + "\n[skills](skills/README.md)"],
    ["03_ops", "No operation files are owned by this minimal test."],
    ["99_archive", "No retired files are owned by this minimal test."],
    ["02_app/skills", "[goal skill roadsign](goal/README.md)"],
    ["02_app/skills/goal", "[canonical skill procedure](SKILL.md)"],
  ];
  for (const [dir, map] of docs) write(dir + "/README.md",
    "# Fixture roadsign\n\n## Job\nOwn one isolated fixture responsibility.\n\n## Conventions\nUse fixture files with explicit purpose.\n\n## Dependencies and permission boundaries\nNo runtime secrets or outside-layer mutations.\n\n## Entrypoints and map\n" + map + "\n[Parent roadsign](../README.md)\n\nLast updated: 2026-10-09\n");
  return { root, write, read: (path) => readFileSync(join(root, path), "utf8"), close: () => rmSync(root, { recursive: true, force: true }) };
}
test("ACLSD complete synthetic roadsigns and maps pass", () => {
  const f = fixture(); try { assert.deepEqual(auditPackage(f.root).errors, []); } finally { f.close(); }
});
for (const [name, mutate, message] of [
  ["root sprawl", (f) => f.write("dump.txt", "fixture"), "Root perimeter"],
  ["broken link", (f) => f.write("01_raw/README.md", f.read("01_raw/README.md") + "\n[Missing](absent.json)"), "Broken/outside link"],
  ["unmapped component", (f) => f.write("01_raw/new.json", "{}"), "Unmapped component"],
  ["missing parent exit", (f) => f.write("01_raw/README.md", f.read("01_raw/README.md").replace("[Parent roadsign](../README.md)", "No exit")), "Missing parent exit"],
  ["empty responsibility", (f) => f.write("01_raw/README.md", f.read("01_raw/README.md").replace("Own one isolated fixture responsibility.", "")), "Missing/empty roadsign section"],
  ["README cap", (f) => f.write("01_raw/README.md", f.read("01_raw/README.md") + "\nline".repeat(151)), "README line cap"],
  ["forbidden import", (f) => f.write("02_app/core.mjs", 'import {x} from "../03_ops/ops.mjs";'), "Runtime import boundary"],
  ["computed imports", (f) => f.write("02_app/core.mjs", "const x = import(path);"), "Runtime dynamic import"],
  ["agent navigation drift", (f) => f.write("AGENTS.md", f.read("AGENTS.md").replace("[01_raw](01_raw/README.md)", "unlinked fixture layer")), "Agent navigation missing layer"],
]) test("ACLSD rejects " + name, () => {
  const f = fixture();
  try { mutate(f); assert.ok(auditPackage(f.root).errors.some((e) => e.includes(message)), message); }
  finally { f.close(); }
});
