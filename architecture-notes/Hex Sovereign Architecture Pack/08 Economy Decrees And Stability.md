# Economy Decrees And Stability

## Purpose

This expansion turns Domains from control markers into engines.

It should come after basic Domain ownership is stable.

## New Concepts

- Gold
- Domain income
- Stability
- Repairs
- Decree slots
- Decree purchase
- Decree upgrade
- Decree activation/inactivation
- Ruined decrees

## Architecture Impact

### Engine

Add rule modules for:

- income calculation
- stability calculation
- repair spending
- decree capacity
- decree lifecycle
- upkeep

### State

Domain summaries gain:

```ts
Domain {
  anchorId
  owner
  size
  stability
  baseStability
  income
  decreeSlots
  decrees
  status
}
```

Player state gains:

```ts
Player {
  gold
  upkeepDue
}
```

### Legal Actions

New action types:

- BUY_DECREE
- UPGRADE_DECREE
- SCRAP_RUINED_DECREE
- CONVERT_RUINED_DECREE
- REPAIR_DOMAIN
- PAY_UPKEEP

## UI Requirements

The selected Domain panel must show:

- owner
- size
- stability
- income
- decree slots
- active/inactive decrees
- repair options
- why a decree is inactive

## Protocol Requirements

Agent requests must include:

- public gold
- Domain summaries
- legal purchase/upgrade options
- repair choices
- upkeep obligations

## Risks

### Economy Snowball

Mines and upgrades may let one player run away.

Mitigation:

- Keep early income modest.
- Make Domain contesting shut down income.
- Keep upkeep meaningful.

### UI Overload

Decrees can add too many symbols.

Mitigation:

- Show decree details in selected panel.
- Keep board overlays minimal.
- Use event log for changes.

### Rule Timing Confusion

Income, repair, upkeep, and decay need clear phase ordering.

Mitigation:

- Add a cycle resolution summary.
- Keep resolution deterministic and visible.

## Acceptance Criteria

- Players can earn gold from stable Domains.
- Players can buy decrees only where slots exist.
- Contested/disputed Domains deactivate decrees.
- Stability can be repaired.
- Decree state is visible and inspectable.
- Bots can choose decree actions through legal actions.

