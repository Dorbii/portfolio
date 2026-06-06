import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PART_CATALOG,
  AGENT_FEATURE_GATES,
  applyPurchases,
  createAgentCatalogGuidance,
  deriveControls,
  normalizeTactics,
  validateBlueprintAssembly,
  validateRoundSubmission,
  validateSubmittedTurnCommand,
} from '../.test-build/packages/catalog/src/index.js'
import { validateReplayTimeline } from '../.test-build/packages/replay/src/index.js'
import {
  PART_BEHAVIORS,
  PART_BEHAVIOR_IDS,
  activeHazardTypes,
  chooseCommand,
  compileArenaTopology,
  compareDamageTargets,
  createBotRuntimeIndex,
  deriveBotStats,
  damageCategoryPriorityFor,
  findFirstAliveBehaviorPart,
  getAliveBehaviorParts,
  hasArenaLineOfSight,
  hasAliveBehaviorPart,
  hazardsAtPosition,
  pathHazards,
  resolveCombat,
  resolveSubmittedCombat,
  stablePartOrder,
  worldToArenaCell,
} from '../.test-build/packages/sim/src/index.js'
import {
  SessionCoordinator,
  calculateInterest,
} from '../.test-build/apps/worker/src/session.js'

const bareBodyBlueprint = {
  name: 'Bare Core',
  blocks: [
    { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
  ],
}

const fastMobileBlueprint = {
  name: 'Fast Mobile',
  blocks: [
    { id: 'core', partId: 'Body_Light_Frame', position: [0, 0, 0], rotation: [0, 0, 0] },
    { id: 'frontLeft', partId: 'Wheel_Omni', position: [-1, 0, 1], rotation: [0, 0, 90] },
    { id: 'frontRight', partId: 'Wheel_Omni', position: [1, 0, 1], rotation: [0, 0, 90] },
    { id: 'rearLeft', partId: 'Wheel_Omni', position: [-1, 0, -1], rotation: [0, 0, 90] },
    { id: 'rearRight', partId: 'Wheel_Omni', position: [1, 0, -1], rotation: [0, 0, 90] },
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

const dualWeaponBlueprint = {
  name: 'Dual Slot Bot',
  blocks: [
    { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
    { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
    { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
    { id: 'spinner', partId: 'Weapon_Spinner_Small', position: [0, 0, 1], rotation: [0, 0, 0] },
    { id: 'saw', partId: 'Weapon_Saw', position: [0, 0, -1], rotation: [0, 0, 0] },
  ],
}

const validSpinnerSubmission = {
  action: 'submit_round_plan',
  schemaVersion: 2,
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
  tactics: {
    movementPolicy: 'close',
    preferredRange: 'close',
    aggression: 0.75,
    weaponCadence: 'opportunistic',
  },
}

const testTeamIdentities = {
  red: {
    name: 'Red Team',
    primaryColor: '#ff4c5d',
    logo: { mark: 'shield', initials: 'R' },
  },
  blue: {
    name: 'Blue Team',
    primaryColor: '#5b9dff',
    logo: { mark: 'shield', initials: 'B' },
  },
}

function testTeamIdentity(role, suffix = '') {
  return {
    ...testTeamIdentities[role],
    name: `${testTeamIdentities[role].name}${suffix}`,
    logo: { ...testTeamIdentities[role].logo },
  }
}

function claimRequest(role, claimToken = `claim_${role}`, suffix = '') {
  return {
    role,
    claimToken,
    teamIdentity: testTeamIdentity(role, suffix),
  }
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

function moveEvents(result, bot) {
  return result.replay.events.filter((event) => event.type === 'move' && event.bot === bot)
}

function movementDelta(event) {
  return Math.hypot(event.to[0] - event.from[0], event.to[2] - event.from[2])
}

function repeatedCommands(ticks, commandForTick) {
  return Array.from({ length: ticks }, (_, index) => {
    const tick = index + 1
    const fields =
      typeof commandForTick === 'function' ? commandForTick(tick) : commandForTick

    return { tick, ...fields }
  })
}

async function claimBothRoles(session) {
  const red = await session.claimRole(claimRequest('red'))
  const blue = await session.claimRole(claimRequest('blue'))

  assert.equal(red.ok, true)
  assert.equal(blue.ok, true)

  return {
    redToken: red.value.roleToken,
    blueToken: blue.value.roleToken,
  }
}

async function resolveLiveCombat(session, redToken, blueToken, firstState) {
  let state = firstState

  for (let index = 0; index < 90; index += 1) {
    const tick = state.combat.tick
    const command = {
      action: 'submit_turn_command',
      tick,
      move: 'dash_forward',
      weaponA: 'fire',
    }
    const redTurn = await session.submitTurnCommand(redToken, command)
    const blueTurn = await session.submitTurnCommand(blueToken, command)

    assert.equal(redTurn.ok, true)
    assert.equal(blueTurn.ok, true)

    if (blueTurn.value.publicState.phase === 'round_review') {
      return blueTurn
    }

    assert.equal(blueTurn.value.publicState.phase, 'combat_turn')
    state = blueTurn.value.state
  }

  throw new Error('Combat did not resolve within expected live turn budget.')
}

test('catalog exposes unique MVP part ids', () => {
  const ids = PART_CATALOG.map((part) => part.id)

  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('Body_Square_Small'))
  assert.ok(ids.includes('Weapon_Net'))
  assert.ok(ids.includes('Weapon_Drill'))
  assert.ok(ids.includes('Weapon_Flail'))
  assert.ok(ids.includes('Wheel_Mecanum'))
  assert.ok(ids.includes('Utility_AIModule'))
  assert.ok(ids.includes('Utility_EnergyCore'))
  assert.ok(ids.includes('Style_LightBar'))
  assert.ok(ids.includes('Style_TrashCan'))
})

test('agent catalog guidance routes through feature gates instead of part flags', () => {
  const guidance = createAgentCatalogGuidance(PART_CATALOG)
  const gates = new Map(AGENT_FEATURE_GATES.map((gate) => [gate.id, gate]))
  const parts = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const behaviorIds = new Set(
    PART_CATALOG
      .map((part) => part.behavior?.id)
      .filter((behaviorId) => behaviorId !== undefined),
  )

  assert.equal(guidance.featureGates, AGENT_FEATURE_GATES)
  assert.ok(guidance.trustOrder[0].includes('session rules'))
  assert.equal(gates.get('agent.plan_context')?.state, 'enabled')

  for (const behaviorId of behaviorIds) {
    assert.ok(gates.has(`combat.behavior.${behaviorId}`), `missing behavior gate ${behaviorId}`)
  }

  for (const capability of guidance.capabilities) {
    assert.ok(capability.candidateParts.length > 0, `${capability.id} has no candidates`)
    assert.ok(capability.excludedCandidates.length > 0, `${capability.id} has no exclusions`)

    for (const candidate of capability.candidateParts) {
      const part = parts.get(candidate.partId)

      assert.ok(part, `${capability.id} recommends unknown part ${candidate.partId}`)
      assert.equal('state' in part, false)
      assert.equal('simBacked' in part, false)

      for (const gateId of candidate.featureGateIds) {
        const gate = gates.get(gateId)

        assert.ok(gate, `${candidate.partId} references unknown gate ${gateId}`)
        assert.notEqual(gate.state, 'disabled')
        assert.notEqual(gate.state, 'deprecated')
      }
    }
  }
})

test('agent catalog guidance excludes disabled feature-gated candidates', () => {
  const featureGates = AGENT_FEATURE_GATES.map((gate) =>
    gate.id === 'combat.movement_commands'
      ? { ...gate, state: 'disabled' }
      : gate,
  )
  const guidance = createAgentCatalogGuidance(PART_CATALOG, { featureGates })
  const movementCapability = guidance.capabilities.find(
    (capability) => capability.id === 'movement_escape',
  )

  assert.ok(movementCapability)
  assert.equal(movementCapability.candidateParts.length, 0)
  assert.ok(
    movementCapability.excludedCandidates.some((candidate) =>
      candidate.reasons.some((reason) => reason.includes('feature gate disabled')),
    ),
  )
})

test('catalog exposes required source-owned part behavior metadata', () => {
  const requiredBehaviorIds = [
    'anchor',
    'booster',
    'drone_controller',
    'flipper',
    'front_plate',
    'grabber',
    'gyro',
    'magnet',
    'net',
    'ram',
    'reactive_armor',
    'repair_kit',
    'saw',
    'sensor',
    'smoke',
    'spiked_armor',
    'spinner',
    'turret',
    'wedge',
  ]
  const expectedBehaviorIds = [...PART_BEHAVIOR_IDS].sort()
  const partsWithBehavior = PART_CATALOG.filter((part) => part.behavior)
  const catalogBehaviorIds = [
    ...new Set(partsWithBehavior.map((part) => part.behavior.id)),
  ].sort()
  const droneController = PART_CATALOG.find(
    (part) => part.id === 'Utility_DroneController',
  )

  assert.deepEqual(expectedBehaviorIds, requiredBehaviorIds)
  assert.deepEqual(catalogBehaviorIds, expectedBehaviorIds)
  assert.ok(partsWithBehavior.every((part) => part.behavior.slot === part.category))
  assert.equal(droneController?.category, 'utility')
  assert.equal(droneController?.displayName, 'Drone Controller')
  assert.equal(droneController?.cost, 28)
  assert.equal(droneController?.mass, 6)
  assert.equal(droneController?.durability, 12)
  assert.deepEqual(droneController?.size, [1, 1, 1])
  assert.deepEqual(droneController?.controls, { utility: true })
  assert.deepEqual(droneController?.stats, { control: 6, chaos: 2 })
  assert.deepEqual(droneController?.behavior, {
    id: 'drone_controller',
    slot: 'utility',
  })
})

test('mobility catalog differentiates wheel and tread archetypes mechanically', () => {
  const parts = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const smallWheel = parts.get('Wheel_Small')
  const mediumWheel = parts.get('Wheel_Medium')
  const largeWheel = parts.get('Wheel_Large')
  const tankWheel = parts.get('Wheel_Tank')
  const mecanumWheel = parts.get('Wheel_Mecanum')
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
  assert.equal(mecanumWheel?.controls?.movement, true)
  assert.ok((mecanumWheel?.stats.control ?? 0) > (omniWheel?.stats.control ?? 0))
  assert.ok((mecanumWheel?.durability ?? 0) < (mediumWheel?.durability ?? 0))
  assert.ok((spikedWheel?.stats.weapon ?? 0) > 0)
  assert.ok((spikedWheel?.stats.traction ?? 0) > (omniWheel?.stats.traction ?? 0))
  assert.ok((heavyTread?.durability ?? 0) > (lightTread?.durability ?? 0))
  assert.ok((heavyTread?.stats.drive ?? 0) < (lightTread?.stats.drive ?? 0))
})

test('expanded reference-backed catalog parts preserve behavior and economy contracts', () => {
  const parts = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const saw = parts.get('Weapon_Saw')
  const drill = parts.get('Weapon_Drill')
  const flail = parts.get('Weapon_Flail')
  const aiModule = parts.get('Utility_AIModule')
  const energyCore = parts.get('Utility_EnergyCore')
  const battery = parts.get('Utility_Battery')
  const lightBar = parts.get('Style_LightBar')

  assert.deepEqual(drill?.behavior, PART_BEHAVIORS.saw)
  assert.deepEqual(flail?.behavior, PART_BEHAVIORS.spinner)
  assert.deepEqual(aiModule?.behavior, PART_BEHAVIORS.sensor)
  assert.equal(drill?.controls?.weapon, true)
  assert.equal(flail?.controls?.weapon, true)
  assert.equal(aiModule?.controls?.utility, true)
  assert.equal(energyCore?.controls, undefined)
  assert.equal(battery?.controls, undefined)
  assert.ok((drill?.cost ?? 0) > (saw?.cost ?? 0))
  assert.ok((flail?.stats.chaos ?? 0) >= 5)
  assert.ok((energyCore?.stats.stability ?? 0) > 0)
  assert.ok((battery?.mass ?? 0) >= 5)
  assert.equal(lightBar?.category, 'style')
  assert.ok((lightBar?.stats.style ?? 0) >= 4)
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
    schemaVersion: 2,
    tactics: { movementPolicy: 'hold_ground' },
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
  const dualControls = deriveControls(dualWeaponBlueprint)

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
  assert.deepEqual(dualControls.weaponA, ['fire', 'hold'])
  assert.deepEqual(dualControls.weaponB, ['fire', 'hold'])
})

test('live turn command validation rejects commands for absent modules', () => {
  const result = validateSubmittedTurnCommand({
    controls: deriveControls(bareBodyBlueprint),
    command: { tick: 1, move: 'brake', weaponA: 'fire' },
  })

  assert.equal(result.ok, false)
  assert.ok(result.issues.some((entry) => entry.code === 'WEAPON_A_NOT_AVAILABLE'))
})

test('legacy turnPlan round submissions are rejected', () => {
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
  assert.ok(result.issues.some((entry) => entry.code === 'LEGACY_TURN_PLAN_REMOVED'))
})

test('v2 round submissions normalize into combat input', () => {
  const result = validateRoundSubmission({
    gold: 100,
    inventory: [],
    submission: validSpinnerSubmission,
  })

  assert.equal(result.ok, true)
  assert.equal(result.normalizedSubmission.schemaVersion, 2)
  assert.equal('openingScript' in result.normalizedSubmission, false)
  assert.equal(result.normalizedSubmission.tactics.movementPolicy, 'close')
})

test('v2 hold-ground tactics stay legal for immobile submissions', () => {
  const result = validateRoundSubmission({
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

  assert.equal(result.ok, true)
  assert.equal(result.normalizedSubmission.tactics.movementPolicy, 'hold_ground')
})

test('v2 tactics submissions reject removed opening scripts', () => {
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

  assert.equal(result.ok, false)
  assert.ok(result.issues.some((entry) => entry.code === 'OPENING_SCRIPT_REMOVED'))
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
  const commandFor = (movementPolicy) =>
    chooseCommand(
      {
        tactics: normalizeTactics({
          movementPolicy,
          preferredRange: movementPolicy === 'kite' ? 'long' : 'close',
          aggression: 0.82,
          weaponCadence: 'sustained',
        }),
      },
      8,
      state,
    )

  assert.equal(commandFor('hold_ground').move, 'brake')
  assert.ok(['forward', 'dash_forward'].includes(commandFor('close').move))
  assert.ok(['backward', 'dash_backward', 'turn_left', 'turn_right'].includes(commandFor('kite').move))
  assert.ok(['circle_left', 'circle_right'].includes(commandFor('circle').move))
})

test('catalog exposes visual descriptors for renderer dispatch and material language', () => {
  assert.equal(
    PART_CATALOG.every((part) =>
      Boolean(
        part.visual?.visualFamily &&
        part.visual.materialRole &&
        part.visual.mountRole &&
        part.visual.detailBudget,
      ),
    ),
    true,
  )

  const visualFamilyFor = (partId) =>
    PART_CATALOG.find((part) => part.id === partId)?.visual.visualFamily

  assert.equal(visualFamilyFor('Weapon_Spinner_Small'), 'spinner')
  assert.equal(visualFamilyFor('Weapon_Saw'), 'saw')
  assert.equal(visualFamilyFor('Weapon_Drill'), 'drill')
  assert.equal(visualFamilyFor('Weapon_Flail'), 'flail')
  assert.equal(visualFamilyFor('Weapon_Turret'), 'turret')
  assert.equal(visualFamilyFor('Wheel_Mecanum'), 'wheel')
  assert.equal(visualFamilyFor('Wheel_Omni'), 'wheel')
  assert.equal(visualFamilyFor('Utility_EnergyCore'), 'battery')
  assert.equal(visualFamilyFor('Utility_AIModule'), 'sensor')
  assert.equal(visualFamilyFor('Style_LightBar'), 'light_bar')
  assert.equal(visualFamilyFor('Tread_Heavy'), 'tread')
})

test('damage target ordering centralizes cause category, health, and stable tie-break rules', () => {
  const parts = [
    { blockId: 'weapon-low', category: 'weapon', health: 1 },
    { blockId: 'defense-high', category: 'defense', health: 9 },
    { blockId: 'mobility-low', category: 'mobility', health: 1 },
    { blockId: 'utility-low', category: 'utility', health: 1 },
  ]
  const orderedFor = (cause) =>
    [...parts].sort((left, right) => compareDamageTargets(left, right, cause, 4))

  assert.deepEqual(damageCategoryPriorityFor('ram').slice(0, 2), ['defense', 'mobility'])
  assert.equal(orderedFor('ram')[0].blockId, 'defense-high')
  assert.equal(orderedFor('hazard')[0].blockId, 'mobility-low')
  assert.equal(orderedFor('drone')[0].blockId, 'utility-low')
  assert.equal(orderedFor('weapon')[0].blockId, 'defense-high')

  const sameCategory = [
    { blockId: 'armor-high', category: 'defense', health: 8 },
    { blockId: 'armor-low', category: 'defense', health: 3 },
  ]

  assert.equal(
    [...sameCategory].sort((left, right) => compareDamageTargets(left, right, 'weapon', 4))[0].blockId,
    'armor-low',
  )

  const left = { blockId: 'alpha', category: 'defense', health: 5 }
  const right = { blockId: 'beta', category: 'defense', health: 5 }
  const expectedTieBreak = stablePartOrder(left.blockId, 4) - stablePartOrder(right.blockId, 4)

  assert.equal(compareDamageTargets(left, right, 'weapon', 4), expectedTieBreak)
})

test('runtime part index matches direct scans after live health and state bookkeeping changes', () => {
  const parts = [
    {
      blockId: 'spinner',
      category: 'weapon',
      hasUtilityControl: false,
      hasWeaponControl: true,
      behaviorId: 'spinner',
      behaviorSlot: 'weapon',
      health: 10,
    },
    {
      blockId: 'booster',
      category: 'utility',
      hasUtilityControl: true,
      hasWeaponControl: false,
      behaviorId: 'booster',
      behaviorSlot: 'utility',
      health: 8,
    },
    {
      blockId: 'dead-wheel',
      category: 'mobility',
      hasUtilityControl: false,
      hasWeaponControl: false,
      behaviorId: 'omni_drive',
      behaviorSlot: 'mobility',
      health: 0,
    },
  ]
  const assertIndexMatchesScan = () => {
    const index = createBotRuntimeIndex(parts)
    const alive = parts.filter((part) => part.health > 0)

    assert.deepEqual([...index.partsByBlockId.keys()], parts.map((part) => part.blockId))
    assert.deepEqual(index.aliveParts.map((part) => part.blockId), alive.map((part) => part.blockId))
    assert.deepEqual(
      index.weaponControlParts.map((part) => part.blockId),
      alive.filter((part) => part.hasWeaponControl).map((part) => part.blockId),
    )
    assert.deepEqual(
      index.utilityControlParts.map((part) => part.blockId),
      alive.filter((part) => part.hasUtilityControl).map((part) => part.blockId),
    )
    assert.deepEqual(
      getAliveBehaviorParts(index, 'utility', ['booster']).map((part) => part.blockId),
      alive.filter((part) => part.behaviorSlot === 'utility' && part.behaviorId === 'booster').map((part) => part.blockId),
    )
    assert.equal(
      hasAliveBehaviorPart(index, 'spinner'),
      alive.some((part) => part.behaviorId === 'spinner'),
    )
    assert.equal(
      findFirstAliveBehaviorPart(index, ['spinner'])?.blockId,
      alive.find((part) => part.behaviorId === 'spinner')?.blockId,
    )
  }

  assertIndexMatchesScan()

  parts[0].health = 0
  assertIndexMatchesScan()

  parts[0].health = 4
  assertIndexMatchesScan()

  const cooldowns = { 'spinner:spinner': 2 }
  const statuses = [{ id: 'slowed', sourceKey: 'booster:booster' }]

  cooldowns['spinner:spinner'] -= 1
  statuses[0].sourceKey = 'booster:booster'
  assertIndexMatchesScan()
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

test('policy avoids projected center saw instead of walking mobile bot into spinner hazard', () => {
  const bot = createPolicyBot('red', fastMobileBlueprint, {
    position: [-1.65, 0, 0],
  })
  const opponent = createPolicyBot('blue', validSpinnerSubmission.blueprint, {
    position: [1.55, 0, 0],
    anchoredStance: true,
    contactDanger: 1.35,
    controlDanger: 0.35,
  })
  const command = chooseCommand(
    {
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.65,
        hazardPreference: 'avoid',
      }),
    },
    8,
    {
      bot,
      opponent,
      arena: { name: 'Policy Hazard Test', width: 24, height: 16, activeHazards: ['floor_saw'] },
    },
  )

  assert.notEqual(command.move, 'forward')
  assert.notEqual(command.move, 'dash_forward')
  assert.ok(['turn_left', 'turn_right', 'backward', 'dash_backward', 'brake'].includes(command.move))
})

test('arena topology compiles active hazard labels into grid threat packets', () => {
  const topology = compileArenaTopology({
    name: 'Active Hazard Topology Test',
    width: 24,
    height: 16,
    activeHazards: ['floor_saw', 'corner flippers', 'blue magnet'],
  })

  assert.deepEqual(activeHazardTypes(topology), [
    'blue_magnet',
    'corner_flippers',
    'floor_saw',
  ])
  assert.deepEqual(worldToArenaCell(topology, [6, 0, 0]), { x: 6, z: 0 })
  assert.equal(hazardsAtPosition(topology, [0, 0, 0])[0].type, 'floor_saw')
  assert.equal(hazardsAtPosition(topology, [24 * 0.2, 0, 0])[0].type, 'blue_magnet')
  assert.ok(
    pathHazards(topology, [-1.5, 0, 0], [1.5, 0, 0]).some(
      (hazard) => hazard.type === 'floor_saw',
    ),
  )
})

test('arena topology supports custom modular hazard placement and blockers', () => {
  const topology = compileArenaTopology({
    name: 'Modular Topology Test',
    width: 24,
    height: 16,
    activeHazards: ['crusher_lane'],
    topology: {
      grid: { cellSize: 0.5 },
      spawnZones: [],
      hazards: [
        {
          id: 'crusher_lane',
          type: 'crusher_lane',
          shape: { kind: 'rect', center: [3, 2], size: [2, 1] },
          damage: 4,
        },
      ],
      terrain: [],
      obstacles: [
        {
          id: 'center_barrier',
          type: 'barrier',
          shape: { kind: 'rect', center: [0, 0], size: [0.5, 4] },
          blocksMovement: true,
        },
      ],
    },
  })

  assert.deepEqual(worldToArenaCell(topology, [3, 0, 2]), { x: 6, z: 4 })
  assert.equal(hazardsAtPosition(topology, [3, 0, 2])[0].id, 'crusher_lane')
  assert.equal(hasArenaLineOfSight(topology, [-1, 0, 0], [1, 0, 0]), false)
  assert.equal(hasArenaLineOfSight(topology, [-1, 0, 3], [1, 0, 3]), true)
})

test('resolver applies non-damaging arena trap effects instead of rendering them as inert props', () => {
  const result = resolveCombat({
    round: 1,
    seed: 'blue-magnet-hazard-check',
    red: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: { name: 'Trap Test', width: 24, height: 16, activeHazards: ['blue magnet'] },
  })
  const magnetEvent = result.replay.events.find(
    (event) => event.type === 'hazard' && event.hazard === 'blue_magnet' && event.bot === 'blue',
  )
  const forcedBlueMove = result.replay.events.find(
    (event) => event.type === 'move' && event.bot === 'blue' && event.intent === 'forced',
  )

  assert.ok(magnetEvent)
  assert.equal(magnetEvent.damage, 0)
  assert.ok(forcedBlueMove)
  assert.ok(forcedBlueMove.to[0] < forcedBlueMove.from[0])
})

test('resolver applies movement tactics to replay movement for the same blueprint', () => {
  const baseRed = {
    blueprint: validSpinnerSubmission.blueprint,
  }
  const staticBlue = {
    blueprint: bareBodyBlueprint,
    tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
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

test('resolver emits semantic movement metadata for actual move events', () => {
  const result = resolveCombat({
    round: 1,
    seed: 'move-metadata-check',
    red: {
      blueprint: fastMobileBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'close' }),
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: { name: 'Move Metadata Test', width: 24, height: 16, activeHazards: [] },
  })
  const firstMove = redMoveEvents(result)[0]

  assert.ok(firstMove)
  assert.equal(firstMove.command, 'dash_forward')
  assert.equal(firstMove.intent, 'advance')
  assert.equal(firstMove.easing, 'ease_out')
  assert.equal(firstMove.contactIntent, true)
  assert.ok(firstMove.duration > 0)
  assert.ok(firstMove.duration <= 1)
  assert.deepEqual(firstMove.facing, [1, 0, 0])
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
    },
    blue: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
    },
    arena: { name: 'Deterministic Impact Test', width: 24, height: 16, activeHazards: [] },
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

test('resolver emits independent weaponA and weaponB fire from two weapon slots', () => {
  const result = resolveCombat({
    round: 1,
    seed: 'dual-weapon-slot-check',
    red: {
      blueprint: dualWeaponBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: { name: 'Slot Test', width: 24, height: 16, activeHazards: [] },
  })
  const redWeaponFire = result.replay.events.filter(
    (event) => event.type === 'weapon_fire' && event.bot === 'red',
  )
  const slotsByTick = new Map()

  for (const event of redWeaponFire) {
    const tick = Math.trunc(event.t)
    const slots = slotsByTick.get(tick) ?? new Set()

    slots.add(event.weaponSlot)
    slotsByTick.set(tick, slots)
  }

  assert.ok(redWeaponFire.some((event) => event.weaponSlot === 'weaponB'))
  assert.ok(
    redWeaponFire.some(
      (event) =>
        event.weaponSlot === 'weaponA' &&
        event.sourceBlockId === 'spinner' &&
        event.sourcePartId === 'Weapon_Spinner_Small',
    ),
  )
  assert.ok(
    redWeaponFire.some(
      (event) =>
        event.weaponSlot === 'weaponB' &&
        event.sourceBlockId === 'saw' &&
        event.sourcePartId === 'Weapon_Saw',
    ),
  )
  assert.ok(redWeaponFire.every((event) => event.phase === 'release'))
  assert.ok(redWeaponFire.every((event) => typeof event.style === 'string' && event.style.length > 0))
  assert.ok(redWeaponFire.every((event) => Array.isArray(event.targetPosition)))
  assert.ok(
    [...slotsByTick.values()].some(
      (slots) => slots.has('weaponA') && slots.has('weaponB'),
    ),
  )
  assert.ok(result.damage.blue > 0)
})

test('resolver ignores weaponB fire commands when only one weapon slot exists', () => {
  const result = resolveCombat({
    round: 1,
    seed: 'absent-weapon-b-check',
    red: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'hold_ground',
        weaponCadence: 'hold_fire',
      }),
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: { name: 'Slot Test', width: 24, height: 16, activeHazards: [] },
  })

  assert.equal(
    result.replay.events.some(
      (event) =>
        event.type === 'weapon_fire' &&
        event.bot === 'red' &&
        event.weaponSlot === 'weaponB',
    ),
    false,
  )
})

test('resolver applies net status to slow movement on later ticks', () => {
  const netControlBlueprint = {
    name: 'Net Control',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'net', partId: 'Weapon_Net', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const runnerBlueprint = {
    name: 'Runner',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
    ],
  }
  const result = resolveCombat({
    round: 1,
    seed: 'net-slow-check',
    red: {
      blueprint: netControlBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'close', weaponCadence: 'sustained' }),
    },
    blue: {
      blueprint: runnerBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'close' }),
    },
    arena: { name: 'Status Test', width: 24, height: 16, activeHazards: [] },
  })
  const firstNetHit = result.replay.events.find(
    (event) => event.type === 'damage' && event.bot === 'blue',
  )

  assert.ok(firstNetHit)

  const hitTick = Math.trunc(firstNetHit.t)
  const blueMoves = new Map(moveEvents(result, 'blue').map((event) => [event.t, event]))
  const beforeSlow = blueMoves.get(hitTick)
  const afterSlow = blueMoves.get(hitTick + 1)

  assert.ok(beforeSlow)
  assert.ok(afterSlow)
  assert.ok(movementDelta(afterSlow) < movementDelta(beforeSlow) * 0.7)
})

test('resolver gates booster burst with a runtime-part cooldown', () => {
  const boosterBlueprint = {
    name: 'Burst Runner',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'booster', partId: 'Utility_Booster', position: [0, 0, -1], rotation: [0, 0, 0] },
    ],
  }
  const result = resolveCombat({
    round: 1,
    seed: 'booster-cooldown-check',
    red: {
      blueprint: boosterBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'close' }),
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: { name: 'Cooldown Test', width: 24, height: 16, activeHazards: [] },
  })
  const deltas = new Map(redMoveEvents(result).map((event) => [event.t, movementDelta(event)]))

  assert.ok(deltas.get(1) > deltas.get(2) * 1.25)
  assert.ok(deltas.get(5) > deltas.get(4) * 1.25)
  assert.ok(Math.abs(deltas.get(2) - deltas.get(3)) < 0.001)
  assert.ok(Math.abs(deltas.get(3) - deltas.get(4)) < 0.001)
})

test('resolver limits repair kit to one runtime-part charge', () => {
  const repairBlueprint = {
    name: 'Repair Target',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'repair', partId: 'Utility_RepairKit', position: [0, 0, -1], rotation: [0, 0, 0] },
    ],
  }
  const resolution = resolveSubmittedCombat({
    round: 1,
    seed: 'repair-submitted-charge-check',
    red: {
      blueprint: repairBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    blue: {
      blueprint: partBreakAttackerBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
    },
    arena: { name: 'Repair Test', width: 24, height: 16, activeHazards: [] },
  }, {
    red: repeatedCommands(12, { move: 'brake', utility: 'activate' }),
    blue: repeatedCommands(12, { move: 'dash_forward', weaponA: 'fire' }),
  })

  assert.equal(resolution.status, 'active')
  assert.equal(resolution.snapshot.red.charges['repair:repair_kit'], 0)
  assert.ok(resolution.snapshot.red.cooldowns['repair:repair_kit'] > 0)
  assert.ok(resolution.snapshot.red.health > 17)
})

test('resolver limits drone controller with charges and cooldown', () => {
  const droneBlueprint = {
    name: 'Drone Team',
    blocks: [
      { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'drone', partId: 'Utility_DroneController', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const result = resolveCombat({
    round: 1,
    seed: 'drone-charge-cooldown-check',
    red: {
      blueprint: droneBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: { name: 'Drone Test', width: 24, height: 16, activeHazards: [] },
  })
  const droneTicks = result.replay.events
    .filter((event) => event.type === 'ability' && event.bot === 'red')
    .map((event) => Math.trunc(event.t))

  assert.deepEqual(droneTicks, [1, 5])
})

test('resolver stops destroyed utility behavior before later utility resolution', () => {
  const droneBlueprint = {
    name: 'Fragile Drone Team',
    blocks: [
      { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'drone', partId: 'Utility_DroneController', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const result = resolveCombat({
    round: 1,
    seed: 'destroyed-utility-check',
    red: {
      blueprint: droneBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    blue: {
      blueprint: droneBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: { name: 'Destroyed Utility Test', width: 24, height: 16, activeHazards: [] },
  })
  const blueDroneDetach = result.replay.events.find(
    (event) => event.type === 'part_detach' && event.bot === 'blue' && event.blockId === 'drone',
  )
  const blueDroneAbilities = result.replay.events.filter(
    (event) => event.type === 'ability' && event.bot === 'blue',
  )

  assert.ok(blueDroneDetach)
  assert.equal(blueDroneAbilities.length, 0)
})

test('resolver keeps status and cooldown ordering deterministic', () => {
  const mixedRuntimeBlueprint = {
    name: 'Mixed Runtime Bot',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'net', partId: 'Weapon_Net', position: [0, 0, 1], rotation: [0, 0, 0] },
      { id: 'booster', partId: 'Utility_Booster', position: [0, 0, -1], rotation: [0, 0, 0] },
    ],
  }
  const input = {
    round: 2,
    seed: 'status-cooldown-ordering-check',
    red: {
      blueprint: mixedRuntimeBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.85,
        weaponCadence: 'sustained',
      }),
    },
    blue: {
      blueprint: mixedRuntimeBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.85,
        weaponCadence: 'sustained',
      }),
    },
    arena: { name: 'Ordering Test', width: 24, height: 16, activeHazards: [] },
  }
  const first = resolveCombat(input)
  const second = resolveCombat(input)

  assert.deepEqual(first, second)
  assert.equal(validateReplayTimeline(first.replay), true)
  assert.equal(
    first.replay.events.every(
      (event, index, events) => index === 0 || events[index - 1].t <= event.t,
    ),
    true,
  )
})

test('resolver gives stationary spinner a part-backed contact threat without chasing', () => {
  const stationarySpinnerBlueprint = {
    name: 'Stationary Spinner',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Tank', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Tank', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'spinner', partId: 'Weapon_Spinner_Large', position: [0, 0, 1], rotation: [0, 0, 0] },
      { id: 'gyro', partId: 'Utility_Gyro', position: [-1, 0, -1], rotation: [0, 0, 0] },
      { id: 'anchor', partId: 'Utility_Anchor', position: [1, 0, -1], rotation: [0, 0, 0] },
      { id: 'spikes', partId: 'Armor_Spiked', position: [0, 1, 0], rotation: [0, 0, 0] },
    ],
  }
  const withoutSpinnerBlueprint = {
    ...stationarySpinnerBlueprint,
    name: 'Stationary Hammer',
    blocks: stationarySpinnerBlueprint.blocks.map((block) =>
      block.id === 'spinner' ? { ...block, partId: 'Weapon_Hammer' } : block,
    ),
  }
  const brawlerBlueprint = {
    name: 'Closing Brawler',
    blocks: [
      { id: 'core', partId: 'Body_Wedge', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Tank', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Tank', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'ram', partId: 'Weapon_Ram', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const fight = (blueprint) => resolveCombat({
    round: 1,
    seed: 'stationary-spinner-archetype-check',
    red: {
      blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'hold_ground',
        preferredRange: 'contact',
        aggression: 0.85,
        weaponCadence: 'sustained',
      }),
    },
    blue: {
      blueprint: brawlerBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
    },
    arena: { name: 'Spinner Test', width: 24, height: 16, activeHazards: [] },
  })
  const spinnerResult = fight(stationarySpinnerBlueprint)
  const withoutSpinnerResult = fight(withoutSpinnerBlueprint)

  assert.equal(redMoveEvents(spinnerResult).length, 0)
  assert.ok(spinnerResult.damage.red < withoutSpinnerResult.damage.red)
  assert.ok(spinnerResult.replay.duration < withoutSpinnerResult.replay.duration)
})

test('resolver lets turret kiters fire while moving and lose that behavior without turret', () => {
  const turretKiterBlueprint = {
    name: 'Turret Kiter',
    blocks: [
      { id: 'core', partId: 'Body_Light_Frame', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'frontLeft', partId: 'Wheel_Omni', position: [-1, 0, 1], rotation: [0, 0, 90] },
      { id: 'frontRight', partId: 'Wheel_Omni', position: [1, 0, 1], rotation: [0, 0, 90] },
      { id: 'rearLeft', partId: 'Wheel_Omni', position: [-1, 0, -1], rotation: [0, 0, 90] },
      { id: 'rearRight', partId: 'Wheel_Omni', position: [1, 0, -1], rotation: [0, 0, 90] },
      { id: 'turret', partId: 'Weapon_Turret', position: [0, 0, 2], rotation: [0, 0, 0] },
      { id: 'sensor', partId: 'Utility_Sensor', position: [0, 1, 0], rotation: [0, 0, 0] },
    ],
  }
  const withoutTurretBlueprint = {
    ...turretKiterBlueprint,
    name: 'Sensor Runner',
    blocks: turretKiterBlueprint.blocks.filter((block) => block.id !== 'turret'),
  }
  const bruiserBlueprint = {
    name: 'Mobile Bruiser',
    blocks: [
      { id: 'core', partId: 'Body_Wedge', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'ram', partId: 'Weapon_Ram', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const fight = (blueprint) => resolveCombat({
    round: 1,
    seed: 'turret-kiter-archetype-check',
    red: {
      blueprint: bruiserBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
    },
    blue: {
      blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'kite',
        preferredRange: 'long',
        aggression: 0.55,
        weaponCadence: 'sustained',
      }),
    },
    arena: { name: 'Turret Test', width: 24, height: 16, activeHazards: [] },
  })
  const turretResult = fight(turretKiterBlueprint)
  const withoutTurretResult = fight(withoutTurretBlueprint)
  const blueMoveTicks = new Set(moveEvents(turretResult, 'blue').map((event) => Math.trunc(event.t)))
  const blueFire = turretResult.replay.events.filter(
    (event) => event.type === 'weapon_fire' && event.bot === 'blue',
  )

  assert.ok(blueFire.some((event) => blueMoveTicks.has(Math.trunc(event.t))))
  assert.equal(
    withoutTurretResult.replay.events.some(
      (event) => event.type === 'weapon_fire' && event.bot === 'blue',
    ),
    false,
  )
  assert.ok(turretResult.damage.red > withoutTurretResult.damage.red)
})

test('resolver gives net control forced movement and slow effects from live control parts', () => {
  const jailerBlueprint = {
    name: 'Net Jailer',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'net', partId: 'Weapon_Net', position: [0, 0, 1], rotation: [0, 0, 0] },
      { id: 'grabber', partId: 'Weapon_Grabber', position: [0, 0, -1], rotation: [0, 0, 0] },
      { id: 'magnet', partId: 'Utility_Magnet', position: [-1, 0, -1], rotation: [0, 0, 0] },
      { id: 'anchor', partId: 'Utility_Anchor', position: [1, 0, -1], rotation: [0, 0, 0] },
    ],
  }
  const runnerBlueprint = {
    name: 'Runner',
    blocks: [
      { id: 'core', partId: 'Body_Light_Frame', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
    ],
  }
  const result = resolveCombat({
    round: 1,
    seed: 'net-jailer-archetype-check',
    red: {
      blueprint: jailerBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'close',
        aggression: 0.6,
        weaponCadence: 'sustained',
      }),
    },
    blue: {
      blueprint: runnerBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'close' }),
    },
    arena: { name: 'Jailer Test', width: 24, height: 16, activeHazards: [] },
  })
  const forcedBlueMoves = moveEvents(result, 'blue').filter((event) => event.t % 1 !== 0)

  assert.ok(
    result.replay.events.some(
      (event) => event.type === 'weapon_fire' && event.bot === 'red' && event.controlCue === 'deploy',
    ),
  )
  assert.ok(forcedBlueMoves.some((event) => event.to[0] < event.from[0]))
})

