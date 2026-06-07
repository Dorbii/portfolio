import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PART_CATALOG,
  PART_VISUAL_REFERENCES,
  AGENT_FEATURE_GATES,
  applyPurchases,
  buildPartCatalogDisplay,
  createAgentCatalogGuidance,
  deriveControls,
  normalizeTactics,
  validateBlueprintAssembly,
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
  applyLoadoutAction,
  buildCatalogStore,
  buildLoadoutActionSet,
  buildCombatActionSet,
  buildFightDossier,
  botDesignSnapshotToBlueprint,
  combatActionCommand,
  combatLegalActionForPacket,
  buildSharedDebrief,
  createInitialLoadoutBuildState,
  loadoutLegalActionForPacket,
  pathHazards,
  RARE_SIGNATURE_STORE_MAX_COST,
  resolveCombat,
  resolveSubmittedCombat,
  resolveSubmittedGameActions,
  stablePartOrder,
  validateMinimumViableLoadout,
  worldToArenaCell,
} from '../.test-build/packages/sim/src/index.js'
import {
  SessionCoordinator,
  calculateInterest,
} from '../.test-build/apps/worker/src/session.js'
import { DEFAULT_STARTING_GOLD } from '../.test-build/apps/worker/src/sessionSupport.js'

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
    colorHex: '#ff4c5d',
    logoPrompt: 'Red shield combat robotics logo with R monogram',
  },
  blue: {
    name: 'Blue Team',
    colorHex: '#5b9dff',
    logoPrompt: 'Blue shield combat robotics logo with B monogram',
  },
}

function testTeamIdentity(role, suffix = '') {
  return {
    ...testTeamIdentities[role],
    name: `${testTeamIdentities[role].name}${suffix}`,
  }
}

function expectedLegacyTeamIdentity(role, suffix = '') {
  const identity = testTeamIdentity(role, suffix)

  return {
    name: identity.name,
    primaryColor: identity.colorHex,
    logo: {
      mark: 'shield',
      initials: expectedLegacyLogoInitials(identity.logoPrompt),
    },
  }
}

function expectedLegacyLogoInitials(value) {
  return value
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase()
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

const tacticalOpenArena = {
  name: 'Tactical Anchor Test',
  width: 8,
  height: 8,
  activeHazards: [],
  topology: {
    grid: { cellSize: 1 },
    spawnZones: [],
    hazards: [],
    terrain: [],
    obstacles: [],
  },
}

const tacticalBlockedArena = {
  ...tacticalOpenArena,
  name: 'Tactical Blocker Test',
  topology: {
    ...tacticalOpenArena.topology,
    obstacles: [
      {
        id: 'center_blocker',
        type: 'wall',
        shape: { kind: 'rect', center: [0, 0], size: [1, 3] },
        blocksMovement: true,
      },
    ],
  },
}

const tacticalRuntimeArena = {
  ...tacticalOpenArena,
  name: 'Tactical Runtime Test',
  width: 16,
}

const tacticalRuntimeBlockedArena = {
  ...tacticalBlockedArena,
  name: 'Tactical Runtime Blocker Test',
  width: 16,
}

const tacticalCombatControls = {
  movement: ['brake', 'forward', 'dash_forward', 'strafe_left', 'strafe_right'],
  weaponA: ['fire', 'hold'],
}

function combatBotSnapshot(role, position, overrides = {}) {
  const health = overrides.health ?? 30

  return {
    role,
    position,
    health,
    maxHealth: overrides.maxHealth ?? health,
    partHealth: overrides.partHealth ?? { core: health },
    stats: overrides.stats ?? {
      armor: 0,
      chaos: 0,
      control: 0,
      durability: health,
      footprint: 1,
      mass: 8,
      mobility: 12,
      stability: 3,
      style: 0,
      traction: 4,
      weaponThreat: 12,
    },
    hasUtilityControl: overrides.hasUtilityControl ?? false,
    hasWeaponControl: overrides.hasWeaponControl ?? true,
    weaponSlotCount: overrides.weaponSlotCount ?? 1,
    weaponReach: overrides.weaponReach ?? 2,
    statuses: overrides.statuses ?? [],
    cooldowns: overrides.cooldowns ?? {},
    charges: overrides.charges ?? {},
  }
}

function combatSnapshot(arena, redPosition, bluePosition, overrides = {}) {
  return {
    tick: overrides.tick ?? 1,
    arena,
    distance: Math.hypot(redPosition[0] - bluePosition[0], redPosition[2] - bluePosition[2]),
    hardMaxTicks: 600,
    recentEvents: [],
    red: combatBotSnapshot('red', redPosition, overrides.red),
    blue: combatBotSnapshot('blue', bluePosition, overrides.blue),
  }
}

function replayForCompletedFight() {
  return {
    round: 1,
    duration: 12,
    summary: 'Red disabled Blue with weapon pressure.',
    events: [
      { t: 0, type: 'spawn', bot: 'red', position: [-1, 0, 0], rotation: [0, 0, 0] },
      { t: 0, type: 'spawn', bot: 'blue', position: [1, 0, 0], rotation: [0, 0, 0] },
      {
        t: 1,
        type: 'move',
        bot: 'red',
        from: [-1, 0, 0],
        to: [0, 0, 0],
        command: 'forward',
      },
      {
        t: 2,
        type: 'weapon_fire',
        bot: 'red',
        weaponSlot: 'weaponA',
        sourceBlockId: 'spinner',
        sourcePartId: 'Weapon_Spinner_Small',
      },
      {
        t: 2.2,
        type: 'impact',
        attacker: 'red',
        defender: 'blue',
        damage: 40,
        position: [0.4, 0, 0],
      },
      {
        t: 2.3,
        type: 'damage',
        bot: 'blue',
        amount: 40,
        remainingHealth: 0,
        blockId: 'core',
        partId: 'Body_Square_Medium',
        partRemainingHealth: 0,
        partMaxHealth: 40,
      },
      {
        t: 2.4,
        type: 'part_detach',
        bot: 'blue',
        blockId: 'core',
        partId: 'Body_Square_Medium',
        position: [1, 0, 0],
      },
      { t: 2.5, type: 'knockout', bot: 'blue', cause: 'weapon' },
    ],
  }
}

function completedFightResult() {
  return {
    winner: 'red',
    reason: 'Red disabled Blue.',
    damage: { red: 0, blue: 40 },
    remainingHealth: { red: 40, blue: 0 },
    partHealth: {
      red: { core: 40, left: 10, right: 10, spinner: 12 },
      blue: { core: 0, left: 8, right: 8, spinner: 10 },
    },
    stats: {
      red: { durability: 40 },
      blue: { durability: 40 },
    },
    replay: replayForCompletedFight(),
    log: ['Red disabled Blue.'],
  }
}

function completedFightDossier(sessionId = 's_debrief') {
  return buildFightDossier({
    sessionId,
    fightId: 'fight_1',
    replay: replayForCompletedFight(),
    result: completedFightResult(),
    botBlueprints: {
      red: validSpinnerSubmission.blueprint,
      blue: validSpinnerSubmission.blueprint,
    },
  })
}

test('fight dossier attributes weapon damage from replay impact order', () => {
  const result = completedFightResult()
  result.partHealth.red.net = 10

  const dossier = buildFightDossier({
    sessionId: 's_weapon_source_dossier',
    fightId: 'fight_1',
    replay: {
      round: 1,
      duration: 4,
      summary: 'Red spinner damage decided the fight after a low-impact net deploy.',
      events: [
        { t: 0, type: 'spawn', bot: 'red', position: [-1, 0, 0], rotation: [0, 0, 0] },
        { t: 0, type: 'spawn', bot: 'blue', position: [1, 0, 0], rotation: [0, 0, 0] },
        {
          t: 1,
          type: 'weapon_fire',
          bot: 'red',
          weaponSlot: 'weaponA',
          sourceBlockId: 'net',
          sourcePartId: 'Weapon_Net',
          phase: 'deploy',
        },
        {
          t: 2,
          type: 'weapon_fire',
          bot: 'red',
          weaponSlot: 'weaponB',
          sourceBlockId: 'spinner',
          sourcePartId: 'Weapon_Spinner_Small',
          phase: 'release',
        },
        {
          t: 2.25,
          type: 'impact',
          attacker: 'red',
          defender: 'blue',
          damage: 40,
          position: [0.4, 0, 0],
        },
        {
          t: 2.3,
          type: 'damage',
          bot: 'blue',
          amount: 40,
          remainingHealth: 0,
          blockId: 'core',
          partId: 'Body_Square_Medium',
          partRemainingHealth: 0,
          partMaxHealth: 40,
        },
      ],
    },
    result,
    botBlueprints: {
      red: {
        ...validSpinnerSubmission.blueprint,
        blocks: [
          ...validSpinnerSubmission.blueprint.blocks,
          { id: 'net', partId: 'Weapon_Net', position: [1, 0, 0], rotation: [0, 0, 0] },
        ],
      },
      blue: validSpinnerSubmission.blueprint,
    },
  })
  const weapons = new Map(dossier.fights[0].stats.weaponUse.red.map((weapon) => [weapon.weaponId, weapon]))

  assert.equal(weapons.get('Weapon_Net').damage, 0)
  assert.equal(weapons.get('Weapon_Spinner_Small').damage, 40)
})

function postFightReflection(role, overrides = {}) {
  const claims = {
    ownWeaknesses: ['secret weak drive note'],
    opponentThreats: ['secret opponent threat note'],
    suggestedDesignChanges: ['secret design suggestion'],
    suggestedTacticalChanges: ['secret tactical suggestion'],
  }

  if (role === 'blue') {
    claims.perceivedWinReason = 'secret false blue win claim'
    claims.perceivedLossReason = 'secret blue loss explanation'
  }

  return {
    action: 'submit_post_fight_reflection',
    fightId: 'fight_1',
    role,
    decisionVersion: 1500,
    claims,
    confidence: 'medium',
    ...overrides,
  }
}

test('shared debrief follows fight data over false private reflection claims', () => {
  const dossier = completedFightDossier('s_debrief_data_authority')
  const fight = dossier.fights[0]

  fight.stats.weaponUse.red = [
    { weaponId: 'Weapon_Net', activations: 1, hits: 0, damage: 0 },
    { weaponId: 'Weapon_Spinner_Small', activations: 1, hits: 1, damage: 40 },
  ]

  const debrief = buildSharedDebrief({
    sourceSessionId: 's_debrief_data_authority',
    dossier,
    reflections: [
      {
        status: 'private_pending',
        submittedAt: '2026-06-03T00:01:00.000Z',
        reflection: postFightReflection('red', {
          claims: {
            perceivedWinReason: 'SECRET_RAW_CLAIM: the net won the fight by itself',
            ownWeaknesses: ['SECRET_RAW_WEAKNESS'],
            opponentThreats: ['SECRET_RAW_THREAT'],
            suggestedDesignChanges: ['SECRET_RAW_DESIGN'],
            suggestedTacticalChanges: ['SECRET_RAW_TACTIC'],
          },
        }),
      },
    ],
  })
  const serialized = JSON.stringify(debrief)

  assert.match(debrief.summary, /Weapon_Net/)
  assert.match(debrief.summary, /Weapon_Spinner_Small/)
  assert.equal(serialized.includes('SECRET_RAW_CLAIM'), false)
  assert.equal(serialized.includes('SECRET_RAW_WEAKNESS'), false)
  assert.equal(debrief.evidence.some((entry) => entry.type === 'reflection_conflict'), true)
})

function buildTacticalCombatActionSet({
  role,
  arena = tacticalOpenArena,
  redPosition = [-1, 0, 0],
  bluePosition = [1, 0, 0],
  tick = 1,
  controls = tacticalCombatControls,
}) {
  return buildCombatActionSet({
    role,
    round: 1,
    tick,
    decisionVersion: role === 'red' ? 11 : 12,
    actionSetId: `${role}:r1:turn_${tick}:v${role === 'red' ? 11 : 12}`,
    createdAt: '2026-06-07T00:00:00.000Z',
    catalogVersion: 'part-catalog:v1',
    arenaVersion: 'arena:v1:test',
    snapshot: combatSnapshot(arena, redPosition, bluePosition, { tick }),
    controls,
  })
}

function findCombatAction(actionSet, predicate) {
  const action = Object.values(actionSet.actions).find((candidate) => {
    const command = combatActionCommand(candidate)

    return command !== undefined && predicate(command, candidate)
  })

  assert.notEqual(action, undefined)

  return action
}

function hasCombatAction(actionSet, predicate) {
  return Object.values(actionSet.actions).some((candidate) => {
    const command = combatActionCommand(candidate)

    return command !== undefined && predicate(command, candidate)
  })
}

function canonicalCombatAction(role, tick, command, suffix = '') {
  const kind = command.move && command.move !== 'brake'
    ? command.weaponA === 'fire' || command.weaponB === 'fire'
      ? 'move_and_attack'
      : 'move'
    : command.weaponA === 'fire' || command.weaponB === 'fire'
      ? 'attack'
      : command.utility === 'activate'
        ? 'use_utility'
        : 'hold'

  return {
    id: `combat.${role}.test.t${tick}.${kind}${suffix ? `.${suffix}` : ''}`,
    kind,
    role,
    payload: {
      scope: 'combat_turn',
      label: 'Test combat action',
      summary: 'Test canonical combat action.',
      command: { tick, ...command },
    },
  }
}

function canonicalCombatActions(role, commands) {
  return commands.map((command, index) => canonicalCombatAction(role, index + 1, command))
}

function pathKeys(preview) {
  return new Set(preview.path.map((cell) => `${cell.x},${cell.z}`))
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

function actionSubmissionFromPacket(packet, actionId = packet.legalActions[0]?.id) {
  assert.equal(typeof packet.actionSetId, 'string')
  assert.equal(typeof packet.decisionVersion, 'number')
  assert.equal(typeof actionId, 'string')

  return {
    action: 'submit_game_action',
    actionSetId: packet.actionSetId,
    decisionVersion: packet.decisionVersion,
    actionId,
  }
}

function findLegalAction(packet, predicate) {
  const action = packet.legalActions.find(predicate)

  assert.notEqual(action, undefined)

  return action
}

async function submitPacketAction(session, token, packet, action) {
  const submitted = await session.submitGameMasterAction(
    token,
    actionSubmissionFromPacket(packet, action.id),
  )

  assert.equal(submitted.ok, true)

  return submitted
}

async function placePartFromCatalog(session, token, packet, partId) {
  let submitted = await submitPacketAction(
    session,
    token,
    packet,
    findLegalAction(packet, (action) => action.kind === 'choose_part' && action.catalogRefs?.includes(partId)),
  )
  submitted = await submitPacketAction(
    session,
    token,
    submitted.value.packet,
    findLegalAction(submitted.value.packet, (action) => action.kind === 'choose_attach_target'),
  )
  submitted = await submitPacketAction(
    session,
    token,
    submitted.value.packet,
    findLegalAction(submitted.value.packet, (action) => action.kind === 'choose_mount'),
  )

  return submitPacketAction(
    session,
    token,
    submitted.value.packet,
    findLegalAction(submitted.value.packet, (action) => action.kind === 'choose_rotation'),
  )
}

function createBuilderHarness(gold = 200, catalog = PART_CATALOG) {
  return {
    buildState: createInitialLoadoutBuildState('red'),
    catalog,
    decisionVersion: 1,
    gold,
    inventory: [],
  }
}

function builderActions(harness) {
  const actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: harness.decisionVersion,
    actionSetId: `red:r1:loadout:v${harness.decisionVersion}`,
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold: harness.gold,
    buildState: harness.buildState,
    catalog: harness.catalog,
  })

  harness.decisionVersion += 1

  return Object.values(actionSet.actions)
}

