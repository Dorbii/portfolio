# Codex Trust Calibration

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
