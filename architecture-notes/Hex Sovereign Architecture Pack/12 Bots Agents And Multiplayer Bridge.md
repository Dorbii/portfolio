# Bots Agents And Multiplayer Bridge

## Purpose

This note defines the path from simple bots to browser agents and optional future multiplayer bridges.

## Bot Architecture

Bots should be strategy modules that consume the same agent request shape as external agents.

Conceptual API:

```ts
chooseAction(agentRequest): selectedActionId
```

Bot types:

- random legal bot
- capture-seeking bot
- Domain-control bot
- economy-oriented bot
- pressure-oriented bot
- simulation/evaluation bot

## Bot Rules

Bots must not:

- read hidden opponent state
- call engine internals directly to mutate state
- bypass action validation

Bots may:

- inspect legal actions
- score actions
- submit selected action IDs

## Browser Agent Console

The Agent Console is a browser route opened from an invite URL.

Responsibilities:

- connect to match channel
- display current request
- display legal actions
- submit chosen action
- show connection state
- show last result

## Invite URL

Concept:

```text
/#/hex-sovereign/agent?match=abc123&seat=white&token=xyz
```

The token is browser-local seat authorization, not real network security.

## Localhost Bridge Future

A later bridge could allow local tools to communicate with the game.

Options:

- local development server endpoint
- browser extension
- Playwright script
- small local Node bridge

Use this only after Browser Agent Mode works.

## Optional Backend Future

A backend would be needed for:

- real multiplayer across machines
- shared match persistence
- remote AI agents without browser access
- public HTTP action endpoints
- user accounts

Backend shape:

- match service
- action validation endpoint
- event stream or websocket
- persistent match store
- seat tokens

Do not build this for the first portfolio release.

## Portfolio Framing

The best first story is:

> Static app, browser-local protocol, validated legal actions.

The backend story is a future expansion, not a prerequisite.