function chooseBuilderAction(harness, predicate) {
  const action = builderActions(harness).find(predicate)

  assert.notEqual(action, undefined)

  return action
}

function applyBuilderAction(harness, action) {
  const applied = applyLoadoutAction({
    role: 'red',
    gold: harness.gold,
    inventory: harness.inventory,
    buildState: harness.buildState,
    action,
    catalog: harness.catalog,
  })

  assert.equal(applied.ok, true, applied.ok ? '' : JSON.stringify(applied.issues))

  harness.gold = applied.gold
  harness.inventory = applied.inventory
  harness.buildState = applied.buildState

  return applied
}

function tryBuilderAction(harness, action) {
  return applyLoadoutAction({
    role: 'red',
    gold: harness.gold,
    inventory: harness.inventory,
    buildState: harness.buildState,
    action,
    catalog: harness.catalog,
  })
}

function placePartInHarness(harness, partId, options = {}) {
  applyBuilderAction(
    harness,
    chooseBuilderAction(
      harness,
      (action) => action.kind === 'choose_part' && action.payload.partId === partId,
    ),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(
      harness,
      (action) => action.kind === 'choose_attach_target' &&
        (options.targetInstanceId === undefined || action.payload.targetInstanceId === options.targetInstanceId),
    ),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(
      harness,
      (action) => action.kind === 'choose_mount' &&
        (options.mountPredicate ? options.mountPredicate(action) : true),
    ),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(
      harness,
      (action) => action.kind === 'choose_rotation' &&
        (options.rotation === undefined || action.payload.rotation === options.rotation),
    ),
  )

  return harness.buildState.currentDesign.parts.at(-1)
}

function builderPart(design, partId) {
  const part = design.parts.find((entry) => entry.partId === partId)

  assert.notEqual(part, undefined)

  return part
}

function requirePart(partsById, partId) {
  const catalogPart = partsById.get(partId)

  assert.notEqual(catalogPart, undefined)

  return catalogPart
}

function assertFiniteVector(vector, label) {
  assert.equal(Array.isArray(vector), true, `${label} must be a vector`)
  assert.equal(vector.length, 3, `${label} must have three components`)

  for (const component of vector) {
    assert.ok(Number.isFinite(component) && component > 0, `${label} has invalid component ${component}`)
  }
}

function assertFiniteStats(stats, label) {
  for (const [key, value] of Object.entries(stats)) {
    assert.ok(Number.isFinite(value), `${label}.${key} must be finite`)
  }
}

function assertCompleteSpec(catalogPart) {
  const spec = catalogPart.spec

  assert.equal(typeof spec.kind, 'string', `${catalogPart.id}.spec.kind is missing`)

  switch (spec.kind) {
    case 'weapon':
      assert.ok(spec.damage > 0, `${catalogPart.id}.spec.damage must be positive`)
      assert.ok(spec.range > 0, `${catalogPart.id}.spec.range must be positive`)
      assert.ok(spec.cooldownTurns >= 1, `${catalogPart.id}.spec.cooldownTurns must be positive`)
      assert.ok(spec.precision >= 0 && spec.precision <= 1, `${catalogPart.id}.spec.precision must be normalized`)
      assert.ok(['direct', 'arc', 'sweep', 'contact'].includes(spec.fireMode))
      break
    case 'mobility':
      assert.ok(spec.moveBudget >= 0, `${catalogPart.id}.spec.moveBudget must be non-negative`)
      assert.ok(spec.traction >= 0, `${catalogPart.id}.spec.traction must be non-negative`)
      assert.ok(spec.stability >= 0, `${catalogPart.id}.spec.stability must be non-negative`)
      assert.ok(spec.turnRate > 0, `${catalogPart.id}.spec.turnRate must be positive`)
      if (spec.moveBudget > 0) {
        assert.equal(catalogPart.footprint.groundContact, 'required')
      }
      break
    case 'armor':
      assert.ok(spec.armor > 0, `${catalogPart.id}.spec.armor must be positive`)
      assert.ok(spec.coverage > 0, `${catalogPart.id}.spec.coverage must be positive`)
      break
    case 'structure':
      assert.ok(spec.integrity > 0, `${catalogPart.id}.spec.integrity must be positive`)
      assert.ok(spec.connectorStrength > 0, `${catalogPart.id}.spec.connectorStrength must be positive`)
      break
    case 'utility':
      assert.equal(typeof spec.effect, 'string')
      assert.ok(spec.effect.length > 0, `${catalogPart.id}.spec.effect must be named`)
      assert.ok(spec.control >= 0, `${catalogPart.id}.spec.control must be non-negative`)
      break
    case 'power':
      assert.ok(spec.output > 0, `${catalogPart.id}.spec.output must be positive`)
      assert.ok(spec.capacity > 0, `${catalogPart.id}.spec.capacity must be positive`)
      break
    default:
      assert.fail(`${catalogPart.id} has unknown spec kind ${spec.kind}`)
  }
}

function assertCompleteVisual(catalogPart) {
  const supportedProfileIds = [
    'painted_chipped_armor',
    'brushed_weapon_steel',
    'scuffed_rubber',
    'dirty_electrical_casing',
    'emissive_led_glass',
    'burnt_critical_metal',
    'scraped_style_shell',
  ]

  assert.equal(typeof catalogPart.visual.animationProfile, 'string')
  assert.ok(catalogPart.visual.animationProfile.length > 0)
  assert.equal(typeof catalogPart.visual.damageProfile, 'string')
  assert.ok(supportedProfileIds.includes(catalogPart.visual.damageProfile))
  assert.ok(['low', 'medium', 'high'].includes(catalogPart.visual.detailBudget))
  assert.equal(typeof catalogPart.visual.materialRole, 'string')
  assert.ok(catalogPart.visual.materialRole.length > 0)
  assert.equal(typeof catalogPart.visual.mountRole, 'string')
  assert.ok(catalogPart.visual.mountRole.length > 0)
  assert.ok(['blockout', 'upgraded', 'hero'].includes(catalogPart.visual.qualityStatus))
  assert.ok(Array.isArray(catalogPart.visual.referenceIds))
  assert.equal(typeof catalogPart.visual.renderProfile, 'string')
  assert.ok(catalogPart.visual.renderProfile.length > 0)
  assert.equal(typeof catalogPart.visual.textureProfile, 'string')
  assert.ok(supportedProfileIds.includes(catalogPart.visual.textureProfile))
  assert.equal(typeof catalogPart.visual.visualFamily, 'string')
  assert.ok(catalogPart.visual.visualFamily.length > 0)
}

function assertCompleteMount(mount, label) {
  assert.equal(typeof mount.id, 'string')
  assert.ok(mount.id.length > 0, `${label}.id is missing`)
  assert.equal(typeof mount.kind, 'string')
  assert.ok(mount.accepts.length > 0, `${label}.accepts must not be empty`)
  assert.equal(typeof mount.motion, 'string')
  assert.equal(typeof mount.collisionPolicy, 'string')
  assert.ok(mount.rotationOptions.length > 0, `${label}.rotationOptions must not be empty`)

  for (const rotation of mount.rotationOptions) {
    assert.ok(Number.isFinite(rotation), `${label}.rotationOptions contains invalid rotation`)
  }
}

