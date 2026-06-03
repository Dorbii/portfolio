# MVP Vertical Slices

## Slice 1: Pure Hex Engine

Goal:

Build a framework-independent engine foundation.

Scope:

- Hex coordinates
- Radius board generation
- Neighbor lookup
- Cell IDs
- Playable cells

Acceptance criteria:

- Engine can generate a radius 4 or 5 board.
- Each cell has stable coordinates and ID.
- Neighbor counts are correct for center and edge cells.

Verification:

- Unit tests for board size.
- Unit tests for neighbor lookup.

## Slice 2: Stone Placement And Captures

Goal:

Implement core Go-like board tactics.

Scope:

- Black/white stones
- Legal placement
- Connected groups
- Liberties
- Captures
- Suicide rule

Acceptance criteria:

- Legal moves are generated from state.
- Captures remove stones.
- Suicide is illegal unless placement captures first.
- State updates are deterministic.

Verification:

- Unit tests with small board fixtures.
- Golden tests for capture scenarios.

## Slice 3: Human Play UI

Goal:

Make the engine playable by two humans.

Scope:

- Board rendering
- Stone rendering
- Current turn
- Legal move highlights
- Pass button
- Event log

Acceptance criteria:

- Human vs human can play.
- UI cannot place illegal moves.
- Event log records placements and captures.

Verification:

- Build check.
- Browser smoke test.
- Manual playthrough.

## Slice 4: Anchors And Domains

Goal:

Add the first Hex Sovereign identity layer.

Scope:

- Anchor cells
- Anchor control zones
- Domain derivation
- Domain overlays
- Selected Domain panel

Acceptance criteria:

- Anchors are unplayable.
- Domain ownership is derived from board state.
- Contested/controlled state is visible.
- Selected panel explains control reason.

Verification:

- Unit tests for Domain derivation.
- Manual board scenarios.

## Slice 5: Legal-Action Protocol

Goal:

Expose the engine through an inspectable protocol.

Scope:

- Current request generation
- Legal action JSON
- submitAction action ID handling
- Rejection responses
- Manual debug panel

Acceptance criteria:

- Debug panel shows current legal actions.
- Debug panel can submit an action.
- Invalid action IDs are rejected.
- Stale request IDs are rejected.

Verification:

- Unit tests for protocol validation.
- Browser smoke test through debug panel.

## Slice 6: Built-In Bot

Goal:

Prove non-human play through the same protocol.

Scope:

- Random legal-action bot
- Simple heuristic bot
- Bot seat selector
- Bot delay

Acceptance criteria:

- Human can play against bot.
- Bot uses legal actions only.
- Bot cannot bypass validation.

Verification:

- Simulated bot match.
- Event log review.

## Slice 7: Browser Agent Mode

Goal:

Implement the portfolio-distinctive browser-local agent integration.

Scope:

- Invite URL
- Agent Console route
- BroadcastChannel
- localStorage debug snapshots
- Token/seat validation
- Disconnected state

Acceptance criteria:

- Main game creates an agent invite URL.
- Agent Console receives legal actions.
- Agent Console submits selected actions.
- Game validates and applies accepted actions.
- Disconnected console is understandable.

Verification:

- Two-tab browser test.
- Stale request test.
- Wrong token test.

## Slice 8: Portfolio Case Study

Goal:

Present the project clearly.

Scope:

- Project page
- Architecture diagram
- Demo link
- Protocol explanation
- Limitations
- Roadmap

Acceptance criteria:

- The viewer understands why the project is technically interesting.
- The static-hosting constraint is explained honestly.
- Browser Agent Mode is not overclaimed.

