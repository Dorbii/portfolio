# Victory Eras And Mandates

## Purpose

This expansion adds endgame structure and late-game dramatic threats.

It should come after the systems that feed victory are implemented.

## New Concepts

- Era progression
- Victory warnings
- Dominance Victory
- Capital Victory
- Mandate Victory
- Sudden Death
- Set-powered mandate identity

## Architecture Impact

### Engine

Add modules for:

- era calculation
- warning detection
- warning persistence
- victory validation
- simultaneous win handling
- sudden death state
- mandate condition checking

### State

Match state gains:

```ts
VictoryState {
  activeWarnings
  suddenDeath
  winner
}
```

Warning shape:

```ts
Warning {
  id
  seat
  type
  triggeredCycle
  conditionSnapshot
}
```

### Legal Actions

Victory mostly derives from state and does not need many direct legal actions.

Relevant future actions:

- SURRENDER
- ACKNOWLEDGE_GAME_OVER

## Warning Rule

All non-surrender wins require:

1. Trigger condition at cycle resolution.
2. Public warning begins.
3. Opponent receives one full cycle to respond.
4. If condition remains true next cycle, the warning owner wins.

## UI Requirements

Warnings must be unmistakable.

Required surfaces:

- warning banner
- warning chip
- selected warning explanation
- event log entry
- projected "how to stop this" hint

## Protocol Requirements

Agent state should include:

- active warnings
- warning owner
- condition text
- whether current player is threatened
- legal actions that may affect warning condition

## Risk: Mandates Dominate The Game

Sim notes showed mandates winning often.

This is acceptable only if mandates remain board-linked.

Mitigation:

- Each Mandate condition must depend on visible board/economy/pressure state.
- No invisible instant wins.
- Keep warning cycle mandatory.

## Risk: Sudden Death Confusion

Simultaneous wins can be exciting but hard to explain.

Mitigation:

- Add clear banner.
- Show both active warnings.
- Explain exact condition that must change.

## Acceptance Criteria

- No non-surrender win occurs without warning.
- Warnings survive for one cycle.
- Opponent can inspect how to stop the warning.
- Simultaneous wins enter Sudden Death.
- Victory state is derivable and testable.

