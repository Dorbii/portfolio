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
  deriveMachineCapabilities,
  damageCategoryPriorityFor,
  findFirstAliveBehaviorPart,
  getAliveBehaviorParts,
  hasArenaLineOfSight,
  hasAliveBehaviorPart,
  hazardsAtPosition,
  applyLoadoutAction,
  buildAgentBoardView,
  buildCompactBuildView,
  canonicalPartIdFromCompact,
  resolveCompactBuildAction,
  compactPartAlias,
  compactSystemCoreAlias,
  buildCatalogStore,
  buildLoadoutActionSet,
  buildCombatActionSet,
  buildFightDossier,
  botDesignSnapshotToLegacyBotBlueprintProjection,
  combatActionCommand,
  combatLegalActionForPacket,
  normalizeCombatRoundPlanSubmission,
  resolveLockstepCombatRound,
  validateCombatRoundPlanAgainstBoard,
  buildSharedDebrief,
  createInitialMachineDesign,
  createInitialLoadoutBuildState,
  createLoadoutBuildStateFromStoredDesign,
  LOADOUT_PART_LIMIT,
  loadoutBuildStateLegacyDesign,
  loadoutLegalActionForPacket,
  machineWeaponCanHit,
  machineDesignToLegacyBotBlueprintProjection,
  machineDesignToLegacyBotDesignSnapshotProjection,
  pathHazards,
  RARE_SIGNATURE_STORE_MAX_COST,
  resolveCombat,
  resolveMountPose,
  resolveSubmittedCombat,
  resolveSubmittedGameActions,
  stablePartOrder,
  SYSTEM_MACHINE_CORE_DEFINITION,
  validateLegacyMinimumViableLoadout,
  validateMachinePhysicalLegality,
  validateMachineTree,
  validateMountPoseInput,
  worldToArenaCell,
} from '../.test-build/packages/sim/src/index.js'
import {
  SessionCoordinator,
  calculateInterest,
} from '../.test-build/apps/worker/src/session.js'
import {
  normalizeCompactBuildActionSubmission,
} from '../.test-build/packages/schemas/src/index.js'
import { createInitialSessionState } from '../.test-build/apps/worker/src/sessionCreation.js'
import { resetStoredRoleClaim } from '../.test-build/apps/worker/src/sessionRoleReset.js'
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

function lockstepStats(overrides = {}) {
  return {
    armor: 0,
    chaos: 0,
    control: 0,
    durability: 30,
    footprint: 1,
    mass: 8,
    mobility: 12,
    stability: 3,
    style: 0,
    traction: 4,
    weaponThreat: 12,
    ...overrides,
  }
}

function combatRoundPlan(role, steps, overrides = {}) {
  return {
    role,
    round: overrides.round ?? 1,
    decisionVersion: overrides.decisionVersion ?? 1,
    steps,
    submittedAt: overrides.submittedAt ?? '2026-06-03T00:00:00.000Z',
  }
}

function lockstepBudget(overrides = {}) {
  return {
    movement: 6,
    actionTime: 4,
    weaponCooldowns: {},
    ...overrides,
  }
}

