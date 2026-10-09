import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateConfig } from "../02_app/config.mjs";
import { ENTRY, capsule, fingerprint, jsonReply, lintGate, newGoal, nextNode, restore, validatePlan } from "../02_app/core.mjs";
import { safeReadPath } from "../02_app/roles.mjs";
import { frameLines } from "../02_app/hud.mjs";
const fixture = JSON.parse(readFileSync(new URL("../01_raw/plan.json", import.meta.url), "utf8"));
test("DAG ready nodes follow dependency completion", () => {
  const state = newGoal("example"); state.contract = validatePlan(fixture); state.stage = "execution";
  assert.equal(nextNode(state).id, "implement");
  state.contract.nodes[0].status = "passed";
  assert.equal(nextNode(state).id, "document");
  assert.match(capsule(state), /NEXT ACTION document/);
});
for (const [name, mutate] of [
  ["duplicate id", (p) => p.nodes[1].id = p.nodes[0].id],
  ["unknown dependency", (p) => p.nodes[0].deps = ["missing"]],
  ["cycle", (p) => p.nodes[0].deps = ["document"]],
  ["missing acceptance coverage", (p) => p.acceptance.push("uncovered")],
  ["invalid reference", (p) => p.nodes[0].serves = [0]],
  ["empty nodes", (p) => p.nodes = []],
  ["vacuous proof", (p) => p.proof = "true"],
]) test("reject " + name, () => { const p = structuredClone(fixture); mutate(p); assert.throws(() => validatePlan(p)); });
test("gate lint and strict JSON never infer acceptance from prose", () => {
  for (const cmd of ["echo passed", "node test.mjs || true", "node test.mjs; exit 0"]) assert.throws(() => lintGate(cmd));
  assert.equal(lintGate("npm test"), "npm test");
  assert.deepEqual(jsonReply('```json\n{"accept":false}\n```'), { accept: false });
  assert.throws(() => jsonReply("Approved!"));
});
test("fingerprint ignores progress, not commands or criteria", () => {
  const p = validatePlan(fixture), hash = fingerprint(p);
  p.nodes[0].status = "passed"; assert.equal(fingerprint(p), hash);
  p.nodes[0].gate = "npm test"; assert.notEqual(fingerprint(p), hash);
});
test("restore active branch pauses and clears approval", () => {
  const state = newGoal("x"); state.approved = "old";
  const restored = restore([{ type: "custom", customType: ENTRY, data: state }]);
  assert.equal(restored.status, "paused"); assert.equal(restored.approved, null);
  assert.equal(restore([]), null);
  assert.throws(() => restore([{ type: "custom", customType: ENTRY, data: { version: 9 } }]));
});
test("config rejects unknown fields, malformed overrides and unsafe limits", () => {
  assert.equal(validateConfig().trustedGates, false);
  for (const config of [{ bogus: 1 }, { maxRoleCalls: 0 }, { maxHeals: -1 }, { animation: "yes" }, { roles: { wizard: "no-provider" } }])
    assert.throws(() => validateConfig(config));
  assert.equal(validateConfig({ roles: { wizard: "provider/team/model" } }).roles.wizard, "provider/team/model");
});
test("HUD is deterministic, fixed height and gracefully narrow", () => {
  const s = newGoal("x");
  assert.deepEqual(frameLines(s, 80, 2), frameLines(s, 80, 2));
  const count = frameLines(s, 80, 0).length;
  s.role = "wizard"; s.verdict = "red";
  assert.equal(frameLines(s, 80, 4).length, count);
  assert.notDeepEqual(frameLines(s, 80, 0), frameLines(s, 80, 1));
  assert.equal(frameLines(s, 10, 0).length, 2);
  assert.equal(frameLines(s, 120, 0, undefined, 12).length, 2);
});
test("review reads reject secrets, oversized files and outside-root symlinks", async () => {
  // Tiny fixtures only. Set TMPDIR to your disk sandbox for bulk work.
  const dir = mkdtempSync(join(tmpdir(), "pi-goal-read-"));
  try {
    mkdirSync(join(dir, "project")); writeFileSync(join(dir, "outside.txt"), "outside");
    const project = join(dir, "project");
    writeFileSync(join(project, "source.mjs"), "export const a=1;");
    writeFileSync(join(project, "large.txt"), "x".repeat(65537));
    writeFileSync(join(project, ".env"), "fixture-only");
    symlinkSync(join(dir, "outside.txt"), join(project, "escape.txt"));
    symlinkSync(join(project, ".env"), join(project, "harmless.txt"));
    assert.equal(await safeReadPath(project, "source.mjs"), join(project, "source.mjs"));
    for (const path of ["../outside.txt", "escape.txt", ".env", "harmless.txt", "large.txt", "/absolute", "auth.json"])
      await assert.rejects(safeReadPath(project, path));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
