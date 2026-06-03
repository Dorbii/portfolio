import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyAction,
  BOT_STRATEGIES,
  cellId,
  chooseBotAction,
  createAgentRequest,
  createMatch,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_RULES_VERSION,
  detectCompletedCardSets,
  deriveDomains,
  getEraForCycle,
  getLegalActions,
  getNeighborIdsForCoord,
  getPublicState,
  submitProtocolAction,
} from './engine.js'

const tokenFor = (seat) => `${seat}-token`

function stateWithStones(stones, config = {}) {
  const state = createMatch({ matchId: 'test-match', ...config })

  return {
    ...state,
    board: {
      ...state.board,
      cells: state.board.cells.map((cell) => ({
        ...cell,
        occupant: Object.hasOwn(stones, cell.id) ? stones[cell.id] : null,
      })),
    },
    players: {
      black: {
        ...state.players.black,
        captures: 0,
      },
      white: {
        ...state.players.white,
        captures: 0,
      },
    },
    passStreak: 0,
    lastMove: null,
  }
}

function occupantAt(state, targetId) {
  return state.board.cells.find((cell) => cell.id === targetId)?.occupant
}

function actionForCell(state, seat, targetId, type = 'PLACE_STONE') {
  const action = getLegalActions(state, seat).find(
    (candidate) =>
      candidate.type === type && candidate.payload.cellId === targetId,
  )

  assert.ok(action, `Expected a legal ${type} at ${targetId}`)
  return action
}

function passActionFor(state, seat) {
  const action = getLegalActions(state, seat).find(
    (candidate) => candidate.type === 'PASS',
  )

  assert.ok(action, `Expected ${seat} to have a pass action`)
  return action
}

function advanceOneCycle(state) {
  let nextState = state

  for (let index = 0; index < 8; index += 1) {
    const seat = nextState.activeSeat
    nextState = applyAction(
      nextState,
      passActionFor(nextState, seat).id,
      seat,
    ).state
  }

  return nextState
}

function warningFor(state, seat, type) {
  return state.victory?.activeWarnings.find(
    (warning) => warning.seat === seat && warning.type === type,
  )
}

function domainById(state, anchorId) {
  const domain = deriveDomains(state).find(
    (candidate) => candidate.anchorId === anchorId,
  )

  assert.ok(domain, `Expected ${anchorId} to derive a Domain`)
  return domain
}

function protocolSubmission(state, seat, selectedActionId) {
  const request = createAgentRequest(state, seat)

  return {
    type: 'AGENT_SUBMIT_ACTION',
    requestId: request.requestId,
    matchId: state.matchId,
    seat,
    selectedActionId,
    token: tokenFor(seat),
  }
}

function expectProtocolRejection(state, submission, options, reason) {
  const before = JSON.stringify(state)
  const result = submitProtocolAction(state, submission, options)

  assert.equal(result.accepted, false)
  assert.equal(result.reason, reason)
  assert.equal(result.state, state)
  assert.equal(JSON.stringify(state), before)
}

test('creates a deterministic radius board and stable neighbor IDs', () => {
  const state = createMatch()
  const ids = state.board.cells.map((cell) => cell.id)

  assert.equal(state.board.cells.length, 61)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids[0], '-4,0')
  assert.equal(ids.at(-1), '4,0')
  assert.equal(cellId(-2, 3), '-2,3')
  assert.equal(getNeighborIdsForCoord(0, 0, state.board.radius).length, 6)
  assert.equal(getNeighborIdsForCoord(4, 0, state.board.radius).length, 3)
})

test('creates matches with deterministic default rules config', () => {
  const state = createMatch()

  assert.equal(state.rulesVersion, DEFAULT_RULES_VERSION)
  assert.deepEqual(state.featureFlags, DEFAULT_FEATURE_FLAGS)
  assert.notEqual(state.featureFlags, DEFAULT_FEATURE_FLAGS)
})

test('merges explicit feature flag overrides without changing default flags', () => {
  const state = createMatch({
    rulesVersion: 'expansion-prep',
    featureFlags: {
      reinforcements: true,
    },
  })

  assert.equal(state.rulesVersion, 'expansion-prep')
  assert.equal(state.featureFlags.reinforcements, true)
  assert.equal(state.featureFlags.income, false)
  assert.equal(DEFAULT_FEATURE_FLAGS.reinforcements, false)
})

test('generates placements and pass actions only for the active seat', () => {
  const state = createMatch()
  const actions = getLegalActions(state, 'black')
  const placementCellIds = new Set(
    actions
      .filter((action) => action.type === 'PLACE_STONE')
      .map((action) => action.payload.cellId),
  )

  assert.equal(getLegalActions(state, 'white').length, 0)
  assert.ok(actions.some((action) => action.type === 'PASS'))
  assert.equal(placementCellIds.has('-1,2'), false)
  assert.equal(placementCellIds.has('0,0'), false)
  assert.equal(actions.every((action) => action.seat === 'black'), true)
})

test('feature flag off has no reinforcement legal actions', () => {
  const state = createMatch({
    initialReinforcements: {
      black: 1,
      white: 1,
    },
  })
  const actions = getLegalActions(state, 'black')

  assert.equal(state.featureFlags.reinforcements, false)
  assert.equal(state.players.black.reinforcements, undefined)
  assert.equal(actions.some((action) => action.type === 'SPEND_REINFORCEMENT'), false)
  assert.ok(actions.some((action) => action.type === 'PLACE_STONE'))
  assert.ok(actions.some((action) => action.type === 'PASS'))
})

test('seeded reinforcement tokens expose state and legal spend actions', () => {
  const state = createMatch({
    featureFlags: {
      reinforcements: true,
    },
    initialReinforcements: {
      black: 5,
      white: -1,
    },
    reinforcements: {
      reserveCap: 2,
    },
  })
  const actions = getLegalActions(state, 'black')
  const placements = actions.filter((action) => action.type === 'PLACE_STONE')
  const reinforcements = actions.filter(
    (action) => action.type === 'SPEND_REINFORCEMENT',
  )

  assert.deepEqual(state.players.black.reinforcements, {
    tokens: 2,
    maxPerRound: 1,
    reserveCap: 2,
    spentThisRound: 0,
    lastSpentRound: null,
    lastSpentCycle: null,
  })
  assert.equal(state.players.white.reinforcements.tokens, 0)
  assert.equal(reinforcements.length, placements.length)
  assert.ok(reinforcements.length > 0)
  assert.equal(
    reinforcements.every((action) => action.seat === 'black'),
    true,
  )
})

