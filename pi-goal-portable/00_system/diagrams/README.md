# Portable workflow diagrams

## Job
Explain the portable package's goal lifecycle for GitHub readers. This is a
compact overview, not the full state machine or evidence of live-model execution.

## Conventions
goal-workflow.svg is the self-contained, accessible landing-page image.
goal-workflow.mmd is the editable Mermaid semantic source; its automatic layout
need not match the SVG geometry. Revise both when workflow semantics change.

## Dependencies and permission boundaries
Documentation only: no executable scripts, remote assets, credentials or runtime
imports. These are new AI-authored vector diagrams, not copies of the local
Pi/Hermes decks. Labels reflect the portable runner, not local-model architecture.
Runtime code and host records remain authoritative.

## Entrypoints and map
- [goal-workflow.svg](goal-workflow.svg): default consent, baselines, per-node loop,
  final reruns/review and bounded recovery; Scholar is advisory after acceptance.
- [goal-workflow.mmd](goal-workflow.mmd): editable topology and recovery notes.
- [architecture](../ARCHITECTURE.md): precise behavior and omitted local features.
- [runner](../../02_app/runner.mjs): owning implementation.

Parent: [governance roadsign](../README.md).

Last updated: 2026-10-09
