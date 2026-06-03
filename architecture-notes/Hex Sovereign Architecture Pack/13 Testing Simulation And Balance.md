# Testing Simulation And Balance

## Purpose

Testing must protect correctness, protocol safety, and future balance work.

Hex Sovereign needs more than UI smoke tests because most complexity is in rules.

## Test Layers

### Unit Tests

For pure rules:

- board generation
- neighbor lookup
- group detection
- liberty counting
- capture resolution
- suicide rule
- Domain derivation
- income calculation
- stability changes
- pressure resolution
- victory warnings

### Protocol Tests

For action safety:

- legal request generation
- stale request rejection
- wrong seat rejection
- wrong token rejection
- illegal action rejection
- hidden state redaction
- accepted action mutation

### UI Tests

For core flows:

- start match
- place stone
- capture group
- pass
- select Domain
- use debug panel
- bot turn
- agent console connection

### Simulation Tests

For balance and regression:

- bot vs bot matches
- fixed-seed match replay
- archetype matchup batches
- win condition distribution
- average cycle length
- counter-draft choice rate
- mandate frequency

## Golden Fixtures

Keep small board fixtures for:

- simple capture
- double capture
- suicide rejection
- capture-before-suicide legal move
- Domain controlled
- Domain contested
- Capital threatened
- pressure threshold
- warning persists

## Balance Metrics

Track:

- winner by archetype
- win condition
- end cycle
- era
- prediction accuracy by checkpoint
- warning frequency
- mandate frequency
- seek missing card frequency
- average legal actions per turn
- average decision time, if tracked

## Watch List From Sim Notes

- Cultural Mandate may be too consistent.
- Seek Missing Card may be too attractive.
- Economy may lead early but fail to close.
- Defense may drag games without enough conversion.
- Dominance denominator may be exploitable.
- Defense vs Sabotage may become tedious.

## Release Gate

Before each expansion:

- engine tests pass
- protocol tests pass
- UI smoke path works
- new mechanic has at least one fixture
- event log explains new mechanic
- debug panel exposes legal actions
- balance notes are updated

