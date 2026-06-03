# Vertical Slices And Agent Matrix

## How To Use This File

Each slice is designed for parallel execution under a main orchestrator.

The orchestrator should:

1. start the next critical-path slice locally
2. spawn sidecar explorers or workers only for independent work
3. keep write scopes disjoint
4. integrate one slice at a time
5. run the listed gate before marking the slice verified

## MVP Completion Sequence

### Slice 0: Preflight And Plan Sync

Status: `not-started`

Goal: confirm repo state, tooling, dirty files, and source-doc assumptions before edits.

Main orchestrator:

- run `git status`
- inspect `package.json`
- inspect current source files touched by handoff
- confirm whether Browser connector or local Playwright is available
- update this plan if reality changed

Subagents:

- Spark explorer can inventory docs or current repo paths.

Gate:

- no stale assumptions remain in the plan before implementation starts

### Slice 1: Browser Smoke And Visual Findings

Status: `not-started`

Goal: complete the missing runtime validation.

Suggested agent split:

- main orchestrator: start or identify dev server and own final smoke interpretation
- Spark explorer or `gpt-5.4-mini`: capture smoke findings from Browser/Chrome/Playwright and return screenshots or concise issue list
- `gpt-5.4-mini` worker: fix specific CSS-only findings after they are observed

Ownership:

- verifier is read-only
- CSS worker owns `src/styles.css` only, unless explicitly expanded

Gate:

- main route renders
- legal placement works
- bot path works
- agent console receives and submits an action
- desktop and narrow viewport screenshots show no critical overlap

### Slice 2: Engine Test Plane

Status: `not-started`

Goal: add the minimum automated tests that protect deterministic rule truth.

Suggested agent split:

- `gpt-5.4` worker owns test runner setup and `src/game/engine.test.js`
- Spark explorer can produce edge-case fixture inventory from source docs
- main orchestrator reviews test coverage against MVP contract

Ownership:

- worker may touch `package.json`, lockfile, test config, and engine test files
- worker should not change engine behavior unless a test reveals a confirmed bug and the orchestrator approves the fix

Gate:

- tests cover board/neighbors, capture, suicide, pass, Domain derivation, and deterministic transitions
- tests run locally in one command
- lint/build still pass

### Slice 3: Protocol Test Plane

Status: `not-started`

Goal: prove all non-human paths are constrained by the same legal-action protocol.

Suggested agent split:

- `gpt-5.4` worker owns protocol tests
- Spark explorer can compare rejection reasons against design docs
- main orchestrator reviews hidden-state and invalid-submission assumptions

Ownership:

- protocol tests close to engine tests
- no UI rewrite

Gate:

- current request generation is stable
- accepted legal action mutates state
- stale request rejects
- wrong seat rejects
- wrong token rejects
- unknown action rejects
- illegal action rejects
- invalid action does not partially mutate state

### Slice 4: Metadata And Portfolio Docs

Status: `not-started`

Goal: make repo metadata and README match Hex Sovereign.

Suggested agent split:

- `gpt-5.4-mini` worker owns `README.md` and `index.html`
- Spark explorer can audit language for overclaims
- main orchestrator final-edits public claims

Ownership:

- `README.md`
- `index.html`
- optional package metadata only if needed

Gate:

- title and meta description are Hex-specific
- README explains scripts and architecture
- copy says browser-local protocol, not public API
- limitations are explicit

### Slice 5: MVP Release Review

Status: `not-started`

Goal: decide whether the MVP is ready to deploy.

Suggested agent split:

- Spark verifier can run a checklist and return gaps
- main orchestrator owns go/no-go

Gate:

- lint pass
- tests pass
- build pass
- browser smoke pass
- README/metadata pass
- no known visual blocker
- no overclaimed product language

## Post-MVP Expansion Sequence

These slices should not start until the MVP is verified.

### Expansion Slice A: Rule Module And State Versioning Prep

Recommended model:

- main orchestrator for architecture
- `gpt-5.4` worker for implementation if approved later

Goal:

- prepare feature flags, rules version, and test fixture patterns without changing MVP behavior

Gate:

- existing MVP tests still pass
- no UI behavior change unless explicitly accepted

### Expansion Slice B: Reinforcements

Recommended model:

- `gpt-5.4` worker for engine/tests
- `gpt-5.4-mini` worker for UI display once engine contract is stable
- Spark verifier for legal-action audit

Gate:

- reinforcement placements use normal capture/suicide rules
- bot uses legal action IDs
- selected panel explains token availability

### Expansion Slice C: Income And Stability

Recommended model:

- `gpt-5.4` worker for engine cycle resolution
- Spark explorer for rule table extraction from mechanics docs
- main orchestrator for phase-order decisions

Gate:

- income and stability are deterministic
- contested/disputed state deactivates engine output
- selected Domain panel explains income and stability

### Expansion Slice D: Decrees

Recommended model:

- main orchestrator for decree scope
- `gpt-5.4` worker for state/actions/tests
- `gpt-5.4-mini` worker for UI panel additions

Gate:

- decree slots enforce capacity
- buy/upgrade/repair/upkeep actions are legal-action driven
- event log explains inactive, ruined, converted, and scrapped decrees

### Expansion Slice E: Influence And Corruption

Recommended model:

- main orchestrator for readability constraints
- `gpt-5.4` worker for pressure resolution
- Spark verifier for hidden-planning leak audit

Gate:

- projected pressure is visible before resolution
- corruption is distinguishable from normal influence
- Cultural Mandate watch metrics exist before tuning

### Expansion Slice F: Cards And Counter-Draft

Recommended model:

- main orchestrator for public/private boundary
- `gpt-5.4` worker for seat-aware state projection and tests
- Spark verifier for leak audit and counter-draft checklist

Gate:

- opponent exact hand never appears in another seat request
- public card count remains visible
- counter-draft choices are valid and evented

### Expansion Slice G: Victory Warnings And Mandates

Recommended model:

- main orchestrator for win-condition scope
- `gpt-5.4` worker for warning/victory engine tests
- Spark verifier for "no instant non-surrender wins" audit

Gate:

- every non-surrender win requires public warning
- warnings persist for one full cycle
- simultaneous wins enter sudden death

### Expansion Slice H: Stronger Bots And Simulation

Recommended model:

- `gpt-5.4` worker for simulation harness
- Spark explorer for metrics summary drafts
- main orchestrator for balance interpretation

Gate:

- fixed-seed replay works
- bot sees only agent request data
- balance metrics record win condition, end cycle, era, warning frequency, mandate frequency, and counter-draft choice rates

### Expansion Slice I: Bridges And Backend Options

Recommended model:

- main orchestrator for architecture decision
- `gpt-5.4` worker for localhost bridge prototype only after Browser Agent Mode is proven
- defer backend until product need is clear

Gate:

- localhost bridge does not change the MVP public claim
- backend plan includes persistence, action validation endpoint, event stream, match store, and seat tokens
