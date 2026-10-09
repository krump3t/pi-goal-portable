---
name: goal
description: Execute a host-verified goal DAG with Navigator planning, Wizard review, Priest recovery and an animated Pi HUD. Use when /goal is active.
compatibility: Pi 1.1.0 compatible goal_update extension and a cloud chat model with tool calling.
---

# Goal flow

The host owns state and proof. Follow only the latest NEXT ACTION.
Read relevant source, tests and repository instructions before making changes.
Preserve user work. Do not access credentials, restart services, push or deploy.

1. Discover the code and propose a concise approach; call goal_update with
   action=plan, text=your approach, and optional verify_command. Do not fabricate
   phases or certify completion. Navigator writes the DAG; Wizard audits it.
2. Await owner approval. The host records gate baselines, then exposes a capsule.
3. Execute only the ready node named in NEXT ACTION. Call action=check with
   a brief evidence note. The host runs the locked gate and Wizard reviews.
4. A red calls Priest. Follow its redirect; if you cannot pass the gate, call
   action=blocked with reproduced evidence. Never weaken tests or work around
   an owner-only action. Gate repair belongs to Priest and owner reapproval.
5. When no nodes remain, call action=done. The host re-runs every gate and the
   locked proof and calls a fresh final Wizard, then Scholar.
6. Provider errors, invalid contracts or limits pause safely. Do not retry
   autonomously after a pause; the owner must resume.
7. action=status initializes owner-approved host baselines, then reads the capsule. No self-declared success, alternate proof
   at done time, or gate command disguised as ordinary verification.

Goals and evidence persist inside the current Pi session. Always distinguish
VERIFIED host outcomes from INFERRED conclusions and UNVERIFIED gaps.
