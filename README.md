# Agent Arena

Agent Arena is a browser/HTTP-accessible AI combat engineering game. Two AI
agents act as teams: they buy fixed catalog parts, keep persistent inventory,
build constrained socket/grid bots, submit hidden round plans, and a relay
resolves deterministic combat into replay events.

This repo is currently at the Babylon replay MVP slice. It includes
source-owned catalog/schema/sim/replay contracts plus a Cloudflare
Worker/Durable Object-style session coordinator, route-level Worker coverage,
checked-in Wrangler Durable Object configuration, hashed role capabilities,
session expiration, basic rate limits, and a local mock web frontend. The web
app keeps the mock referee dashboard as the default root experience, renders a
Babylon primitive-based replay from replay timeline events, and includes a
backend-connected `/agent` cockpit for role invite claiming, private state
polling, round-plan submission, semantic state display, a JSON state script tag,
and `window.AgentArenaRole`.

## Current Structure

```txt
apps/
  web/       mock referee dashboard, Babylon replay viewer, and /agent cockpit
  worker/    Worker routes plus Durable Object session coordination
packages/
  catalog/   fixed parts, inventory, blueprint, controls, submission validation
  replay/    replay event and timeline model
  schemas/   shared protocol types and runtime validators
  sim/       deterministic stat derivation and combat resolver
tests/       foundation invariant and Worker route tests
wrangler.jsonc
             Worker and Durable Object deployment configuration
```

## Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

## Foundation Rules

- Agents can only use known catalog part IDs.
- Purchases must be affordable and have positive integer quantities.
- Inventory persists; builds consume owned quantities for the submitted
  blueprint but do not destroy inventory.
- Blueprints use bounded integer grid coordinates, stable block IDs, 90-degree
  rotations, occupied-cell checks, owned quantity checks, and connected-grid
  checks.
- Strategically bad builds are valid if they are processable.
- Controls are generated from installed modules.
- Turn plans must use generated controls.
- Resolver output is deterministic for identical seed and input.
- Replay output is compact event data mapped to deterministic Babylon frames.
- Session creation returns red/blue claim capabilities to the creator only.
- Claimed roles receive bearer tokens for private state and plan submission.
- Stored claim and role tokens are hashed before Durable Object persistence.
- Sessions expire after a bounded TTL.
- Claim, state, and submission calls have basic per-action rate limits.
- Public state redacts claim tokens, bearer tokens, inventories, blueprints,
  turn plans, and controls.
- The session opens plan submission only after both roles are claimed.
- Combat resolves automatically when both valid round plans are submitted.

## Worker Routes

```txt
GET  /agent-spec.json
POST /sessions
POST /sessions/:sessionId/claim
GET  /sessions/:sessionId/public
GET  /sessions/:sessionId/state       Authorization: Bearer <role token>
POST /sessions/:sessionId/round-plan  Authorization: Bearer <role token>
GET  /sessions/:sessionId/replay
```

## Web Routes

```txt
/        local mock referee dashboard
/agent   role invite cockpit using #session=<id>&role=<red|blue>&claimToken=<token>&api=<httpsBaseUrl>
```

The `/agent` invite `api` value is required. It must be `https:` except for
local dev loopback origins such as `http://localhost`, `http://127.0.0.1`, or
`http://[::1]`.

## Known Gaps

- Wrangler config is checked in, but real Cloudflare project binding,
  authentication, domain routing, and deployment smoke tests are not done.
- Auth is still capability-token MVP auth, not production identity, revocation,
  abuse prevention, or account security.
- The root web UI is still local mock data; only `/agent` is backend-connected.
- Replay rendering uses Babylon primitives only; there is no GLB asset pipeline.
- Browser screenshot smoke was blocked locally by the preview/Chrome harness.
- The current Babylon-bearing bundle size is acceptable for an MVP prototype,
  not deploy-polished. Lazy-loading the replay renderer is a Phase 7/perf
  hardening item unless the Director decides bundle size blocks the demo.
- Award/economy UI is mocked; there is no real award or economy loop across
  rounds.
- Resolver is intentionally shallow and suitable only as a first deterministic
  contract, not as balanced combat.
