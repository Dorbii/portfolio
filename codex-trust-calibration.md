# Codex Trust Calibration

## 2026-06-04 Combat Duration, Tactical Fallback, and Replay Damage Feedback

Scope: `packages/sim/src/resolveCombat.ts`, `apps/web/src/replay/replayMapping.ts`, `apps/web/src/replay/BabylonReplayScene.tsx`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `tests/core.test.mjs`, `tests/replay-mapping.test.mjs`.

Intent: replace the six-second health-tiebreak combat outcome with deterministic extended resolution that continues until knockout, no-damage-for-one-minute stalemate, or a hard safety cap; add post-opener tactical fallback movement, center-hazard avoidance/use, weapon-control-aware firing, replay damage markers, debris, bot flinch, and tighter replay viewport sizing.

Risk: behavioral and visual.

Confidence: medium.

Review: needs_followup.

Review status note: Typecheck, test TypeScript emit, focused lint, focused Node tests, production build, and a direct resolver smoke passed. In-app Browser verification was blocked by the local browser bridge failure `windows sandbox failed: spawn setup refresh`; normal-browser replay QA remains required.

Review questions:
- Verify in a normal browser that damage markers, debris, bot flinch, and the wider camera framing are readable during real session replays.
- Decide whether the tactical fallback should become a first-class combat policy model before adding drones, flying bots, turrets, nets, or true detachable part damage.

Reason for sidecar: Agent Arena code quality rules already use this sidecar for provenance instead of inline marker comments in production code.

## 2026-06-03 Phase 6 Referee Awards and Economy Loop

Scope: `packages/schemas/src/types.ts`, `packages/schemas/src/relay.ts`, `packages/schemas/src/validators.ts`, `packages/schemas/src/agentContract.ts`, `apps/worker/src/session.ts`, `apps/worker/src/index.ts`, `apps/web/src/App.tsx`, `apps/web/src/mockSession.ts`, `apps/web/src/agent/LiveAgentCockpit.tsx`, `apps/web/src/styles.css`, `tests/core.test.mjs`, `tests/worker-route.test.mjs`, `README.md`.

Intent: add referee capability-backed award submission, deterministic three-card award generation, award validation, next-round base income plus capped interest plus award bonus application, win/loss/streak tracking, max-round and streak completion, public/private redacted award option exposure, and an interactive local referee award panel.

Risk: behavioral, interface, and visual.

Confidence: medium.

Review: needs_followup.

Review status note: Direct implementation was used after backend and frontend worker subagents did not return usable output within a bounded wait. Typecheck, test TypeScript emit, and focused Node tests passed during implementation; final full validation is recorded in the phase handoff.

Review questions:
- Decide whether the MVP should preserve access to the previous round replay after awards advance into the next submission phase.
- Verify the root mock award panel and live `/agent` award exposure in a normal browser after the local browser automation path is available.

Reason for sidecar: Agent Arena code quality rules say no comments in production code, so provenance markers are tracked here instead of inline.

## 2026-06-03 Phase 5 Babylon Replay MVP

Scope: `apps/web/src/replay/replayMapping.ts`, `apps/web/src/replay/babylonPartRenderer.ts`, `apps/web/src/replay/BabylonReplayScene.tsx`, `apps/web/src/replay/ReplayViewer.tsx`, `apps/web/src/App.tsx`, `apps/web/src/mockSession.ts`, `apps/web/src/styles.css`, `tsconfig.test.json`, `tests/replay-mapping.test.mjs`, `package.json`, `package-lock.json`, `README.md`.

Intent: replace the placeholder replay shell with a Babylon.js primitive arena renderer, catalog-driven bot part meshes, deterministic replay-time visual mapping, replay controls, camera presets, effect playback, WebGL fallback copy, and focused mapping tests.

Risk: behavioral, interface, visual, and performance.

Confidence: medium.

Review: needs_followup.

Review status note: Typecheck, lint, Vite build, test TypeScript emit, and Node tests passed. Browser visual QA passed through a bounded headless Chrome/CDP fallback after both in-app Browser and Chrome extension paths failed with `windows sandbox failed: spawn setup refresh`. The canvas rendered nonblank, red/blue bots were readable, replay play/scrub states advanced through weapon fire, impact, hazard, and KO events, and the `/agent` route loaded without crashing.

Review questions:
- Verify the Babylon replay in normal Chrome or the in-app Browser after the local browser bridge/runtime issue is fixed.
- Re-check camera framing once real replay timelines contain denser motion, impacts, and hazards.

