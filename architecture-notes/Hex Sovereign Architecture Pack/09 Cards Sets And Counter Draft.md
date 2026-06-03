# Cards Sets And Counter Draft

## Purpose

This expansion adds hidden planning, region identity, and roguelite-style power spikes.

It should come after the public Domain/economy layer is readable.

## New Concepts

- Region card pools
- Hidden hands
- Card count as public information
- Region-card drafting
- Matching sets
- Mixed sets
- Wild cards
- Set cash-ins
- Counter-draft choices

## Architecture Impact

### Engine

Add modules for:

- card deck/pool generation
- controlled-region draft eligibility
- hand limit
- set detection
- set cash timing
- counter-draft resolution
- weighted missing-card rewards

### State

Player private state gains:

```ts
PlayerPrivateState {
  hand
  completedSets
}
```

Public player state gains:

```ts
PlayerPublicState {
  cardCount
  completedSetCountVisibleIfRevealed
}
```

### Legal Actions

New action types:

- DRAFT_CARD
- DISCARD_CARD
- CASH_SET
- COUNTER_IMMEDIATE
- COUNTER_SEEK_MISSING
- COUNTER_SAFE_FALLBACK

## Protocol Requirements

The protocol must split public and private state carefully.

For the active seat:

- exact hand can be shown
- legal sets can be shown

For the opponent:

- card count only
- revealed set cash-ins only
- counter-draft choice category when public

## UI Requirements

Need:

- hand display
- draft choice panel
- set preview
- counter-draft modal
- public card count
- discard UI
- event log entries that do not leak hidden cards

## Risk: Hidden Information Leakage

Bots and agents must not receive opponent private hands.

Mitigation:

- Separate public state from private seat state.
- Add tests that verify opponent hands are not serialized.
- Make agent request generation seat-aware.

## Risk: Seek Missing Card Dominance

Sim notes identified Seek Missing Card as a watch-list item.

Mitigation:

- Track counter-draft choice rates.
- Tune only after coded sims.
- Consider buffing Immediate Counter or Safe Fallback if Seek Missing is chosen too often.

## Acceptance Criteria

- Draft pools derive from controlled regions.
- Hands are hidden from the opponent.
- Completed sets can be detected.
- Set cash-ins create public events.
- Opponent counter-draft choices are legal and visible at the right level.
- Protocol never leaks hidden hand data.

