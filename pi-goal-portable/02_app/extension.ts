import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { createHud } from "./hud.mjs";
import { createRunner } from "./runner.mjs";

export default function (pi: ExtensionAPI) {
  const runner = createRunner(pi, createHud(truncateToWidth));
  pi.registerCommand("goal", {
    description: "Start a cloud-native goal; status, approve, pause, resume, cancel",
    handler: async (args, ctx) => {
      try { await runner.command(args, ctx); }
      catch (error) { ctx.ui.notify(error instanceof Error ? error.message : String(error), "error"); }
    },
  });
  pi.registerTool({
    name: "goal_update", label: "Goal",
    description: "Host-controlled goal flow. plan proposes approach; status records approved baselines; check runs the locked next-node gate; blocked calls Priest; done re-runs every gate and proof. Never supply replacement gates.",
    parameters: Type.Object({
      action: StringEnum(["plan", "status", "check", "blocked", "done"] as const),
      text: Type.Optional(Type.String({ maxLength: 8000 })),
      verify_command: Type.Optional(Type.String({ maxLength: 2000 })),
    }),
    execute: async (id, params, signal, _onUpdate, ctx) => runner.execute(id, params, signal, ctx),
  });
  pi.on("session_start", (_event, ctx) => runner.restore(ctx));
  pi.on("session_tree", (_event, ctx) => runner.restore(ctx));
  pi.on("session_shutdown", () => runner.stop());
  pi.on("before_agent_start", () => runner.beforeAgent());
  pi.on("turn_start", (_event, ctx) => runner.turnStart(ctx));
  pi.on("tool_call", (event) => runner.beforeTool(event));
  pi.on("agent_before_settle", (event, ctx) => runner.beforeSettle(event, ctx));
}
