// Optional integration check against an installed Pi host. Never loads auth stores
// or calls a provider: real extension loader + real Pi bash/read, scripted registry.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
const host = process.argv[2];
if (!host) throw new Error("Usage: node 03_ops/host-smoke.mjs <installed pi-coding-agent package directory>");
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const hostImport = (name) => import(pathToFileURL(join(resolve(host), "dist", name)).href);
const { loadExtensions } = await hostImport("core/extensions/loader.js");
const { createBashTool } = await hostImport("core/tools/bash.js");
const { createReadTool } = await hostImport("core/tools/read.js");
const dir = mkdtempSync(join(tmpdir(), "pi-goal-host-"));
try {
  writeFileSync(join(dir, "README.md"), "# Fixture\nImplement sum(a,b), verified by sum.test.mjs.\n");
  writeFileSync(join(dir, "sum.test.mjs"), "import {test} from 'node:test'; import assert from 'node:assert/strict'; import {sum} from './sum.mjs'; test('sum',()=>assert.equal(sum(2,3),5));\n");
  const loaded = await loadExtensions([join(root, "02_app/extension.ts")], dir);
  assert.deepEqual(loaded.errors, []);
  const entries = [], notices = [], gateCodes = [];
  Object.assign(loaded.runtime, {
    appendEntry: (customType, data) => entries.push({ type: "custom", customType, data: structuredClone(data) }),
    sendMessage: (message) => notices.push(message.content),
    sendUserMessage: (message) => notices.push(message),
  });
  const extension = loaded.extensions[0];
  const command = extension.commands.get("goal");
  const goalTool = extension.tools.get("goal_update").definition;
  const bash = createBashTool(dir), read = createReadTool(dir);
  let id = "", requests = 0, readRequests = 0;
  const model = { provider: "fixture-cloud", id: "scripted-chat" };
  const ctx = {
    cwd: dir, mode: "print", hasUI: false, signal: undefined, model,
    isIdle: () => true, isProjectTrusted: () => true, hasPendingMessages: () => false,
    abort() {}, ui: { notify: (text) => notices.push(text) },
    sessionManager: { getBranch: () => entries, getSessionId: () => "offline-fixture", getSessionFile: () => undefined },
    modelRegistry: {
      find: () => model,
      streamSimple: (_model, packet) => ({ result: async () => {
        requests++;
        const plan = { acceptance: ["sum(2,3) returns 5"], nodes: [{
          id: "implement", task: "Implement sum.mjs", doneWhen: "sum test passes",
          deps: [], serves: [1], gate: "node --test sum.test.mjs",
        }], proof: "node --test sum.test.mjs" };
        const system = packet.systemPrompt;
        let answer;
        if (system.includes("Write a minimal dependency DAG")) answer = plan;
        else if (system.includes("Extract one concise")) answer = { lesson: "VERIFIED Node test passed." };
        else answer = { accept: true, note: "Scripted fixture audit." };
        // Every Wizard inspects actual project source using the real read tool.
        if (system.includes("Adversarially audit") && !packet.messages.some((m) => m.role === "toolResult")) {
          readRequests++;
          return { role: "assistant", provider: model.provider, model: model.id, api: "fixture",
            stopReason: "toolUse", content: [{ type: "toolCall", id: "read-" + requests, name: "project_read", arguments: { path: "README.md" } }], timestamp: Date.now() };
        }
        return { role: "assistant", provider: model.provider, model: model.id, api: "fixture",
          stopReason: "stop", content: [{ type: "text", text: JSON.stringify(answer) }], timestamp: Date.now() };
      } }),
    },
    async executeTool(name, params, options) {
      assert.ok(["bash", "read"].includes(name));
      const event = { toolName: name, input: params, parentToolCallId: id };
      for (const handler of extension.handlers.get("tool_call") ?? []) {
        const response = await handler(event, ctx);
        if (response?.block) return { isError: true, content: [{ type: "text", text: response.reason }] };
      }
      const output = await (name === "bash" ? bash : read).execute(id + "/nested", params, options?.signal, undefined, ctx);
      if (name === "bash") gateCodes.push(output.structuredContent?.exit_code);
      return output;
    },
  };
  for (const handler of extension.handlers.get("session_start") ?? []) await handler({}, ctx);
  await command.handler("Implement sum(a,b) and verify it with sum.test.mjs", ctx);
  const run = async (action) => {
    id = "goal-call-" + action;
    const result = await goalTool.execute(id, { action, text: "Fixture worker approach" }, undefined, undefined, ctx);
    assert.equal(result.isError, undefined, result.content[0].text);
  };
  await run("plan");
  assert.equal(gateCodes.length, 0);
  await command.handler("approve", ctx);
  await run("status");
  assert.deepEqual(gateCodes, [1, 1]); // Genuine red baselines: module absent.
  writeFileSync(join(dir, "sum.mjs"), "export const sum=(a,b)=>a+b;\n"); // Scripted Soldier.
  await run("check"); await run("done");
  assert.deepEqual(gateCodes, [1, 1, 0, 0, 0]);
  assert.equal(entries.at(-1).data.status, "done");
  assert.equal(readRequests, 3);
  for (const handler of extension.handlers.get("session_shutdown") ?? []) await handler({}, ctx);
  console.log("VERIFIED Pi extension loader + real bash/read integration: " + requests + " scripted cloud requests; gate exits " + gateCodes.join(","));
} finally { rmSync(dir, { recursive: true, force: true }); }
