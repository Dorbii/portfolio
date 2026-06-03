# Expansion Architecture Contracts

## Expansion Principle

Only add a mechanic when the previous layer is readable, testable, and represented in the legal-action protocol.

Each expansion must include:

- engine rule module
- state shape
- legal actions
- protocol payload
- selected-panel explanation
- event log messages
- tests
- balance or design note

If one of those is missing, the mechanic is not complete.

## Core Extension Shape

The current MVP can stay simple. Future mechanics should be introduced through explicit rule modules or clearly separated rule sections, not scattered UI conditionals.

Conceptual rule module contract:

```ts
RuleModule {
  id
  featureFlag
  deriveState(state)
  getLegalActions(state, seat)
  applyAction(state, action, seat)
  resolvePhase(state)
  projectPublicState(state)
  projectSeatState(state, seat)
  describeEvent(event)
}
```

This does not need to be implemented as an abstraction immediately. It is the design contract for deciding whether a mechanic has all required surfaces.

## State Versioning

Future state should remain deterministic and versioned.

Recommended top-level fields:

```ts
MatchState {
  matchId
  rulesVersion
  featureFlags
  phase
  cycle
  round
  turn
  activeSeat
  initiativeSeat
  board
  players
  anchors
  regions
  domains
  planning
  cards
  pressure
  victory
  eventLog
  requestCounter
}
```

MVP can leave most fields absent or empty. Expansion work should add them intentionally, not as ad hoc payload blobs.

## Protocol Contract

All actors consume a request and submit a selected action ID.

Future protocol shape:

```ts
AgentRequest {
  type
  requestId
  matchId
  seat
  phase
  rulesVersion
  publicState
  privateState
  legalActions
  explanationHints
}
```

Rules:

- public state must be safe for either seat
- private state must be generated for exactly one seat
- opponent hands and hidden planning choices must never serialize into another seat's request
- legal actions must be generated from the same rule truth used by UI and bot
- stale, wrong-seat, wrong-token, malformed, and illegal submissions must reject without mutation

## UI Contract

Every mechanic needs an explanation surface.

Required surfaces:

- board mark or overlay
- selected-cell or selected-Domain details
- legal action tray
- event log message
- debug JSON representation
- case-study or roadmap note when appropriate

Do not add a board state that is only explained by color.

## Event Log Contract

The event log is part of the teaching and debugging architecture.

Future events should include:

```ts
Event {
  id
  cycle
  round
  phase
  seat
  kind
  message
  detail
  public
}
```

Hidden-card events must avoid leaking exact hidden information to the opponent.

## Roadmap Order

Use this sequence unless fresh evidence invalidates it:

1. Reinforcements
2. Basic income
3. Stability
4. Decrees
5. Influence support and pressure
6. Corruption and siphoning
7. Region cards
8. Set cash-ins
9. Counter-draft
10. Victory warnings
11. Mandates
12. Stronger bots
13. Browser Agent Console polish
14. Localhost bridge
15. Optional backend/shared matches

## Expansion Contracts By System

### Reinforcements

Role: first extension because it deepens board play without hidden information.

Needs:

- token count in player state
- legal action type `SPEND_REINFORCEMENT`
- per-round spending limit
- normal placement/capture/suicide rules
- reserve cap and expiration later
- bot scoring from legal actions only

Gate:

- reinforcement placement uses the same capture and suicide fixtures as normal placement
- UI explains token count and spend limit

### Income, Stability, And Decrees

Role: turns Domains into engines after Domain control is readable.

Needs:

- Domain stability, income, decree slots, status
- player gold and upkeep due
- legal actions for repair, buy decree, upgrade decree, upkeep, ruined decree handling
- deterministic cycle resolution summary
- selected Domain panel explaining inactive decrees and repair options

Risks:

- economy snowball
- UI overload
- unclear rule timing

Gate:

- contested/disputed Domains shut down income and decrees
- bots can choose economy actions through legal actions
- event log explains income, repair, upkeep, shutdown, and decay

### Influence, Corruption, And Pressure

Role: adds indirect conflict after economy and stability exist.

Needs:

- influence source derivation
- support and pressure assignments
- corruption as a pressure subtype
- target legality
- projected effects
- counter-bribe or purge actions
- public reveal timing

Risks:

- spreadsheet combat
- Cultural Mandate reliability
- hidden planning leakage

Gate:

- projected pressure is visible before resolution
- net pressure resolves deterministically
- protocol exposes legal targets without hidden opponent planning data

### Cards, Sets, And Counter-Draft

Role: adds hidden planning only after public systems are legible.

Needs:

- region card pools
- private hands
- public card counts
- seat-aware private state
- draft eligibility from controlled regions
- set detection
- cash timing
- counter-draft options
- discard flow

Risks:

- hidden information leakage
- Seek Missing Card dominance
- confusing counter-draft timing

Gate:

- tests prove opponent hands are redacted
- completed sets can be detected without UI
- counter-draft choice is public at the category level only

### Victory, Eras, And Mandates

Role: adds endgame structure after the systems that feed victory exist.

Needs:

- era progression
- warning detection
- warning persistence
- simultaneous win handling
- sudden death
- mandate condition checks
- warning explanation and "how to stop this" hints

Risks:

- mandates make board state feel secondary
- sudden death confusion
- non-surrender wins without warning

Gate:

- no non-surrender win can occur without a public warning
- opponent receives one full cycle to respond
- active warnings are visible to UI and protocol

### Bots, Localhost Bridge, And Backend

Role: expands integrations after Browser Agent Mode is proven.

Order:

1. stronger bots consuming `AgentRequest`
2. simulation/evaluation bot
3. Browser Agent Console polish
4. local bridge for development tools
5. optional backend/shared matches

Backend is required only for:

- real multiplayer across machines
- remote AI agents without browser access
- persistent shared matches
- public HTTP endpoints
- user accounts

Do not backfill backend language into the MVP.

## Balance Watch List

Track but do not tune from single anecdotes:

- Cultural Mandate reliability
- Seek Missing Card attractiveness
- defense conversion into pressure or card tempo
- dominance denominator exploitability
- defense vs sabotage late-game drag
- mandate win frequency
- pressure access concentration in late eras

Simulation notes are evidence for watch-list priorities, not final balance proof.
