# Portfolio Case Study Plan

## Purpose

The portfolio page should explain the engineering story behind Hex Sovereign.

The project should not rely on visitors learning the full game to appreciate the work.

## Page Structure

### 1. Hero

Headline:

> Hex Sovereign

Supporting copy:

> A static browser strategy prototype with a deterministic rules engine and a legal-action protocol for bots and browser agents.

Primary actions:

- Play demo
- Read architecture

### 2. Why It Exists

Explain:

- portfolio relaunch project
- static GitHub Pages constraint
- desire to support AI/browser agents without a backend
- game as a testbed for structured action contracts

### 3. Architecture

Show:

- engine
- controller
- UI
- bot
- debug panel
- Browser Agent Mode

Use a simple diagram.

### 4. Legal-Action Protocol

Explain:

- game emits current request
- actors inspect legal actions
- actors submit selected action ID
- engine validates
- state updates only through accepted actions

Include a small JSON example.

### 5. Demo Features

For MVP:

- hex board
- captures
- Domains
- legal action JSON
- built-in bot
- debug panel

For later:

- Browser Agent Console
- cards
- decrees
- influence
- mandates

### 6. Constraints And Honest Limitations

Say clearly:

- no backend in first release
- not real online multiplayer
- Browser Agent Mode requires browser/page access
- balance is prototype-level

This honesty makes the project stronger.

### 7. What I Learned

Good reflection topics:

- separating engine truth from UI
- designing action contracts
- keeping hidden information safe
- making complex state readable
- balancing scope against ambition

### 8. Roadmap

Show phased expansion:

1. MVP engine/protocol
2. Domains and economy
3. cards and counter-draft
4. influence/corruption
5. mandates
6. agent console/backend options

## Portfolio Success Criteria

The case study succeeds if a reader understands:

- what was built
- why static hosting mattered
- why the protocol is interesting
- how bots and agents are constrained
- what remains future work

