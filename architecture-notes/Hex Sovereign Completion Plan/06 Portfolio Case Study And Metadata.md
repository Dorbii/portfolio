# Portfolio Case Study And Metadata

## Public Story

Hex Sovereign should be framed as a portfolio project about deterministic systems design and AI-safe action contracts.

The visitor should not need to learn the full ruleset to understand the engineering value.

## Correct Claim

Use:

> A static browser strategy prototype with a deterministic rules engine and a browser-local legal-action protocol for bots and browser agents.

Use:

> Browser Agent Mode lets a browser-control agent inspect legal actions and submit validated choices inside the static frontend.

## Incorrect Claim

Avoid:

> public API

Avoid:

> online AI multiplayer

Avoid:

> real remote agent endpoint

Avoid:

> production-balanced competitive game

## Case-Study Structure

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
- no-backend tradeoff
- browser agents need structured, safe action choices
- game rules are a strong testbed for deterministic protocols

### 3. Architecture

Show:

- engine
- controller
- UI
- bot
- debug panel
- Browser Agent Mode
- `BroadcastChannel`
- `localStorage` debug snapshots

Core message:

> UI, bot, debug tools, and browser agents all submit action IDs through the same validation path.

### 4. Legal-Action Protocol

Explain the loop:

1. game emits current request
2. actor inspects legal actions
3. actor submits selected action ID
4. controller validates request, seat, token, and action
5. engine applies accepted action
6. invalid submissions return structured rejection

Include a small JSON example from the current app.

### 5. MVP Demo Features

List only implemented systems:

- hex board
- placements
- captures
- suicide prevention
- pass
- anchors
- basic Domains
- legal action JSON
- debug submission
- built-in bot
- browser-local agent console

### 6. Roadmap

Mark these as future:

- reinforcements
- income and stability
- decrees
- influence and corruption
- region cards
- set cash-ins
- counter-draft
- victory warnings
- mandates
- stronger bots
- localhost bridge
- optional backend/shared matches

### 7. Honest Limitations

Say clearly:

- no backend in first release
- not real online multiplayer
- Browser Agent Mode requires browser or page access
- seat tokens are browser-local demo authorization, not network security
- balance is prototype-level
- future mechanics are architectural roadmap content

### 8. What I Learned

Good reflection topics:

- separating engine truth from UI presentation
- making legal actions inspectable
- designing browser-local AI integration without a server
- protecting hidden information in future protocol design
- keeping complex strategy systems readable
- cutting scope to ship the strongest slice

## README Requirements

The README should include:

- project name and one-sentence summary
- local scripts
- architecture overview
- MVP feature list
- Browser Agent Mode explanation
- current limitations
- source-doc note if useful

Do not over-document the full v0.5 rules in README. Link or reference the architecture notes instead.

## HTML Metadata Requirements

Update:

- `<title>`
- meta description

Suggested title:

```html
<title>Hex Sovereign | Steve Portfolio</title>
```

Suggested description:

```html
<meta
  name="description"
  content="Hex Sovereign is a static browser strategy prototype with a deterministic rules engine and browser-local legal-action protocol for bots and agents."
/>
```

## Visual Asset Requirements

Use existing assets from:

- `public/hex-sovereign/board-poc.png`
- `public/hex-sovereign/ui-component-sheet.png`
- `public/hex-sovereign/cards-decrees-sheet.png`

The first viewport must signal Hex Sovereign directly. The assets should support the case-study story, not imply that cards/decrees are already playable in MVP.
