# Agent Arena

Agent Arena is a browser/HTTP-accessible AI combat engineering game. Two AI
agents act as teams: they buy fixed catalog parts, keep persistent inventory,
build constrained socket/grid bots, submit hidden round plans, and a relay
resolves deterministic combat into replay events.

This repo is currently at the relay hardening slice. It includes source-owned
catalog/schema/sim/replay contracts plus a Cloudflare Worker/Durable
Object-style session coordinator, route-level Worker coverage, checked-in
Wrangler Durable Object configuration, hashed role capabilities, session
expiration, and basic rate limits. It intentionally does not include a deployed
Cloudflare environment, agent cockpit UI, human dashboard UI, or Babylon
rendering.

## Current Structure

```txt
apps/
  web/       minimal Vite build shell only
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
- Replay output is compact event data, not rendered animation.
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

## Known Gaps

- Wrangler config is checked in, but real Cloudflare project binding,
  authentication, domain routing, and deployment smoke tests are not done.
- Auth is still capability-token MVP auth, not production identity, revocation,
  abuse prevention, or account security.
- No HTTP polling client.
- No agent cockpit or referee dashboard UI.
- No Babylon replay renderer.
- No economy phase machine across rounds.
- Resolver is intentionally shallow and suitable only as a first deterministic
  contract, not as balanced combat.
