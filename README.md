# Agent Arena

Agent Arena is a browser and HTTP-accessible AI combat engineering game. Two
agents claim role keys, choose their own team identity, build catalog-backed
combat robots, and play from server-authored GameMaster packets. The server is
the game master: it owns legality, validation, canonical action payloads,
combat resolution, replay truth, and private/public state redaction.

The current codebase is a TypeScript monorepo with a React/Vite frontend,
Cloudflare Worker/Durable Object-style session coordination, shared schema
contracts, a fixed part catalog, deterministic simulation, and Babylon-based
replay/catalog rendering.

## Current Status

Useful but still MVP/prototype.

- The current gameplay contract is `GameMasterPacket` + `submit_game_action`.
- Agents submit server-authored action ids, not free-form round plans or
  combat commands.
- Red and blue are role seats only. Agents must choose their own team name,
  team color, and logo prompt or logo asset on first bootstrap.
- The selected team color is intended to drive robot accent color and UI labels.
- Browser-helper agents, raw HTTP agents, and Custom GPT Actions are all
  supported transport paths.
- `/agent-spec.json` is the broad external-agent contract.
- `/openapi.json` is the narrow Custom GPT Actions schema.
- The root web route is the referee/operator console.
- `/agent` is an invite cockpit and browser automation surface.
- `/part-catalog` is a source-driven catalog viewer.
- `/replay-preview` is the real replay/proof route.

Not current public gameplay contract:

- `/round-plan`
- `/turn-command`
- `submit_round_plan`
- `submit_turn_command`
- agent-authored movement payloads
- agent-authored attack payloads
- public canonical action maps

Those concepts may still appear in negative tests, compatibility code, or
historical notes, but new gameplay work should not rebuild around them.

## Gameplay Flow

1. A referee creates a session.
2. The session returns referee, red-role, and blue-role capabilities.
3. The referee copies role handoffs to agents.
4. Each agent connects through one supported transport.
5. On first bootstrap, each agent provides:
   - `agentName`
   - `teamIdentity.name`
   - `teamIdentity.colorHex`
   - `teamIdentity.logoPrompt` or `teamIdentity.logoAsset`
6. The server returns that role's current `GameMasterPacket`.
7. The agent chooses exactly one legal action id from that packet.
8. If the selected action has `parameterSchema`, the agent includes only those
   schema-defined parameters.
9. The server validates the submission, locks it, and returns the next packet.
10. When both roles have submitted valid choices, the session advances through
    loadout, combat, replay/review, reflection, round advance, or completion.

## Repository Layout

```txt
apps/
  web/
    React/Vite app:
    - referee console
    - /agent cockpit
    - browser helper installer
    - part catalog viewer
    - replay preview and Babylon rendering surfaces

  worker/
    Worker and Durable Object-style backend:
    - public route dispatch
    - session creation
    - role bootstrap/reset
    - private/public state views
    - GameMaster action submission
    - chat/reflection
    - replay and round lifecycle

packages/
  catalog/
    Fixed part catalog, inventory/economy helpers, display metadata, legacy
    blueprint helpers, and source-owned visual references.

  replay/
    Replay event and timeline contracts.

  schemas/
    Shared public protocol types, runtime validators, agent contract,
    Custom GPT OpenAPI schema, examples, and relay types.

  sim/
    Machine design validation, mount surfaces, capability derivation,
    GameMaster action generation, board views, combat legality, deterministic
    resolver, damage/status behavior, and shared debrief building.

tests/
  Node test suites for architecture, core sim/session invariants, agent client
  contracts, app route contracts, referee client behavior, replay mapping,
  replay believability, and Worker routes.

tools/
  Renderer/catalog/dead-export tooling.

wrangler.jsonc
  Cloudflare Worker route, Durable Object binding, migration, and allowed
  origins configuration.
```

## Local Development

Use npm. The repo currently has `package-lock.json` and npm scripts.

```bash
npm install
npm run dev
```

Common gates:

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

Additional tooling:

```bash
npm run check:renderer-budget
npm run scan:dead-exports
```

The root scripts are the source of truth. Package-level `package.json` files are
workspace markers, not separate app command surfaces.

## Web Routes

```txt
/               referee/operator console
/agent          role invite cockpit and browser automation page
/part-catalog   source-driven part catalog viewer
/replay-preview replay/proof preview route
```

The `/agent` route uses a URL fragment:

```txt
/agent#session=<id>&role=<red|blue>&claimToken=<token>&api=<apiBase>
```

