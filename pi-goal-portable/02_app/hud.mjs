// Original geometric pixel art; no third-party sprite tables.
// Presentation is a pure function; binding owns one disposable timer.
import { nextNode } from "./core.mjs";
export const roles = ["soldier", "navigator", "wizard", "priest", "scholar"];
const token = { soldier: "error", navigator: "warning", wizard: "accent", priest: "success", scholar: "muted", host: "toolTitle" };
const art = {
  soldier: ["..##..", ".####.", ".#oo#.", "..##..", ".####.", "#.##.#", "..##..", ".#..#."],
  navigator: [".####.", "..##..", "..oo..", ".####.", "..##.#", ".###.#", "..##..", ".#..#."],
  wizard: ["...#..", "..###.", ".#####", "..oo..", ".####.", ".###.#", ".####.", ".#..#."],
  priest: ["..oo..", ".####.", "..oo..", ".####.", "#.##.#", ".####.", ".####.", ".#..#."],
  scholar: [".####.", "..oo..", ".####.", ".####.", ".#oo#.", ".####.", "..##..", ".#..#."],
};
const clean = (s) => String(s ?? "").replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
export function frameLines(state, width, tick, paint = (_token, text) => text, height = 40) {
  const w = Math.max(0, Math.floor(width));
  const node = nextNode(state), moving = state.status === "active";
  const passed = state.contract?.nodes.filter((n) => n.status === "passed").length ?? 0;
  const total = state.contract?.nodes.length ?? 0;
  const plain = [
    "GOAL " + state.status + " | " + clean(state.stage) + " | " + passed + "/" + total + " | " + clean(state.role),
    "NEXT " + clean(node?.id ?? (total ? "final review" : "plan")) + " | " + clean(state.note),
  ];
  // Stable height for a fixed terminal size. Very short/narrow windows get text only.
  if (height < 19 || w < 24) return plain;
  const scale = w >= 100 && height >= 30 ? 2 : 1;
  const cast = roles.slice(0, Math.max(1, Math.min(5, Math.floor((w - 9) / (7 * scale)))));
  const active = state.role === "host" ? "soldier" : state.role;
  const rows = [];
  for (let y = 0; y < 4 * scale; y++) {
    let line = "";
    for (const role of cast) {
      const lit = role === active;
      const pixels = [...art[role]];
      if (moving && lit && tick % 4 < 2) pixels[7] = "..##..";
      for (let x = 0; x < 6; x++) {
        const upper = pixels[Math.floor((y * 2) / scale)]?.[x] ?? ".";
        const lower = pixels[Math.floor((y * 2 + 1) / scale)]?.[x] ?? ".";
        const on = (v) => v !== ".";
        const glyph = on(upper) && on(lower) ? "█" : on(upper) ? "▀" : on(lower) ? "▄" : " ";
        line += paint(lit ? token[role] : "dim", glyph.repeat(scale));
      }
      line += " ".repeat(scale);
    }
    const mark = state.verdict === "red" ? "[RED]" : state.verdict === "green" ? "[OK]" : "[GATE]";
    rows.push(line + (y === 2 ? paint(state.verdict === "red" ? "error" : "success", mark) : ""));
  }
  const belt = Array.from({ length: Math.max(0, w) }, (_, i) => ((i + (moving ? tick : 0)) % 4 === 0 ? ">" : "=")).join("");
  return [plain[0], ...rows, cast.map((r) => r.slice(0, 6).padEnd(7 * scale)).join(""), paint("muted", belt), plain[1]];
}
export function createHud(truncate) {
  let ctx, state, timer, tui, frame = 0, last = "", mounted = false;
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = undefined;
    ctx?.ui.setWidget("portable-goal", undefined);
    ctx?.ui.setStatus("portable-goal", undefined);
    mounted = false; tui = undefined; last = "";
  };
  return {
    show(context, value, config) {
      if (context.mode !== "tui" || !context.hasUI) return;
      ctx = context; state = value;
      if (!state || !config.animation) { stop(); return; }
      if (!mounted) {
        mounted = true;
        ctx.ui.setWidget("portable-goal", (screen, theme) => {
          tui = screen;
          return {
            render(width) {
              const lines = frameLines(state, width, frame, (t, s) => theme.fg(t, s), screen.terminal?.rows ?? 24)
                .map((s) => truncate(s, width));
              last = lines.join("\n");
              return lines;
            },
            invalidate() { last = ""; },
            dispose() { mounted = false; tui = undefined; },
          };
        }, { placement: "belowEditor" });
      }
      ctx.ui.setStatus("portable-goal", "goal " + state.status + " / " + state.stage);
      tui?.requestRender();
      if (!timer && state.status === "active") {
        timer = setInterval(() => {
          frame++;
          // Pure timer; no state writes, model calls or file I/O.
          if (last && tui) tui.requestRender();
        }, 250);
        timer.unref?.();
      }
      if (state.status !== "active" && timer) { clearInterval(timer); timer = undefined; }
    },
    stop,
  };
}