test('captures a single surrounded group', () => {
  const state = stateWithStones({
    '0,1': 'white',
    '1,0': 'black',
    '-1,1': 'black',
    '-1,2': 'black',
    '0,2': 'black',
  })
  const action = actionForCell(state, 'black', '1,1')

  assert.equal(action.preview.capturedCount, 1)
  assert.deepEqual(action.preview.capturedIds, ['0,1'])

  const result = applyAction(state, action.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(occupantAt(result.state, '1,1'), 'black')
  assert.equal(occupantAt(result.state, '0,1'), null)
  assert.equal(result.state.players.black.captures, 1)
  assert.equal(occupantAt(state, '0,1'), 'white')
})

test('reinforcement capture mirrors normal single-capture placement', () => {
  const state = stateWithStones(
    {
      '0,1': 'white',
      '1,0': 'black',
      '-1,1': 'black',
      '-1,2': 'black',
      '0,2': 'black',
    },
    {
      featureFlags: {
        reinforcements: true,
      },
      initialReinforcements: {
        black: 1,
      },
    },
  )
  const action = actionForCell(state, 'black', '1,1', 'SPEND_REINFORCEMENT')

  assert.equal(action.preview.capturedCount, 1)
  assert.deepEqual(action.preview.capturedIds, ['0,1'])

  const result = applyAction(state, action.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(occupantAt(result.state, '1,1'), 'black')
  assert.equal(occupantAt(result.state, '0,1'), null)
  assert.equal(result.state.players.black.captures, 1)
  assert.equal(result.state.players.black.reinforcements.tokens, 0)
  assert.equal(result.state.players.black.reinforcements.spentThisRound, 1)
  assert.equal(result.state.players.black.reinforcements.lastSpentRound, 1)
  assert.equal(result.state.players.black.reinforcements.lastSpentCycle, 1)
  assert.equal(result.state.activeSeat, 'black')
  assert.equal(result.state.turn, 1)
  assert.equal(result.state.round, 1)
  assert.equal(result.state.cycle, 1)
  assert.equal(result.state.requestCounter, 2)
  assert.equal(result.state.passStreak, 0)
  assert.deepEqual(result.state.lastMove, {
    type: 'SPEND_REINFORCEMENT',
    seat: 'black',
    cellId: '1,1',
    capturedIds: ['0,1'],
  })
  assert.equal(occupantAt(state, '0,1'), 'white')
})

test('captures multiple adjacent groups with one placement', () => {
  const state = stateWithStones({
    '-1,1': 'white',
    '1,1': 'white',
    '-1,0': 'black',
    '-2,1': 'black',
    '-2,2': 'black',
    '-1,2': 'black',
    '2,0': 'black',
    '1,0': 'black',
    '0,2': 'black',
    '1,2': 'black',
  })
  const action = actionForCell(state, 'black', '0,1')

  assert.equal(action.preview.capturedCount, 2)
  assert.deepEqual([...action.preview.capturedIds].sort(), ['-1,1', '1,1'])

  const result = applyAction(state, action.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(occupantAt(result.state, '0,1'), 'black')
  assert.equal(occupantAt(result.state, '-1,1'), null)
  assert.equal(occupantAt(result.state, '1,1'), null)
  assert.equal(result.state.players.black.captures, 2)
})

test('rejects suicidal placements without mutating state', () => {
  const state = stateWithStones({
    '1,1': 'white',
    '1,0': 'white',
    '-1,1': 'white',
    '-1,2': 'white',
    '0,2': 'white',
  })
  const actionIds = getLegalActions(state, 'black').map((action) => action.id)
  const suicideActionId = 'turn-1-black-place-0,1'
  const before = JSON.stringify(state)
  const result = applyAction(state, suicideActionId, 'black')

  assert.equal(actionIds.includes(suicideActionId), false)
  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'ACTION_NOT_FOUND')
  assert.equal(result.state, state)
  assert.equal(JSON.stringify(state), before)
})

test('reinforcement suicide is not legal and protocol submit does not mutate', () => {
  const state = stateWithStones(
    {
      '1,1': 'white',
      '1,0': 'white',
      '-1,1': 'white',
      '-1,2': 'white',
      '0,2': 'white',
    },
    {
      featureFlags: {
        reinforcements: true,
      },
      initialReinforcements: {
        black: 1,
      },
    },
  )
  const actionIds = getLegalActions(state, 'black').map((action) => action.id)
  const suicideActionId = 'turn-1-black-reinforcement-0,1'

  assert.equal(actionIds.includes(suicideActionId), false)
  expectProtocolRejection(
    state,
    protocolSubmission(state, 'black', suicideActionId),
    { expectedToken: tokenFor('black') },
    'ACTION_NOT_FOUND',
  )
})

test('allows capture before suicide is evaluated', () => {
  const state = stateWithStones(
    {
      '0,-1': 'white',
      '-1,1': 'white',
      '1,-1': 'black',
      '0,1': 'black',
    },
    { radius: 1 },
  )
  const action = actionForCell(state, 'black', '-1,0')

  assert.equal(action.preview.capturedCount, 2)

  const result = applyAction(state, action.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(occupantAt(result.state, '-1,0'), 'black')
  assert.equal(occupantAt(result.state, '0,-1'), null)
  assert.equal(occupantAt(result.state, '-1,1'), null)
})

test('pass actions alternate seats and advance rounds and cycles', () => {
  let state = createMatch()
  const firstPass = applyAction(state, passActionFor(state, 'black').id, 'black')

  assert.equal(firstPass.accepted, true)
  assert.equal(firstPass.state.turn, 2)
  assert.equal(firstPass.state.round, 1)
  assert.equal(firstPass.state.cycle, 1)
  assert.equal(firstPass.state.activeSeat, 'white')
  assert.equal(firstPass.state.passStreak, 1)

  state = firstPass.state

  for (let index = 0; index < 7; index += 1) {
    const seat = state.activeSeat
    const result = applyAction(state, passActionFor(state, seat).id, seat)

    assert.equal(result.accepted, true)
    state = result.state
  }

  assert.equal(state.turn, 9)
  assert.equal(state.round, 1)
  assert.equal(state.cycle, 2)
  assert.equal(state.activeSeat, 'black')
  assert.equal(state.passStreak, 8)
})

test('reinforcement spend cap resets for the seat next round', () => {
  let state = createMatch({
    featureFlags: {
      reinforcements: true,
    },
    initialReinforcements: {
      black: 2,
    },
  })
  const spendAction = actionForCell(
    state,
    'black',
    '0,1',
    'SPEND_REINFORCEMENT',
  )
  let result = applyAction(state, spendAction.id, 'black')

  assert.equal(result.accepted, true)
  state = result.state
  assert.equal(state.players.black.reinforcements.tokens, 1)
  assert.equal(
    getLegalActions(state, 'black').some(
      (action) => action.type === 'SPEND_REINFORCEMENT',
    ),
    false,
  )

  result = applyAction(state, passActionFor(state, 'black').id, 'black')
  assert.equal(result.accepted, true)
  state = result.state

  result = applyAction(state, passActionFor(state, 'white').id, 'white')
  assert.equal(result.accepted, true)
  state = result.state

  assert.equal(state.activeSeat, 'black')
  assert.equal(state.round, 2)
  assert.equal(state.players.black.reinforcements.tokens, 1)
  assert.equal(state.players.black.reinforcements.spentThisRound, 0)
  assert.equal(
    getLegalActions(state, 'black').some(
      (action) => action.type === 'SPEND_REINFORCEMENT',
    ),
    true,
  )
})

test('derives controlled Domains from connected anchor-zone groups', () => {
  const domains = deriveDomains(createMatch())
  const blackCapital = domains.find((domain) => domain.anchorId === 'black-capital')
  const whiteCapital = domains.find((domain) => domain.anchorId === 'white-capital')

  assert.equal(blackCapital.status, 'controlled')
  assert.equal(blackCapital.owner, 'black')
  assert.equal(blackCapital.size, 'small')
  assert.equal(whiteCapital.status, 'controlled')
  assert.equal(whiteCapital.owner, 'white')
  assert.equal(whiteCapital.size, 'small')
})

test('derives contested Domains when valid groups tie', () => {
  const state = stateWithStones({
    '-1,0': 'black',
    '-1,1': 'black',
    '1,0': 'white',
    '1,-1': 'white',
  })
  const ruins = deriveDomains(state).find((domain) => domain.anchorId === 'ruins')

  assert.equal(ruins.status, 'contested')
  assert.equal(ruins.owner, null)
  assert.deepEqual(ruins.zoneOccupancy, { black: 2, white: 2 })
})

test('creates protocol requests with public state, private state, and legal actions', () => {
  const state = createMatch({
    matchId: 'protocol-match',
    featureFlags: { reinforcements: true },
  })
  const request = createAgentRequest(state, 'black')

  assert.equal(request.type, 'AGENT_REQUEST')
  assert.equal(request.matchId, 'protocol-match')
  assert.equal(request.requestId, 'protocol-match:turn-1:request-1:black')
  assert.equal(request.seat, 'black')
  assert.equal(request.rulesVersion, DEFAULT_RULES_VERSION)
  assert.equal(request.featureFlags.reinforcements, true)
  assert.equal(request.publicState.matchId, state.matchId)
  assert.equal(request.publicState.rulesVersion, DEFAULT_RULES_VERSION)
  assert.equal(request.publicState.featureFlags.reinforcements, true)
  assert.equal(request.privateState.seat, 'black')
  assert.ok(request.legalActions.length > 0)
})

test('projects public state and agent requests with safe projection copies', () => {
  const state = {
    ...createMatch({
      featureFlags: {
        reinforcements: true,
      },
      initialReinforcements: {
        black: 1,
      },
    }),
    lastMove: {
      type: 'PLACE_STONE',
      seat: 'black',
      cellId: '1,1',
      capturedIds: ['0,1'],
    },
  }
  const publicState = getPublicState(state)
  const request = createAgentRequest(state, 'black')

  assert.notEqual(publicState.featureFlags, state.featureFlags)
  assert.notEqual(request.featureFlags, state.featureFlags)
  assert.notEqual(request.publicState.featureFlags, state.featureFlags)
  assert.notEqual(publicState.players, state.players)
  assert.notEqual(publicState.players.black, state.players.black)
  assert.notEqual(
    publicState.players.black.reinforcements,
    state.players.black.reinforcements,
  )
  assert.notEqual(
    request.publicState.players.black.reinforcements,
    state.players.black.reinforcements,
  )
  assert.notEqual(publicState.lastMove, state.lastMove)
  assert.notEqual(publicState.lastMove.capturedIds, state.lastMove.capturedIds)

  publicState.featureFlags.reinforcements = false
  request.featureFlags.reinforcements = false
  request.publicState.featureFlags.reinforcements = false
  publicState.players.black.reinforcements.tokens = 99
  request.publicState.players.black.reinforcements.tokens = 88
  publicState.lastMove.capturedIds.push('1,0')

  assert.equal(state.featureFlags.reinforcements, true)
  assert.equal(state.players.black.reinforcements.tokens, 1)
  assert.deepEqual(state.lastMove.capturedIds, ['0,1'])
})

test('accepts current protocol submissions through the engine transition', () => {
  const state = createMatch({ matchId: 'protocol-match' })
  const action = getLegalActions(state, 'black').find(
    (candidate) => candidate.type === 'PLACE_STONE',
  )
  const result = submitProtocolAction(
    state,
    protocolSubmission(state, 'black', action.id),
    { expectedToken: tokenFor('black') },
  )

  assert.equal(result.accepted, true)
  assert.equal(result.action.id, action.id)
  assert.notEqual(result.state, state)
  assert.equal(result.state.activeSeat, 'white')
  assert.equal(result.state.turn, 2)
  assert.equal(occupantAt(result.state, action.payload.cellId), 'black')
})

test('rejects stale protocol requests after a same-turn reinforcement spend', () => {
  let state = createMatch({
    matchId: 'same-turn-stale-match',
    featureFlags: {
      reinforcements: true,
    },
    initialReinforcements: {
      black: 1,
    },
  })
  const oldRequest = createAgentRequest(state, 'black')
  const oldPassSubmission = {
    type: 'AGENT_SUBMIT_ACTION',
    requestId: oldRequest.requestId,
    matchId: state.matchId,
    seat: 'black',
    selectedActionId: oldRequest.legalActions.find(
      (action) => action.type === 'PASS',
    ).id,
    token: tokenFor('black'),
  }
  const spendAction = oldRequest.legalActions.find(
    (action) =>
      action.type === 'SPEND_REINFORCEMENT' && action.payload.cellId === '0,1',
  )
  assert.ok(spendAction)
  const result = submitProtocolAction(
    state,
    {
      type: 'AGENT_SUBMIT_ACTION',
      requestId: oldRequest.requestId,
      matchId: state.matchId,
      seat: 'black',
      selectedActionId: spendAction.id,
      token: tokenFor('black'),
    },
    { expectedToken: tokenFor('black') },
  )

  assert.equal(result.accepted, true)
  assert.equal(result.state.turn, 1)
  assert.equal(result.state.activeSeat, 'black')
  assert.equal(result.state.requestCounter, 2)
  state = result.state
  expectProtocolRejection(
    state,
    oldPassSubmission,
    { expectedToken: tokenFor('black') },
    'STALE_REQUEST',
  )

  const currentRequest = createAgentRequest(state, 'black')

  expectProtocolRejection(
    state,
    {
      type: 'AGENT_SUBMIT_ACTION',
      requestId: currentRequest.requestId,
      matchId: state.matchId,
      seat: 'black',
      selectedActionId: 'turn-1-black-reinforcement-1,1',
      token: tokenFor('black'),
    },
    { expectedToken: tokenFor('black') },
    'ACTION_NOT_FOUND',
  )
})

test('rejects stale protocol requests after the turn returns to the same seat', () => {
  let state = createMatch({ matchId: 'stale-match' })
  const oldRequest = createAgentRequest(state, 'black')
  const oldSubmission = {
    type: 'AGENT_SUBMIT_ACTION',
    requestId: oldRequest.requestId,
    matchId: state.matchId,
    seat: 'black',
    selectedActionId: oldRequest.legalActions.find(
      (action) => action.type === 'PASS',
    ).id,
    token: tokenFor('black'),
  }
  let result = submitProtocolAction(state, oldSubmission, {
    expectedToken: tokenFor('black'),
  })

  assert.equal(result.accepted, true)
  state = result.state

  const whitePass = passActionFor(state, 'white')
  result = submitProtocolAction(
    state,
    protocolSubmission(state, 'white', whitePass.id),
    { expectedToken: tokenFor('white') },
  )

  assert.equal(result.accepted, true)
  state = result.state
  expectProtocolRejection(
    state,
    oldSubmission,
    { expectedToken: tokenFor('black') },
    'STALE_REQUEST',
  )
})

test('rejects wrong seats, bad tokens, and unlisted actions without mutation', () => {
  const state = createMatch({ matchId: 'reject-match' })
  const request = createAgentRequest(state, 'black')

  expectProtocolRejection(
    state,
    {
      type: 'AGENT_SUBMIT_ACTION',
      requestId: request.requestId,
      matchId: state.matchId,
      seat: 'white',
      selectedActionId: request.legalActions[0].id,
      token: tokenFor('white'),
    },
    { expectedToken: tokenFor('white') },
    'WRONG_SEAT',
  )

  expectProtocolRejection(
    state,
    {
      type: 'AGENT_SUBMIT_ACTION',
      requestId: request.requestId,
      matchId: state.matchId,
      seat: 'black',
      selectedActionId: request.legalActions[0].id,
      token: 'wrong-token',
    },
    { expectedToken: tokenFor('black') },
    'BAD_TOKEN',
  )

  expectProtocolRejection(
    state,
    {
      type: 'AGENT_SUBMIT_ACTION',
      requestId: request.requestId,
      matchId: state.matchId,
      seat: 'black',
      selectedActionId: request.legalActions[0].id,
      token: tokenFor('black'),
    },
    {},
    'BAD_TOKEN',
  )

  expectProtocolRejection(
    state,
    protocolSubmission(state, 'black', 'not-a-real-action'),
    { expectedToken: tokenFor('black') },
    'ACTION_NOT_FOUND',
  )

  expectProtocolRejection(
    state,
    protocolSubmission(state, 'black', 'turn-1-black-place--1,2'),
    { expectedToken: tokenFor('black') },
    'ACTION_NOT_FOUND',
  )
})

test('bot choices stay inside the legal action ID set', () => {
  const state = createMatch()
  const request = createAgentRequest(state, 'black')
  const selectedActionId = chooseBotAction(request)
  const legalIds = new Set(request.legalActions.map((action) => action.id))

  assert.equal(legalIds.has(selectedActionId), true)
})

test('bot strategies consume request-shaped data and return only legal action IDs', () => {
  const request = {
    type: 'AGENT_REQUEST',
    requestId: 'request-only-bot-proof',
    matchId: 'request-only-match',
    seat: 'black',
    publicState: {
      victory: {
        activeWarnings: [
          {
            seat: 'black',
            label: 'Dominance',
          },
        ],
      },
    },
    privateState: {
      seat: 'black',
      cards: {
        mustDiscard: false,
        completedSets: [],
      },
    },
    legalActions: [
      {
        id: 'legal-pass',
        type: 'PASS',
        payload: {},
        preview: {},
      },
      {
        id: 'legal-placement',
        type: 'PLACE_STONE',
        payload: {
          q: 0,
          r: 0,
        },
        preview: {
          adjacentAnchors: [],
          capturedCount: 0,
        },
      },
      {
        id: 'legal-purge',
        type: 'PURGE_CORRUPTION',
        payload: {
          sourceId: 'bribe-1',
        },
        preview: {},
      },
    ],
  }
  const legalIds = new Set(request.legalActions.map((action) => action.id))

  for (const strategy of BOT_STRATEGIES) {
    const selectedActionId = chooseBotAction(request, {
      strategy: strategy.id,
      seed: 'request-only-fixed-seed',
    })

    assert.equal(
      legalIds.has(selectedActionId),
      true,
      `${strategy.id} selected a non-legal action id`,
    )
  }

  assert.equal(
    chooseBotAction(request, {
      strategy: 'simulation',
      seed: 'request-only-fixed-seed',
    }),
    'legal-purge',
  )
  assert.equal(
    chooseBotAction(request, {
      strategy: 'random',
      seed: 'request-only-fixed-seed',
    }),
    chooseBotAction(request, {
      strategy: 'random',
      seed: 'request-only-fixed-seed',
    }),
  )
})

test('bot can choose a high-value legal reinforcement action from request actions', () => {
  const state = stateWithStones(
    {
      '0,1': 'white',
      '1,0': 'black',
      '-1,1': 'black',
      '-1,2': 'black',
      '0,2': 'black',
    },
    {
      featureFlags: {
        reinforcements: true,
      },
      initialReinforcements: {
        black: 1,
      },
    },
  )
  const request = createAgentRequest(state, 'black')
  const reinforcementAction = request.legalActions.find(
    (action) =>
      action.type === 'SPEND_REINFORCEMENT' && action.payload.cellId === '1,1',
  )
  const selectedActionId = chooseBotAction(request)
  const legalIds = new Set(request.legalActions.map((action) => action.id))

  assert.ok(reinforcementAction)
  assert.equal(reinforcementAction.preview.capturedCount, 1)
  assert.equal(selectedActionId, reinforcementAction.id)
  assert.equal(legalIds.has(selectedActionId), true)
})

test('cycle resolution grants income from stable controlled Domains and decays stability', () => {
  let state = createMatch({
    featureFlags: {
      income: true,
      stability: true,
    },
  })

  for (let index = 0; index < 8; index += 1) {
    const seat = state.activeSeat
    const result = applyAction(state, passActionFor(state, seat).id, seat)

    assert.equal(result.accepted, true)
    state = result.state
  }

  const blackCapital = deriveDomains(state).find(
    (domain) => domain.anchorId === 'black-capital',
  )
  const whiteCapital = deriveDomains(state).find(
    (domain) => domain.anchorId === 'white-capital',
  )

  assert.equal(state.cycle, 2)
  assert.equal(state.players.black.gold, 1)
  assert.equal(state.players.white.gold, 1)
  assert.equal(blackCapital.income, 1)
  assert.equal(blackCapital.stability, 1)
  assert.equal(blackCapital.baseStability, 2)
  assert.equal(whiteCapital.stability, 1)
  assert.ok(
    state.eventLog.some(
      (event) =>
        event.kind === 'DOMAIN_INCOME' &&
        event.message.includes('Black gained 1 gold'),
    ),
  )
  assert.ok(
    state.eventLog.some(
      (event) =>
        event.kind === 'DOMAIN_DECAY' &&
        event.message.includes('stability fell to 1/2'),
    ),
  )
})

test('contested Domains shut down income and clear persisted stability owner', () => {
  let state = stateWithStones(
    {
      '-1,0': 'black',
      '-1,1': 'black',
      '1,0': 'white',
      '1,-1': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
      },
      initialGold: {
        black: 0,
        white: 0,
      },
      initialDomains: {
        ruins: {
          stability: 2,
          lastOwner: 'black',
        },
      },
    },
  )

  for (let index = 0; index < 8; index += 1) {
    const seat = state.activeSeat
    state = applyAction(state, passActionFor(state, seat).id, seat).state
  }

  const ruins = deriveDomains(state).find((domain) => domain.anchorId === 'ruins')

  assert.equal(ruins.status, 'contested')
  assert.equal(ruins.income, 0)
  assert.equal(ruins.economyStatus, 'shutdown')
  assert.deepEqual(state.domains.ruins, {
    stability: 0,
    lastOwner: 'black',
    decrees: [],
  })
  assert.equal(state.players.black.gold, 0)
  assert.equal(state.players.white.gold, 0)
  assert.ok(
    state.eventLog.some(
      (event) =>
        event.kind === 'DOMAIN_SHUTDOWN' &&
        event.message.includes('Ash Marsh Ruins'),
    ),
  )
})

test('repair actions spend gold and refresh the same-turn request without advancing time', () => {
  const state = createMatch({
    featureFlags: {
      income: true,
      stability: true,
    },
    initialGold: {
      black: 2,
    },
    initialDomains: {
      'black-capital': {
        stability: 1,
        lastOwner: 'black',
      },
    },
  })
  const action = getLegalActions(state, 'black').find(
    (candidate) =>
      candidate.type === 'REPAIR_DOMAIN' &&
      candidate.payload.anchorId === 'black-capital',
  )

  assert.ok(action)
  assert.deepEqual(action.preview, {
    stabilityBefore: 1,
    stabilityAfter: 2,
  })

  const result = applyAction(state, action.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(result.state.turn, 1)
  assert.equal(result.state.activeSeat, 'black')
  assert.equal(result.state.players.black.gold, 0)
  assert.equal(result.state.domains['black-capital'].stability, 2)
  assert.equal(result.state.requestCounter, 2)
  assert.ok(
    result.state.eventLog.some((event) => event.kind === 'REPAIR_DOMAIN'),
  )
})

test('protocol exposes economy state and repair choices through safe projections', () => {
  const state = createMatch({
    matchId: 'economy-protocol',
    featureFlags: {
      income: true,
      stability: true,
    },
    initialGold: {
      black: 2,
    },
    initialDomains: {
      'black-capital': {
        stability: 1,
        lastOwner: 'black',
      },
    },
  })
  const request = createAgentRequest(state, 'black')
  const publicBlackCapital = request.publicState.domains.find(
    (domain) => domain.anchorId === 'black-capital',
  )
  const repair = request.legalActions.find(
    (action) => action.type === 'REPAIR_DOMAIN',
  )

  assert.equal(request.publicState.players.black.gold, 2)
  assert.equal(request.publicState.players.black.upkeepDue, 0)
  assert.equal(publicBlackCapital.stability, 1)
  assert.equal(publicBlackCapital.baseStability, 2)
  assert.equal(publicBlackCapital.income, 1)
  assert.equal(publicBlackCapital.canRepair, true)
  assert.ok(repair)
  assert.equal(repair.payload.cost, 2)

  request.publicState.players.black.gold = 99
  publicBlackCapital.stability = 99

  assert.equal(state.players.black.gold, 2)
  assert.equal(deriveDomains(state).find((domain) => domain.anchorId === 'black-capital').stability, 1)
})

test('bot can choose repair legal actions when no placement scores higher', () => {
  const state = createMatch({
    radius: 1,
    featureFlags: {
      income: true,
      stability: true,
    },
    initialGold: {
      black: 2,
    },
    initialDomains: {
      ruins: {
        stability: 1,
        lastOwner: 'black',
      },
    },
  })
  const controlledState = {
    ...state,
    board: {
      ...state.board,
      cells: state.board.cells.map((cell) => ({
        ...cell,
        occupant:
          cell.id === '-1,0' || cell.id === '0,-1' ? 'black' : cell.occupant,
      })),
    },
  }
  const request = createAgentRequest(controlledState, 'black')
  const selectedActionId = chooseBotAction(request)
  const legalIds = new Set(request.legalActions.map((action) => action.id))

  assert.ok(request.legalActions.some((action) => action.type === 'REPAIR_DOMAIN'))
  assert.equal(legalIds.has(selectedActionId), true)
})

test('decree slots expose buy actions through public protocol and enforce capacity', () => {
  let state = createMatch({
    matchId: 'decree-capacity',
    featureFlags: {
      income: true,
      stability: true,
      decrees: true,
    },
    initialGold: {
      black: 6,
    },
  })
  let request = createAgentRequest(state, 'black')
  const publicCapital = request.publicState.domains.find(
    (domain) => domain.anchorId === 'black-capital',
  )

  assert.equal(publicCapital.decreeSlots, 2)
  assert.equal(publicCapital.decreeSlotsUsed, 0)
  assert.equal(publicCapital.decreeSlotsFree, 2)

  for (let index = 0; index < 2; index += 1) {
    const action = getLegalActions(state, 'black').find(
      (candidate) =>
        candidate.type === 'BUY_DECREE' &&
        candidate.payload.anchorId === 'black-capital',
    )

    assert.ok(action)
    const result = submitProtocolAction(
      state,
      protocolSubmission(state, 'black', action.id),
      { expectedToken: tokenFor('black') },
    )

    assert.equal(result.accepted, true)
    state = result.state
  }

  request = createAgentRequest(state, 'black')
  const filledCapital = request.publicState.domains.find(
    (domain) => domain.anchorId === 'black-capital',
  )

  assert.equal(filledCapital.decreeSlotsUsed, 2)
  assert.equal(filledCapital.decreeSlotsFree, 0)
  assert.equal(
    request.legalActions.some(
      (action) =>
        action.type === 'BUY_DECREE' &&
        action.payload.anchorId === 'black-capital',
    ),
    false,
  )
  assert.equal(state.players.black.gold, 4)
  assert.ok(state.eventLog.some((event) => event.kind === 'BUY_DECREE'))
})

test('upgraded decrees produce income, create upkeep obligations, and pay through legal actions', () => {
  let state = createMatch({
    matchId: 'decree-upkeep',
    featureFlags: {
      income: true,
      stability: true,
      decrees: true,
    },
    initialGold: {
      black: 6,
    },
  })

  let action = getLegalActions(state, 'black').find(
    (candidate) =>
      candidate.type === 'BUY_DECREE' &&
      candidate.payload.anchorId === 'black-capital',
  )
  state = applyAction(state, action.id, 'black').state

  for (let level = 1; level < 3; level += 1) {
    action = getLegalActions(state, 'black').find(
      (candidate) =>
        candidate.type === 'UPGRADE_DECREE' &&
        candidate.payload.anchorId === 'black-capital',
    )

    assert.ok(action)
    state = applyAction(state, action.id, 'black').state
  }

  const upgradedCapital = deriveDomains(state).find(
    (domain) => domain.anchorId === 'black-capital',
  )

  assert.equal(upgradedCapital.decrees[0].level, 3)
  assert.equal(upgradedCapital.decreeIncome, 3)
  assert.equal(upgradedCapital.decreeUpkeep, 1)
  assert.equal(state.players.black.gold, 2)

  for (let index = 0; index < 8; index += 1) {
    const seat = state.activeSeat
    state = applyAction(state, passActionFor(state, seat).id, seat).state
  }

  assert.equal(state.cycle, 2)
  assert.equal(state.players.black.gold, 6)
  assert.equal(state.players.black.upkeepDue, 1)
  assert.ok(
    state.eventLog.some((event) => event.kind === 'DOMAIN_DECREE_UPKEEP'),
  )

  const upkeep = getLegalActions(state, 'black').find(
    (candidate) => candidate.type === 'PAY_UPKEEP',
  )
  const result = applyAction(state, upkeep.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(result.state.players.black.gold, 5)
  assert.equal(result.state.players.black.upkeepDue, 0)
  assert.ok(result.state.eventLog.some((event) => event.kind === 'PAY_UPKEEP'))
})

test('contested Domains deactivate and decay decrees at cycle resolution', () => {
  let state = stateWithStones(
    {
      '-1,0': 'black',
      '-1,1': 'black',
      '1,0': 'white',
      '1,-1': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        decrees: true,
      },
      initialDomains: {
        ruins: {
          stability: 2,
          lastOwner: 'black',
          decrees: [
            {
              type: 'Tax Office',
              level: 2,
            },
          ],
        },
      },
    },
  )

  let ruins = deriveDomains(state).find((domain) => domain.anchorId === 'ruins')

  assert.equal(ruins.status, 'contested')
  assert.equal(ruins.decrees[0].status, 'inactive')

  for (let index = 0; index < 8; index += 1) {
    const seat = state.activeSeat
    state = applyAction(state, passActionFor(state, seat).id, seat).state
  }

  assert.equal(state.domains.ruins.decrees[0].level, 1)
  assert.ok(
    state.eventLog.some((event) => event.kind === 'DOMAIN_DECREE_DECAY'),
  )

  for (let index = 0; index < 8; index += 1) {
    const seat = state.activeSeat
    state = applyAction(state, passActionFor(state, seat).id, seat).state
  }

  assert.deepEqual(state.domains.ruins.decrees, [])
  assert.ok(
    state.eventLog.some(
      (event) =>
        event.kind === 'DOMAIN_DECREE_DECAY' &&
        event.message.includes('destroyed'),
    ),
  )
})

test('ownership flips ruin previous decrees and expose convert or scrap legal actions', () => {
  let state = stateWithStones(
    {
      '-1,0': 'white',
      '-1,1': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        decrees: true,
      },
      initialGold: {
        white: 3,
      },
      initialDomains: {
        ruins: {
          stability: 2,
          lastOwner: 'black',
          decrees: [
            {
              type: 'Tax Office',
              level: 2,
            },
          ],
        },
      },
    },
  )
  state = {
    ...state,
    activeSeat: 'white',
  }

  let result = applyAction(state, passActionFor(state, 'white').id, 'white')

  assert.equal(result.accepted, true)
  state = result.state
  assert.equal(state.domains.ruins.lastOwner, 'white')
  assert.equal(state.domains.ruins.stability, 1)
  assert.equal(state.domains.ruins.decrees[0].ruined, true)
  assert.ok(
    state.eventLog.some((event) => event.kind === 'DOMAIN_DECREES_RUINED'),
  )

  state = applyAction(state, passActionFor(state, 'black').id, 'black').state

  const convert = getLegalActions(state, 'white').find(
    (candidate) => candidate.type === 'CONVERT_RUINED_DECREE',
  )
  const scrap = getLegalActions(state, 'white').find(
    (candidate) => candidate.type === 'SCRAP_RUINED_DECREE',
  )

  assert.ok(convert)
  assert.equal(convert.preview.levelAfter, 2)
  assert.ok(scrap)
  assert.equal(scrap.preview.goldGain, 1)

  result = applyAction(state, convert.id, 'white')
  assert.equal(result.accepted, true)
  assert.equal(result.state.players.white.gold, 1)
  assert.equal(result.state.domains.ruins.decrees[0].ruined, false)
  assert.equal(result.state.domains.ruins.decrees[0].level, 2)

  result = applyAction(state, scrap.id, 'white')
  assert.equal(result.accepted, true)
  assert.equal(result.state.players.white.gold, 4)
  assert.deepEqual(result.state.domains.ruins.decrees, [])
  assert.ok(
    result.state.eventLog.some(
      (event) => event.kind === 'SCRAP_RUINED_DECREE',
    ),
  )
})

test('converting a ruined decree resets stability to the documented recovery value', () => {
  const state = stateWithStones(
    {
      '-1,0': 'white',
      '-1,1': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        decrees: true,
      },
      initialGold: {
        white: 3,
      },
      initialDomains: {
        ruins: {
          stability: 2,
          lastOwner: 'white',
          decrees: [
            {
              type: 'Tax Office',
              level: 2,
              ruined: true,
            },
          ],
        },
      },
    },
  )
  const whiteState = {
    ...state,
    activeSeat: 'white',
  }
  const convert = getLegalActions(whiteState, 'white').find(
    (candidate) => candidate.type === 'CONVERT_RUINED_DECREE',
  )

  assert.ok(convert)
  assert.equal(convert.preview.stabilityAfter, 1)

  const result = applyAction(whiteState, convert.id, 'white')

  assert.equal(result.accepted, true)
  assert.equal(result.state.domains.ruins.stability, 1)
  assert.equal(result.state.domains.ruins.decrees[0].ruined, false)
})

test('controlled depleted Domains deactivate and decay decrees at cycle resolution', () => {
  let state = createMatch({
    featureFlags: {
      income: true,
      stability: true,
      decrees: true,
    },
    initialDomains: {
      'black-capital': {
        stability: 0,
        lastOwner: 'black',
        decrees: [
          {
            type: 'Tax Office',
            level: 2,
          },
        ],
      },
    },
  })
  const blackCapital = deriveDomains(state).find(
    (domain) => domain.anchorId === 'black-capital',
  )

  assert.equal(blackCapital.status, 'controlled')
  assert.equal(blackCapital.economyStatus, 'shutdown')
  assert.equal(blackCapital.decrees[0].status, 'inactive')

  for (let index = 0; index < 8; index += 1) {
    const seat = state.activeSeat
    state = applyAction(state, passActionFor(state, seat).id, seat).state
  }

  assert.equal(state.domains['black-capital'].decrees[0].level, 1)
  assert.ok(
    state.eventLog.some(
      (event) =>
        event.kind === 'DOMAIN_DECREE_DECAY' &&
        event.message.includes('depleted'),
    ),
  )
})

test('bot can choose decree legal actions through the request action set', () => {
  const base = createMatch({
    radius: 1,
    featureFlags: {
      decrees: true,
    },
    initialGold: {
      black: 3,
    },
  })
  const occupied = Object.fromEntries(
    base.board.cells
      .filter((cell) => cell.type === 'playable')
      .map((cell) => [cell.id, 'black']),
  )
  const state = stateWithStones(occupied, {
    radius: 1,
    featureFlags: {
      decrees: true,
    },
    initialGold: {
      black: 3,
    },
  })
  const request = createAgentRequest(state, 'black')
  const selectedActionId = chooseBotAction(request)
  const selected = request.legalActions.find(
    (action) => action.id === selectedActionId,
  )

  assert.equal(selected.type, 'BUY_DECREE')
})

test('influence sources expose legal pressure targets and public projections', () => {
  let state = stateWithStones(
    {
      '-2,1': 'black',
      '-2,0': 'black',
      '-1,0': 'white',
      '-1,1': 'white',
    },
    {
      featureFlags: {
        influence: true,
      },
    },
  )
  const action = getLegalActions(state, 'black').find(
    (candidate) =>
      candidate.type === 'ASSIGN_INFLUENCE_PRESSURE' &&
      candidate.payload.sourceAnchorId === 'temple' &&
      candidate.payload.targetAnchorId === 'ruins',
  )

  assert.ok(action)
  assert.equal(action.payload.strength, 2)

  const result = applyAction(state, action.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(result.state.turn, 1)
  assert.equal(result.state.activeSeat, 'black')
  assert.equal(result.state.requestCounter, 2)
  state = result.state

  const request = createAgentRequest(state, 'black')
  const publicRuins = request.publicState.domains.find(
    (domain) => domain.anchorId === 'ruins',
  )

  assert.equal(publicRuins.pressure.incomingInfluence, 2)
  assert.equal(publicRuins.pressure.netPressure, 2)
  assert.equal(publicRuins.pressure.assignments[0].status, 'projected')
  assert.equal(request.publicState.pressure.assignments.length, 1)
  assert.match(request.explanationHints.pressure, /Pressure assignments/)
})

test('influence support can offset decay with passive repair at cycle resolution', () => {
  let state = stateWithStones(
    {
      '-2,1': 'black',
      '-2,0': 'black',
    },
    {
      featureFlags: {
        stability: true,
        influence: true,
      },
      initialDomains: {
        temple: {
          stability: 1,
          lastOwner: 'black',
        },
      },
    },
  )
  const support = getLegalActions(state, 'black').find(
    (candidate) =>
      candidate.type === 'ASSIGN_INFLUENCE_SUPPORT' &&
      candidate.payload.sourceAnchorId === 'temple' &&
      candidate.payload.targetAnchorId === 'temple',
  )

  assert.ok(support)
  state = applyAction(state, support.id, 'black').state
  state = advanceOneCycle(state)

  assert.equal(state.domains.temple.stability, 1)
  assert.ok(
    state.eventLog.some((event) => event.kind === 'PRESSURE_SUPPORT_REPAIR'),
  )
})

test('corruption pressure assigns each source once per cycle, siphons income, and damages stability', () => {
  let state = stateWithStones(
    {
      '-2,1': 'black',
      '-2,0': 'black',
      '-3,0': 'black',
      '-3,2': 'black',
      '-1,0': 'white',
      '-1,1': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        decrees: true,
        influence: true,
        corruption: true,
      },
      initialDomains: {
        temple: {
          stability: 3,
          lastOwner: 'black',
          decrees: [
            {
              type: 'Bribe Network',
              level: 3,
            },
          ],
        },
        ruins: {
          stability: 2,
          lastOwner: 'white',
        },
      },
    },
  )
  const influence = getLegalActions(state, 'black').find(
    (candidate) =>
      candidate.type === 'ASSIGN_INFLUENCE_PRESSURE' &&
      candidate.payload.sourceAnchorId === 'temple' &&
      candidate.payload.targetAnchorId === 'ruins',
  )
  state = applyAction(state, influence.id, 'black').state

  const bribe = getLegalActions(state, 'black').find(
    (candidate) =>
      candidate.type === 'TARGET_BRIBE_NETWORK' &&
      candidate.payload.sourceAnchorId === 'temple' &&
      candidate.payload.targetAnchorId === 'ruins',
  )

  assert.ok(bribe)
  state = applyAction(state, bribe.id, 'black').state
  assert.equal(
    getLegalActions(state, 'black').some(
      (candidate) => candidate.payload?.sourceId === bribe.payload.sourceId,
    ),
    false,
  )

  const projectedRuins = deriveDomains(state).find(
    (domain) => domain.anchorId === 'ruins',
  )

  assert.equal(projectedRuins.pressure.incomingInfluence, 3)
  assert.equal(projectedRuins.pressure.incomingCorruption, 4)
  assert.equal(projectedRuins.pressure.netPressure, 7)
  assert.equal(projectedRuins.pressure.projectedEffects.siphon, 1)
  assert.equal(projectedRuins.pressure.projectedEffects.stabilityDamage, 1)
  assert.ok(projectedRuins.pressure.warningChips.includes('corruption'))

  state = advanceOneCycle(state)

  assert.equal(state.domains.ruins.stability, 0)
  assert.equal(state.pressure.assignments.length, 0)
  assert.equal(
    state.pressure.metrics.culturalMandateWatch.black.pressuredEnemyDomains,
    1,
  )
  assert.ok(
    state.eventLog.some((event) => event.kind === 'PRESSURE_SIPHON'),
  )
  assert.ok(
    state.eventLog.some(
      (event) => event.kind === 'PRESSURE_STABILITY_DAMAGE',
    ),
  )
})

test('counter-bribes and purge actions reduce public corruption projections', () => {
  let state = stateWithStones(
    {
      '-1,0': 'black',
      '-1,1': 'black',
      '-2,1': 'white',
      '-2,0': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        decrees: true,
        influence: true,
        corruption: true,
      },
      initialGold: {
        white: 4,
      },
      initialDomains: {
        ruins: {
          stability: 2,
          lastOwner: 'black',
          decrees: [
            {
              type: 'Bribe Network',
              level: 2,
            },
          ],
        },
        temple: {
          stability: 2,
          lastOwner: 'white',
        },
      },
    },
  )
  const bribe = getLegalActions(state, 'black').find(
    (candidate) =>
      candidate.type === 'TARGET_BRIBE_NETWORK' &&
      candidate.payload.sourceAnchorId === 'ruins' &&
      candidate.payload.targetAnchorId === 'temple',
  )

  assert.ok(bribe)
  state = applyAction(state, bribe.id, 'black').state
  state = {
    ...state,
    activeSeat: 'white',
  }

  const counterBribe = getLegalActions(state, 'white').find(
    (candidate) =>
      candidate.type === 'SPEND_COUNTER_BRIBE' &&
      candidate.payload.targetAnchorId === 'temple',
  )
  const purge = getLegalActions(state, 'white').find(
    (candidate) =>
      candidate.type === 'PURGE_CORRUPTION' &&
      candidate.payload.targetAnchorId === 'temple',
  )

  assert.ok(counterBribe)
  assert.ok(purge)

  state = applyAction(state, counterBribe.id, 'white').state
  state = applyAction(state, purge.id, 'white').state

  const temple = deriveDomains(state).find((domain) => domain.anchorId === 'temple')

  assert.equal(state.players.white.gold, 2)
  assert.equal(temple.pressure.incomingCorruption, 3)
  assert.equal(temple.pressure.defensiveReduction, 3)
  assert.equal(temple.pressure.effectiveCorruption, 0)
  assert.equal(temple.pressure.netPressure, 0)
  assert.equal(
    getLegalActions(state, 'white').some(
      (candidate) =>
        candidate.type === 'PURGE_CORRUPTION' &&
        candidate.payload.sourceId === purge.payload.sourceId,
    ),
    false,
  )
})