test('resolver lets booster hazard bait lure a heavier bot into active hazards', () => {
  const hazardBaitBlueprint = {
    name: 'Hazard Bait',
    blocks: [
      { id: 'core', partId: 'Body_Light_Frame', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'frontLeft', partId: 'Wheel_Omni', position: [-1, 0, 1], rotation: [0, 0, 90] },
      { id: 'frontRight', partId: 'Wheel_Omni', position: [1, 0, 1], rotation: [0, 0, 90] },
      { id: 'rearLeft', partId: 'Wheel_Omni', position: [-1, 0, -1], rotation: [0, 0, 90] },
      { id: 'rearRight', partId: 'Wheel_Omni', position: [1, 0, -1], rotation: [0, 0, 90] },
      { id: 'booster', partId: 'Utility_Booster', position: [0, 0, -1], rotation: [0, 0, 0] },
      { id: 'smoke', partId: 'Utility_Smoke', position: [0, 1, 0], rotation: [0, 0, 0] },
    ],
  }
  const withoutBaitUtilityBlueprint = {
    ...hazardBaitBlueprint,
    name: 'Plain Fast Runner',
    blocks: hazardBaitBlueprint.blocks.filter(
      (block) => block.id !== 'booster' && block.id !== 'smoke',
    ),
  }
  const mobileBruiserBlueprint = {
    name: 'Mobile Hazard Target',
    blocks: [
      { id: 'core', partId: 'Body_Wedge', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'ram', partId: 'Weapon_Ram', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const fight = (blueprint) => resolveCombat({
    round: 1,
    seed: 'hazard-bait-archetype-check',
    red: {
      blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'bait_hazard',
        preferredRange: 'close',
        aggression: 0.35,
        hazardPreference: 'bait',
      }),
    },
    blue: {
      blueprint: mobileBruiserBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
    },
    arena: { name: 'Hazard Test', width: 24, height: 16, activeHazards: ['floor_saw'] },
  })
  const baitResult = fight(hazardBaitBlueprint)
  const withoutBaitUtilityResult = fight(withoutBaitUtilityBlueprint)
  const blueHazards = baitResult.replay.events.filter(
    (event) => event.type === 'hazard' && event.bot === 'blue',
  )
  const redHazards = baitResult.replay.events.filter(
    (event) => event.type === 'hazard' && event.bot === 'red',
  )
  const redHazardsWithoutUtility = withoutBaitUtilityResult.replay.events.filter(
    (event) => event.type === 'hazard' && event.bot === 'red',
  )

  assert.ok(blueHazards.length > 0)
  assert.equal(redHazards.length, 0)
  assert.ok(redHazardsWithoutUtility.length > 0)
  assert.ok(baitResult.damage.blue > withoutBaitUtilityResult.damage.blue)
})

test('resolver gives wedge flipper bully extra contact damage and disruption', () => {
  const wedgeBullyBlueprint = {
    name: 'Wedge Flipper Bully',
    blocks: [
      { id: 'core', partId: 'Body_Wedge', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Tank', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Tank', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'flipper', partId: 'Weapon_Flipper', position: [0, 0, 1], rotation: [0, 0, 0] },
      { id: 'ram', partId: 'Weapon_Ram', position: [0, 0, -1], rotation: [0, 0, 0] },
      { id: 'frontPlate', partId: 'Armor_Front_Plate', position: [0, 1, 1], rotation: [0, 0, 0] },
    ],
  }
  const plainChargerBlueprint = {
    name: 'Plain Charger',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Tank', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Tank', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'hammer', partId: 'Weapon_Hammer', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const targetBlueprint = {
    name: 'Contact Target',
    blocks: [
      { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
    ],
  }
  const fight = (blueprint) => resolveCombat({
    round: 1,
    seed: 'wedge-bully-archetype-check',
    red: {
      blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
    },
    blue: {
      blueprint: targetBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'close', preferredRange: 'contact' }),
    },
    arena: { name: 'Bully Test', width: 24, height: 16, activeHazards: [] },
  })
  const bullyResult = fight(wedgeBullyBlueprint)
  const plainResult = fight(plainChargerBlueprint)

  assert.ok(bullyResult.damage.red < plainResult.damage.red)
  assert.ok(bullyResult.replay.duration < plainResult.replay.duration)
})

test('resolver makes porcupine shell punish contact through armor and anchor parts', () => {
  const porcupineBlueprint = {
    name: 'Porcupine Shell',
    blocks: [
      { id: 'core', partId: 'Body_Heavy_Block', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Tank', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Tank', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'ram', partId: 'Weapon_Ram', position: [0, 0, 1], rotation: [0, 0, 0] },
      { id: 'spikes', partId: 'Armor_Spiked', position: [-1, 1, 0], rotation: [0, 0, 0] },
      { id: 'reactive', partId: 'Armor_Reactive', position: [1, 1, 0], rotation: [0, 0, 0] },
      { id: 'anchor', partId: 'Utility_Anchor', position: [0, 0, -1], rotation: [0, 0, 0] },
    ],
  }
  const plainShellBlueprint = {
    ...porcupineBlueprint,
    name: 'Plain Shell',
    blocks: porcupineBlueprint.blocks.map((block) => {
      if (block.id === 'spikes' || block.id === 'reactive') {
        return { ...block, partId: 'Armor_Heavy' }
      }

      return block
    }),
  }
  const brawlerBlueprint = {
    name: 'Shell Tester',
    blocks: [
      { id: 'core', partId: 'Body_Wedge', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'left', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
      { id: 'right', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
      { id: 'ram', partId: 'Weapon_Ram', position: [0, 0, 1], rotation: [0, 0, 0] },
    ],
  }
  const fight = (blueprint) => resolveCombat({
    round: 1,
    seed: 'porcupine-archetype-check',
    red: {
      blueprint,
      tactics: normalizeTactics({
        movementPolicy: 'hold_ground',
        preferredRange: 'contact',
        aggression: 0.3,
        weaponCadence: 'sustained',
      }),
    },
    blue: {
      blueprint: brawlerBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.9,
        weaponCadence: 'sustained',
      }),
    },
    arena: { name: 'Porcupine Test', width: 24, height: 16, activeHazards: [] },
  })
  const porcupineResult = fight(porcupineBlueprint)
  const plainShellResult = fight(plainShellBlueprint)

  assert.equal(redMoveEvents(porcupineResult).length, 0)
  assert.ok(porcupineResult.damage.red < plainShellResult.damage.red)
  assert.ok(porcupineResult.replay.duration < plainShellResult.replay.duration)
})

test('resolver models commander drone as charged ability pressure, not mini-bot entities', () => {
  const commanderDroneBlueprint = {
    name: 'Commander Drone',
    blocks: [
      { id: 'core', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'drone', partId: 'Utility_DroneController', position: [0, 0, 1], rotation: [0, 0, 0] },
      { id: 'sensor', partId: 'Utility_Sensor', position: [0, 1, 0], rotation: [0, 0, 0] },
      { id: 'anchor', partId: 'Utility_Anchor', position: [0, 0, -1], rotation: [0, 0, 0] },
      { id: 'cage', partId: 'Armor_Cage', position: [0, 1, -1], rotation: [0, 0, 0] },
    ],
  }
  const withoutDroneBlueprint = {
    ...commanderDroneBlueprint,
    name: 'Sensor Bunker',
    blocks: commanderDroneBlueprint.blocks.filter((block) => block.id !== 'drone'),
  }
  const fight = (blueprint) => resolveCombat({
    round: 1,
    seed: 'commander-drone-archetype-check',
    red: {
      blueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: { name: 'Drone Archetype Test', width: 24, height: 16, activeHazards: [] },
  })
  const droneResult = fight(commanderDroneBlueprint)
  const withoutDroneResult = fight(withoutDroneBlueprint)
  const droneAbilities = droneResult.replay.events.filter(
    (event) => event.type === 'ability' && event.ability === 'drone_swarm',
  )

  assert.deepEqual(droneAbilities.map((event) => Math.trunc(event.t)), [1, 5])
  assert.equal(
    withoutDroneResult.replay.events.some((event) => event.type === 'ability'),
    false,
  )
  assert.ok(droneResult.damage.blue > withoutDroneResult.damage.blue)
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
    },
    blue: {
      blueprint: partBreakTargetBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
  })
  const detach = result.replay.events.find(
    (event) => event.type === 'part_detach' && event.bot === 'blue' && event.blockId === 'flag',
  )

  assert.ok(detach)
  assert.equal(detach.partId, 'Style_Flag')
  assert.equal(result.partHealth.blue[detach.blockId], 0)
  assert.equal(typeof detach.damageCause, 'string')
  assert.ok(Array.isArray(detach.sourcePosition))
  assert.ok(Array.isArray(detach.impactPosition))
  assert.ok(Array.isArray(detach.impulse))
  assert.ok(Array.isArray(detach.angularImpulse))
  assert.ok(detach.sourcePosition[0] < detach.position[0])
  assert.ok(detach.impulse.some((value) => Math.abs(value) > 0))
  assert.ok(detach.fractureSeverity > 0)
  assert.ok(detach.fractureSeverity <= 1)

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
    },
    blue: {
      blueprint: bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
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
    },
    blue: {
      blueprint: bareBodyBlueprint,
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
    },
    blue: {
      blueprint: fastSkirmisherBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'kite',
        preferredRange: 'close',
        aggression: 0.55,
        weaponCadence: 'sustained',
      }),
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
  assert.deepEqual(
    response.invites.map((invite) => invite.observerToken),
    ['observer_red', 'observer_blue'],
  )
  assert.equal(response.refereeToken, 'referee_referee')
  assert.equal(publicJson.includes('claim_red'), false)
  assert.equal(publicJson.includes('claim_blue'), false)
  assert.equal(publicJson.includes('observer_red'), false)
  assert.equal(publicJson.includes('observer_blue'), false)
  assert.equal(publicJson.includes('referee_referee'), false)
  assert.equal(publicJson.includes('role_red'), false)
  assert.equal(storedJson.includes('claim_red'), false)
  assert.equal(storedJson.includes('claim_blue'), false)
  assert.equal(storedJson.includes('observer_red'), false)
  assert.equal(storedJson.includes('observer_blue'), false)
  assert.equal(storedJson.includes('referee_referee'), false)
  assert.equal(response.publicState.roles.red.claimed, false)
  assert.equal(response.publicState.roles.blue.submitted, false)
  assert.equal(response.publicState.roundPlan, undefined)
})

