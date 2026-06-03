import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PART_CATALOG,
  applyPurchases,
  deriveControls,
  validateBlueprintAssembly,
  validateRoundSubmission,
} from '../.test-build/packages/catalog/src/index.js'
import { validateReplayTimeline } from '../.test-build/packages/replay/src/index.js'
import { resolveCombat } from '../.test-build/packages/sim/src/index.js'
import { SessionCoordinator } from '../.test-build/apps/worker/src/session.js'

const brakePlan = {
  commands: [
    { tick: 1, move: 'brake' },
    { tick: 2, move: 'brake' },
    { tick: 3, move: 'brake' },
    { tick: 4, move: 'brake' },
    { tick: 5, move: 'brake' },
  ],
}

const validSpinnerSubmission = {
  action: 'submit_round_plan',
  purchases: [
    { partId: 'Body_Square_Medium', quantity: 1 },
    { partId: 'Wheel_Large', quantity: 2 },
    { partId: 'Weapon_Spinner_Small', quantity: 1 },
  ],
  blueprint: {
    name: 'Spinner',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      {
        id: 'spinner',
        partId: 'Weapon_Spinner_Small',
        position: [0, 0, 1],
        rotation: [0, 0, 0],
      },
    ],
  },
  turnPlan: {
    commands: [
      { tick: 1, move: 'forward', weaponA: 'hold' },
      { tick: 2, move: 'forward', weaponA: 'fire' },
      { tick: 3, move: 'turn_left', weaponA: 'hold' },
      { tick: 4, move: 'forward', weaponA: 'fire' },
      { tick: 5, move: 'brake', weaponA: 'hold' },
    ],
  },
}

function createTestSession(sessionId = 's_test', options = {}) {
  return SessionCoordinator.create(
    { sessionId, seed: 'test-seed' },
    {
      clock: () => '2026-06-03T00:00:00.000Z',
      tokenFactory: (role, kind) => `${kind}_${role}`,
      ...options,
    },
  )
}

async function claimBothRoles(session) {
  const red = await session.claimRole({ role: 'red', claimToken: 'claim_red' })
  const blue = await session.claimRole({ role: 'blue', claimToken: 'claim_blue' })

  assert.equal(red.ok, true)
  assert.equal(blue.ok, true)

  return {
    redToken: red.value.roleToken,
    blueToken: blue.value.roleToken,
  }
}

test('catalog exposes unique MVP part ids', () => {
  const ids = PART_CATALOG.map((part) => part.id)

  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('Body_Square_Small'))
  assert.ok(ids.includes('Weapon_Net'))
  assert.ok(ids.includes('Style_TrashCan'))
})

test('purchase validation rejects unknown parts and overspend', () => {
  const unknown = applyPurchases(100, [], [{ partId: 'Weapon_NukeLaserDragon', quantity: 1 }])
  const overspend = applyPurchases(5, [], [{ partId: 'Weapon_Spinner_Large', quantity: 1 }])

  assert.equal(unknown.ok, false)
  assert.equal(overspend.ok, false)
  assert.equal(unknown.issues[0].code, 'UNKNOWN_PART')
  assert.equal(overspend.issues[0].code, 'INSUFFICIENT_GOLD')
})