function assertCompleteEffect(effect, label) {
  assert.notEqual(effect, undefined, `${label} is missing`)
  assert.equal(typeof effect.id, 'string')
  assert.ok(effect.id.length > 0, `${label}.id is missing`)
  assert.ok(['signature', 'utility'].includes(effect.kind), `${label}.kind is invalid`)
  assert.ok(['activated', 'on_hit', 'on_damage', 'on_flip', 'passive'].includes(effect.trigger), `${label}.trigger is invalid`)
  assert.ok(effect.cooldownTurns >= 0, `${label}.cooldownTurns must be non-negative`)
  assert.ok(['self', 'opponent', 'area', 'movement', 'weapon'].includes(effect.target), `${label}.target is invalid`)
  assert.ok(Object.keys(effect.params).length > 0, `${label}.params must not be empty`)
  assert.ok(effect.debriefSignals.length > 0, `${label}.debriefSignals must not be empty`)

  if (effect.trigger === 'activated') {
    assert.ok((effect.charges ?? 0) > 0, `${label}.charges must be positive for activated effects`)
  }

  for (const [key, value] of Object.entries(effect.params)) {
    const validType = typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'

    assert.equal(validType, true, `${label}.params.${key} has invalid type`)
    if (typeof value === 'number') {
      assert.ok(Number.isFinite(value), `${label}.params.${key} must be finite`)
    }
  }
}

async function buildMinimumViableLoadout(session, token, packet) {
  let submitted = await placePartFromCatalog(session, token, packet, 'Body_Light_Frame')
  submitted = await placePartFromCatalog(session, token, submitted.value.packet, 'Wheel_Small')
  submitted = await placePartFromCatalog(session, token, submitted.value.packet, 'Weapon_Spear')

  return {
    packet: submitted.value.packet,
    confirmAction: findLegalAction(submitted.value.packet, (action) => action.kind === 'confirm_loadout'),
  }
}

async function confirmMinimumViableLoadout(session, token, packet) {
  const built = await buildMinimumViableLoadout(session, token, packet)

  return submitPacketAction(session, token, built.packet, built.confirmAction)
}

async function confirmBothMinimumLoadouts(session, redToken, blueToken) {
  const redPacket = await session.getGameMasterPacketForToken(redToken)
  const bluePacket = await session.getGameMasterPacketForToken(blueToken)

  assert.equal(redPacket.ok, true)
  assert.equal(bluePacket.ok, true)

  const redSubmission = await confirmMinimumViableLoadout(session, redToken, redPacket.value)
  const blueSubmission = await confirmMinimumViableLoadout(session, blueToken, bluePacket.value)

  return {
    redSubmission,
    blueSubmission,
  }
}

function chooseCombatAction(packet) {
  return (
    packet.legalActions.find((action) => action.kind === 'move_and_attack') ??
    packet.legalActions.find((action) => action.kind === 'attack') ??
    packet.legalActions.find((action) => action.kind === 'move') ??
    findLegalAction(packet, (action) => action.kind === 'hold')
  )
}