test('observer cockpit tokens can read role state but cannot mutate agent state', async () => {
  const session = await createTestSession()
  const observerState = await session.getRoleStateForToken('observer_red')

  assert.equal(observerState.ok, true)
  assert.equal(observerState.value.role, 'red')

  const observerBootstrap = await session.bootstrapRole('red', 'observer_red', {
    agentName: 'observer-red',
  })

  assert.equal(observerBootstrap.ok, false)
  assert.equal(observerBootstrap.error.code, 'INVALID_TOKEN')

  const observerSubmission = await session.submitRoundPlan('observer_red', validSpinnerSubmission)

  assert.equal(observerSubmission.ok, false)
  assert.equal(observerSubmission.error.code, 'FORBIDDEN')

  const observerChat = await session.submitChatMessage('observer_red', {
    kind: 'observation',
    message: 'read-only observer should not post',
  })

  assert.equal(observerChat.ok, false)
  assert.equal(observerChat.error.code, 'FORBIDDEN')

  const observerJournal = await session.submitPrivateChatMessage('observer_red', {
    kind: 'strategy',
    message: 'read-only observer should not write journal',
  })

  assert.equal(observerJournal.ok, false)
  assert.equal(observerJournal.error.code, 'FORBIDDEN')
})

test('sessions require both roles before opening plan submission', async () => {
  const session = await createTestSession()
  const red = await session.claimRole(claimRequest('red'))

  assert.equal(red.ok, true)
  assert.equal(red.value.state.phase, 'waiting_for_agents')

  const earlySubmission = await session.submitRoundPlan(
    red.value.roleToken,
    validSpinnerSubmission,
  )

  assert.equal(earlySubmission.ok, false)
  assert.equal(earlySubmission.error.code, 'PHASE_CLOSED')

  const blue = await session.claimRole(claimRequest('blue'))

  assert.equal(blue.ok, true)
  assert.equal(blue.value.state.phase, 'submission_phase')
  assert.deepEqual(blue.value.state.roundPlan, {
    openedAt: '2026-06-03T00:00:00.000Z',
    deadlineAt: '2026-06-03T00:02:00.000Z',
    planSeconds: 120,
  })
})

