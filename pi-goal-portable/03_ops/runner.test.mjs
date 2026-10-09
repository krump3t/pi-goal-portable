import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateConfig } from "../02_app/config.mjs";
import { ENTRY } from "../02_app/core.mjs";
import { createRunner } from "../02_app/runner.mjs";
const plan = JSON.parse(readFileSync(new URL("../01_raw/plan.json", import.meta.url), "utf8"));
function fixture(options = {}) {
  const entries = [], messages = [], calls = [], gates = [];
  let gateIndex = 0;
  const pi = {
    appendEntry: (customType, data) => entries.push({ type: "custom", customType, data: structuredClone(data) }),
    sendMessage: (m) => messages.push(m.content), sendUserMessage: (m) => messages.push(m),
  };
  const ctx = {
    cwd: process.cwd(), mode: "print", hasUI: false, signal: undefined,
    ui: { notify() {} }, abort() {}, isIdle: () => true, isProjectTrusted: () => true, hasPendingMessages: () => false,
    sessionManager: { getBranch: () => entries },
    async executeTool(name, params) {
      assert.equal(name, "bash"); gates.push(params.command);
      const outcome = options.gates?.[gateIndex++] ?? { exit_code: 0 };
      return { content: [{ type: "text", text: "fixture output" }], structuredContent: outcome,
        isError: outcome.exit_code !== 0 };
    },
  };
  const runner = createRunner(pi, { show() {}, stop() {} }, {
    loadConfig: () => validateConfig(options.config),
    async callRole(_ctx, role, packet, state, _config, hooks) {
      calls.push({ role, packet }); state.roleCalls++; hooks.save?.();
      if (options.role) return options.role(role, packet);
      if (role === "navigator") return structuredClone(plan);
      if (role === "wizard") return { accept: true, note: "Fixture source and host evidence accepted." };
      if (role === "priest") return { note: "Repair implementation, not gate.", ownerOnly: false, amendment: null };
      return { lesson: "VERIFIED fixture lesson" };
    },
  });
  const run = async (action, text = "") => runner.execute("fixture-id", { action, text }, undefined, ctx);
  return { runner, ctx, run, entries, messages, calls, gates };
}
async function approved(f) {
  await f.runner.command("example feature", f.ctx);
  await f.run("plan", "inspect then implement and document");
  await f.runner.command("approve", f.ctx);
  await f.run("status");
}
test("full offline flow: consent, baselines, gates, reviews, proof, lesson", async () => {
  const f = fixture();
  await f.runner.command("example feature", f.ctx);
  await f.run("plan", "inspect then implement");
  assert.equal(f.gates.length, 0);
  assert.equal(f.runner.getState().stage, "approval");
  await f.run("check"); assert.equal(f.gates.length, 0);
  await f.runner.command("approve", f.ctx); await f.run("status");
  assert.equal(f.gates.length, 3);
  await f.run("check"); await f.run("check"); await f.run("done");
  assert.equal(f.runner.getState().status, "done");
  assert.equal(f.gates.length, 8);
  assert.deepEqual(f.calls.map((x) => x.role), ["navigator", "wizard", "wizard", "wizard", "wizard", "scholar"]);
  assert.ok(f.entries.every((x) => x.customType === ENTRY));
});
test("final proof cannot replace the contract and incomplete goal cannot finish", async () => {
  const f = fixture(); await approved(f);
  const proof = f.runner.getState().contract.proof;
  const result = await f.run("done");
  assert.equal(result.isError, true);
  assert.equal(f.runner.getState().status, "paused");
  assert.equal(f.runner.getState().contract.proof, proof);
});
test("nonzero or absent exact exit evidence is red, calls Priest, never passes", async () => {
  for (const bad of [{ exit_code: 2 }, {}]) {
    const f = fixture({ gates: [{ exit_code: 0 }, { exit_code: 0 }, { exit_code: 0 }, bad] });
    await approved(f); await f.run("check");
    assert.equal(f.runner.getState().contract.nodes[0].status, "red");
    assert.equal(f.calls.at(-1).role, "priest");
  }
});
test("final rerun catches regression and reopens node", async () => {
  const outcomes = Array.from({ length: 5 }, () => ({ exit_code: 0 })); outcomes.push({ exit_code: 1 });
  const f = fixture({ gates: outcomes }); await approved(f);
  await f.run("check"); await f.run("check"); await f.run("done");
  assert.equal(f.runner.getState().contract.nodes[0].status, "red");
  assert.notEqual(f.runner.getState().status, "done");
});
test("owner-only recovery pauses without certifying success", async () => {
  const f = fixture({ role: (role) => {
    if (role === "navigator") return structuredClone(plan);
    if (role === "wizard") return { accept: true, note: "audit" };
    return { ownerOnly: true, note: "Owner must decide.", amendment: null };
  } });
  await approved(f); await f.run("blocked", "needs decision");
  assert.equal(f.runner.getState().status, "paused");
});
test("gate amendment is audited and needs fresh approval", async () => {
  const f = fixture({ role: (role) => {
    if (role === "navigator") return structuredClone(plan);
    if (role === "wizard") return { accept: true, note: "audit" };
    return { ownerOnly: false, note: "Correct a broken test path.", amendment: { node: "implement", gate: "node --test corrected.test.mjs" } };
  } });
  await approved(f); await f.run("blocked", "wrong test path");
  const s = f.runner.getState();
  assert.equal(s.stage, "approval"); assert.equal(s.approved, null);
  assert.equal(s.contract.nodes[0].gate, "node --test corrected.test.mjs");
});
test("unapproved worker execution is blocked; approved nested gates remain hooked", async () => {
  const f = fixture(); await f.runner.command("feature", f.ctx); await f.run("plan");
  assert.equal(f.runner.beforeTool({ toolName: "bash", input: {} }).block, true);
  assert.equal(f.runner.beforeTool({ toolName: "write", input: {} }).block, true);
  assert.equal(f.runner.beforeTool({ toolName: "read", input: {} }), undefined);
});
test("session restoration requires resume and consent", async () => {
  const f = fixture(); await approved(f);
  f.runner.restore(f.ctx); assert.equal(f.runner.getState().status, "paused");
  await f.runner.command("resume", f.ctx);
  assert.equal(f.runner.getState().stage, "approval");
  assert.equal(f.runner.getState().approved, null);
});
test("invalid model output pauses; advisory Scholar failure does not unverify completion", async () => {
  const broken = fixture({ role: () => { throw new Error("provider unavailable"); } });
  await broken.runner.command("x", broken.ctx);
  assert.equal((await broken.run("plan")).isError, true);
  assert.equal(broken.runner.getState().status, "paused");
  const f = fixture({ role: (role) => {
    if (role === "navigator") return structuredClone(plan);
    if (role === "wizard") return { accept: true, note: "audit" };
    throw new Error("lesson unavailable");
  } });
  await approved(f); await f.run("check"); await f.run("check"); await f.run("done");
  assert.equal(f.runner.getState().status, "done");
  assert.equal(f.runner.getState().history.at(-1).kind, "lesson-unverified");
});
test("trusted CI opt-in still uses baselines and permission-hooked gates", async () => {
  const f = fixture({ config: { trustedGates: true } });
  await f.runner.command("feature", f.ctx); await f.run("plan");
  assert.equal(f.gates.length, 3); assert.equal(f.runner.getState().stage, "execution");
});
test("Escape/error settlement pauses; turn limit bounds actual worker turns", async () => {
  const f = fixture({ config: { maxTurns: 1 } });
  await f.runner.command("feature", f.ctx);
  f.runner.turnStart(f.ctx);
  assert.equal(f.runner.getState().turns, 1);
  f.runner.turnStart(f.ctx);
  assert.equal(f.runner.getState().status, "paused");
  await f.runner.command("resume", f.ctx);
  f.runner.beforeSettle({ outcome: "aborted" }, f.ctx);
  assert.equal(f.runner.getState().status, "paused");
});
test("trustedGates cannot bypass consent in an untrusted project", async () => {
  const f = fixture({ config: { trustedGates: true } });
  f.ctx.isProjectTrusted = () => false;
  await f.runner.command("feature", f.ctx); await f.run("plan");
  assert.equal(f.gates.length, 0);
  assert.equal(f.runner.getState().stage, "approval");
});
test("simultaneous updates fail closed; owner cancellation aborts pending role", async () => {
  let enter, release;
  const entered = new Promise((r) => enter = r);
  const wait = new Promise((r) => release = r);
  const f = fixture({ role: async () => { enter(); await wait; return structuredClone(plan); } });
  await f.runner.command("feature", f.ctx);
  const pending = f.run("plan"); await entered;
  assert.equal((await f.run("status")).isError, true);
  await f.runner.command("cancel", f.ctx); release();
  assert.equal((await pending).isError, true);
  assert.equal(f.runner.getState().status, "cancelled");
});
