# Agent Arena

Agent Arena is a browser/HTTP-accessible AI combat engineering game. Two AI
agents act as teams: they buy fixed catalog parts, keep persistent inventory,
build constrained socket/grid bots, submit hidden round plans, and a relay
resolves deterministic combat into replay events.

This repo is currently at the referee awards and economy loop slice. It
includes source-owned catalog/schema/sim/replay contracts plus a Cloudflare
Worker/Durable Object-style session coordinator, route-level Worker coverage,
checked-in Wrangler Durable Object configuration, hashed role and referee
capabilities, session expiration, basic rate limits, deterministic referee
award options, next-round income/interest/award application, win-streak and
max-round completion, a create-session capability gate, and a local mock web frontend. The web app keeps the mock
referee dashboard as the default root experience, renders a Babylon
primitive-based replay from replay timeline events, exposes interactive local
award selection, and includes a backend-connected `/agent` cockpit for role
invite claiming, private state polling, round-plan submission, semantic state
display, a JSON state script tag, and `window.AgentArenaRole`.

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

## Phase 7 Setup and Reliability Guardrails

Use this section as the canonical checklist before claiming any deployment is complete.

### Fresh setup (local)

1. Install Node.js LTS.
2. Use npm for this repo unless the package manager is intentionally changed; the current repo has `package-lock.json` and npm scripts.
3. Install Wrangler CLI if you are doing Cloudflare setup:
   - `npm install -g wrangler`
4. Clone the repository and run from project root:
   - `npm install`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - `npm run test`
   - `npm run dev`
5. Authenticate Wrangler:
   - `wrangler login`
6. Validate credentials before any deploy:
   - `wrangler whoami`

If Steve later decides to use `pnpm`, update the lockfile and setup commands in the same change.

### Cloudflare Pages + Worker setup (not pre-completed)

Complete this before production traffic:

- [ ] Confirm Cloudflare zone is on the Free plan.
- [ ] Confirm Workers Free is enabled for the account.
- [ ] Confirm Durable Objects free allotment is sufficient for expected concurrency.
- [ ] Confirm no paid plan is currently selected for this project without explicit approval.
- [ ] Create a Pages project and connect to the GitHub repository branch you plan to deploy.
- [ ] Set Pages build command to `npm run build`.
- [ ] Set Pages output directory to `dist`.
- [ ] Add recommended production domains:
  - frontend: `arena.dorbii.net`
  - API: `arena-api.dorbii.net`
- [ ] Add a Worker project and configure Durable Object binding + namespace to match `wrangler` config.
- [ ] Add Worker routes/custom domain and CORS origin for Pages domain + localhost dev origins.
- [ ] Add a Cloudflare WAF rate limiting rule for public session creation.
  - Free-plan-safe match expression: `(http.request.uri.path eq "/sessions")`
  - If the active Cloudflare plan supports host/method fields in rate limiting
    expressions, use:
    `(http.host eq "arena-api.dorbii.net" and http.request.method eq "POST" and http.request.uri.path eq "/sessions")`
  - Count by source IP, account for CORS preflight requests if using the
    path-only rule, start with a low per-minute threshold for a portfolio demo,
    and tune from real traffic.
- [ ] Wire required environment variables and keep secrets out of source control.
- [ ] Deploy staging, then production.
- [ ] Run an API smoke test against staging before production.

If any row above remains unchecked, the deployment should be treated as incomplete.

### Cost guardrails

Assumptions for MVP cost safety are:

- Turn-based API calls only.
- Cloudflare edge rate limiting on `POST /sessions`.
- Compact JSON payloads and short-lived session data.
- Compact event logs.
- No WebSocket by default.
- No always-on server animation loop.
- No large replay blobs stored in Durable Object state.

Traffic assumptions for guardrail estimation are currently 100-300 API requests/match.
That range may be safe only after you verify current Cloudflare limits for:

- Workers request ceilings
- Durable Object CPU/memory/request constraints
- Log/write usage and namespace/storage quotas
- Free-tier and paid-tier plan behavior

Do **not** claim pricing/capacity safety in this doc until official Cloudflare docs are checked on this date and confirmed for the active account.

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
- Session creation is public self-service and returns red/blue claim
  capabilities to the creator only.
- Public session creation must be protected by Cloudflare WAF/rate limiting
  before production traffic.
- Role claim capabilities double as private player keys for external agents:
  `bootstrap` can claim or resume a role, and the same key can poll private
  state or submit plans after the role is claimed.
- Legacy role claiming still returns bearer tokens for private state and plan
  submission.
- Stored claim and role tokens are hashed before Durable Object persistence.
- Sessions expire after a bounded TTL.
- Claim, state, and submission calls have basic per-action rate limits.
- Public state redacts claim tokens, bearer tokens, inventories, blueprints,
  turn plans, and controls.
- The session opens plan submission only after both roles are claimed.
- Combat resolves automatically when both valid round plans are submitted.
- Replay remains available after combat during the referee awards phase until
  awards advance the match to the next round.
- Combat resolution generates exactly three referee award options.
- Referee awards require the referee capability, allow up to two selections,
  enforce at most one award per team, and apply bonus gold only to the next
  round economy.
- Next-round economy applies base income plus capped interest:
  `min(floor(unspentGold * 0.10), 25)`.
- Sessions complete on a three-win streak or when the configured max round is
  resolved.

## Worker Routes

```txt
GET  /agent-spec.json
POST /sessions
POST /sessions/:sessionId/roles/:role/bootstrap  Authorization: Bearer <claim token/player key>
POST /sessions/:sessionId/claim
GET  /sessions/:sessionId/public
GET  /sessions/:sessionId/state       Authorization: Bearer <claim token/player key or role token>
POST /sessions/:sessionId/round-plan  Authorization: Bearer <claim token/player key or role token>
GET  /sessions/:sessionId/replay
POST /sessions/:sessionId/referee-awards  Authorization: Bearer <referee token>
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
- Phase 7 deployment hardening is incomplete: Cloudflare account/plan checks,
  Pages+Worker project setup, session-creation rate limiting, route/CORS
  verification, and production smoke testing are still pending.
- Role and referee auth are still capability-token MVP auth, not production
  identity, revocation, or account security.
- Public session creation depends on Cloudflare WAF/rate limiting for abuse
  control; the Worker does not authenticate `POST /sessions`.
- The root web UI is still local mock data; only `/agent` and Worker route tests
  are backend-connected.
- Replay rendering uses Babylon primitives only; there is no GLB asset pipeline.
- Browser screenshot smoke was blocked locally by the preview/Chrome harness in prior
  environment sessions; no replacement browser verification has been confirmed in
  this repository state.
- The current Babylon-bearing bundle size is acceptable for an MVP prototype,
  not deploy-polished. Lazy-loading the replay renderer is a Phase 7/perf
  hardening item unless the Director decides bundle size blocks the demo.
- Resolver is intentionally shallow and suitable only as a first deterministic
  contract, not as balanced combat.
