# Codex Trust Calibration

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
