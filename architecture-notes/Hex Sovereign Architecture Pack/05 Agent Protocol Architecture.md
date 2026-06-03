# Agent Protocol Architecture

## Purpose

The agent protocol lets humans, bots, browser agents, and debug tools all interact with the game through the same legal-action contract.

The protocol is the portfolio differentiator.

## Core Principle

Agents do not mutate state.

Agents inspect legal actions and submit an action ID.

## Initial Modes

### Built-In Bot

Always works.

Runs inside the app and chooses from legal actions.

### Manual JSON Debug

Always works.

Lets a human inspect the current request and manually submit actions.

### Browser Agent Mode

Works when the agent can open or control the browser page.

Uses:

- URL hash for match/seat/token identity
- BroadcastChannel for live messages
- localStorage for debug snapshots
- optional window API for browser-control agents

## Agent Request

```json
{
  "type": "AGENT_REQUEST",
  "requestId": "match-abc-turn-12-black",
  "matchId": "abc",
  "seat": "black",
  "phase": "BOARD_PHASE",
  "publicState": {},
  "privateState": {},
  "legalActions": []
}
```

## Agent Submission

```json
{
  "type": "AGENT_SUBMIT_ACTION",
  "requestId": "match-abc-turn-12-black",
  "matchId": "abc",
  "seat": "black",
  "selectedActionId": "action-7",
  "token": "seat-token"
}
```

## Validation

The controller validates:

- matchId matches current match
- token matches invited seat
- seat matches active/requested seat
- requestId is current
- selectedActionId exists
- action is still legal
- action has not already been consumed

## Rejection Response

```json
{
  "accepted": false,
  "reason": "STALE_REQUEST",
  "message": "This request is no longer current."
}
```

## Browser Agent Channel

BroadcastChannel name:

```text
hex-sovereign:<matchId>
```

Message types:

- AGENT_HELLO
- AGENT_REQUEST_STATE
- AGENT_STATE
- AGENT_SUBMIT_ACTION
- AGENT_ACTION_RESULT
- GAME_DISCONNECTED

## localStorage Debug Keys

Suggested keys:

```text
hex-sovereign:<matchId>:latest-request
hex-sovereign:<matchId>:latest-response
hex-sovereign:<matchId>:latest-state
```

## Optional Window API

For browser-control agents:

```ts
window.HexSovereignAgent = {
  getRequest(seat),
  getLegalActions(seat),
  submitAction(actionId)
}
```

This is not a public network API. It is an in-page browser API.

## Portfolio Language

Use:

> Browser-local legal-action protocol.

Avoid:

> Public API.

Use:

> Browser Agent Mode.

Avoid:

> Online AI multiplayer.

