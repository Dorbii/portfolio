# Hex Sovereign Completion Plan

## Purpose

This pack is the implementation and orchestration plan for completing Hex Sovereign as the portfolio's first-screen experience.

It does not replace the canonical design docs. It turns them, the current handoff, and the current repo state into an execution plan that keeps the main agent as orchestrator while using subagents for bounded research, implementation, verification, and documentation lanes.

## Canonical Inputs

- `C:\Users\Steve\Documents\Obsidian Vault\Personal\Go-Game`
- `C:\Users\Steve\Documents\Obsidian Vault\Personal\Go-Game\Mechanics\Game Mechanics and Rules.md`
- `C:\Users\Steve\Documents\Obsidian Vault\Personal\Go-Game\Design Docs\00 Index.md` through `14 Portfolio Case Study Plan.md`
- `C:\Users\Steve\Documents\Obsidian Vault\Personal\Go-Game\Simulations\Sim 1 result.md`
- `C:\Users\Steve\Documents\Obsidian Vault\Personal\Go-Game\Simulations\Sim 2 results.md`
- `C:\Users\Steve\Documents\Obsidian Vault\NinjaOne\Token Analysis\Token Burn Review.md`
- Current repo handoff for `C:\Users\Steve\Documents\Github\portfolio`

## Current Goal

Finish the Hex Sovereign portfolio MVP validation and polish without widening MVP mechanics.

The MVP is:

- deterministic hex engine
- legal action generation
- stone placement
- captures
- suicide prevention
- pass
- anchors
- basic Domain derivation
- playable board
- human vs human
- human vs bot
- manual JSON debug panel
- browser-local agent protocol
- static deployment
- honest case-study framing

The MVP is not:

- full v0.5 rules
- real online multiplayer
- public HTTP API
- backend persistence
- production balance
- cards, decrees, influence, corruption, mandates, or full economy as playable systems

## Confirmed Current State

The handoff and repo inspection agree:

- `src/game/engine.js` already owns board generation, anchors, legal actions, captures, suicide prevention, pass, Domain derivation, agent requests, protocol submission, and a simple bot.
- `src/App.jsx` already provides the playable UI, player panels, selected-cell and Domain inspector, event log, JSON debug panel, bot/human toggles, invite URLs, and agent console route.
- `src/styles.css` already contains the Hex Sovereign visual system.
- `public/hex-sovereign/` contains the concept assets.
- `eslint` passed.
- `vite build` passed outside the sandbox.

Known gaps:

- Browser smoke test is incomplete because the Browser connector failed.
- No test runner or test files exist yet.
- README and HTML metadata still describe a generic portfolio starter.
- Runtime visual/layout issues have not been verified after the MVP build.
- The protocol is local and browser-mutable by design; portfolio copy must not overclaim security or online multiplayer.

## Core Architecture Decision

Keep the first release centered on the strongest technical story:

> a deterministic static-browser strategy game where humans, bots, debug tools, and browser agents all submit legal action IDs through the same validated protocol.

The main rule remains:

> only the engine generates legal actions and applies rule transitions.

All future systems must pay the same integration cost before becoming playable:

- rule module
- state shape
- legal actions
- protocol payload
- selected-panel explanation
- event log messages
- tests
- balance or design note

## Plan Files

- `00 Plan Overview.md`: this file.
- `01 Orchestrator Operating Model.md`: how the main agent directs subagents and chooses cheaper models.
- `02 MVP Completion Architecture.md`: exact finish line for the current release.
- `03 Expansion Architecture Contracts.md`: how the full game grows after MVP without breaking the engine/protocol story.
- `04 Vertical Slices And Agent Matrix.md`: implementation sequence, owners, model choices, and gates.
- `05 Validation And Release Gates.md`: tests, smoke checks, and balance gates.
- `06 Portfolio Case Study And Metadata.md`: public-facing story, README, title, and honest claims.
- `07 Subagent Brief Library.md`: reusable prompts for future worker and explorer agents.

## Operating Rule

This plan is the continuation contract. Future sessions should start here, update status in this pack, then delegate bounded lanes from the subagent brief library.
