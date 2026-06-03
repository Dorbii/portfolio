import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAgentChannelName,
  isAgentActionResultMessage,
  isAgentStateMessage,
  makeSeatTokens,
} from './uiLogic.js'

function validStateMessage(overrides = {}) {
  return {
    type: 'AGENT_STATE',
    matchId: 'match 1',
    seat: 'black',
    activeSeat: 'black',
    request: {
      type: 'AGENT_REQUEST',
      requestId: 'request-1',
      matchId: 'match 1',
      seat: 'black',
      legalActions: [
        {
          id: 'place:1',
          type: 'PLACE_STONE',
          label: 'Place 1',
        },
      ],
    },
    ...overrides,
  }
}

test('agent channel names are scoped by match, seat, and token', () => {
  const blackChannel = createAgentChannelName('match 1', 'black', 'token 1')
  const whiteChannel = createAgentChannelName('match 1', 'white', 'token 1')
  const rotatedTokenChannel = createAgentChannelName('match 1', 'black', 'token 2')

  assert.equal(blackChannel, 'hex-sovereign:match%201:black:token%201')
  assert.notEqual(blackChannel, whiteChannel)
  assert.notEqual(blackChannel, rotatedTokenChannel)
})

test('seat tokens are seat-scoped and high entropy enough for browser-local invites', () => {
  const tokens = makeSeatTokens()

  assert.match(tokens.black, /^black-/)
  assert.match(tokens.white, /^white-/)
  assert.notEqual(tokens.black, tokens.white)
  assert.ok(tokens.black.length >= 24)
  assert.ok(tokens.white.length >= 24)
})

test('agent state messages must match console context and request shape', () => {
  const context = { matchId: 'match 1', seat: 'black' }

  assert.equal(isAgentStateMessage(validStateMessage(), context), true)
  assert.equal(
    isAgentStateMessage(validStateMessage({ seat: 'white' }), context),
    false,
  )
  assert.equal(
    isAgentStateMessage(
      validStateMessage({
        request: {
          type: 'AGENT_REQUEST',
          requestId: 'request-1',
          matchId: 'match 1',
          seat: 'black',
          legalActions: [{ id: 'place:1' }],
        },
      }),
      context,
    ),
    false,
  )
})

test('agent action results must match console context', () => {
  const context = { matchId: 'match 1', seat: 'black' }

  assert.equal(
    isAgentActionResultMessage(
      {
        type: 'AGENT_ACTION_RESULT',
        matchId: 'match 1',
        seat: 'black',
        accepted: false,
      },
      context,
    ),
    true,
  )
  assert.equal(
    isAgentActionResultMessage(
      {
        type: 'AGENT_ACTION_RESULT',
        matchId: 'match 1',
        seat: 'white',
        accepted: false,
      },
      context,
    ),
    false,
  )
  assert.equal(
    isAgentActionResultMessage(
      {
        type: 'AGENT_ACTION_RESULT',
        matchId: 'match 1',
        seat: 'black',
        accepted: true,
        action: { id: 'place:1' },
      },
      context,
    ),
    false,
  )
})