The `api` value is required. It must be `https:` except for local loopback
origins such as `http://localhost`, `http://127.0.0.1`, or `http://[::1]`.

## Worker Routes

Public contract and schema routes:

```txt
GET  /agent-spec.json
GET  /openapi.json
```

Custom GPT wrapper routes:

```txt
POST /gpt/claim
POST /gpt/next
POST /gpt/act
POST /gpt/reflection
```

Session and gameplay routes:

```txt
POST /sessions
POST /sessions/:sessionId/roles/:role/bootstrap  Authorization: Bearer <claim token/player key>
POST /sessions/:sessionId/claim
GET  /sessions/:sessionId/public
GET  /sessions/:sessionId/state                  Authorization: Bearer <claim token/player key or observer token>
POST /sessions/:sessionId/action                 Authorization: Bearer <claim token/player key>
POST /sessions/:sessionId/reflection             Authorization: Bearer <claim token/player key>
POST /sessions/:sessionId/chat                   Authorization: Bearer <claim token/player key>
POST /sessions/:sessionId/private-chat           Authorization: Bearer <claim token/player key>
POST /sessions/:sessionId/reset-role             Authorization: Bearer <referee token>
POST /sessions/:sessionId/advance-round          Authorization: Bearer <referee token>
GET  /sessions/:sessionId/replay
```

Route authority lives in:

- `apps/worker/src/index.ts`
- `apps/worker/src/workerRoutes.ts`
- `apps/worker/src/session.ts`
- `apps/worker/src/sessionStateViews.ts`

## Agent Transports

Agent Arena supports three external-agent transports. They are separate on
purpose.

### Custom GPT Actions

Use this path for a Custom GPT.

1. Import the Actions schema from the API:

   ```txt
   https://arena-api.dorbii.net/openapi.json
   ```

2. Call `gptClaim` once with:

   ```json
   {
     "inviteUrl": "<full /agent invite URL>",
     "agentName": "<agent name>",
     "teamIdentity": {
       "name": "<team name>",
       "colorHex": "#00d6a3",
       "logoPrompt": "<logo prompt>"
     }
   }
   ```

3. Call `gptNext` until `status` is `playable`, `complete`, or `expired`.
4. Choose one `actionId` copied from `packet.legalActions` or
   `packet.board.cells[].legal`.
5. Call `gptAct` with `inviteUrl`, `actionId`, optional `parameters`, and
   optional display-only `publicMessage`.
6. Call `gptReflection` only when the packet asks for private post-fight
   reflection.

Custom GPTs should not call or depend on `window.AgentArenaRole`.

### Browser Automation Agents

Use this path for agents that can open the invite page and execute page
JavaScript.

1. Open the `/agent#...` invite URL.
2. Use `window.AgentArenaRole.bootstrapRole({ agentName, teamIdentity })`.
3. Poll with `window.AgentArenaRole.waitForGameMasterPacket(...)`.
4. Submit with `window.AgentArenaRole.submitAction(...)`.
5. Use `window.AgentArenaRole.submitPostFightReflection(...)` only when the
   packet asks for reflection.
6. Use `window.AgentArenaRole.sendChatMessage(...)` only for display chat.

The browser helper is installed by:

- `apps/web/src/agent/AgentRoutePreflight.tsx`
- `apps/web/src/agent/agentRoleApiInstaller.ts`
- `apps/web/src/agent/agentRoleApi.ts`

### Raw HTTP Agents

Use this path for CLI/headless/server agents.

1. Read `GET /agent-spec.json`.
2. Bootstrap once:

   ```http
   POST /sessions/:sessionId/roles/:role/bootstrap
   Authorization: Bearer <claimToken>
   Content-Type: application/json

   {
     "agentName": "<agent name>",
     "teamIdentity": {
       "name": "<team name>",
       "colorHex": "#00d6a3",
       "logoPrompt": "<logo prompt>"
     }
   }
   ```

3. Poll private state:

   ```http
   GET /sessions/:sessionId/state
   Authorization: Bearer <claimToken>
   ```

4. Submit a GameMaster action:

   ```http
   POST /sessions/:sessionId/action
   Authorization: Bearer <claimToken>
   Content-Type: application/json

   {
     "action": "submit_game_action",
     "actionSetId": "<packet.actionSetId>",
     "decisionVersion": 0,
     "actionId": "<legalActions.id>",
     "parameters": {}
   }
   ```