async function resolveLiveCombat(session, redToken, blueToken) {
  for (let index = 0; index < 90; index += 1) {
    const redPacket = await session.getGameMasterPacketForToken(redToken)
    const bluePacket = await session.getGameMasterPacketForToken(blueToken)

    assert.equal(redPacket.ok, true)
    assert.equal(bluePacket.ok, true)

    const redTurn = await submitPacketAction(session, redToken, redPacket.value, chooseCombatAction(redPacket.value))
    const blueTurn = await submitPacketAction(session, blueToken, bluePacket.value, chooseCombatAction(bluePacket.value))

    if (blueTurn.value.publicState.phase === 'round_review') {
      return blueTurn
    }

    assert.equal(blueTurn.value.publicState.phase, 'combat_turn')
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
    gate.id === 'combat.movement_actions'
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

test('catalog display model covers current and future part definition fields', () => {
  const intentionallyHiddenKeys = new Set(['displayName', 'id'])

  for (const part of PART_CATALOG) {
    const display = buildPartCatalogDisplay(part)
    const coveredKeys = new Set(display.coveredKeys)
    const displayedKeys = Object.keys(part).filter((key) => !intentionallyHiddenKeys.has(key))

    assert.equal(display.partId, part.id)
    assert.ok(display.summaryRows.some((row) => row.id === 'rarity'))
    assert.ok(display.summaryRows.some((row) => row.id === 'size'))

    for (const key of displayedKeys) {
      assert.ok(coveredKeys.has(key), `${part.id} catalog display is missing ${key}`)
    }
  }
})

test('part visual reference manifest is repo-relative and catalog-linked', () => {
  const manifestByPartId = new Map(PART_VISUAL_REFERENCES.map((entry) => [entry.partId, entry]))
  const catalogIds = new Set(PART_CATALOG.map((part) => part.id))

  assert.ok(PART_VISUAL_REFERENCES.length > 0)

  for (const entry of PART_VISUAL_REFERENCES) {
    assert.ok(catalogIds.has(entry.partId), `${entry.partId} manifest entry has no catalog part`)
    assert.equal(entry.approvedForRuntimeAsset, false)
    assert.ok(entry.notes.length > 0, `${entry.partId} manifest entry needs notes`)

    for (const referencePath of entry.references) {
      assert.equal(typeof referencePath, 'string')
      assert.ok(referencePath.startsWith('local_docs/part_references/'), `${entry.partId} uses non-reference path ${referencePath}`)
      assert.equal(referencePath.includes('..'), false, `${entry.partId} reference path may not escape repo root`)
      assert.equal(referencePath.startsWith('/'), false, `${entry.partId} reference path must be repo-relative`)
      assert.equal(/^[A-Za-z]:[\\/]/.test(referencePath), false, `${entry.partId} reference path must not be absolute`)
    }

    if (entry.references.length === 0) {
      assert.equal(typeof entry.noReferenceReason, 'string', `${entry.partId} needs noReferenceReason without refs`)
    }
  }

  for (const part of PART_CATALOG) {
    for (const referenceId of part.visual.referenceIds) {
      assert.ok(manifestByPartId.has(referenceId), `${part.id} references missing manifest id ${referenceId}`)
    }

    if (part.visual.qualityStatus !== 'blockout') {
      const manifestEntry = manifestByPartId.get(part.id)

      assert.ok(manifestEntry, `${part.id} upgraded visual needs manifest coverage`)
      assert.ok(
        manifestEntry.references.length > 0 || manifestEntry.noReferenceReason,
        `${part.id} upgraded visual needs refs or noReferenceReason`,
      )
    }
  }

  assert.ok(PART_CATALOG.find((part) => part.id === 'Weapon_Hammer')?.visual.referenceIds.includes('Weapon_Hammer'))
  assert.ok(PART_CATALOG.find((part) => part.id === 'Wheel_Omni')?.visual.referenceIds.includes('Wheel_Omni'))
  assert.ok(PART_CATALOG.find((part) => part.id === 'Body_Square_Small')?.visual.referenceIds.includes('Body_Square_Small'))
})

test('catalog display model exposes mechanical specs, mounts, and unique effects', () => {
  const laser = PART_CATALOG.find((part) => part.id === 'Weapon_Laser')
  const omniWheel = PART_CATALOG.find((part) => part.id === 'Wheel_Omni')
  const dragonHead = PART_CATALOG.find((part) => part.id === 'Style_DragonHead')

  assert.ok(laser)
  assert.ok(omniWheel)
  assert.ok(dragonHead)

  const laserRows = buildPartCatalogDisplay(laser).sections.flatMap((section) => section.rows)
  const wheelRows = buildPartCatalogDisplay(omniWheel).sections.flatMap((section) => section.rows)
  const dragonRows = buildPartCatalogDisplay(dragonHead).sections.flatMap((section) => section.rows)

  assert.ok(laserRows.some((row) => row.id === 'spec.damage' && row.value === '13'))
  assert.ok(laserRows.some((row) => row.id === 'spec.range' && row.value === '14'))
  assert.ok(wheelRows.some((row) => row.id === 'mounts.1.motion' && row.value === 'Inherits Parent Spin'))
  assert.ok(wheelRows.some((row) => row.id === 'mounts.1.collisionPolicy' && row.value === 'Allow Clip V1'))
  assert.ok(dragonRows.some((row) => row.id === 'signatureEffect.id' && row.value === 'Fire Breath'))
  assert.ok(dragonRows.some((row) => row.id === 'signatureEffect.params.damage' && row.value === '10'))
})

test('part catalog definitions have complete mechanical parameters', () => {
  for (const catalogPart of PART_CATALOG) {
    assert.equal(typeof catalogPart.id, 'string')
    assert.ok(catalogPart.id.length > 0)
    assert.equal(typeof catalogPart.displayName, 'string')
    assert.ok(catalogPart.displayName.length > 0)
    assert.ok(Number.isFinite(catalogPart.cost) && catalogPart.cost > 0, `${catalogPart.id} has invalid cost`)
    assert.ok(Number.isFinite(catalogPart.mass) && catalogPart.mass > 0, `${catalogPart.id} has invalid mass`)
    assert.ok(Number.isFinite(catalogPart.durability) && catalogPart.durability > 0, `${catalogPart.id} has invalid durability`)
    assertFiniteVector(catalogPart.size, `${catalogPart.id}.size`)
    assert.deepEqual(catalogPart.footprint.size, catalogPart.size)
    assert.ok(catalogPart.footprint.minY >= 0, `${catalogPart.id} footprint may not dip below the floor`)
    assert.ok(Object.keys(catalogPart.stats).length > 0, `${catalogPart.id} must expose at least one stat`)
    assertFiniteStats(catalogPart.stats, `${catalogPart.id}.stats`)
    assertCompleteSpec(catalogPart)
    assertCompleteVisual(catalogPart)

    if (catalogPart.category !== 'style') {
      assert.ok(catalogPart.mounts.length > 0, `${catalogPart.id} should expose mount affordances`)
    }

    for (const mount of catalogPart.mounts) {
      assertCompleteMount(mount, `${catalogPart.id}.mounts.${mount.id}`)
    }

    for (const mechanic of catalogPart.mechanics ?? []) {
      assertCompleteEffect(mechanic, `${catalogPart.id}.mechanics.${mechanic.id}`)
    }

    if (catalogPart.signatureEffect) {
      assertCompleteEffect(catalogPart.signatureEffect, `${catalogPart.id}.signatureEffect`)
    }
  }
})

test('style signature parts have unique effects and viable rare prices', () => {
  const expectedEffectByPart = new Map([
    ['Style_Flag', 'rally_flag'],
    ['Style_Antenna', 'signal_ping'],
    ['Style_BladeAntenna', 'blade_jammer'],
    ['Style_DragonHead', 'fire_breath'],
    ['Style_Spikes', 'spike_burst'],
    ['Style_Horns', 'horn_countercharge'],
    ['Style_Tail', 'tail_slap'],
    ['Style_Wings', 'wing_buffet'],
    ['Style_Neon', 'neon_blind'],
    ['Style_LightBar', 'lightbar_flash'],
    ['Style_TopHat', 'top_hat_taunt'],
    ['Style_CowboyHat', 'rodeo_bait'],
    ['Style_Crown', 'crown_command'],
    ['Style_TrashCan', 'trash_shield'],
  ])
  const styleParts = PART_CATALOG.filter((part) => part.category === 'style')
  const signatureIds = new Set()

  assert.equal(styleParts.length, expectedEffectByPart.size)

  for (const stylePart of styleParts) {
    const expectedEffectId = expectedEffectByPart.get(stylePart.id)

    assert.equal(stylePart.rarity, 'rare')
    assert.equal(stylePart.signatureEffect?.id, expectedEffectId, `${stylePart.id} needs a unique signature effect`)
    assert.notEqual(stylePart.signatureEffect?.id, 'banner_presence')
    assert.ok(stylePart.cost >= 18, `${stylePart.id} should be priced above filler/default parts`)
    assert.ok(stylePart.cost <= RARE_SIGNATURE_STORE_MAX_COST, `${stylePart.id} cannot exceed wildcard rare store cap`)
    assertCompleteEffect(stylePart.signatureEffect, `${stylePart.id}.signatureEffect`)
    signatureIds.add(stylePart.signatureEffect?.id)
  }

  assert.equal(signatureIds.size, styleParts.length)
})

test('catalog economy keeps first-round core plus one rare signature viable', () => {
  const partsById = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const starterCoreIds = ['Body_Light_Frame', 'Wheel_Small', 'Weapon_Spear']
  const starterCoreCost = starterCoreIds.reduce((total, partId) => total + requirePart(partsById, partId).cost, 0)
  const rareSignatureCosts = PART_CATALOG
    .filter((part) => part.category === 'style' && part.signatureEffect)
    .map((part) => part.cost)
  const maxRareSignatureCost = Math.max(...rareSignatureCosts)

  assert.ok(starterCoreCost <= DEFAULT_STARTING_GOLD / 2, `Starter core costs ${starterCoreCost}`)
  assert.ok(
    starterCoreCost + maxRareSignatureCost <= DEFAULT_STARTING_GOLD,
    `Starter core plus most expensive signature costs ${starterCoreCost + maxRareSignatureCost}`,
  )
  assert.ok(maxRareSignatureCost <= RARE_SIGNATURE_STORE_MAX_COST)
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
  const chainWhip = parts.get('Weapon_ChainWhip')
  const shredder = parts.get('Weapon_Shredder')
  const aiModule = parts.get('Utility_AIModule')
  const energyCore = parts.get('Utility_EnergyCore')
  const battery = parts.get('Utility_Battery')
  const radar = parts.get('Utility_Radar')
  const coolantTank = parts.get('Utility_CoolantTank')
  const fuelTank = parts.get('Utility_FuelTank')
  const lightBar = parts.get('Style_LightBar')

  assert.deepEqual(drill?.behavior, PART_BEHAVIORS.saw)
  assert.deepEqual(flail?.behavior, PART_BEHAVIORS.spinner)
  assert.deepEqual(chainWhip?.behavior, PART_BEHAVIORS.spinner)
  assert.deepEqual(shredder?.behavior, PART_BEHAVIORS.spinner)
  assert.deepEqual(aiModule?.behavior, PART_BEHAVIORS.sensor)
  assert.deepEqual(radar?.behavior, PART_BEHAVIORS.sensor)
  assert.equal(drill?.controls?.weapon, true)
  assert.equal(flail?.controls?.weapon, true)
  assert.equal(chainWhip?.controls?.weapon, true)
  assert.equal(shredder?.controls?.weapon, true)
  assert.equal(aiModule?.controls?.utility, true)
  assert.equal(radar?.controls?.utility, true)
  assert.equal(energyCore?.controls, undefined)
  assert.equal(battery?.controls, undefined)
  assert.equal(coolantTank?.controls, undefined)
  assert.equal(fuelTank?.controls, undefined)
  assert.ok((drill?.cost ?? 0) > (saw?.cost ?? 0))
  assert.ok((chainWhip?.cost ?? 0) < (flail?.cost ?? 0))
  assert.ok((shredder?.cost ?? 0) > (flail?.cost ?? 0))
  assert.ok((flail?.stats.chaos ?? 0) >= 5)
  assert.ok((chainWhip?.stats.chaos ?? 0) >= 5)
  assert.ok((shredder?.stats.weapon ?? 0) > (flail?.stats.weapon ?? 0))
  assert.ok((energyCore?.stats.stability ?? 0) > 0)
  assert.ok((battery?.mass ?? 0) >= 5)
  assert.ok((coolantTank?.stats.weapon ?? 0) > 0)
  assert.ok((fuelTank?.stats.chaos ?? 0) > 0)
  assert.equal(lightBar?.category, 'style')
  assert.ok((lightBar?.stats.style ?? 0) >= 4)
})

test('lane 7 catalog expansion accepts only approved parts and keeps existing behavior semantics', () => {
  const parts = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const acceptedIds = [
    'Frame_Angled_Strut',
    'Mount_Weapon_Hardpoint',
    'Mount_Axle_Bracket',
    'Armor_Standoff',
    'Armor_Sacrificial_Panel',
    'Utility_ShockDamper',
    'Weapon_Crusher',
    'Weapon_ForkLifter',
  ]
  const deferredIds = [
    'Weapon_Harpoon',
    'Utility_HeatSink',
  ]

  for (const partId of acceptedIds) {
    const part = parts.get(partId)

    assert.notEqual(part, undefined)
    assert.equal(part.rarity, 'normal')
    assert.deepEqual(part.visual.referenceIds, [])
    assert.equal(part.visual.qualityStatus, 'blockout')
  }

  for (const partId of deferredIds) {
    assert.equal(parts.has(partId), false)
  }

  assert.equal(PART_BEHAVIOR_IDS.includes('harpoon'), false)
  assert.equal(PART_BEHAVIOR_IDS.includes('crusher'), false)
  assert.equal(PART_BEHAVIOR_IDS.includes('fork_lifter'), false)

  const crusher = parts.get('Weapon_Crusher')
  const forkLifter = parts.get('Weapon_ForkLifter')
  const sacrificialPanel = parts.get('Armor_Sacrificial_Panel')

  assert.deepEqual(crusher?.behavior, PART_BEHAVIORS.grabber)
  assert.deepEqual(forkLifter?.behavior, PART_BEHAVIORS.flipper)
  assert.equal(sacrificialPanel?.category, 'defense')
  assert.equal(sacrificialPanel?.visual.visualFamily, 'armor')
  assert.ok(sacrificialPanel?.tags.includes('armor'))
  assert.equal(sacrificialPanel?.tags.includes('filler'), false)
  assert.equal(sacrificialPanel?.tags.includes('structural'), false)
  assert.equal(sacrificialPanel?.behavior, undefined)
  assert.equal(sacrificialPanel?.controls, undefined)
  assert.deepEqual(crusher?.spec, {
    kind: 'weapon',
    damage: 11,
    range: 2,
    cooldownTurns: 2,
    fireMode: 'contact',
    precision: 0.8,
  })
  assert.deepEqual(forkLifter?.spec, {
    kind: 'weapon',
    damage: 7,
    range: 2,
    cooldownTurns: 2,
    fireMode: 'contact',
    precision: 0.85,
  })
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

test('structural filler parts are catalog-backed passive connective tissue', () => {
  const parts = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const requiredFillerIds = [
    'Frame_Strut',
    'Frame_Angled_Strut',
    'Mount_Plate',
    'Mount_Weapon_Hardpoint',
    'Mount_Axle_Bracket',
    'Spacer_Block',
    'Armor_Tile',
    'Armor_Standoff',
    'Counterweight',
  ]

  for (const partId of requiredFillerIds) {
    const part = parts.get(partId)

    assert.notEqual(part, undefined)
    assert.equal(typeof part.cost, 'number')
    assert.equal(typeof part.mass, 'number')
    assert.equal(typeof part.durability, 'number')
    assert.ok(part.tags.includes('filler'))
    assert.equal(part.controls, undefined)
    assert.equal(part.behavior, undefined)
    assert.equal(typeof part.visual.visualFamily, 'string')
  }
})

test('loadout actions use existing catalog specs and stay step-scoped', () => {
  const buildState = createInitialLoadoutBuildState('red')
  const actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 100,
    actionSetId: 'red:r1:loadout:choose_part:v100',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold: 100,
    buildState,
  })
  const legalActions = Object.values(actionSet.actions).map(loadoutLegalActionForPacket)
  const lightFrame = PART_CATALOG.find((part) => part.id === 'Body_Light_Frame')
  const lightFrameAction = legalActions.find((action) => action.catalogRefs?.includes('Body_Light_Frame'))

  assert.notEqual(lightFrame, undefined)
  assert.notEqual(lightFrameAction, undefined)
  assert.equal(lightFrameAction.label, lightFrame.displayName)
  assert.ok(lightFrameAction.summary.includes(`${lightFrame.cost} gold`))
  assert.ok(lightFrameAction.summary.includes(`${lightFrame.mass} mass`))
  assert.equal(legalActions.every((action) => action.kind === 'choose_part'), true)
  assert.equal(legalActions.some((action) => action.kind === 'choose_mount'), false)
  assert.equal(legalActions.some((action) => action.kind === 'choose_rotation'), false)
})

test('loadout action application mutates design through canonical payloads', () => {
  let buildState = createInitialLoadoutBuildState('red')
  let gold = 100
  let inventory = []
  let actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 100,
    actionSetId: 'red:r1:loadout:choose_part:v100',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold,
    buildState,
  })
  const chooseBody = Object.values(actionSet.actions)
    .find((action) => action.payload.partId === 'Body_Light_Frame')

  assert.notEqual(chooseBody, undefined)

  let applied = applyLoadoutAction({
    role: 'red',
    gold,
    inventory,
    buildState,
    action: chooseBody,
  })

  assert.equal(applied.ok, true)
  buildState = applied.buildState
  actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 101,
    actionSetId: 'red:r1:loadout:choose_attach_target:v101',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold,
    buildState,
  })

  applied = applyLoadoutAction({
    role: 'red',
    gold,
    inventory,
    buildState,
    action: Object.values(actionSet.actions)[0],
  })

  assert.equal(applied.ok, true)
  buildState = applied.buildState
  actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 102,
    actionSetId: 'red:r1:loadout:choose_mount:v102',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold,
    buildState,
  })
  applied = applyLoadoutAction({
    role: 'red',
    gold,
    inventory,
    buildState,
    action: Object.values(actionSet.actions)[0],
  })

  assert.equal(applied.ok, true)
  buildState = applied.buildState
  actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 103,
    actionSetId: 'red:r1:loadout:choose_rotation:v103',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold,
    buildState,
  })
  applied = applyLoadoutAction({
    role: 'red',
    gold,
    inventory,
    buildState,
    action: Object.values(actionSet.actions)[0],
  })

  assert.equal(applied.ok, true)
  gold = applied.gold
  inventory = applied.inventory
  buildState = applied.buildState

  assert.equal(gold, 84)
  assert.deepEqual(inventory, [{ partId: 'Body_Light_Frame', quantity: 1 }])
  assert.deepEqual(buildState.currentDesign.parts.map((part) => part.partId), ['Body_Light_Frame'])
  assert.equal(validateMinimumViableLoadout(buildState.currentDesign).some((entry) => entry.code === 'MISSING_MOBILITY'), true)
})

test('catalog_non_style_parts_are_normal_rarity', () => {
  for (const part of PART_CATALOG.filter((entry) => entry.category !== 'style')) {
    assert.equal(part.rarity, 'normal', `${part.id} should default to normal rarity`)
  }
})

test('catalog_style_parts_are_rare_signature_parts', () => {
  const cheapestNonStyle = Math.min(
    ...PART_CATALOG
      .filter((part) => part.category !== 'style')
      .map((part) => part.cost),
  )

  for (const part of PART_CATALOG.filter((entry) => entry.category === 'style')) {
    assert.equal(part.rarity, 'rare', `${part.id} should default to rare rarity`)
    assert.equal(part.signatureEffect?.kind, 'signature', `${part.id} should expose a typed signature effect`)
    assert.equal(typeof part.signatureEffect?.id, 'string')
    assert.ok(part.signatureEffect?.debriefSignals.length > 0)
    assert.ok(part.cost > cheapestNonStyle, `${part.id} should be priced above normal filler`)
  }
})

