# Validation And Release Gates

## Release Philosophy

Do not treat "it builds" as ready.

Hex Sovereign's risk is mostly in rule correctness, protocol safety, and UI readability. The validation plan must prove those directly.

## MVP Gate

The MVP is release-ready only when every item below is true.

### Static Checks

- ESLint passes.
- Production build passes.
- No unexpected console errors during smoke.
- No broken image asset requests.

### Engine Tests

Required coverage:

- radius board generation
- stable cell IDs
- neighbor count for center and edge cells
- legal placement generation
- single capture
- multi-group capture
- suicide rejection
- capture-before-suicide legality
- pass action
- active seat alternation
- round/cycle progression sanity
- Domain controlled
- Domain contested

### Protocol Tests

Required coverage:

- request shape includes match, seat, request ID, public state, private state, and legal actions
- accepted action mutates by applying the engine transition
- stale request rejects
- wrong seat rejects
- wrong token rejects
- unknown action rejects
- illegal action rejects
- invalid action does not partially mutate state

### Browser Smoke

Required paths:

- load first screen
- place a stone by clicking a legal cell
- click an illegal/occupied/anchor cell and get explanation rather than mutation
- pass
- toggle a seat to bot and observe bot action
- inspect legal actions in debug panel
- submit an action from debug panel
- copy or open agent invite URL
- agent console receives current request
- agent console submits a legal action
- stale or wrong-token path rejects if exposed by the UI/debug tools

Required viewports:

- desktop first-screen viewport
- narrow mobile-ish viewport

### Case-Study And Metadata

Required copy checks:

- "Browser Agent Mode" or "browser-local legal-action protocol" is used.
- "public API", "online multiplayer", and "remote AI multiplayer" are not used as shipped claims.
- limitations are explicit.
- README and HTML metadata match the project.

## Expansion Gate

Before adding any new mechanic:

- current MVP tests pass
- current protocol tests pass
- current UI smoke path still works
- the new mechanic has at least one engine fixture
- the new mechanic appears in legal actions where relevant
- the selected panel explains the mechanic
- the event log explains state changes
- protocol output is safe for each seat
- bot can consume the mechanic through legal actions
- balance notes are updated

## Golden Fixture Backlog

Keep these fixtures small and deterministic.

MVP:

- simple capture
- double capture
- suicide rejection
- capture-before-suicide legal move
- controlled Domain
- contested Domain

Expansion:

- capital threatened
- pressure threshold
- warning persists
- income shut down by contested Domain
- decree inactive from disputed Domain
- ruined decree on ownership flip
- corruption siphon threshold
- hidden hand redaction
- counter-draft seek-missing choice
- simultaneous warnings and sudden death

## Simulation Metrics

When simulation begins, track:

- winner archetype
- win condition
- end cycle
- era
- prediction accuracy by checkpoint
- warning frequency
- mandate frequency
- counter-draft choice rate
- Seek Missing Card choice rate
- average legal actions per turn
- long-game frequency

## Balance Watch Thresholds

Use these as prompts for investigation, not automatic nerfs:

- Seek Missing Card chosen more than 60 percent when not under direct warning.
- Cultural Mandate wins cluster around the same pressure pattern.
- Mandates exceed half of wins and board state feels secondary.
- Defense reliably reaches cycle 12 or later without credible win pressure.
- Economy leads early but almost never converts or enables pivots.
- Dominance denominator can be manipulated by disputing low-value regions.

## Verification Cadence

For MVP:

- run static checks after meaningful code slices
- run engine/protocol tests after engine or protocol changes
- run browser smoke after UI, protocol, or styling changes
- run release gate once before final deploy

For expansions:

- run a mechanic-local gate per slice
- run full MVP regression after integrating the slice
- run balance simulation only after rules are test-stable

## Blocker Policy

Mark a release blocker when:

- a legal action can mutate state without engine validation
- an invalid protocol action partially mutates state
- a hidden opponent state leak appears
- the app cannot complete a basic human move
- the bot bypasses action validation
- the agent console overclaims online/API behavior
- the first screen has critical layout overlap

Mark a deferred issue when:

- it belongs to full ruleset mechanics excluded from MVP
- it needs backend/shared storage
- it is balance tuning without coded simulation evidence
- it improves robustness but is not required for the portfolio claim