test('bot can choose pressure legal actions through the request action set', () => {
  const state = stateWithStones(
    {
      '-2,1': 'black',
      '-2,0': 'black',
      '-1,0': 'white',
      '-1,1': 'white',
    },
    {
      radius: 4,
      featureFlags: {
        influence: true,
      },
    },
  )
  const request = createAgentRequest(state, 'black')
  const selectedActionId = chooseBotAction(request)
  const selected = request.legalActions.find(
    (action) => action.id === selectedActionId,
  )

  assert.ok(selected)
  assert.equal(selected.type, 'ASSIGN_INFLUENCE_PRESSURE')
})

test('card draft pools derive from controlled regions and redact opponent hands', () => {
  let state = stateWithStones(
    {
      '-2,1': 'black',
      '-2,0': 'black',
    },
    {
      featureFlags: {
        regionCards: true,
      },
    },
  )
  const draftActions = getLegalActions(state, 'black').filter(
    (action) => action.type === 'DRAFT_CARD',
  )

  assert.deepEqual(
    draftActions.map((action) => action.payload.regionId),
    ['temple-coast'],
  )

  state = applyAction(state, draftActions[0].id, 'black').state

  const blackRequest = createAgentRequest(state, 'black')
  const whiteRequest = createAgentRequest(state, 'white')

  assert.equal(blackRequest.privateState.cards.hand.length, 1)
  assert.equal(blackRequest.privateState.cards.hand[0].name, 'Temple Coast')
  assert.equal(blackRequest.publicState.players.black.cardCount, 1)
  assert.equal(blackRequest.publicState.cards.players.black.cardCount, 1)
  assert.equal(blackRequest.publicState.cards.players.black.hand, undefined)
  assert.equal(whiteRequest.privateState.cards.hand.length, 0)
  assert.equal(
    JSON.stringify(whiteRequest.publicState.cards).includes(
      blackRequest.privateState.cards.hand[0].id,
    ),
    false,
  )
  assert.match(blackRequest.explanationHints.cards, /private/)
})