test('style_signature_requires_single_active_effect', () => {
  const issues = validateMinimumViableLoadout({
    name: 'double signature',
    rootInstanceId: 'body',
    activeSignaturePartInstanceId: 'flag',
    parts: [
      { instanceId: 'body', partId: 'Body_Light_Frame', cell: { x: 0, z: 0 } },
      { instanceId: 'wheel', partId: 'Wheel_Omni', parentInstanceId: 'body', cell: { x: 1, z: 0 } },
      { instanceId: 'weapon', partId: 'Weapon_Laser', parentInstanceId: 'body', cell: { x: 0, z: 0 } },
      { instanceId: 'flag', partId: 'Style_Flag', parentInstanceId: 'body', cell: { x: 0, z: 0 }, signatureEffectActive: true },
      { instanceId: 'dragon', partId: 'Style_DragonHead', parentInstanceId: 'body', cell: { x: 0, z: 0 }, signatureEffectActive: true },
    ],
  })

  assert.ok(issues.some((issue) => issue.code === 'MULTIPLE_ACTIVE_SIGNATURE_EFFECTS'))
})

test('dragon_head_fire_breath_is_typed_not_flavor_text', () => {
  const dragon = PART_CATALOG.find((part) => part.id === 'Style_DragonHead')

  assert.equal(dragon?.signatureEffect?.id, 'fire_breath')
  assert.equal(dragon?.signatureEffect?.trigger, 'activated')
  assert.equal(dragon?.signatureEffect?.target, 'area')
  assert.equal(dragon?.signatureEffect?.replayCue, 'fire_breath')
  assert.equal(dragon?.signatureEffect?.params.fireMode, 'arc')
  assert.equal(typeof dragon?.signatureEffect?.params.damage, 'number')
  assert.ok(dragon?.signatureEffect?.debriefSignals.includes('fire_damage'))
})

test('top_socket_weapon_mount_generates_legal_action', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_part' && action.payload.partId === 'Weapon_Laser'),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_attach_target' && action.payload.targetInstanceId === 'part_1'),
  )
  const topSocket = chooseBuilderAction(
    harness,
    (action) => action.kind === 'choose_mount' && action.payload.mount === 'top_socket',
  )

  assert.equal(topSocket.payload.mountKind, 'top_socket')
  assert.equal(topSocket.payload.collisionPolicy, 'allow_clip_v1')
  assert.deepEqual(topSocket.payload.attachCell, { x: 0, z: 0 })
})

test('builder_generates_rim_mount_for_laser_on_wheel', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const wheel = placePartInHarness(harness, 'Wheel_Omni')
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_part' && action.payload.partId === 'Weapon_Laser'),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_attach_target' && action.payload.targetInstanceId === wheel.instanceId),
  )
  const rimMount = chooseBuilderAction(
    harness,
    (action) => action.kind === 'choose_mount' && action.payload.mount === 'rim_outer',
  )

  assert.equal(rimMount.payload.mountKind, 'rim')
  assert.equal(rimMount.payload.mountMotion, 'inherits_parent_spin')
  assert.equal(rimMount.payload.sector, 'outer_rim')
  assert.ok(rimMount.payload.summary.includes('inherits parent spin'))
})

test('rim_mount_weapon_inherits_parent_spin', () => {
  const wheel = PART_CATALOG.find((part) => part.id === 'Wheel_Omni')
  const rim = wheel?.mounts.find((mount) => mount.id === 'rim_outer')

  assert.equal(rim?.kind, 'rim')
  assert.equal(rim?.motion, 'inherits_parent_spin')
  assert.ok(rim?.accepts.includes('weapon'))
})

test('allow_clip_mount_can_share_anchor_cell', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const laser = placePartInHarness(harness, 'Weapon_Laser', {
    targetInstanceId: 'part_1',
    mountPredicate: (action) => action.payload.mount === 'top_socket',
  })

  assert.deepEqual(laser.cell, { x: 0, z: 0 })
  assert.equal(laser.mountCollisionPolicy, 'allow_clip_v1')
})

test('reject_overlap_mount_rejects_occupied_cell', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  placePartInHarness(harness, 'Wheel_Omni', {
    targetInstanceId: 'part_1',
    mountPredicate: (action) => action.payload.mount === 'side_front',
  })
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_part' && action.payload.partId === 'Wheel_Small'),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_attach_target' && action.payload.targetInstanceId === 'part_1'),
  )

  const rejected = tryBuilderAction(harness, {
    id: 'forged.side_front',
    kind: 'choose_mount',
    role: 'red',
    payload: {
      scope: 'loadout_builder',
      type: 'choose_mount',
      label: 'Forged occupied side',
      summary: 'Forged occupied side',
      mount: 'side_front',
      mountKind: 'side_socket',
      mountMotion: 'static',
      collisionPolicy: 'reject_overlap',
      sector: 'front',
      attachCell: { x: 0, z: 1 },
    },
  })

  assert.equal(rejected.ok, false)
  assert.equal(rejected.issues[0].code, 'OCCUPIED_ATTACH_CELL')
})

test('below_floor_part_rejected_or_occluded_by_floor_rule', () => {
  const unsafeCatalog = PART_CATALOG.map((part) => part.id === 'Weapon_Laser'
    ? { ...part, footprint: { ...part.footprint, minY: -1 } }
    : part)
  const issues = validateMinimumViableLoadout({
    name: 'below floor weapon',
    rootInstanceId: 'body',
    parts: [
      { instanceId: 'body', partId: 'Body_Light_Frame', cell: { x: 0, z: 0 } },
      { instanceId: 'wheel', partId: 'Wheel_Omni', parentInstanceId: 'body', cell: { x: 1, z: 0 } },
      { instanceId: 'laser', partId: 'Weapon_Laser', parentInstanceId: 'body', cell: { x: 0, z: 0 } },
    ],
  }, unsafeCatalog)

  assert.ok(issues.some((issue) => issue.code === 'PART_BELOW_FLOOR'))
})

test('builder_remove_part_refunds_unconfirmed_draft', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const beforeGold = harness.gold
  const wheel = placePartInHarness(harness, 'Wheel_Omni')
  const afterWheelGold = harness.gold
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'remove_part' && action.payload.instanceId === wheel.instanceId),
  )

  assert.equal(harness.gold, beforeGold)
  assert.equal(harness.gold > afterWheelGold, true)
  assert.equal(harness.inventory.some((item) => item.partId === 'Wheel_Omni'), false)
  assert.equal(harness.buildState.currentDesign.parts.some((part) => part.instanceId === wheel.instanceId), false)
})

test('builder_remove_parent_requires_remove_subtree', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  placePartInHarness(harness, 'Wheel_Omni', { targetInstanceId: 'part_1' })

  const removeRoot = tryBuilderAction(harness, {
    id: 'forged.remove_root',
    kind: 'remove_part',
    role: 'red',
    payload: {
      scope: 'loadout_builder',
      type: 'remove_part',
      label: 'Remove root',
      summary: 'Remove root',
      instanceId: 'part_1',
    },
  })
  const subtreeAction = chooseBuilderAction(
    harness,
    (action) => action.kind === 'remove_subtree' && action.payload.instanceId === 'part_1',
  )

  assert.equal(removeRoot.ok, false)
  assert.equal(removeRoot.issues[0].code, 'PART_HAS_DEPENDENTS')
  assert.notEqual(subtreeAction, undefined)
})

test('builder_remove_subtree_removes_children', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const wheel = placePartInHarness(harness, 'Wheel_Omni', { targetInstanceId: 'part_1' })
  placePartInHarness(harness, 'Weapon_Laser', {
    targetInstanceId: wheel.instanceId,
    mountPredicate: (action) => action.payload.mount === 'rim_outer',
  })
  const beforeRemoveGold = harness.gold
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'remove_subtree' && action.payload.instanceId === wheel.instanceId),
  )

  assert.equal(harness.buildState.currentDesign.parts.map((part) => part.partId).join(','), 'Body_Light_Frame')
  assert.ok(harness.gold > beforeRemoveGold)
  assert.equal(harness.inventory.some((item) => item.partId === 'Weapon_Laser'), false)
})

test('builder_move_part_remounts_with_catalog_mounts', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const wheel = placePartInHarness(harness, 'Wheel_Omni', {
    targetInstanceId: 'part_1',
    mountPredicate: (action) => action.payload.mount === 'side_front',
  })
  const inventoryBeforeMove = JSON.stringify(harness.inventory)
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'move_part' && action.payload.instanceId === wheel.instanceId),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_attach_target' && action.payload.targetInstanceId === 'part_1'),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_mount' && action.payload.mount === 'side_rear'),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_rotation' && action.payload.rotation === 0),
  )

  const moved = harness.buildState.currentDesign.parts.find((part) => part.instanceId === wheel.instanceId)

  assert.deepEqual(moved?.cell, { x: 0, z: -1 })
  assert.equal(moved?.mountId, 'side_rear')
  assert.equal(JSON.stringify(harness.inventory), inventoryBeforeMove)
})

test('builder_rotate_part_uses_server_rotation_action', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) =>
      action.kind === 'rotate_part' &&
      action.payload.instanceId === 'part_1' &&
      action.payload.rotation === 90,
    ),
  )

  assert.equal(harness.buildState.currentDesign.parts[0].rotation, 90)
})

test('agent_cannot_submit_raw_mount_transform', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_part' && action.payload.partId === 'Wheel_Omni'),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_attach_target' && action.payload.targetInstanceId === 'part_1'),
  )

  const rejected = tryBuilderAction(harness, {
    id: 'forged.raw_transform',
    kind: 'choose_mount',
    role: 'red',
    payload: {
      scope: 'loadout_builder',
      type: 'choose_mount',
      label: 'Raw transform',
      summary: 'Raw transform',
      mount: 'side_rear',
      mountKind: 'side_socket',
      mountMotion: 'static',
      collisionPolicy: 'reject_overlap',
      sector: 'rear',
      attachCell: { x: 99, z: 99 },
    },
  })

  assert.equal(rejected.ok, false)
  assert.equal(rejected.issues[0].code, 'RAW_TRANSFORM_REJECTED')
})

test('builder_rejects_raw_transform_payload', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_part' && action.payload.partId === 'Wheel_Omni'),
  )
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) => action.kind === 'choose_attach_target' && action.payload.targetInstanceId === 'part_1'),
  )

  const rejected = tryBuilderAction(harness, {
    id: 'forged.raw_place',
    kind: 'choose_mount',
    role: 'red',
    payload: {
      scope: 'loadout_builder',
      type: 'choose_mount',
      label: 'Raw place',
      summary: 'Raw place',
      mount: 'side_front',
      mountKind: 'side_socket',
      mountMotion: 'static',
      collisionPolicy: 'reject_overlap',
      sector: 'front',
      attachCell: { x: 8, z: 8 },
    },
  })

  assert.equal(rejected.ok, false)
  assert.equal(rejected.issues[0].code, 'RAW_TRANSFORM_REJECTED')
})

