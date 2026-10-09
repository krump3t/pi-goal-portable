import { loadConfig } from "./config.mjs";
import { ENTRY, allPassed, capsule, clip, fingerprint, lintGate, newGoal, nextNode, record, restore, validatePlan } from "./core.mjs";
import { callRole } from "./roles.mjs";

export function createRunner(pi, hud, deps = {}) {
  const getConfig = deps.loadConfig ?? loadConfig;
  const invoke = deps.callRole ?? callRole;
  let state = null, config, busy = false, operation, activeCallId, generation = 0;
  const save = () => pi.appendEntry(ENTRY, structuredClone(state));
  const show = (ctx) => hud.show(ctx, state, config);
  const note = (text) => pi.sendMessage({ customType: "portable-goal", content: text, display: true });
  const send = (text, skill = false) => pi.sendUserMessage(skill ? "/skill:goal " + text : text,
    { deliverAs: "followUp", expandPromptTemplates: skill });
  const pause = (text) => {
    if (state && !["cancelled", "done"].includes(state.status)) { state.status = "paused"; state.note = clip(text, 2000); save(); }
  };
  async function role(ctx, name, packet) {
    state.role = name; save(); show(ctx);
    const current = state, epoch = generation;
    const answer = await invoke(ctx, name, { objective: state.objective, contract: state.contract, ...packet },
      state, config, { save: () => { if (epoch === generation && current === state) save(); },
        usage: (usage) => deps.usage?.(usage) });
    if (epoch !== generation || current !== state || ctx.signal?.aborted || state.status !== "active")
      throw new Error("Goal operation cancelled or session changed");
    save(); return answer;
  }
  function approved() {
    if (!state.contract || state.approved !== fingerprint(state.contract)) throw new Error("Owner approval required: /goal approve");
  }
  async function gate(ctx, command, label) {
    approved();
    state.role = "host"; state.note = "Host running " + label; save(); show(ctx);
    const current = state, epoch = generation;
    const result = await ctx.executeTool("bash", { command, timeout: config.gateTimeoutSeconds }, { signal: ctx.signal });
    if (epoch !== generation || current !== state || ctx.signal?.aborted || state.status !== "active") throw new Error("Gate cancelled");
    const code = result.structuredContent?.exit_code;
    const evidence = { label, command, exitCode: Number.isInteger(code) ? code : null,
      ok: !result.isError && code === 0,
      output: clip(result.structuredContent?.output ?? result.content?.filter((p) => p.type === "text").map((p) => p.text).join("\n"), 10000),
      truncated: result.structuredContent?.truncated === true };
    record(state, "gate", evidence); state.verdict = evidence.ok ? "green" : "red"; save(); show(ctx);
    return evidence;
  }
  function reviewAnswer(answer) {
    if (typeof answer.accept !== "boolean" || typeof answer.note !== "string" || !answer.note.trim() || answer.note.length > 4000)
      throw new Error("Invalid Wizard verdict");
    return answer;
  }
  async function heal(ctx, red, target) {
    state.heals++;
    if (state.heals > config.maxHeals) throw new Error("Recovery budget exhausted");
    const answer = await role(ctx, "priest", { red, target, recentEvidence: state.history.slice(-12) });
    if (typeof answer.note !== "string" || !answer.note.trim() || typeof answer.ownerOnly !== "boolean") throw new Error("Invalid Priest reply");
    state.note = clip(answer.note, 2000); record(state, "heal", answer);
    if (answer.ownerOnly) { pause("Owner action needed: " + state.note); return; }
    if (answer.amendment != null) {
      const node = state.contract.nodes.find((n) => n.id === answer.amendment.node);
      if (!node || node.status === "passed" || node.locked) throw new Error("Priest cannot amend an unknown or passed node");
      const proposed = { ...node, gate: lintGate(answer.amendment.gate) };
      const verdict = reviewAnswer(await role(ctx, "wizard", { audit: "Proposed gate repair; reject any weakening of valid checks", original: node, proposed, diagnosis: answer.note }));
      if (!verdict.accept) throw new Error("Gate amendment rejected: " + verdict.note);
      node.gate = proposed.gate;
      state.approved = null; state.baselined = false; state.stage = "approval";
      record(state, "amendment", { node: node.id, gate: node.gate, reason: answer.note });
      note("Gate amended; owner reapproval required.\n" + capsule(state));
    } else { state.stage = "execution"; state.role = "soldier"; }
    save();
  }
  async function baseline(ctx) {
    approved();
    if (state.baselined) return;
    for (const node of state.contract.nodes) await gate(ctx, node.gate, "baseline " + node.id);
    await gate(ctx, state.contract.proof, "baseline proof");
    // Red baselines are observations, never a failure to achieve the future objective.
    state.baselined = true; state.stage = "execution"; state.role = "soldier";
    state.note = "Baselines recorded; execute only the NEXT ACTION."; state.verdict = "";
    save();
  }
  async function update(ctx, params) {
    if (!state || state.status !== "active") return capsule(state);
    if (params.action === "plan") {
      if (state.stage !== "planning") throw new Error("Contract already exists");
      const proposal = await role(ctx, "navigator", { approach: clip(params.text, 8000), requestedProof: params.verify_command ?? "" });
      const contract = validatePlan(proposal);
      const verdict = reviewAnswer(await role(ctx, "wizard", { audit: "Plan coverage, scope and command safety before owner consent", proposedContract: contract }));
      if (!verdict.accept) {
        state.note = verdict.note; state.verdict = "red"; save();
        // Priest diagnoses the planning red; no contract means amendments are disallowed.
        state.heals++;
        if (state.heals > config.maxHeals) throw new Error("Recovery budget exhausted");
        const advice = await role(ctx, "priest", { red: verdict, target: "planning", proposedContract: contract });
        if (typeof advice.note !== "string" || typeof advice.ownerOnly !== "boolean" || advice.amendment != null) throw new Error("Invalid planning recovery");
        state.note = advice.note;
        if (advice.ownerOnly) pause("Owner action needed: " + advice.note);
        else { state.role = "soldier"; save(); }
        return capsule(state);
      }
      state.contract = contract; state.stage = "approval"; state.note = verdict.note;
      state.verdict = "green"; save();
      note("Review these commands before /goal approve:\n" + capsule(state));
      if (config.trustedGates && ctx.isProjectTrusted?.()) { state.approved = fingerprint(contract); state.stage = "baselining"; save(); await baseline(ctx); }
      return capsule(state);
    }
    if (state.stage === "approval") return capsule(state);
    if (!state.contract) return capsule(state);
    await baseline(ctx);
    if (params.action === "status") return capsule(state);
    if (params.action === "blocked") {
      await heal(ctx, { workerReport: clip(params.text, 4000), evidenceStatus: "UNVERIFIED worker report" }, nextNode(state)?.id ?? "proof");
      return capsule(state);
    }
    if (params.action === "check") {
      const node = nextNode(state);
      if (!node) return capsule(state);
      const result = await gate(ctx, node.gate, node.id);
      if (!result.ok) { node.status = "red"; await heal(ctx, result, node.id); return capsule(state); }
      const verdict = reviewAnswer(await role(ctx, "wizard", {
        audit: "Node implementation satisfies doneWhen and serves its criteria; inspect source/tests",
        node, gate: result, workerNote: clip(params.text, 2000),
      }));
      if (!verdict.accept) { node.status = "red"; await heal(ctx, verdict, node.id); }
      else { node.status = "passed"; node.locked = true; state.note = verdict.note; state.role = "soldier"; state.verdict = "green"; record(state, "passed", node.id); save(); }
      return capsule(state);
    }
    if (params.action === "done") {
      if (!allPassed(state)) throw new Error("Cannot finish with pending nodes");
      state.stage = "final-review"; save();
      for (const node of state.contract.nodes) {
        const evidence = await gate(ctx, node.gate, "final " + node.id);
        if (!evidence.ok) {
          node.status = "red"; record(state, "reopened", node.id);
          await heal(ctx, evidence, node.id); return capsule(state);
        }
      }
      const proof = await gate(ctx, state.contract.proof, "locked proof");
      const reopen = () => {
        const node = state.contract.nodes.at(-1); node.status = "red";
        record(state, "reopened", node.id); return node.id;
      };
      if (!proof.ok) { await heal(ctx, proof, reopen()); return capsule(state); }
      const verdict = reviewAnswer(await role(ctx, "wizard", {
        audit: "Final independent audit of objective, every criterion, implementation, scope and test integrity",
        hostEvidence: state.history.filter((x) => x.kind === "gate").slice(-17),
      }));
      if (!verdict.accept) { await heal(ctx, verdict, reopen()); return capsule(state); }
      // Final acceptance is durable even if non-gating lesson extraction fails.
      state.status = "done"; state.stage = "done"; state.note = verdict.note; state.verdict = "green"; save();
      const completed = state, completionEpoch = generation;
      try {
        // Scholar is advisory; session replacement must still invalidate this call.
        state.role = "scholar"; show(ctx);
        const lesson = await invoke(ctx, "scholar", { objective: state.objective, contract: state.contract, verifiedOutcome: verdict, hostEvidence: state.history.slice(-8) },
          state, config, { save: () => { if (completionEpoch === generation && completed === state) save(); },
            usage: (usage) => deps.usage?.(usage) });
        if (completionEpoch !== generation || completed !== state) return "Goal session changed after acceptance.";
        if (typeof lesson.lesson !== "string") throw new Error("Invalid Scholar lesson");
        record(state, "lesson", clip(lesson.lesson, 2000));
      } catch (error) {
        if (completionEpoch !== generation || completed !== state) return "Goal session changed after acceptance.";
        record(state, "lesson-unverified", clip(error.message, 500));
      }
      save(); note("VERIFIED goal complete: " + state.note); return capsule(state);
    }
    throw new Error("Unknown goal action");
  }
  return {
    getState: () => structuredClone(state),
    restore(ctx) {
      operation?.abort(); generation++; hud.stop();
      state = null; config = undefined;
      config = getConfig(ctx.cwd); state = restore(ctx.sessionManager.getBranch()); show(ctx);
    },
    stop() { operation?.abort(); generation++; hud.stop(); },
    async command(args, ctx) {
      config ??= getConfig(ctx.cwd);
      const input = args.trim(), verb = input.split(/\s+/)[0];
      if (verb === "status" || !input) { note(capsule(state)); return; }
      if (["pause", "cancel"].includes(verb)) {
        operation?.abort();
        if (state && !["done", "cancelled"].includes(state.status)) {
          state.status = verb === "cancel" ? "cancelled" : "paused";
          state.note = "Owner " + verb; save(); show(ctx);
        }
        ctx.abort(); return;
      }
      if (busy || !ctx.isIdle()) { ctx.ui.notify("Goal busy; pause first.", "warning"); return; }
      if (verb === "approve") {
        if (!state || state.status !== "active" || state.stage !== "approval") throw new Error("No plan awaiting approval");
        state.approved = fingerprint(state.contract); state.stage = "baselining"; save(); show(ctx);
        send("Call goal_update action=status NOW to record host baselines before any edits."); return;
      }
      if (verb === "resume") {
        if (!state || state.status !== "paused") throw new Error("No paused goal");
        state.status = "active"; state.approved = null; state.baselined = false;
        state.stage = state.contract ? "approval" : "planning";
        state.note = "Explicit owner resume; budgets are retained."; save(); show(ctx);
        if (config.trustedGates && ctx.isProjectTrusted?.() && state.contract) { state.approved = fingerprint(state.contract); state.stage = "baselining"; save(); send("Call goal_update action=status to record baselines."); }
        else if (!state.contract) send(capsule(state), true);
        else note(capsule(state));
        return;
      }
      if (state && !["done", "cancelled"].includes(state.status)) throw new Error("Cancel current goal before starting another");
      state = newGoal(verb === "start" ? input.slice(6).trim() : input);
      save(); show(ctx); send(capsule(state), true);
    },
    async execute(id, params, signal, ctx) {
      if (busy) return { content: [{ type: "text", text: "Concurrent goal mutation rejected" }], details: undefined, isError: true };
      busy = true; activeCallId = id; operation = new AbortController();
      const epoch = generation;
      const merged = AbortSignal.any([operation.signal, ...(signal ? [signal] : []), ...(ctx.signal ? [ctx.signal] : [])]);
      const toolCtx = Object.assign(Object.create(ctx), { signal: merged });
      let usage;
      deps.usage = (u) => {
        if (!u) return;
        usage ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
        for (const k of ["input", "output", "cacheRead", "cacheWrite", "totalTokens"]) usage[k] += u[k] ?? 0;
        for (const k of Object.keys(usage.cost)) usage.cost[k] += u.cost?.[k] ?? 0;
      };
      try {
        config ??= getConfig(ctx.cwd);
        const text = await update(toolCtx, params);
        show(ctx);
        return { content: [{ type: "text", text }], details: { state: structuredClone(state) }, ...(usage ? { usage } : {}) };
      } catch (error) {
        if (epoch === generation) { pause(error.message); show(ctx); }
        return { content: [{ type: "text", text: "UNVERIFIED: " + clip(error.message, 1000) }], details: undefined, isError: true, ...(usage ? { usage } : {}) };
      } finally { busy = false; activeCallId = undefined; operation = undefined; }
    },
    beforeTool(event) {
      if (state?.status !== "active" || !["planning", "approval", "baselining"].includes(state.stage)) return;
      if (event.toolName === "goal_update" || ["read", "grep", "find", "ls"].includes(event.toolName)) return;
      // Only nested approved host gates may execute while baseline is in progress.
      if (busy && event.parentToolCallId === activeCallId && event.toolName === "bash" && state.role === "host") return;
      return { block: true, reason: "Goal awaits consent/baselines; no mutations or executable tools yet." };
    },
    beforeAgent() {
      if (state?.status !== "active") return;
      return { message: { customType: "portable-goal-capsule", content: capsule(state), display: false } };
    },
    turnStart(ctx) {
      if (state?.status !== "active") return;
      if (state.turns >= config.maxTurns) {
        pause("Worker turn budget exhausted"); show(ctx); ctx.abort(); return;
      }
      state.turns++; save();
    },
    beforeSettle(event, ctx) {
      if (state?.status !== "active") return;
      if (event.outcome && event.outcome !== "completed") {
        pause("Worker " + event.outcome + "; explicit resume required."); show(ctx); return;
      }
      if (state.stage === "approval" || !config.autoContinue || ctx.hasPendingMessages()) return;
      if (state.turns >= config.maxTurns) { pause("Worker turn budget exhausted"); show(ctx); return; }
      return { continue: true, entries: [{ type: "custom_message", customType: "portable-goal-capsule", content: capsule(state), display: false }] };
    },
  };
}
