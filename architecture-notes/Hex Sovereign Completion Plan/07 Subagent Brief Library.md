# Subagent Brief Library

## How To Use

Copy a brief, fill in the current status, and assign it to the cheapest model that can safely do the work.

Every brief should keep the main orchestrator as the final owner.

## Brief: Source-Doc Explorer

Recommended model: `gpt-5.3-codex-spark`

```text
Task: Read the specified Hex Sovereign source docs and return planning evidence for the main orchestrator.

Context:
- Canonical docs live under C:\Users\Steve\Documents\Obsidian Vault\Personal\Go-Game.
- MVP scope remains deterministic engine, legal-action protocol, playable board, Domains, bot/debug support.
- Future mechanics are roadmap/case-study unless explicitly promoted.

Read:
- <specific files>

Constraints:
- No code changes.
- Do not propose implementation outside the requested scope.
- Keep output <=500 words.

Final response:
- confirmed facts
- risks or gaps
- exact source paths used
```

## Brief: Repo-State Explorer

Recommended model: `gpt-5.3-codex-spark`

```text
Task: Inspect the current portfolio repo state for Hex Sovereign and summarize implementation/validation gaps.

Context:
- Workspace root: C:\Users\Steve\Documents\Github\portfolio.
- Important files: src/game/engine.js, src/App.jsx, src/styles.css, public/hex-sovereign/*.
- No code changes.

Read as needed:
- package.json
- src/game/engine.js
- src/App.jsx
- src/styles.css
- README.md
- index.html
- test config if present

Final response <=500 words:
- current implementation shape
- missing validation/polish tasks
- repo constraints
- exact file paths used
```

## Brief: Browser Smoke Verifier

Recommended model: `gpt-5.3-codex-spark` if read-only observation is enough, `gpt-5.4` if it must automate Playwright.

```text
Task: Run or observe the Hex Sovereign browser smoke test and report concrete findings.

Context:
- Workspace root: C:\Users\Steve\Documents\Github\portfolio.
- Do not edit files.
- If the in-app Browser connector fails, report the failure and try the approved fallback from the orchestrator.

Smoke paths:
- load main route
- place a legal stone
- click illegal/occupied/anchor cell and confirm explanation
- pass
- toggle bot and observe an action
- inspect debug legal actions
- submit an action through debug panel
- open agent invite URL
- confirm agent console receives request
- submit a legal action from agent console
- check desktop and narrow viewport layout

Final response:
- pass/fail by path
- screenshots or paths if captured
- exact runtime errors
- layout issues with viewport size
- no code changes
```

## Brief: Engine Test Worker

Recommended model: `gpt-5.4`

```text
Task: Add focused engine tests for the Hex Sovereign MVP rule contract.

Context:
- Workspace root: C:\Users\Steve\Documents\Github\portfolio.
- Source of truth: src/game/engine.js.
- MVP only: placement, captures, suicide, pass, Domains, protocol basics.
- Do not add cards, decrees, influence, corruption, economy, mandates, or backend behavior.

Ownership:
- You may edit package.json/package-lock only if adding the minimal test runner.
- You may add test config if required.
- You may add engine test files.
- Do not change app UI.
- Do not change engine behavior unless a failing test exposes a confirmed MVP bug; report before broad fixes.

Constraints:
- Other agents may be editing nearby files; do not revert unrelated changes.
- Keep changes scoped.

Acceptance:
- tests cover board/neighbors, capture, suicide, pass, Domain derivation, request rejection basics
- tests run with one npm script
- lint/build still pass or blockers are reported

Final response:
- changed paths
- tests added
- validation run
- remaining risks/blockers
```

## Brief: Protocol Test Worker

Recommended model: `gpt-5.4`

```text
Task: Add protocol tests that prove all actors submit selected action IDs through validation.

Context:
- Workspace root: C:\Users\Steve\Documents\Github\portfolio.
- Relevant file: src/game/engine.js.
- Protocol functions include request creation and submitProtocolAction.
- MVP protocol is browser-local and must not claim public API behavior.

Ownership:
- Protocol tests only, plus minimal shared fixtures if needed.
- Do not edit UI unless the orchestrator explicitly expands scope.

Acceptance:
- accepted action mutates state
- stale request rejects
- wrong seat rejects
- wrong token rejects
- unknown action rejects
- illegal action rejects
- invalid action does not partially mutate state

Final response:
- changed paths
- validation run
- risks/blockers
```

## Brief: Visual Polish Worker

Recommended model: `gpt-5.4-mini`

```text
Task: Fix the specific Hex Sovereign layout issues listed by the smoke verifier.

Context:
- Workspace root: C:\Users\Steve\Documents\Github\portfolio.
- Main file: src/styles.css.
- Do not redesign the app.
- Do not add new mechanics.
- Keep the existing visual system.

Ownership:
- src/styles.css only unless explicitly approved.

Input findings:
- <paste exact screenshot/layout findings>

Acceptance:
- reported overlaps/overflow are fixed
- desktop and narrow viewport still readable
- no unrelated restyling

Final response:
- changed paths
- before/after findings addressed
- validation run
- remaining visual risks
```

## Brief: README And Metadata Worker

Recommended model: `gpt-5.4-mini`

```text
Task: Update Hex Sovereign README and HTML metadata.

Context:
- Workspace root: C:\Users\Steve\Documents\Github\portfolio.
- Current app is a static React/Vite Hex Sovereign portfolio experience.
- It has a deterministic engine and browser-local legal-action protocol.
- It does not have real online multiplayer, a public API, or backend persistence.

Ownership:
- README.md
- index.html
- package metadata only if needed

Acceptance:
- README explains local scripts, MVP features, architecture, Browser Agent Mode, and limitations
- title/meta description are Hex-specific
- no overclaims

Final response:
- changed paths
- validation run if any
- wording risks
```

## Brief: Expansion Contract Explorer

Recommended model: `gpt-5.3-codex-spark`

```text
Task: Read one future Hex Sovereign expansion doc and convert it into an implementation contract.

Context:
- MVP is already scoped; future mechanics remain roadmap until promoted.
- Every expansion must include engine, state, legal actions, protocol, selected-panel, event log, tests, and balance note.

Read:
- <one expansion doc path>

Final response <=500 words:
- state changes
- legal action additions
- protocol additions
- UI explanation requirements
- tests needed
- risks/watch metrics
```

## Brief: Release Gate Verifier

Recommended model: `gpt-5.3-codex-spark` for checklist audit, main orchestrator for final decision.

```text
Task: Audit the current Hex Sovereign MVP against the release gate.

Context:
- Use architecture-notes/Hex Sovereign Completion Plan/05 Validation And Release Gates.md as the checklist.
- Do not edit files.

Final response:
- pass/fail/unknown for each gate category
- exact commands or evidence used
- blockers
- deferred non-blockers
```