test('catalog_weapon_specs_drive_resolver_damage', () => {
  const laser = PART_CATALOG.find((part) => part.id === 'Weapon_Laser')
  const customCatalog = PART_CATALOG.map((part) => part.id === 'Weapon_Laser'
    ? { ...part, stats: { ...part.stats, weapon: 0 }, spec: { ...part.spec, damage: 31 } }
    : part)
  const stats = deriveBotStats({
    name: 'spec weapon',
    blocks: [
      { id: 'body', partId: 'Body_Light_Frame', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'wheel', partId: 'Wheel_Omni', position: [1, 0, 0], rotation: [0, 0, 0] },
      { id: 'laser', partId: 'Weapon_Laser', position: [0, 0, 0], rotation: [0, 0, 0] },
    ],
  }, customCatalog)

  assert.equal(laser?.spec.kind, 'weapon')
  assert.ok(stats.weaponThreat >= 31)
})

test('catalog_mobility_specs_drive_move_budget', () => {
  const customCatalog = PART_CATALOG.map((part) => part.id === 'Wheel_Omni'
    ? { ...part, stats: { ...part.stats, drive: 0 }, spec: { ...part.spec, moveBudget: 18 } }
    : part)
  const stats = deriveBotStats({
    name: 'spec mobility',
    blocks: [
      { id: 'body', partId: 'Body_Light_Frame', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'wheel', partId: 'Wheel_Omni', position: [1, 0, 0], rotation: [0, 0, 0] },
      { id: 'laser', partId: 'Weapon_Laser', position: [0, 0, 0], rotation: [0, 0, 0] },
    ],
  }, customCatalog)

  assert.ok(stats.mobility > 10)
})

test('rim_laser_inherits_spin_and_resolves_sweep', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const wheel = placePartInHarness(harness, 'Wheel_Omni', { targetInstanceId: 'part_1' })
  placePartInHarness(harness, 'Weapon_Laser', {
    targetInstanceId: wheel.instanceId,
    mountPredicate: (action) => action.payload.mount === 'rim_outer',
  })
  const blueprint = botDesignSnapshotToBlueprint(harness.buildState.currentDesign)
  const input = {
    round: 1,
    seed: 'rim-laser',
    red: { blueprint, tactics: normalizeTactics({ aggression: 1, caution: 0.1 }) },
    blue: {
      blueprint: {
        name: 'target',
        blocks: [
          { id: 'body', partId: 'Body_Square_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
          { id: 'wheel', partId: 'Wheel_Small', position: [1, 0, 0], rotation: [0, 0, 0] },
          { id: 'weapon', partId: 'Weapon_Spear', position: [0, 0, 1], rotation: [0, 0, 0] },
        ],
      },
      tactics: normalizeTactics({ aggression: 0.1, caution: 1 }),
    },
  }
  const active = resolveSubmittedGameActions(input, { red: [], blue: [] })

  assert.equal(active.status, 'active')

  const redActions = buildCombatActionSet({
    role: 'red',
    round: 1,
    tick: active.nextTick,
    decisionVersion: 1,
    actionSetId: 'red:combat',
    createdAt: '2026-06-07T00:00:00.000Z',
    catalogVersion: 'part-catalog:v1',
    arenaVersion: 'arena:v1',
    snapshot: active.snapshot,
    controls: deriveControls(blueprint),
  })
  const blueActions = buildCombatActionSet({
    role: 'blue',
    round: 1,
    tick: active.nextTick,
    decisionVersion: 1,
    actionSetId: 'blue:combat',
    createdAt: '2026-06-07T00:00:00.000Z',
    catalogVersion: 'part-catalog:v1',
    arenaVersion: 'arena:v1',
    snapshot: active.snapshot,
    controls: { movement: ['brake'] },
  })
  const redAttack = Object.values(redActions.actions).find((action) => action.kind === 'attack')
  const blueHold = Object.values(blueActions.actions).find((action) => action.kind === 'hold')

  assert.notEqual(redAttack, undefined)
  assert.notEqual(blueHold, undefined)

  const resolved = resolveSubmittedGameActions(input, { red: [redAttack], blue: [blueHold] })
  const replay = resolved.status === 'complete' ? resolved.result.replay : resolved.replay
  const laserFire = replay.events.find(
    (event) => event.type === 'weapon_fire' && event.sourcePartId === 'Weapon_Laser',
  )

  assert.equal(laserFire?.fireMode, 'sweep')
})

test('spinning_laser_uses_sweep_envelope_not_direct_aim', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const wheel = placePartInHarness(harness, 'Wheel_Omni')
  const laser = placePartInHarness(harness, 'Weapon_Laser', {
    targetInstanceId: wheel.instanceId,
    mountPredicate: (action) => action.payload.mount === 'rim_outer',
  })

  assert.equal(PART_CATALOG.find((part) => part.id === 'Weapon_Laser')?.spec.fireMode, 'direct')
  assert.equal(laser.mountMotion, 'inherits_parent_spin')
})

test('packet_uses_catalog_version_and_current_choice_digest', () => {
  const buildState = createInitialLoadoutBuildState('red')
  const actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 100,
    actionSetId: 'red:r1:loadout:choose_part:v100',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold: 100,
    buildState,
  })
  const legalActions = Object.values(actionSet.actions).map(loadoutLegalActionForPacket)

  assert.equal(actionSet.catalogVersion, 'part-catalog:v1')
  assert.equal(typeof actionSet.catalogDigest, 'string')
  assert.equal(legalActions.every((action) => action.catalogDigest === actionSet.catalogDigest), true)
})

test('store_uses_asymmetric_role_specific_rolls', () => {
  const seed = 'session/fight/round'
  const redStore = buildCatalogStore({
    catalog: PART_CATALOG,
    role: 'red',
    round: 1,
    seed,
    gold: 100,
  })
  const blueStore = buildCatalogStore({
    catalog: PART_CATALOG,
    role: 'blue',
    round: 1,
    seed,
    gold: 100,
  })
  const repeatedRedStore = buildCatalogStore({
    catalog: PART_CATALOG,
    role: 'red',
    round: 1,
    seed,
    gold: 100,
  })

  assert.deepEqual(redStore.slots.map((slot) => slot.kind), blueStore.slots.map((slot) => slot.kind))
  assert.deepEqual(redStore.slots.map((slot) => slot.partId), repeatedRedStore.slots.map((slot) => slot.partId))
  assert.notDeepEqual(redStore.slots.map((slot) => slot.partId), blueStore.slots.map((slot) => slot.partId))
})

test('store_has_no_dedicated_rare_signature_style_slot', () => {
  const store = buildCatalogStore({
    catalog: PART_CATALOG,
    role: 'red',
    round: 2,
    seed: 'rare-style-store',
    gold: 100,
  })
  const partsById = new Map(PART_CATALOG.map((part) => [part.id, part]))

  assert.deepEqual(store.slots.map((slot) => slot.kind), [
    'weapon',
    'weapon',
    'utility',
    'utility',
    'armor',
    'armor',
    'advanced_mobility',
    'wildcard',
    'wildcard',
    'wildcard',
  ])
  assert.equal(store.slots.some((slot) => slot.kind.includes('style') || slot.kind.includes('rare')), false)

  for (const slot of store.slots) {
    const part = partsById.get(slot.partId)

    if (part?.category === 'style' || (part?.rarity !== 'normal' && part?.signatureEffect)) {
      assert.equal(slot.kind, 'wildcard')
    }
  }
})

test('store_foundation_parts_are_always_available', () => {
  const redStore = buildCatalogStore({
    catalog: PART_CATALOG,
    role: 'red',
    round: 3,
    seed: 'foundation-store',
    gold: 15,
  })
  const blueStore = buildCatalogStore({
    catalog: PART_CATALOG,
    role: 'blue',
    round: 3,
    seed: 'foundation-store',
    gold: 15,
  })
  const requiredFoundation = [
    'Body_Square_Small',
    'Body_Light_Frame',
    'Frame_Strut',
    'Mount_Plate',
    'Wheel_Small',
    'Tread_Light',
    'Weapon_Spear',
  ]

  for (const partId of requiredFoundation) {
    assert.ok(redStore.foundationPartIds.includes(partId), `${partId} missing from red foundation`)
    assert.ok(blueStore.foundationPartIds.includes(partId), `${partId} missing from blue foundation`)
    assert.ok(redStore.offeredPartIds.includes(partId), `${partId} missing from red offers`)
    assert.ok(blueStore.offeredPartIds.includes(partId), `${partId} missing from blue offers`)
  }
})

test('store_rails_limit_rare_signature_and_keep_viability', () => {
  const gold = 18
  const store = buildCatalogStore({
    catalog: PART_CATALOG,
    role: 'blue',
    round: 4,
    seed: 'viability-store',
    gold,
  })
  const partsById = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const offeredParts = store.offeredPartIds.map((partId) => partsById.get(partId)).filter(Boolean)
  const rareSignatureSlots = store.slots.filter((slot) => {
    const part = partsById.get(slot.partId)

    return part?.rarity !== 'normal' && part?.signatureEffect
  })
  const totalRareSignatureCost = rareSignatureSlots.reduce(
    (total, slot) => total + (partsById.get(slot.partId)?.cost ?? 0),
    0,
  )

  assert.ok(offeredParts.some((part) => part.category === 'weapon' && part.cost <= gold))
  assert.ok(offeredParts.some((part) =>
    part.category === 'mobility' &&
    part.cost <= gold &&
    part.spec.kind === 'mobility' &&
    part.spec.moveBudget > 0,
  ))
  assert.ok(rareSignatureSlots.length <= 1)
  assert.ok(totalRareSignatureCost <= RARE_SIGNATURE_STORE_MAX_COST)
})

test('loadout_action_set_exposes_role_store_to_packet_contract', () => {
  const actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 101,
    actionSetId: 'red:r1:loadout:store:v101',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold: 100,
    storeSeed: 'packet-store',
  })

  assert.equal(actionSet.catalogStore?.role, 'red')
  assert.equal(actionSet.catalogStore?.slots.length, 10)
  assert.ok(actionSet.catalogStore?.offeredPartIds.includes('Body_Square_Small'))
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
        part.visual.detailBudget &&
        part.visual.renderProfile &&
        part.visual.textureProfile &&
        part.visual.damageProfile &&
        part.visual.animationProfile &&
        part.visual.qualityStatus,
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
  assert.equal(visualFamilyFor('Weapon_ChainWhip'), 'chain_whip')
  assert.equal(visualFamilyFor('Weapon_Shredder'), 'shredder')
  assert.equal(visualFamilyFor('Weapon_Turret'), 'turret')
  assert.equal(visualFamilyFor('Wheel_Mecanum'), 'wheel')
  assert.equal(visualFamilyFor('Wheel_Omni'), 'wheel')
  assert.equal(visualFamilyFor('Utility_EnergyCore'), 'energy_core')
  assert.equal(visualFamilyFor('Utility_AIModule'), 'ai_module')
  assert.equal(visualFamilyFor('Utility_Radar'), 'radar')
  assert.equal(visualFamilyFor('Utility_CoolantTank'), 'coolant_tank')
  assert.equal(visualFamilyFor('Utility_FuelTank'), 'fuel_tank')
  assert.equal(visualFamilyFor('Style_LightBar'), 'light_bar')
  assert.equal(visualFamilyFor('Style_DragonHead'), 'dragon_head')
  assert.equal(visualFamilyFor('Style_Crown'), 'crown')
  assert.equal(visualFamilyFor('Style_Neon'), 'neon')
  assert.equal(visualFamilyFor('Style_Wings'), 'wings')
  assert.equal(visualFamilyFor('Style_Antenna'), 'antenna')
  assert.equal(visualFamilyFor('Style_Horns'), 'horns')
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

