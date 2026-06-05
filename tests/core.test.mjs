import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PART_CATALOG,
  applyPurchases,
  deriveControls,
  normalizeTactics,
  validateBlueprintAssembly,
  validateRoundSubmission,
} from '../.test-build/packages/catalog/src/index.js'
import { validateReplayTimeline } from '../.test-build/packages/replay/src/index.js'
import { chooseCommand, deriveBotStats, resolveCombat } from '../.test-build/packages/sim/src/index.js'
import {
  SessionCoordinator,
  calculateInterest,
  generateRefereeAwardOptions,
} from '../.test-build/apps/worker/src/session.js'

const brakePlan = {
  commands: [
    { tick: 1, move: 'brake' },
    { tick: 2, move: 'brake' },
    { tick: 3, move: 'brake' },
    { tick: 4, move: 'brake' },
    { tick: 5, move: 'brake' },
  ],
}

const bareBodyBlueprint = {
  name: 'Bare Core',
  blocks: [
    { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
  ],
}

const partBreakTargetBlueprint = {
  name: 'Breakable Target',
  blocks: [
    { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
    { id: 'flag', partId: 'Style_Flag', position: [0, 1, 0], rotation: [0, 0, 0] },
  ],
}

const partBreakAttackerBlueprint = {
  name: 'Breaker',
  blocks: [
    { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
    { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
    { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
    { id: 'spinner', partId: 'Weapon_Spinner_Large', position: [0, 0, 1], rotation: [0, 0, 0] },
  ],
}

const sparseTurnPlan = { commands: [{ tick: 3, move: 'turn_left' }] }

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

function createPolicyBot(role, blueprint, overrides = {}) {
  const stats = deriveBotStats(blueprint)

  return {
    role,
    stats,
    health: 100,
    maxHealth: 100,
    hasUtilityControl: false,
    hasWeaponControl: blueprint.blocks.some((block) => block.partId.startsWith('Weapon_')),
    position: role === 'red' ? [-0.8, 0, 0] : [0.8, 0, 0],
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity,
    ...overrides,
  }
}

function redMoveEvents(result) {
  return result.replay.events.filter((event) => event.type === 'move' && event.bot === 'red')
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

test('mobility catalog differentiates wheel and tread archetypes mechanically', () => {
  const parts = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const smallWheel = parts.get('Wheel_Small')
  const mediumWheel = parts.get('Wheel_Medium')
  const largeWheel = parts.get('Wheel_Large')
  const tankWheel = parts.get('Wheel_Tank')
  const omniWheel = parts.get('Wheel_Omni')
  const spikedWheel = parts.get('Wheel_Spiked')
  const lightTread = parts.get('Tread_Light')
  const heavyTread = parts.get('Tread_Heavy')

  assert.deepEqual(smallWheel?.size, [1, 1, 1])
  assert.deepEqual(mediumWheel?.size, [1.5, 1, 1])
  assert.deepEqual(largeWheel?.size, [2, 1, 1])
  assert.deepEqual(tankWheel?.size, [2, 1, 1])
  assert.deepEqual(lightTread?.size, [2, 1, 1])
  assert.deepEqual(heavyTread?.size, [2, 2, 1])
  assert.ok((mediumWheel?.mass ?? 0) > (smallWheel?.mass ?? 0))
  assert.ok((largeWheel?.mass ?? 0) > (mediumWheel?.mass ?? 0))
  assert.ok((mediumWheel?.durability ?? 0) > (smallWheel?.durability ?? 0))
  assert.ok((largeWheel?.durability ?? 0) > (mediumWheel?.durability ?? 0))
  assert.ok((mediumWheel?.stats.drive ?? 0) < (smallWheel?.stats.drive ?? 0))
  assert.ok((largeWheel?.stats.drive ?? 0) < (mediumWheel?.stats.drive ?? 0))
  assert.ok((mediumWheel?.stats.traction ?? 0) > (smallWheel?.stats.traction ?? 0))
  assert.ok((largeWheel?.stats.traction ?? 0) > (mediumWheel?.stats.traction ?? 0))
  assert.ok((tankWheel?.stats.traction ?? 0) > (largeWheel?.stats.traction ?? 0))
  assert.ok((tankWheel?.stats.stability ?? 0) > (largeWheel?.stats.stability ?? 0))
  assert.ok((omniWheel?.stats.drive ?? 0) > (largeWheel?.stats.drive ?? 0))
  assert.ok((omniWheel?.durability ?? 0) < (largeWheel?.durability ?? 0))
  assert.ok((spikedWheel?.stats.weapon ?? 0) > 0)
  assert.ok((spikedWheel?.stats.traction ?? 0) > (omniWheel?.stats.traction ?? 0))
  assert.ok((heavyTread?.durability ?? 0) > (lightTread?.durability ?? 0))
  assert.ok((heavyTread?.stats.drive ?? 0) < (lightTread?.stats.drive ?? 0))
})

test('purchase validation rejects unknown parts and overspend', () => {
  const unknown = applyPurchases(100, [], [{ partId: 'Weapon_NukeLaserDragon', quantity: 1 }])
  const overspend = applyPurchases(5, [], [{ partId: 'Weapon_Spinner_Large', quantity: 1 }])
  const exact = applyPurchases(14, [], [{ partId: 'Body_Square_Small', quantity: 1 }])

  assert.equal(unknown.ok, false)
  assert.equal(overspend.ok, false)
  assert.equal(exact.ok, true)
  assert.equal(exact.goldRemaining, 0)
  assert.deepEqual(exact.inventory, [{ partId: 'Body_Square_Small', quantity: 1 }])
  assert.equal(unknown.issues[0].code, 'UNKNOWN_PART')
  assert.equal(overspend.issues[0].code, 'INSUFFICIENT_GOLD')
})

test('blueprint validation catches empty-processable edge cases', () => {
  const noBody = validateBlueprintAssembly(
    {
      name: 'No Core',
      blocks: [{ id: 'style', partId: 'Style_Flag', position: [0, 0, 0], rotation: [0, 0, 0] }],
    },
    [{ partId: 'Style_Flag', quantity: 1 }],
  )
  const duplicatedCell = validateBlueprintAssembly(
    {
      name: 'Stacked',
      blocks: [
        { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
        { id: 'dup', partId: 'Style_Flag', position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    },
    [
      { partId: 'Body_Square_Small', quantity: 1 },
      { partId: 'Style_Flag', quantity: 1 },
    ],
  )

  assert.equal(noBody.ok, false)
  assert.ok(noBody.issues.some((entry) => entry.code === 'MISSING_BODY'))
  assert.equal(duplicatedCell.ok, false)
  assert.ok(
    duplicatedCell.issues.some((entry) => entry.code === 'OCCUPIED_GRID_CELL'),
  )
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
    'dash_forward',
    'dash_backward',
    'strafe_left',
    'strafe_right',
    'circle_left',
    'circle_right',
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

test('legacy round submissions still require exactly five turn plan commands', () => {
  const result = validateRoundSubmission({
    gold: 100,
    inventory: [],
    submission: {
      ...validSpinnerSubmission,
      turnPlan: {
        commands: [{ tick: 1, move: 'forward', weaponA: 'fire' }],
      },
    },
  })

  assert.equal(result.ok, false)
  assert.ok(result.issues.some((entry) => entry.code === 'INVALID_TICK_COUNT'))
})

test('legacy round submissions normalize into v2 combat input', () => {
  const result = validateRoundSubmission({
    gold: 100,
    inventory: [],
    submission: validSpinnerSubmission,
  })

  assert.equal(result.ok, true)
  assert.equal(result.normalizedSubmission.schemaVersion, 2)
  assert.equal(result.normalizedSubmission.openingScript.commands.length, 5)
  assert.equal(result.normalizedSubmission.tactics.movementPolicy, 'hold_ground')
})

test('v2 tactics submissions accept a short opening script', () => {
  const result = validateRoundSubmission({
    gold: 100,
    inventory: [],
    submission: {
      action: 'submit_round_plan',
      schemaVersion: 2,
      purchases: validSpinnerSubmission.purchases,
      blueprint: validSpinnerSubmission.blueprint,
      tactics: {
        style: 'aggressive',
        targetPriority: 'closest',
        preferredRange: 'close',
        movementPolicy: 'close',
        aggression: 0.8,
        retreatAtHealthPct: 0.15,
        weaponCadence: 'sustained',
        hazardPreference: 'avoid',
      },
      openingScript: {
        commands: [
          { tick: 1, move: 'forward', weaponA: 'hold' },
          { tick: 2, move: 'forward', weaponA: 'fire' },
        ],
      },
    },
  })

  assert.equal(result.ok, true)
  assert.equal(result.normalizedSubmission.openingScript.commands.length, 2)
  assert.equal(result.normalizedSubmission.tactics.weaponCadence, 'sustained')
})

test('v2 tactics errors use path-specific issue locations', () => {
  const result = validateRoundSubmission({
    gold: 100,
    inventory: [],
    submission: {
      action: 'submit_round_plan',
      schemaVersion: 2,
      purchases: validSpinnerSubmission.purchases,
      blueprint: validSpinnerSubmission.blueprint,
      tactics: {
        movementPolicy: 'teleport',
        aggression: 1.4,
      },
      openingScript: { commands: [] },
    },
  })

  assert.equal(result.ok, false)
  assert.ok(
    result.issues.some(
      (entry) =>
        entry.code === 'INVALID_MOVEMENT_POLICY' &&
        entry.path === 'submission.tactics.movementPolicy',
    ),
  )
  assert.ok(
    result.issues.some(
      (entry) =>
        entry.code === 'INVALID_AGGRESSION' &&
        entry.path === 'submission.tactics.aggression',
    ),
  )
})

test('v2 movement policy legality follows available mobility controls', () => {
  const holdGround = validateRoundSubmission({
    gold: 100,
    inventory: [],
    submission: {
      action: 'submit_round_plan',
      schemaVersion: 2,
      purchases: [{ partId: 'Body_Square_Small', quantity: 1 }],
      blueprint: bareBodyBlueprint,
      tactics: { movementPolicy: 'hold_ground' },
    },
  })
  const closeWithoutMobility = validateRoundSubmission({
    gold: 100,
    inventory: [],
    submission: {
      action: 'submit_round_plan',
      schemaVersion: 2,
      purchases: [{ partId: 'Body_Square_Small', quantity: 1 }],
      blueprint: bareBodyBlueprint,
      tactics: { movementPolicy: 'close' },
    },
  })

  assert.equal(holdGround.ok, true)
  assert.equal(closeWithoutMobility.ok, false)
  assert.ok(
    closeWithoutMobility.issues.some(
      (entry) =>
        entry.code === 'MOVEMENT_POLICY_NOT_AVAILABLE' &&
        entry.path === 'submission.tactics.movementPolicy',
    ),
  )
})

test('policy commands diverge for the same bot state with different movement tactics', () => {
  const bot = createPolicyBot('red', validSpinnerSubmission.blueprint)
  const opponent = createPolicyBot('blue', bareBodyBlueprint)
  const state = {
    bot,
    opponent,
    arena: { name: 'Policy Test', width: 24, height: 16, activeHazards: [] },
  }
  const openingScript = { commands: [] }
  const commandFor = (movementPolicy) =>
    chooseCommand(
      {
        tactics: normalizeTactics({
          movementPolicy,
          preferredRange: movementPolicy === 'kite' ? 'long' : 'close',
          aggression: 0.82,
          weaponCadence: 'sustained',
        }),
        openingScript,
      },
      8,
      state,
    )

  assert.equal(commandFor('hold_ground').move, 'brake')
  assert.ok(['forward', 'dash_forward'].includes(commandFor('close').move))
  assert.ok(['backward', 'dash_backward', 'turn_left', 'turn_right'].includes(commandFor('kite').move))
  assert.ok(['circle_left', 'circle_right'].includes(commandFor('circle').move))
})

test('opening script overrides early movement while policy fills missing command fields', () => {
  const bot = createPolicyBot('red', validSpinnerSubmission.blueprint)
  const opponent = createPolicyBot('blue', bareBodyBlueprint)
  const state = {
    bot,
    opponent,
    arena: { name: 'Policy Test', width: 24, height: 16, activeHazards: [] },
  }
  const policy = {
    tactics: normalizeTactics({
      movementPolicy: 'close',
      preferredRange: 'contact',
      aggression: 0.9,
      weaponCadence: 'sustained',
    }),
    openingScript: { commands: [{ tick: 1, move: 'brake' }] },
  }

  const scripted = chooseCommand(policy, 1, state)
  const unscripted = chooseCommand(policy, 6, state)

  assert.equal(scripted.move, 'brake')
  assert.equal(scripted.weaponA, 'fire')
  assert.ok(['forward', 'dash_forward'].includes(unscripted.move))
})

test('policy brakes instead of immediately reversing contradictory movement', () => {
  const bot = createPolicyBot('red', validSpinnerSubmission.blueprint, {
    position: [-0.5, 0, 0.2],
    lastMove: 'forward',
  })
  const opponent = createPolicyBot('blue', bareBodyBlueprint, { position: [0.5, 0, 0] })
  const command = chooseCommand(
    {
      tactics: normalizeTactics({
        movementPolicy: 'kite',
        preferredRange: 'long',
        weaponCadence: 'sustained',
      }),
      openingScript: { commands: [] },
    },
    7,
    {
      bot,
      opponent,
      arena: { name: 'Policy Test', width: 24, height: 16, activeHazards: [] },
    },
  )

  assert.equal(command.move, 'brake')
})

test('resolver applies movement tactics to replay movement for the same blueprint', () => {
  const baseRed = {
    blueprint: validSpinnerSubmission.blueprint,
    openingScript: { commands: [] },
  }
  const staticBlue = {
    blueprint: bareBodyBlueprint,
    tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    openingScript: { commands: [] },
  }
  const closeResult = resolveCombat({
    round: 2,
    seed: 'policy-close-check',
    red: {
      ...baseRed,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
      }),
    },
    blue: staticBlue,
  })
  const holdResult = resolveCombat({
    round: 2,
    seed: 'policy-close-check',
    red: {
      ...baseRed,
      tactics: normalizeTactics({
        movementPolicy: 'hold_ground',
        aggression: 0.1,
      }),
    },
    blue: staticBlue,
  })

  assert.ok(redMoveEvents(closeResult).some((event) => event.to[0] > event.from[0]))
  assert.equal(redMoveEvents(holdResult).length, 0)
})

test('resolver is deterministic and emits a valid replay timeline', () => {
  const input = {
    round: 1,
    seed: 'deterministic-check',
    red: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
      openingScript: validSpinnerSubmission.turnPlan,
    },
    blue: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
      openingScript: validSpinnerSubmission.turnPlan,
    },
  }
  const first = resolveCombat(input)
  const second = resolveCombat(input)

  assert.deepEqual(first, second)
  assert.equal(validateReplayTimeline(first.replay), true)
  assert.ok(first.replay.events.some((event) => event.type === 'spawn'))
  assert.ok(first.replay.events.some((event) => event.type === 'move'))
  assert.ok(first.replay.events.some((event) => event.type === 'impact'))
  assert.ok(first.replay.events.some((event) => event.type === 'impact' && event.t > 5))
  assert.ok(first.replay.events.some((event) => event.type === 'damage'))
  assert.ok(first.replay.duration > 6)
  assert.ok(first.damage.red > 0)
  assert.ok(first.damage.blue > 0)
})

test('resolver emits a block-tied detach event when a part reaches zero HP', () => {
  const result = resolveCombat({
    round: 1,
    seed: 'part-break-check',
    red: {
      blueprint: partBreakAttackerBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
      openingScript: { commands: [] },
    },
    blue: {
      blueprint: partBreakTargetBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
      openingScript: { commands: [] },
    },
  })
  const detach = result.replay.events.find(
    (event) => event.type === 'part_detach' && event.bot === 'blue' && event.blockId === 'flag',
  )

  assert.ok(detach)
  assert.equal(detach.partId, 'Style_Flag')
  assert.equal(result.partHealth.blue[detach.blockId], 0)

  const breakDamage = result.replay.events.find(
    (event) =>
      event.type === 'damage' &&
      event.bot === detach.bot &&
      event.blockId === detach.blockId &&
      event.partRemainingHealth === 0,
  )

  assert.ok(breakDamage)
  assert.equal(breakDamage.partId, detach.partId)
  assert.ok(breakDamage.remainingHealth > 0)
})

test('resolver knockout occurs only after all parts on the losing bot are depleted', () => {
  const result = resolveCombat({
    round: 1,
    seed: 'all-parts-depleted-check',
    red: {
      blueprint: partBreakAttackerBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
      openingScript: { commands: [] },
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
      openingScript: { commands: [] },
    },
  })
  const knockout = result.replay.events.find((event) => event.type === 'knockout')

  assert.ok(knockout)
  assert.equal(knockout.bot, 'blue')
  assert.equal(result.remainingHealth.blue, 0)
  assert.equal(Object.values(result.partHealth.blue).every((health) => health === 0), true)
})

test('resolver handles sparse plans deterministically and keeps replay timeline bounded/ordered', () => {
  const input = {
    round: 3,
    seed: 'sparse-plan',
    red: {
      blueprint: bareBodyBlueprint,
      openingScript: sparseTurnPlan,
    },
    blue: {
      blueprint: bareBodyBlueprint,
      openingScript: { commands: [] },
    },
  }
  const first = resolveCombat(input)
  const second = resolveCombat(input)

  assert.deepEqual(first, second)
  assert.equal(validateReplayTimeline(first.replay), true)
  assert.equal(
    first.replay.events.every(
      (event) => event.t >= 0 && event.t <= first.replay.duration,
    ),
    true,
  )
  assert.equal(
    first.replay.events.every(
      (event, index, events) => index === 0 || events[index - 1].t <= event.t,
    ),
    true,
  )
  assert.equal(first.winner, 'draw')
  assert.equal(first.damage.red, 0)
  assert.equal(first.damage.blue, 0)
  assert.equal(first.replay.duration, 60)
  assert.equal(first.reason, 'No bot took damage for a full minute; the round ended as a draw.')
  assert.equal(first.log[0].startsWith('Round 3'), true)
})

test('resolver gives explicit kite policy range-preserving weapon movement', () => {
  const fastSkirmisherBlueprint = {
    name: 'Blue Runner',
    blocks: [
      { id: 'core', partId: 'Body_Light_Frame', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'frontLeft', partId: 'Wheel_Omni', position: [-1, 0, 1], rotation: [0, 0, 90] },
      { id: 'frontRight', partId: 'Wheel_Omni', position: [1, 0, 1], rotation: [0, 0, 90] },
      { id: 'rearLeft', partId: 'Wheel_Omni', position: [-1, 0, -1], rotation: [0, 0, 90] },
      { id: 'rearRight', partId: 'Wheel_Omni', position: [1, 0, -1], rotation: [0, 0, 90] },
      { id: 'net', partId: 'Weapon_Net', position: [0, 0, 2], rotation: [0, 0, 0] },
      { id: 'booster', partId: 'Utility_Booster', position: [0, 0, -2], rotation: [0, 0, 0] },
    ],
  }
  const heavyBruiserBlueprint = {
    name: 'Red Bruiser',
    blocks: [
      { id: 'core', partId: 'Body_Heavy_Block', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'leftTread', partId: 'Tread_Heavy', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'rightTread', partId: 'Tread_Heavy', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'ram', partId: 'Weapon_Ram', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const result = resolveCombat({
    round: 2,
    seed: 'run-and-gun-check',
    red: {
      blueprint: heavyBruiserBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.85,
        weaponCadence: 'sustained',
      }),
      openingScript: { commands: [] },
    },
    blue: {
      blueprint: fastSkirmisherBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'kite',
        preferredRange: 'close',
        aggression: 0.55,
        weaponCadence: 'sustained',
      }),
      openingScript: { commands: [] },
    },
  })
  const blueMoves = result.replay.events.filter(
    (event) => event.type === 'move' && event.bot === 'blue' && event.t > 5,
  )
  const blueWeaponFire = result.replay.events.filter(
    (event) => event.type === 'weapon_fire' && event.bot === 'blue' && event.t > 5,
  )

  assert.ok(blueMoves.length > 0)
  assert.ok(blueMoves.some((event) => Math.abs(event.to[2] - event.from[2]) > 0.5))
  assert.ok(blueWeaponFire.length > 0)
  assert.ok(result.damage.red > 0)
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
  assert.equal(response.refereeToken, 'referee_referee')
  assert.equal(publicJson.includes('claim_red'), false)
  assert.equal(publicJson.includes('claim_blue'), false)
  assert.equal(publicJson.includes('referee_referee'), false)
  assert.equal(publicJson.includes('role_red'), false)
  assert.equal(storedJson.includes('claim_red'), false)
  assert.equal(storedJson.includes('claim_blue'), false)
  assert.equal(storedJson.includes('referee_referee'), false)
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

test('agent bootstrap uses the invite claim token as a reusable player key', async () => {
  const session = await createTestSession()
  const badBootstrap = await session.bootstrapRole('red', 'claim_not_real', {})

  assert.equal(badBootstrap.ok, false)
  assert.equal(badBootstrap.error.code, 'INVALID_TOKEN')

  const bootstrap = await session.bootstrapRole('red', 'claim_red', {
    agentName: 'external-red',
  })

  assert.equal(bootstrap.ok, true)
  assert.equal(bootstrap.value.claimedNow, true)
  assert.equal(bootstrap.value.role, 'red')
  assert.equal(bootstrap.value.state.role, 'red')
  assert.equal(bootstrap.value.state.phase, 'waiting_for_agents')
  assert.equal(bootstrap.value.nextAction, 'wait_for_opponent_claim')

  const resume = await session.bootstrapRole('red', 'claim_red', {})

  assert.equal(resume.ok, true)
  assert.equal(resume.value.claimedNow, false)
  assert.equal(resume.value.state.role, 'red')

  const duplicate = await session.bootstrapRole('red', 'claim_blue', {})

  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.error.code, 'ROLE_ALREADY_CLAIMED')

  const privateState = await session.getRoleStateForToken('claim_red')

  assert.equal(privateState.ok, true)
  assert.equal(privateState.value.role, 'red')

  const blue = await session.bootstrapRole('blue', 'claim_blue', {})

  assert.equal(blue.ok, true)
  assert.equal(blue.value.state.phase, 'submission_phase')
  assert.equal(blue.value.nextAction, 'submit_round_plan')
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

test('agents can publish public chat and reflection messages', async () => {
  const session = await createTestSession('s_chat')
  const { redToken } = await claimBothRoles(session)
  const chat = await session.submitChatMessage(redToken, {
    kind: 'reflection',
    message: '  Last round favored armor; next build should preserve control.  ',
  })

  assert.equal(chat.ok, true)
  assert.equal(chat.value.message.role, 'red')
  assert.equal(chat.value.message.kind, 'reflection')
  assert.equal(chat.value.message.message, 'Last round favored armor; next build should preserve control.')
  assert.equal(chat.value.publicState.chatLog.length, 1)
  assert.deepEqual(chat.value.state.chatLog, chat.value.publicState.chatLog)

  const invalid = await session.submitChatMessage(redToken, {
    kind: 'private_monologue',
    message: 'bad kind',
  })

  assert.equal(invalid.ok, false)
  assert.equal(invalid.error.code, 'INVALID_REQUEST')
  assert.equal(invalid.error.issues[0].code, 'INVALID_CHAT_KIND')
})

test('private chat is scoped to the bearer role and hidden from public state', async () => {
  const session = await createTestSession('s_private_chat')
  const { redToken, blueToken } = await claimBothRoles(session)
  const beforeVersion = session.getPublicState().stateVersion
  const noteText = 'Prefer flanks next round; the front armor plan trades poorly.'
  const note = await session.submitPrivateChatMessage(redToken, {
    kind: 'strategy',
    message: `  ${noteText}  `,
  })

  assert.equal(note.ok, true)
  assert.equal(note.value.message.role, 'red')
  assert.equal(note.value.message.kind, 'strategy')
  assert.equal(note.value.message.message, noteText)
  assert.equal(note.value.state.privateChatLog.length, 1)
  assert.equal(note.value.state.privateChatLog[0].message, noteText)

  const redState = await session.getRoleStateForToken(redToken)
  const blueState = await session.getRoleStateForToken(blueToken)
  const publicState = session.getPublicState()

  assert.equal(redState.ok, true)
  assert.equal(blueState.ok, true)
  assert.equal(redState.value.privateChatLog[0].message, noteText)
  assert.equal(blueState.value.privateChatLog.length, 0)
  assert.equal(publicState.stateVersion, beforeVersion)
  assert.equal(JSON.stringify(publicState).includes(noteText), false)
  assert.equal(JSON.stringify(blueState.value).includes(noteText), false)

  const invalidToken = await session.submitPrivateChatMessage('role_not_real', {
    message: 'nope',
  })

  assert.equal(invalidToken.ok, false)
  assert.equal(invalidToken.error.code, 'INVALID_TOKEN')
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
  const redSubmission = await session.submitRoundPlan(redToken, {
    ...validSpinnerSubmission,
    chat: [
      {
        kind: 'strategy',
        message: 'Opening with direct pressure; next round should adapt from replay damage.',
      },
    ],
  })

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.publicState.phase, 'submission_phase')
  assert.equal(redSubmission.value.publicState.roles.red.submitted, true)
  assert.equal(redSubmission.value.publicState.roles.blue.submitted, false)
  assert.equal(redSubmission.value.publicState.replayAvailable, false)
  assert.equal(redSubmission.value.publicState.chatLog[0].kind, 'strategy')

  const preReplay = session.getReplay()

  assert.equal(preReplay.ok, false)
  assert.equal(preReplay.error.code, 'REPLAY_NOT_AVAILABLE')

  const blueSubmission = await session.submitRoundPlan(blueToken, validSpinnerSubmission)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'referee_awards')
  assert.equal(blueSubmission.value.publicState.replayAvailable, true)
  assert.equal(blueSubmission.value.publicState.lastResult.winner, 'draw')
  assert.equal(blueSubmission.value.publicState.awardOptions.length, 3)
  assert.ok(blueSubmission.value.publicState.chatLog.length >= 3)
  assert.ok(blueSubmission.value.publicState.chatLog.some((message) => message.kind === 'taunt'))

  const replay = session.getReplay()

  assert.equal(replay.ok, true)
  assert.equal(replay.value.botBlueprints.red.name, 'Spinner')
  assert.equal(replay.value.botBlueprints.blue.name, 'Spinner')
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

test('session accepts v2 tactics without a legacy turnPlan', async () => {
  const session = await createTestSession('s_v2_submission')
  const { redToken, blueToken } = await claimBothRoles(session)
  const v2Submission = {
    action: 'submit_round_plan',
    schemaVersion: 2,
    purchases: validSpinnerSubmission.purchases,
    blueprint: validSpinnerSubmission.blueprint,
    tactics: {
      movementPolicy: 'close',
      preferredRange: 'close',
      aggression: 0.75,
      weaponCadence: 'opportunistic',
    },
    openingScript: {
      commands: [
        { tick: 1, move: 'forward', weaponA: 'hold' },
        { tick: 2, move: 'forward', weaponA: 'fire' },
      ],
    },
  }

  const redSubmission = await session.submitRoundPlan(redToken, v2Submission)

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.state.ownSubmission.schemaVersion, 2)
  assert.equal('turnPlan' in redSubmission.value.state.ownSubmission, false)
  assert.equal(redSubmission.value.state.ownSubmission.openingScript.commands.length, 2)

  const blueSubmission = await session.submitRoundPlan(blueToken, v2Submission)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'referee_awards')
  assert.equal(blueSubmission.value.publicState.replayAvailable, true)
  assert.equal(validateReplayTimeline(session.getReplay().value), true)
})

test('referee can reset a claimed role and refresh claim capability before combat resolves', async () => {
  const issued = []
  const session = await SessionCoordinator.create(
    { sessionId: 's_reset_role', seed: 'test-seed' },
    {
      clock: () => '2026-06-03T00:00:00.000Z',
      tokenFactory: (owner, kind) => {
        const token = `${kind}_${owner}_${issued.length + 1}`

        issued.push(token)

        return token
      },
    },
  )
  const createResponse = session.createResponse()
  const refereeToken = createResponse.refereeToken
  const redInvite = createResponse.invites.find((invite) => invite.role === 'red')
  const blueInvite = createResponse.invites.find((invite) => invite.role === 'blue')

  assert.notEqual(redInvite, undefined)
  assert.notEqual(blueInvite, undefined)

  const redClaim = await session.claimRole({
    role: 'red',
    claimToken: redInvite.claimToken,
    agentName: 'stuck-red',
  })
  const blueClaim = await session.claimRole({
    role: 'blue',
    claimToken: blueInvite.claimToken,
    agentName: 'blue',
  })

  assert.equal(redClaim.ok, true)
  assert.equal(blueClaim.ok, true)

  const redToken = redClaim.value.roleToken
  await session.submitPrivateChatMessage(redToken, {
    kind: 'strategy',
    message: 'Keep this note tied to the first red claimant only.',
  })
  const redSubmission = await session.submitRoundPlan(redToken, validSpinnerSubmission)

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.state.gold, 26)
  assert.equal(redSubmission.value.publicState.roles.red.submitted, true)

  const reset = await session.resetRole(refereeToken, { role: 'red' })

  assert.equal(reset.ok, true)
  assert.equal(reset.value.invite.role, 'red')
  assert.notEqual(reset.value.invite.claimToken, redInvite.claimToken)
  assert.equal(reset.value.publicState.phase, 'waiting_for_agents')
  assert.equal(reset.value.publicState.roles.red.claimed, false)
  assert.equal(reset.value.publicState.roles.red.submitted, false)
  assert.equal(reset.value.publicState.roles.blue.claimed, true)

  const oldTokenState = await session.getRoleStateForToken(redToken)
  const oldInviteClaim = await session.claimRole({
    role: 'red',
    claimToken: redInvite.claimToken,
  })

  assert.equal(oldTokenState.ok, false)
  assert.equal(oldTokenState.error.code, 'INVALID_TOKEN')
  assert.equal(oldInviteClaim.ok, false)
  assert.equal(oldInviteClaim.error.code, 'INVALID_TOKEN')

  const replacementClaim = await session.claimRole({
    role: 'red',
    claimToken: reset.value.invite.claimToken,
    agentName: 'replacement-red',
  })

  assert.equal(replacementClaim.ok, true)
  assert.equal(replacementClaim.value.state.phase, 'submission_phase')
  assert.equal(replacementClaim.value.state.gold, 100)
  assert.deepEqual(replacementClaim.value.state.inventory, [])
  assert.deepEqual(replacementClaim.value.state.privateChatLog, [])
})

test('referee role reset cannot rewrite a resolved round', async () => {
  const session = await createTestSession('s_reset_closed')
  const refereeToken = session.createResponse().refereeToken
  const { redToken, blueToken } = await claimBothRoles(session)

  await session.submitRoundPlan(redToken, validSpinnerSubmission)
  await session.submitRoundPlan(blueToken, validSpinnerSubmission)

  const reset = await session.resetRole(refereeToken, { role: 'red' })

  assert.equal(reset.ok, false)
  assert.equal(reset.error.code, 'PHASE_CLOSED')
})

test('referee award options and interest are deterministic bounded economy rules', () => {
  const first = generateRefereeAwardOptions('s_test:test-seed', 2)
  const second = generateRefereeAwardOptions('s_test:test-seed', 2)
  const nextRound = generateRefereeAwardOptions('s_test:test-seed', 3)

  assert.equal(first.length, 3)
  assert.equal(new Set(first.map((award) => award.id)).size, 3)
  assert.deepEqual(first, second)
  assert.notDeepEqual(first, nextRound)
  assert.equal(calculateInterest(68), 6)
  assert.equal(calculateInterest(260), 25)
})

test('referee awards validate selections and apply future economy to the next round', async () => {
  const session = await createTestSession('s_awards')
  const refereeToken = session.createResponse().refereeToken
  const { redToken, blueToken } = await claimBothRoles(session)

  await session.submitRoundPlan(redToken, validSpinnerSubmission)
  const blueSubmission = await session.submitRoundPlan(blueToken, validSpinnerSubmission)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'referee_awards')

  const awardOptions = blueSubmission.value.publicState.awardOptions
  const redBefore = await session.getRoleStateForToken(redToken)
  const blueBefore = await session.getRoleStateForToken(blueToken)

  assert.equal(redBefore.ok, true)
  assert.equal(blueBefore.ok, true)

  const duplicateTeam = await session.submitRefereeAwards(refereeToken, {
    awards: [
      { awardId: awardOptions[0].id, targetTeam: 'red' },
      { awardId: awardOptions[1].id, targetTeam: 'red' },
    ],
  })

  assert.equal(duplicateTeam.ok, false)
  assert.equal(duplicateTeam.error.code, 'SUBMISSION_INVALID')
  assert.ok(
    duplicateTeam.error.issues.some(
      (issue) => issue.code === 'TOO_MANY_AWARDS_FOR_TEAM',
    ),
  )

  const awards = await session.submitRefereeAwards(refereeToken, {
    awards: [
      { awardId: awardOptions[0].id, targetTeam: 'red' },
      { awardId: awardOptions[1].id, targetTeam: 'blue' },
    ],
  })

  assert.equal(awards.ok, true)
  assert.equal(awards.value.appliedAwards.length, 2)
  assert.equal(awards.value.publicState.phase, 'submission_phase')
  assert.equal(awards.value.publicState.round, 2)
  assert.equal(awards.value.publicState.roles.red.submitted, false)
  assert.equal(awards.value.publicState.roles.blue.submitted, false)
  assert.equal(awards.value.publicState.awardOptions, undefined)

  const redAfter = await session.getRoleStateForToken(redToken)
  const blueAfter = await session.getRoleStateForToken(blueToken)

  assert.equal(redAfter.ok, true)
  assert.equal(blueAfter.ok, true)
  assert.equal(
    redAfter.value.gold,
    redBefore.value.gold +
      50 +
      calculateInterest(redBefore.value.gold) +
      awardOptions[0].gold,
  )
  assert.equal(
    blueAfter.value.gold,
    blueBefore.value.gold +
      50 +
      calculateInterest(blueBefore.value.gold) +
      awardOptions[1].gold,
  )
  assert.equal(redAfter.value.submitted, false)
  assert.equal(blueAfter.value.submitted, false)
  assert.equal(redAfter.value.awardHistory.length, 2)
})

test('session completes on max rounds and win streak target', async () => {
  const maxRoundSession = await SessionCoordinator.create(
    { sessionId: 's_max_rounds', seed: 'test-seed', maxRounds: 1 },
    {
      clock: () => '2026-06-03T00:00:00.000Z',
      tokenFactory: (role, kind) => `${kind}_${role}`,
    },
  )
  const maxRoundRefereeToken = maxRoundSession.createResponse().refereeToken
  const maxRoundTokens = await claimBothRoles(maxRoundSession)

  await maxRoundSession.submitRoundPlan(maxRoundTokens.redToken, validSpinnerSubmission)
  await maxRoundSession.submitRoundPlan(maxRoundTokens.blueToken, validSpinnerSubmission)

  const maxRoundAwards = await maxRoundSession.submitRefereeAwards(
    maxRoundRefereeToken,
    { awards: [] },
  )

  assert.equal(maxRoundAwards.ok, true)
  assert.equal(maxRoundAwards.value.publicState.phase, 'session_complete')
  assert.equal(maxRoundAwards.value.publicState.round, 1)

  const streakSession = await createTestSession('s_streak')
  const streakRefereeToken = streakSession.createResponse().refereeToken
  const stored = streakSession.exportState()

  stored.phase = 'referee_awards'
  stored.round = 3
  stored.roles.red.claimedAt = '2026-06-03T00:00:00.000Z'
  stored.roles.blue.claimedAt = '2026-06-03T00:00:00.000Z'
  stored.roles.red.wins = 2
  stored.roles.red.winStreak = 2
  stored.roles.blue.losses = 2
  stored.lastResult = {
    winner: 'red',
    reason: 'Red disabled Blue.',
    damage: { red: 10, blue: 50 },
    remainingHealth: { red: 40, blue: 0 },
  }
  stored.awardOptions = generateRefereeAwardOptions(
    `${stored.id}:${stored.seed}`,
    stored.round,
  )

  const loaded = SessionCoordinator.fromState(stored, {
    clock: () => '2026-06-03T00:00:00.000Z',
  })
  const streakAwards = await loaded.submitRefereeAwards(streakRefereeToken, {
    awards: [],
  })

  assert.equal(streakAwards.ok, true)
  assert.equal(streakAwards.value.publicState.phase, 'session_complete')
  assert.equal(streakAwards.value.publicState.roles.red.wins, 3)
  assert.equal(streakAwards.value.publicState.roles.red.winStreak, 3)
})
