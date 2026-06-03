# Product Charter

## Working Title

Hex Sovereign: Agent Prototype

## One-Sentence Pitch

A static browser strategy game where players place stones on a hex board, control landmark Domains, and expose each turn through a validated legal-action protocol for bots, browser agents, and debugging tools.

## Portfolio Thesis

The portfolio story is not only "I built a game."

The stronger story is:

> I designed a deterministic game engine and exposed it through a structured action protocol so humans, bots, and browser-control agents all play by the same validated rules.

## Primary Audience

- Engineering reviewers
- Hiring managers
- Technical peers
- AI/tooling-oriented developers
- People who value systems design, frontend architecture, and game-rule modeling

## Primary Goals

- Demonstrate a polished, interactive portfolio project.
- Show deterministic rules modeling in the browser.
- Show clear separation between engine, controller, UI, and agent protocol.
- Make legal actions inspectable as JSON.
- Support a built-in bot through the same protocol used by browser agents.
- Deploy as a static GitHub Pages app.

## Non-Goals For The First Release

- Real online multiplayer
- Public HTTP API endpoints
- Backend persistence
- Full v0.5 ruleset
- Production-grade game balance
- All decree/card/corruption/mandate systems
- Mobile-first competitive play

## Honest Product Claim

Correct:

> Browser Agent Mode lets browser-control agents inspect legal actions and submit validated choices inside a static frontend.

Incorrect:

> Hex Sovereign has real online AI multiplayer with public API endpoints.

## MVP Scope

The MVP should include:

- Hex board
- Stone placement
- Legal move generation
- Captures by liberties
- Suicide prevention
- Pass action
- Anchors
- Basic Domain control
- Human vs human
- Human vs bot
- Manual JSON debug panel
- Legal-action protocol
- Static deployment

## Future Scope

Future releases can add:

- Reinforcements
- Stability
- Income
- Decrees
- Influence
- Corruption
- Region cards
- Set powers
- Counter-draft
- Mandate victories
- Browser Agent Console
- Localhost bridge
- Optional backend matches

## Success Criteria

The first portfolio release is successful if a reviewer can:

- Open the deployed project.
- Understand the game loop in under 60 seconds.
- Play a simplified match.
- Inspect legal actions.
- See a bot use the same action protocol.
- Read the case study and understand the architecture.
- Believe the project could grow into the full Hex Sovereign concept.

## Major Risk

The mechanics document is too large for a first build.

The project fails if it tries to ship all systems at once.

The project succeeds if it protects the first release around a small, demonstrable engine/protocol slice.