Bundle decision: the 1.35 MB minified Babylon-bearing build chunk is acceptable for the MVP prototype. It is not deploy-polished. Lazy-loading the replay renderer should be a Phase 7/perf hardening item unless the Director decides bundle size blocks the demo.

Reason for sidecar: Agent Arena code quality rules say no comments in production code, so provenance markers are tracked here instead of inline.

## 2026-06-03 Phase 4 Agent Cockpit Integration

Scope: `apps/web/src/App.tsx`, `apps/web/src/agent/agentClient.ts`, `apps/web/src/agent/LiveAgentCockpit.tsx`, `apps/web/src/styles.css`, `apps/worker/src/index.ts`, `packages/schemas/src/agentContract.ts`, `tsconfig.test.json`, `tests/agent-client.test.mjs`, `tests/worker-route.test.mjs`, `README.md`.

Intent: make `/agent` invite links functional by parsing fragment capabilities, claiming a role, storing the role bearer token in browser session storage, polling role/public state, submitting round plans, exposing `window.AgentArenaRole`, publishing machine-readable state in `#agent-arena-state`, and allowing cross-origin Worker API calls from a Pages-hosted cockpit.

Risk: interface and behavioral.

Confidence: medium.

Review: needs_followup.

Review questions:
- Verify the `/agent` route against a real deployed Pages + Worker domain pair, not only local build and route-level tests.
- Decide whether session storage is the right MVP token lifetime or whether tab restore behavior should be tighter.

Review status note: CORS/API validation gaps and browser API tests, including `window.AgentArenaRole.getValidActions()`, were fixed after review. Final Phase 4 QA passed with typecheck, lint, Vite build, test TypeScript emit, and the Node test suite. Deployed Pages + Worker smoke and the session storage lifetime decision remain open.

Reason for sidecar: Agent Arena code quality rules say no comments in production code, so provenance markers are tracked here instead of inline.

## 2026-06-03 Relay Foundation Markers

Scope: `packages/schemas/src/relay.ts`, `packages/schemas/src/agentContract.ts`, `apps/worker/src/index.ts`, `apps/worker/src/session.ts`.

Intent: define the relay-facing session/error contracts, publish the agent-facing endpoint contract, expose the Worker HTTP boundary, and coordinate role claims, private/public state, submissions, and automatic combat resolution.

Risk: interface and behavioral.

Confidence: medium.

Review: needs_followup.

Review questions:
- Confirm the phase lifecycle and bearer-capability model before treating this as production auth.
- Verify binding and deployment config against the real Wrangler environment before shipping.

Reason for sidecar: Agent Arena code quality rules say no comments in code, so provenance markers are tracked here instead of inline.

## 2026-06-03 Relay Hardening

Scope: `apps/worker/src/session.ts`, `apps/worker/src/index.ts`, `packages/schemas/src/relay.ts`, `packages/schemas/src/agentContract.ts`, `wrangler.jsonc`, `tests/core.test.mjs`, `tests/worker-route.test.mjs`.

Intent: store invite and role tokens as SHA-256 hashes, add session expiration, add basic persisted per-action rate limits, map new relay errors to HTTP statuses, add Worker/Durable Object route coverage, and check in the Durable Object Wrangler configuration.

Risk: behavioral and interface.

Confidence: medium.

Review: needs_followup.

Review status note: Independent QA passed code-level relay hardening with fixes. Route-level expired/rate-limited status coverage, session ID validation, and secure random fallback fixes were applied after QA. Cloudflare deploy smoke and threshold review remain open.

Review questions:
- Confirm the session TTL and rate-limit thresholds before exposing a public demo.
- Verify Cloudflare Wrangler deploy behavior and Durable Object migration naming in a real Cloudflare account.
- Decide whether polling rate-limit writes are acceptable for the MVP cost model.

## 2026-06-03 Phase 2 Local Mock Frontend

Scope: `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/src/mockSession.ts`, `README.md`.

Intent: replace the foundation shell with a local mock referee dashboard, replay placeholder, award panel, agent cockpit, inventory/submission views, and part catalog display without introducing backend coupling.

Risk: behavioral and interface.

Confidence: medium.

Review: needs_followup.

Review status note: Independent QA passed Phase 2 with README fixes. README status was corrected. Typecheck, lint, build, and core tests passed. Browser automation was attempted through the in-app browser, CDP, and headless Chrome CLI but remained inconclusive due local browser runtime failures.

Review questions:
- Verify the mock UI visually in a real browser before treating the layout as accepted.
- Decide whether inert replay controls should be disabled or left as mock controls before the next UI integration phase.