test('agent bootstrap uses the invite claim token as a reusable player key', async () => {
  const session = await createTestSession()
  const badBootstrap = await session.bootstrapRole('red', 'claim_not_real', {})

  assert.equal(badBootstrap.ok, false)
  assert.equal(badBootstrap.error.code, 'INVALID_TOKEN')

  const missingIdentity = await session.bootstrapRole('red', 'claim_red', {
    agentName: 'external-red',
  })

  assert.equal(missingIdentity.ok, false)
  assert.equal(missingIdentity.error.code, 'INVALID_REQUEST')

  const bootstrap = await session.bootstrapRole('red', 'claim_red', {
    agentName: 'external-red',
    teamIdentity: testTeamIdentity('red'),
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

  const blue = await session.bootstrapRole('blue', 'claim_blue', {
    teamIdentity: testTeamIdentity('blue'),
  })

  assert.equal(blue.ok, true)
  assert.equal(blue.value.state.phase, 'submission_phase')
  assert.equal(blue.value.state.roundPlan.planSeconds, 120)
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

test('agents can publish public table talk while private reflections stay role scoped', async () => {
  const session = await createTestSession('s_chat')
  const { redToken } = await claimBothRoles(session)
  const chat = await session.submitChatMessage(redToken, {
    kind: 'strategy',
    message: '  Your last armor trade looked slow; I am testing control pressure next.  ',
  })

  assert.equal(chat.ok, true)
  assert.equal(chat.value.message.role, 'red')
  assert.equal(chat.value.message.kind, 'strategy')
  assert.equal(chat.value.message.message, 'Your last armor trade looked slow; I am testing control pressure next.')
  assert.equal(chat.value.publicState.chatLog.length, 1)
  assert.deepEqual(chat.value.state.chatLog, chat.value.publicState.chatLog)

  const publicReflection = await session.submitChatMessage(redToken, {
    kind: 'reflection',
    message: 'This belongs in private role memory.',
  })

  assert.equal(publicReflection.ok, false)
  assert.equal(publicReflection.error.code, 'INVALID_REQUEST')
  assert.equal(publicReflection.error.issues[0].code, 'INVALID_CHAT_KIND')

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
    kind: 'reflection',
    message: `  ${noteText}  `,
  })

  assert.equal(note.ok, true)
  assert.equal(note.value.message.role, 'red')
  assert.equal(note.value.message.kind, 'reflection')
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
  assert.equal(redSubmission.value.publicState.roundPlan.planSeconds, 120)
  assert.equal(redSubmission.value.publicState.roundPlan.deadlineAt, '2026-06-03T00:02:00.000Z')
  assert.equal(redSubmission.value.publicState.chatLog[0].kind, 'strategy')

  const preReplay = session.getReplay()

  assert.equal(preReplay.ok, false)
  assert.equal(preReplay.error.code, 'REPLAY_NOT_AVAILABLE')

  const blueSubmission = await session.submitRoundPlan(blueToken, validSpinnerSubmission)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'combat_turn')
  assert.equal(blueSubmission.value.publicState.replayAvailable, false)
  assert.equal(blueSubmission.value.publicState.roundPlan, undefined)
  assert.equal(blueSubmission.value.publicState.combat.tick, 1)
  assert.equal(blueSubmission.value.state.combat.turnSeconds, 120)
  assert.equal(blueSubmission.value.state.combat.self.role, 'blue')
  assert.equal(blueSubmission.value.state.combat.opponent.role, 'red')
  assert.equal(blueSubmission.value.state.combat.decision.tick, 1)
  assert.equal(blueSubmission.value.state.combat.decision.legalCommands.movement.includes('forward'), true)
  assert.equal(blueSubmission.value.state.combat.decision.range.band, 'long')
  assert.deepEqual(blueSubmission.value.state.combat.decision.positioning.selfCell, { x: 6, z: 0 })
  assert.deepEqual(blueSubmission.value.state.combat.decision.positioning.opponentCell, { x: -6, z: 0 })
  assert.equal(blueSubmission.value.state.combat.decision.positioning.distanceCells, 12)
  assert.equal(blueSubmission.value.state.combat.decision.positioning.bearingToOpponent, 'west')
  assert.equal(blueSubmission.value.state.combat.decision.hazards.active.includes('floor_saw'), true)
  assert.equal(blueSubmission.value.state.combat.decision.arenaPressure.selfNearHazard, false)
  assert.ok(blueSubmission.value.state.combat.decision.movementOptions.recommended.length > 0)
  assert.equal('decision' in blueSubmission.value.publicState.combat, false)
  assert.equal('awardOptions' in blueSubmission.value.publicState, false)

  const resolved = await resolveLiveCombat(session, redToken, blueToken, blueSubmission.value.state)

  assert.equal(resolved.value.publicState.phase, 'round_review')
  assert.equal(resolved.value.publicState.replayAvailable, true)
  assert.ok(resolved.value.publicState.lastResult)
  assert.equal(resolved.value.publicState.chatLog.length, 1)
  assert.equal(resolved.value.publicState.chatLog[0].message, 'Opening with direct pressure; next round should adapt from replay damage.')

  const replay = session.getReplay()

  assert.equal(replay.ok, true)
  assert.equal(replay.value.botBlueprints.red.name, 'Spinner')
  assert.equal(replay.value.botBlueprints.blue.name, 'Spinner')
  assert.deepEqual(replay.value.teamIdentities.red, testTeamIdentity('red'))
  assert.deepEqual(replay.value.teamIdentities.blue, testTeamIdentity('blue'))
  assert.equal(validateReplayTimeline(replay.value), true)

  const publicJson = JSON.stringify(resolved.value.publicState)
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
  }

  const redSubmission = await session.submitRoundPlan(redToken, v2Submission)

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.state.ownSubmission.schemaVersion, 2)
  assert.equal('turnPlan' in redSubmission.value.state.ownSubmission, false)
  assert.equal('openingScript' in redSubmission.value.state.ownSubmission, false)

  const blueSubmission = await session.submitRoundPlan(blueToken, v2Submission)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'combat_turn')
  assert.equal(blueSubmission.value.publicState.replayAvailable, false)
  assert.equal(blueSubmission.value.state.combat.snapshot.recentEvents.includes('red spawned'), true)

  const resolved = await resolveLiveCombat(session, redToken, blueToken, blueSubmission.value.state)

  assert.equal(resolved.value.publicState.phase, 'round_review')
  assert.equal(validateReplayTimeline(session.getReplay().value), true)
})

