# Influence Corruption And Pressure

## Purpose

This expansion adds indirect conflict beyond stone placement.

It should come after Domains, stability, and decrees exist.

## New Concepts

- Influence sources
- Influence assignment
- Friendly support
- Enemy pressure
- Corruption as pressure subtype
- Bribe Networks
- Counter-bribes
- Siphoning
- Stability damage
- Incoming pressure warnings

## Architecture Impact

### Engine

Add modules for:

- influence source derivation
- assignment legality
- pressure range
- support range
- corruption stacking
- defensive reductions
- counter-bribe spending
- siphon calculation
- stability damage

### State

Domain summary gains:

```ts
DomainPressure {
  incomingInfluence
  incomingCorruption
  friendlySupport
  defensiveReduction
  netPressure
  projectedEffects
}
```

### Legal Actions

New action types:

- ASSIGN_INFLUENCE_PRESSURE
- ASSIGN_INFLUENCE_SUPPORT
- TARGET_BRIBE_NETWORK
- SPEND_COUNTER_BRIBE
- PURGE_CORRUPTION

## UI Requirements

Pressure must be visible before it resolves.

Required surfaces:

- incoming pressure overlay
- selected Domain pressure summary
- projected effect table
- warning chips
- event log resolution messages

## Protocol Requirements

Agent state should include:

- public pressure assignments after reveal
- projected pressure effects
- legal influence targets
- legal support targets
- legal counter-bribe options

Private planning choices remain private until reveal.

## Risk: Unreadable Indirect Combat

Influence and corruption can make the game feel like spreadsheet combat.

Mitigation:

- Use selected Domain explanations.
- Show projected effect before resolution.
- Keep first influence version simple.
- Add one pressure type before adding both influence and corruption.

## Risk: Cultural Mandate Reliability

Sim notes watch-listed Cultural Mandate because pressure on three enemy Domains may be too consistent.

Mitigation:

- Track how often influence reaches three targets.
- Consider requiring net pressure threshold.
- Consider requiring pressure across multiple regions.

## Acceptance Criteria

- Players can assign influence/support legally.
- Pressure projections are visible.
- Net pressure resolves deterministically.
- Siphoning only affects Domain income.
- Corruption is distinguishable from normal influence.
- Bots can reason from legal pressure targets.