test('card fallback grants gold when a player controls no draft regions', () => {
  let state = createMatch({
    featureFlags: {
      regionCards: true,
    },
  })
  state = {
    ...state,
    board: {
      ...state.board,
      cells: state.board.cells.map((cell) => ({
        ...cell,
        occupant: null,
      })),
    },
  }

  const fallback = getLegalActions(state, 'black').find(
    (action) => action.type === 'DRAFT_CARD' && action.payload.fallback === 'gold',
  )

  assert.ok(fallback)

  const result = applyAction(state, fallback.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(result.state.players.black.gold, 1)
  assert.equal(result.state.cards.players.black.hand.length, 0)
  assert.equal(result.state.cards.players.black.lastDraftCycle, 1)
})

test('completed sets are detected and cash-ins create counter-draft choices', () => {
  let state = createMatch({
    featureFlags: {
      regionCards: true,
      setCashIns: true,
      counterDraft: true,
    },
    initialCards: {
      black: [
        { id: 'black-temple-1', regionId: 'temple-coast' },
        { id: 'black-temple-2', regionId: 'temple-coast' },
        { id: 'black-temple-3', regionId: 'temple-coast' },
      ],
    },
  })
  const detected = detectCompletedCardSets(state.cards.players.black.hand, state.cycle)

  assert.equal(detected.length, 1)
  assert.equal(detected[0].setType, 'MATCHING_REGION')

  const request = createAgentRequest(state, 'black')
  const cashSet = request.legalActions.find((action) => action.type === 'CASH_SET')

  assert.ok(cashSet)

  state = applyAction(state, cashSet.id, 'black').state

  assert.equal(state.activeSeat, 'white')
  assert.equal(state.phase, 'COUNTER_DRAFT')
  assert.equal(state.cards.players.black.hand.length, 0)
  assert.equal(state.cards.players.black.revealedSets.length, 1)
  assert.equal(state.cards.pendingCounterDraft.responder, 'white')
  assert.equal(
    state.eventLog[0].detail.cardIds,
    undefined,
  )
  assert.equal(state.eventLog[0].detail.setId.includes('black-temple'), false)

  const publicState = getPublicState(state)

  assert.equal(publicState.cards.players.black.cardCount, 0)
  assert.equal(publicState.cards.players.black.revealedSets.length, 1)
  assert.equal(publicState.cards.pendingCounterDraft.responder, 'white')
  assert.equal(JSON.stringify(publicState.cards).includes('black-temple'), false)

  const counterActions = getLegalActions(state, 'white').filter((action) =>
    action.type.startsWith('COUNTER_'),
  )

  assert.deepEqual(
    counterActions.map((action) => action.type).sort(),
    ['COUNTER_IMMEDIATE', 'COUNTER_SAFE_FALLBACK', 'COUNTER_SEEK_MISSING'],
  )
})

test('seek-missing counter-draft rewards stay hidden and cannot cash this cycle', () => {
  let state = createMatch({
    featureFlags: {
      regionCards: true,
      setCashIns: true,
      counterDraft: true,
    },
    initialCards: {
      black: [
        { id: 'black-temple-1', regionId: 'temple-coast' },
        { id: 'black-temple-2', regionId: 'temple-coast' },
        { id: 'black-temple-3', regionId: 'temple-coast' },
      ],
      white: [
        { id: 'white-ash-1', regionId: 'ash-marsh' },
        { id: 'white-ash-2', regionId: 'ash-marsh' },
      ],
    },
  })
  const cashSet = getLegalActions(state, 'black').find(
    (action) => action.type === 'CASH_SET',
  )
  state = applyAction(state, cashSet.id, 'black').state

  const seekMissing = getLegalActions(state, 'white').find(
    (action) => action.type === 'COUNTER_SEEK_MISSING',
  )
  state = applyAction(state, seekMissing.id, 'white').state

  const whitePrivate = createAgentRequest(state, 'white').privateState.cards
  const blackPublic = createAgentRequest(state, 'black').publicState.cards

  assert.equal(state.activeSeat, 'black')
  assert.equal(whitePrivate.hand.length, 3)
  assert.equal(whitePrivate.hand[2].regionId, 'ash-marsh')
  assert.equal(whitePrivate.hand[2].cashableAfterCycle, 2)
  assert.equal(whitePrivate.completedSets.length, 0)
  assert.equal(blackPublic.players.white.cardCount, 3)
  assert.equal(blackPublic.players.white.hand, undefined)
  assert.equal(
    JSON.stringify(blackPublic).includes(whitePrivate.hand[2].id),
    false,
  )
  assert.equal(
    state.cards.metrics.counterDraftChoices.white.COUNTER_SEEK_MISSING,
    1,
  )
  assert.equal(state.cards.metrics.seekMissingChoices.white.total, 1)
  assert.equal(state.eventLog[0].detail.choice, 'COUNTER_SEEK_MISSING')
  assert.equal(state.eventLog[0].detail.regionId, undefined)
})

test('discard flow blocks other actions until hand limit is restored', () => {
  let state = createMatch({
    featureFlags: {
      regionCards: true,
      setCashIns: true,
    },
    initialCardState: {
      handLimit: 5,
    },
    initialCards: {
      black: [
        { id: 'card-1', regionId: 'temple-coast' },
        { id: 'card-2', regionId: 'temple-coast' },
        { id: 'card-3', regionId: 'temple-coast' },
        { id: 'card-4', regionId: 'ash-marsh' },
        { id: 'card-5', regionId: 'northwood' },
        { id: 'card-6', regionId: 'central-plain' },
      ],
    },
  })
  const actions = getLegalActions(state, 'black')

  assert.ok(actions.length > 0)
  assert.equal(actions.every((action) => action.type === 'DISCARD_CARD'), true)

  state = applyAction(state, actions[0].id, 'black').state

  assert.equal(state.phase, 'BOARD_PHASE')
  assert.equal(state.activeSeat, 'black')
  assert.equal(state.cards.players.black.hand.length, 5)
  assert.equal(
    getLegalActions(state, 'black').some((action) => action.type === 'PASS'),
    true,
  )
})

test('bot can choose card and counter-draft legal actions through the request action set', () => {
  let state = createMatch({
    featureFlags: {
      regionCards: true,
      setCashIns: true,
      counterDraft: true,
    },
    initialCards: {
      black: [
        { id: 'black-temple-1', regionId: 'temple-coast' },
        { id: 'black-temple-2', regionId: 'temple-coast' },
        { id: 'black-temple-3', regionId: 'temple-coast' },
      ],
    },
  })
  let request = createAgentRequest(state, 'black')
  let selected = request.legalActions.find(
    (action) => action.id === chooseBotAction(request),
  )

  assert.equal(selected.type, 'CASH_SET')

  state = applyAction(state, selected.id, 'black').state
  request = createAgentRequest(state, 'white')
  selected = request.legalActions.find(
    (action) => action.id === chooseBotAction(request),
  )

  assert.ok(selected.type.startsWith('COUNTER_'))
})

test('maps source eras to cycle ranges and stipends', () => {
  assert.deepEqual(
    [1, 2, 3, 5, 6, 8, 9, 20].map((cycle) => getEraForCycle(cycle).id),
    [1, 1, 2, 2, 3, 3, 4, 4],
  )
  assert.equal(getEraForCycle(1).stipend, 2)
  assert.equal(getEraForCycle(6).stipend, 4)
  assert.equal(getEraForCycle(9).stipend, 5)
})

test('surrender wins immediately and closes future legal actions', () => {
  const state = createMatch({
    featureFlags: {
      victoryWarnings: true,
    },
  })
  const surrender = getLegalActions(state, 'black').find(
    (action) => action.type === 'SURRENDER',
  )

  assert.ok(surrender)

  const result = applyAction(state, surrender.id, 'black')

  assert.equal(result.accepted, true)
  assert.equal(result.state.victory.winner, 'white')
  assert.equal(result.state.victory.winReason, 'SURRENDER')
  assert.equal(getLegalActions(result.state, 'black').length, 0)
  assert.equal(result.state.eventLog[0].kind, 'SURRENDER')
})

test('dominance victory starts as a warning and confirms after a full cycle', () => {
  let state = stateWithStones(
    {
      '0,-3': 'black',
      '1,-4': 'black',
      '-1,-1': 'black',
      '-2,-1': 'black',
      '-3,0': 'black',
      '-2,0': 'black',
      '3,-2': 'black',
      '4,-2': 'black',
      '2,-1': 'black',
      '2,0': 'black',
      '1,1': 'black',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        victoryWarnings: true,
      },
    },
  )

  state = advanceOneCycle(state)

  const warning = warningFor(state, 'black', 'DOMINANCE')

  assert.ok(warning)
  assert.equal(state.victory.winner, null)
  assert.equal(warning.triggeredCycle, 1)
  assert.equal(
    createAgentRequest(state, 'black').explanationHints.victory,
    'Non-surrender wins require a public warning at cycle resolution and one full response cycle before confirmation.',
  )
  assert.equal(
    getPublicState(state).victory.activeWarnings[0].conditionText,
    'Control 65% or more of active controlled Domain value.',
  )
  assert.ok(
    state.eventLog.some((event) => event.kind === 'VICTORY_WARNING_STARTED'),
  )

  state = advanceOneCycle(state)

  assert.equal(state.victory.winner, 'black')
  assert.equal(state.victory.winReason, 'DOMINANCE')
  assert.ok(
    state.eventLog.some((event) => event.kind === 'VICTORY_CONFIRMED'),
  )
})