test('combat action builder redacts canonical payloads and applies tactical-anchor legality', () => {
  const redSet = buildTacticalCombatActionSet({ role: 'red' })
  const blueSet = buildTacticalCombatActionSet({ role: 'blue' })
  const redDash = findCombatAction(
    redSet,
    (command) => command.move === 'dash_forward' && command.weaponA !== 'fire',
  )
  const blueDash = findCombatAction(
    blueSet,
    (command) => command.move === 'dash_forward' && command.weaponA !== 'fire',
  )
  const redDashPacket = combatLegalActionForPacket(redDash)
  const blueDashPacket = combatLegalActionForPacket(blueDash)
  const redPath = pathKeys(redDashPacket.preview)
  const bluePath = pathKeys(blueDashPacket.preview)

  assert.equal(JSON.stringify(Object.values(redSet.actions).map(combatLegalActionForPacket)).includes('payload'), false)
  assert.ok(redDashPacket.preview.riskTags.includes('occupied_anchor_conflict'))
  assert.ok([...redPath].some((cell) => bluePath.has(cell)))

  const blockedRedSet = buildTacticalCombatActionSet({
    role: 'red',
    arena: tacticalBlockedArena,
  })
  const farRedSet = buildTacticalCombatActionSet({
    role: 'red',
    redPosition: [-4, 0, 0],
    bluePosition: [4, 0, 0],
  })

  assert.equal(hasCombatAction(blockedRedSet, (command) => command.move === 'dash_forward'), false)
  assert.equal(hasCombatAction(blockedRedSet, (command) => command.weaponA === 'fire'), false)
  assert.equal(hasCombatAction(farRedSet, (command) => command.weaponA === 'fire'), false)
})

test('resolveSubmittedGameActions keeps both-hold combat inert and replay-valid', () => {
  const resolution = resolveSubmittedGameActions({
    round: 1,
    seed: 'canonical-both-hold',
    red: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    blue: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: tacticalRuntimeArena,
  }, {
    red: [canonicalCombatAction('red', 1, { move: 'brake', weaponA: 'hold' })],
    blue: [canonicalCombatAction('blue', 1, { move: 'brake', weaponA: 'hold' })],
  })

  assert.equal(resolution.status, 'active')
  assert.equal(resolution.nextTick, 2)
  assert.equal(resolution.snapshot.red.position[0], -6)
  assert.equal(resolution.snapshot.blue.position[0], 6)
  assert.equal(resolution.replay.events.some((event) => event.type === 'move'), false)
  assert.equal(resolution.replay.events.some((event) => event.type === 'weapon_fire'), false)
  assert.equal(validateReplayTimeline(resolution.replay), true)
})

test('resolveSubmittedGameActions deterministically blocks same-anchor and crossing-path conflicts', () => {
  const conflictInput = {
    round: 1,
    seed: 'canonical-anchor-conflicts',
    red: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({ movementPolicy: 'close' }),
    },
    blue: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({ movementPolicy: 'close' }),
    },
    arena: tacticalRuntimeArena,
  }
  const sameAnchor = resolveSubmittedGameActions(conflictInput, {
    red: canonicalCombatActions('red', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'dash_forward' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'dash_forward' },
    ]),
  })
  const crossingPath = resolveSubmittedGameActions(conflictInput, {
    red: canonicalCombatActions('red', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'forward' },
      { move: 'dash_forward' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'forward' },
      { move: 'dash_forward' },
    ]),
  })

  assert.equal(sameAnchor.status, 'active')
  assert.equal(sameAnchor.snapshot.red.position[0], -2)
  assert.equal(sameAnchor.snapshot.blue.position[0], 2)
  assert.equal(sameAnchor.log.some((entry) => entry.includes('same final anchor')), true)
  assert.equal(crossingPath.status, 'active')
  assert.equal(crossingPath.snapshot.red.position[0], -1)
  assert.equal(crossingPath.snapshot.blue.position[0], 1)
  assert.equal(crossingPath.log.some((entry) => entry.includes('anchor paths crossed')), true)
})

test('resolveSubmittedGameActions fires only after final-pose range and line-of-sight checks', () => {
  const rangeInput = {
    round: 1,
    seed: 'canonical-target-escapes-range',
    red: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({ movementPolicy: 'close', weaponCadence: 'sustained' }),
    },
    blue: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({ movementPolicy: 'close' }),
    },
    arena: tacticalRuntimeArena,
  }
  const rangeResolution = resolveSubmittedGameActions(rangeInput, {
    red: canonicalCombatActions('red', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'forward' },
      { weaponA: 'fire' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'forward' },
      { move: 'dash_backward' },
    ]),
  })
  const losResolution = resolveSubmittedGameActions({
    ...rangeInput,
    seed: 'canonical-final-los-blocked',
    arena: tacticalRuntimeBlockedArena,
  }, {
    red: canonicalCombatActions('red', [
      { move: 'dash_forward' },
      { weaponA: 'fire' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'dash_forward' },
      { move: 'brake' },
    ]),
  })

  assert.equal(
    rangeResolution.replay.events.some(
      (event) => event.type === 'weapon_fire' && event.bot === 'red' && Math.trunc(event.t) === 4,
    ),
    false,
  )
  assert.equal(
    losResolution.replay.events.some((event) => event.type === 'weapon_fire' && event.bot === 'red'),
    false,
  )
})

test('resolveSubmittedGameActions suppresses same-tick fire from a bot destroyed earlier in weapon order', () => {
  const heavyRedWeapon = {
    name: 'Overloaded Spinner',
    blocks: [
      { id: 'spinnerA', partId: 'Weapon_Spinner_Large', position: [0, 0, 0], rotation: [0, 0, 0] },
      { id: 'spinnerB', partId: 'Weapon_Spinner_Large', position: [1, 0, 0], rotation: [0, 0, 0] },
      { id: 'spinnerC', partId: 'Weapon_Spinner_Large', position: [-1, 0, 0], rotation: [0, 0, 0] },
    ],
  }
  const fragileBlueWeapon = {
    name: 'Fragile Armed Target',
    blocks: [
      { id: 'spinner', partId: 'Weapon_Spinner_Small', position: [0, 0, 0], rotation: [0, 0, 0] },
    ],
  }
  const resolution = resolveSubmittedGameActions({
    round: 1,
    seed: 'canonical-destroyed-before-fire',
    red: {
      blueprint: heavyRedWeapon,
      tactics: normalizeTactics({ movementPolicy: 'close', weaponCadence: 'sustained' }),
    },
    blue: {
      blueprint: fragileBlueWeapon,
      tactics: normalizeTactics({ movementPolicy: 'close', weaponCadence: 'sustained' }),
    },
    arena: tacticalRuntimeArena,
  }, {
    red: canonicalCombatActions('red', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'forward' },
      { weaponA: 'fire' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'forward' },
      { weaponA: 'fire' },
    ]),
  })

  assert.equal(resolution.status, 'complete')
  assert.equal(
    resolution.result.replay.events.some((event) => event.type === 'knockout' && event.bot === 'blue'),
    true,
  )
  assert.equal(
    resolution.result.replay.events.some((event) => event.type === 'weapon_fire' && event.bot === 'blue'),
    false,
  )
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

  const observerSubmission = await session.submitGameMasterAction('observer_red', {
    action: 'submit_game_action',
    actionSetId: 'observer-cannot-lock',
    decisionVersion: 1,
    actionId: 'observer-cannot-lock',
  })

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

