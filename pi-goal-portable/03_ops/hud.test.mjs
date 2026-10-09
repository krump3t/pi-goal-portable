import { test } from "node:test";
import assert from "node:assert/strict";
import { createHud, frameLines } from "../02_app/hud.mjs";
import { newGoal } from "../02_app/core.mjs";
test("HUD mounts only in TUI, follows theme/width and disposes idempotently", () => {
  const hud = createHud((s, width) => s.slice(0, width));
  const state = newGoal("x"), mounts = [], statuses = [];
  const ctx = {
    mode: "tui", hasUI: true,
    ui: { setWidget: (_key, factory) => mounts.push(factory), setStatus: (_key, value) => statuses.push(value) },
  };
  hud.show({ ...ctx, mode: "print" }, state, { animation: true });
  hud.show({ ...ctx, mode: "rpc" }, state, { animation: true });
  assert.equal(mounts.length, 0);
  hud.show(ctx, state, { animation: true });
  const component = mounts[0]({ terminal: { rows: 24 }, requestRender() {} }, { fg: (_token, text) => text });
  const lines = component.render(30);
  assert.ok(lines.every((line) => line.length <= 30));
  component.invalidate();
  state.status = "paused"; hud.show(ctx, state, { animation: true });
  component.dispose();
  hud.stop(); hud.stop();
  assert.equal(statuses.at(-1), undefined);
});
test("parked animation does not move and control characters never enter labels", () => {
  const state = newGoal("x"); state.status = "paused"; state.note = "\x1b[31m unsafe \nlabel";
  assert.deepEqual(frameLines(state, 80, 0), frameLines(state, 80, 19));
  assert.ok(frameLines(state, 80, 0).every((line) => !line.includes("\x1b") && !line.includes("\n")));
});