test('contested enemy Capital does not start Capital Victory warning', () => {
  let state = stateWithStones(
    {
      '0,-3': 'black',
      '1,-4': 'black',
      '2,-3': 'white',
      '2,-4': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        victoryWarnings: true,
      },
    },
  )

  assert.equal(domainById(state, 'white-capital').status, 'contested')

  state = advanceOneCycle(state)

  assert.equal(warningFor(state, 'black', 'CAPITAL'), undefined)
  assert.equal(
    state.victory.activeWarnings.some((warning) => warning.type === 'CAPITAL'),
    false,
  )
  assert.equal(state.victory.winner, null)
})

test('disputed enemy Capital starts Capital warning and confirms if unresolved', () => {
  let state = stateWithStones(
    {
      '0,-3': 'black',
      '1,-4': 'black',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        victoryWarnings: true,
      },
      initialDomains: {
        'white-capital': {
          stability: 0,
          lastOwner: 'black',
        },
      },
    },
  )

  assert.equal(domainById(state, 'white-capital').status, 'controlled')
  assert.equal(domainById(state, 'white-capital').stability, 0)

  state = advanceOneCycle(state)

  const warning = warningFor(state, 'black', 'CAPITAL')

  assert.ok(warning)
  assert.equal(warning.conditionText, 'Enemy Capital Domain is disputed.')
  assert.equal(warning.conditionSnapshot.status, 'controlled')
  assert.equal(warning.conditionSnapshot.stability, 0)
  assert.equal(getPublicState(state).victory.threatened, false)
  assert.equal(createAgentRequest(state, 'white').privateState.victory.threatened, true)

  state = advanceOneCycle(state)

  assert.equal(state.victory.winner, 'black')
  assert.equal(state.victory.winReason, 'CAPITAL')
})