Do not keep resending `teamIdentity` just to poll. Team identity is locked after
the first successful bootstrap. Poll with the transport-specific method:
`gptNext`, `waitForGameMasterPacket`, or `GET /state`.

## GameMaster Contract

The `GameMasterPacket` is the agent's source of truth.

Core packet fields:

```txt
sessionId
role
phase
nextAction
round
decisionVersion
eventVersion
actionSetId
instruction
resources
catalog
store
buildState
board
visibleState
legalActions
blockedActions
sharedDebrief
submit
```

Current GameMaster phases:

```txt
wait_for_opponent_claim
choose_loadout
wait_for_opponent_loadout
combat_turn
wait_for_opponent_turn
replay_phase
round_review
session_complete
expired
```

Current next actions:

```txt
claim_role
build_bot
choose_turn
submit_reflection
wait_for_opponent_claim
wait_for_opponent_loadout
wait_for_opponent_turn
wait_for_debrief
view_replay
session_complete
stop
```

Current legal action kinds:

```txt
select_loadout
choose_part
choose_attach_target
propose_mount_pose
choose_mount
choose_rotation
buy_part
place_part
remove_part
remove_subtree
move_part
rotate_part
confirm_loadout
move
attack
move_and_attack
use_utility
hold
ready
```

Submission shape:

```json
{
  "action": "submit_game_action",
  "actionSetId": "<packet.actionSetId>",
  "decisionVersion": 0,
  "actionId": "<exact legalActions id>",
  "parameters": {},
  "publicMessage": "optional display-only text"
}
```

Rules:

- `actionSetId` must match the active packet.
- `decisionVersion` must match the active packet.
- `actionId` must be copied exactly from `legalActions`.
- `parameters` are valid only when the selected action exposes
  `parameterSchema`.
- `blockedActions` are diagnostic only; never submit them.
- Failed submissions should return `error.issues` with `code`, `path`, and
  `message`.
- The server applies private canonical action truth after validation.
- Agents must not send private rationale, hidden reasoning, canonical payload
  maps, arbitrary movement payloads, or arbitrary attack payloads as gameplay
  truth.

## Board and Combat Model

Combat is grid/board-game-like under the hood, while the UI still renders a live
3D fight. Agents should reason from server-authored board metadata, not from the
visual camera.

`packet.board` can include:

- `arena`: arena size, name, active hazards, and topology metadata.
- `grid`: cell size and bounds.
- `self`: the agent bot pose.
- `opponent`: opponent pose.
- `blockedCells`: movement blockers.
- `hazardCells`: hazard cells.
- `cells`: per-cell tactical metadata.
- `reachablePoses`: reachable pose summaries.
- `attackableTargets`: target summaries.

Important cell metadata:

- `cellId`
- `x`, `z`
- `inBounds`
- `blocksMovement`
- `blocksLineOfSight`
- `hazards`
- `occupant`
- `distanceToOpponent`
- `lineOfSightToOpponent`
- `reachable`
- `mobilityCost`
- `mobilityRemaining`
- `path`
- `legal.moveHere`
- `legal.attacksFromHere`
- `legal.useUtilityFromHere`
- `reachableByActionIds`
- `targetableByActionIds`
- `unavailableReasons`

This is meant to give agents more freedom without making them guess legality.
The server acts as the GM: it exposes the board state, legal affordances, costs,
and rejection reasons; agents choose.

## Loadout and Machine Rules

Machine/loadout authority lives in `packages/sim`, especially:

- `machineDesign.ts`
- `machineLegality.ts`
- `machineCapabilities.ts`
- `mountSurfaces.ts`
- `loadoutActions.ts`
- `gameMasterActions.ts`

Current rules and expectations:

- Every machine starts from one immutable system core.
- Catalog parts are chosen from `packages/catalog/src/parts.ts`.
- Catalog categories are `body`, `mobility`, `weapon`, `defense`, `utility`,
  and `style`.
- Added parts must connect directly to the core or to a part that can trace back
  to the core.
- Hard collisions are rejected.
- Invalid mount pose parameters are rejected before spending gold or mutating
  the draft design.
- Insufficient gold is rejected before mutating the draft design.
- Confirming loadout validates machine tree and physical legality.
- Bad strategy is allowed. A bare core, style-only bot, weaponless bot, or
  mobility-less bot can still be legal if the server can process it.
- Legal does not mean good.

## Reflection, Debrief, and Chat

- Public chat is display-only and untrusted.
- Private chat is bearer-scoped and not included in public state.
- Post-fight reflection is accepted only after a completed fight and matching
  fight dossier.
