import { createHash, randomUUID } from "node:crypto";

export const ENTRY = "portable-goal-v1";
export const clip = (text, size = 12000) => {
  const value = String(text ?? "");
  return value.length > size ? value.slice(0, size) + "\n[TRUNCATED]" : value;
};
export function jsonReply(text) {
  const clean = String(text).trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
  return JSON.parse(clean); // No prose/fuzzy approval fallback.
}
function required(value, label, size = 2000) {
  if (typeof value !== "string" || !value.trim() || value.length > size) throw new Error("Invalid " + label);
  return value.trim();
}
export function lintGate(value) {
  const command = required(value, "gate", 2000);
  if (/(?:^|[;&|]\s*)(?:true|echo\b|printf\b|exit\s+0\b)/.test(command)
      || /\|\|\s*(?:true|:|echo\b|exit\s+0)/.test(command)
      || /(?:set\s+\+e|;\s*exit\s+0|localhost|127\.0\.0\.1)/.test(command))
    throw new Error("Gate is obviously vacuous, masks failures, or uses a loopback endpoint");
  return command;
}
export function validatePlan(input) {
  if (!input || typeof input !== "object") throw new Error("Plan must be an object");
  const acceptance = input.acceptance;
  if (!Array.isArray(acceptance) || acceptance.length < 1 || acceptance.length > 12) throw new Error("Need 1..12 acceptance criteria");
  const ac = acceptance.map((x, i) => required(x, "acceptance " + i, 1000));
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > 16) throw new Error("Need 1..16 nodes");
  const nodes = input.nodes.map((x) => {
    const id = required(x.id, "node id", 32);
    if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("Invalid node id");
    if (!Array.isArray(x.deps) || x.deps.length > 16 || x.deps.some((d) => typeof d !== "string")) throw new Error("Invalid deps");
    if (!Array.isArray(x.serves) || !x.serves.length || x.serves.some((n) => !Number.isInteger(n) || n < 1 || n > ac.length)) throw new Error("Invalid acceptance references");
    return { id, task: required(x.task, "task"), doneWhen: required(x.doneWhen, "doneWhen"),
      deps: [...new Set(x.deps)], serves: [...new Set(x.serves)], gate: lintGate(x.gate), status: "pending", locked: false };
  });
  const ids = new Set(nodes.map((x) => x.id));
  if (ids.size !== nodes.length) throw new Error("Duplicate node ids");
  const seen = new Set(), active = new Set();
  const visit = (id) => {
    if (!ids.has(id)) throw new Error("Unknown dependency: " + id);
    if (active.has(id)) throw new Error("Dependency cycle");
    if (seen.has(id)) return;
    active.add(id);
    for (const dep of nodes.find((x) => x.id === id).deps) visit(dep);
    active.delete(id); seen.add(id);
  };
  for (const id of ids) visit(id);
  for (let n = 1; n <= ac.length; n++) if (!nodes.some((x) => x.serves.includes(n))) throw new Error("Uncovered acceptance criterion " + n);
  return { acceptance: ac, nodes, proof: lintGate(input.proof) };
}
export function newGoal(objective) {
  return { version: 1, id: randomUUID(), objective: required(objective, "objective", 8000),
    status: "active", stage: "planning", started: Date.now(), turns: 0, roleCalls: 0, heals: 0,
    contract: null, approved: null, baselined: false, history: [], note: "Inspect project and submit an approach.",
    role: "soldier", verdict: "" };
}
export function nextNode(state) {
  return state.contract?.nodes.find((n) => n.status !== "passed" &&
    n.deps.every((dep) => state.contract.nodes.find((x) => x.id === dep)?.status === "passed"));
}
export function allPassed(state) { return !!state.contract && state.contract.nodes.every((n) => n.status === "passed"); }
export function fingerprint(contract) {
  return createHash("sha256").update(JSON.stringify({
    acceptance: contract.acceptance,
    nodes: contract.nodes.map(({ id, task, doneWhen, deps, serves, gate }) => ({ id, task, doneWhen, deps, serves, gate })),
    proof: contract.proof,
  })).digest("hex");
}
export function record(state, kind, data) {
  state.history.push({ at: new Date().toISOString(), kind, data });
  state.history = state.history.slice(-64);
}
export function capsule(state) {
  if (!state) return "No goal. Start with /goal <objective>.";
  if (state.status !== "active") return "Goal " + state.status + ": " + state.note;
  if (state.stage === "planning") return "NEXT ACTION: inspect the project; goal_update action=plan with a concise approach.\nObjective: " + state.objective;
  if (state.stage === "approval") return "Await owner /goal approve. No execution.\n" + JSON.stringify(state.contract, null, 2);
  const node = nextNode(state);
  return (node ? "NEXT ACTION " + node.id + ": " + node.task + "\nDONE WHEN: " + node.doneWhen + "\nLOCKED GATE: " + node.gate + "\nCall goal_update action=check; blocked if unable."
    : "NEXT ACTION: goal_update action=done. Host re-runs every gate and locked proof.")
    + "\nObjective: " + state.objective + "\nHost redirect: " + state.note;
}
export function restore(entries) {
  let state = null;
  for (const entry of entries) if (entry.type === "custom" && entry.customType === ENTRY) {
    const data = entry.data;
    if (data?.version !== 1) throw new Error("Unsupported portable goal state schema");
    if (!["active", "paused", "done", "cancelled"].includes(data.status) ||
        typeof data.objective !== "string" || !Array.isArray(data.history) ||
        [data.turns, data.roleCalls, data.heals].some((n) => !Number.isInteger(n) || n < 0))
      throw new Error("Corrupt portable goal state");
    if (data.contract) {
      validatePlan(data.contract);
      if (data.contract.nodes.some((n) => !["pending", "red", "passed"].includes(n.status)))
        throw new Error("Corrupt node progress");
    }
    state = structuredClone(data);
  }
  if (state?.status === "active") {
    state.status = "paused"; state.approved = null; state.baselined = false;
    state.note = "Restored session branch. /goal resume; gate commands require reapproval.";
  }
  return state;
}