test('simultaneous matured warnings enter sudden death until one condition breaks', () => {
  let state = stateWithStones(
    {
      '0,-3': 'black',
      '1,-4': 'black',
      '-2,3': 'white',
      '-1,2': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        victoryWarnings: true,
      },
      initialDomains: {
        'white-capital': {
          stability: 0,
          lastOwner: 'black',
        },
        'black-capital': {
          stability: 0,
          lastOwner: 'white',
        },
      },
    },
  )

  state = advanceOneCycle(state)

  assert.ok(warningFor(state, 'black', 'CAPITAL'))
  assert.ok(warningFor(state, 'white', 'CAPITAL'))
  assert.equal(state.victory.suddenDeath, false)

  state = advanceOneCycle(state)

  assert.equal(state.victory.winner, null)
  assert.equal(state.victory.suddenDeath, true)
  assert.equal(state.victory.activeWarnings.length, 2)

  state = {
    ...state,
    board: {
      ...state.board,
      cells: state.board.cells.map((cell) =>
        ['-2,3', '-1,2'].includes(cell.id)
          ? {
              ...cell,
              occupant: null,
            }
          : cell,
      ),
    },
  }
  state = advanceOneCycle(state)

  assert.equal(state.victory.winner, 'black')
  assert.equal(state.victory.winReason, 'CAPITAL')
})

