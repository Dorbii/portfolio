# MVP Completion Architecture

## Finish-Line Statement

The MVP is complete when a reviewer can open the portfolio, play Hex Sovereign, inspect legal actions, see the bot use the same action protocol, test the browser-local agent route, and read honest portfolio copy explaining the static-browser architecture.

## Current Architecture Shape

### Engine

Current file: `src/game/engine.js`

Responsibilities already represented:

- seat constants and labels
- board generation
- hex coordinates
- anchor placement
- starting stones
- neighbor lookup
- group and liberty detection
- legal action generation
- capture resolution
- suicide prevention
- pass action
- turn, round, and cycle progression
- basic Domain derivation
- public and seat state projections
- agent request creation
- protocol action submission
- simple bot action selection

MVP architectural expectation:

- keep rule truth here
- add tests before adding new mechanics
- do not move rule decisions into React components
- keep invalid actions mutation-free

### UI And Controller

Current file: `src/App.jsx`

Responsibilities already represented:

- app routes
- main board experience
- agent console route
- selected-cell and Domain inspector
- player panels
- event log
- JSON protocol panel
- bot/human toggles
- invite URL generation
- `localStorage` debug snapshots
- `BroadcastChannel` messages
- optional `window.HexSovereignAgent` API

MVP architectural expectation:

- UI submits action IDs only
- illegal board clicks should explain, not mutate
- debug panel and bot use the same protocol path
- agent route remains browser-local
- the case-study page must not imply real online multiplayer

### Visual System

Current file: `src/styles.css`

Responsibilities already represented:

- full first-screen visual language
- board, rails, panels, debug surfaces
- Domain tones
- agent console styling
- concept asset presentation

MVP architectural expectation:

- visual state must be readable before decorative
- no color-only meaning for critical board states
- text must fit on desktop and mobile smoke viewports
- screenshots should prove the first viewport works

## MVP Release Blockers

### 1. Browser Smoke Test

Required because lint/build do not prove that the app renders correctly, that `BroadcastChannel` works, or that the agent console can submit an action.

Minimum smoke paths:

- load main route
- place a legal stone
- select an illegal/occupied/anchor cell and see explanation
- pass
- toggle one seat to bot and observe bot action
- open agent invite URL in a second context
- receive legal actions in agent console
- submit a legal action from agent console
- attempt stale or wrong token submission if available
- verify layout at desktop and narrow viewport

If the Browser connector remains broken, use local Playwright or Chrome automation.

### 2. Engine And Protocol Tests

Current repo has no test runner. Add a small test plane before any new mechanics.

Recommended:

- Vitest for pure engine/protocol tests because the repo is already Vite-based.
- Keep tests close to `src/game/engine.js`, for example `src/game/engine.test.js`.
- Add only focused fixtures first.

Initial test groups:

- board size and neighbor generation
- legal placement generation
- single capture
- multi-group capture
- suicide rejection
- capture-before-suicide allowance
- pass action
- turn/round/cycle progression sanity
- Domain controlled
- Domain contested
- stale request rejection
- wrong seat rejection
- wrong token rejection
- unknown action rejection
- accepted action mutation behavior

### 3. Metadata And README

Current README and `index.html` are still generic portfolio starter text.

MVP needs:

- HTML title updated to Hex Sovereign / Steve portfolio language
- meta description updated to deterministic browser strategy prototype
- README updated with scripts, architecture, protocol claim, and limitations
- no claims of public API or online multiplayer

### 4. Visual Polish

Run visual smoke before editing. Fix only observed issues.

Likely areas:

- first viewport hierarchy
- board scale on narrow viewports
- panel text overflow
- JSON panel height and scroll behavior
- agent console disconnected state
- concept asset sizing

## MVP Non-Blockers

Defer these unless they are needed for a clear portfolio claim:

- real match-end scoring
- full pass-to-game-over rules
- state hydration from `localStorage`
- robust hostile-message schema validation
- backend persistence
- local Node bridge
- public HTTP API
- cards, decrees, influence, corruption, mandates

These are valid future architecture topics, but not required for the current portfolio MVP claim.

## MVP Acceptance Criteria

The release is ready when:

- lint passes
- production build passes
- engine/protocol tests pass
- browser smoke path passes
- first-screen UI is readable
- bot cannot bypass the legal-action protocol
- agent console can submit a validated legal action in browser-local mode
- README and metadata match Hex Sovereign
- case-study copy distinguishes browser-local protocol from online multiplayer
- future mechanics are presented as roadmap/case-study material, not implemented systems