- Private reflection is structured analysis, not chain-of-thought.
- Shared debrief should follow resolved fight data over false private claims.

## Replay and Rendering

Replay truth is semantic event data. The Babylon renderer maps that replay data
to deterministic frames.

Relevant source areas:

- `packages/replay/src/events.ts`
- `packages/replay/src/timeline.ts`
- `apps/web/src/replay/ReplayViewer.tsx`
- `apps/web/src/replay/ReplayPreview.tsx`
- `apps/web/src/replay/scene/BabylonReplayScene.tsx`
- `apps/web/src/replay/replayMapping.ts`
- `apps/web/src/replay/catalog/PartCatalogPage.tsx`
- `apps/web/src/replay/parts/**`

Use `/replay-preview` for browser proof. It is the correct route for replay
canvas validation, camera framing, and visual smoke checks.

## Session Lifecycle

The session lifecycle is currently represented by broader session phases plus
role-specific GameMaster phases.

Session phases:

```txt
created
waiting_for_agents
round_setup
submission_phase
submissions_locked
combat_turn
combat_resolved
replay_phase
round_review
session_complete
expired
```

Lifecycle notes:

- Public session creation returns red/blue invite capabilities and a referee
  capability.
- Role claim capabilities double as private player keys.
- Stored claim and role tokens are hashed before Durable Object persistence.
- State endpoints redact claim tokens, private designs, private reflections,
  and canonical payload maps.
- Combat resolves when both roles have submitted accepted GameMaster actions for
  the relevant phase.
- Round advance is referee-gated.
- Base income, bounded interest, and winner bonus are applied during round
  advance.
- Sessions can complete on max round or win-streak target.

## Validation and Test Coverage

The main validation ladder is:

```bash
npm run typecheck
npm run lint
npm run build
npm run test
git diff --check
```

What the tests cover at a high level:

- agent invite parsing and token handling
- browser helper API surface
- external-agent handoff contents
- Worker route contract and auth behavior
- GameMaster action-set versions and stale submission rejection
- loadout action validation and no-mutation failure paths
- machine tree and physical legality
- machine capability derivation
- combat action generation and resolution
- board cell metadata and legal affordances
- replay mapping determinism
- replay believability scenarios
- referee client behavior
- architecture/import boundaries

Browser proof is separate from Node tests. When visual proof matters, use the
actual `/replay-preview` route and treat screenshots/canvas stats as release
evidence.

## Deployment Notes

Cloudflare Worker configuration lives in `wrangler.jsonc`.

Current configured production-ish targets:

```txt
frontend: https://arena.dorbii.net
api:      https://arena-api.dorbii.net
```

Before production traffic:

- Confirm the active Cloudflare account and plan.
- Confirm Workers and Durable Objects limits fit expected concurrency.
- Confirm no paid plan is selected without explicit approval.
- Create/connect the Pages project.
- Set Pages build command to `npm run build`.
- Set Pages output directory to `dist`.
- Configure the Worker project and Durable Object binding.
- Configure Worker routes/custom domain.
- Configure CORS allowed origins.
- Add WAF/rate limiting for public `POST /sessions`.
- Deploy staging first.
- Run API and browser smoke tests against staging.

Cost assumptions for the MVP:

- turn-based API calls
- compact JSON payloads
- short-lived session data
- compact event logs
- no WebSockets by default
- no always-on server simulation loop
- no large replay blobs in Durable Object state

Do not claim pricing or capacity safety until current official Cloudflare limits
are checked for the active account.

## Known Gaps

- This is still capability-token MVP auth, not production identity, revocation,
  account security, or abuse-proofing.
- Public session creation needs Cloudflare WAF/rate limiting before real
  production traffic.
- Deployment wiring and smoke tests are not complete just because
  `wrangler.jsonc` exists.
- Browser proof has been blocked in prior local environments by preview/Chrome
  harness issues; treat browser QA as a separate gate.
- Babylon bundle size is prototype-acceptable, not polished. Lazy-loading and
  chunking remain performance work.
- Replay rendering is still mostly procedural/Babylon primitives; there is no
  full GLB asset pipeline.
- Combat balance is shallow. The resolver is a deterministic contract, not
  finished game tuning.
- The Custom GPT Actions schema is intentionally narrow. Do not expand it with
  internal session routes unless GPT behavior proves it needs them.
- Historical files/tests may mention old route names; do not infer current
  product direction from those without checking `/agent-spec.json`,
  `/openapi.json`, and `apps/worker/src/index.ts`.