test('Military Mandate requires Central Plain plus an adjacent region', () => {
  const whiteSafeDomains = {
    '-2,3': 'white',
    '-1,2': 'white',
    '0,-3': 'white',
    '1,-4': 'white',
    '0,-1': 'white',
    '1,-1': 'white',
  }
  const config = {
    featureFlags: {
      income: true,
      stability: true,
      victoryWarnings: true,
      mandates: true,
    },
    initialVictory: {
      mandates: {
        black: {
          sourceRegionId: 'central-plain',
          unlockedCycle: 1,
        },
      },
    },
  }
  let state = stateWithStones(
    {
      ...whiteSafeDomains,
      '1,1': 'black',
      '2,0': 'black',
    },
    config,
  )

  state = advanceOneCycle(state)

  assert.equal(warningFor(state, 'black', 'MILITARY_MANDATE'), undefined)
  assert.equal(
    getPublicState(state).victory.mandates.black.conditionText.includes(
      'one adjacent region',
    ),
    true,
  )

  state = stateWithStones(
    {
      ...whiteSafeDomains,
      '1,1': 'black',
      '2,0': 'black',
      '-1,-1': 'black',
      '-2,-1': 'black',
    },
    config,
  )
  state = advanceOneCycle(state)

  const warning = warningFor(state, 'black', 'MILITARY_MANDATE')

  assert.ok(warning)
  assert.equal(
    warning.conditionText,
    'Contest or dispute the enemy Capital or control Central Plain plus one adjacent region.',
  )
  assert.equal(warning.conditionSnapshot.controlsCentral, true)
  assert.equal(warning.conditionSnapshot.controlsAdjacentRegion, true)
})

