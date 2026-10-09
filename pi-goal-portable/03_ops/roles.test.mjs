import { test } from "node:test";
import assert from "node:assert/strict";
import { callRole } from "../02_app/roles.mjs";
import { newGoal } from "../02_app/core.mjs";
import { validateConfig } from "../02_app/config.mjs";
const model = { provider: "fixture-cloud", id: "tool-model" };
function context(replies) {
  const requests = [];
  return {
    requests, cwd: process.cwd(), model,
    modelRegistry: {
      find: (provider, id) => ({ provider, id }),
      streamSimple: (m, packet, options) => {
        requests.push({ model: m, packet, options });
        return { result: async () => replies.shift() ?? { content: [{ type: "text", text: '{"accept":true,"note":"accepted"}' }], stopReason: "stop" } };
      },
    },
    executeTool: async () => { throw new Error("No reviewer execution expected"); },
  };
}
test("provider-neutral role uses registry/current model, accounts calls", async () => {
  const ctx = context([]), state = newGoal("x");
  const answer = await callRole(ctx, "wizard", {}, state, validateConfig());
  assert.equal(answer.accept, true); assert.equal(state.roleCalls, 1);
  assert.equal(ctx.requests[0].model, model);
  assert.ok(ctx.requests[0].options.signal instanceof AbortSignal);
});
test("role override resolves through Pi registry, not endpoints/keys", async () => {
  const ctx = context([]);
  await callRole(ctx, "wizard", {}, newGoal("x"), validateConfig({ roles: { wizard: "cloud/team/model" } }));
  assert.deepEqual(ctx.requests[0].model, { provider: "cloud", id: "team/model" });
});
test("provider failure, truncation and malformed JSON fail closed", async () => {
  for (const reply of [
    { stopReason: "error", errorMessage: "fixture error", content: [] },
    { stopReason: "length", content: [{ type: "text", text: '{"accept":true}' }] },
    { stopReason: "stop", content: [{ type: "text", text: "Approved" }] },
  ]) await assert.rejects(callRole(context([reply]), "wizard", {}, newGoal("x"), validateConfig()));
});
test("read-only role denies unknown executable calls", async () => {
  const ctx = context([{ stopReason: "toolUse", content: [{ type: "toolCall", id: "1", name: "bash", arguments: { command: "echo no" } }] }]);
  await callRole(ctx, "wizard", {}, newGoal("x"), validateConfig());
  const result = ctx.requests[1].packet.messages.find((m) => m.role === "toolResult");
  assert.match(result.content[0].text, /DENIED/);
});
test("role call cap applies across goals' nested role rounds", async () => {
  const state = newGoal("x"); state.roleCalls = 1;
  await assert.rejects(callRole(context([]), "wizard", {}, state, validateConfig({ maxRoleCalls: 1 })), /budget exhausted/);
});