test('sessions require both roles before opening loadout actions', async () => {
  const session = await createTestSession()
  const red = await session.claimRole(claimRequest('red'))

  assert.equal(red.ok, true)
  assert.equal(red.value.state.phase, 'waiting_for_agents')

  const earlySubmission = await session.submitGameMasterAction(red.value.roleToken, {
    action: 'submit_game_action',
    actionSetId: 'red:r1:loadout:not-open',
    decisionVersion: 1,
    actionId: 'loadout.red.r1.confirm',
  })

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

  const sameIdentityResume = await session.bootstrapRole('red', 'claim_red', {
    agentName: 'external-red',
    teamIdentity: testTeamIdentity('red'),
  })

  assert.equal(sameIdentityResume.ok, true)
  assert.equal(sameIdentityResume.value.claimedNow, false)

  const mutatedIdentityResume = await session.bootstrapRole('red', 'claim_red', {
    agentName: 'external-red',
    teamIdentity: {
      ...testTeamIdentity('red'),
      name: 'Different Red Team',
    },
  })

  assert.equal(mutatedIdentityResume.ok, false)
  assert.equal(mutatedIdentityResume.error.code, 'INVALID_REQUEST')

  const duplicate = await session.bootstrapRole('red', 'claim_blue', {})

  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.error.code, 'ROLE_ALREADY_CLAIMED')

  const privateState = await session.getRoleStateForToken('claim_red')

  assert.equal(privateState.ok, true)
  assert.equal(privateState.value.role, 'red')

  const blue = await session.bootstrapRole('blue', 'claim_blue', {
    agentName: 'external-blue',
    teamIdentity: testTeamIdentity('blue'),
  })

  assert.equal(blue.ok, true)
  assert.equal(blue.value.state.phase, 'submission_phase')
  assert.equal(blue.value.state.roundPlan.planSeconds, 120)
  assert.equal(blue.value.nextAction, 'build_bot')
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

test('post-fight reflections are accepted only after completed fights and consumed into shared debrief', async () => {
  const session = await createTestSession('s_reflection_lifecycle')
  const refereeToken = session.createResponse().refereeToken
  const { redToken, blueToken } = await claimBothRoles(session)
  const earlyPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(earlyPacket.ok, true)

  const early = await session.submitPostFightReflection(
    redToken,
    postFightReflection('red', {
      decisionVersion: earlyPacket.value.decisionVersion,
    }),
  )

  assert.equal(early.ok, false)
  assert.equal(early.error.code, 'PHASE_CLOSED')

  const stored = session.exportState()
  stored.phase = 'round_review'
  stored.roundPlan = undefined
  stored.combat = undefined
  stored.activeActionSets = undefined
  stored.lockedActions = undefined
  stored.replay = {
    ...replayForCompletedFight(),
    teamIdentities: {
      red: expectedLegacyTeamIdentity('red'),
      blue: expectedLegacyTeamIdentity('blue'),
    },
    botBlueprints: {
      red: validSpinnerSubmission.blueprint,
      blue: validSpinnerSubmission.blueprint,
    },
  }
  stored.lastResult = {
    winner: 'red',
    reason: 'Red disabled Blue.',
    damage: { red: 0, blue: 40 },
    remainingHealth: { red: 40, blue: 0 },
  }
  stored.fightDossier = completedFightDossier('s_reflection_lifecycle')

  const loaded = SessionCoordinator.fromState(stored, {
    clock: () => '2026-06-03T00:02:00.000Z',
  })
  const reviewPacket = await loaded.getGameMasterPacketForToken(redToken)

  assert.equal(reviewPacket.ok, true)
  assert.equal(reviewPacket.value.nextAction, 'submit_reflection')
  assert.equal(reviewPacket.value.fightId, 'fight_1')

  const secret = 'SECRET_RAW_REFLECTION_DO_NOT_LEAK'
  const submitted = await loaded.submitPostFightReflection(
    redToken,
    postFightReflection('red', {
      decisionVersion: reviewPacket.value.decisionVersion,
      claims: {
        perceivedWinReason: `${secret} net won the fight`,
        ownWeaknesses: [`${secret} weak drive`],
        opponentThreats: [`${secret} threat`],
        suggestedDesignChanges: [`${secret} design`],
        suggestedTacticalChanges: [`${secret} tactic`],
      },
    }),
  )

  assert.equal(submitted.ok, true)
  assert.equal(submitted.value.packet.nextAction, 'wait_for_debrief')

  const afterSubmit = loaded.exportState()
  const [storedReflection] = afterSubmit.reflections

  assert.equal(storedReflection.status, 'private_pending')
  assert.equal(storedReflection.reflection.claims.ownWeaknesses[0].includes(secret), true)

  const blueState = await loaded.getRoleStateForToken(blueToken)
  const publicState = loaded.getPublicState()

  assert.equal(blueState.ok, true)
  assert.equal(JSON.stringify(blueState.value).includes(secret), false)
  assert.equal(JSON.stringify(publicState).includes(secret), false)

  const advanced = await loaded.advanceRound(refereeToken)

  assert.equal(advanced.ok, true)
  assert.equal(advanced.value.publicState.phase, 'submission_phase')

  const afterAdvance = loaded.exportState()
  const consumedReflection = afterAdvance.reflections[0]

  assert.equal(consumedReflection.status, 'consumed_into_shared_debrief')
  assert.equal(consumedReflection.debriefId, afterAdvance.sharedDebrief.debriefId)
  assert.equal(afterAdvance.fightDossier.fights[0].stats.damageDealt.red, 40)
  assert.equal(JSON.stringify(afterAdvance.sharedDebrief).includes(secret), false)

  const redNext = await loaded.getGameMasterPacketForToken(redToken)
  const blueNext = await loaded.getGameMasterPacketForToken(blueToken)

  assert.equal(redNext.ok, true)
  assert.equal(blueNext.ok, true)
  assert.deepEqual(redNext.value.sharedDebrief, blueNext.value.sharedDebrief)
  assert.equal(JSON.stringify(redNext.value.sharedDebrief).includes(secret), false)
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

test('post-fight reflection lifecycle is private pending until debrief consumption', async () => {
  const session = await createTestSession('s_reflection_lifecycle')
  const { redToken, blueToken } = await claimBothRoles(session)
  const earlyReflection = await session.submitPostFightReflection(
    redToken,
    postFightReflection('red'),
  )

  assert.equal(earlyReflection.ok, false)
  assert.equal(earlyReflection.error.code, 'PHASE_CLOSED')

  const stored = session.exportState()

  stored.phase = 'round_review'
  stored.lastResult = {
    winner: 'red',
    reason: 'Red disabled Blue.',
    damage: { red: 0, blue: 40 },
    remainingHealth: { red: 40, blue: 0 },
  }
  stored.replay = {
    ...replayForCompletedFight(),
    teamIdentities: {
      red: expectedLegacyTeamIdentity('red'),
      blue: expectedLegacyTeamIdentity('blue'),
    },
    botBlueprints: {
      red: validSpinnerSubmission.blueprint,
      blue: validSpinnerSubmission.blueprint,
    },
  }
  stored.fightDossier = completedFightDossier('s_reflection_lifecycle')

  const loaded = SessionCoordinator.fromState(stored, {
    clock: () => '2026-06-03T00:02:00.000Z',
  })
  const redStateBeforeReflection = await loaded.getRoleStateForToken(redToken)
  const reflection = await loaded.submitPostFightReflection(
    redToken,
    postFightReflection('red', {
      decisionVersion: redStateBeforeReflection.value.gameMaster.decisionVersion,
    }),
  )

  assert.equal(reflection.ok, true)
  assert.equal(reflection.value.packet.nextAction, 'wait_for_debrief')
  assert.equal(loaded.exportState().reflections[0].status, 'private_pending')

  const blueState = await loaded.getRoleStateForToken(blueToken)
  const publicState = loaded.getPublicState()

  assert.equal(JSON.stringify(blueState.value).includes('secret weak drive note'), false)
  assert.equal(JSON.stringify(publicState).includes('secret weak drive note'), false)

  const debrief = loaded.buildContinuationDebrief()
  const exported = loaded.exportState()
  const debriefJson = JSON.stringify(debrief)

  assert.equal(debrief.ok, true)
  assert.equal(exported.reflections[0].status, 'consumed_into_shared_debrief')
  assert.equal(exported.reflections[0].debriefId, debrief.value.sharedDebrief.debriefId)
  assert.equal(debriefJson.includes('secret weak drive note'), false)
  assert.equal(
    debrief.value.sharedDebrief.evidence.some((entry) => entry.type === 'private_reflection_count'),
    true,
  )

  const lateReflection = await loaded.submitPostFightReflection(
    blueToken,
    postFightReflection('blue', {
      decisionVersion: blueState.value.gameMaster.decisionVersion,
    }),
  )
  const afterLateReflection = loaded.exportState()

  assert.equal(lateReflection.ok, false)
  assert.equal(lateReflection.error.code, 'PHASE_CLOSED')
  assert.equal(
    afterLateReflection.reflections.some((entry) => entry.status === 'private_pending'),
    false,
  )

  const completedStored = loaded.exportState()
  completedStored.phase = 'session_complete'
  const completed = SessionCoordinator.fromState(completedStored, {
    clock: () => '2026-06-03T00:04:00.000Z',
  })
  const completedPacket = await completed.getGameMasterPacketForToken(blueToken)

  assert.equal(completedPacket.ok, true)

  const lateCompletedReflection = await completed.submitPostFightReflection(
    blueToken,
    postFightReflection('blue', {
      decisionVersion: completedPacket.value.decisionVersion,
    }),
  )

  assert.equal(lateCompletedReflection.ok, false)
  assert.equal(lateCompletedReflection.error.code, 'PHASE_CLOSED')
  assert.equal(
    completed.exportState().reflections.some((entry) => entry.status === 'private_pending'),
    false,
  )
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

test('session resolves after both confirmed loadouts while keeping public state redacted', async () => {
  const session = await createTestSession()
  const { redToken, blueToken } = await claimBothRoles(session)
  const redPacket = await session.getGameMasterPacketForToken(redToken)
  const bluePacket = await session.getGameMasterPacketForToken(blueToken)

  assert.equal(redPacket.ok, true)
  assert.equal(bluePacket.ok, true)

  const redSubmission = await confirmMinimumViableLoadout(session, redToken, redPacket.value)

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.publicState.phase, 'submission_phase')
  assert.equal(redSubmission.value.publicState.roles.red.submitted, true)
  assert.equal(redSubmission.value.publicState.roles.blue.submitted, false)
  assert.equal(redSubmission.value.publicState.replayAvailable, false)
  assert.equal(redSubmission.value.publicState.roundPlan.planSeconds, 120)
  assert.equal(redSubmission.value.publicState.roundPlan.deadlineAt, '2026-06-03T00:02:00.000Z')

  const preReplay = session.getReplay()

  assert.equal(preReplay.ok, false)
  assert.equal(preReplay.error.code, 'REPLAY_NOT_AVAILABLE')

  const blueSubmission = await confirmMinimumViableLoadout(session, blueToken, bluePacket.value)
  const blueState = await session.getRoleStateForToken(blueToken)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'combat_turn')
  assert.equal(blueSubmission.value.publicState.replayAvailable, false)
  assert.equal(blueSubmission.value.publicState.roundPlan, undefined)
  assert.equal(blueSubmission.value.publicState.combat.tick, 1)
  assert.equal(blueState.ok, true)
  assert.equal(blueState.value.combat.turnSeconds, 120)
  assert.equal(blueState.value.combat.self.role, 'blue')
  assert.equal(blueState.value.combat.opponent.role, 'red')
  assert.equal(blueState.value.combat.decision.tick, 1)
  assert.equal(blueState.value.combat.decision.availableCommands.movement.includes('forward'), true)
  assert.equal(blueState.value.combat.decision.range.band, 'long')
  assert.deepEqual(blueState.value.combat.decision.positioning.selfCell, { x: 6, z: 0 })
  assert.deepEqual(blueState.value.combat.decision.positioning.opponentCell, { x: -6, z: 0 })
  assert.equal(blueState.value.combat.decision.positioning.distanceCells, 12)
  assert.equal(blueState.value.combat.decision.positioning.bearingToOpponent, 'west')
  assert.equal(blueState.value.combat.decision.hazards.active.includes('floor_saw'), true)
  assert.equal(blueState.value.combat.decision.arenaPressure.selfNearHazard, false)
  assert.ok(blueState.value.combat.decision.movementGuidance.approach.length > 0)
  assert.equal('decision' in blueSubmission.value.publicState.combat, false)
  assert.equal('awardOptions' in blueSubmission.value.publicState, false)

  const resolved = await resolveLiveCombat(session, redToken, blueToken)

  assert.equal(resolved.value.publicState.phase, 'round_review')
  assert.equal(resolved.value.publicState.replayAvailable, true)
  assert.ok(resolved.value.publicState.lastResult)

  const replay = session.getReplay()

  assert.equal(replay.ok, true)
  assert.equal(replay.value.botBlueprints.red.name, 'red loadout')
  assert.equal(replay.value.botBlueprints.blue.name, 'blue loadout')
  assert.deepEqual(replay.value.teamIdentities.red, expectedLegacyTeamIdentity('red'))
  assert.deepEqual(replay.value.teamIdentities.blue, expectedLegacyTeamIdentity('blue'))
  assert.equal(validateReplayTimeline(replay.value), true)

  const publicJson = JSON.stringify(resolved.value.publicState)
  assert.equal(publicJson.includes('claim_red'), false)
  assert.equal(publicJson.includes('role_blue'), false)
  assert.equal(publicJson.includes('Body_Light_Frame'), false)
  assert.equal(publicJson.includes('commands'), false)

  const redState = await session.getRoleStateForToken(redToken)
  assert.equal(redState.ok, true)
  assert.equal(redState.value.ownLoadout.blueprint.name, 'red loadout')
  assert.equal(JSON.stringify(redState.value.opponent).includes('red loadout'), false)
})

test('session applies no-op turn commands when combat turn deadline expires', async () => {
  let now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_turn_timeout', {
    clock: () => now,
  })
  const { redToken, blueToken } = await claimBothRoles(session)

  const { blueSubmission } = await confirmBothMinimumLoadouts(session, redToken, blueToken)

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
  const redPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(redPacket.ok, true)

  const redSubmission = await placePartFromCatalog(session, redToken, redPacket.value, 'Body_Light_Frame')

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.publicState.roles.red.submitted, false)

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

  await confirmBothMinimumLoadouts(session, redToken, blueToken)

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
  stored.roles.red.loadoutConfirmedAt = '2026-06-03T00:01:00.000Z'
  stored.roles.blue.loadoutConfirmedAt = '2026-06-03T00:01:00.000Z'
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
  assert.equal(exported.roles.red.loadoutConfirmedAt, undefined)
  assert.equal(exported.roles.blue.loadoutConfirmedAt, undefined)
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

  await confirmBothMinimumLoadouts(
    maxRoundSession,
    maxRoundTokens.redToken,
    maxRoundTokens.blueToken,
  )
  const maxRoundResolved = await resolveLiveCombat(
    maxRoundSession,
    maxRoundTokens.redToken,
    maxRoundTokens.blueToken,
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

test('session coordinator does not expose Slice 7 completion actions in Slice 6', () => {
  assert.equal('saveCompletedSession' in SessionCoordinator.prototype, false)
  assert.equal('continueChampionSession' in SessionCoordinator.prototype, false)
  assert.equal('quitCompletedSession' in SessionCoordinator.prototype, false)
})