test('Military Mandate can use contested enemy Capital without Capital Victory', () => {
  let state = stateWithStones(
    {
      '0,-3': 'black',
      '1,-4': 'black',
      '2,-3': 'white',
      '2,-4': 'white',
    },
    {
      featureFlags: {
        income: true,
        stability: true,
        victoryWarnings: true,
        mandates: true,
      },
      initialVictory: {
        mandates: {
          black: {
            sourceRegionId: 'central-plain',
            unlockedCycle: 1,
          },
        },
      },
    },
  )

  assert.equal(domainById(state, 'white-capital').status, 'contested')

  state = advanceOneCycle(state)

  const warning = warningFor(state, 'black', 'MILITARY_MANDATE')

  assert.ok(warning)
  assert.equal(warningFor(state, 'black', 'CAPITAL'), undefined)
  assert.equal(warning.conditionSnapshot.enemyCapitalThreatened, true)
  assert.equal(warning.conditionSnapshot.controlsCentral, false)
  assert.equal(warning.conditionSnapshot.controlsAdjacentRegion, false)

  state = advanceOneCycle(state)

  assert.equal(state.victory.winner, 'black')
  assert.equal(state.victory.winReason, 'MILITARY_MANDATE')
})

test('third region set unlocks a mandate without immediate victory', () => {
  let state = createMatch({
    featureFlags: {
      regionCards: true,
      setCashIns: true,
      victoryWarnings: true,
      mandates: true,
    },
    initialCardState: {
      players: {
        black: {
          revealedSets: [
            {
              id: 'revealed-iron',
              owner: 'black',
              setType: 'MATCHING_REGION',
              regionId: 'iron-basin',
              cycle: 1,
              strength: 1,
            },
            {
              id: 'revealed-temple',
              owner: 'black',
              setType: 'MATCHING_REGION',
              regionId: 'temple-coast',
              cycle: 1,
              strength: 1,
            },
          ],
        },
      },
    },
    initialCards: {
      black: [
        { id: 'central-1', regionId: 'central-plain' },
        { id: 'central-2', regionId: 'central-plain' },
        { id: 'central-3', regionId: 'central-plain' },
      ],
    },
  })
  const cashSet = getLegalActions(state, 'black').find(
    (action) => action.type === 'CASH_SET',
  )

  assert.ok(cashSet)

  state = applyAction(state, cashSet.id, 'black').state

  assert.equal(state.victory.mandates.black.type, 'MILITARY_MANDATE')
  assert.equal(state.victory.activeWarnings.length, 0)
  assert.equal(state.victory.winner, null)
  assert.equal(state.eventLog[1].kind, 'MANDATE_UNLOCKED')
  assert.equal(
    getPublicState(state).victory.mandates.black.conditionText,
    'Contest or dispute the enemy Capital or control Central Plain plus one adjacent region.',
  )
})