test('session applies no-op turn commands when combat turn deadline expires', async () => {
  let now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_turn_timeout', {
    clock: () => now,
  })
  const { redToken, blueToken } = await claimBothRoles(session)

  await session.submitRoundPlan(redToken, validSpinnerSubmission)
  const blueSubmission = await session.submitRoundPlan(blueToken, validSpinnerSubmission)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'combat_turn')
  assert.equal(blueSubmission.value.publicState.combat.tick, 1)

  now = '2026-06-03T00:02:01.000Z'

  const redState = await session.getRoleStateForToken(redToken)

  assert.equal(redState.ok, true)
  assert.equal(redState.value.phase, 'combat_turn')
  assert.equal(redState.value.combat.tick, 2)
  assert.equal(redState.value.combat.submitted.red, false)
  assert.equal(
    redState.value.eventLog.some((event) => event.type === 'turn_command_timed_out'),
    true,
  )
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
    teamIdentity: testTeamIdentity('red', ' Stuck'),
  })
  const blueClaim = await session.claimRole({
    role: 'blue',
    claimToken: blueInvite.claimToken,
    agentName: 'blue',
    teamIdentity: testTeamIdentity('blue'),
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
    teamIdentity: testTeamIdentity('red', ' Replacement'),
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

test('interest is deterministic and bounded', () => {
  assert.equal(calculateInterest(68), 6)
  assert.equal(calculateInterest(260), 25)
})

test('referee advances round review and applies automatic economy to the next round', async () => {
  const session = await createTestSession('s_advance_round')
  const refereeToken = session.createResponse().refereeToken
  const stored = session.exportState()

  stored.phase = 'round_review'
  stored.round = 1
  stored.roles.red.claimedAt = '2026-06-03T00:00:00.000Z'
  stored.roles.blue.claimedAt = '2026-06-03T00:00:00.000Z'
  stored.roles.red.submittedAt = '2026-06-03T00:01:00.000Z'
  stored.roles.blue.submittedAt = '2026-06-03T00:01:00.000Z'
  stored.roles.red.gold = 68
  stored.roles.blue.gold = 260
  stored.lastResult = {
    winner: 'red',
    reason: 'Red disabled Blue.',
    damage: { red: 10, blue: 50 },
    remainingHealth: { red: 40, blue: 0 },
  }

  const loaded = SessionCoordinator.fromState(stored, {
    clock: () => '2026-06-03T00:02:00.000Z',
  })
  const advance = await loaded.advanceRound(refereeToken)

  assert.equal(advance.ok, true)
  assert.equal(advance.value.publicState.phase, 'submission_phase')
  assert.equal(advance.value.publicState.round, 2)
  assert.equal(advance.value.publicState.roles.red.submitted, false)
  assert.equal(advance.value.publicState.roles.blue.submitted, false)
  assert.equal(advance.value.publicState.roles.red.wins, 1)
  assert.equal(advance.value.publicState.roles.red.winStreak, 1)
  assert.equal(advance.value.publicState.roles.blue.losses, 1)
  assert.deepEqual(advance.value.publicState.roundPlan, {
    openedAt: '2026-06-03T00:02:00.000Z',
    deadlineAt: '2026-06-03T00:04:00.000Z',
    planSeconds: 120,
  })
  assert.equal('awardOptions' in advance.value.publicState, false)

  const exported = loaded.exportState()

  assert.equal(exported.roles.red.gold, 68 + 50 + calculateInterest(68) + 25)
  assert.equal(exported.roles.blue.gold, 260 + 50 + calculateInterest(260))
  assert.equal(exported.roles.red.submittedAt, undefined)
  assert.equal(exported.roles.blue.submittedAt, undefined)
  assert.equal(exported.roundPlan.deadlineAt, '2026-06-03T00:04:00.000Z')
})

test('draw advance applies no winner bonus', async () => {
  const session = await createTestSession('s_draw_advance')
  const refereeToken = session.createResponse().refereeToken
  const stored = session.exportState()

  stored.phase = 'round_review'
  stored.round = 1
  stored.roles.red.claimedAt = '2026-06-03T00:00:00.000Z'
  stored.roles.blue.claimedAt = '2026-06-03T00:00:00.000Z'
  stored.roles.red.gold = 68
  stored.roles.blue.gold = 92
  stored.lastResult = {
    winner: 'draw',
    reason: 'No bot took damage.',
    damage: { red: 0, blue: 0 },
    remainingHealth: { red: 40, blue: 40 },
  }

  const loaded = SessionCoordinator.fromState(stored, {
    clock: () => '2026-06-03T00:02:00.000Z',
  })
  const advance = await loaded.advanceRound(refereeToken)

  assert.equal(advance.ok, true)

  const exported = loaded.exportState()

  assert.equal(exported.roles.red.gold, 68 + 50 + calculateInterest(68))
  assert.equal(exported.roles.blue.gold, 92 + 50 + calculateInterest(92))
  assert.equal(exported.roles.red.wins, 0)
  assert.equal(exported.roles.blue.wins, 0)
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
  const maxRoundBlueSubmission = await maxRoundSession.submitRoundPlan(
    maxRoundTokens.blueToken,
    validSpinnerSubmission,
  )
  const maxRoundResolved = await resolveLiveCombat(
    maxRoundSession,
    maxRoundTokens.redToken,
    maxRoundTokens.blueToken,
    maxRoundBlueSubmission.value.state,
  )

  assert.equal(maxRoundResolved.value.publicState.phase, 'round_review')

  const maxRoundAdvance = await maxRoundSession.advanceRound(maxRoundRefereeToken)

  assert.equal(maxRoundAdvance.ok, true)
  assert.equal(maxRoundAdvance.value.publicState.phase, 'session_complete')
  assert.equal(maxRoundAdvance.value.publicState.round, 1)

  const streakSession = await createTestSession('s_streak')
  const streakRefereeToken = streakSession.createResponse().refereeToken
  const stored = streakSession.exportState()

  stored.phase = 'round_review'
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
  const loaded = SessionCoordinator.fromState(stored, {
    clock: () => '2026-06-03T00:00:00.000Z',
  })
  const streakAdvance = await loaded.advanceRound(streakRefereeToken)

  assert.equal(streakAdvance.ok, true)
  assert.equal(streakAdvance.value.publicState.phase, 'session_complete')
  assert.equal(streakAdvance.value.publicState.roles.red.wins, 3)
  assert.equal(streakAdvance.value.publicState.roles.red.winStreak, 3)
})