test('bad but processable weaponless body is accepted', () => {
  const submission = {
    action: 'submit_round_plan',
    purchases: [{ partId: 'Body_Square_Small', quantity: 1 }],
    blueprint: {
      name: 'Bad Idea',
      blocks: [
        { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    },
    turnPlan: brakePlan,
  }
  const result = validateRoundSubmission({ gold: 100, inventory: [], submission })

  assert.equal(result.ok, true)
  assert.deepEqual(result.controls, { movement: ['brake'] })
})

test('blueprint validation enforces inventory and connected grid', () => {
  const disconnected = {
    name: 'Disconnected',
    blocks: [
      { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'wing', partId: 'Style_Wings', position: [4, 0, 0], rotation: [0, 0, 0] },
    ],
  }
  const result = validateBlueprintAssembly(disconnected, [
    { partId: 'Body_Square_Small', quantity: 1 },
    { partId: 'Style_Wings', quantity: 1 },
  ])

  assert.equal(result.ok, false)
  assert.ok(result.issues.some((entry) => entry.code === 'DISCONNECTED_BLUEPRINT'))

  const overuse = validateBlueprintAssembly(validSpinnerSubmission.blueprint, [
    { partId: 'Body_Square_Medium', quantity: 1 },
    { partId: 'Wheel_Large', quantity: 1 },
    { partId: 'Weapon_Spinner_Small', quantity: 1 },
  ])

  assert.equal(overuse.ok, false)
  assert.ok(overuse.issues.some((entry) => entry.code === 'INSUFFICIENT_INVENTORY'))
})

test('controls are generated from installed modules', () => {
  const controls = deriveControls(validSpinnerSubmission.blueprint)

  assert.deepEqual(controls.movement, [
    'forward',
    'backward',
    'turn_left',
    'turn_right',
    'brake',
  ])
  assert.deepEqual(controls.weaponA, ['fire', 'hold'])
  assert.equal(controls.weaponB, undefined)
})

test('round submission rejects commands for absent modules', () => {
  const submission = {
    action: 'submit_round_plan',
    purchases: [{ partId: 'Body_Square_Small', quantity: 1 }],
    blueprint: {
      name: 'No Weapon',
      blocks: [
        { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    },
    turnPlan: {
      commands: [
        { tick: 1, move: 'brake', weaponA: 'fire' },
        { tick: 2, move: 'brake' },
        { tick: 3, move: 'brake' },
        { tick: 4, move: 'brake' },
        { tick: 5, move: 'brake' },
      ],
    },
  }
  const result = validateRoundSubmission({ gold: 100, inventory: [], submission })

  assert.equal(result.ok, false)
  assert.ok(result.issues.some((entry) => entry.code === 'WEAPON_A_NOT_AVAILABLE'))
})

test('resolver is deterministic and emits a valid replay timeline', () => {
  const input = {
    round: 1,
    seed: 'deterministic-check',
    red: {
      blueprint: validSpinnerSubmission.blueprint,
      turnPlan: validSpinnerSubmission.turnPlan,
    },
    blue: {
      blueprint: validSpinnerSubmission.blueprint,
      turnPlan: validSpinnerSubmission.turnPlan,
    },
  }
  const first = resolveCombat(input)
  const second = resolveCombat(input)

  assert.deepEqual(first, second)
  assert.equal(validateReplayTimeline(first.replay), true)
  assert.ok(first.replay.events.some((event) => event.type === 'spawn'))
  assert.ok(first.replay.events.some((event) => event.type === 'move'))
})

test('session creation returns role invites without leaking tokens publicly', async () => {
  const session = await createTestSession()
  const response = session.createResponse()
  const publicJson = JSON.stringify(response.publicState)
  const storedJson = JSON.stringify(session.exportState())

  assert.equal(response.sessionId, 's_test')
  assert.equal(response.phase, 'waiting_for_agents')
  assert.equal(response.publicState.expiresAt, '2026-06-03T06:00:00.000Z')
  assert.deepEqual(
    response.invites.map((invite) => invite.claimToken),
    ['claim_red', 'claim_blue'],
  )
  assert.equal(publicJson.includes('claim_red'), false)
  assert.equal(publicJson.includes('claim_blue'), false)
  assert.equal(publicJson.includes('role_red'), false)
  assert.equal(storedJson.includes('claim_red'), false)
  assert.equal(storedJson.includes('claim_blue'), false)
  assert.equal(response.publicState.roles.red.claimed, false)
  assert.equal(response.publicState.roles.blue.submitted, false)
})

test('sessions require both roles before opening plan submission', async () => {
  const session = await createTestSession()
  const red = await session.claimRole({ role: 'red', claimToken: 'claim_red' })

  assert.equal(red.ok, true)
  assert.equal(red.value.state.phase, 'waiting_for_agents')

  const earlySubmission = await session.submitRoundPlan(
    red.value.roleToken,
    validSpinnerSubmission,
  )

  assert.equal(earlySubmission.ok, false)
  assert.equal(earlySubmission.error.code, 'PHASE_CLOSED')

  const blue = await session.claimRole({ role: 'blue', claimToken: 'claim_blue' })

  assert.equal(blue.ok, true)
  assert.equal(blue.value.state.phase, 'submission_phase')
})

test('session rejects invalid role tokens for private state', async () => {
  const session = await createTestSession()
  const state = await session.getRoleStateForToken('role_not_real')

  assert.equal(state.ok, false)
  assert.equal(state.error.code, 'INVALID_TOKEN')
})

test('session marks expired state and rejects private access after ttl', async () => {
  let now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_expires', {
    clock: () => now,
  })

  now = '2026-06-03T06:00:01.000Z'

  const publicState = session.getPublicState()
  const privateState = await session.getRoleStateForToken('role_not_real')

  assert.equal(publicState.phase, 'expired')
  assert.equal(privateState.ok, false)
  assert.equal(privateState.error.code, 'SESSION_EXPIRED')
})

test('session rate limits repeated private state attempts', async () => {
  const session = await createTestSession('s_rate_limit', {
    rateLimits: {
      state: { windowMs: 60_000, max: 2 },
    },
  })

  const first = await session.getRoleStateForToken('role_not_real')
  const second = await session.getRoleStateForToken('role_not_real')
  const third = await session.getRoleStateForToken('role_not_real')

  assert.equal(first.ok, false)
  assert.equal(first.error.code, 'INVALID_TOKEN')
  assert.equal(second.ok, false)
  assert.equal(second.error.code, 'INVALID_TOKEN')
  assert.equal(third.ok, false)
  assert.equal(third.error.code, 'RATE_LIMITED')
})

test('session resolves after both valid plans while keeping public state redacted', async () => {
  const session = await createTestSession()
  const { redToken, blueToken } = await claimBothRoles(session)
  const redSubmission = await session.submitRoundPlan(redToken, validSpinnerSubmission)

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.publicState.phase, 'submission_phase')
  assert.equal(redSubmission.value.publicState.roles.red.submitted, true)
  assert.equal(redSubmission.value.publicState.roles.blue.submitted, false)
  assert.equal(redSubmission.value.publicState.replayAvailable, false)

  const blueSubmission = await session.submitRoundPlan(blueToken, validSpinnerSubmission)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'replay_phase')
  assert.equal(blueSubmission.value.publicState.replayAvailable, true)
  assert.equal(blueSubmission.value.publicState.lastResult.winner, 'draw')

  const replay = session.getReplay()
  assert.equal(replay.ok, true)
  assert.equal(validateReplayTimeline(replay.value), true)

  const publicJson = JSON.stringify(blueSubmission.value.publicState)
  assert.equal(publicJson.includes('claim_red'), false)
  assert.equal(publicJson.includes('role_blue'), false)
  assert.equal(publicJson.includes('Spinner'), false)
  assert.equal(publicJson.includes('Body_Square_Medium'), false)
  assert.equal(publicJson.includes('commands'), false)

  const redState = await session.getRoleStateForToken(redToken)
  assert.equal(redState.ok, true)
  assert.equal(redState.value.ownSubmission.blueprint.name, 'Spinner')
  assert.equal(JSON.stringify(redState.value.opponent).includes('Spinner'), false)

  const duplicate = await session.submitRoundPlan(redToken, validSpinnerSubmission)
  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.error.code, 'ALREADY_SUBMITTED')
})
