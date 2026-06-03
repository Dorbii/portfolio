# Hex Sovereign

Hex Sovereign is a static browser strategy prototype with a deterministic rules engine and a browser-local legal-action protocol for humans, bots, debug tools, and browser agents.

## Local Scripts

- `npm run dev` starts the local Vite dev server.
- `npm run build` creates a production build in `dist`.
- `npm run lint` runs ESLint.
- `npm test` runs the focused engine and protocol test suite with Node's built-in test runner.
- `npm run preview` previews the production build locally.
- `npm run deploy` builds and publishes `dist` with `gh-pages`.

## Architecture

The app is a React and Vite portfolio experience designed to run as static files on GitHub Pages. The key design rule is that game truth stays in `src/game/engine.js`: board generation, legal action generation, captures, suicide prevention, pass, turn progression, Domain derivation, request creation, protocol submission, and bot choice all flow through the engine.

The UI in `src/App.jsx` renders the board, player panels, selected-cell and Domain details, the event log, and the protocol debug panel. It submits selected action IDs instead of mutating match state directly. The built-in bot and debug submit panel use the same validated action path as a human board click.

## Current Systems

- Deterministic hex board generation.
- Legal stone placement.
- Capture resolution.
- Suicide prevention, including capture-before-suicide handling.
- Pass action and turn/round/cycle progression.
- Anchor cells and basic derived Domains.
- Reinforcements.
- Gold income, stability, repairs, upkeep, and decree lifecycle.
- Influence, corruption, pressure assignment, counter-bribes, and purges.
- Region card drafting, set cash-ins, discard limits, and counter-draft choices.
- Era-based victory warnings, sudden death, and mandate unlocks.
- Request-only bot strategies and fixed-seed simulation metrics.
- Human vs human and human vs bot play.
- Manual legal-action JSON inspection and submission.
- Browser Agent Mode through a local invite URL, `BroadcastChannel`, `localStorage` debug snapshots, and an optional `window.HexSovereignAgent` page API.

## Browser Agent Mode

Browser Agent Mode lets a browser-control agent inspect the current request, choose from legal actions, and submit a selected action ID inside the static frontend. The controller validates match ID, seat token, active seat, request ID, and legal action before applying an engine transition.

This is a browser-local legal-action protocol. It is not a public HTTP API, real online multiplayer, remote AI multiplayer, or backend persistence layer.

## Bridge And Backend Boundary

The localhost bridge is deferred until Browser Agent Mode is proven in a real browser session. It must not change the hosted app's public claim: the portfolio build remains a static frontend with a browser-local protocol.

An optional backend or shared-match service would need persistence, an action validation endpoint, an event stream or websocket, a persistent match store, and seat tokens. Those are product expansion requirements, not part of the current GitHub Pages build.

## Limitations

- There is no backend, localhost bridge, public HTTP API, or real online multiplayer in the current build.
- Seat tokens are browser-local demo authorization, not network security.
- Balance is prototype-level.
- Simulation metrics are a balance aid, not proof of production-grade game balance.

## Source Notes

The implementation follows the Hex Sovereign design and completion notes under `architecture-notes/`, with the current build scoped to deterministic engine behavior, playable board state, legal-action protocol validation, browser-local agent support, and honest portfolio case-study framing.
