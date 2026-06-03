# UI And Interaction Architecture

## Purpose

The UI should make a dense strategy system feel readable.

The first version should be visually calm and mechanically honest. It should not imply systems that are not implemented yet.

## UI Principles

- Show legal actions, not raw possibilities.
- Make board state readable before making it decorative.
- Every mechanic needs an explanation surface.
- The selected cell/domain panel is the main teaching tool.
- Avoid visual states that require memorizing hidden rules.
- Keep the first release desktop-first.

## Primary Screens

### Game Screen

Core areas:

- Top status bar
- Player summaries
- Hex board
- Selected cell/domain panel
- Legal action tray
- Event log
- Optional debug panel

### Agent Debug Panel

Core areas:

- Current request ID
- Seat
- Public state JSON
- Legal actions JSON
- Submit action control
- Last response/rejection

### Portfolio Case Study Page

Core areas:

- Project pitch
- Architecture diagram
- Demo link
- Screenshots
- Protocol explanation
- Limitations
- Expansion roadmap

## Board Interaction

Clicking a legal cell should submit a PLACE_STONE action.

Clicking an illegal cell should select/explain the cell, not try to place a stone.

Hovering a legal cell can show:

- preview stone
- legal move highlight
- capture preview, when available

## Selected Panel

The selected panel should explain:

- cell coordinates
- occupant
- anchor/domain relationship
- whether the cell is playable
- why a move is legal or illegal
- Domain owner
- Domain control reason

This panel is critical for making the game learnable.

## Visual State Set

MVP visual states:

- empty
- occupied by black
- occupied by white
- anchor
- selected
- legal move
- illegal move
- captured last turn
- friendly Domain zone
- enemy Domain zone
- contested Domain zone

Future visual states:

- disputed
- pressured
- corrupted
- supported
- decree inactive
- warning active
- reinforcement preview

## Accessibility Notes

The board cannot rely on color alone.

Each major state should have at least two signals:

- color plus icon
- color plus border style
- color plus text in selected panel
- tint plus pattern

## UI Risk

The generated mockups look clean, but the full ruleset can overload the screen.

Mitigation:

- Add one mechanic at a time.
- Each mechanic must include selected-panel copy.
- Each mechanic must include event log messages.
- Each mechanic must include a debug-state representation.