function lockstepCombatInput(snapshot, plans, overrides = {}) {
  return {
    round: overrides.round ?? 1,
    roundIndex: overrides.roundIndex ?? snapshot.tick,
    seed: overrides.seed ?? 'lockstep-test-seed',
    arena: snapshot.arena,
    red: {
      blueprint: overrides.redBlueprint ?? bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    blue: {
      blueprint: overrides.blueBlueprint ?? bareBodyBlueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    snapshot,
    plans,
    budgets: overrides.budgets ?? {
      red: lockstepBudget(),
      blue: lockstepBudget(),
    },
  }
}

function expectActiveLockstepResolution(resolution) {
  assert.equal(resolution.status, 'active')
  return resolution
}

function replayEventsForResolution(resolution) {
  return resolution.status === 'active'
    ? resolution.events
    : resolution.result.replay.events
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

function buildMachineCapabilityCombatActionSet({
  role = 'red',
  machine,
  arena = tacticalOpenArena,
  redPosition = [-1, 0, 0],
  bluePosition = [1, 0, 0],
  tick = 1,
}) {
  return buildCombatActionSet({
    role,
    round: 1,
    tick,
    decisionVersion: role === 'red' ? 21 : 22,
    actionSetId: `${role}:machine:r1:turn_${tick}`,
    createdAt: '2026-06-07T00:00:00.000Z',
    catalogVersion: 'part-catalog:v1',
    arenaVersion: 'arena:v1:test',
    snapshot: combatSnapshot(arena, redPosition, bluePosition, { tick }),
    machineCapabilities: deriveMachineCapabilities(machine),
  })
}

function combatCommands(actionSet) {
  return Object.values(actionSet.actions)
    .map((action) => combatActionCommand(action))
    .filter(Boolean)
}

function combatMoves(actionSet) {
  return combatCommands(actionSet)
    .map((command) => command.move)
    .filter(Boolean)
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

async function submitPacketAction(session, token, packet, action, parameters) {
  const actionParameters = parameters ?? action.parameterExamples?.[0]
  const submitted = await session.submitGameMasterAction(
    token,
    {
      ...actionSubmissionFromPacket(packet, action.id),
      ...(actionParameters ? { parameters: actionParameters } : {}),
    },
  )

  assert.equal(submitted.ok, true, submitted.ok ? undefined : JSON.stringify(submitted.error))

  return submitted
}

function combatPlanSubmissionFromPacket(packet, steps = [{ kind: 'end_turn' }]) {
  assert.notEqual(packet.combat, undefined)

  return {
    action: 'submit_combat_round_plan',
    round: packet.combat.round,
    decisionVersion: packet.combat.decisionVersion,
    steps,
  }
}

async function submitCombatPlanFromPacket(session, token, packet, steps = [{ kind: 'end_turn' }]) {
  const submitted = await session.submitCombatRoundPlan(
    token,
    combatPlanSubmissionFromPacket(packet, steps),
  )

  assert.equal(submitted.ok, true, submitted.ok ? undefined : JSON.stringify(submitted.error))

  return submitted
}

async function submitLatestCombatPlan(session, token, steps = [{ kind: 'end_turn' }]) {
  const packet = await session.getGameMasterPacketForToken(token)

  assert.equal(packet.ok, true, packet.ok ? undefined : JSON.stringify(packet.error))

  return submitCombatPlanFromPacket(session, token, packet.value, steps)
}

async function submitSurrenderFromLatestPacket(session, token) {
  const packet = await session.getGameMasterPacketForToken(token)

  assert.equal(packet.ok, true, packet.ok ? undefined : JSON.stringify(packet.error))

  return submitPacketAction(
    session,
    token,
    packet.value,
    findLegalAction(packet.value, (action) => action.kind === 'surrender'),
  )
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
    findLegalAction(submitted.value.packet, (action) => action.kind === 'propose_mount_pose'),
    defaultMountPoseParameters(
      findLegalAction(submitted.value.packet, (action) => action.kind === 'propose_mount_pose'),
    ),
  )

  return submitted
}

function defaultMountPoseParameters(action, overrides = {}) {
  assert.equal(action.kind, 'propose_mount_pose')
  assert.ok(action.parameterExamples?.length > 0)

  return {
    ...action.parameterExamples[0],
    ...overrides,
  }
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

function createLegacyBuilderHarness(gold = 200, catalog = PART_CATALOG) {
  const legacyDraft = {
    name: 'red legacy loadout',
    parts: [],
  }

  return {
    buildState: {
      step: 'choose_part',
      catalogVersion: 'part-catalog:v1',
      currentDesign: {
        version: 'legacy-bot-design:v1',
        design: legacyDraft,
      },
      legacyDraft,
    },
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

function machineTransform(overrides = {}) {
  return {
    position: overrides.position ?? [0, 0, 0],
    rotation: overrides.rotation ?? [0, 0, 0],
    scale: overrides.scale ?? [1, 1, 1],
    ...(overrides.orientation ? { orientation: overrides.orientation } : {}),
  }
}

function machineBasis(overrides = {}) {
  return {
    right: overrides.right ?? [1, 0, 0],
    up: overrides.up ?? [0, 1, 0],
    forward: overrides.forward ?? [0, 0, 1],
  }
}

function machinePart(instanceId, overrides = {}) {
  return {
    instanceId,
    definitionId: overrides.definitionId ?? `catalog:${instanceId}`,
    source: overrides.source ?? 'catalog_part',
    transform: overrides.transform ?? machineTransform(),
    ...(overrides.immutable !== undefined ? { immutable: overrides.immutable } : {}),
  }
}

function machineAttachment(parentInstanceId, childInstanceId, overrides = {}) {
  return {
    parentInstanceId,
    childInstanceId,
    ...(overrides.mountId ? { mountId: overrides.mountId } : {}),
    transform: overrides.transform ?? machineTransform(),
  }
}

function machineWithLaser(role, instanceId, orientation) {
  const initial = createInitialMachineDesign(role)

  return {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart(instanceId, {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({ orientation }),
      }),
    ],
    attachments: [
      machineAttachment('core', instanceId, { mountId: 'core_shell' }),
    ],
  }
}

function machineWithCatalogPart(role, instanceId, definitionId, orientation = machineBasis()) {
  const initial = createInitialMachineDesign(role)

  return {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart(instanceId, {
        definitionId,
        transform: machineTransform({ orientation }),
      }),
    ],
    attachments: [
      machineAttachment('core', instanceId, { mountId: 'core_shell' }),
    ],
  }
}

function machineWithRuntime(machine, runtime) {
  return {
    ...machine,
    runtime,
  }
}

function machineCombatInput({
  redMachine,
  blueMachine = createInitialMachineDesign('blue'),
  seed,
  arena = tacticalRuntimeArena,
}) {
  return {
    round: 1,
    seed,
    arena,
    red: {
      blueprint: machineDesignToLegacyBotBlueprintProjection(redMachine),
      machineDesign: redMachine,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    blue: {
      blueprint: machineDesignToLegacyBotBlueprintProjection(blueMachine),
      machineDesign: blueMachine,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
  }
}

function machineIssueCodes(design) {
  return validateMachineTree(design).map((issue) => issue.code)
}

function machinePhysicalIssueCodes(design, catalog = PART_CATALOG) {
  return validateMachinePhysicalLegality(design, catalog).map((issue) => issue.code)
}

function machineBuildState(machine) {
  return {
    ...createInitialLoadoutBuildState('red'),
    currentDesign: {
      version: 'machine:v1',
      machine,
    },
  }
}

function forgedConfirmLoadoutAction() {
  return {
    id: 'forged.confirm_loadout',
    kind: 'confirm_loadout',
    role: 'red',
    payload: {
      scope: 'loadout_builder',
      type: 'confirm_loadout',
      label: 'Confirm loadout',
      summary: 'Forged confirm loadout',
    },
  }
}

function assertMachineCanConfirm(machine, catalog = PART_CATALOG) {
  const buildState = machineBuildState(machine)
  const actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 501,
    actionSetId: 'red:r1:loadout:machine-confirm:v501',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold: 1000,
    buildState,
    catalog,
  })
  const confirmAction = Object.values(actionSet.actions)
    .find((action) => action.kind === 'confirm_loadout')

  assert.notEqual(confirmAction, undefined)

  const confirmed = applyLoadoutAction({
    role: 'red',
    gold: 1000,
    inventory: [],
    buildState,
    action: confirmAction,
    catalog,
  })

  assert.equal(confirmed.ok, true, confirmed.ok ? '' : JSON.stringify(confirmed.issues))
  assert.equal(confirmed.confirmed, true)

  return confirmed
}

test('initial machine design starts with exactly one free immutable system core', () => {
  const design = createInitialMachineDesign('red')
  const core = design.parts[0]

  assert.equal(design.rootInstanceId, 'core')
  assert.equal(design.parts.length, 1)
  assert.equal(core.instanceId, 'core')
  assert.equal(core.definitionId, SYSTEM_MACHINE_CORE_DEFINITION.id)
  assert.equal(core.definitionId.startsWith('Body_'), false)
  assert.equal(core.source, 'system_core')
  assert.equal(core.immutable, true)
  assert.equal(SYSTEM_MACHINE_CORE_DEFINITION.cost, 0)
  assert.equal(SYSTEM_MACHINE_CORE_DEFINITION.systemOwned, true)
  assert.equal(SYSTEM_MACHINE_CORE_DEFINITION.inventoryItem, false)
  assert.equal(SYSTEM_MACHINE_CORE_DEFINITION.catalogPart, false)
  assert.equal(validateMachineTree(design).length, 0)
})

test('mount surfaces are catalog and system-core data without sphere mount-kind vocabulary', () => {
  const coreShell = SYSTEM_MACHINE_CORE_DEFINITION.mountSurfaces.find((surface) => surface.id === 'core_shell')
  const coreDeck = SYSTEM_MACHINE_CORE_DEFINITION.mountSurfaces.find((surface) => surface.id === 'core_deck')
  const lightFrame = PART_CATALOG.find((part) => part.id === 'Body_Light_Frame')
  const cylinder = PART_CATALOG.find((part) => part.id === 'Body_Cylinder_Large')
  const wheel = PART_CATALOG.find((part) => part.id === 'Wheel_Omni')

  assertCompleteMountSurface(coreShell, 'system_core.core_shell')
  assertCompleteMountSurface(coreDeck, 'system_core.core_deck')
  assert.equal(coreShell.kind, 'sphere')
  assert.equal(coreDeck.kind, 'panel')
  assert.ok(coreShell.accepts.includes('weapon'))
  assert.ok(coreDeck.accepts.includes('utility'))
  assert.ok(lightFrame?.mountSurfaces.some((surface) => surface.kind === 'panel' && surface.accepts.includes('weapon')))
  assert.ok(cylinder?.mountSurfaces.some((surface) => surface.kind === 'sphere' && surface.accepts.includes('mobility')))
  assert.ok(wheel?.mountSurfaces.some((surface) => surface.kind === 'panel' && surface.accepts.includes('defense')))
  assert.equal(PART_CATALOG.flatMap((part) => part.mounts).some((mount) => mount.kind === 'sphere'), false)
})

test('resolveMountPose maps sphere and panel uv coordinates deterministically', () => {
  const sphereSurface = {
    id: 'test_shell',
    kind: 'sphere',
    accepts: ['weapon', 'utility'],
    center: [0, 0, 0],
    radius: 2,
  }
  const panelSurface = {
    id: 'test_panel',
    kind: 'panel',
    accepts: ['utility'],
    center: [10, 2, 20],
    size: [4, 6],
    normal: [0, 1, 0],
    uAxis: [1, 0, 0],
    vAxis: [0, 0, 1],
  }

  assertVectorClose(
    resolveMountPose({ surface: sphereSurface, partCategory: 'weapon', u: 0, v: 0.5 }).surfaceNormal,
    [0, 0, 1],
    'sphere forward normal',
  )
  assertVectorClose(
    resolveMountPose({ surface: sphereSurface, partCategory: 'weapon', u: 0.25, v: 0.5 }).surfaceNormal,
    [1, 0, 0],
    'sphere right normal',
  )
  assertVectorClose(
    resolveMountPose({ surface: sphereSurface, partCategory: 'weapon', u: 0.75, v: 1 }).surfaceNormal,
    [0, 1, 0],
    'sphere top normal',
  )
  assertVectorClose(
    resolveMountPose({ surface: sphereSurface, partCategory: 'weapon', u: 0, v: 0.5 }).position,
    [0, 0, 2],
    'sphere position',
  )
  assertVectorClose(
    resolveMountPose({ surface: panelSurface, partCategory: 'utility', u: 0, v: 1 }).position,
    [8, 2, 23],
    'panel corner position',
  )
})

test('resolveMountPose canonicalizes accepted params and applies yaw and roll', () => {
  const panelSurface = {
    id: 'orientation_panel',
    kind: 'panel',
    accepts: ['weapon'],
    center: [0, 0, 0],
    size: [2, 2],
    normal: [0, 1, 0],
    uAxis: [1, 0, 0],
    vAxis: [0, 0, 1],
  }
  const base = resolveMountPose({ surface: panelSurface, partCategory: 'weapon', u: 0.5, v: 0.5 })
  const yawed = resolveMountPose({
    surface: panelSurface,
    partCategory: 'weapon',
    u: 0.5,
    v: 0.5,
    yawDegrees: 90,
  })
  const rolled = resolveMountPose({
    surface: panelSurface,
    partCategory: 'weapon',
    u: 0.5,
    v: 0.5,
    yawDegrees: 450,
    rollDegrees: -90,
  })
  const rolledAgain = resolveMountPose({
    surface: panelSurface,
    partCategory: 'weapon',
    u: 0.5,
    v: 0.5,
    yawDegrees: 450,
    rollDegrees: -90,
  })

  assert.deepEqual(rolled, rolledAgain)
  assert.deepEqual(rolled.parameters, {
    u: 0.5,
    v: 0.5,
    yawDegrees: 90,
    rollDegrees: 270,
  })
  assertVectorClose(base.orientation.right, [1, 0, 0], 'base right')
  assertVectorClose(base.orientation.forward, [0, 0, 1], 'base forward')
  assertVectorClose(yawed.orientation.right, [0, 0, -1], 'yawed right')
  assertVectorClose(yawed.orientation.forward, [1, 0, 0], 'yawed forward')
  assert.notDeepEqual(yawed.orientation.up, rolled.orientation.up)
})

test('validateMountPoseInput rejects invalid params, bounds, and category mismatch', () => {
  const panelSurface = {
    id: 'validation_panel',
    kind: 'panel',
    accepts: ['utility'],
    center: [0, 0, 0],
    size: [2, 2],
    normal: [0, 1, 0],
    uAxis: [1, 0, 0],
    vAxis: [0, 0, 1],
  }
  const sphereSurface = {
    id: 'wrapping_shell',
    kind: 'sphere',
    accepts: ['weapon'],
    center: [0, 0, 0],
    radius: 1,
  }
  const nanResult = validateMountPoseInput({ surface: panelSurface, partCategory: 'utility', u: Number.NaN, v: 0.5 })
  const infinityResult = validateMountPoseInput({ surface: panelSurface, partCategory: 'utility', u: 0.5, v: Infinity })
  const boundsResult = validateMountPoseInput({ surface: panelSurface, partCategory: 'utility', u: -0.1, v: 1.1 })
  const categoryResult = validateMountPoseInput({ surface: panelSurface, partCategory: 'weapon', u: 0.5, v: 0.5 })
  const wrapped = resolveMountPose({
    surface: sphereSurface,
    partCategory: 'weapon',
    u: 1,
    v: 0.5,
    yawDegrees: 450,
  })

  assert.equal(nanResult.ok, false)
  assert.equal(infinityResult.ok, false)
  assert.equal(boundsResult.ok, false)
  assert.equal(categoryResult.ok, false)
  assert.ok(nanResult.issues.some((issue) => issue.code === 'INVALID_MOUNT_PARAMETER'))
  assert.ok(infinityResult.issues.some((issue) => issue.code === 'INVALID_MOUNT_PARAMETER'))
  assert.ok(boundsResult.issues.some((issue) => issue.code === 'MOUNT_PARAMETER_OUT_OF_BOUNDS'))
  assert.ok(categoryResult.issues.some((issue) => issue.code === 'MOUNT_SURFACE_CATEGORY_REJECTED'))
  assert.throws(
    () => resolveMountPose({ surface: panelSurface, partCategory: 'utility', u: 0.5, v: Number.POSITIVE_INFINITY }),
    /INVALID_MOUNT_PARAMETER/,
  )
  assert.deepEqual(wrapped.parameters, {
    u: 0,
    v: 0.5,
    yawDegrees: 90,
    rollDegrees: 0,
  })
})

test('initial loadout build state uses MachineDesign authority with a free system core', () => {
  const buildState = createInitialLoadoutBuildState('red')

  assert.equal(buildState.currentDesign.version, 'machine:v1')
  assert.equal(buildState.currentDesign.machine.rootInstanceId, 'core')
  assert.equal(buildState.currentDesign.machine.parts.length, 1)
  assert.equal(buildState.currentDesign.machine.parts[0].instanceId, 'core')
  assert.equal(buildState.currentDesign.machine.parts[0].definitionId.startsWith('Body_'), false)
  assert.equal(buildState.currentDesign.machine.parts[0].source, 'system_core')
  assert.equal(buildState.currentDesign.machine.parts[0].immutable, true)
  assert.equal(buildState.legacyDraft.parts.length, 0)
  assert.deepEqual(validateMachineTree(buildState.currentDesign.machine), [])
})

test('machine tree validator enforces core and attachment invariants', () => {
  const initial = createInitialMachineDesign('red')
  const core = initial.parts[0]
  const validTree = {
    ...initial,
    parts: [core, machinePart('A'), machinePart('B')],
    attachments: [
      machineAttachment('core', 'A'),
      machineAttachment('A', 'B'),
    ],
  }

  assert.deepEqual(validateMachineTree(validTree), [])
  assert.ok(machineIssueCodes({ ...validTree, parts: validTree.parts.slice(1), attachments: [] }).includes('MISSING_CORE'))
  assert.ok(machineIssueCodes({
    ...initial,
    parts: [core, { ...core, transform: machineTransform() }],
  }).includes('DUPLICATE_CORE'))
  assert.ok(machineIssueCodes({
    ...initial,
    parts: [{ ...core, transform: { ...machineTransform(), position: [1, 0, 0] } }],
  }).includes('CORE_MOVED'))
  assert.ok(machineIssueCodes({
    ...initial,
    parts: [core, machinePart('A')],
    attachments: [],
  }).includes('DISCONNECTED_PART'))
  assert.ok(machineIssueCodes({
    ...initial,
    parts: [core, machinePart('A'), machinePart('B')],
    attachments: [
      machineAttachment('A', 'B'),
      machineAttachment('B', 'A'),
    ],
  }).includes('MACHINE_TREE_CYCLE'))
})

test('machine physical legality permits bare core, noncombat parts, and free orientation', () => {
  const initial = createInitialMachineDesign('red')
  const core = initial.parts[0]
  const styleOnly = {
    ...initial,
    parts: [
      core,
      machinePart('flag', {
        definitionId: 'catalog:Style_Flag',
        transform: machineTransform({ position: [3, 0, 0] }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'flag', { mountId: 'core_deck' }),
    ],
  }
  const orientedMachine = {
    ...initial,
    parts: [
      core,
      machinePart('backward_weapon', {
        definitionId: 'catalog:Weapon_Spear',
        transform: machineTransform({ position: [3, 0, 0], rotation: [0, 180, 0] }),
      }),
      machinePart('sideways_wheel', {
        definitionId: 'catalog:Wheel_Small',
        transform: machineTransform({ position: [-3, 0, 0], rotation: [0, 90, 90] }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'backward_weapon', { mountId: 'core_shell' }),
      machineAttachment('core', 'sideways_wheel', { mountId: 'core_shell' }),
    ],
  }

  assert.deepEqual(validateMachinePhysicalLegality(initial), [])
  assert.deepEqual(validateMachinePhysicalLegality(styleOnly), [])
  assert.deepEqual(validateMachinePhysicalLegality(orientedMachine), [])
  assertMachineCanConfirm(initial)
  assertMachineCanConfirm(styleOnly)
  assertMachineCanConfirm(orientedMachine)
})

test('machine confirm rejects disconnected parts, unknown catalog parts, and hard collisions', () => {
  const initial = createInitialMachineDesign('red')
  const core = initial.parts[0]
  const disconnected = {
    ...initial,
    parts: [
      core,
      machinePart('loose_armor', {
        definitionId: 'catalog:Armor_Light',
        transform: machineTransform({ position: [3, 0, 0] }),
      }),
    ],
    attachments: [],
  }
  const unknownPart = {
    ...initial,
    parts: [
      core,
      machinePart('unknown_part', {
        definitionId: 'catalog:Weapon_NukeLaserDragon',
        transform: machineTransform({ position: [3, 0, 0] }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'unknown_part', { mountId: 'core_shell' }),
    ],
  }
  const collidingParts = {
    ...initial,
    parts: [
      core,
      machinePart('left_plate', {
        definitionId: 'catalog:Armor_Light',
        transform: machineTransform({ position: [3, 0, 0] }),
      }),
      machinePart('right_plate', {
        definitionId: 'catalog:Armor_Tile',
        transform: machineTransform({ position: [3, 0, 0] }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'left_plate', { mountId: 'core_deck' }),
      machineAttachment('core', 'right_plate', { mountId: 'core_deck' }),
    ],
  }
  const disconnectedConfirm = applyLoadoutAction({
    role: 'red',
    gold: 1000,
    inventory: [],
    buildState: machineBuildState(disconnected),
    action: forgedConfirmLoadoutAction(),
  })
  const unknownConfirm = applyLoadoutAction({
    role: 'red',
    gold: 1000,
    inventory: [],
    buildState: machineBuildState(unknownPart),
    action: forgedConfirmLoadoutAction(),
  })
  const collisionConfirm = applyLoadoutAction({
    role: 'red',
    gold: 1000,
    inventory: [],
    buildState: machineBuildState(collidingParts),
    action: forgedConfirmLoadoutAction(),
  })

  assert.ok(machineIssueCodes(disconnected).includes('DISCONNECTED_PART'))
  assert.ok(machinePhysicalIssueCodes(unknownPart).includes('UNKNOWN_PART'))
  assert.ok(machinePhysicalIssueCodes(collidingParts).includes('HARD_PART_COLLISION'))
  assert.equal(disconnectedConfirm.ok, false)
  assert.equal(unknownConfirm.ok, false)
  assert.equal(collisionConfirm.ok, false)
  assert.ok(disconnectedConfirm.issues.some((issue) => issue.code === 'DISCONNECTED_PART'))
  assert.ok(unknownConfirm.issues.some((issue) => issue.code === 'UNKNOWN_PART'))
  assert.ok(collisionConfirm.issues.some((issue) => issue.code === 'HARD_PART_COLLISION'))

  const disconnectedActionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 502,
    actionSetId: 'red:r1:loadout:blocked-confirm:v502',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold: 1000,
    buildState: machineBuildState(disconnected),
  })
  const blockedConfirm = disconnectedActionSet.blockedActions?.find(
    (action) => action.kind === 'confirm_loadout',
  )

  assert.equal(Object.values(disconnectedActionSet.actions).some((action) => action.kind === 'confirm_loadout'), false)
  assert.notEqual(blockedConfirm, undefined)
  assert.ok(blockedConfirm.issues.some((issue) => issue.code === 'DISCONNECTED_PART'))
  assert.ok(blockedConfirm.requirements.some((requirement) => requirement.includes('not connected')))
})

test('machine legacy projection is deterministic and preserves replay transform metadata', () => {
  const initial = createInitialMachineDesign('red')
  const machine = {
    ...initial,
    name: 'projection machine',
    parts: [
      initial.parts[0],
      {
        instanceId: 'weapon',
        definitionId: 'catalog:Weapon_Spear',
        source: 'catalog_part',
        transform: {
          position: [1.5, 0.25, -2.5],
          rotation: [10, 45, 5],
          scale: [1.2, 0.8, 1.1],
        },
      },
      {
        instanceId: 'wheel',
        definitionId: 'Wheel_Small',
        source: 'catalog_part',
        transform: {
          position: [-1, 0, 0.5],
          rotation: [0, 90, 0],
        },
      },
    ],
    attachments: [
      {
        parentInstanceId: 'core',
        childInstanceId: 'weapon',
        mountId: 'sphere_front',
        transform: {
          position: [88.125, 77.5, 66.25],
          rotation: [12, 24, 36],
          scale: [2, 2, 2],
        },
      },
      {
        parentInstanceId: 'weapon',
        childInstanceId: 'wheel',
        mountId: 'rim_left',
        transform: machineTransform(),
      },
    ],
    runtime: {
      healthByInstanceId: { weapon: 17, wheel: 9 },
      detachedInstanceIds: ['wheel'],
      disabledInstanceIds: ['weapon'],
    },
  }

  const blueprint = machineDesignToLegacyBotBlueprintProjection(machine)
  const snapshot = machineDesignToLegacyBotDesignSnapshotProjection(machine)

  assert.deepEqual(blueprint, machineDesignToLegacyBotBlueprintProjection(machine))
  assert.deepEqual(snapshot, machineDesignToLegacyBotDesignSnapshotProjection(machine))
  assert.deepEqual(blueprint.blocks, [
    {
      id: 'weapon',
      partId: 'Weapon_Spear',
      position: [1.5, 0.25, -2.5],
      rotation: [10, 45, 5],
      mountId: 'sphere_front',
    },
    {
      id: 'wheel',
      partId: 'Wheel_Small',
      position: [-1, 0, 0.5],
      rotation: [0, 90, 0],
      parentInstanceId: 'weapon',
      mountId: 'rim_left',
    },
  ])
  assert.deepEqual(snapshot, {
    name: 'projection machine',
    rootInstanceId: 'weapon',
    parts: [
      {
        instanceId: 'weapon',
        partId: 'Weapon_Spear',
        cell: { x: 1.5, z: -2.5 },
        rotation: 45,
        mountId: 'sphere_front',
        health: 17,
      },
      {
        instanceId: 'wheel',
        partId: 'Wheel_Small',
        cell: { x: -1, z: 0.5 },
        rotation: 90,
        parentInstanceId: 'weapon',
        mountId: 'rim_left',
        health: 9,
        detached: true,
      },
    ],
  })
})

test('machine legacy projection is immutable and lossy instead of authoritative round trip', () => {
  const initial = createInitialMachineDesign('blue')
  const machine = {
    ...initial,
    name: 'lossy projection machine',
    parts: [
      initial.parts[0],
      {
        instanceId: 'spinner',
        definitionId: 'catalog:Weapon_Spinner_Small',
        source: 'catalog_part',
        transform: {
          position: [2, 3, 4],
          rotation: [15, 180, 30],
          scale: [3, 3, 3],
        },
      },
    ],
    attachments: [
      {
        parentInstanceId: 'core',
        childInstanceId: 'spinner',
        mountId: 'parameterized_sphere',
        transform: {
          position: [98.75, 97.5, 96.25],
          rotation: [22, 33, 44],
          scale: [4, 4, 4],
        },
      },
    ],
    runtime: {
      healthByInstanceId: { spinner: 11 },
      disabledInstanceIds: ['spinner'],
    },
  }
  const beforeProjection = JSON.stringify(machine)

  const blueprint = machineDesignToLegacyBotBlueprintProjection(machine)
  const snapshot = machineDesignToLegacyBotDesignSnapshotProjection(machine)

  blueprint.blocks[0].position[0] = 999
  snapshot.parts[0].cell.x = 999

  assert.equal(JSON.stringify(machine), beforeProjection)
  assert.equal(machine.parts[1].transform.position[0], 2)
  assert.equal('scale' in blueprint.blocks[0], false)
  assert.equal('transform' in snapshot.parts[0], false)
  assert.equal(snapshot.parts[0].rotation, 180)
  assert.equal(JSON.stringify({ blueprint, snapshot }).includes('98.75'), false)
  assert.equal(JSON.stringify({ blueprint, snapshot }).includes('system_core'), false)
  assert.equal(JSON.stringify({ blueprint, snapshot }).includes('immutable'), false)
  assert.equal(JSON.stringify({ blueprint, snapshot }).includes('disabledInstanceIds'), false)
})

test('deriveMachineCapabilities uses MachineDesign local axes instead of legacy projection controls', () => {
  const initial = createInitialMachineDesign('red')
  const machine = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('sideways_wheel', {
        definitionId: 'catalog:Wheel_Small',
        transform: machineTransform({
          position: [2, 0, 0],
          orientation: machineBasis({
            right: [0, 0, -1],
            forward: [1, 0, 0],
          }),
        }),
      }),
      machinePart('omni_wheel', {
        definitionId: 'catalog:Wheel_Omni',
        transform: machineTransform({
          position: [-2, 0, 0],
          orientation: machineBasis(),
        }),
      }),
      machinePart('rear_laser', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({
          position: [0, 0, -2],
          orientation: machineBasis({
            right: [-1, 0, 0],
            forward: [0, 0, -1],
          }),
        }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'sideways_wheel', { mountId: 'core_shell' }),
      machineAttachment('core', 'omni_wheel', { mountId: 'core_shell' }),
      machineAttachment('core', 'rear_laser', { mountId: 'core_shell' }),
    ],
  }
  const bareCapabilities = deriveMachineCapabilities(initial)
  const capabilities = deriveMachineCapabilities(machine)
  const sidewaysWheel = capabilities.movement.find((entry) => entry.partInstanceId === 'sideways_wheel')
  const omniWheel = capabilities.movement.find((entry) => entry.partInstanceId === 'omni_wheel')
  const rearLaser = capabilities.weapons.find((entry) => entry.partInstanceId === 'rear_laser')
  const projectedControls = deriveControls(machineDesignToLegacyBotBlueprintProjection(machine))

  assert.deepEqual(bareCapabilities.movement, [])
  assert.deepEqual(bareCapabilities.weapons, [])
  assert.deepEqual(bareCapabilities.utility, [])
  assert.equal(sidewaysWheel.kind, 'normal_wheel')
  assertVectorClose(sidewaysWheel.driveAxis, [1, 0, 0], 'sideways wheel drive axis')
  assert.equal(sidewaysWheel.lateralAxis, undefined)
  assert.equal(omniWheel.kind, 'omni_wheel')
  assertVectorClose(omniWheel.driveAxis, [0, 0, 1], 'omni wheel drive axis')
  assertVectorClose(omniWheel.lateralAxis, [1, 0, 0], 'omni wheel lateral axis')
  assert.equal(rearLaser.kind, 'fixed_emitter')
  assertVectorClose(rearLaser.emitterAxis, [0, 0, -1], 'rear laser emitter axis')
  assert.deepEqual(capabilities.inactiveParts, [])
  assert.equal(projectedControls.movement.includes('strafe_left'), true)
  assert.equal(projectedControls.weaponA?.includes('fire'), true)
})

test('deriveMachineCapabilities ignores detached disabled and destroyed parts', () => {
  const initial = createInitialMachineDesign('red')
  const machine = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('detached_wheel', {
        definitionId: 'catalog:Wheel_Omni',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
      machinePart('disabled_laser', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
      machinePart('destroyed_utility', {
        definitionId: 'catalog:Utility_Smoke',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'detached_wheel', { mountId: 'core_shell' }),
      machineAttachment('core', 'disabled_laser', { mountId: 'core_shell' }),
      machineAttachment('core', 'destroyed_utility', { mountId: 'core_deck' }),
    ],
    runtime: {
      healthByInstanceId: {
        destroyed_utility: 0,
      },
      detachedInstanceIds: ['detached_wheel'],
      disabledInstanceIds: ['disabled_laser'],
    },
  }
  const capabilities = deriveMachineCapabilities(machine)
  const inactiveReasonByPart = new Map(
    capabilities.inactiveParts.map((part) => [part.partInstanceId, part.reason]),
  )

  assert.deepEqual(capabilities.movement, [])
  assert.deepEqual(capabilities.weapons, [])
  assert.deepEqual(capabilities.utility, [])
  assert.equal(inactiveReasonByPart.get('detached_wheel'), 'detached')
  assert.equal(inactiveReasonByPart.get('disabled_laser'), 'disabled')
  assert.equal(inactiveReasonByPart.get('destroyed_utility'), 'destroyed')
})

test('deriveMachineCapabilities applies explicit parent runtime orientation to child emitters', () => {
  const initial = createInitialMachineDesign('red')
  const runtimeWheelBasis = machineBasis({
    right: [0, 0, -1],
    forward: [1, 0, 0],
  })
  const machine = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('runtime_wheel', {
        definitionId: 'catalog:Wheel_Omni',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
      machinePart('rim_laser', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'runtime_wheel', { mountId: 'core_shell' }),
      machineAttachment('runtime_wheel', 'rim_laser', { mountId: 'rim_outer' }),
    ],
    runtime: {
      healthByInstanceId: {},
      orientationByInstanceId: {
        runtime_wheel: runtimeWheelBasis,
      },
    },
  }
  const capabilities = deriveMachineCapabilities(machine)
  const wheel = capabilities.movement.find((entry) => entry.partInstanceId === 'runtime_wheel')
  const laser = capabilities.weapons.find((entry) => entry.partInstanceId === 'rim_laser')

  assert.equal(wheel.orientationSource, 'runtime_orientation')
  assertVectorClose(wheel.driveAxis, [1, 0, 0], 'runtime wheel drive axis')
  assert.equal(laser.orientationSource, 'inherited_runtime_orientation')
  assertVectorClose(laser.emitterAxis, [1, 0, 0], 'runtime inherited laser emitter axis')
})

test('machine combat action generation gives no-mobility machines hold plus surrender only', () => {
  const actionSet = buildMachineCapabilityCombatActionSet({
    machine: createInitialMachineDesign('red'),
  })

  assert.deepEqual(Object.values(actionSet.actions).map((action) => action.kind), ['hold', 'surrender'])
  assert.deepEqual(combatCommands(actionSet), [{ tick: 1, move: 'brake' }])
})

test('machine combat action generation exposes reachable grid cells from mobility budget', () => {
  const initial = createInitialMachineDesign('red')
  const machine = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('east_wheel', {
        definitionId: 'catalog:Wheel_Small',
        transform: machineTransform({
          orientation: machineBasis({
            right: [0, 0, -1],
            forward: [1, 0, 0],
          }),
        }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'east_wheel', { mountId: 'core_shell' }),
    ],
  }
  const actionSet = buildMachineCapabilityCombatActionSet({ machine })
  const moveActions = Object.values(actionSet.actions)
    .filter((action) => action.kind === 'move')
    .map(combatLegalActionForPacket)
  const destinationCellIds = new Set(
    moveActions
      .map((action) => action.parameterExamples?.[0]?.destinationCellId)
      .filter(Boolean),
  )

  assert.equal(combatMoves(actionSet).includes('brake'), true)
  assert.ok(destinationCellIds.size > 20)
  assert.equal(destinationCellIds.has('cell:-1:4'), true)
  assert.equal(destinationCellIds.has('cell:-1:-4'), true)
  assert.equal(destinationCellIds.has('cell:1:0'), true)

  const snapshot = combatSnapshot(tacticalOpenArena, [-1, 0, 0], [1, 0, 0], { tick: 1 })
  const board = buildAgentBoardView({
    arena: snapshot.arena,
    role: 'red',
    self: snapshot.red,
    opponent: snapshot.blue,
    actions: Object.values(actionSet.actions),
  })
  const northCell = board.cells.find((cell) => cell.cellId === 'cell:-1:4')

  assert.equal(northCell.reachable, true)
  assert.equal(northCell.mobilityCost, 4)
  assert.equal(northCell.mobilityRemaining, 3)
  assert.equal(northCell.legal.moveHere.parameters.destinationCellId, 'cell:-1:4')
})

test('machine combat action generation exposes lateral moves from omni movement capability', () => {
  const initial = createInitialMachineDesign('red')
  const machine = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('omni_wheel', {
        definitionId: 'catalog:Wheel_Omni',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'omni_wheel', { mountId: 'core_shell' }),
    ],
  }
  const actionSet = buildMachineCapabilityCombatActionSet({ machine })

  assert.equal(hasCombatAction(actionSet, (command) => command.move === 'strafe_left'), true)
  assert.equal(hasCombatAction(actionSet, (command) => command.move === 'strafe_right'), true)
})

test('machine combat weapon actions require emitter bearing range and arena line of sight', () => {
  const initial = createInitialMachineDesign('red')
  const awayLaser = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('rear_laser', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({
          orientation: machineBasis({
            right: [0, 0, 1],
            forward: [-1, 0, 0],
          }),
        }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'rear_laser', { mountId: 'core_shell' }),
    ],
  }
  const forwardLaser = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('front_laser', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({
          orientation: machineBasis({
            right: [0, 0, -1],
            forward: [1, 0, 0],
          }),
        }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'front_laser', { mountId: 'core_shell' }),
    ],
  }
  const farArena = {
    ...tacticalOpenArena,
    width: 40,
    height: 8,
  }

  assert.equal(
    hasCombatAction(
      buildMachineCapabilityCombatActionSet({ machine: awayLaser }),
      (command) => command.weaponA === 'fire',
    ),
    false,
  )
  assert.equal(
    hasCombatAction(
      buildMachineCapabilityCombatActionSet({ machine: forwardLaser }),
      (command) => command.weaponA === 'fire' && command.move === undefined,
    ),
    true,
  )
  assert.equal(
    hasCombatAction(
      buildMachineCapabilityCombatActionSet({
        machine: forwardLaser,
        arena: farArena,
        redPosition: [-10, 0, 0],
        bluePosition: [10, 0, 0],
      }),
      (command) => command.weaponA === 'fire',
    ),
    false,
  )
  assert.equal(
    hasCombatAction(
      buildMachineCapabilityCombatActionSet({
        machine: forwardLaser,
        arena: tacticalBlockedArena,
      }),
      (command) => command.weaponA === 'fire',
    ),
    false,
  )
})

test('machine combat sweep weapon actions expose adjacent attacks from any bearing', () => {
  const initial = createInitialMachineDesign('red')
  const sideBearingSpinner = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('large_spinner', {
        definitionId: 'catalog:Weapon_Spinner_Large',
        transform: machineTransform({
          orientation: machineBasis({
            right: [1, 0, 0],
            forward: [0, 0, 1],
          }),
        }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'large_spinner', { mountId: 'core_shell' }),
    ],
  }
  const snapshot = combatSnapshot(tacticalOpenArena, [2, 0, 2], [2, 0, 1], { tick: 1 })
  const actionSet = buildMachineCapabilityCombatActionSet({
    machine: sideBearingSpinner,
    redPosition: snapshot.red.position,
    bluePosition: snapshot.blue.position,
  })
  const attackAction = Object.values(actionSet.actions)
    .find((action) => action.kind === 'attack')
  const board = buildAgentBoardView({
    arena: snapshot.arena,
    role: 'red',
    self: snapshot.red,
    opponent: snapshot.blue,
    actions: Object.values(actionSet.actions),
  })
  const selfCell = board.cells.find((cell) => cell.x === 2 && cell.z === 2)
  const capabilities = deriveMachineCapabilities(sideBearingSpinner)

  assert.notEqual(attackAction, undefined)
  assert.equal(combatActionCommand(attackAction).weaponA, 'fire')
  assert.equal(combatLegalActionForPacket(attackAction).preview.expectedRangeIfOpponentHolds, 1)
  assert.equal(selfCell.legal.attacksFromHere[0].targetCellId, 'cell:2:1')
  assert.equal(board.attackableTargets[0].cell.x, 2)
  assert.equal(board.attackableTargets[0].cell.z, 1)
  assert.equal(
    machineWeaponCanHit({
      topology: compileArenaTopology(tacticalOpenArena),
      attackerPosition: snapshot.red.position,
      defenderPosition: snapshot.blue.position,
      weapon: capabilities.weapons[0],
    }),
    true,
  )
})

test('machine combat action generation exposes utility activation when TurnCommand can represent it', () => {
  const initial = createInitialMachineDesign('red')
  const machine = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('booster', {
        definitionId: 'catalog:Utility_Booster',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'booster', { mountId: 'core_deck' }),
    ],
  }
  const actionSet = buildMachineCapabilityCombatActionSet({ machine })

  assert.equal(hasCombatAction(actionSet, (command, action) =>
    action.kind === 'use_utility' && command.utility === 'activate',
  ), true)
})

test('machine resolver moves generated machine commands through native wheel capability axes', () => {
  const initial = createInitialMachineDesign('red')
  const lateralWheelMachine = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('lateral_wheel', {
        definitionId: 'catalog:Wheel_Small',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'lateral_wheel', { mountId: 'core_shell' }),
    ],
  }
  const actionSet = buildMachineCapabilityCombatActionSet({
    machine: lateralWheelMachine,
    arena: tacticalRuntimeArena,
    redPosition: [-6, 0, 0],
    bluePosition: [6, 0, 0],
  })
  const generatedStrafe = findCombatAction(actionSet, (command) => command.move === 'strafe_right')
  const resolved = resolveSubmittedGameActions(machineCombatInput({
    redMachine: lateralWheelMachine,
    seed: 'machine-native-wheel-axis',
  }), {
    red: [generatedStrafe],
    blue: [canonicalCombatAction('blue', 1, { move: 'brake' })],
  })
  const forgedGenericForward = resolveSubmittedGameActions(machineCombatInput({
    redMachine: lateralWheelMachine,
    seed: 'machine-native-no-generic-forward',
  }), {
    red: [canonicalCombatAction('red', 1, { move: 'forward' })],
    blue: [canonicalCombatAction('blue', 1, { move: 'brake' })],
  })
  const strafeMove = moveEvents(resolved, 'red')[0]

  assert.equal(resolved.status, 'active')
  assert.ok(strafeMove)
  assert.ok(strafeMove.to[2] > strafeMove.from[2])
  assert.equal(moveEvents(forgedGenericForward, 'red').length, 0)
  assert.equal(
    forgedGenericForward.log.some((entry) => entry.includes('blocked or out-of-bounds anchor path')),
    true,
  )
})

test('machine resolver fires native weapons only when emitter range and bearing allow it', () => {
  const forwardLaser = machineWithLaser('red', 'front_laser', machineBasis({
    right: [0, 0, -1],
    forward: [1, 0, 0],
  }))
  const awayLaser = machineWithLaser('red', 'rear_laser', machineBasis({
    right: [0, 0, 1],
    forward: [-1, 0, 0],
  }))
  const fireAction = canonicalCombatAction('red', 1, { weaponA: 'fire' })
  const blueHold = canonicalCombatAction('blue', 1, { move: 'brake' })
  const forwardResolved = resolveSubmittedGameActions(machineCombatInput({
    redMachine: forwardLaser,
    seed: 'machine-native-weapon-fire',
  }), {
    red: [fireAction],
    blue: [blueHold],
  })
  const awayResolved = resolveSubmittedGameActions(machineCombatInput({
    redMachine: awayLaser,
    seed: 'machine-native-weapon-bearing-blocked',
  }), {
    red: [fireAction],
    blue: [blueHold],
  })

  assert.equal(
    forwardResolved.replay.events.some(
      (event) => event.type === 'weapon_fire' && event.bot === 'red' && event.sourcePartId === 'Weapon_Laser',
    ),
    true,
  )
  assert.equal(forwardResolved.snapshot.blue.health < forwardResolved.snapshot.blue.maxHealth, true)
  assert.equal(forwardResolved.machineRuntime.blue.healthByInstanceId.core < 20, true)
  assert.equal(
    awayResolved.replay.events.some((event) => event.type === 'weapon_fire' && event.bot === 'red'),
    false,
  )
  assert.equal(awayResolved.snapshot.blue.health, awayResolved.snapshot.blue.maxHealth)
  assert.equal(awayResolved.machineRuntime.blue.healthByInstanceId.core, 20)
})

test('machine damage destroys wheel capability and removes movement from next action set', () => {
  const redMachine = machineWithLaser('red', 'front_laser', machineBasis({
    right: [0, 0, -1],
    forward: [1, 0, 0],
  }))
  const blueMachine = machineWithCatalogPart('blue', 'drive_wheel', 'catalog:Wheel_Small')
  const initialBlueActions = buildMachineCapabilityCombatActionSet({
    role: 'blue',
    machine: blueMachine,
  })
  const resolved = resolveSubmittedGameActions(machineCombatInput({
    redMachine,
    blueMachine,
    seed: 'machine-damage-wheel-removes-movement',
  }), {
    red: [canonicalCombatAction('red', 1, { weaponA: 'fire' })],
    blue: [canonicalCombatAction('blue', 1, { move: 'brake' })],
  })
  const nextBlueMachine = machineWithRuntime(blueMachine, resolved.machineRuntime.blue)
  const nextBlueActions = buildMachineCapabilityCombatActionSet({
    role: 'blue',
    machine: nextBlueMachine,
    tick: 2,
  })
  const inactiveReasonByPart = new Map(
    deriveMachineCapabilities(nextBlueMachine).inactiveParts.map((part) => [part.partInstanceId, part.reason]),
  )
  const projectedControls = deriveControls(machineDesignToLegacyBotBlueprintProjection(nextBlueMachine))

  assert.equal(resolved.status, 'active')
  assert.equal(hasCombatAction(initialBlueActions, (command) => command.move && command.move !== 'brake'), true)
  assert.equal(resolved.machineRuntime.blue.healthByInstanceId.drive_wheel, 0)
  assert.equal(inactiveReasonByPart.get('drive_wheel'), 'destroyed')
  assert.equal(projectedControls.movement.includes('forward'), true)
  assert.deepEqual(combatMoves(nextBlueActions), ['brake'])
})

test('machine damage destroys weapon capability and removes fire from next action set', () => {
  const redMachine = machineWithLaser('red', 'front_laser', machineBasis({
    right: [0, 0, -1],
    forward: [1, 0, 0],
  }))
  const blueMachine = machineWithCatalogPart('blue', 'front_laser', 'catalog:Weapon_Laser', machineBasis({
    right: [0, 0, 1],
    forward: [-1, 0, 0],
  }))
  const initialBlueActions = buildMachineCapabilityCombatActionSet({
    role: 'blue',
    machine: blueMachine,
  })
  const resolved = resolveSubmittedGameActions(machineCombatInput({
    redMachine,
    blueMachine,
    seed: 'machine-damage-weapon-removes-fire',
  }), {
    red: canonicalCombatActions('red', [
      { weaponA: 'fire' },
      { weaponA: 'fire' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'brake' },
      { move: 'brake' },
    ]),
  })
  const nextBlueActions = buildMachineCapabilityCombatActionSet({
    role: 'blue',
    machine: machineWithRuntime(blueMachine, resolved.machineRuntime.blue),
    tick: 3,
  })

  assert.equal(resolved.status, 'active')
  assert.equal(hasCombatAction(initialBlueActions, (command) => command.weaponA === 'fire'), true)
  assert.equal(resolved.machineRuntime.blue.healthByInstanceId.front_laser, 0)
  assert.equal(hasCombatAction(nextBlueActions, (command) =>
    command.weaponA === 'fire' || command.weaponB === 'fire',
  ), false)
})

test('machine resolver suppresses same-tick fire from a destroyed machine weapon', () => {
  const initialRed = createInitialMachineDesign('red')
  const redMachine = {
    ...initialRed,
    parts: [
      initialRed.parts[0],
      machinePart('front_laser_a', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({
          orientation: machineBasis({
            right: [0, 0, -1],
            forward: [1, 0, 0],
          }),
        }),
      }),
      machinePart('front_laser_b', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({
          orientation: machineBasis({
            right: [0, 0, -1],
            forward: [1, 0, 0],
          }),
        }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'front_laser_a', { mountId: 'core_shell' }),
      machineAttachment('core', 'front_laser_b', { mountId: 'core_shell' }),
    ],
  }
  const blueMachine = machineWithCatalogPart('blue', 'front_laser', 'catalog:Weapon_Laser', machineBasis({
    right: [0, 0, 1],
    forward: [-1, 0, 0],
  }))
  const initialBlueActions = buildMachineCapabilityCombatActionSet({
    role: 'blue',
    machine: blueMachine,
  })
  const resolved = resolveSubmittedGameActions(machineCombatInput({
    redMachine,
    blueMachine,
    seed: 'machine-destroyed-before-fire',
  }), {
    red: [canonicalCombatAction('red', 1, { weaponA: 'fire', weaponB: 'fire' })],
    blue: [canonicalCombatAction('blue', 1, { weaponA: 'fire' })],
  })

  assert.equal(hasCombatAction(initialBlueActions, (command) => command.weaponA === 'fire'), true)
  assert.equal(resolved.machineRuntime.blue.healthByInstanceId.front_laser, 0)
  assert.equal(
    resolved.replay.events.filter((event) => event.type === 'weapon_fire' && event.bot === 'red').length,
    2,
  )
  assert.equal(
    resolved.replay.events.some((event) => event.type === 'weapon_fire' && event.bot === 'blue'),
    false,
  )
})

test('machine damage destroys utility capability and removes utility activation from next action set', () => {
  const redMachine = machineWithLaser('red', 'front_laser', machineBasis({
    right: [0, 0, -1],
    forward: [1, 0, 0],
  }))
  const blueMachine = machineWithCatalogPart('blue', 'booster', 'catalog:Utility_Booster')
  const initialBlueActions = buildMachineCapabilityCombatActionSet({
    role: 'blue',
    machine: blueMachine,
  })
  const resolved = resolveSubmittedGameActions(machineCombatInput({
    redMachine,
    blueMachine,
    seed: 'machine-damage-utility-removes-activation',
  }), {
    red: [canonicalCombatAction('red', 1, { weaponA: 'fire' })],
    blue: [canonicalCombatAction('blue', 1, { move: 'brake' })],
  })
  const nextBlueActions = buildMachineCapabilityCombatActionSet({
    role: 'blue',
    machine: machineWithRuntime(blueMachine, resolved.machineRuntime.blue),
    tick: 2,
  })

  assert.equal(resolved.status, 'active')
  assert.equal(hasCombatAction(initialBlueActions, (command, action) =>
    action.kind === 'use_utility' && command.utility === 'activate',
  ), true)
  assert.equal(resolved.machineRuntime.blue.healthByInstanceId.booster, 0)
  assert.equal(hasCombatAction(nextBlueActions, (command, action) =>
    action.kind === 'use_utility' || command.utility === 'activate',
  ), false)
})

test('machine parent break detaches child subtree and emits deterministic wreckage events', () => {
  const redMachine = machineWithLaser('red', 'front_laser', machineBasis({
    right: [0, 0, -1],
    forward: [1, 0, 0],
  }))
  const initialBlue = createInitialMachineDesign('blue')
  const blueMachine = {
    ...initialBlue,
    parts: [
      initialBlue.parts[0],
      machinePart('drive_wheel', {
        definitionId: 'catalog:Wheel_Small',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
      machinePart('rim_laser', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
      machinePart('rim_booster', {
        definitionId: 'catalog:Utility_Booster',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'drive_wheel', { mountId: 'core_shell' }),
      machineAttachment('drive_wheel', 'rim_laser', { mountId: 'rim_outer' }),
      machineAttachment('rim_laser', 'rim_booster', { mountId: 'laser_mount' }),
    ],
  }
  const input = machineCombatInput({
    redMachine,
    blueMachine,
    seed: 'machine-parent-break-detaches-subtree',
  })
  const actions = {
    red: [canonicalCombatAction('red', 1, { weaponA: 'fire' })],
    blue: [canonicalCombatAction('blue', 1, { move: 'brake' })],
  }
  const first = resolveSubmittedGameActions(input, actions)
  const second = resolveSubmittedGameActions(input, actions)
  const wreckageIds = first.replay.events
    .filter((event) => event.type === 'part_detach' && event.bot === 'blue')
    .map((event) => event.blockId)

  assert.deepEqual(first, second)
  assert.deepEqual(first.machineRuntime.blue.detachedInstanceIds, ['rim_booster', 'rim_laser'])
  assert.deepEqual(wreckageIds, ['drive_wheel', 'rim_laser', 'rim_booster'])
  assert.equal(first.machineRuntime.blue.healthByInstanceId.drive_wheel, 0)
  assert.equal(first.machineRuntime.blue.healthByInstanceId.rim_laser, 0)
  assert.equal(first.machineRuntime.blue.healthByInstanceId.rim_booster, 0)
})

test('machine damage authority ignores legacy blueprint decoys and projection controls', () => {
  const redMachine = machineWithLaser('red', 'front_laser', machineBasis({
    right: [0, 0, -1],
    forward: [1, 0, 0],
  }))
  const blueMachine = machineWithCatalogPart('blue', 'drive_wheel', 'catalog:Wheel_Small')
  const legacyDecoyBlueprint = {
    name: 'legacy decoy should not be authoritative',
    blocks: [
      { id: 'legacy_weapon', partId: 'Weapon_Laser', position: [0, 0, 0], rotation: [0, 0, 0] },
    ],
  }
  const resolved = resolveSubmittedGameActions({
    ...machineCombatInput({
      redMachine,
      blueMachine,
      seed: 'machine-damage-native-not-legacy-projection',
    }),
    blue: {
      blueprint: legacyDecoyBlueprint,
      machineDesign: blueMachine,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
  }, {
    red: [canonicalCombatAction('red', 1, { weaponA: 'fire' })],
    blue: [canonicalCombatAction('blue', 1, { weaponA: 'fire' })],
  })

  assert.equal(resolved.machineRuntime.blue.healthByInstanceId.drive_wheel, 0)
  assert.equal(resolved.snapshot.blue.partHealth.legacy_weapon, undefined)
  assert.equal(resolved.snapshot.blue.partHealth.drive_wheel, 0)
  assert.equal(
    resolved.replay.events.some((event) => event.type === 'weapon_fire' && event.bot === 'blue'),
    false,
  )
})

test('machine resolver persists parent runtime orientation for child emitters on the next turn', () => {
  const initial = createInitialMachineDesign('red')
  const machine = {
    ...initial,
    parts: [
      initial.parts[0],
      machinePart('omni_wheel', {
        definitionId: 'catalog:Wheel_Omni',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
      machinePart('rim_laser', {
        definitionId: 'catalog:Weapon_Laser',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'omni_wheel', { mountId: 'core_shell' }),
      machineAttachment('core', 'rim_laser', { mountId: 'core_shell' }),
    ],
  }
  const resolved = resolveSubmittedGameActions(machineCombatInput({
    redMachine: machine,
    seed: 'machine-runtime-orientation-emitter',
  }), {
    red: canonicalCombatActions('red', [
      { move: 'turn_right' },
      { weaponA: 'fire' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'brake' },
      { move: 'brake' },
    ]),
  })
  const redRuntime = resolved.machineRuntime.red

  assert.equal(
    resolved.replay.events.some(
      (event) => event.type === 'weapon_fire' && event.bot === 'red' && event.turn === 2,
    ),
    true,
  )
  assertVectorClose(redRuntime.orientationByInstanceId.core.forward, [1, 0, 0], 'runtime core forward')
  assert.equal(deriveMachineCapabilities({
    ...machine,
    runtime: redRuntime,
  }).weapons[0].orientationSource, 'inherited_runtime_orientation')
  assertVectorClose(deriveMachineCapabilities({
    ...machine,
    runtime: redRuntime,
  }).weapons[0].emitterAxis, [1, 0, 0], 'child emitter after parent runtime turn')
})

test('machine submitted combat resolution is deterministic for identical runtime inputs', () => {
  const machine = machineWithLaser('red', 'front_laser', machineBasis({
    right: [0, 0, -1],
    forward: [1, 0, 0],
  }))
  const input = machineCombatInput({
    redMachine: machine,
    seed: 'machine-deterministic-runtime',
  })
  const actions = {
    red: canonicalCombatActions('red', [
      { weaponA: 'fire' },
      { weaponA: 'fire' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'brake' },
      { move: 'brake' },
    ]),
  }
  const first = resolveSubmittedGameActions(input, actions)
  const second = resolveSubmittedGameActions(input, actions)

  assert.deepEqual(first, second)
})

test('session creation stores machine authority and versions legacy continuation designs', async () => {
  const tokenFactory = (owner, kind) => `${owner}.${kind}.token`
  const tokenHasher = async (token) => `hash:${token}`
  const created = await createInitialSessionState(
    { sessionId: 's_machine_design_storage' },
    { tokenFactory, tokenHasher },
  )

  assert.equal(created.state.roles.red.storedDesign.version, 'machine:v1')
  assert.equal(created.state.roles.red.storedDesign.machine.parts.length, 1)
  assert.equal(created.state.roles.red.storedDesign.machine.parts[0].instanceId, 'core')
  assert.deepEqual(validateMachineTree(created.state.roles.red.storedDesign.machine), [])
  assert.equal(created.state.roles.red.loadoutBuildState, undefined)
  assert.equal(created.state.roles.blue.storedDesign.version, 'machine:v1')
  assert.equal(created.state.roles.red.currentDesign, undefined)

  const sharedDebrief = {
    debriefId: 'debrief_legacy',
    sourceSessionId: 's_legacy_source',
    fightIds: [],
    summary: 'Legacy continuation seed.',
    championImprovementHints: [],
    challengerCounterplayHints: [],
    evidence: [],
  }
  const legacyChampionDesign = {
    name: 'legacy champion',
    rootInstanceId: 'legacy_core',
    parts: [
      {
        instanceId: 'legacy_core',
        partId: 'Body_Square_Medium',
        cell: { x: 0, z: 0 },
      },
    ],
  }
  const continued = await createInitialSessionState(
    {
      sessionId: 's_machine_design_continuation',
      continuationSeed: {
        sourceSave: {
          saveId: 'save_legacy',
          sourceSessionId: 's_legacy_source',
          championRole: 'red',
          championTeamIdentity: { name: 'Legacy Red', colorHex: '#ff4c5d' },
          championDesign: legacyChampionDesign,
          championFinalState: { health: 10, maxHealth: 10 },
          championRecord: {
            wins: 1,
            consecutiveWins: 1,
            losses: 0,
            sourceSessionIds: ['s_legacy_source'],
          },
          fightDossier: { sessionId: 's_legacy_source', fights: [] },
          sharedDebrief,
          challengerBalance: { role: 'blue', bonusGold: 5, reason: 'test' },
          createdAt: '2026-06-07T00:00:00.000Z',
        },
        championRole: 'red',
        challengerRole: 'blue',
        challengerBonusGold: 5,
        sharedDebrief,
      },
    },
    { tokenFactory, tokenHasher },
  )

  assert.equal(continued.state.roles.red.storedDesign.version, 'legacy-bot-design:v1')
  assert.deepEqual(continued.state.roles.red.storedDesign.design, legacyChampionDesign)
  assert.equal(continued.state.roles.red.loadoutBuildState.currentDesign.version, 'legacy-bot-design:v1')
  assert.deepEqual(continued.state.roles.red.loadoutBuildState.legacyDraft, legacyChampionDesign)
  assert.equal(continued.state.roles.blue.storedDesign.version, 'machine:v1')

  const redReset = await resetStoredRoleClaim(
    continued.state,
    'red',
    tokenFactory,
    tokenHasher,
  )
  const blueReset = await resetStoredRoleClaim(
    continued.state,
    'blue',
    tokenFactory,
    tokenHasher,
  )

  assert.equal(redReset.ok, true)
  assert.equal(blueReset.ok, true)
  assert.equal(continued.state.roles.red.storedDesign.version, 'legacy-bot-design:v1')
  assert.deepEqual(continued.state.roles.red.storedDesign.design, legacyChampionDesign)
  assert.equal(continued.state.roles.red.loadoutBuildState.currentDesign.version, 'legacy-bot-design:v1')
  assert.deepEqual(continued.state.roles.red.loadoutBuildState.legacyDraft, legacyChampionDesign)
  assert.equal(continued.state.roles.blue.storedDesign.version, 'machine:v1')
})

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

function builderActionWithMountPoseParameters(action, overrides = {}) {
  return {
    ...action,
    payload: {
      ...action.payload,
      parameters: defaultMountPoseParameters(action, overrides),
    },
  }
}

function advanceBuilderToMountPose(harness, partId, targetInstanceId) {
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
        (targetInstanceId === undefined || action.payload.targetInstanceId === targetInstanceId),
    ),
  )

  return chooseBuilderAction(harness, (action) => action.kind === 'propose_mount_pose')
}

function forgedMountPoseAction(childPartId, parentInstanceId, mountSurfaceId, overrides = {}) {
  return {
    id: `forged.mount_pose.${childPartId}.${parentInstanceId}.${mountSurfaceId}`,
    kind: 'propose_mount_pose',
    role: 'red',
    payload: {
      scope: 'loadout_builder',
      type: 'propose_mount_pose',
      label: 'Forged mount pose',
      summary: 'Forged mount pose',
      childPartId,
      parentInstanceId,
      parameters: {
        childPartId,
        parentInstanceId,
        mountSurfaceId,
        u: 0.5,
        v: 0.5,
        yawDegrees: 0,
        rollDegrees: 0,
        ...overrides,
      },
    },
  }
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
  const poseAction = builderActions(harness).find((action) => action.kind === 'propose_mount_pose')

  if (poseAction) {
    applyBuilderAction(
      harness,
      builderActionWithMountPoseParameters(poseAction, {
        ...(options.mountSurfaceId ? { mountSurfaceId: options.mountSurfaceId } : {}),
        ...(options.u !== undefined ? { u: options.u } : {}),
        ...(options.v !== undefined ? { v: options.v } : {}),
        ...(options.yawDegrees !== undefined ? { yawDegrees: options.yawDegrees } : {}),
        ...(options.rollDegrees !== undefined ? { rollDegrees: options.rollDegrees } : {}),
      }),
    )
  } else {
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
  }

  return loadoutBuildStateLegacyDesign(harness.buildState).parts.at(-1)
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

function assertFiniteVectorComponents(vector, label) {
  assert.equal(Array.isArray(vector), true, `${label} must be a vector`)
  assert.equal(vector.length, 3, `${label} must have three components`)

  for (const component of vector) {
    assert.ok(Number.isFinite(component), `${label} has invalid component ${component}`)
  }
}

function assertVectorClose(actual, expected, label, epsilon = 1e-9) {
  assertFiniteVectorComponents(actual, label)
  assert.equal(actual.length, expected.length, `${label} length mismatch`)

  for (const [index, value] of actual.entries()) {
    assert.ok(
      Math.abs(value - expected[index]) <= epsilon,
      `${label}.${index} expected ${expected[index]} but received ${value}`,
    )
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

function assertCompleteMountSurface(surface, label) {
  assert.notEqual(surface, undefined, `${label} is missing`)
  assert.equal(typeof surface.id, 'string')
  assert.ok(surface.id.length > 0, `${label}.id is missing`)
  assert.ok(['panel', 'sphere'].includes(surface.kind), `${label}.kind is invalid`)
  assert.ok(surface.accepts.length > 0, `${label}.accepts must not be empty`)
  assertFiniteVectorComponents(surface.center, `${label}.center`)

  if (surface.kind === 'sphere') {
    assert.ok(Number.isFinite(surface.radius) && surface.radius > 0, `${label}.radius must be positive`)
    return
  }

  assert.equal(Array.isArray(surface.size), true, `${label}.size must be a tuple`)
  assert.equal(surface.size.length, 2, `${label}.size must have two components`)

  for (const component of surface.size) {
    assert.ok(Number.isFinite(component) && component > 0, `${label}.size has invalid component ${component}`)
  }

  assertFiniteVectorComponents(surface.normal, `${label}.normal`)
  assertFiniteVectorComponents(surface.uAxis, `${label}.uAxis`)
  assertFiniteVectorComponents(surface.vAxis, `${label}.vAxis`)
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

async function buildConfirmableMachineLoadout(_session, _token, packet) {
  return {
    packet,
    confirmAction: findLegalAction(packet, (action) => action.kind === 'confirm_loadout'),
  }
}

async function confirmMachineLoadout(session, token, packet) {
  const built = await buildConfirmableMachineLoadout(session, token, packet)

  return submitPacketAction(session, token, built.packet, built.confirmAction)
}

async function confirmBothMachineLoadouts(session, redToken, blueToken) {
  const redPacket = await session.getGameMasterPacketForToken(redToken)
  const bluePacket = await session.getGameMasterPacketForToken(blueToken)

  assert.equal(redPacket.ok, true)
  assert.equal(bluePacket.ok, true)

  const redSubmission = await confirmMachineLoadout(session, redToken, redPacket.value)
  const blueSubmission = await confirmMachineLoadout(session, blueToken, bluePacket.value)
  await openFirstCombatTurnForBoth(session, redToken, blueToken)

  return {
    redSubmission,
    blueSubmission,
  }
}

async function openFirstCombatTurnForBoth(session, redToken, blueToken) {
  const redArrived = await session.getGameMasterPacketForToken(redToken)
  assert.equal(redArrived.ok, true)

  if (redArrived.value.nextAction === 'choose_turn') {
    return {
      redPacket: redArrived.value,
      bluePacket: redArrived.value.role === 'blue' ? redArrived.value : undefined,
    }
  }

  const blueArrived = await session.getGameMasterPacketForToken(blueToken)
  assert.equal(blueArrived.ok, true)
  const redOpen = await session.getGameMasterPacketForToken(redToken)
  assert.equal(redOpen.ok, true)

  return {
    redPacket: redOpen.value,
    bluePacket: blueArrived.value,
  }
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

    for (const mountSurface of catalogPart.mountSurfaces) {
      assertCompleteMountSurface(mountSurface, `${catalogPart.id}.mountSurfaces.${mountSurface.id}`)
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
  const connectiveFillerIds = [
    'Frame_Strut',
    'Frame_Angled_Strut',
    'Mount_Plate',
    'Mount_Weapon_Hardpoint',
    'Mount_Axle_Bracket',
    'Spacer_Block',
  ]
  const requiredFillerIds = [
    ...connectiveFillerIds,
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

  for (const partId of connectiveFillerIds) {
    assert.equal(parts.get(partId)?.cost, 1)
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
  assert.equal(legalActions.filter((action) => action.kind === 'confirm_loadout').length, 1)
  assert.equal(legalActions.at(-1).kind, 'confirm_loadout')
  assert.equal(
    legalActions
      .filter((action) => action.kind !== 'confirm_loadout')
      .every((action) => action.kind === 'choose_part'),
    true,
  )
  assert.equal(legalActions.some((action) => action.kind === 'choose_mount'), false)
  assert.equal(legalActions.some((action) => action.kind === 'choose_rotation'), false)
})

test('machine loadout rejects forged legacy grid placement actions', () => {
  const buildState = createInitialLoadoutBuildState('red')
  const forgedChooseMount = applyLoadoutAction({
    role: 'red',
    gold: 100,
    inventory: [],
    buildState,
    action: {
      id: 'forged.legacy_mount',
      kind: 'choose_mount',
      role: 'red',
      payload: {
        scope: 'loadout_builder',
        type: 'choose_mount',
        label: 'Forged legacy mount',
        summary: 'Forged legacy mount',
        mount: 'side_front',
        mountKind: 'side_socket',
        mountMotion: 'static',
        collisionPolicy: 'reject_overlap',
        sector: 'front',
        attachCell: { x: 0, z: 1 },
      },
    },
  })
  const forgedChooseRotation = applyLoadoutAction({
    role: 'red',
    gold: 100,
    inventory: [],
    buildState,
    action: {
      id: 'forged.legacy_rotation',
      kind: 'choose_rotation',
      role: 'red',
      payload: {
        scope: 'loadout_builder',
        type: 'place_part',
        label: 'Forged legacy rotation',
        summary: 'Forged legacy rotation',
        rotation: 0,
        attachCell: { x: 0, z: 1 },
      },
    },
  })

  assert.equal(forgedChooseMount.ok, false)
  assert.equal(forgedChooseMount.issues[0].code, 'LEGACY_GRID_ACTION_REJECTED')
  assert.equal(forgedChooseRotation.ok, false)
  assert.equal(forgedChooseRotation.issues[0].code, 'LEGACY_GRID_ACTION_REJECTED')
})

test('machine loadout confirm uses machine tree validity instead of legacy minimum viable rules', () => {
  const buildState = createInitialLoadoutBuildState('red')
  const actionSet = buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 101,
    actionSetId: 'red:r1:loadout:machine-confirm:v101',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold: 100,
    buildState,
  })
  const confirmAction = Object.values(actionSet.actions)
    .find((action) => action.kind === 'confirm_loadout')
  const legacyIssues = validateLegacyMinimumViableLoadout(loadoutBuildStateLegacyDesign(buildState), PART_CATALOG)
  const legacyCodes = new Set(legacyIssues.map((issue) => issue.code))

  assert.notEqual(confirmAction, undefined)
  assert.equal(validateMachineTree(buildState.currentDesign.machine).length, 0)
  assert.equal(legacyCodes.has('MISSING_CORE'), true)
  assert.equal(legacyCodes.has('MISSING_MOBILITY'), true)
  assert.equal(legacyCodes.has('MISSING_WEAPON'), true)

  const confirmed = applyLoadoutAction({
    role: 'red',
    gold: 100,
    inventory: [],
    buildState,
    action: confirmAction,
  })

  assert.equal(confirmed.ok, true)
  assert.equal(confirmed.confirmed, true)
  assert.equal(confirmed.buildState.currentDesign.version, 'machine:v1')
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
    actionSetId: 'red:r1:loadout:propose_mount_pose:v102',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold,
    buildState,
  })
  const poseAction = Object.values(actionSet.actions)
    .find((action) => action.kind === 'propose_mount_pose')
  const coreShell = SYSTEM_MACHINE_CORE_DEFINITION.mountSurfaces.find((surface) => surface.id === 'core_shell')

  assert.notEqual(poseAction, undefined)
  assert.notEqual(coreShell, undefined)

  const poseParameters = defaultMountPoseParameters(poseAction, {
    mountSurfaceId: 'core_shell',
    u: 0.25,
    v: 0.5,
    yawDegrees: 90,
    rollDegrees: 0,
  })

  assert.deepEqual(Object.keys(poseAction.parameterSchema.properties).sort(), [
    'childPartId',
    'mountSurfaceId',
    'parentInstanceId',
    'rollDegrees',
    'u',
    'v',
    'yawDegrees',
  ])
  assert.equal(poseAction.parameterSchema.properties.u.enum, undefined)
  assert.equal(poseAction.parameterSchema.properties.v.enum, undefined)

  applied = applyLoadoutAction({
    role: 'red',
    gold,
    inventory,
    buildState,
    action: {
      ...poseAction,
      payload: {
        ...poseAction.payload,
        parameters: poseParameters,
      },
    },
  })

  assert.equal(applied.ok, true)
  gold = applied.gold
  inventory = applied.inventory
  buildState = applied.buildState
  const resolvedPose = resolveMountPose({
    surface: coreShell,
    partCategory: 'body',
    u: poseParameters.u,
    v: poseParameters.v,
    yawDegrees: poseParameters.yawDegrees,
    rollDegrees: poseParameters.rollDegrees,
  })
  const placedMachinePart = buildState.currentDesign.machine.parts.find((part) => part.instanceId === 'part_1')
  const attachment = buildState.currentDesign.machine.attachments.find((entry) => entry.childInstanceId === 'part_1')

  assert.equal(gold, 84)
  assert.deepEqual(inventory, [{ partId: 'Body_Light_Frame', quantity: 1 }])
  assert.deepEqual(loadoutBuildStateLegacyDesign(buildState).parts.map((part) => part.partId), ['Body_Light_Frame'])
  assert.deepEqual(placedMachinePart.transform.position, resolvedPose.position)
  assert.deepEqual(placedMachinePart.transform.rotation, [0, 90, 0])
  assert.deepEqual(placedMachinePart.transform.orientation, resolvedPose.orientation)
  assert.deepEqual(attachment.transform.orientation, resolvedPose.orientation)
  assert.equal(attachment.parentInstanceId, 'core')
  assert.equal(attachment.mountId, 'core_shell')
  assert.equal(validateLegacyMinimumViableLoadout(loadoutBuildStateLegacyDesign(buildState)).some((entry) => entry.code === 'MISSING_MOBILITY'), true)
})

test('machine loadout pose can place on child part surfaces', () => {
  const harness = createBuilderHarness()
  const body = placePartInHarness(harness, 'Body_Light_Frame', { mountSurfaceId: 'core_shell' })

  assert.equal(body.instanceId, 'part_1')

  const poseAction = advanceBuilderToMountPose(harness, 'Weapon_Laser', body.instanceId)
  const applied = applyBuilderAction(
    harness,
    builderActionWithMountPoseParameters(poseAction, {
      mountSurfaceId: 'deck_panel',
      u: 0.75,
      v: 0.25,
      yawDegrees: 45,
      rollDegrees: 15,
    }),
  )
  const laserPart = applied.buildState.currentDesign.machine.parts.find((part) => part.instanceId === 'part_2')
  const laserAttachment = applied.buildState.currentDesign.machine.attachments.find(
    (attachment) => attachment.childInstanceId === 'part_2',
  )

  assert.equal(applied.ok, true)
  assert.equal(laserAttachment.parentInstanceId, body.instanceId)
  assert.equal(laserAttachment.mountId, 'deck_panel')
  assert.deepEqual(laserPart.transform.rotation, [0, 45, 15])
  assert.notEqual(laserPart.transform.orientation, undefined)
  assert.notDeepEqual(laserPart.transform.orientation.forward, [0, 0, 1])
})

test('machine pose rejects hard collisions before mutating builder state', () => {
  const harness = createBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame', {
    mountSurfaceId: 'core_shell',
    u: 0.5,
    v: 0.5,
  })

  const poseAction = advanceBuilderToMountPose(harness, 'Body_Light_Frame', 'core')
  const baseState = JSON.stringify(harness.buildState)
  const baseGold = harness.gold
  const baseInventory = JSON.stringify(harness.inventory)
  const rejected = tryBuilderAction(
    harness,
    builderActionWithMountPoseParameters(poseAction, {
      mountSurfaceId: 'core_shell',
      u: 0.5,
      v: 0.5,
      yawDegrees: 0,
      rollDegrees: 0,
    }),
  )

  assert.equal(rejected.ok, false)
  assert.ok(rejected.issues.some((issue) => issue.code === 'HARD_PART_COLLISION'))
  assert.equal(JSON.stringify(harness.buildState), baseState)
  assert.equal(harness.gold, baseGold)
  assert.equal(JSON.stringify(harness.inventory), baseInventory)
})

test('machine pose rejects invalid parent and unsupported surface without mutating design', () => {
  const harness = createBuilderHarness()
  const body = placePartInHarness(harness, 'Body_Light_Frame', { mountSurfaceId: 'core_shell' })
  const wheel = placePartInHarness(harness, 'Wheel_Small', {
    targetInstanceId: body.instanceId,
    mountSurfaceId: 'hull_shell',
  })

  applyBuilderAction(
    harness,
    chooseBuilderAction(
      harness,
      (action) => action.kind === 'choose_part' && action.payload.partId === 'Weapon_Laser',
    ),
  )

  const baseState = harness.buildState
  const baseGold = harness.gold
  const baseDesign = JSON.stringify(baseState.currentDesign)
  const missingParentState = {
    ...baseState,
    step: 'propose_mount_pose',
    selectedAttachTargetId: 'ghost_parent',
  }
  const missingParent = applyLoadoutAction({
    role: 'red',
    gold: baseGold,
    inventory: harness.inventory,
    buildState: missingParentState,
    action: forgedMountPoseAction('Weapon_Laser', 'ghost_parent', 'deck_panel'),
    catalog: harness.catalog,
  })
  const detachedState = {
    ...baseState,
    step: 'propose_mount_pose',
    selectedAttachTargetId: body.instanceId,
    currentDesign: {
      version: 'machine:v1',
      machine: {
        ...baseState.currentDesign.machine,
        runtime: {
          healthByInstanceId: {},
          detachedInstanceIds: [body.instanceId],
        },
      },
    },
  }
  const detachedParent = applyLoadoutAction({
    role: 'red',
    gold: baseGold,
    inventory: harness.inventory,
    buildState: detachedState,
    action: forgedMountPoseAction('Weapon_Laser', body.instanceId, 'deck_panel'),
    catalog: harness.catalog,
  })
  const unsupportedSurfaceState = {
    ...baseState,
    step: 'propose_mount_pose',
    selectedAttachTargetId: wheel.instanceId,
  }
  const unsupportedSurface = applyLoadoutAction({
    role: 'red',
    gold: baseGold,
    inventory: harness.inventory,
    buildState: unsupportedSurfaceState,
    action: forgedMountPoseAction('Weapon_Laser', wheel.instanceId, 'deck_panel'),
    catalog: harness.catalog,
  })

  assert.equal(missingParent.ok, false)
  assert.equal(missingParent.issues[0].code, 'INVALID_ATTACH_TARGET')
  assert.equal(detachedParent.ok, false)
  assert.equal(detachedParent.issues[0].code, 'DETACHED_ATTACH_TARGET')
  assert.equal(unsupportedSurface.ok, false)
  assert.equal(unsupportedSurface.issues.some((issue) => issue.code === 'MOUNT_SURFACE_CATEGORY_REJECTED'), true)
  assert.equal(harness.gold, baseGold)
  assert.equal(JSON.stringify(baseState.currentDesign), baseDesign)
})

test('machine pose rejects invalid uv before spending gold or mutating design', () => {
  const harness = createBuilderHarness()
  const poseAction = advanceBuilderToMountPose(harness, 'Body_Light_Frame', 'core')
  const beforeGold = harness.gold
  const beforeInventory = JSON.stringify(harness.inventory)
  const beforeDesign = JSON.stringify(harness.buildState.currentDesign)
  const rejected = tryBuilderAction(
    harness,
    builderActionWithMountPoseParameters(poseAction, {
      mountSurfaceId: 'core_shell',
      u: -0.1,
      v: 0.5,
    }),
  )

  assert.equal(rejected.ok, false)
  assert.equal(rejected.issues.some((issue) => issue.code === 'MOUNT_PARAMETER_OUT_OF_BOUNDS'), true)
  assert.equal(harness.gold, beforeGold)
  assert.equal(JSON.stringify(harness.inventory), beforeInventory)
  assert.equal(JSON.stringify(harness.buildState.currentDesign), beforeDesign)
})

test('machine pose rejects insufficient gold before spending or mutating design', () => {
  const harness = createBuilderHarness(5)
  harness.buildState = {
    ...harness.buildState,
    step: 'propose_mount_pose',
    selectedPartId: 'Weapon_Laser',
    selectedAttachTargetId: 'core',
  }
  const beforeGold = harness.gold
  const beforeInventory = JSON.stringify(harness.inventory)
  const beforeDesign = JSON.stringify(harness.buildState.currentDesign)
  const rejected = tryBuilderAction(
    harness,
    forgedMountPoseAction('Weapon_Laser', 'core', 'core_shell', { u: 0, v: 0.5 }),
  )

  assert.equal(rejected.ok, false)
  assert.equal(rejected.issues[0].code, 'INSUFFICIENT_GOLD')
  assert.equal(harness.gold, beforeGold)
  assert.equal(JSON.stringify(harness.inventory), beforeInventory)
  assert.equal(JSON.stringify(harness.buildState.currentDesign), beforeDesign)
})

test('machine purchased part limit excludes immutable core', () => {
  const harness = createBuilderHarness()
  const baseState = createInitialLoadoutBuildState('red')
  const almostFilledMachine = {
    ...baseState.currentDesign.machine,
    parts: [
      ...baseState.currentDesign.machine.parts,
      ...Array.from({ length: LOADOUT_PART_LIMIT - 1 }, (_, index) => ({
        instanceId: `part_${index + 1}`,
        definitionId: 'catalog:Armor_Tile',
        source: 'catalog_part',
        transform: {
          position: [index + 1, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      })),
    ],
  }
  const allowedState = {
    ...baseState,
    step: 'propose_mount_pose',
    selectedPartId: 'Armor_Tile',
    selectedAttachTargetId: 'core',
    currentDesign: {
      version: 'machine:v1',
      machine: almostFilledMachine,
    },
  }
  const allowed = applyLoadoutAction({
    role: 'red',
    gold: 1000,
    inventory: harness.inventory,
    buildState: allowedState,
    action: forgedMountPoseAction('Armor_Tile', 'core', 'core_deck'),
    catalog: harness.catalog,
  })

  assert.equal(allowed.ok, true)

  const fullState = {
    ...allowed.buildState,
    step: 'propose_mount_pose',
    selectedPartId: 'Armor_Tile',
    selectedAttachTargetId: 'core',
  }
  const rejected = applyLoadoutAction({
    role: 'red',
    gold: allowed.gold,
    inventory: allowed.inventory,
    buildState: fullState,
    action: forgedMountPoseAction('Armor_Tile', 'core', 'core_deck'),
    catalog: harness.catalog,
  })

  assert.equal(almostFilledMachine.parts.filter((part) => part.source === 'system_core').length, 1)
  assert.equal(almostFilledMachine.parts.filter((part) => part.source === 'catalog_part').length, LOADOUT_PART_LIMIT - 1)
  assert.equal(allowed.buildState.currentDesign.machine.parts.filter((part) => part.source === 'catalog_part').length, LOADOUT_PART_LIMIT)
  assert.equal(rejected.ok, false)
  assert.equal(rejected.issues[0].code, 'PART_LIMIT_REACHED')
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
  const issues = validateLegacyMinimumViableLoadout({
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
  const harness = createLegacyBuilderHarness()

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
  const harness = createLegacyBuilderHarness()

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
  const harness = createLegacyBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const laser = placePartInHarness(harness, 'Weapon_Laser', {
    targetInstanceId: 'part_1',
    mountPredicate: (action) => action.payload.mount === 'top_socket',
  })

  assert.deepEqual(laser.cell, { x: 0, z: 0 })
  assert.equal(laser.mountCollisionPolicy, 'allow_clip_v1')
})

test('reject_overlap_mount_rejects_occupied_cell', () => {
  const harness = createLegacyBuilderHarness()

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
  const issues = validateLegacyMinimumViableLoadout({
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
  const harness = createLegacyBuilderHarness()

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
  assert.equal(loadoutBuildStateLegacyDesign(harness.buildState).parts.some((part) => part.instanceId === wheel.instanceId), false)
})

test('builder_remove_parent_requires_remove_subtree', () => {
  const harness = createLegacyBuilderHarness()

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
  const harness = createLegacyBuilderHarness()

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

  assert.equal(loadoutBuildStateLegacyDesign(harness.buildState).parts.map((part) => part.partId).join(','), 'Body_Light_Frame')
  assert.ok(harness.gold > beforeRemoveGold)
  assert.equal(harness.inventory.some((item) => item.partId === 'Weapon_Laser'), false)
})

test('builder_move_part_remounts_with_catalog_mounts', () => {
  const harness = createLegacyBuilderHarness()

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

  const moved = loadoutBuildStateLegacyDesign(harness.buildState).parts.find((part) => part.instanceId === wheel.instanceId)

  assert.deepEqual(moved?.cell, { x: 0, z: -1 })
  assert.equal(moved?.mountId, 'side_rear')
  assert.equal(JSON.stringify(harness.inventory), inventoryBeforeMove)
})

test('builder_rotate_part_uses_server_rotation_action', () => {
  const harness = createLegacyBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  applyBuilderAction(
    harness,
    chooseBuilderAction(harness, (action) =>
      action.kind === 'rotate_part' &&
      action.payload.instanceId === 'part_1' &&
      action.payload.rotation === 90,
    ),
  )

  assert.equal(loadoutBuildStateLegacyDesign(harness.buildState).parts[0].rotation, 90)
})

test('agent_cannot_submit_raw_mount_transform', () => {
  const harness = createLegacyBuilderHarness()

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
  const harness = createLegacyBuilderHarness()

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
  const harness = createLegacyBuilderHarness()

  placePartInHarness(harness, 'Body_Light_Frame')
  const wheel = placePartInHarness(harness, 'Wheel_Omni', { targetInstanceId: 'part_1' })
  placePartInHarness(harness, 'Weapon_Laser', {
    targetInstanceId: wheel.instanceId,
    mountPredicate: (action) => action.payload.mount === 'rim_outer',
  })
  const blueprint = botDesignSnapshotToLegacyBotBlueprintProjection(loadoutBuildStateLegacyDesign(harness.buildState))
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
  const harness = createLegacyBuilderHarness()

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

test('store_has_no_hidden_foundation_offers', () => {
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

  assert.deepEqual(redStore.foundationPartIds, [
    'Frame_Strut',
    'Frame_Angled_Strut',
    'Mount_Plate',
    'Mount_Weapon_Hardpoint',
    'Mount_Axle_Bracket',
    'Spacer_Block',
  ])
  assert.deepEqual(blueStore.foundationPartIds, redStore.foundationPartIds)
  assert.deepEqual(
    redStore.offeredPartIds.sort(),
    [...new Set([...redStore.slots.map((slot) => slot.partId), ...redStore.foundationPartIds])].sort(),
  )
  assert.deepEqual(
    blueStore.offeredPartIds.sort(),
    [...new Set([...blueStore.slots.map((slot) => slot.partId), ...blueStore.foundationPartIds])].sort(),
  )
})

test('store_limits_rare_signature_without_minimum_viability_rails', () => {
  const gold = 18
  const store = buildCatalogStore({
    catalog: PART_CATALOG,
    role: 'blue',
    round: 4,
    seed: 'viability-store',
    gold,
  })
  const partsById = new Map(PART_CATALOG.map((part) => [part.id, part]))
  const rareSignatureSlots = store.slots.filter((slot) => {
    const part = partsById.get(slot.partId)

    return part?.rarity !== 'normal' && part?.signatureEffect
  })
  const totalRareSignatureCost = rareSignatureSlots.reduce(
    (total, slot) => total + (partsById.get(slot.partId)?.cost ?? 0),
    0,
  )

  assert.ok(store.foundationPartIds.includes('Frame_Strut'))
  assert.ok(store.foundationPartIds.includes('Spacer_Block'))
  assert.deepEqual(
    store.offeredPartIds.sort(),
    [...new Set([...store.slots.map((slot) => slot.partId), ...store.foundationPartIds])].sort(),
  )
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
  assert.deepEqual(actionSet.catalogStore?.foundationPartIds, [
    'Frame_Strut',
    'Frame_Angled_Strut',
    'Mount_Plate',
    'Mount_Weapon_Hardpoint',
    'Mount_Axle_Bracket',
    'Spacer_Block',
  ])
  assert.deepEqual(
    actionSet.catalogStore?.offeredPartIds.sort(),
    [
      ...new Set([
        ...(actionSet.catalogStore?.slots.map((slot) => slot.partId) ?? []),
        ...(actionSet.catalogStore?.foundationPartIds ?? []),
      ]),
    ].sort(),
  )
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

test('agent board view exposes tactical cells, reachable poses, and attack targets', () => {
  const actionSet = buildTacticalCombatActionSet({ role: 'red' })
  const snapshot = combatSnapshot(tacticalOpenArena, [-1, 0, 0], [1, 0, 0], { tick: 1 })
  const fire = findCombatAction(actionSet, (command) => command.weaponA === 'fire' && command.move === undefined)
  const dash = findCombatAction(actionSet, (command) => command.move === 'dash_forward' && command.weaponA !== 'fire')
  const board = buildAgentBoardView({
    arena: snapshot.arena,
    role: 'red',
    self: snapshot.red,
    opponent: snapshot.blue,
    actions: Object.values(actionSet.actions),
  })

  assert.deepEqual(board.grid, { cellSize: 1, xMin: -4, xMax: 4, zMin: -4, zMax: 4 })
  assert.deepEqual(board.self.anchor, { x: -1, z: 0 })
  assert.deepEqual(board.opponent.anchor, { x: 1, z: 0 })
  assert.equal(board.cells.length, 81)
  assert.equal(board.blockedCells.length, 0)

  const selfCell = board.cells.find((cell) => cell.cellId === 'cell:-1:0')
  const opponentCell = board.cells.find((cell) => cell.cellId === 'cell:1:0')
  const cornerCell = board.cells.find((cell) => cell.cellId === 'cell:-4:-4')
  const dashPose = board.reachablePoses.find((pose) => pose.actionIds.includes(dash.id))
  const attackTarget = board.attackableTargets.find((target) => target.targetId === 'opponent')

  assert.equal(selfCell.occupant, 'self')
  assert.equal(selfCell.reachable, true)
  assert.equal(selfCell.mobilityCost, 0)
  assert.equal(selfCell.legal.attacksFromHere[0].actionId, fire.id)
  assert.equal(opponentCell.occupant, 'opponent')
  assert.ok(opponentCell.targetableByActionIds.includes(fire.id))
  assert.ok(cornerCell.unavailableReasons.includes('No current legal action ends on this cell.'))
  assert.deepEqual(dashPose.anchor, { x: 1, z: 0 })
  assert.ok(dashPose.riskTags.includes('occupied_anchor_conflict'))
  assert.ok(attackTarget.actionIds.includes(fire.id))

  const blockedSet = buildTacticalCombatActionSet({
    role: 'red',
    arena: tacticalBlockedArena,
  })
  const blockedSnapshot = combatSnapshot(tacticalBlockedArena, [-1, 0, 0], [1, 0, 0], { tick: 1 })
  const blockedBoard = buildAgentBoardView({
    arena: tacticalBlockedArena,
    role: 'red',
    self: blockedSnapshot.red,
    opponent: blockedSnapshot.blue,
    actions: Object.values(blockedSet.actions),
  })
  const blockedCell = blockedBoard.cells.find((cell) => cell.cellId === 'cell:0:0')

  assert.ok(blockedBoard.blockedCells.some((cell) => cell.x === 0 && cell.z === 0))
  assert.equal(blockedCell.blocksMovement, true)
  assert.equal(blockedCell.blocksLineOfSight, true)
  assert.ok(blockedCell.unavailableReasons.includes('Cell blocks movement and line of sight.'))
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

test('resolveSubmittedGameActions emits continuous visual move timing with explicit combat turns', () => {
  const resolution = resolveSubmittedGameActions({
    round: 1,
    seed: 'canonical-replay-smooth-timing',
    red: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({ movementPolicy: 'close' }),
    },
    blue: {
      blueprint: validSpinnerSubmission.blueprint,
      tactics: normalizeTactics({ movementPolicy: 'hold_ground' }),
    },
    arena: tacticalRuntimeArena,
  }, {
    red: canonicalCombatActions('red', [
      { move: 'forward' },
      { move: 'forward' },
      { move: 'forward' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'brake' },
      { move: 'brake' },
      { move: 'brake' },
    ]),
  })
  const redMoves = moveEvents(resolution, 'red').slice(0, 3)

  assert.deepEqual(redMoves.map((event) => event.turn), [1, 2, 3])
  assert.ok(redMoves[0].t < 1)
  assert.equal(validateReplayTimeline(resolution.replay), true)

  for (let index = 1; index < redMoves.length; index += 1) {
    const previous = redMoves[index - 1]
    const current = redMoves[index]
    const spacing = current.t - previous.t

    assert.ok(spacing > 0)
    assert.ok(spacing <= (previous.duration ?? 0) + 0.001)
  }
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

test('resolveSubmittedGameActions pushes a held opponent anchor instead of coercing movement to brake', () => {
  const conflictInput = {
    round: 1,
    seed: 'canonical-anchor-push',
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
  const resolution = resolveSubmittedGameActions(conflictInput, {
    red: canonicalCombatActions('red', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'dash_forward' },
    ]),
    blue: canonicalCombatActions('blue', [
      { move: 'dash_forward' },
      { move: 'dash_forward' },
      { move: 'brake' },
      { move: 'brake' },
    ]),
  })

  assert.equal(resolution.status, 'active')
  assert.equal(resolution.snapshot.red.position[0], 2)
  assert.equal(resolution.snapshot.blue.position[0], 3)
  assert.equal(resolution.log.some((entry) => entry.includes('red pushed a held blue anchor')), true)
  assert.equal(
    resolution.replay.events.some((event) =>
      event.type === 'move' &&
      event.bot === 'blue' &&
      event.intent === 'forced' &&
      event.turn === 4
    ),
    true,
  )
  assert.equal(
    resolution.replay.events.some((event) =>
      event.type === 'move' &&
      event.bot === 'red' &&
      event.command === 'brake' &&
      event.turn === 4
    ),
    false,
  )
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
      (event) => event.type === 'weapon_fire' && event.bot === 'red' && event.turn === 4,
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
  const slotsByTurn = new Map()

  for (const event of redWeaponFire) {
    const slots = slotsByTurn.get(event.turn) ?? new Set()

    slots.add(event.weaponSlot)
    slotsByTurn.set(event.turn, slots)
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
    [...slotsByTurn.values()].some(
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

  const hitTurn = firstNetHit.turn
  const blueMoves = new Map(moveEvents(result, 'blue').map((event) => [event.turn, event]))
  const beforeSlow = blueMoves.get(hitTurn)
  const afterSlow = blueMoves.get(hitTurn + 1)

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
  const deltas = new Map(redMoveEvents(result).map((event) => [event.turn, movementDelta(event)]))

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
  const droneTurns = result.replay.events
    .filter((event) => event.type === 'ability' && event.bot === 'red')
    .map((event) => event.turn)

  assert.deepEqual(droneTurns, [1, 5])
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
  const blueMoveTurns = new Set(moveEvents(turretResult, 'blue').map((event) => event.turn))
  const blueFire = turretResult.replay.events.filter(
    (event) => event.type === 'weapon_fire' && event.bot === 'blue',
  )

  assert.ok(blueFire.some((event) => blueMoveTurns.has(event.turn)))
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
  const forcedBlueMoves = moveEvents(result, 'blue').filter((event) => event.intent === 'forced')

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

  assert.deepEqual(droneAbilities.map((event) => event.turn), [1, 5])
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
  assert.equal(first.replay.duration, 43.68)
  assert.equal(first.reason, 'No bot took damage for 60 combat turns; the round ended as a draw.')
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
    deadlineAt: '2026-06-03T00:04:00.000Z',
    planSeconds: 240,
  })
})

test('GameMaster fixed actions reject parameters and still accept fixed submissions', async () => {
  const session = await createTestSession('s_fixed_action_parameters')
  const { redToken } = await claimBothRoles(session)
  const packet = await session.getGameMasterPacketForToken(redToken)

  assert.equal(packet.ok, true)

  const fixedAction = findLegalAction(packet.value, (action) => !action.parameterSchema)
  const rejected = await session.submitGameMasterAction(redToken, {
    ...actionSubmissionFromPacket(packet.value, fixedAction.id),
    parameters: {},
  })

  assert.equal(rejected.ok, false)
  assert.equal(rejected.error.code, 'SUBMISSION_INVALID')
  assert.ok(rejected.error.issues.some((issue) => issue.code === 'UNEXPECTED_PARAMETERS'))

  const accepted = await session.submitGameMasterAction(
    redToken,
    actionSubmissionFromPacket(packet.value, fixedAction.id),
  )

  assert.equal(accepted.ok, true)
})

test('agent bootstrap uses the invite claim token as a reusable player key', async () => {
  const session = await createTestSession()
  const badBootstrap = await session.bootstrapRole('red', 'claim_not_real', {})

  assert.equal(badBootstrap.ok, false)
  assert.equal(badBootstrap.error.code, 'INVALID_TOKEN')

  const preBootstrapState = await session.getRoleStateForToken('claim_red')

  assert.equal(preBootstrapState.ok, true)
  assert.equal(preBootstrapState.value.role, 'red')
  assert.equal(preBootstrapState.value.identity, undefined)
  assert.equal(preBootstrapState.value.gameMaster.phase, 'wait_for_opponent_claim')
  assert.equal(preBootstrapState.value.gameMaster.nextAction, 'wait_for_opponent_claim')

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
  assert.equal(blue.value.state.roundPlan.planSeconds, 240)
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

test('combat packets expose lockstep plan metadata instead of canonical movement menus', async () => {
  const session = await createTestSession('s_lockstep_packet_contract')
  const { redToken, blueToken } = await claimBothRoles(session)

  await confirmBothMachineLoadouts(session, redToken, blueToken)

  const blueCombat = await session.getGameMasterPacketForToken(blueToken)
  const redCombat = await session.getGameMasterPacketForToken(redToken)

  assert.equal(blueCombat.ok, true)
  assert.equal(redCombat.ok, true)

  for (const packet of [blueCombat.value, redCombat.value]) {
    assert.equal(packet.phase, 'combat_turn')
    assert.equal(packet.nextAction, 'choose_turn')
    assert.notEqual(packet.combat, undefined)
    assert.notEqual(packet.board, undefined)
    assert.equal(packet.submit?.method, 'POST')
    assert.equal(packet.submit?.path, `/sessions/${session.exportState().id}/combat-plan`)
    assert.equal(packet.submit?.body.action, 'submit_combat_round_plan')
    assert.equal(packet.submit?.body.round, packet.combat.round)
    assert.equal(packet.submit?.body.decisionVersion, packet.combat.decisionVersion)
    assert.equal(packet.legalActions.every((action) => action.kind === 'surrender'), true)
    assert.equal(JSON.stringify(packet.legalActions).includes('command'), false)
    assert.equal(JSON.stringify(packet.legalActions).includes('payload'), false)
    assert.equal(typeof packet.board.ascii, 'string')
    assert.ok(packet.board.reachableCells.length > 0)
    assert.equal(JSON.stringify(packet.board).includes('command'), false)
    assert.equal(JSON.stringify(packet.board).includes('payload'), false)
  }
})

test('session resolves after both confirmed loadouts while keeping public state redacted', async () => {
  const session = await createTestSession()
  const { redToken, blueToken } = await claimBothRoles(session)
  const redPacket = await session.getGameMasterPacketForToken(redToken)
  const bluePacket = await session.getGameMasterPacketForToken(blueToken)

  assert.equal(redPacket.ok, true)
  assert.equal(bluePacket.ok, true)

  const redSubmission = await confirmMachineLoadout(session, redToken, redPacket.value)

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.publicState.phase, 'submission_phase')
  assert.equal(redSubmission.value.publicState.roles.red.submitted, true)
  assert.equal(redSubmission.value.publicState.roles.blue.submitted, false)
  assert.equal(redSubmission.value.publicState.replayAvailable, false)
  assert.equal(redSubmission.value.publicState.roundPlan.planSeconds, 240)
  assert.equal(redSubmission.value.publicState.roundPlan.deadlineAt, '2026-06-03T00:04:00.000Z')

  const preReplay = session.getReplay()

  assert.equal(preReplay.ok, false)
  assert.equal(preReplay.error.code, 'REPLAY_NOT_AVAILABLE')

  const blueSubmission = await confirmMachineLoadout(session, blueToken, bluePacket.value)
  const blueState = await session.getRoleStateForToken(blueToken)

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'combat_turn')
  assert.equal(blueSubmission.value.publicState.replayAvailable, false)
  assert.equal(blueSubmission.value.publicState.roundPlan, undefined)
  assert.equal(blueSubmission.value.publicState.combat.tick, 1)
  assert.equal(blueState.ok, true)
  assert.equal(blueState.value.gameMaster.nextAction, 'wait_for_opponent_turn')
  assert.equal(blueState.value.gameMaster.legalActions.length, 0)
  assert.equal(blueState.value.combat.turnSeconds, 60)
  assert.equal(blueState.value.combat.self.role, 'blue')
  assert.equal(blueState.value.combat.opponent.role, 'red')
  assert.equal(blueState.value.combat.decision.tick, 1)
  assert.equal('availableCommands' in blueState.value.combat.decision, false)
  assert.equal(blueState.value.combat.decision.range.band, 'long')
  assert.deepEqual(blueState.value.combat.decision.positioning.selfCell, { x: 6, z: 0 })
  assert.deepEqual(blueState.value.combat.decision.positioning.opponentCell, { x: -6, z: 0 })
  assert.equal(blueState.value.combat.decision.positioning.distanceCells, 12)
  assert.equal(blueState.value.combat.decision.positioning.bearingToOpponent, 'west')
  assert.equal(blueState.value.combat.decision.hazards.active.includes('floor_saw'), true)
  assert.equal(blueState.value.combat.decision.arenaPressure.selfNearHazard, false)
  assert.equal('approach' in blueState.value.combat.decision.movementGuidance, false)
  assert.equal('avoid' in blueState.value.combat.decision.movementGuidance, false)
  assert.ok(blueState.value.combat.decision.movementGuidance.reasons.length > 0)
  assert.equal('decision' in blueSubmission.value.publicState.combat, false)
  assert.equal('awardOptions' in blueSubmission.value.publicState, false)

  const resolved = await submitSurrenderFromLatestPacket(session, redToken)

  assert.equal(resolved.value.publicState.phase, 'round_review')
  assert.equal(resolved.value.publicState.replayAvailable, true)
  assert.ok(resolved.value.publicState.lastResult)

  const replay = session.getReplay()

  assert.equal(replay.ok, true)
  assert.equal(replay.value.botBlueprints.red.name, 'red loadout')
  assert.equal(replay.value.botBlueprints.blue.name, 'blue loadout')
  assert.equal(resolved.value.publicState.lastResult.damage.red, 0)
  assert.equal(resolved.value.publicState.lastResult.damage.blue, 0)
  assert.equal(replay.value.events.some((event) => event.type === 'weapon_fire'), false)
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
  assert.equal(redState.value.ownLoadout.machineDesign.rootInstanceId, 'core')
  assert.equal(redState.value.ownLoadout.machineDesign.parts.some((part) => part.instanceId === 'core'), true)
  assert.equal(JSON.stringify(redState.value.opponent).includes('red loadout'), false)
})

test('first combat turn clock starts after both agents fetch the combat packet', async () => {
  const now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_first_combat_start_gate', {
    clock: () => now,
  })
  const { redToken, blueToken } = await claimBothRoles(session)
  const redPacket = await session.getGameMasterPacketForToken(redToken)
  const bluePacket = await session.getGameMasterPacketForToken(blueToken)

  assert.equal(redPacket.ok, true)
  assert.equal(bluePacket.ok, true)

  const redSubmission = await confirmMachineLoadout(session, redToken, redPacket.value)
  const blueSubmission = await confirmMachineLoadout(session, blueToken, bluePacket.value)

  assert.equal(redSubmission.ok, true)
  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'combat_turn')

  let stored = session.exportState()

  assert.equal(stored.combat.nextTick, 1)
  assert.deepEqual(stored.combat.startGate.readyBy, {})
  assert.equal(stored.combat.openedAt, '2026-06-03T00:02:00.000Z')
  assert.equal(stored.combat.deadlineAt, '2026-06-03T00:03:00.000Z')

  const redArrived = await session.getGameMasterPacketForToken(redToken)

  assert.equal(redArrived.ok, true)
  assert.equal(redArrived.value.nextAction, 'wait_for_opponent_turn')
  assert.equal(redArrived.value.legalActions.length, 0)

  stored = session.exportState()

  assert.deepEqual(Object.keys(stored.combat.startGate.readyBy), ['red'])

  const blueArrived = await session.getGameMasterPacketForToken(blueToken)

  assert.equal(blueArrived.ok, true)
  assert.equal(blueArrived.value.nextAction, 'choose_turn')
  assert.equal(blueArrived.value.legalActions.length > 0, true)

  stored = session.exportState()

  assert.equal(stored.combat.startGate, undefined)
  assert.equal(stored.combat.openedAt, now)
  assert.equal(stored.combat.deadlineAt, '2026-06-03T00:01:00.000Z')

  const redOpen = await session.getGameMasterPacketForToken(redToken)

  assert.equal(redOpen.ok, true)
  assert.equal(redOpen.value.nextAction, 'choose_turn')
  assert.equal(redOpen.value.legalActions.length > 0, true)
})

test('session lets a combat agent surrender to resolve a stalled round', async () => {
  const session = await createTestSession('s_combat_surrender')
  const { redToken, blueToken } = await claimBothRoles(session)

  await confirmBothMachineLoadouts(session, redToken, blueToken)

  const redPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(redPacket.ok, true)

  const surrenderAction = findLegalAction(redPacket.value, (action) => action.kind === 'surrender')
  const surrendered = await submitPacketAction(session, redToken, redPacket.value, surrenderAction)

  assert.equal(surrendered.ok, true)
  assert.equal(surrendered.value.publicState.phase, 'round_review')
  assert.equal(surrendered.value.publicState.replayAvailable, true)
  assert.equal(surrendered.value.publicState.lastResult.winner, 'blue')
  assert.equal(surrendered.value.publicState.lastResult.reason, 'Red surrendered; Blue wins the round.')
  assert.equal(surrendered.value.publicState.lastResult.damage.red, 0)
  assert.equal(surrendered.value.publicState.lastResult.damage.blue, 0)
  assert.equal(session.exportState().combat, undefined)

  const replay = session.getReplay()

  assert.equal(replay.ok, true)
  assert.equal(validateReplayTimeline(replay.value), true)
  assert.equal(replay.value.summary, 'Red surrendered; Blue wins the round.')
})

test('session delays the next combat plan packet after a resolved lockstep round', async () => {
  let now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_combat_plan_handoff_delay', {
    clock: () => now,
  })
  const { redToken, blueToken } = await claimBothRoles(session)

  await confirmBothMachineLoadouts(session, redToken, blueToken)

  const bluePacket = await session.getGameMasterPacketForToken(blueToken)
  const redPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(bluePacket.ok, true)
  assert.equal(redPacket.ok, true)
  assert.equal(bluePacket.value.nextAction, 'choose_turn')
  assert.equal(redPacket.value.nextAction, 'choose_turn')

  const redSubmission = await submitCombatPlanFromPacket(session, redToken, redPacket.value, [{ kind: 'end_turn' }])

  assert.equal(redSubmission.ok, true)
  assert.equal(redSubmission.value.publicState.phase, 'combat_turn')
  assert.equal(redSubmission.value.packet.nextAction, 'wait_for_opponent_turn')

  const blueSubmission = await submitCombatPlanFromPacket(session, blueToken, bluePacket.value, [{ kind: 'end_turn' }])

  assert.equal(blueSubmission.ok, true)
  assert.equal(blueSubmission.value.publicState.phase, 'combat_turn')

  const delayedState = session.exportState()

  assert.equal(delayedState.combat.openedAt, '2026-06-03T00:00:10.000Z')
  assert.equal(delayedState.combat.deadlineAt, '2026-06-03T00:01:10.000Z')

  const delayedPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(delayedPacket.ok, true)
  assert.equal(delayedPacket.value.nextAction, 'wait_for_opponent_turn')
  assert.equal(delayedPacket.value.legalActions.length, 0)
  assert.equal(delayedPacket.value.submit, undefined)
  assert.equal(
    delayedPacket.value.instruction.includes('Next combat round opens at 2026-06-03T00:00:10.000Z'),
    true,
  )

  now = '2026-06-03T00:00:10.000Z'

  const openPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(openPacket.ok, true)
  assert.equal(openPacket.value.nextAction, 'choose_turn')
  assert.notEqual(openPacket.value.combat, undefined)
  assert.equal(openPacket.value.submit?.path, `/sessions/${session.exportState().id}/combat-plan`)
})

test('combat round plan validation rejects invalid steps and over-budget movement', () => {
  const invalid = normalizeCombatRoundPlanSubmission({
    action: 'submit_combat_round_plan',
    round: 1,
    decisionVersion: 1,
    steps: [{ kind: 'teleport', cellId: 'cell:2:0' }],
  })

  assert.equal(invalid.ok, false)
  assert.equal(
    invalid.issues.some((issue) => issue.code === 'INVALID_STEP_KIND'),
    true,
  )

  const overBudget = validateCombatRoundPlanAgainstBoard({
    submission: {
      action: 'submit_combat_round_plan',
      round: 1,
      decisionVersion: 1,
      steps: [{ kind: 'move', cellId: 'cell:2:0' }],
    },
    budget: lockstepBudget({ movement: 1 }),
    board: {
      ascii: 'R..',
      reachableCells: [{ cellId: 'cell:2:0', x: 2, z: 0, moveCost: 2, hazard: false }],
      attackableCells: [],
      utilityOptions: [],
    },
  })

  assert.equal(overBudget.ok, false)
  assert.equal(
    overBudget.issues.some((issue) => issue.code === 'MOVEMENT_BUDGET_EXCEEDED'),
    true,
  )
})

test('lockstep resolver advances simultaneous movement one grid cell per substep', () => {
  const snapshot = combatSnapshot(tacticalOpenArena, [-3, 0, 0], [3, 0, 0], {
    red: { stats: lockstepStats({ mass: 10, mobility: 12 }) },
    blue: { stats: lockstepStats({ mass: 10, mobility: 12 }) },
  })
  const resolution = expectActiveLockstepResolution(resolveLockstepCombatRound(lockstepCombatInput(snapshot, {
    red: combatRoundPlan('red', [{ kind: 'move', cellId: 'cell:-1:0' }, { kind: 'end_turn' }]),
    blue: combatRoundPlan('blue', [{ kind: 'move', cellId: 'cell:1:0' }, { kind: 'end_turn' }]),
  })))
  const redMoves = resolution.events.filter((event) => event.type === 'move' && event.bot === 'red')
  const blueMoves = resolution.events.filter((event) => event.type === 'move' && event.bot === 'blue')

  assert.deepEqual(redMoves.map((event) => event.to[0]), [-2, -1])
  assert.deepEqual(blueMoves.map((event) => event.to[0]), [2, 1])
  assert.equal(resolution.snapshot.red.position[0], -1)
  assert.equal(resolution.snapshot.blue.position[0], 1)
  assert.equal(resolution.consumed.red.movementSpent, 2)
  assert.equal(resolution.consumed.blue.movementSpent, 2)
})

test('lockstep resolver does not move past the server-side movement budget', () => {
  const snapshot = combatSnapshot(tacticalOpenArena, [-3, 0, 0], [3, 0, 0])
  const resolution = expectActiveLockstepResolution(resolveLockstepCombatRound(lockstepCombatInput(snapshot, {
    red: combatRoundPlan('red', [{ kind: 'move', cellId: 'cell:-1:0' }, { kind: 'end_turn' }]),
    blue: combatRoundPlan('blue', [{ kind: 'end_turn' }]),
  }, {
    budgets: {
      red: lockstepBudget({ movement: 1 }),
      blue: lockstepBudget(),
    },
  })))

  assert.equal(resolution.snapshot.red.position[0], -2)
  assert.equal(resolution.consumed.red.movementSpent, 1)
  assert.equal(resolution.consumed.red.consumedSteps, 2)
})

test('lockstep resolver resolves same-cell contests with explicit heavier-bot push events', () => {
  const snapshot = combatSnapshot(tacticalOpenArena, [-1, 0, 0], [1, 0, 0], {
    red: { stats: lockstepStats({ mass: 24, mobility: 6, stability: 8 }) },
    blue: { stats: lockstepStats({ mass: 6, mobility: 6, stability: 3 }) },
  })
  const resolution = expectActiveLockstepResolution(resolveLockstepCombatRound(lockstepCombatInput(snapshot, {
    red: combatRoundPlan('red', [{ kind: 'move', cellId: 'cell:0:0' }, { kind: 'end_turn' }]),
    blue: combatRoundPlan('blue', [{ kind: 'move', cellId: 'cell:0:0' }, { kind: 'end_turn' }]),
  })))
  const push = resolution.events.find((event) => event.type === 'push')

  assert.notEqual(push, undefined)
  assert.equal(push.attacker, 'red')
  assert.equal(push.defender, 'blue')
  assert.equal(push.reason, 'mass')
  assert.equal(resolution.snapshot.red.position[0], 0)
  assert.equal(resolution.snapshot.blue.position[0], 2)
})

test('lockstep resolver emits ram and bounce when a push has no valid destination', () => {
  const wallArena = {
    ...tacticalOpenArena,
    name: 'Lockstep Wall Bounce Test',
    width: 2,
    height: 0,
  }
  const snapshot = combatSnapshot(wallArena, [0, 0, 0], [1, 0, 0], {
    red: { stats: lockstepStats({ mass: 24, mobility: 8, stability: 8 }) },
    blue: { stats: lockstepStats({ mass: 6, mobility: 4, stability: 3 }) },
  })
  const resolution = expectActiveLockstepResolution(resolveLockstepCombatRound(lockstepCombatInput(snapshot, {
    red: combatRoundPlan('red', [{ kind: 'move', cellId: 'cell:1:0' }, { kind: 'end_turn' }]),
    blue: combatRoundPlan('blue', [{ kind: 'end_turn' }]),
  })))
  const ram = resolution.events.find((event) => event.type === 'ram')
  const bounce = resolution.events.find((event) => event.type === 'bounce')

  assert.notEqual(ram, undefined)
  assert.equal(ram.attacker, 'red')
  assert.equal(ram.defender, 'blue')
  assert.equal(ram.blockedBy, 'wall')
  assert.notEqual(bounce, undefined)
  assert.equal(bounce.bot, 'red')
  assert.equal(resolution.snapshot.red.position[0], 0)
  assert.equal(resolution.snapshot.blue.position[0], 1)
  assert.ok(resolution.snapshot.blue.health < snapshot.blue.health)
})

test('lockstep resolver triggers hazards on voluntary movement and forced push paths', () => {
  const hazardArena = {
    ...tacticalOpenArena,
    name: 'Lockstep Hazard Test',
    activeHazards: ['floor_saw'],
    topology: {
      ...tacticalOpenArena.topology,
      hazards: [
        {
          id: 'center_saw_test',
          type: 'floor_saw',
          shape: { kind: 'circle', center: [0, 0], radius: 0.45 },
          damage: 4,
          tags: ['test'],
        },
      ],
    },
  }
  const voluntarySnapshot = combatSnapshot(hazardArena, [-1, 0, 0], [4, 0, 0])
  const voluntary = expectActiveLockstepResolution(resolveLockstepCombatRound(lockstepCombatInput(voluntarySnapshot, {
    red: combatRoundPlan('red', [{ kind: 'move', cellId: 'cell:1:0' }, { kind: 'end_turn' }]),
    blue: combatRoundPlan('blue', [{ kind: 'end_turn' }]),
  })))
  const voluntaryHazard = voluntary.events.find((event) => event.type === 'hazard_trigger' && event.bot === 'red')

  assert.notEqual(voluntaryHazard, undefined)
  assert.equal(voluntaryHazard.trigger, 'voluntary_move')
  assert.ok(voluntary.snapshot.red.health < voluntarySnapshot.red.health)

  const forcedSnapshot = combatSnapshot(hazardArena, [-1, 0, 0], [0, 0, 0], {
    red: { stats: lockstepStats({ mass: 24, mobility: 8, stability: 8 }) },
    blue: { stats: lockstepStats({ mass: 6, mobility: 4, stability: 3 }) },
  })
  const forced = expectActiveLockstepResolution(resolveLockstepCombatRound(lockstepCombatInput(forcedSnapshot, {
    red: combatRoundPlan('red', [{ kind: 'move', cellId: 'cell:0:0' }, { kind: 'end_turn' }]),
    blue: combatRoundPlan('blue', [{ kind: 'end_turn' }]),
  })))
  const forcedHazard = forced.events.find((event) => event.type === 'hazard_trigger' && event.bot === 'blue')

  assert.notEqual(forcedHazard, undefined)
  assert.equal(forcedHazard.trigger, 'forced_push')
})

test('lockstep resolver supports weapon attacks after movement in the same submitted plan', () => {
  const snapshot = combatSnapshot(tacticalOpenArena, [-2, 0, 0], [1, 0, 0], {
    red: {
      weaponReach: 2,
      stats: lockstepStats({ weaponThreat: 18, control: 8 }),
    },
    blue: { stats: lockstepStats({ mass: 8 }) },
  })
  const resolution = expectActiveLockstepResolution(resolveLockstepCombatRound(lockstepCombatInput(snapshot, {
    red: combatRoundPlan('red', [
      { kind: 'move', cellId: 'cell:-1:0' },
      { kind: 'attack', weaponSlot: 'weaponA', targetCellId: 'cell:1:0' },
      { kind: 'end_turn' },
    ]),
    blue: combatRoundPlan('blue', [{ kind: 'end_turn' }]),
  }, {
    budgets: {
      red: lockstepBudget({ movement: 2, actionTime: 2 }),
      blue: lockstepBudget(),
    },
  })))
  const weaponFire = resolution.events.find((event) => event.type === 'weapon_fire' && event.bot === 'red')
  const impact = resolution.events.find((event) => event.type === 'impact' && event.attacker === 'red')

  assert.notEqual(weaponFire, undefined)
  assert.notEqual(impact, undefined)
  assert.equal(resolution.snapshot.red.position[0], -1)
  assert.ok(resolution.snapshot.blue.health < snapshot.blue.health)
  assert.equal(resolution.consumed.red.actionTimeSpent, 1)
})

test('session maps GPT combat_plan into lockstep round plans and stages the next round after both submit', async () => {
  let now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_gpt_combat_plan_queue', {
    clock: () => now,
  })
  const { redToken, blueToken } = await claimBothRoles(session)

  await confirmBothMachineLoadouts(session, redToken, blueToken)

  const initialRed = createInitialMachineDesign('red')
  const redMachine = {
    ...initialRed,
    parts: [
      initialRed.parts[0],
      machinePart('drive_wheel', {
        definitionId: 'catalog:Wheel_Omni',
        transform: machineTransform({ orientation: machineBasis() }),
      }),
    ],
    attachments: [
      machineAttachment('core', 'drive_wheel', { mountId: 'core_shell' }),
    ],
  }
  const stored = session.exportState()

  stored.roles.red.storedDesign = {
    version: 'machine:v1',
    machine: redMachine,
  }
  stored.roles.red.currentDesign = machineDesignToLegacyBotDesignSnapshotProjection(redMachine)
  stored.combat.baselineMachineDesigns = {
    red: structuredClone(redMachine),
    blue: structuredClone(stored.roles.blue.storedDesign.machine),
  }
  stored.activeActionSets = undefined
  stored.lockedActions = undefined

  const loaded = SessionCoordinator.fromState(stored, {
    clock: () => now,
  })
  const redPlan = await loaded.submitGptCombatPlan(redToken, {
    steps: [
      { kind: 'end_turn' },
    ],
  })
  const redWaitingState = loaded.exportState()

  assert.equal(redPlan.ok, true)
  assert.equal(redPlan.value.submittedPlan.steps.length, 1)
  assert.deepEqual(redPlan.value.submittedPlan.steps[0], { kind: 'end_turn' })
  assert.equal(redWaitingState.combat.submittedPlans.red.steps.length, 1)
  assert.equal(redWaitingState.combat.submittedPlans.blue, undefined)

  const bluePlan = await loaded.submitGptCombatPlan(blueToken, {
    steps: [
      { kind: 'end_turn' },
    ],
  })

  assert.equal(bluePlan.ok, true)
  assert.equal(bluePlan.value.submittedPlan.steps.length, 1)

  let roundState = loaded.exportState()

  assert.equal(roundState.combat.mode, 'lockstep_round_plan')
  assert.equal(roundState.combat.nextTick, 2)
  assert.equal(roundState.combat.openedAt, '2026-06-03T00:00:10.000Z')
  assert.equal(roundState.combat.submittedPlans, undefined)
  assert.equal(roundState.combat.planConsumption.red.endedBy, 'end_turn')
  assert.equal(roundState.combat.planConsumption.blue.endedBy, 'end_turn')

  now = '2026-06-03T00:00:10.000Z'
  const openPacket = await loaded.getGameMasterPacketForToken(redToken)
  roundState = loaded.exportState()

  assert.equal(openPacket.ok, true)
  assert.equal(openPacket.value.nextAction, 'choose_turn')
  assert.equal(openPacket.value.combat.submitted, false)
  assert.equal(openPacket.value.submit.path.endsWith('/combat-plan'), true)
  assert.equal(roundState.combat.nextTick, 2)
})


test('session accepts direct CombatRoundPlan submissions without legacy canonical combat actions', async () => {
  const now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_direct_combat_round_plan', {
    clock: () => now,
  })
  const { redToken, blueToken } = await claimBothRoles(session)

  await confirmBothMachineLoadouts(session, redToken, blueToken)

  const redPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(redPacket.ok, true)
  assert.equal(redPacket.value.phase, 'combat_turn')
  assert.equal(redPacket.value.nextAction, 'choose_turn')
  assert.equal(redPacket.value.submit.path.endsWith('/combat-plan'), true)
  assert.equal(redPacket.value.combat.submitted, false)
  assert.equal(typeof redPacket.value.board.ascii, 'string')
  assert.ok(redPacket.value.board.reachableCells.length > 0)

  const redPlan = await session.submitCombatRoundPlan(redToken, {
    action: 'submit_combat_round_plan',
    round: redPacket.value.combat.round,
    decisionVersion: redPacket.value.combat.decisionVersion,
    steps: [{ kind: 'end_turn' }],
  })

  assert.equal(redPlan.ok, true)
  assert.equal(redPlan.value.submittedPlan.role, 'red')
  assert.deepEqual(redPlan.value.submittedPlan.steps, [{ kind: 'end_turn' }])

  const redWaiting = await session.getGameMasterPacketForToken(redToken)

  assert.equal(redWaiting.ok, true)
  assert.equal(redWaiting.value.nextAction, 'wait_for_opponent_turn')
  assert.equal(redWaiting.value.legalActions.length, 0)
  assert.equal(redWaiting.value.combat.submitted, true)
  assert.equal(redWaiting.value.submit, undefined)

  const bluePlan = await session.submitCombatRoundPlan(blueToken, {
    action: 'submit_combat_round_plan',
    round: redPacket.value.combat.round,
    decisionVersion: redPacket.value.combat.decisionVersion,
    steps: [{ kind: 'end_turn' }],
  })

  assert.equal(bluePlan.ok, true)
  assert.equal(session.exportState().combat.nextTick, 2)
})


test('session resolves a partial combat round plan with timeout end_turn for the missing opponent', async () => {
  let now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_partial_combat_round_plan_timeout', {
    clock: () => now,
  })
  const { redToken, blueToken } = await claimBothRoles(session)

  await confirmBothMachineLoadouts(session, redToken, blueToken)

  const redPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(redPacket.ok, true)
  assert.equal(redPacket.value.nextAction, 'choose_turn')
  assert.equal(redPacket.value.submit.path.endsWith('/combat-plan'), true)

  const selfAnchor = redPacket.value.combat.self.anchor
  const selfCellId = `cell:${selfAnchor.x}:${selfAnchor.z}`
  const reachableMove = redPacket.value.board.reachableCells.find((cell) =>
    cell.cellId !== selfCellId && cell.moveCost <= redPacket.value.combat.budget.movement,
  )
  const redSteps = reachableMove
    ? [{ kind: 'move', cellId: reachableMove.cellId }, { kind: 'end_turn' }]
    : [{ kind: 'end_turn' }]
  const redPlan = await session.submitCombatRoundPlan(redToken, {
    action: 'submit_combat_round_plan',
    round: redPacket.value.combat.round,
    decisionVersion: redPacket.value.combat.decisionVersion,
    steps: redSteps,
  })

  assert.equal(redPlan.ok, true)

  const waiting = session.exportState()

  assert.equal(waiting.combat.submittedPlans.red.steps.length, redSteps.length)
  assert.equal(waiting.combat.submittedPlans.blue, undefined)

  now = new Date(Date.parse(waiting.combat.deadlineAt) + 1).toISOString()

  const bluePacket = await session.getGameMasterPacketForToken(blueToken)
  const resolved = session.exportState()

  assert.equal(bluePacket.ok, true)
  assert.equal(resolved.combat.nextTick, waiting.combat.nextTick + 1)
  assert.equal(resolved.combat.submittedPlans, undefined)
  assert.equal(resolved.combat.planConsumption.red.endedBy === 'end_turn' || resolved.combat.planConsumption.red.endedBy === 'plan_exhausted', true)
  assert.equal(
    resolved.combat.planConsumption.blue.endedBy === 'end_turn' || resolved.combat.planConsumption.blue.endedBy === 'plan_exhausted',
    true,
  )
  assert.equal(
    resolved.eventLog.some((event) => event.type === 'turn_command_timed_out' && event.message.includes('blue timed out')),
    true,
  )
})

test('session auto-confirms current loadouts when loadout window expires', async () => {
  let now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_loadout_auto_confirm', {
    clock: () => now,
  })
  const { redToken, blueToken } = await claimBothRoles(session)

  now = '2026-06-03T00:04:01.000Z'

  const redState = await session.getRoleStateForToken(redToken)
  const publicState = session.getPublicState()
  const blueState = await session.getRoleStateForToken(blueToken)

  assert.equal(redState.ok, true)
  assert.equal(blueState.ok, true)
  assert.equal(redState.value.phase, 'combat_turn')
  assert.equal(blueState.value.phase, 'combat_turn')
  assert.equal(redState.value.submitted, true)
  assert.equal(blueState.value.submitted, true)
  assert.equal(publicState.roundPlan, undefined)
  assert.equal(publicState.phase, 'combat_turn')
  assert.equal(publicState.roles.red.submitted, true)
  assert.equal(publicState.roles.blue.submitted, true)
  assert.equal(redState.value.combat.turnSeconds, 60)
  assert.equal(
    publicState.eventLog.filter((event) => event.message.includes('loadout window expired')).length,
    2,
  )
})

test('session sells pending remount parts when loadout window expires', async () => {
  let now = '2026-06-03T00:00:00.000Z'
  const session = await createTestSession('s_loadout_pending_remount_refund', {
    clock: () => now,
  })
  const { redToken } = await claimBothRoles(session)
  const redPacket = await session.getGameMasterPacketForToken(redToken)

  assert.equal(redPacket.ok, true)

  const placed = await placePartFromCatalog(session, redToken, redPacket.value, 'Frame_Strut')

  assert.equal(placed.ok, true)

  const goldAfterPlace = session.exportState().roles.red.gold
  const strutCost = PART_CATALOG.find((part) => part.id === 'Frame_Strut')?.cost
  const movePartAction = findLegalAction(placed.value.packet, (action) => action.kind === 'move_part')
  const moving = await submitPacketAction(session, redToken, placed.value.packet, movePartAction)

  assert.equal(strutCost, 1)
  assert.equal(moving.ok, true)
  assert.equal(session.exportState().roles.red.gold, goldAfterPlace)
  assert.equal(session.exportState().roles.red.loadoutBuildState.selectedMovingPartId, 'part_1')
  assert.equal(session.exportState().roles.red.loadoutBuildState.selectedPartId, 'Frame_Strut')
  assert.equal(session.exportState().roles.red.loadoutConfirmedAt, undefined)

  now = '2026-06-03T00:04:01.000Z'

  const redState = await session.getRoleStateForToken(redToken)
  const exported = session.exportState()

  assert.equal(redState.ok, true)
  assert.equal(redState.value.phase, 'combat_turn')
  assert.equal(exported.roles.red.gold, goldAfterPlace + strutCost)
  assert.equal(exported.roles.red.inventory.some((item) => item.partId === 'Frame_Strut'), false)
  assert.equal(exported.roles.red.loadoutBuildState.selectedMovingPartId, undefined)
  assert.equal(
    exported.roles.red.loadoutBuildState.currentDesign.machine.parts.some((part) => part.partId === 'Frame_Strut'),
    false,
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

  await confirmBothMachineLoadouts(session, redToken, blueToken)

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
    deadlineAt: '2026-06-03T00:06:00.000Z',
    planSeconds: 240,
  })
  assert.equal('awardOptions' in advance.value.publicState, false)

  const exported = loaded.exportState()

  assert.equal(exported.roles.red.gold, 68 + 50 + calculateInterest(68) + 25)
  assert.equal(exported.roles.blue.gold, 260 + 50 + calculateInterest(260))
  assert.equal(exported.roles.red.loadoutConfirmedAt, undefined)
  assert.equal(exported.roles.blue.loadoutConfirmedAt, undefined)
  assert.equal(exported.roundPlan.deadlineAt, '2026-06-03T00:06:00.000Z')
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

  await confirmBothMachineLoadouts(
    maxRoundSession,
    maxRoundTokens.redToken,
    maxRoundTokens.blueToken,
  )
  const maxRoundResolved = await submitSurrenderFromLatestPacket(
    maxRoundSession,
    maxRoundTokens.redToken,
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

test('compactPartAlias prefixes catalog part category', () => {
  for (const part of PART_CATALOG) {
    assert.equal(compactPartAlias(part), `${part.category}.${part.id}`)
  }
  const turret = PART_CATALOG.find((part) => part.id === 'Weapon_Turret')
  if (turret) {
    assert.equal(compactPartAlias(turret), 'weapon.Weapon_Turret')
  }
})

test('compactSystemCoreAlias returns body.Machine_Core', () => {
  assert.equal(compactSystemCoreAlias(), 'body.Machine_Core')
})

test('canonicalPartIdFromCompact strips known category prefix', () => {
  assert.equal(canonicalPartIdFromCompact('weapon.Weapon_Turret'), 'Weapon_Turret')
  assert.equal(canonicalPartIdFromCompact('body.Frame_Strut'), 'Frame_Strut')
  assert.equal(canonicalPartIdFromCompact('  mobility.Wheel_Set  '), 'Wheel_Set')
})

test('canonicalPartIdFromCompact preserves canonical IDs', () => {
  assert.equal(canonicalPartIdFromCompact('Weapon_Turret'), 'Weapon_Turret')
  assert.equal(canonicalPartIdFromCompact('catalog:Weapon_Turret'), 'catalog:Weapon_Turret')
})

test('canonicalPartIdFromCompact preserves unknown-prefix values', () => {
  assert.equal(canonicalPartIdFromCompact('exotic.Weapon_Turret'), 'exotic.Weapon_Turret')
  assert.equal(canonicalPartIdFromCompact('.Weapon_Turret'), '.Weapon_Turret')
  assert.equal(canonicalPartIdFromCompact('weapon.'), 'weapon.')
})

test('createLoadoutBuildStateFromStoredDesign rehydrates blueprint healed to full', () => {
  const initial = createInitialLoadoutBuildState('red')
  const damaged = {
    version: 'machine:v1',
    machine: {
      ...initial.currentDesign.machine,
      runtime: {
        healthByInstanceId: { core: 2 },
        disabledInstanceIds: ['core'],
      },
    },
  }
  const rehydrated = createLoadoutBuildStateFromStoredDesign('red', damaged)

  assert.equal(rehydrated.step, 'choose_part')
  assert.equal(rehydrated.currentDesign.version, 'machine:v1')
  assert.equal(rehydrated.currentDesign.machine.runtime, undefined)
  assert.deepEqual(
    rehydrated.currentDesign.machine.parts.map((part) => part.instanceId),
    initial.currentDesign.machine.parts.map((part) => part.instanceId),
  )
  assert.equal(rehydrated.selectedPartId, undefined)
  assert.equal(rehydrated.selectedMovingPartId, undefined)
})

function compactViewActionSet(buildState, gold = 200, storeSeed = 'compact-view-test') {
  return buildLoadoutActionSet({
    role: 'red',
    round: 1,
    decisionVersion: 11,
    actionSetId: 'red:r1:loadout:compact-view:v11',
    createdAt: '2026-06-07T00:00:00.000Z',
    arenaVersion: 'arena:v1',
    gold,
    buildState,
    storeSeed,
  })
}

function compactViewFor(buildState, actionSet, gold = 200) {
  return buildCompactBuildView({
    role: 'red',
    round: 1,
    decisionVersion: actionSet.decisionVersion,
    gold,
    buildState,
    actionSet,
    store: actionSet.catalogStore,
  })
}

test('compact build view exposes compact bot, store, edit, and requirements for choose_part', () => {
  const buildState = createInitialLoadoutBuildState('red')
  const actionSet = compactViewActionSet(buildState)
  const packet = compactViewFor(buildState, actionSet)

  assert.equal(packet.v, 1)
  assert.equal(packet.phase, 'build')
  assert.equal(packet.step, 'choose_part')
  assert.deepEqual(packet.bot.partSchema, ['id', 'part', 'parent', 'hp', 'maxHp'])
  assert.deepEqual(packet.bot.parts[0], ['core', 'body.Machine_Core', null, 20, 20])
  assert.equal(packet.bot.mode, 'new')
  assert.equal(packet.budget.gold, 200)
  assert.equal(packet.budget.parts, LOADOUT_PART_LIMIT)
  assert.ok(packet.store)
  assert.ok(packet.store.foundation.length > 0)
  assert.ok(packet.store.offers.length > 0)

  for (const item of [...packet.store.foundation, ...packet.store.offers]) {
    assert.match(item.part, /^(body|mobility|weapon|defense|utility|style)\./)
    assert.equal('slot' in item, false)
    assert.equal('stock' in item, false)
    assert.equal('kind' in item, false)

    if (item.mobility) {
      assert.equal('x' in item.mobility, false)
      assert.equal('z' in item.mobility, false)
      assert.equal('xz' in item.mobility, false)
      assert.equal(typeof item.mobility.moveBudget, 'number')
    }
  }

  assert.equal(packet.edit.confirm, true)
  assert.deepEqual(packet.edit.remove, [])
  assert.deepEqual(packet.edit.move, [])
  assert.equal(packet.requirements.confirm_loadout.ok, true)
  assert.deepEqual(packet.requirements.confirm_loadout.missing, [])

  const serialized = JSON.stringify(packet)

  assert.equal('catalog' in packet, false)
  assert.equal('legalActions' in packet, false)
  assert.equal('blockedActions' in packet, false)
  assert.equal('slots' in packet.store, false)
  assert.equal('foundationPartIds' in packet.store, false)
  assert.equal('offeredPartIds' in packet.store, false)
  assert.equal(serialized.includes('"legalActions"'), false)
  assert.equal(serialized.includes('"blockedActions"'), false)
  assert.equal(serialized.includes('"offeredPartIds"'), false)
  assert.equal(typeof packet.buildDigest, 'string')
  assert.equal(packet.buildDigest, compactViewFor(buildState, actionSet).buildDigest)
})

test('compact build view exposes selected/targets and mount poses through the build steps', () => {
  let buildState = createInitialLoadoutBuildState('red')
  let actionSet = compactViewActionSet(buildState)
  const chooseAction = Object.values(actionSet.actions).find(
    (action) => action.kind === 'choose_part' && action.payload.partId === 'Weapon_Spinner_Small',
  ) ?? Object.values(actionSet.actions).find((action) => action.kind === 'choose_part')

  assert.notEqual(chooseAction, undefined)

  const chosen = applyLoadoutAction({
    role: 'red',
    gold: 200,
    inventory: [],
    buildState,
    action: chooseAction,
  })

  assert.equal(chosen.ok, true)
  buildState = chosen.buildState
  actionSet = compactViewActionSet(buildState)

  const attachPacket = compactViewFor(buildState, actionSet)

  assert.equal(attachPacket.step, 'choose_attach_target')
  assert.equal(attachPacket.selected.mode, 'new_part')
  assert.equal(attachPacket.selected.canonicalPartId, chooseAction.payload.partId)
  assert.match(attachPacket.selected.part, /\./)
  assert.ok(attachPacket.targets.includes('core'))
  assert.equal('store' in attachPacket, false)

  const targetAction = Object.values(actionSet.actions).find(
    (action) => action.kind === 'choose_attach_target',
  )

  assert.notEqual(targetAction, undefined)

  const targeted = applyLoadoutAction({
    role: 'red',
    gold: 200,
    inventory: [],
    buildState,
    action: targetAction,
  })

  assert.equal(targeted.ok, true)
  buildState = targeted.buildState
  actionSet = compactViewActionSet(buildState)

  const mountPacket = compactViewFor(buildState, actionSet)
  const mountAction = Object.values(actionSet.actions).find(
    (action) => action.kind === 'propose_mount_pose',
  )

  assert.equal(mountPacket.step, 'mount_part')
  assert.deepEqual(mountPacket.mountSchema, ['surface', 'u', 'v', 'yaw', 'roll'])
  assert.notEqual(mountAction, undefined)
  assert.ok(mountAction.parameterExamples.length > 0)
  assert.ok(mountPacket.mounts.length > 0)

  const example = mountAction.parameterExamples[0]

  assert.deepEqual(mountPacket.mounts[0], [
    example.mountSurfaceId,
    example.u,
    example.v,
    example.yawDegrees,
    example.rollDegrees,
  ])
})

test('compact build view edit surface derives from the action set for existing parts', () => {
  let buildState = createInitialLoadoutBuildState('red')
  let actionSet = compactViewActionSet(buildState)
  const chooseAction = Object.values(actionSet.actions).find(
    (action) => action.kind === 'choose_part',
  )
  const chosen = applyLoadoutAction({ role: 'red', gold: 200, inventory: [], buildState, action: chooseAction })

  assert.equal(chosen.ok, true)
  buildState = chosen.buildState
  actionSet = compactViewActionSet(buildState)

  const targetAction = Object.values(actionSet.actions).find((action) => action.kind === 'choose_attach_target')
  const targeted = applyLoadoutAction({ role: 'red', gold: 200, inventory: [], buildState, action: targetAction })

  assert.equal(targeted.ok, true)
  buildState = targeted.buildState
  actionSet = compactViewActionSet(buildState)

  const mountAction = Object.values(actionSet.actions).find((action) => action.kind === 'propose_mount_pose')
  const mounted = applyLoadoutAction({
    role: 'red',
    gold: 200,
    inventory: [],
    buildState,
    action: {
      ...mountAction,
      payload: { ...mountAction.payload, parameters: mountAction.parameterExamples[0] },
    },
  })

  assert.equal(mounted.ok, true, mounted.ok ? '' : JSON.stringify(mounted.issues))
  buildState = mounted.buildState
  actionSet = compactViewActionSet(buildState)

  const packet = compactViewFor(buildState, actionSet)
  const placedRow = packet.bot.parts.find((row) => row[0] !== 'core')

  assert.notEqual(placedRow, undefined)
  assert.equal(packet.step, 'choose_part')
  assert.equal(packet.bot.mode, 'existing')

  const removeEntry = packet.edit.remove.find((entry) => entry.id === placedRow[0])
  const removeAction = Object.values(actionSet.actions).find(
    (action) => action.kind === 'remove_part' && action.payload.instanceId === placedRow[0],
  )

  assert.notEqual(removeAction, undefined)
  assert.notEqual(removeEntry, undefined)
  assert.ok(removeEntry.refund > 0)
  assert.ok(packet.edit.move.includes(placedRow[0]))

  for (const rotateEntry of packet.edit.rotate) {
    assert.ok(rotateEntry.rot.length > 0)
    assert.deepEqual([...rotateEntry.rot].sort((a, b) => a - b), rotateEntry.rot)
  }
})

test('round 2 compact build view shows healed full HP from rehydrated blueprint', () => {
  let buildState = createInitialLoadoutBuildState('red')
  let actionSet = compactViewActionSet(buildState)
  const chooseAction = Object.values(actionSet.actions).find((action) => action.kind === 'choose_part')
  const chosen = applyLoadoutAction({ role: 'red', gold: 200, inventory: [], buildState, action: chooseAction })

  buildState = chosen.buildState
  actionSet = compactViewActionSet(buildState)

  const targetAction = Object.values(actionSet.actions).find((action) => action.kind === 'choose_attach_target')
  const targeted = applyLoadoutAction({ role: 'red', gold: 200, inventory: [], buildState, action: targetAction })

  buildState = targeted.buildState
  actionSet = compactViewActionSet(buildState)

  const mountAction = Object.values(actionSet.actions).find((action) => action.kind === 'propose_mount_pose')
  const mounted = applyLoadoutAction({
    role: 'red',
    gold: 200,
    inventory: [],
    buildState,
    action: {
      ...mountAction,
      payload: { ...mountAction.payload, parameters: mountAction.parameterExamples[0] },
    },
  })

  assert.equal(mounted.ok, true, mounted.ok ? '' : JSON.stringify(mounted.issues))
  buildState = mounted.buildState

  const damagedStored = {
    version: 'machine:v1',
    machine: {
      ...buildState.currentDesign.machine,
      runtime: {
        healthByInstanceId: { core: 1, part_1: 0 },
        destroyedInstanceIds: ['part_1'],
      },
    },
  }
  const rehydrated = createLoadoutBuildStateFromStoredDesign('red', damagedStored)
  const round2Set = buildLoadoutActionSet({
    role: 'red',
    round: 2,
    decisionVersion: 21,
    actionSetId: 'red:r2:loadout:compact-view:v21',
    createdAt: '2026-06-07T00:10:00.000Z',
    arenaVersion: 'arena:v1',
    gold: 150,
    buildState: rehydrated,
    storeSeed: 'compact-view-round2',
  })
  const packet = buildCompactBuildView({
    role: 'red',
    round: 2,
    decisionVersion: round2Set.decisionVersion,
    gold: 150,
    buildState: rehydrated,
    actionSet: round2Set,
    store: round2Set.catalogStore,
  })

  assert.equal(packet.round, 2)
  assert.equal(packet.bot.mode, 'existing')
  assert.equal(packet.bot.parts.length, 2)

  for (const [, , , hp, maxHp] of packet.bot.parts) {
    assert.equal(hp, maxHp)
    assert.ok(hp > 0)
  }

  assert.equal(packet.bot.summary.hp, packet.bot.summary.maxHp)
})

test('compact build action validator rejects malformed submissions and normalizes mount defaults', () => {
  assert.equal(normalizeCompactBuildActionSubmission(null).ok, false)
  assert.equal(
    normalizeCompactBuildActionSubmission({ action: 'submit_game_action', decisionVersion: 1, command: { kind: 'confirm_loadout' } }).ok,
    false,
  )
  assert.equal(
    normalizeCompactBuildActionSubmission({ action: 'submit_build_action', command: { kind: 'confirm_loadout' } }).ok,
    false,
  )
  assert.equal(
    normalizeCompactBuildActionSubmission({ action: 'submit_build_action', decisionVersion: 1 }).ok,
    false,
  )
  assert.equal(
    normalizeCompactBuildActionSubmission({
      action: 'submit_build_action',
      decisionVersion: 1,
      command: { kind: 'confirm_loadout' },
      extra: true,
    }).ok,
    false,
  )
  assert.equal(
    normalizeCompactBuildActionSubmission({
      action: 'submit_build_action',
      decisionVersion: 1,
      command: { kind: 'choose_part', part: '' },
    }).ok,
    false,
  )
  assert.equal(
    normalizeCompactBuildActionSubmission({
      action: 'submit_build_action',
      decisionVersion: 1,
      command: { kind: 'mount_part', surface: 'core_deck', u: 1.5, v: 0.5 },
    }).ok,
    false,
  )
  assert.equal(
    normalizeCompactBuildActionSubmission({
      action: 'submit_build_action',
      decisionVersion: 1,
      command: { kind: 'rotate_part', id: 'part_1', rot: Number.NaN },
    }).ok,
    false,
  )

  const normalized = normalizeCompactBuildActionSubmission({
    action: 'submit_build_action',
    decisionVersion: 7,
    command: { kind: 'mount_part', surface: ' core_deck ', u: 0.5, v: 0.25 },
  })

  assert.equal(normalized.ok, true)
  assert.deepEqual(normalized.submission.command, {
    kind: 'mount_part',
    surface: 'core_deck',
    u: 0.5,
    v: 0.25,
    yaw: 0,
    roll: 0,
  })
})

test('compact build actions resolve through the active action set only', () => {
  let buildState = createInitialLoadoutBuildState('red')
  let actionSet = compactViewActionSet(buildState)
  const chooseAction = Object.values(actionSet.actions).find((action) => action.kind === 'choose_part')
  const partId = chooseAction.payload.partId
  const alias = `${PART_CATALOG.find((part) => part.id === partId).category}.${partId}`
  const resolvedAlias = resolveCompactBuildAction({
    actionSet,
    buildState,
    command: { kind: 'choose_part', part: alias },
  })
  const resolvedCanonical = resolveCompactBuildAction({
    actionSet,
    buildState,
    command: { kind: 'choose_part', part: partId },
  })

  assert.equal(resolvedAlias.ok, true)
  assert.equal(resolvedAlias.value.canonicalAction.id, chooseAction.id)
  assert.equal(resolvedCanonical.ok, true)
  assert.equal(resolvedCanonical.value.canonicalAction.id, chooseAction.id)

  const confirmResolved = resolveCompactBuildAction({
    actionSet,
    buildState,
    command: { kind: 'confirm_loadout' },
  })

  assert.equal(confirmResolved.ok, true)
  assert.equal(confirmResolved.value.canonicalAction.kind, 'confirm_loadout')

  const missing = resolveCompactBuildAction({
    actionSet,
    buildState,
    command: { kind: 'remove_part', id: 'part_404' },
  })

  assert.equal(missing.ok, false)
  assert.equal(missing.issues[0].code, 'COMPACT_ACTION_NOT_AVAILABLE')

  const chosen = applyLoadoutAction({ role: 'red', gold: 200, inventory: [], buildState, action: chooseAction })

  buildState = chosen.buildState
  actionSet = compactViewActionSet(buildState)

  const targetResolved = resolveCompactBuildAction({
    actionSet,
    buildState,
    command: { kind: 'choose_attach_target', target: 'core' },
  })

  assert.equal(targetResolved.ok, true)
  assert.equal(targetResolved.value.canonicalAction.kind, 'choose_attach_target')

  const targeted = applyLoadoutAction({ role: 'red', gold: 200, inventory: [], buildState, action: targetResolved.value.canonicalAction })

  buildState = targeted.buildState
  actionSet = compactViewActionSet(buildState)

  const mountResolved = resolveCompactBuildAction({
    actionSet,
    buildState,
    command: { kind: 'mount_part', surface: 'core_deck', u: 0.5, v: 0.5 },
  })

  assert.equal(mountResolved.ok, true)
  assert.equal(mountResolved.value.canonicalAction.kind, 'propose_mount_pose')
  assert.equal(mountResolved.value.parameters.childPartId, partId)
  assert.equal(mountResolved.value.parameters.parentInstanceId, 'core')
  assert.equal(mountResolved.value.parameters.mountSurfaceId, 'core_deck')
  assert.equal(mountResolved.value.parameters.yawDegrees, 0)

  const duplicateSet = {
    ...actionSet,
    actions: {
      ...actionSet.actions,
      forged_duplicate: {
        ...Object.values(actionSet.actions).find((action) => action.kind === 'propose_mount_pose'),
        id: 'forged_duplicate',
      },
    },
  }
  const ambiguous = resolveCompactBuildAction({
    actionSet: duplicateSet,
    buildState,
    command: { kind: 'mount_part', surface: 'core_deck', u: 0.5, v: 0.5 },
  })

  assert.equal(ambiguous.ok, false)
  assert.equal(ambiguous.issues[0].code, 'AMBIGUOUS_COMPACT_ACTION')
})

function applyCompactPurchase(buildState, chooseAction, gold = 500) {
  const chosen = applyLoadoutAction({ role: 'red', gold, inventory: [], buildState, action: chooseAction })

  assert.equal(chosen.ok, true, chosen.ok ? '' : JSON.stringify(chosen.issues))

  let actionSet = compactViewActionSet(chosen.buildState, gold)
  const targetAction = Object.values(actionSet.actions).find((action) => action.kind === 'choose_attach_target')

  assert.notEqual(targetAction, undefined)

  const targeted = applyLoadoutAction({ role: 'red', gold, inventory: [], buildState: chosen.buildState, action: targetAction })

  assert.equal(targeted.ok, true, targeted.ok ? '' : JSON.stringify(targeted.issues))
  actionSet = compactViewActionSet(targeted.buildState, gold)

  const mountAction = Object.values(actionSet.actions).find((action) => action.kind === 'propose_mount_pose')

  assert.notEqual(mountAction, undefined)
  assert.ok(mountAction.parameterExamples?.length > 0)

  const mounted = applyLoadoutAction({
    role: 'red',
    gold,
    inventory: [],
    buildState: targeted.buildState,
    action: {
      ...mountAction,
      payload: { ...mountAction.payload, parameters: mountAction.parameterExamples[0] },
    },
  })

  assert.equal(mounted.ok, true, mounted.ok ? '' : JSON.stringify(mounted.issues))

  return mounted.buildState
}

test('store foundation parts are reusable and offers are one-purchase per round', () => {
  let buildState = createInitialLoadoutBuildState('red')
  let actionSet = compactViewActionSet(buildState, 500)
  const actions = Object.values(actionSet.actions)
  const foundationAction = actions.find(
    (action) => action.kind === 'choose_part' && action.payload.storeSource === 'foundation',
  )
  const offerAction = actions.find(
    (action) => action.kind === 'choose_part' && action.payload.storeSource === 'offer',
  )

  assert.notEqual(foundationAction, undefined)
  assert.notEqual(offerAction, undefined)
  assert.equal(typeof offerAction.payload.offerSlotId, 'string')

  buildState = applyCompactPurchase(buildState, foundationAction)

  assert.equal(buildState.consumedOfferSlotIds, undefined)
  actionSet = compactViewActionSet(buildState, 500)

  const foundationAgain = Object.values(actionSet.actions).find(
    (action) => action.kind === 'choose_part' && action.payload.partId === foundationAction.payload.partId,
  )

  assert.notEqual(foundationAgain, undefined, 'foundation part must stay purchasable')

  buildState = applyCompactPurchase(buildState, foundationAgain)
  actionSet = compactViewActionSet(buildState, 500)

  const offerStill = Object.values(actionSet.actions).find(
    (action) => action.kind === 'choose_part' && action.payload.partId === offerAction.payload.partId,
  )

  assert.notEqual(offerStill, undefined)

  buildState = applyCompactPurchase(buildState, offerStill)

  assert.deepEqual(buildState.consumedOfferSlotIds, [offerAction.payload.offerSlotId])
  assert.equal(buildState.selectedPartSource, undefined)
  assert.equal(buildState.selectedOfferSlotId, undefined)
  actionSet = compactViewActionSet(buildState, 500)

  const offerGone = Object.values(actionSet.actions).find(
    (action) => action.kind === 'choose_part' && action.payload.partId === offerAction.payload.partId,
  )

  assert.equal(offerGone, undefined, 'consumed offer must not be offered again')

  const compactResolved = resolveCompactBuildAction({
    actionSet,
    buildState,
    command: { kind: 'choose_part', part: offerAction.payload.partId },
  })

  assert.equal(compactResolved.ok, false)
  assert.equal(compactResolved.issues[0].code, 'COMPACT_ACTION_NOT_AVAILABLE')

  const forgedReplay = applyLoadoutAction({
    role: 'red',
    gold: 500,
    inventory: [],
    buildState,
    action: offerAction,
  })

  assert.equal(forgedReplay.ok, false)
  assert.equal(forgedReplay.issues[0].code, 'OFFER_CONSUMED')

  const packet = buildCompactBuildView({
    role: 'red',
    round: 1,
    decisionVersion: actionSet.decisionVersion,
    gold: 500,
    buildState,
    actionSet,
    store: actionSet.catalogStore,
  })
  const offerAliasSuffix = `.${offerAction.payload.partId}`

  assert.equal(
    packet.store.offers.some((offer) => offer.part.endsWith(offerAliasSuffix)),
    false,
    'compact store must hide consumed offers',
  )
  assert.ok(packet.store.foundation.length > 0)
})

test('failed placement and moved parts do not consume store offers', () => {
  let buildState = createInitialLoadoutBuildState('red')
  let actionSet = compactViewActionSet(buildState, 500)
  const offerAction = Object.values(actionSet.actions).find(
    (action) => action.kind === 'choose_part' && action.payload.storeSource === 'offer',
  )

  assert.notEqual(offerAction, undefined)

  const chosen = applyLoadoutAction({ role: 'red', gold: 500, inventory: [], buildState, action: offerAction })

  assert.equal(chosen.ok, true)
  assert.equal(chosen.buildState.selectedPartSource, 'offer')

  let midState = chosen.buildState

  actionSet = compactViewActionSet(midState, 500)

  const targetAction = Object.values(actionSet.actions).find((action) => action.kind === 'choose_attach_target')
  const targeted = applyLoadoutAction({ role: 'red', gold: 500, inventory: [], buildState: midState, action: targetAction })

  midState = targeted.buildState
  actionSet = compactViewActionSet(midState, 500)

  const mountAction = Object.values(actionSet.actions).find((action) => action.kind === 'propose_mount_pose')
  const badMount = applyLoadoutAction({
    role: 'red',
    gold: 500,
    inventory: [],
    buildState: midState,
    action: {
      ...mountAction,
      payload: {
        ...mountAction.payload,
        parameters: {
          childPartId: mountAction.payload.childPartId,
          parentInstanceId: mountAction.payload.parentInstanceId,
          mountSurfaceId: 'surface_does_not_exist',
          u: 0.5,
          v: 0.5,
          yawDegrees: 0,
          rollDegrees: 0,
        },
      },
    },
  })

  assert.equal(badMount.ok, false)
  assert.equal(midState.consumedOfferSlotIds, undefined)

  const goodMount = applyLoadoutAction({
    role: 'red',
    gold: 500,
    inventory: [],
    buildState: midState,
    action: {
      ...mountAction,
      payload: { ...mountAction.payload, parameters: mountAction.parameterExamples[0] },
    },
  })

  assert.equal(goodMount.ok, true, goodMount.ok ? '' : JSON.stringify(goodMount.issues))
  assert.deepEqual(goodMount.buildState.consumedOfferSlotIds, [offerAction.payload.offerSlotId])

  let movedState = goodMount.buildState

  actionSet = compactViewActionSet(movedState, 500)

  const placedInstanceId = movedState.currentDesign.machine.parts.find(
    (part) => part.source === 'catalog_part',
  )?.instanceId
  const moveAction = Object.values(actionSet.actions).find(
    (action) => action.kind === 'move_part' && action.payload.instanceId === placedInstanceId,
  )

  assert.notEqual(moveAction, undefined)

  const moving = applyLoadoutAction({ role: 'red', gold: 500, inventory: [], buildState: movedState, action: moveAction })

  assert.equal(moving.ok, true, moving.ok ? '' : JSON.stringify(moving.issues))
  movedState = moving.buildState
  actionSet = compactViewActionSet(movedState, 500)

  const remountTarget = Object.values(actionSet.actions).find((action) => action.kind === 'choose_attach_target')
  const retargeted = applyLoadoutAction({ role: 'red', gold: 500, inventory: [], buildState: movedState, action: remountTarget })

  movedState = retargeted.buildState
  actionSet = compactViewActionSet(movedState, 500)

  const remountAction = Object.values(actionSet.actions).find((action) => action.kind === 'propose_mount_pose')
  const remounted = applyLoadoutAction({
    role: 'red',
    gold: 500,
    inventory: [],
    buildState: movedState,
    action: {
      ...remountAction,
      payload: { ...remountAction.payload, parameters: remountAction.parameterExamples[0] },
    },
  })

  assert.equal(remounted.ok, true, remounted.ok ? '' : JSON.stringify(remounted.issues))
  assert.deepEqual(
    remounted.buildState.consumedOfferSlotIds,
    [offerAction.payload.offerSlotId],
    'moving an existing part must not consume another offer slot',
  )
})
