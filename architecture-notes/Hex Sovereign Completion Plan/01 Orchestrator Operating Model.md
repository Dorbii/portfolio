# Orchestrator Operating Model

## Objective

Use subagents to reduce wall-clock time and keep the main context lean, while preserving one accountable architecture owner.

The main agent is the orchestrator. Subagents provide bounded evidence, patches, verification, or draft artifacts. The orchestrator integrates, resolves conflicts, and owns the final release gate.

## Lessons Adopted From Token Burn Review

Hard process rules:

- Read before proposing.
- Spike before committing to a costly path.
- Keep one long warm session when possible.
- Use a plan file as the continuation contract.
- Delegate work likely to consume more than about 30k internal tokens.
- Require subagent returns of 500 words or less unless the deliverable is a file.
- Use real integration smoke gates, not only unit-green.
- Make risky delegate tasks required and explicit, not "optional".
- Batch verification at checkpoints instead of fragmenting repeated runs.

## Main Orchestrator Responsibilities

The orchestrator owns:

- final scope control
- architecture decisions
- source-of-truth interpretation
- subagent task design
- write-scope boundaries
- conflict resolution
- integration review
- release readiness
- final user-facing summary

The orchestrator should not delegate:

- ambiguous product decisions
- final claims about what shipped
- final release go/no-go
- broad refactors with unclear ownership
- tasks where the next local step is blocked on the result

## Model Routing

Use cheaper/faster agents when the task is bounded and the failure cost is low.

### Main Orchestrator

Recommended model: current main model, or `gpt-5.5` for high-risk architecture and integration.

Use for:

- architecture synthesis
- cross-file integration
- risky UI/product judgment
- final verification interpretation
- release decision

### `gpt-5.4`

Use for:

- bounded test-suite implementation
- protocol validation hardening
- modest engine refactors
- Playwright or browser smoke automation when tool use matters
- multi-file changes with clear contracts

### `gpt-5.4-mini`

Use for:

- straightforward docs and metadata changes
- simple CSS/layout fixes after a specific screenshot finding
- small fixture additions
- mechanical README updates
- narrow cleanup tasks with a clear diff target

### `gpt-5.3-codex-spark`

Use for:

- read-only source-doc synthesis
- repo inventory
- issue checklist generation
- acceptance-criteria audits
- screenshot/smoke-test observation reports
- brief drafting where the main agent will edit the final artifact

Avoid Spark for:

- subtle game-rule changes
- final protocol security decisions
- broad UI redesign
- hidden-state serialization logic
- anything where a wrong answer would silently corrupt architecture

## Delegation Pattern

Before spawning agents:

1. Identify the critical path.
2. Keep the next blocking task local.
3. Split sidecar work into independent lanes.
4. Assign exact ownership and output.
5. State what must not be changed.
6. State validation requirements.
7. Require a short final response with paths, validation, risks, and blockers.

## Context Packet Standard

Every subagent should receive only the context it needs:

- current goal
- canonical source docs
- relevant repo paths
- current decisions
- write boundary or read-only boundary
- expected output
- validation gate
- forbidden scope

Do not send the whole project history unless the task needs it.

## Worker Fences

Every worker prompt should include:

- "Other agents may be editing nearby files; do not revert unrelated changes."
- "Keep changes scoped to your ownership."
- "Preserve existing behavior unless the task explicitly changes it."
- "Do not expand MVP mechanics."
- "Do not claim online multiplayer or public API behavior."

## Integration Rule

When a subagent returns:

1. Read the changed files or cited evidence.
2. Compare against this plan.
3. Reject scope creep.
4. Resolve duplicate or conflicting changes once.
5. Run the focused gate for that slice.
6. Update this pack if the architecture decision changed.

## Status Discipline

Use this status vocabulary in future plan updates:

- `not-started`
- `in-progress`
- `blocked`
- `implemented`
- `verified`
- `deferred`

Do not mark a slice `verified` until its listed gate has run.
