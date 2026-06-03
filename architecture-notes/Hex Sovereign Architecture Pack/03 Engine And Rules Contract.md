# Engine And Rules Contract

## Purpose

The engine should make the game deterministic, inspectable, and testable.

Everything that changes match state should go through the engine.

## Engine Inputs

The engine accepts:

- Current match state
- Seat
- Action ID or action payload
- Optional deterministic seed for generated content

## Engine Outputs

The engine returns:

- New match state
- Events
- Rejection result, if action is invalid
- Derived summaries for UI/protocol use

## Core Engine API

Conceptual API:

```ts
createMatch(config): MatchState
getLegalActions(state, seat): LegalAction[]
applyAction(state, actionId, seat): ApplyActionResult
getPublicState(state): PublicState
getSeatState(state, seat): SeatState
deriveDomains(state): DomainSummary[]
```

## Match State Shape

Conceptual state:

```ts
MatchState {
  matchId
  rulesVersion
  phase
  cycle
  turn
  activeSeat
  board
  players
  anchors
  captures
  eventLog
  requestCounter
}
```

## Board Cell Shape

```ts
Cell {
  id
  q
  r
  type: "playable" | "anchor" | "blocked"
  occupant: "black" | "white" | null
  anchorId?: string
  regionId?: string
}
```

## Legal Action Shape

```ts
LegalAction {
  id
  type
  seat
  label
  payload
}
```

Initial action types:

- PLACE_STONE
- PASS

Future action types:

- BUY_DECREE
- UPGRADE_DECREE
- ASSIGN_INFLUENCE
- DRAFT_CARD
- CASH_SET
- COUNTER_DRAFT
- BUY_REINFORCEMENT
- SPEND_REINFORCEMENT
- END_PLANNING

## Rules In MVP

The MVP engine should support:

- Hex coordinate board generation
- Neighbor lookup
- Playable and anchor cells
- Connected same-color groups
- Liberty counting
- Capture resolution
- Suicide rule
- Legal placement generation
- Pass action
- Active seat alternation
- Basic Domain control around anchors

## Rules Excluded From MVP

Exclude:

- Income
- Stability
- Decrees
- Reinforcements
- Influence
- Corruption
- Cards
- Counter-draft
- Victory warnings
- Mandates

## Domain Derivation

Domain ownership should be derived, not manually stored as independent truth.

Basic derivation:

1. For each anchor, inspect the six adjacent zone cells.
2. Find each player's largest connected group inside the zone.
3. Require at least two connected stones.
4. If one player has a strictly larger valid group, that player controls the Domain.
5. Otherwise the Domain is contested or neutral.

## Determinism Rules

- Same input state plus same action produces same output state.
- Randomness must come from a seedable source.
- UI timing must not affect engine results.
- Bot strategy may vary, but engine resolution must not.

## Error And Rejection Contract

Invalid actions return structured results:

```ts
{
  accepted: false,
  reason: "STALE_REQUEST" | "WRONG_SEAT" | "ILLEGAL_ACTION" | "ACTION_NOT_FOUND"
}
```

No invalid action should partially mutate state.

## Test Priorities

High-priority tests:

- Hex neighbor generation
- Group detection
- Liberty counting
- Single-group capture
- Multi-group capture
- Suicide rejection
- Capture-before-suicide allowance
- Domain control derivation
- Legal action stability
- Illegal action rejection

