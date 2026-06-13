import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgentArenaSession,
  handleWorkerRequest,
} from '../.test-build/apps/worker/src/index.js'
import {
  SessionCoordinator,
} from '../.test-build/apps/worker/src/session.js'
import {
  HAZARD_PREFERENCES,
  MOVEMENT_POLICIES,
  PREFERRED_RANGES,
  TACTIC_STYLES,
  TARGET_PRIORITIES,
  validateAgentBootstrapRequestShape,
  validateGameMasterActionParameters,
  WEAPON_CADENCES,
} from '../.test-build/packages/schemas/src/index.js'
import {
  buildSharedDebrief,
} from '../.test-build/packages/sim/src/index.js'

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

function bootstrapBody(role, agentName) {
  return {
    agentName: agentName ?? `${role}-agent`,
    teamIdentity: testTeamIdentity(role),
  }
}
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

class FakeDurableObjectStorage {
  #values = new Map()

  async get(key) {
    const value = this.#values.get(key)

    return value === undefined ? undefined : cloneJson(value)
  }

  async put(key, value) {
    this.#values.set(key, cloneJson(value))
  }
}

class FakeDurableObjectNamespace {
  #objects = new Map()

  #storages = new Map()

  #env

  constructor(env) {
    this.#env = env
  }

  idFromName(name) {
    return name
  }

  storageFor(id) {
    const key = String(id)
    const existing = this.#storages.get(key)

    if (existing) {
      return existing
    }

    const storage = new FakeDurableObjectStorage()
    this.#storages.set(key, storage)

    return storage
  }

  get(id) {
    const key = String(id)
    const existing = this.#objects.get(key)

    if (existing) {
      return existing
    }

    const durableObject = new AgentArenaSession(
      {
        storage: this.storageFor(key),
      },
      this.#env,
    )
    const stub = {
      fetch: (request) => durableObject.fetch(request),
    }

    this.#objects.set(key, stub)

    return stub
  }
}

function createEnv(overrides = {}) {
  const env = {
    GPT_AUTO_POLL_ATTEMPTS: '0',
    GPT_AUTO_POLL_DELAY_MS: '0',
    ...overrides,
  }

  env.AGENT_ARENA_SESSION = new FakeDurableObjectNamespace(env)

  return env
}

function waitMs(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

function createRequest(path, options = {}) {
  const headers = new Headers(options.headers)

  if (options.token) {
    headers.set('authorization', `Bearer ${options.token}`)
  }

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json')
  }

  return new Request(`https://arena-api.test${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

async function route(env, path, options = {}) {
  const response = await handleWorkerRequest(createRequest(path, options), env)
  const json = await response.json()

  return { response, json }
}

function inviteFor(invites, role) {
  const invite = invites.find((entry) => entry.role === role)

  assert.notEqual(invite, undefined)

  return invite
}

function gptInviteUrl(sessionId, invite) {
  return `https://arena.dorbii.net/agent#session=${sessionId}&role=${invite.role}&claimToken=${invite.claimToken}&api=https%3A%2F%2Farena-api.test`
}

function assertRedactedPublicState(publicState, hiddenValues) {
  const publicJson = JSON.stringify(publicState)

  for (const hiddenValue of hiddenValues) {
    assert.equal(publicJson.includes(hiddenValue), false)
  }
}

function assertRoundPlanWindow(roundPlan) {
  assert.equal(roundPlan.planSeconds, 240)
  assert.equal(Date.parse(roundPlan.deadlineAt) - Date.parse(roundPlan.openedAt), 240_000)
}

function assertGameMasterPacket(packet, role) {
  assert.equal(packet.sessionId.startsWith('s_'), true)
  assert.equal(packet.role, role)
  assert.equal(typeof packet.decisionVersion, 'number')
  assert.equal(typeof packet.eventVersion, 'number')
  assert.ok(Array.isArray(packet.legalActions))
  assert.equal(JSON.stringify(packet.legalActions).includes('payload'), false)
  assert.equal(packet.catalog.version, 'part-catalog:v1')
  assert.equal(packet.catalog.parts.some((part) => part.id === 'Body_Square_Medium'), true)
}

function assertAgentConnectionPacket(packet, role) {
  assert.equal(packet.sessionId.startsWith('s_'), true)
  assert.equal(packet.role, role)
  assert.equal(typeof packet.decisionVersion, 'number')
  assert.equal(typeof packet.eventVersion, 'number')
  assert.equal(packet.actionSetId, undefined)
  assert.equal(packet.catalog, undefined)
  assert.equal(packet.legalActions, undefined)
  assert.equal(packet.blockedActions, undefined)
  assert.equal(packet.board, undefined)
  assert.equal(packet.buildState, undefined)
  assert.equal(packet.store, undefined)
  assert.equal(packet.submit, undefined)
}

function assertGptCompactPacket(packet, role) {
  assert.equal(packet.sessionId.startsWith('s_'), true)
  assert.equal(packet.role, role)
  assert.equal(typeof packet.decisionVersion, 'number')
  assert.equal(typeof packet.eventVersion, 'number')
  assert.equal(packet.actionSetId, undefined)
  assert.equal(packet.catalog, undefined)
  assert.equal(packet.legalActions, undefined)
  assert.equal(packet.blockedActions, undefined)
  assert.equal(packet.board, undefined)
  assert.equal(packet.buildState, undefined)
  assert.equal(packet.store, undefined)
  assert.equal(packet.submit, undefined)

  if (packet.phase === 'choose_loadout') {
    assertGptCompactBuildPacket(packet)
    return
  }

  if (packet.phase === 'combat_turn' && packet.combat?.v === 1) {
    return
  }
}

function assertGptCompactBuildPacket(packet) {
  assert.equal(packet.build.v, 1)
  assert.equal(packet.build.phase, 'build')
  assert.equal(typeof packet.build.step, 'string')
  assert.equal(packet.legalActions, undefined)
  assert.equal(packet.blockedActions, undefined)
  assert.equal(packet.buildState, undefined)
  assert.equal(packet.store, undefined)
  assert.equal(packet.catalog, undefined)

  const serialized = JSON.stringify(packet)

  assert.equal(serialized.includes('"foundationPartIds"'), false)
  assert.equal(serialized.includes('"offeredPartIds"'), false)
  assert.equal(serialized.includes('"slots"'), false)
  assert.equal(serialized.includes('"legalActions"'), false)
}

async function gameMasterStateFor(env, sessionId, invite) {
  return internalGameMasterPacketFor(env, sessionId, invite.claimToken)
}

async function coordinatorForStoredSession(env, sessionId) {
  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')

  assert.notEqual(stored, undefined)

  return {
    coordinator: SessionCoordinator.fromState(stored),
    storage,
  }
}

async function internalGameMasterPacketFor(env, sessionId, token) {
  const { coordinator, storage } = await coordinatorForStoredSession(env, sessionId)
  const result = await coordinator.getGameMasterPacketForToken(token)

  assert.equal(result.ok, true)
  assertGameMasterPacket(result.value, result.value.role)
  await storage.put('agent-arena-session', coordinator.exportState())

  return result.value
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

function combatPlanSubmissionFromPacket(packet, steps = [{ kind: 'end_turn' }]) {
  assert.notEqual(packet.combat, undefined)

  return {
    action: 'submit_combat_plan',
    round: packet.combat.round,
    decisionVersion: packet.combat.decisionVersion,
    steps,
  }
}

async function submitCombatPlanFromPacket(env, sessionId, token, packet, steps = [{ kind: 'end_turn' }]) {
  const submitted = await route(env, `/sessions/${sessionId}/combat-plan`, {
    method: 'POST',
    token,
    body: combatPlanSubmissionFromPacket(packet, steps),
  })

  assert.equal(submitted.response.status, 200)
  assertAgentConnectionPacket(submitted.json.packet, packet.role)

  return submitted
}

function completedReplayPayload() {
  return {
    round: 1,
    duration: 12,
    summary: 'Red disabled Blue with weapon pressure.',
    events: [
      { t: 0, type: 'spawn', bot: 'red', position: [-1, 0, 0], rotation: [0, 0, 0] },
      { t: 0, type: 'spawn', bot: 'blue', position: [1, 0, 0], rotation: [0, 0, 0] },
      {
        t: 1,
        type: 'weapon_fire',
        bot: 'red',
        weaponSlot: 'weaponA',
        sourceBlockId: 'spinner',
        sourcePartId: 'Weapon_Spinner_Small',
      },
      {
        t: 2,
        type: 'damage',
        bot: 'blue',
        amount: 40,
        remainingHealth: 0,
        blockId: 'core',
        partId: 'Body_Square_Medium',
      },
      { t: 2.5, type: 'knockout', bot: 'blue', cause: 'weapon' },
    ],
    teamIdentities: {
      red: expectedLegacyTeamIdentity('red'),
      blue: expectedLegacyTeamIdentity('blue'),
    },
    botBlueprints: {
      red: validSpinnerSubmission.blueprint,
      blue: validSpinnerSubmission.blueprint,
    },
  }
}

function completedFightDossier(sessionId) {
  return {
    sessionId,
    fights: [
      {
        fightId: 'fight_1',
        winner: 'red',
        reason: 'Red disabled Blue.',
        duration: 12,
        replayTimelineId: `${sessionId}:fight_1:replay`,
        bots: {
          red: {
            name: 'Spinner',
            parts: [{ instanceId: 'core', partId: 'Body_Square_Medium', health: 40 }],
            combat: { health: 40, maxHealth: 40, parts: [] },
          },
          blue: {
            name: 'Spinner',
            parts: [{ instanceId: 'core', partId: 'Body_Square_Medium', health: 0, detached: true }],
            combat: { health: 0, maxHealth: 40, parts: [], statuses: ['knocked_out'] },
          },
        },
        stats: {
          damageDealt: { red: 40, blue: 0 },
          damageTaken: { red: 0, blue: 40 },
          damageByPart: { red: {}, blue: { core: 40 } },
          weaponUse: {
            red: [{ weaponId: 'Weapon_Spinner_Small', activations: 1, hits: 1, damage: 40 }],
            blue: [],
          },
          hazardsTriggered: [],
          movement: { red: { cellsMoved: 0, hazardsCrossed: 0 }, blue: { cellsMoved: 0, hazardsCrossed: 0 } },
          disabledParts: { red: [], blue: ['core'] },
        },
        keyEvents: [
          { at: 2, type: 'damage', summary: 'blue took 40 damage' },
          { at: 2.5, type: 'knockout', summary: 'blue was knocked out by weapon' },
        ],
      },
    ],
  }
}

function completedFightEntry(sessionId, fightId, overrides = {}) {
  const [entry] = completedFightDossier(sessionId).fights

  return {
    ...structuredClone(entry),
    fightId,
    replayTimelineId: `${sessionId}:${fightId}:replay`,
    ...overrides,
  }
}

function routePostFightReflection(role, decisionVersion, overrides = {}) {
  const claims = {
    ownWeaknesses: ['secret weak drive note'],
    opponentThreats: ['secret opponent pressure note'],
    suggestedDesignChanges: ['secret armor change'],
    suggestedTacticalChanges: ['secret tactical change'],
  }

  if (role === 'blue') {
    claims.perceivedWinReason = 'secret false blue win claim'
    claims.perceivedLossReason = 'secret blue loss explanation'
  }

  return {
    action: 'submit_post_fight_reflection',
    fightId: 'fight_1',
    role,
    decisionVersion,
    claims,
    confidence: 'medium',
    ...overrides,
  }
}

async function storeCompletedFight(env, sessionId) {
  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')

  stored.phase = 'round_review'
  stored.round = 1
  stored.lastResult = {
    winner: 'red',
    reason: 'Red disabled Blue.',
    damage: { red: 0, blue: 40 },
    remainingHealth: { red: 40, blue: 0 },
  }
  stored.replay = completedReplayPayload()
  stored.fightReplays = {
    ...(stored.fightReplays ?? {}),
    fight_1: cloneJson(stored.replay),
  }
  stored.fightDossier = completedFightDossier(sessionId)
  await storage.put('agent-arena-session', stored)
}

async function storeCompletedSession(env, sessionId, options = {}) {
  await storeCompletedFight(env, sessionId)

  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')

  stored.phase = 'session_complete'
  stored.round = 3
  stored.roles.red.wins = options.redWins ?? 3
  stored.roles.red.winStreak = options.redWinStreak ?? 3
  stored.roles.blue.losses = options.blueLosses ?? 3
  stored.roles.red.currentDesign = options.redDesign ?? {
    name: 'SECRET_CHAMPION_CARRY_DO_NOT_LEAK',
    rootInstanceId: 'secret_champion_core',
    parts: [
      {
        instanceId: 'secret_champion_core',
        partId: 'Body_Square_Medium',
        cell: { x: 0, z: 0 },
        rotation: 0,
      },
      {
        instanceId: 'secret_champion_spinner',
        partId: 'Weapon_Spinner_Small',
        cell: { x: 0, z: 1 },
        rotation: 0,
      },
    ],
  }
  stored.sharedDebrief = undefined
  await storage.put('agent-arena-session', stored)
}

function findLegalAction(packet, predicate) {
  const action = packet.legalActions.find(predicate)

  assert.notEqual(action, undefined)

  return action
}

function catalogPartFromPacket(packet, partId) {
  const parts = Array.isArray(packet.catalog?.parts) ? packet.catalog.parts : []
  const part = parts.find((candidate) => candidate.id === partId)

  assert.notEqual(part, undefined)

  return part
}

async function submitPacketAction(env, sessionId, token, packet, action, parameters) {
  const actionParameters = parameters ?? action.parameterExamples?.[0]
  const { coordinator, storage } = await coordinatorForStoredSession(env, sessionId)
  const submitted = await coordinator.submitGameMasterAction(
    token,
    {
      ...actionSubmissionFromPacket(packet, action.id),
      ...(actionParameters ? { parameters: actionParameters } : {}),
    },
  )

  assert.equal(submitted.ok, true)
  assertGameMasterPacket(submitted.value.packet, packet.role)
  await storage.put('agent-arena-session', coordinator.exportState())

  return submitted.value.packet
}

async function placePartFromCatalog(env, sessionId, token, packet, partId) {
  packet = await submitPacketAction(
    env,
    sessionId,
    token,
    packet,
    findLegalAction(packet, (action) => action.kind === 'choose_part' && action.catalogRefs?.includes(partId)),
  )
  packet = await submitPacketAction(
    env,
    sessionId,
    token,
    packet,
    findLegalAction(packet, (action) => action.kind === 'choose_attach_target'),
  )
  packet = await submitPacketAction(
    env,
    sessionId,
    token,
    packet,
    findLegalAction(packet, (action) => action.kind === 'propose_mount_pose'),
    defaultMountPoseParameters(findLegalAction(packet, (action) => action.kind === 'propose_mount_pose')),
  )

  return packet
}

function defaultMountPoseParameters(action, overrides = {}) {
  assert.equal(action.kind, 'propose_mount_pose')
  assert.ok(action.parameterExamples?.length > 0)

  return {
    ...action.parameterExamples[0],
    ...overrides,
  }
}

async function buildConfirmableMachineLoadout(_env, _sessionId, _token, packet) {
  return {
    packet,
    confirmAction: findLegalAction(packet, (action) => action.kind === 'confirm_loadout'),
  }
}

async function confirmMachineLoadout(env, sessionId, token, packet) {
  const built = await buildConfirmableMachineLoadout(env, sessionId, token, packet)

  return submitPacketAction(env, sessionId, token, built.packet, built.confirmAction)
}

async function bootstrapReadySession(env, sessionId) {
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = inviteFor(created.json.invites, 'red')
  const blueInvite = inviteFor(created.json.invites, 'blue')
  const redBootstrap = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: bootstrapBody('red', 'Red Action'),
  })
  const blueBootstrap = await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: bootstrapBody('blue', 'Blue Action'),
  })
  const redReadyState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

  assert.equal(redBootstrap.response.status, 201)
  assert.equal(blueBootstrap.response.status, 201)
  assert.equal(redReadyState.response.status, 200)

  return {
    refereeToken: created.json.refereeToken,
    redInvite,
    blueInvite,
    redPacket: await internalGameMasterPacketFor(env, sessionId, redInvite.claimToken),
    bluePacket: await internalGameMasterPacketFor(env, sessionId, blueInvite.claimToken),
  }
}

const requiredDesignPatternIds = [
  'stationary_spinner',
  'black_hole_control',
  'glass_cannon_saw',
  'wedge_bully',
  'crab_turret',
  'trash_tank',
  'hazard_matador',
  'porcupine_shell',
  'control_jailer',
  'commander_drone_swarm',
]

function assertLegalDesignPatterns(contract) {
  const partCatalog = new Map(contract.partCatalog.map((part) => [part.id, part]))
  const behaviorIds = new Set(
    contract.partCatalog
      .map((part) => part.behavior?.id)
      .filter((behaviorId) => behaviorId !== undefined),
  )

  assert.deepEqual(contract.designPatterns.map((pattern) => pattern.id), requiredDesignPatternIds)

  for (const pattern of contract.designPatterns) {
    assert.equal(typeof pattern.name, 'string')
    assert.equal(typeof pattern.fantasy, 'string')
    assert.ok(pattern.fantasy.includes('mutat') || pattern.fantasy.includes('hybrid'))
    assert.ok(['first_round_legal', 'later_round_upgrade'].includes(pattern.budgetPhase))
    assert.equal(pattern.suggestedParts.length > 0, true)
    assert.equal(pattern.counters.length > 0, true)
    assert.equal(pattern.simBackedEffects.length > 0, true)

    let totalCost = 0
    const suggestedBehaviorIds = new Set()
    const controls = {
      movement: false,
      weapon: false,
    }

    for (const suggestedPart of pattern.suggestedParts) {
      const catalogPart = partCatalog.get(suggestedPart.partId)

      assert.ok(catalogPart, `${pattern.id} suggests unknown part ${suggestedPart.partId}`)
      assert.equal(Number.isInteger(suggestedPart.quantity), true)
      assert.equal(suggestedPart.quantity > 0, true)

      totalCost += catalogPart.cost * suggestedPart.quantity
      controls.movement ||= catalogPart.controls?.movement === true
      controls.weapon ||= catalogPart.controls?.weapon === true

      if (catalogPart.behavior) {
        suggestedBehaviorIds.add(catalogPart.behavior.id)
      }
    }

    if (pattern.budgetPhase === 'first_round_legal') {
      assert.ok(totalCost <= contract.rules.startingGold, `${pattern.id} costs ${totalCost}`)
    } else {
      assert.ok(pattern.budgetPhase.includes('later'))
    }

    for (const effect of pattern.simBackedEffects) {
      assert.ok(behaviorIds.has(effect), `${pattern.id} claims unknown behavior ${effect}`)
      assert.ok(
        suggestedBehaviorIds.has(effect),
        `${pattern.id} claims ${effect} without a suggested source part`,
      )
    }

    assert.ok(TACTIC_STYLES.includes(pattern.suggestedTactics.style))
    assert.ok(TARGET_PRIORITIES.includes(pattern.suggestedTactics.targetPriority))
    assert.ok(PREFERRED_RANGES.includes(pattern.suggestedTactics.preferredRange))
    assert.ok(MOVEMENT_POLICIES.includes(pattern.suggestedTactics.movementPolicy))
    assert.ok(WEAPON_CADENCES.includes(pattern.suggestedTactics.weaponCadence))
    assert.ok(HAZARD_PREFERENCES.includes(pattern.suggestedTactics.hazardPreference))
    assert.ok(pattern.suggestedTactics.aggression >= 0 && pattern.suggestedTactics.aggression <= 1)
    assert.ok(
      pattern.suggestedTactics.retreatAtHealthPct >= 0 &&
        pattern.suggestedTactics.retreatAtHealthPct <= 1,
    )

    if (pattern.suggestedTactics.movementPolicy !== 'hold_ground') {
      assert.ok(controls.movement, `${pattern.id} needs movement controls`)
    }

    if (pattern.suggestedTactics.weaponCadence !== 'hold_fire') {
      assert.ok(controls.weapon, `${pattern.id} needs weapon controls`)
    }
  }
}

function assertCatalogGuidance(contract) {
  const partCatalog = new Map(contract.partCatalog.map((part) => [part.id, part]))
  const featureGates = new Map(
    contract.catalogGuidance.featureGates.map((gate) => [gate.id, gate]),
  )

  assert.ok(contract.catalogGuidance.purpose.includes('Advisory catalog routing'))
  assert.ok(contract.catalogGuidance.trustOrder[0].includes('session rules'))
  assert.equal(featureGates.get('agent.plan_context')?.state, 'enabled')
  assert.equal(featureGates.get('combat.hazard_routing')?.state, 'experimental')

  for (const capability of contract.catalogGuidance.capabilities) {
    assert.equal(typeof capability.id, 'string')
    assert.ok(capability.routingHints.length > 0)
    assert.ok(capability.preferWhen.length > 0)
    assert.ok(capability.neverUseWhen.length > 0)
    assert.ok(capability.semanticCapabilities.length > 0)
    assert.ok(capability.candidateParts.length > 0)
    assert.ok(capability.executionRules.length > 0)
    assert.ok(capability.commonErrors.length > 0)

    for (const gateId of capability.requiredFeatureGateIds) {
      assert.ok(featureGates.has(gateId), `${capability.id} requires unknown gate ${gateId}`)
    }

    for (const candidate of capability.candidateParts) {
      assert.ok(
        partCatalog.has(candidate.partId),
        `${capability.id} recommends unknown part ${candidate.partId}`,
      )
      assert.ok(candidate.reasons.length > 0)
      assert.ok(candidate.companionNeeds.length > 0)

      for (const gateId of candidate.featureGateIds) {
        const gate = featureGates.get(gateId)

        assert.ok(gate, `${candidate.partId} references unknown gate ${gateId}`)
        assert.notEqual(gate.state, 'disabled')
        assert.notEqual(gate.state, 'deprecated')
      }
    }

    for (const exclusion of capability.excludedCandidates) {
      assert.ok(
        partCatalog.has(exclusion.partId),
        `${capability.id} excludes unknown part ${exclusion.partId}`,
      )
      assert.ok(exclusion.reasons.length > 0)
    }
  }

  assert.ok(
    contract.catalogGuidance.capabilities
      .find((capability) => capability.id === 'movement_escape')
      ?.candidateParts.some((candidate) => candidate.partId === 'Wheel_Omni'),
  )
  assert.ok(
    contract.catalogGuidance.capabilities
      .find((capability) => capability.id === 'survive_contact')
      ?.candidateParts.some((candidate) => candidate.partId === 'Armor_Reactive'),
  )
}

test('GET /agent-spec.json returns the agent contract', async () => {
  const { response, json } = await route({}, '/agent-spec.json', {
    headers: {
      origin: 'https://arena.dorbii.net',
    },
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://arena.dorbii.net')
  assert.equal(json.name, 'Clash of Clankers')
  assert.equal(json.version, '0.3.0-agent-connection')
  assert.equal(json.entrypoints.agentSpec, 'https://arena-api.dorbii.net/agent-spec.json')
  assert.equal(json.entrypoints.gptActionsOpenApi, 'https://arena-api.dorbii.net/openapi.json')
  assert.equal(json.customGptActions.openApi, 'https://arena-api.dorbii.net/openapi.json')
  assert.deepEqual(json.customGptActions.operations, [
    'gptClaim',
    'gptNext',
    'gptAct',
    'gptReflection',
    'gptCatalog',
  ])
  assert.equal(json.browserApi.global, 'window.AgentArenaRole')
  assert.equal('briefScriptTagId' in json.browserApi, false)
  assert.deepEqual(json.browserApi.methods, [
    'bootstrapRole',
    'getState',
    'waitForAgentPacket',
    'submitBuildAction',
    'submitCombatPlan',
    'surrender',
    'submitPostFightReflection',
    'sendChatMessage',
  ])
  assert.equal(json.browserApi.methods.includes('submitRoundPlan'), false)
  assert.equal(json.browserApi.methods.includes('submitTurnCommand'), false)
  assert.equal(json.browserApi.methods.includes('saveCompletedSession'), false)
  assert.equal(json.browserApi.methods.includes('continueChampionSession'), false)
  assert.equal(json.browserApi.methods.includes('quitCompletedSession'), false)
  assert.equal(JSON.stringify(json).includes('/save'), false)
  assert.equal(JSON.stringify(json).includes('/continue'), false)
  assert.equal(JSON.stringify(json).includes('/quit'), false)
  assert.ok(json.objective.includes('AgentConnectionPacket'))
  assert.ok(json.objective.includes('server own'))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('Custom GPT path only')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('routing layer')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('A waiting GPT response is not a turn result')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('gptCatalog')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('Omit teamIdentity')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('packet.combat.combat')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('packet.combat.board')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('actionId combat_plan')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('error.issues')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('untrusted')))
  assert.ok(json.externalAgentGuide.fallback.includes('GPT Actions are unavailable'))
  assert.equal(JSON.stringify(json.externalAgentGuide).includes('window.AgentArenaRole'), false)
  assert.equal(JSON.stringify(json.externalAgentGuide).includes('/sessions/:sessionId/roles'), false)
  assert.equal(JSON.stringify(json.externalAgentGuide).includes('generate your own TeamIdentity'), false)
  assert.equal(JSON.stringify(json.externalAgentGuide).includes('normalizes the later duplicate'), false)
  assert.equal(JSON.stringify(json.externalAgentGuide).includes('legacy'), false)
  assert.ok(json.runtimeGuides.browserAutomation.firstRead.some((item) => item.includes('waitForAgentPacket')))
  assert.ok(json.runtimeGuides.browserAutomation.firstRead.some((item) => item.includes('submitBuildAction')))
  assert.ok(json.runtimeGuides.browserAutomation.firstRead.some((item) => item.includes('surrender')))
  assert.ok(json.runtimeGuides.rawHttp.firstRead.some((item) => item.includes('/roles/:role/bootstrap')))
  assert.ok(json.runtimeGuides.rawHttp.firstRead.some((item) => item.includes('agentPacket')))
  assert.ok(json.runtimeGuides.rawHttp.firstRead.some((item) => item.includes('submit_combat_plan')))
  assert.ok(json.runtimeGuides.rawHttp.firstRead.some((item) => item.includes('action surrender')))
  assert.ok(json.rules.packetFields.required.includes('decisionVersion'))
  assert.ok(json.rules.packetFields.required.includes('eventVersion'))
  assert.equal('browserAndHttpRequired' in json.rules.packetFields, false)
  assert.equal(json.rules.packetFields.required.includes('legalActions'), false)
  assert.equal(json.rules.packetFields.optional.includes('blockedActions'), false)
  assert.ok(json.rules.packetFields.optional.includes('build'))
  assert.ok(json.rules.packetFields.optional.includes('combat'))
  assert.ok(json.rules.packetFields.optional.includes('review'))
  assert.ok(json.rules.packetFields.optional.includes('sharedDebrief'))
  assert.ok(json.rules.packetFields.optional.includes('combat.fightDeadlineAt'))
  assert.ok(json.rules.packetFields.reviewContract.review.includes('reflection'))
  assert.ok(json.rules.packetFields.reviewContract.sharedDebrief.includes('fight-scoped'))
  assert.deepEqual(json.rules.teamIdentitySchema.requiredOnFirstConnect, [
    'name',
    'colorHex',
    'logoPrompt or logoAsset',
  ])
  assert.equal(json.rules.teamIdentitySchema.colorHex, 'string formatted as #RRGGBB hex color')
  assert.ok(json.rules.teamIdentitySchema.logoPrompt.includes('text prompt'))
  assert.ok(json.rules.teamIdentitySchema.logoAsset.includes('image_url'))
  assert.ok(json.rules.teamIdentitySchema.duplicateNames.includes('role-distinct'))
  assert.equal(json.rules.packetFields.versionContract.decisionVersion, 'snapshot both agents choose from')
  assert.equal('actionSetId' in json.rules.packetFields.versionContract, false)
  assert.equal(json.rules.packetFields.versionContract.eventVersion, 'chat, replay, and public-state progression')
  assert.equal(json.rules.submissionSchema.surrender.action, 'surrender')
  assert.equal(json.rules.submissionSchema.surrender.endpoint, '/sessions/:sessionId/action')
  assert.deepEqual(json.rules.submissionSchema.surrender.required, ['action', 'decisionVersion'])
  assert.ok(json.rules.submissionSchema.surrender.optional.includes('publicMessage'))
  assert.equal(json.rules.submissionSchema.compactBuildAction.action, 'submit_build_action')
  assert.equal(json.rules.submissionSchema.compactBuildAction.endpoint, '/sessions/:sessionId/build-action')
  assert.ok(json.rules.submissionSchema.compactBuildAction.compactKinds.includes('mount_part'))
  assert.equal(json.rules.submissionSchema.combatPlan.action, 'submit_combat_plan')
  assert.equal(json.rules.submissionSchema.combatPlan.endpoint, '/sessions/:sessionId/combat-plan')
  assert.ok(json.rules.submissionSchema.combatPlan.required.includes('steps'))
  assert.equal(json.rules.submissionSchema.compactGptCombatPlan.actionId, 'combat_plan')
  assert.equal(json.rules.submissionSchema.compactGptCombatPlan.wrapper, '/gpt/act')
  assert.ok(json.partCatalog.some((part) => part.id === 'Body_Square_Medium' && part.cost === 22))
  assert.ok(json.partCatalog.some((part) => part.id === 'Weapon_Spinner_Small'))
  assert.ok(json.partCatalog.some((part) => part.id === 'Utility_DroneController' && part.behavior?.id === 'drone_controller'))
  assertCatalogGuidance(json)
  assert.equal(json.examples.agentConnectionPacket.decisionVersion, 3204)
  assert.equal(json.examples.agentConnectionPacket.eventVersion, 44)
  assert.equal(json.examples.agentConnectionPacket.combat.v, 1)
  assert.deepEqual(json.examples.agentConnectionPacket.combat.board.grid, [-6, 6, -4, 4])
  assert.equal(json.examples.agentConnectionPacket.actionSetId, undefined)
  assert.equal(json.examples.agentConnectionPacket.legalActions, undefined)
  assert.equal(json.examples.agentConnectionPacket.board, undefined)
  assert.equal(json.examples.agentConnectionPacket.submit, undefined)
  assert.equal(json.examples.surrenderSubmission.action, 'surrender')
  assert.equal(json.examples.compactBuildActionSubmission.action, 'submit_build_action')
  assert.equal(json.examples.compactCombatPlanSubmission.action, 'submit_combat_plan')
  assert.deepEqual(json.examples.compactCombatPlanSubmission.steps[0].to, [4, 0])
  assert.equal(json.examples.teamIdentity.name, 'Red 7ZQ9K2')
  assert.equal(json.examples.teamIdentity.colorHex, '#ff4c5d')
  assert.equal(typeof json.examples.teamIdentity.logoPrompt, 'string')
  assert.equal('primaryColor' in json.examples.teamIdentity, false)
  assert.equal('logo' in json.examples.teamIdentity, false)
  assert.equal(json.examples.teamIdentityByRole.red.name, 'Red 7ZQ9K2')
  assert.equal(json.examples.teamIdentityByRole.blue.name, 'Blue 7ZQ9K2')
  assert.notEqual(json.examples.teamIdentityByRole.red.name, json.examples.teamIdentityByRole.blue.name)
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'gpt_act' &&
        action.method === 'POST' &&
        action.path === '/gpt/act' &&
        action.returns.includes('compact action objects'),
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'gpt_catalog' &&
        action.method === 'POST' &&
        action.path === '/gpt/catalog',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'gpt_reflection' &&
        action.method === 'POST' &&
        action.path === '/gpt/reflection',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'bootstrap_role' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/roles/:role/bootstrap' &&
        action.auth.includes('player key'),
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'surrender' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/action' &&
        action.body.action === 'surrender',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_build_action' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/build-action' &&
        action.body.action === 'submit_build_action',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_combat_plan' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/combat-plan' &&
        action.body.action === 'submit_combat_plan',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_post_fight_reflection' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/reflection',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'get_replay' &&
        action.method === 'GET' &&
        action.path === '/sessions/:sessionId/replay' &&
        action.returns.includes('resolved semantic replay truth'),
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_chat_message' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/chat' &&
        action.returns.includes('display-only public chat'),
    ),
  )
  const serializedContract = JSON.stringify(json)
  for (const legacyPublicName of [
    'GameMasterPacket',
    'gameMaster',
    'legalActions',
    'actionSetId',
    'submit_game_action',
    'submit_combat_round_plan',
    'waitForGameMasterPacket',
    'submitAction',
    'submit_round_plan',
    'submit_turn_command',
    'submitRoundPlan',
    'submitTurnCommand',
    'RoundPlanSubmission',
    'RoundPlanSubmissionV2',
    'NormalizedRoundPlanSubmission',
    'TurnCommandSubmission',
    'TurnCommandPostRequest',
    'CombatTurnDecisionContext',
    'CombatTurnLegalCommands',
    'movementOptions',
    'legalCommands',
    'primaryColor',
    'logoMarks',
    'logoInitials',
    'save_completed_session',
    'continue_champion_session',
    'quit_completed_session',
    '/sessions/:sessionId/save',
    '/sessions/:sessionId/continue',
    '/sessions/:sessionId/quit',
  ]) {
    assert.equal(serializedContract.includes(legacyPublicName), false, legacyPublicName)
  }
})

test('GET /openapi.json returns the Custom GPT Actions schema', async () => {
  const { response, json } = await route({}, '/openapi.json', {
    headers: {
      origin: 'https://arena.dorbii.net',
    },
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://arena.dorbii.net')
  assert.equal(json.openapi, '3.1.0')
  assert.equal(json.info.version, '0.3.0-agent-connection')
  assert.ok(json.info.description.includes('routing layer'))
  assert.ok(json.info.description.includes('ask the user to type continue'))
  assert.equal(json.servers[0].url, 'https://arena-api.test')
  assert.deepEqual(Object.keys(json.paths).sort(), [
    '/gpt/act',
    '/gpt/catalog',
    '/gpt/claim',
    '/gpt/next',
    '/gpt/reflection',
  ])
  assert.equal(json.paths['/gpt/claim'].post.operationId, 'gptClaim')
  assert.equal(json.paths['/gpt/next'].post.operationId, 'gptNext')
  assert.equal(json.paths['/gpt/act'].post.operationId, 'gptAct')
  assert.equal(json.paths['/gpt/reflection'].post.operationId, 'gptReflection')
  assert.equal(json.paths['/gpt/catalog'].post.operationId, 'gptCatalog')
  for (const path of Object.keys(json.paths)) {
    assert.equal(json.paths[path].post['x-openai-isConsequential'], false)
  }
  for (const [path, methods] of Object.entries(json.paths)) {
    assert.ok(
      methods.post.description.length <= 300,
      `${path} post description exceeds Custom GPT 300-character limit`,
    )
  }
  assert.ok(json.paths['/gpt/next'].post.description.includes('packet.review'))
  assert.ok(json.paths['/gpt/next'].post.description.includes('fightDeadlineAt'))
  assert.ok(json.paths['/gpt/act'].post.description.includes('combat_plan'))
  assert.equal(JSON.stringify(json).includes('/sessions/'), false)
  assert.equal(JSON.stringify(json).includes('window.AgentArenaRole'), false)
  assert.deepEqual(json.components.schemas.GptClaimRequest.required, ['inviteUrl'])
  assert.ok(
    json.components.schemas.GptClaimRequest.properties.agentName.description.includes(
      'Optional',
    ),
  )
  assert.ok('teamIdentity' in json.components.schemas.GptClaimRequest.properties)
  assert.ok(
    json.components.schemas.GptClaimRequest.properties.teamIdentity.description.includes(
      'server mint',
    ),
  )
  assert.deepEqual(json.components.schemas.GptActRequest.required, ['inviteUrl'])
  assert.deepEqual(json.components.schemas.GptActRequest.oneOf, [
    { required: ['inviteUrl', 'action'] },
    { required: ['inviteUrl', 'actionId'] },
  ])
  assert.equal(
    json.components.schemas.GptActRequest.properties.action.$ref,
    '#/components/schemas/CompactBuildAction',
  )
  assert.deepEqual(json.components.schemas.GptActRequest.properties.actionId.enum, ['combat_plan'])
  assert.ok(json.components.schemas.CompactBuildAction.required.includes('kind'))
  assert.ok(json.components.schemas.CompactBuildAction.properties.kind.enum.includes('choose_part'))
  assert.ok(json.components.schemas.CompactBuildAction.properties.kind.enum.includes('mount_part'))
  assert.ok(json.components.schemas.CompactBuildAction.properties.kind.enum.includes('cancel_build_selection'))
  assert.equal('actionSetId' in json.components.schemas.GptActRequest.properties, false)
  assert.equal('decisionVersion' in json.components.schemas.GptActRequest.properties, false)
  assert.equal(
    json.components.schemas.GptActRequest.properties.parameters.$ref,
    '#/components/schemas/GptActionParameters',
  )
  assert.equal(
    json.components.schemas.GptResponse.properties.continuation.$ref,
    '#/components/schemas/GptContinuationHint',
  )
  assert.equal(
    json.components.schemas.GptResponse.properties.nextStep.$ref,
    '#/components/schemas/GptNextStepDirective',
  )
  assert.deepEqual(json.components.schemas.GptResponse.required, [
    'status',
    'packet',
    'continuation',
    'nextStep',
  ])
  assert.ok(json.components.schemas.GptResponse.properties.packet.description.includes('packet.build.edit.cancel'))
  assert.ok(json.components.schemas.GptResponse.properties.packet.description.includes('packet.review'))
  assert.ok(json.components.schemas.GptResponse.properties.packet.description.includes('fightStartedAt'))
  assert.equal(json.components.schemas.GptResponse.properties.packet.description.includes('legalActions'), false)
  assert.ok(json.components.schemas.GptContinuationHint.required.includes('mustCallBeforeResponding'))
  assert.deepEqual(
    json.components.schemas.GptContinuationHint.properties.recommendedNextCall.enum,
    ['gptNext', 'gptAct', 'gptReflection', 'stop'],
  )
  assert.ok(
    json.components.schemas.GptContinuationHint.properties.instruction.description.includes(
      'without asking the user',
    ),
  )
  assert.equal(JSON.stringify(json).includes('not a guaranteed autonomous loop'), false)
  const gptParameterProperties = json.components.schemas.GptActionParameters.properties

  assert.ok('steps' in gptParameterProperties)
  assert.equal('childPartId' in gptParameterProperties, false)
  assert.equal('destinationCellId' in gptParameterProperties, false)
  assert.ok('to' in gptParameterProperties.steps.items.properties)
  assert.ok('target' in gptParameterProperties.steps.items.properties)
  assert.ok('at' in gptParameterProperties.steps.items.properties)
  assert.equal('cellId' in gptParameterProperties.steps.items.properties, false)
  assert.equal('targetCellId' in gptParameterProperties.steps.items.properties, false)
  assert.ok(json.components.schemas.GptCatalogRequest.required.includes('partIds'))
})

test('public bootstrap validator requires agent name and team identity', () => {
  const missingBoth = validateAgentBootstrapRequestShape({})

  assert.equal(missingBoth.ok, false)
  assert.ok(
    missingBoth.issues.some((issue) => issue.code === 'INVALID_AGENT_NAME' && issue.path === 'bootstrap.agentName'),
  )
  assert.ok(
    missingBoth.issues.some((issue) => issue.code === 'MISSING_TEAM_IDENTITY' && issue.path === 'bootstrap.teamIdentity'),
  )

  const missingAgentName = validateAgentBootstrapRequestShape({
    teamIdentity: testTeamIdentity('red'),
  })

  assert.equal(missingAgentName.ok, false)
  assert.ok(
    missingAgentName.issues.some((issue) => issue.code === 'INVALID_AGENT_NAME' && issue.path === 'bootstrap.agentName'),
  )

  const missingTeamIdentity = validateAgentBootstrapRequestShape({
    agentName: 'red-agent',
  })

  assert.equal(missingTeamIdentity.ok, false)
  assert.ok(
    missingTeamIdentity.issues.some((issue) => issue.code === 'MISSING_TEAM_IDENTITY' && issue.path === 'bootstrap.teamIdentity'),
  )

  assert.equal(
    validateAgentBootstrapRequestShape({
      agentName: 'red-agent',
      teamIdentity: testTeamIdentity('red'),
    }).ok,
    true,
  )
})

test('OPTIONS returns CORS preflight headers', async () => {
  const response = await handleWorkerRequest(
    new Request('https://arena-api.test/sessions/s_demo/action', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://arena.dorbii.net',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization, content-type',
      },
    }),
    {},
  )

  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://arena.dorbii.net')
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS')
  assert.equal(response.headers.get('access-control-allow-headers'), 'authorization, content-type')
})

test('CORS allows ChatGPT action origins', async () => {
  for (const origin of ['https://chatgpt.com', 'https://chat.openai.com']) {
    const response = await handleWorkerRequest(
      new Request('https://arena-api.test/gpt/claim', {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      }),
      {},
    )

    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), origin)
  }
})

test('CORS allows local dev and configured origins without wildcard fallback', async () => {
  const localResponse = await handleWorkerRequest(
    new Request('https://arena-api.test/agent-spec.json', {
      headers: {
        origin: 'http://localhost:5173',
      },
    }),
    {},
  )
  const configuredResponse = await handleWorkerRequest(
    new Request('https://arena-api.test/agent-spec.json', {
      headers: {
        origin: 'https://qa-arena.test',
      },
    }),
    {
      AGENT_ARENA_ALLOWED_ORIGINS: 'qa-arena.test',
    },
  )
  const rejectedResponse = await handleWorkerRequest(
    new Request('https://arena-api.test/agent-spec.json', {
      headers: {
        origin: 'https://evil.test',
      },
    }),
    {},
  )

  assert.equal(localResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  assert.equal(configuredResponse.headers.get('access-control-allow-origin'), 'https://qa-arena.test')
  assert.equal(rejectedResponse.headers.get('access-control-allow-origin'), null)
})

test('POST /sessions returns WORKER_NOT_CONFIGURED without the Durable Object binding', async () => {
  const { response, json } = await route(
    {},
    '/sessions',
    {
      method: 'POST',
      body: { sessionId: 's_missing_binding' },
    },
  )

  assert.equal(response.status, 500)
  assert.equal(json.ok, false)
  assert.equal(json.error.code, 'WORKER_NOT_CONFIGURED')
})

test('POST /sessions is public while direct Durable Object create action is not exposed', async () => {
  const env = createEnv()
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId: 's_public_create' },
  })
  const directCreate = await route(env, '/sessions/s_direct_create/create', {
    method: 'POST',
    body: { sessionId: 's_direct_create' },
  })

  assert.equal(created.response.status, 201)
  assert.equal(created.json.sessionId, 's_public_create')
  assert.equal(created.json.publicState.roundPlan, undefined)
  assert.equal(directCreate.response.status, 404)
  assert.equal(directCreate.json.error.code, 'INVALID_ACTION')
})

test('worker exposes idempotent role bootstrap for external agents', async () => {
  const env = createEnv()
  const sessionId = 's_bootstrap_route'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = inviteFor(created.json.invites, 'red')
  const blueInvite = inviteFor(created.json.invites, 'blue')
  const invalidBootstrap = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: 'not-a-player-key',
    body: {},
  })

  assert.equal(invalidBootstrap.response.status, 401)
  assert.equal(invalidBootstrap.json.error.code, 'INVALID_TOKEN')

  const redBootstrap = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: bootstrapBody('red', 'External Red'),
  })

  assert.equal(redBootstrap.response.status, 201)
  assertAgentConnectionPacket(redBootstrap.json, 'red')
  assert.equal(redBootstrap.json.phase, 'wait_for_opponent_claim')
  assert.equal(redBootstrap.json.nextAction, 'wait_for_opponent_claim')

  const resumedRed = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {},
  })

  assert.equal(resumedRed.response.status, 200)
  assertAgentConnectionPacket(resumedRed.json, 'red')
  assert.equal(resumedRed.json.phase, 'wait_for_opponent_claim')

  const repeatedIdentityRed = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: bootstrapBody('red', 'External Red'),
  })

  assert.equal(repeatedIdentityRed.response.status, 200)
  assertAgentConnectionPacket(repeatedIdentityRed.json, 'red')

  const mutatedIdentityRed = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      ...bootstrapBody('red', 'External Red'),
      teamIdentity: {
        ...testTeamIdentity('red'),
        name: 'Different Red Team',
      },
    },
  })

  assert.equal(mutatedIdentityRed.response.status, 400)
  assert.equal(mutatedIdentityRed.json.error.code, 'INVALID_REQUEST')

  const stolenRed = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: {},
  })

  assert.equal(stolenRed.response.status, 409)
  assert.equal(stolenRed.json.error.code, 'ROLE_ALREADY_CLAIMED')

  const redState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

  assert.equal(redState.response.status, 200)
  assert.equal(redState.json.role, 'red')
  assertAgentConnectionPacket(redState.json.agentPacket, 'red')

  const preBootstrapBlueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })

  assert.equal(preBootstrapBlueState.response.status, 200)
  assert.equal(preBootstrapBlueState.json.role, 'blue')
  assert.equal(preBootstrapBlueState.json.identity, undefined)
  assertAgentConnectionPacket(preBootstrapBlueState.json.agentPacket, 'blue')
  assert.equal(preBootstrapBlueState.json.agentPacket.phase, 'wait_for_opponent_claim')
  assert.equal(preBootstrapBlueState.json.agentPacket.nextAction, 'wait_for_opponent_claim')

  const blueBootstrap = await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: bootstrapBody('blue'),
  })

  assert.equal(blueBootstrap.response.status, 201)
  assertAgentConnectionPacket(blueBootstrap.json, 'blue')
  assert.equal(blueBootstrap.json.phase, 'choose_loadout')
  assert.equal(blueBootstrap.json.nextAction, 'build_bot')
  assert.equal(blueBootstrap.json.build.step, 'choose_part')
  assert.equal(blueBootstrap.json.build.edit.confirm, true)
})

test('role bootstrap normalizes duplicate team names and keeps identity locked', async () => {
  const env = createEnv()
  const sessionId = 's_duplicate_identity'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = inviteFor(created.json.invites, 'red')
  const blueInvite = inviteFor(created.json.invites, 'blue')
  const duplicateName = 'Mirror Works'
  const redIdentity = {
    ...testTeamIdentity('red'),
    name: duplicateName,
  }
  const blueIdentity = {
    ...testTeamIdentity('blue'),
    name: ` ${duplicateName} `,
  }
  const redBootstrap = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      agentName: 'Red Mirror',
      teamIdentity: redIdentity,
    },
  })
  const blueBootstrap = await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: {
      agentName: 'Blue Mirror',
      teamIdentity: blueIdentity,
    },
  })
  const publicState = await route(env, `/sessions/${sessionId}/public`)

  assert.equal(redBootstrap.response.status, 201)
  assert.equal(blueBootstrap.response.status, 201)
  assert.equal(publicState.response.status, 200)
  assert.equal(publicState.json.roles.red.identity.name, duplicateName)
  assert.equal(publicState.json.roles.blue.identity.name, `${duplicateName} Blue`)
  assert.notEqual(publicState.json.roles.red.identity.name, publicState.json.roles.blue.identity.name)

  const sameOriginalBlue = await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: {
      agentName: 'Blue Mirror',
      teamIdentity: blueIdentity,
    },
  })
  const mutatedBlue = await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: {
      agentName: 'Blue Mirror',
      teamIdentity: {
        ...blueIdentity,
        name: 'Different Blue Team',
      },
    },
  })

  assert.equal(sameOriginalBlue.response.status, 200)
  assert.equal(mutatedBlue.response.status, 400)
  assert.equal(mutatedBlue.json.error.code, 'INVALID_REQUEST')
})

test('observer cockpit bearer can read private state but cannot mutate role state', async () => {
  const env = createEnv()
  const sessionId = 's_observer_route'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = inviteFor(created.json.invites, 'red')
  const observerState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.observerToken,
  })

  assert.equal(observerState.response.status, 200)
  assert.equal(observerState.json.role, 'red')

  const observerBootstrap = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.observerToken,
    body: { agentName: 'Observer Red' },
  })

  assert.equal(observerBootstrap.response.status, 401)
  assert.equal(observerBootstrap.json.error.code, 'INVALID_TOKEN')

  const observerSubmission = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.observerToken,
    body: {
      action: 'surrender',
      decisionVersion: 1,
    },
  })

  assert.equal(observerSubmission.response.status, 403)
  assert.equal(observerSubmission.json.error.code, 'FORBIDDEN')

  const observerChat = await route(env, `/sessions/${sessionId}/chat`, {
    method: 'POST',
    token: redInvite.observerToken,
    body: { kind: 'observation', message: 'observer should not post' },
  })

  assert.equal(observerChat.response.status, 403)
  assert.equal(observerChat.json.error.code, 'FORBIDDEN')
})

test('old round plan and turn command routes are removed from worker session actions', async () => {
  const env = createEnv()
  const sessionId = 's_old_routes_removed'
  const { redInvite } = await bootstrapReadySession(env, sessionId)

  const oldRoundPlan = await route(env, `/sessions/${sessionId}/round-plan`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      action: 'submit_round_plan',
      ...validSpinnerSubmission,
    },
  })
  const oldTurnCommand = await route(env, `/sessions/${sessionId}/turn-command`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      action: 'submit_turn_command',
      tick: 1,
      move: 'forward',
      weaponA: 'hold',
    },
  })

  assert.equal(oldRoundPlan.response.status, 404)
  assert.equal(oldRoundPlan.json.error.code, 'INVALID_ACTION')
  assert.equal(oldTurnCommand.response.status, 404)
  assert.equal(oldTurnCommand.json.error.code, 'INVALID_ACTION')
})

test('state and public routes expose compact agent packet versions', async () => {
  const env = createEnv()
  const sessionId = 's_state_packet_route'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)
  const redState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const publicState = await route(env, `/sessions/${sessionId}/public`)

  assertGameMasterPacket(redPacket, 'red')
  assertGameMasterPacket(bluePacket, 'blue')
  assert.equal(redState.response.status, 200)
  assertAgentConnectionPacket(redState.json.agentPacket, 'red')
  assert.equal(redState.json.agentPacket.decisionVersion, redPacket.decisionVersion)
  assert.equal(publicState.response.status, 200)
  assert.equal(publicState.json.agent.red.decisionVersion, redPacket.decisionVersion)
  assert.equal(publicState.json.agent.blue.decisionVersion, bluePacket.decisionVersion)
  assert.equal(publicState.json.agent.red.eventVersion, publicState.json.agent.blue.eventVersion)
  assert.equal(publicState.json.gameMaster, undefined)
  assert.equal(blueInvite.claimToken.startsWith('cap_blue_'), true)
})

test('POST /sessions/:id/action rejects public server-authored loadout ids', async () => {
  const env = createEnv()
  const sessionId = 's_action_accepts_valid'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const partAction = findLegalAction(
    redPacket,
    (action) => action.kind === 'choose_part',
  )
  const partId = partAction.catalogRefs?.[0]

  assert.equal(typeof partId, 'string')

  const submission = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: actionSubmissionFromPacket(redPacket, partAction.id),
  })

  assert.equal(submission.response.status, 400)
  assert.equal(submission.json.error.code, 'SUBMISSION_INVALID')
  assert.equal(submission.json.error.message.includes('/build-action'), true)
})

test('POST /gpt/claim bootstraps a role with server-owned default identity', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_claim'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = inviteFor(created.json.invites, 'red')
  const claim = await route(env, '/gpt/claim', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })
  const state = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

  assert.equal(claim.response.status, 200)
  assert.equal(claim.json.status, 'claimed')
  assert.equal(claim.json.sessionId, sessionId)
  assert.equal(claim.json.role, 'red')
  assertGptCompactPacket(claim.json.packet, 'red')
  assert.equal(claim.json.continuation.keepGoing, true)
  assert.equal(claim.json.continuation.recommendedNextCall, 'gptNext')
  assert.equal(state.json.identity.name, 'Red GPTCLA')
  assert.equal(state.json.identity.primaryColor, '#ff4c5d')
  assert.equal(state.json.identity.logo.mark, 'shield')
})

test('POST /gpt/claim still accepts explicit team identity overrides', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_claim_override'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = inviteFor(created.json.invites, 'red')

  const claim = await route(env, '/gpt/claim', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
      agentName: 'ClankGPT',
      teamIdentity: {
        mode: 'provided',
        name: 'Iron Clankers',
        colorHex: '#f97316',
        logoPrompt: 'Orange industrial combat robotics logo',
      },
    },
  })
  const state = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

  assert.equal(claim.response.status, 200)
  assert.equal(state.json.identity.name, 'Iron Clankers')
  assert.equal(state.json.identity.primaryColor, '#f97316')
  assert.equal('mode' in state.json.identity, false)
})

test('POST /gpt/next returns GPT-friendly waiting or playable status', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_next'
  const { redInvite } = await bootstrapReadySession(env, sessionId)
  const next = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })

  assert.equal(next.response.status, 200)
  assert.equal(next.json.status, 'playable')
  assert.equal(next.json.sessionId, sessionId)
  assert.equal(next.json.role, 'red')
  assertGptCompactPacket(next.json.packet, 'red')
  assert.equal(next.json.packet.build.step, 'choose_part')
  assert.ok(next.json.packet.build.store.foundation.length > 0)
  assert.ok(next.json.packet.build.store.offers.length > 0)
  assert.deepEqual(next.json.packet.build.bot.parts[0], ['core', 'body.Machine_Core', null, 20, 20])
  assert.equal(next.json.continuation.keepGoing, true)
  assert.equal(next.json.continuation.mustCallBeforeResponding, true)
  assert.equal(next.json.continuation.recommendedNextCall, 'gptAct')
  assert.ok(next.json.continuation.instruction.includes('Do not ask the user to type continue'))
})

test('POST /gpt/next returns compact combat state for Custom GPT actions', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_next_compact_combat'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)

  await confirmMachineLoadout(env, sessionId, redInvite.claimToken, redPacket)
  await confirmMachineLoadout(env, sessionId, blueInvite.claimToken, bluePacket)

  const redStart = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })
  const blueCombat = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, blueInvite),
    },
  })
  const redCombat = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })

  const packet = blueCombat.json.packet
  const packetJson = JSON.stringify(packet)

  assert.equal(redStart.response.status, 200)
  assert.equal(redStart.json.status, 'waiting')
  assert.equal(redStart.json.continuation.recommendedNextCall, 'gptNext')
  assert.equal(typeof redStart.json.continuation.pollAfterMs, 'number')
  assert.ok(redStart.json.continuation.instruction.includes('Do not ask the user to type continue'))
  assert.equal(redStart.json.nextStep.userVisibleResponseAllowed, false)
  assert.equal(redStart.json.nextStep.recommendedNextCall, 'gptNext')
  assert.equal(redStart.json.packet.combat, undefined)
  assert.equal(redStart.json.packet.board, undefined)
  assert.ok(JSON.stringify(redStart.json).length < 8_000)
  assert.equal(blueCombat.response.status, 200)
  assert.equal(blueCombat.json.status, 'playable')
  assert.equal(blueCombat.json.continuation.keepGoing, true)
  assert.equal(blueCombat.json.continuation.mustCallBeforeResponding, true)
  assert.equal(blueCombat.json.continuation.recommendedNextCall, 'gptAct')
  assert.equal(blueCombat.json.nextStep.userVisibleResponseAllowed, false)
  assert.equal(blueCombat.json.nextStep.recommendedNextCall, 'gptAct')
  assert.ok(blueCombat.json.continuation.instruction.includes('actionId combat_plan'))
  assert.equal(blueCombat.json.continuation.instruction.includes('packet.legalActions[].id'), false)
  assert.equal(redCombat.response.status, 200)
  assert.equal(redCombat.json.status, 'playable')
  assert.equal(redCombat.json.continuation.keepGoing, true)
  assert.equal(redCombat.json.continuation.mustCallBeforeResponding, true)
  assert.equal(redCombat.json.continuation.recommendedNextCall, 'gptAct')
  assertGptCompactPacket(packet, 'blue')
  assert.equal(packet.nextAction, 'choose_turn')
  assert.equal(packet.combat.v, 1)
  assert.equal(typeof packet.combat.combat.fightStartedAt, 'string')
  assert.equal(typeof packet.combat.combat.fightDeadlineAt, 'string')
  assert.equal(packet.combat.combat.fightSeconds, 300)
  assert.equal(typeof packet.combat.combat.budget.actionTime, 'number')
  assert.equal(Array.isArray(packet.combat.combat.self.cell), true)
  assert.equal(typeof packet.combat.combat.self.hp, 'number')
  assert.equal(typeof packet.combat.combat.opponent.maxHp, 'number')
  assert.equal(Array.isArray(packet.combat.board.grid), true)
  assert.equal(packet.combat.board.grid.length, 4)
  assert.equal(packet.legalActions, undefined)
  assert.equal(packet.board, undefined)
  assert.equal(packet.actionSummary, undefined)
  assert.equal(packetJson.includes('"reachableCells"'), false)
  assert.equal(packetJson.includes('"attackableCells"'), false)
  assert.equal(packetJson.includes('"utilityOptions"'), false)
  assert.equal(packetJson.includes('"reachablePoses"'), false)
  assert.equal(packetJson.includes('"attackableTargets"'), false)
  assert.equal(packetJson.includes('"ascii"'), false)
  assert.equal(packetJson.includes('"cells"'), false)
  assert.ok(packetJson.length < 20_000)
  assert.ok(JSON.stringify(redCombat.json).length < 50_000)

  const submittedPlanResponse = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, blueInvite),
      actionId: 'combat_plan',
      parameters: {
        steps: [
          { kind: 'end_turn' },
        ],
      },
    },
  })

  assert.equal(submittedPlanResponse.response.status, 200)
  assert.equal(submittedPlanResponse.json.acceptedActionId, 'combat_plan')
  assert.equal(submittedPlanResponse.json.submittedSteps, 1)
  assert.ok(JSON.stringify(submittedPlanResponse.json).length < 30_000)
})

test('POST /gpt/act strips exhausted waiting combat responses', async () => {
  const env = createEnv({
    GPT_AUTO_POLL_ATTEMPTS: '10',
    GPT_AUTO_POLL_DELAY_MS: '20',
  })
  const sessionId = 's_gpt_act_auto_poll_combat'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)

  await confirmMachineLoadout(env, sessionId, redInvite.claimToken, redPacket)
  await confirmMachineLoadout(env, sessionId, blueInvite.claimToken, bluePacket)
  await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })
  const blueCombat = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, blueInvite),
    },
  })
  const redCombat = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })

  assert.equal(blueCombat.json.status, 'playable')
  assert.equal(redCombat.json.status, 'playable')

  const blueActionPromise = route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, blueInvite),
      actionId: 'combat_plan',
      parameters: {
        steps: [
          { kind: 'end_turn' },
        ],
      },
    },
  })

  await waitMs(5)

  const redAction = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
      actionId: 'combat_plan',
      parameters: {
        steps: [
          { kind: 'end_turn' },
        ],
      },
    },
  })
  const blueAction = await blueActionPromise

  assert.equal(redAction.response.status, 200)
  assert.equal(blueAction.response.status, 200)
  assert.equal(blueAction.json.acceptedActionId, 'combat_plan')
  assert.equal(blueAction.json.autoPoll.resolved, false)
  assert.equal(blueAction.json.autoPoll.exhausted, true)
  assert.ok(blueAction.json.autoPoll.attempts > 0)
  assert.equal(blueAction.json.status, 'waiting')
  assert.equal(blueAction.json.packet.combat, undefined)
  assert.equal(blueAction.json.packet.nextAction, 'wait_for_opponent_turn')
  assert.equal(blueAction.json.continuation.recommendedNextCall, 'gptNext')
  assert.equal(blueAction.json.continuation.mustCallBeforeResponding, true)
  assert.equal(blueAction.json.nextStep.userVisibleResponseAllowed, false)
  assert.equal(blueAction.json.nextStep.recommendedNextCall, 'gptNext')
  assert.ok(blueAction.json.packet.instruction.includes('Combat decision is not currently open'))
})

test('POST /gpt/act auto-polls through opponent submission to the next playable combat packet', async () => {
  const env = createEnv({
    GPT_AUTO_POLL_ATTEMPTS: '80',
    GPT_AUTO_POLL_DELAY_MS: '25',
  })
  const sessionId = 's_gpt_act_auto_poll_resolved_combat'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)

  await confirmMachineLoadout(env, sessionId, redInvite.claimToken, redPacket)
  await confirmMachineLoadout(env, sessionId, blueInvite.claimToken, bluePacket)
  await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })
  const blueCombat = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, blueInvite),
    },
  })
  const redCombat = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })

  assert.equal(blueCombat.json.status, 'playable')
  assert.equal(redCombat.json.status, 'playable')

  const blueActionPromise = route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, blueInvite),
      actionId: 'combat_plan',
      parameters: {
        steps: [
          { kind: 'end_turn' },
        ],
      },
    },
  })

  await waitMs(5)

  const redAction = await route(env, `/sessions/${sessionId}/combat-plan`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      action: 'submit_combat_plan',
      round: redCombat.json.packet.combat.combat.round,
      decisionVersion: redCombat.json.packet.combat.combat.decisionVersion,
      steps: [
        { kind: 'end_turn' },
      ],
    },
  })
  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')
  const openedAt = new Date(Date.now() - 1000).toISOString()

  stored.combat.openedAt = openedAt
  stored.combat.deadlineAt = new Date(Date.now() + 60_000).toISOString()
  await storage.put('agent-arena-session', stored)

  const blueAction = await blueActionPromise

  assert.equal(redAction.response.status, 200)
  assert.equal(blueAction.response.status, 200)
  assert.equal(blueAction.json.acceptedActionId, 'combat_plan')
  assert.equal(blueAction.json.autoPoll.resolved, true)
  assert.equal(blueAction.json.autoPoll.exhausted, false)
  assert.ok(blueAction.json.autoPoll.attempts > 0)
  assert.equal(blueAction.json.status, 'playable')
  assert.equal(blueAction.json.packet.nextAction, 'choose_turn')
  assert.ok(blueAction.json.packet.decisionVersion > blueCombat.json.packet.decisionVersion)
  assert.equal(blueAction.json.packet.combat.combat.decisionVersion, blueAction.json.packet.decisionVersion)
  assert.equal(blueAction.json.continuation.recommendedNextCall, 'gptAct')
  assert.equal(blueAction.json.continuation.mustCallBeforeResponding, true)
  assert.equal(blueAction.json.nextStep.userVisibleResponseAllowed, false)
  assert.equal(blueAction.json.nextStep.recommendedNextCall, 'gptAct')
})

test('POST /gpt/catalog returns selected compact part summaries', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_catalog'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const partAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const partId = partAction.catalogRefs?.[0]
  const catalog = await route(env, '/gpt/catalog', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
      partIds: [partId, 'Missing_Part'],
    },
  })

  assert.equal(catalog.response.status, 200)
  assert.equal(catalog.json.parts.length, 1)
  assert.equal(catalog.json.parts[0].id, partId)
  assert.equal(typeof catalog.json.parts[0].displayName, 'string')
  assert.equal(typeof catalog.json.parts[0].cost, 'number')
  assert.equal(typeof catalog.json.parts[0].mass, 'number')
  assert.equal(typeof catalog.json.parts[0].durability, 'number')
  assert.ok(Array.isArray(catalog.json.parts[0].tags))
  assert.equal('mounts' in catalog.json.parts[0], false)
  assert.equal('visual' in catalog.json.parts[0], false)
  assert.equal('spec' in catalog.json.parts[0], false)
})

test('POST /gpt/act fills GameMaster version fields from the latest packet', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_act'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const partAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const action = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
      actionId: partAction.id,
      publicMessage: 'Building mobility first.',
    },
  })
  const stale = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
      actionId: partAction.id,
    },
  })

  assert.equal(action.response.status, 200)
  assert.equal(action.json.status, 'playable')
  assert.equal(action.json.acceptedActionId, partAction.id)
  assertGptCompactPacket(action.json.packet, 'red')
  assert.equal(action.json.packet.build.step, 'choose_attach_target')
  assert.equal(action.json.continuation.keepGoing, true)
  assert.equal(action.json.continuation.recommendedNextCall, 'gptAct')
  assert.equal(action.json.publicState, undefined)
  assert.ok(JSON.stringify(action.json).length < 30_000)
  assert.equal(stale.response.status, 409)
  assert.equal(stale.json.error.code, 'SUBMISSION_INVALID')
})

test('POST /gpt/act submits parameterized mount pose payloads', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_act_mount_pose'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const inviteUrl = gptInviteUrl(sessionId, redInvite)
  const partAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const chosePart = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: partAction.id,
    },
  })

  assert.equal(chosePart.response.status, 200)
  assertGptCompactPacket(chosePart.json.packet, 'red')
  assert.equal(chosePart.json.packet.build.step, 'choose_attach_target')

  const afterChoose = await gameMasterStateFor(env, sessionId, redInvite)
  const attachCore = findLegalAction(
    afterChoose,
    (action) => action.kind === 'choose_attach_target' && action.id.includes('.to.core'),
  )
  const attached = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: attachCore.id,
    },
  })

  assert.equal(attached.response.status, 200)
  assertGptCompactPacket(attached.json.packet, 'red')
  assert.equal(attached.json.packet.build.step, 'mount_part')

  const afterAttach = await gameMasterStateFor(env, sessionId, redInvite)
  const poseAction = findLegalAction(afterAttach, (action) => action.kind === 'propose_mount_pose')
  const { selectedPartId, selectedAttachTargetId } = afterAttach.buildState

  assert.equal(typeof selectedPartId, 'string')
  assert.equal(typeof selectedAttachTargetId, 'string')

  const placed = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: poseAction.id,
      parameters: {
        childPartId: selectedPartId,
        parentInstanceId: selectedAttachTargetId,
        mountSurfaceId: 'core_shell',
        u: 0.5,
        v: 0.5,
        yawDegrees: 0,
        rollDegrees: 0,
      },
    },
  })

  assert.equal(placed.response.status, 200)
  assert.equal(placed.json.acceptedActionId, poseAction.id)
  assertGptCompactPacket(placed.json.packet, 'red')
  assert.equal(placed.json.packet.build.step, 'choose_part')
  assert.equal(placed.json.packet.build.bot.parts.length, 2)
})

test('POST /gpt/act uses legal action parameter examples when GPT omits mount pose parameters', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_act_mount_pose_fallback'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const inviteUrl = gptInviteUrl(sessionId, redInvite)
  const partAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const chosePart = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: partAction.id,
    },
  })
  const afterChoose = await gameMasterStateFor(env, sessionId, redInvite)
  const attachCore = findLegalAction(
    afterChoose,
    (action) => action.kind === 'choose_attach_target' && action.id.includes('.to.core'),
  )
  await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: attachCore.id,
    },
  })

  const afterAttach = await gameMasterStateFor(env, sessionId, redInvite)
  const poseAction = findLegalAction(afterAttach, (action) => action.kind === 'propose_mount_pose')
  const placedWithNoParameters = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: poseAction.id,
    },
  })

  assert.equal(placedWithNoParameters.response.status, 200)
  assert.equal(placedWithNoParameters.json.acceptedActionId, poseAction.id)
  assertGptCompactPacket(placedWithNoParameters.json.packet, 'red')
  assert.equal(placedWithNoParameters.json.packet.build.step, 'choose_part')
})

test('POST /gpt/act drives a full compact build flow without action ids', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_act_compact_build'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const inviteUrl = gptInviteUrl(sessionId, redInvite)
  const partAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const partId = partAction.catalogRefs?.[0]
  const part = catalogPartFromPacket(redPacket, partId)
  const both = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: partAction.id,
      action: { kind: 'choose_part', part: `${part.category}.${part.id}` },
    },
  })
  const neither = await route(env, '/gpt/act', {
    method: 'POST',
    body: { inviteUrl },
  })

  assert.equal(both.response.status, 400)
  assert.equal(both.json.error.code, 'SUBMISSION_INVALID')
  assert.equal(neither.response.status, 400)
  assert.equal(neither.json.error.code, 'SUBMISSION_INVALID')

  const chosen = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      action: { kind: 'choose_part', part: `${part.category}.${part.id}` },
      publicMessage: 'Compact build choose.',
    },
  })

  assert.equal(chosen.response.status, 200)
  assert.deepEqual(chosen.json.acceptedAction, { kind: 'choose_part', part: `${part.category}.${part.id}` })
  assertGptCompactPacket(chosen.json.packet, 'red')
  assert.equal(chosen.json.packet.build.step, 'choose_attach_target')
  assert.equal(chosen.json.packet.build.selected.canonicalPartId, partId)
  assert.ok(chosen.json.packet.build.targets.includes('core'))

  const targeted = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      action: { kind: 'choose_attach_target', target: 'core' },
    },
  })

  assert.equal(targeted.response.status, 200)
  assert.equal(targeted.json.packet.build.step, 'mount_part')
  assert.ok(targeted.json.packet.build.mounts.length > 0)

  const [surface, u, v, yaw, roll] = targeted.json.packet.build.mounts[0]
  const placed = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      action: { kind: 'mount_part', surface, u, v, yaw, roll },
    },
  })

  assert.equal(placed.response.status, 200)
  assert.equal(placed.json.packet.build.step, 'choose_part')
  assert.equal(placed.json.packet.build.bot.parts.length, 2)

  const confirmed = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      action: { kind: 'confirm_loadout' },
    },
  })

  assert.equal(confirmed.response.status, 200)
  assert.equal(confirmed.json.packet.nextAction, 'wait_for_opponent_loadout')
})

test('POST /gpt/act rejects unknown GPT mount slot aliases without guessing', async () => {
  const env = createEnv()
  const sessionId = 's_gpt_act_mount_slot_alias_unknown'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const inviteUrl = gptInviteUrl(sessionId, redInvite)
  const partAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const chosePart = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: partAction.id,
    },
  })
  assert.equal(chosePart.response.status, 200)

  const afterChoose = await gameMasterStateFor(env, sessionId, redInvite)
  const attachCore = findLegalAction(
    afterChoose,
    (action) => action.kind === 'choose_attach_target' && action.id.includes('.to.core'),
  )
  await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: attachCore.id,
    },
  })
  const rejected = await route(env, '/gpt/act', {
    method: 'POST',
    body: {
      inviteUrl,
      actionId: 'gpt.loadout.mount.unknown.front_center',
    },
  })

  assert.equal(rejected.response.status, 409)
  assert.equal(rejected.json.error.code, 'SUBMISSION_INVALID')
})

test('loadout action spends gold and sets server-owned draft design', async () => {
  const env = createEnv()
  const sessionId = 's_loadout_builder_mutates_design'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)

  assert.equal(redPacket.resources.remainingGold, 100)
  assert.equal(redPacket.buildState.step, 'choose_part')
  assert.equal(redPacket.buildState.currentDesign.version, 'machine:v1')
  assert.equal(redPacket.buildState.currentDesign.machine.rootInstanceId, 'core')
  assert.equal(redPacket.buildState.currentDesign.machine.parts.length, 1)
  assert.equal(redPacket.buildState.currentDesign.machine.parts[0].instanceId, 'core')
  assert.equal(redPacket.buildState.currentDesign.machine.parts[0].definitionId.startsWith('Body_'), false)
  assert.equal(redPacket.buildState.currentDesign.machine.parts[0].source, 'system_core')
  assert.equal(redPacket.buildState.currentDesign.machine.parts[0].immutable, true)
  assert.equal(redPacket.buildState.legacyDraft.parts.length, 0)
  const firstPartAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const firstPartId = firstPartAction.catalogRefs?.[0]
  const firstPart = catalogPartFromPacket(redPacket, firstPartId)

  assert.equal(typeof firstPartId, 'string')
  assert.equal(redPacket.legalActions.some((action) => action.kind === 'choose_mount'), false)
  assert.equal(redPacket.legalActions.some((action) => action.kind === 'choose_rotation'), false)

  let packet = await placePartFromCatalog(
    env,
    sessionId,
    redInvite.claimToken,
    redPacket,
    firstPartId,
  )

  assert.equal(packet.resources.remainingGold, 100 - firstPart.cost)
  assert.equal(packet.buildState.currentDesign.version, 'machine:v1')
  assert.equal(packet.buildState.currentDesign.machine.rootInstanceId, 'core')
  assert.equal(packet.buildState.currentDesign.machine.parts.length, 2)
  assert.equal(packet.buildState.currentDesign.machine.parts[0].instanceId, 'core')
  assert.equal(packet.buildState.currentDesign.machine.parts[1].definitionId, `catalog:${firstPartId}`)
  assert.deepEqual(
    packet.buildState.currentDesign.machine.attachments.map((attachment) => [
      attachment.parentInstanceId,
      attachment.childInstanceId,
    ]),
    [['core', 'part_1']],
  )
  assert.equal(packet.buildState.legacyDraft.parts.length, 1)
  assert.equal(packet.buildState.legacyDraft.parts[0].partId, firstPartId)
  assert.equal(packet.buildState.legacyDraft.rootInstanceId, 'part_1')
  assert.equal(packet.legalActions.some((action) => action.kind === 'confirm_loadout'), true)
  assert.deepEqual(
    packet.buildState.currentDesign.machine.parts.map((part) => part.definitionId),
    [
      'system:machine-core:v1',
      `catalog:${firstPartId}`,
    ],
  )
  assert.notEqual(findLegalAction(packet, (action) => action.kind === 'confirm_loadout'), undefined)
  assert.equal(JSON.stringify(packet).includes('"payload"'), false)
})

test('mount pose packet exposes compact schema and invalid pose does not mutate route state', async () => {
  const env = createEnv()
  const sessionId = 's_loadout_mount_pose_schema'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const bodyAction = findLegalAction(
    redPacket,
    (action) => action.kind === 'choose_part',
  )
  const selectedPartId = bodyAction.catalogRefs?.[0]
  const selectedPart = catalogPartFromPacket(redPacket, selectedPartId)
  let packet = await submitPacketAction(env, sessionId, redInvite.claimToken, redPacket, bodyAction)
  const attachCore = findLegalAction(
    packet,
    (action) => action.kind === 'choose_attach_target' && action.id.includes('.to.core'),
  )

  packet = await submitPacketAction(env, sessionId, redInvite.claimToken, packet, attachCore)

  const poseAction = findLegalAction(packet, (action) => action.kind === 'propose_mount_pose')
  const schemaKeys = Object.keys(poseAction.parameterSchema.properties).sort()
  const validParameters = defaultMountPoseParameters(poseAction, {
    mountSurfaceId: 'core_shell',
    u: 0.5,
    v: 0.5,
    yawDegrees: 0,
    rollDegrees: 0,
  })
  const { coordinator } = await coordinatorForStoredSession(env, sessionId)
  const invalid = await coordinator.submitGameMasterAction(
    redInvite.claimToken,
    {
      ...actionSubmissionFromPacket(packet, poseAction.id),
      parameters: {
        ...validParameters,
        u: -0.1,
      },
    },
  )
  const afterRejected = await internalGameMasterPacketFor(env, sessionId, redInvite.claimToken)

  assert.deepEqual(schemaKeys, [
    'childPartId',
    'mountSurfaceId',
    'parentInstanceId',
    'rollDegrees',
    'u',
    'v',
    'yawDegrees',
  ])
  assert.deepEqual(poseAction.parameterSchema.required.sort(), schemaKeys)
  assert.equal(poseAction.parameterSchema.properties.parentInstanceId.enum.length, 1)
  assert.equal(poseAction.parameterSchema.properties.childPartId.enum.length, 1)
  assert.equal(poseAction.parameterSchema.properties.mountSurfaceId.enum.includes('core_shell'), true)
  assert.ok(poseAction.requirements.some((requirement) => requirement.includes('mountSurfaceId must be one of')))
  assert.ok(poseAction.requirements.some((requirement) => requirement.includes('u and v must be numbers from 0 through 1')))
  assert.equal(poseAction.parameterSchema.properties.u.enum, undefined)
  assert.equal(poseAction.parameterSchema.properties.v.enum, undefined)
  assert.equal(poseAction.parameterSchema.properties.u.minimum, 0)
  assert.equal(poseAction.parameterSchema.properties.u.maximum, 1)
  assert.equal(poseAction.parameterSchema.properties.v.minimum, 0)
  assert.equal(poseAction.parameterSchema.properties.v.maximum, 1)
  assert.equal(poseAction.parameterSchema.properties.yawDegrees.normalization, 'degrees')
  assert.equal(poseAction.parameterSchema.properties.rollDegrees.normalization, 'degrees')
  const normalizedPose = validateGameMasterActionParameters({
    ...validParameters,
    yawDegrees: 450,
    rollDegrees: -90,
  }, poseAction.parameterSchema)

  assert.equal(normalizedPose.ok, true)
  assert.equal(normalizedPose.parameters.yawDegrees, 90)
  assert.equal(normalizedPose.parameters.rollDegrees, 270)
  assert.equal(JSON.stringify(poseAction.parameterSchema).includes('selectedAttachCell'), false)
  assert.equal(JSON.stringify(poseAction.parameterSchema).includes('selectedMountSector'), false)
  assert.equal(invalid.ok, false)
  assert.equal(invalid.error.code, 'SUBMISSION_INVALID')
  assert.ok(invalid.error.issues.some((issue) => issue.code === 'PARAMETER_OUT_OF_RANGE'))
  assert.ok(invalid.error.issues.some((issue) => issue.message.includes('between 0 and 1')))
  assert.equal(afterRejected.resources.remainingGold, packet.resources.remainingGold)
  assert.deepEqual(afterRejected.buildState.currentDesign, packet.buildState.currentDesign)
  assert.equal(afterRejected.buildState.step, 'propose_mount_pose')

  const valid = await submitPacketAction(env, sessionId, redInvite.claimToken, packet, poseAction, validParameters)

  assert.equal(valid.resources.remainingGold, 100 - selectedPart.cost)
  assert.equal(valid.buildState.currentDesign.machine.parts.length, 2)
  assert.deepEqual(
    valid.buildState.currentDesign.machine.attachments.map((attachment) => [
      attachment.parentInstanceId,
      attachment.childInstanceId,
      attachment.mountId,
    ]),
    [['core', 'part_1', 'core_shell']],
  )

  let collisionPacket = valid
  const secondPartAction = findLegalAction(
    collisionPacket,
    (action) => action.kind === 'choose_part' && action.catalogRefs?.includes(selectedPartId),
  )

  collisionPacket = await submitPacketAction(env, sessionId, redInvite.claimToken, collisionPacket, secondPartAction)
  collisionPacket = await submitPacketAction(
    env,
    sessionId,
    redInvite.claimToken,
    collisionPacket,
    findLegalAction(collisionPacket, (action) => action.kind === 'choose_attach_target' && action.id.includes('.to.core')),
  )

  const collisionPoseAction = findLegalAction(collisionPacket, (action) => action.kind === 'propose_mount_pose')
  const { coordinator: collisionCoordinator } = await coordinatorForStoredSession(env, sessionId)
  const collision = await collisionCoordinator.submitGameMasterAction(
    redInvite.claimToken,
    {
      ...actionSubmissionFromPacket(collisionPacket, collisionPoseAction.id),
      parameters: defaultMountPoseParameters(collisionPoseAction, {
        mountSurfaceId: 'core_shell',
        u: 0.5,
        v: 0.5,
        yawDegrees: 0,
        rollDegrees: 0,
      }),
    },
  )
  const afterCollision = await internalGameMasterPacketFor(env, sessionId, redInvite.claimToken)

  assert.equal(collision.ok, false)
  assert.equal(collision.error.code, 'SUBMISSION_INVALID')
  assert.ok(collision.error.issues.some((issue) => issue.code === 'HARD_PART_COLLISION'))
  assert.equal(afterCollision.resources.remainingGold, collisionPacket.resources.remainingGold)
  assert.deepEqual(afterCollision.buildState.currentDesign, collisionPacket.buildState.currentDesign)
})

test('machine confirm loadout uses tree validity instead of legacy minimum viable rules', async () => {
  const env = createEnv()
  const sessionId = 's_loadout_confirm_uses_machine_tree'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const confirmAction = findLegalAction(redPacket, (action) => action.kind === 'confirm_loadout')
  const confirmed = await submitPacketAction(
    env,
    sessionId,
    redInvite.claimToken,
    redPacket,
    confirmAction,
  )

  assert.equal(confirmed.phase, 'choose_loadout')
  assert.equal(confirmed.nextAction, 'wait_for_opponent_loadout')
})

test('POST /sessions/:id/action rejects invalid action ids and stale action-set versions', async () => {
  const env = createEnv()
  const sessionId = 's_action_rejects_invalid'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const invalidAction = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: actionSubmissionFromPacket(redPacket, 'loadout.red.r1.forged'),
  })
  const wrongActionSet = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      ...actionSubmissionFromPacket(redPacket),
      actionSetId: 'red:r1:loadout:v0',
    },
  })
  const staleDecision = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      ...actionSubmissionFromPacket(redPacket),
      decisionVersion: redPacket.decisionVersion + 1,
    },
  })

  assert.equal(invalidAction.response.status, 400)
  assert.equal(invalidAction.json.error.code, 'SUBMISSION_INVALID')
  assert.equal(wrongActionSet.response.status, 400)
  assert.equal(wrongActionSet.json.error.code, 'SUBMISSION_INVALID')
  assert.equal(staleDecision.response.status, 400)
  assert.equal(staleDecision.json.error.code, 'SUBMISSION_INVALID')
})

test('POST /sessions/:id/action rejects forged gameplay payload fields', async () => {
  const env = createEnv()
  const sessionId = 's_action_rejects_forged_payload'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const forged = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      ...actionSubmissionFromPacket(redPacket),
      payload: {
        purchases: validSpinnerSubmission.purchases,
        blueprint: validSpinnerSubmission.blueprint,
      },
    },
  })

  assert.equal(forged.response.status, 400)
  assert.equal(forged.json.error.code, 'SUBMISSION_INVALID')
})

test('POST /sessions/:id/action rejects legacy loadout locking submissions', async () => {
  const env = createEnv()
  const sessionId = 's_action_idempotent'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const { packet, confirmAction } = await buildConfirmableMachineLoadout(
    env,
    sessionId,
    redInvite.claimToken,
    redPacket,
  )
  const body = actionSubmissionFromPacket(packet, confirmAction.id)
  const first = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body,
  })
  const duplicate = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body,
  })
  const changed = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      ...body,
      actionId: findLegalAction(packet, (action) => action.kind === 'choose_part').id,
    },
  })

  assert.equal(first.response.status, 400)
  assert.equal(first.json.error.code, 'SUBMISSION_INVALID')
  assert.equal(duplicate.response.status, 400)
  assert.equal(changed.response.status, 400)
})

test('red action submission does not stale blue action-set decision version', async () => {
  const env = createEnv()
  const sessionId = 's_action_red_first_blue_stable'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)
  const redSubmission = await submitPacketAction(
    env,
    sessionId,
    redInvite.claimToken,
    redPacket,
    findLegalAction(redPacket, (action) => action.kind === 'confirm_loadout'),
  )
  const blueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const blueSubmission = await submitPacketAction(
    env,
    sessionId,
    blueInvite.claimToken,
    bluePacket,
    findLegalAction(bluePacket, (action) => action.kind === 'confirm_loadout'),
  )

  assert.equal(redSubmission.nextAction, 'wait_for_opponent_loadout')
  assert.equal(blueState.response.status, 200)
  assert.equal(blueState.json.agentPacket.decisionVersion, bluePacket.decisionVersion)
  assert.ok(blueState.json.agentPacket.eventVersion > bluePacket.eventVersion)
  assert.equal(blueSubmission.phase, 'combat_turn')
})

test('combat uses /combat-plan and prunes legacy canonical /action combat', async () => {
  const env = createEnv()
  const sessionId = 's_combat_plan_route_only'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)

  const redAfterConfirm = await confirmMachineLoadout(
    env,
    sessionId,
    redInvite.claimToken,
    redPacket,
  )
  const redReadyPublic = await route(env, `/sessions/${sessionId}/public`)
  const blueAfterConfirm = await confirmMachineLoadout(
    env,
    sessionId,
    blueInvite.claimToken,
    bluePacket,
  )
  const stagedPublic = await route(env, `/sessions/${sessionId}/public`)
  const redFirstCombatState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const blueCombatState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const redCombatState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const redFirstCombatPacket = redFirstCombatState.json.agentPacket
  const redCombatPacket = await internalGameMasterPacketFor(env, sessionId, redInvite.claimToken)
  const blueCombatPacket = await internalGameMasterPacketFor(env, sessionId, blueInvite.claimToken)

  assert.equal(redAfterConfirm.nextAction, 'wait_for_opponent_loadout')
  assert.equal(redReadyPublic.response.status, 200)
  assert.deepEqual(
    redReadyPublic.json.eventLog.filter((event) => event.type === 'loadout_ready').map((event) => event.message),
    ['red loadout ready for combat.'],
  )
  assert.equal(blueAfterConfirm.phase, 'combat_turn')
  assert.equal(stagedPublic.response.status, 200)
  assert.deepEqual(
    stagedPublic.json.eventLog.filter((event) => event.type === 'loadout_ready').map((event) => event.message),
    ['red loadout ready for combat.', 'blue loadout ready for combat.'],
  )
  assert.equal(
    stagedPublic.json.eventLog.some((event) => event.type === 'combat_start_staged'),
    true,
  )
  assert.equal(
    stagedPublic.json.eventLog.some((event) => event.type === 'combat_started'),
    false,
  )
  assert.equal(redFirstCombatState.response.status, 200)
  assert.equal(redCombatState.response.status, 200)
  assert.equal(blueCombatState.response.status, 200)
  assertAgentConnectionPacket(redFirstCombatPacket, 'red')
  assertGameMasterPacket(redCombatPacket, 'red')
  assertGameMasterPacket(blueCombatPacket, 'blue')
  assert.equal(redFirstCombatPacket.phase, 'combat_turn')
  assert.equal(redFirstCombatPacket.nextAction, 'wait_for_opponent_turn')
  assert.equal(redFirstCombatPacket.legalActions, undefined)
  assert.equal(redFirstCombatPacket.submit, undefined)
  assert.equal(
    blueCombatState.json.eventLog.some((event) => event.type === 'combat_started'),
    true,
  )

  for (const packet of [redCombatPacket, blueCombatPacket]) {
    assert.equal(packet.phase, 'combat_turn')
    assert.equal(packet.nextAction, 'choose_turn')
    assert.equal(packet.turnId, 'turn_1')
    assert.notEqual(packet.combat, undefined)
    assert.equal(packet.submit.path, `/sessions/${sessionId}/combat-plan`)
    assert.equal(packet.submit.body.action, 'submit_combat_round_plan')
    assert.equal(packet.submit.body.round, packet.combat.round)
    assert.equal(packet.submit.body.decisionVersion, packet.combat.decisionVersion)
    assert.equal(typeof packet.combat.fightStartedAt, 'string')
    assert.equal(typeof packet.combat.fightDeadlineAt, 'string')
    assert.equal(packet.combat.fightSeconds, 300)
    assert.equal(packet.visibleState.turn, 1)
    assert.equal(packet.legalActions.every((action) => action.kind === 'surrender'), true)
    assert.equal(packet.legalActions.some((action) => action.kind === 'hold'), false)
    assert.equal(packet.legalActions.some((action) => action.kind === 'move'), false)
    assert.equal(packet.legalActions.some((action) => action.kind === 'attack'), false)
    assert.equal(JSON.stringify(packet.legalActions).includes('command'), false)
    assert.equal(packet.board.grid.cellSize, 1)
    assert.ok(packet.board.reachableCells.length > 0)
    assert.equal(JSON.stringify(packet.board).includes('"payload"'), false)
    assert.equal(JSON.stringify(packet.board).includes('"command"'), false)
  }

  const legacyBridge = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: combatPlanSubmissionFromPacket(redCombatPacket),
  })

  assert.equal(legacyBridge.response.status, 400)
  assert.equal(legacyBridge.json.error.code, 'SUBMISSION_INVALID')

  const redSubmission = await submitCombatPlanFromPacket(
    env,
    sessionId,
    redInvite.claimToken,
    redCombatPacket,
  )
  const blueAfterRed = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })

  assert.equal(redSubmission.response.status, 200)
  assert.equal(redSubmission.json.packet.nextAction, 'wait_for_opponent_turn')
  assert.equal(blueAfterRed.response.status, 200)
  assert.equal(blueAfterRed.json.agentPacket.decisionVersion, blueCombatPacket.decisionVersion)
  assert.equal(blueAfterRed.json.agentPacket.nextAction, 'choose_turn')

  const blueSubmission = await submitCombatPlanFromPacket(
    env,
    sessionId,
    blueInvite.claimToken,
    blueCombatPacket,
  )
  const redNextTurn = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

  assert.equal(blueSubmission.response.status, 200)
  assert.equal(blueSubmission.json.publicState.phase, 'combat_turn')
  assert.equal(blueSubmission.json.publicState.combat.tick, 2)
  assert.equal(blueSubmission.json.publicState.replayAvailable, false)
  assert.equal(blueSubmission.json.publicState.replayStatus, 'live_partial')
  assert.equal(blueSubmission.json.publicState.combat.fightDeadlineAt, blueCombatPacket.combat.fightDeadlineAt)
  assert.equal(redNextTurn.response.status, 200)
  assert.equal(redNextTurn.json.agentPacket.phase, 'combat_turn')
  assert.equal(redNextTurn.json.agentPacket.nextAction, 'wait_for_opponent_turn')

  const liveReplay = await route(env, `/sessions/${sessionId}/replay`)
  assert.equal(liveReplay.response.status, 404)
  assert.equal(liveReplay.json.error.code, 'REPLAY_NOT_AVAILABLE')
})

test('legacy mixed combat and replay state is sanitized before route projection', async () => {
  const sourceEnv = createEnv()
  const sessionId = 's_legacy_mixed_replay_route'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(sourceEnv, sessionId)

  await confirmMachineLoadout(sourceEnv, sessionId, redInvite.claimToken, redPacket)
  await confirmMachineLoadout(sourceEnv, sessionId, blueInvite.claimToken, bluePacket)

  const sourceStorage = sourceEnv.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await sourceStorage.get('agent-arena-session')

  assert.notEqual(stored.combat, undefined)

  stored.replay = completedReplayPayload()

  const reloadedEnv = createEnv()
  const reloadedStorage = reloadedEnv.AGENT_ARENA_SESSION.storageFor(sessionId)

  await reloadedStorage.put('agent-arena-session', stored)

  const publicPoll = await route(reloadedEnv, `/sessions/${sessionId}/public`)
  const replay = await route(reloadedEnv, `/sessions/${sessionId}/replay`)
  const sanitized = await reloadedStorage.get('agent-arena-session')

  assert.equal(publicPoll.response.status, 200)
  assert.equal(publicPoll.json.phase, 'combat_turn')
  assert.equal(publicPoll.json.replayStatus, 'live_partial')
  assert.equal(publicPoll.json.replayAvailable, false)
  assert.equal(publicPoll.json.replayVersion, undefined)
  assert.equal(replay.response.status, 404)
  assert.equal(replay.json.error.code, 'REPLAY_NOT_AVAILABLE')
  assert.equal(sanitized.replay, undefined)
  assert.notEqual(sanitized.combat, undefined)
})

test('public poll resolves combat when fight wall-clock deadline has passed', async () => {
  const env = createEnv()
  const sessionId = 's_fight_wall_clock_cutoff_route'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)

  await confirmMachineLoadout(env, sessionId, redInvite.claimToken, redPacket)
  await confirmMachineLoadout(env, sessionId, blueInvite.claimToken, bluePacket)
  await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const blueCombatState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const preExpiryReplay = await route(env, `/sessions/${sessionId}/replay`)
  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')

  stored.combat.fightStartedAt = '2026-06-03T00:00:00.000Z'
  stored.combat.fightDeadlineAt = '2026-06-03T00:00:01.000Z'
  stored.combat.fightSeconds = 300
  await storage.put('agent-arena-session', stored)

  const publicPoll = await route(env, `/sessions/${sessionId}/public`)
  const resolved = await storage.get('agent-arena-session')

  const finalReplay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(blueCombatState.response.status, 200)
  assert.equal(preExpiryReplay.response.status, 404)
  assert.equal(preExpiryReplay.json.error.code, 'REPLAY_NOT_AVAILABLE')
  assert.equal(typeof blueCombatState.json.combat.fightDeadlineAt, 'string')
  assert.equal(publicPoll.response.status, 200)
  assert.equal(publicPoll.json.phase, 'round_review')
  assert.equal(publicPoll.json.replayAvailable, true)
  assert.equal(publicPoll.json.replayStatus, 'resolved')
  assert.equal(publicPoll.json.lastResult.reason.includes('Fight wall-clock expired'), true)
  assert.equal(finalReplay.response.status, 200)
  assert.equal(finalReplay.json.round, 1)
  assert.equal(resolved.combat, undefined)
  assert.equal(resolved.fightDossier.fights.at(-1).fightId, 'fight_1')
})

test('POST /sessions/:id/reflection accepts only private post-fight reflections after completed fight', async () => {
  const env = createEnv()
  const sessionId = 's_reflection_route'
  const { redInvite, blueInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const earlyReflection = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('red', redPacket.decisionVersion),
  })

  assert.equal(earlyReflection.response.status, 409)
  assert.equal(earlyReflection.json.error.code, 'PHASE_CLOSED')

  await storeCompletedFight(env, sessionId)

  const redState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const mismatch = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('blue', redState.json.agentPacket.decisionVersion),
  })
  const submitted = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('red', redState.json.agentPacket.decisionVersion),
  })
  const redWaitingGpt = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })
  const duplicate = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('red', redState.json.agentPacket.decisionVersion),
  })
  const blueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const publicState = await route(env, `/sessions/${sessionId}/public`)
  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')
  const blueSubmitted = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: routePostFightReflection('blue', blueState.json.agentPacket.decisionVersion),
  })
  const redDebriefGpt = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })
  const consumed = await storage.get('agent-arena-session')
  const publicAfterDebriefGpt = await route(env, `/sessions/${sessionId}/public`)
  const redNext = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const blueNext = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })

  assert.equal(redState.response.status, 200)
  assert.equal(redState.json.agentPacket.fightId, 'fight_1')
  assert.equal(redState.json.agentPacket.nextAction, 'submit_reflection')
  assert.deepEqual(redState.json.agentPacket.review.reflection, {
    required: true,
    submitted: false,
    opponentSubmitted: false,
  })
  assert.deepEqual(redState.json.agentPacket.review.debrief, { available: false })
  assert.equal(mismatch.response.status, 403)
  assert.equal(mismatch.json.error.code, 'FORBIDDEN')
  assert.equal(submitted.response.status, 200)
  assert.equal(submitted.json.packet.nextAction, 'wait_for_debrief')
  assert.deepEqual(submitted.json.packet.review.reflection, {
    required: false,
    submitted: true,
    opponentSubmitted: false,
  })
  assert.deepEqual(submitted.json.packet.review.debrief, { available: false })
  assert.equal(redWaitingGpt.response.status, 200)
  assert.equal(redWaitingGpt.json.packet.nextAction, 'wait_for_debrief')
  assert.deepEqual(redWaitingGpt.json.packet.review.reflection, {
    required: false,
    submitted: true,
    opponentSubmitted: false,
  })
  assert.deepEqual(redWaitingGpt.json.packet.review.debrief, { available: false })
  assert.match(redWaitingGpt.json.continuation.instruction, /opponent reflection/)
  assert.equal(duplicate.response.status, 409)
  assert.equal(duplicate.json.error.code, 'ALREADY_SUBMITTED')
  assert.equal(stored.reflections[0].status, 'private_pending')
  assert.equal(stored.sharedDebrief, undefined)
  assert.deepEqual(blueState.json.agentPacket.review.reflection, {
    required: true,
    submitted: false,
    opponentSubmitted: true,
  })
  assert.equal(JSON.stringify(blueState.json).includes('secret weak drive note'), false)
  assert.equal(JSON.stringify(publicState.json).includes('secret weak drive note'), false)
  assert.equal(blueSubmitted.response.status, 200)
  assert.equal(blueSubmitted.json.packet.review.debrief.available, true)
  assert.equal(consumed.reflections.every((entry) => entry.status === 'consumed_into_shared_debrief'), true)
  assert.equal(redDebriefGpt.response.status, 200)
  assert.equal(redDebriefGpt.json.advancedRound, undefined)
  assert.equal(redDebriefGpt.json.status, 'playable')
  assert.equal(redDebriefGpt.json.packet.phase, 'round_review')
  assert.equal(redDebriefGpt.json.packet.nextAction, 'wait_for_debrief')
  assert.deepEqual(redDebriefGpt.json.packet.sharedDebrief, consumed.sharedDebrief)
  assert.equal(redDebriefGpt.json.continuation.keepGoing, false)
  assert.equal(redDebriefGpt.json.nextStep.userVisibleResponseAllowed, true)
  assert.equal(consumed.phase, 'round_review')
  assert.equal(publicAfterDebriefGpt.json.replayAvailable, true)
  assert.equal(publicAfterDebriefGpt.json.replayStatus, 'resolved')
  assert.ok(consumed.replay)
  assert.equal(consumed.reflections[0].status, 'consumed_into_shared_debrief')
  assert.equal(consumed.reflections[0].debriefId, consumed.sharedDebrief.debriefId)
  assert.equal(JSON.stringify(consumed.sharedDebrief).includes('secret weak drive note'), false)
  assert.deepEqual(redNext.json.agentPacket.sharedDebrief, blueNext.json.agentPacket.sharedDebrief)
  assert.equal(JSON.stringify(redNext.json.agentPacket.sharedDebrief).includes('secret weak drive note'), false)
})

test('round 2 reflection and debrief are scoped to the latest fight', async () => {
  const env = createEnv()
  const sessionId = 's_reflection_route_round_2'
  const { redInvite, blueInvite } = await bootstrapReadySession(env, sessionId)

  await storeCompletedFight(env, sessionId)

  const redFight1 = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const blueFight1 = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })

  await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('red', redFight1.json.agentPacket.decisionVersion),
  })
  await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: routePostFightReflection('blue', blueFight1.json.agentPacket.decisionVersion),
  })

  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')
  const fight1DebriefId = stored.sharedDebrief.debriefId

  stored.phase = 'round_review'
  stored.round = 2
  stored.lastResult = {
    winner: 'blue',
    reason: 'Blue disabled Red in fight 2.',
    damage: { red: 40, blue: 0 },
    remainingHealth: { red: 0, blue: 40 },
  }
  stored.replay = completedReplayPayload()
  stored.fightDossier = {
    ...stored.fightDossier,
    fights: [
      ...stored.fightDossier.fights,
      completedFightEntry(sessionId, 'fight_2', {
        winner: 'blue',
        reason: 'Blue disabled Red in fight 2.',
      }),
    ],
  }
  await storage.put('agent-arena-session', stored)

  const redFight2 = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const blueFight2 = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })

  assert.equal(redFight2.response.status, 200)
  assert.equal(blueFight2.response.status, 200)
  assert.equal(redFight2.json.agentPacket.fightId, 'fight_2')
  assert.equal(blueFight2.json.agentPacket.fightId, 'fight_2')
  assert.equal(redFight2.json.agentPacket.nextAction, 'submit_reflection')
  assert.equal(blueFight2.json.agentPacket.nextAction, 'submit_reflection')
  assert.equal(redFight2.json.agentPacket.review.fightId, 'fight_2')
  assert.deepEqual(redFight2.json.agentPacket.review.reflection, {
    required: true,
    submitted: false,
    opponentSubmitted: false,
  })
  assert.deepEqual(redFight2.json.agentPacket.review.debrief, { available: false })

  const redRound2Reflection = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('red', redFight2.json.agentPacket.decisionVersion, {
      fightId: 'fight_2',
    }),
  })
  const redRound2Gpt = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })
  const blueAfterRedRound2 = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const blueRound2Reflection = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: routePostFightReflection('blue', blueAfterRedRound2.json.agentPacket.decisionVersion, {
      fightId: 'fight_2',
    }),
  })
  const redRound2DebriefGpt = await route(env, '/gpt/next', {
    method: 'POST',
    body: {
      inviteUrl: gptInviteUrl(sessionId, redInvite),
    },
  })
  const afterRound2 = await storage.get('agent-arena-session')

  assert.equal(redRound2Reflection.response.status, 200)
  assert.equal(redRound2Reflection.json.packet.nextAction, 'wait_for_debrief')
  assert.match(redRound2Gpt.json.continuation.instruction, /opponent reflection/)
  assert.deepEqual(blueAfterRedRound2.json.agentPacket.review.reflection, {
    required: true,
    submitted: false,
    opponentSubmitted: true,
  })
  assert.equal(blueRound2Reflection.response.status, 200)
  assert.equal(blueRound2Reflection.json.packet.review.fightId, 'fight_2')
  assert.equal(blueRound2Reflection.json.packet.review.debrief.available, true)
  assert.notEqual(afterRound2.sharedDebrief.debriefId, fight1DebriefId)
  assert.equal(afterRound2.sharedDebrief.fightIds.includes('fight_2'), true)
  assert.equal(
    afterRound2.reflections
      .filter((entry) => entry.reflection.fightId === 'fight_2')
      .every((entry) => entry.status === 'consumed_into_shared_debrief'),
    true,
  )
  assert.equal(redRound2DebriefGpt.json.advancedRound, undefined)
  assert.equal(redRound2DebriefGpt.json.status, 'playable')
  assert.equal(redRound2DebriefGpt.json.packet.phase, 'round_review')
  assert.equal(redRound2DebriefGpt.json.packet.nextAction, 'wait_for_debrief')
  assert.deepEqual(redRound2DebriefGpt.json.packet.sharedDebrief, afterRound2.sharedDebrief)
  assert.equal(redRound2DebriefGpt.json.continuation.keepGoing, false)
  assert.equal(redRound2DebriefGpt.json.nextStep.userVisibleResponseAllowed, true)
  assert.ok(afterRound2.replay)
})

test('POST /sessions/:id/reflection rejects late reflection after shared debrief exists', async () => {
  const env = createEnv()
  const sessionId = 's_reflection_route_after_debrief'
  const { redInvite } = await bootstrapReadySession(env, sessionId)

  await storeCompletedFight(env, sessionId)

  const redState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')
  const sharedDebrief = buildSharedDebrief({
    sourceSessionId: sessionId,
    dossier: stored.fightDossier,
    reflections: [],
  })
  stored.sharedDebrief = sharedDebrief
  await storage.put('agent-arena-session', stored)

  const lateReflection = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('red', redState.json.agentPacket.decisionVersion),
  })
  const afterLateReflection = await storage.get('agent-arena-session')

  assert.equal(redState.response.status, 200)
  assert.equal(lateReflection.response.status, 409)
  assert.equal(lateReflection.json.error.code, 'PHASE_CLOSED')
  assert.equal(
    (afterLateReflection.reflections ?? []).some((entry) => entry.status === 'private_pending'),
    false,
  )
  assert.deepEqual(afterLateReflection.sharedDebrief, sharedDebrief)
})

test('POST /sessions/:id/save, /continue, and /quit are deferred outside Slice 6', async () => {
  const env = createEnv()
  const sessionId = 's_slice_7_deferred'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })

  assert.equal(created.response.status, 201)

  for (const action of ['save', 'continue', 'quit']) {
    const result = await route(env, `/sessions/${sessionId}/${action}`, {
      method: 'POST',
      token: created.json.refereeToken,
      body: {},
    })

    assert.equal(result.response.status, 404)
    assert.equal(result.json.error.code, 'INVALID_ACTION')
  }
})

test('POST /sessions/:id/chat stores public role-authored chat', async () => {
  const env = createEnv()
  const sessionId = 's_chat_route'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = inviteFor(created.json.invites, 'red')
  const blueInvite = inviteFor(created.json.invites, 'blue')

  await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: bootstrapBody('red', 'Red Talker'),
  })
  await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: bootstrapBody('blue'),
  })

  const chat = await route(env, `/sessions/${sessionId}/chat`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      kind: 'taunt',
      message: 'Bring something that can turn.',
    },
  })

  assert.equal(chat.response.status, 200)
  assert.equal(chat.json.message.role, 'red')
  assert.equal(chat.json.message.agentName, 'Red Talker')
  assert.equal(chat.json.message.kind, 'taunt')
  assert.equal(chat.json.publicState.chatLog.length, 1)
  assert.equal(chat.json.state.chatLog[0].message, 'Bring something that can turn.')
  assert.equal(
    chat.json.state.eventLog.some((event) => event.message.includes('Bring something that can turn.')),
    false,
  )

  const publicState = await route(env, `/sessions/${sessionId}/public`)
  const blueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })

  assert.equal(publicState.json.chatLog[0].message, 'Bring something that can turn.')
  assert.equal(blueState.response.status, 200)
  assert.equal(blueState.json.chatLog[0].role, 'red')
  assert.equal(blueState.json.chatLog[0].message, 'Bring something that can turn.')
  assert.equal(
    blueState.json.eventLog.some((event) => event.message.includes('Bring something that can turn.')),
    false,
  )
  assertRedactedPublicState(publicState.json, [
    redInvite.claimToken,
    blueInvite.claimToken,
  ])
})

test('POST /sessions/:id/private-chat stores bearer-scoped notes only in private role state', async () => {
  const env = createEnv()
  const sessionId = 's_private_chat_route'
  const create = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = create.json.invites.find((invite) => invite.role === 'red')
  const blueInvite = create.json.invites.find((invite) => invite.role === 'blue')
  const noteText = 'Private flank plan: keep distance until blue commits drive.'

  await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: bootstrapBody('red', 'Red Private'),
  })
  await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: bootstrapBody('blue', 'Blue Private'),
  })

  const note = await route(env, `/sessions/${sessionId}/private-chat`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      kind: 'strategy',
      message: noteText,
    },
  })
  const redState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const blueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const publicState = await route(env, `/sessions/${sessionId}/public`)

  assert.equal(note.response.status, 200)
  assert.equal(note.json.message.role, 'red')
  assert.equal(note.json.message.agentName, 'Red Private')
  assert.equal(note.json.state.privateChatLog[0].message, noteText)
  assert.equal(redState.json.privateChatLog[0].message, noteText)
  assert.equal(blueState.json.privateChatLog.length, 0)
  assert.equal(JSON.stringify(publicState.json).includes(noteText), false)
  assert.equal(JSON.stringify(blueState.json).includes(noteText), false)
})

test('POST /sessions rejects oversized JSON bodies before validation', async () => {
  const env = createEnv()
  const oversized = await route(env, '/sessions', {
    method: 'POST',
    body: {
      sessionId: 's_oversized_body',
      seed: 'x'.repeat(70_000),
    },
  })

  assert.equal(oversized.response.status, 413)
  assert.equal(oversized.json.error.code, 'INVALID_REQUEST')
})

test('worker rejects invalid session ids before Durable Object routing', async () => {
  const env = createEnv()
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId: 'not valid' },
  })
  const routed = await route(env, '/sessions/not%20valid/public')
  const malformedEncoded = await route(env, '/sessions/%E0%A4%A/public')

  assert.equal(created.response.status, 400)
  assert.equal(created.json.error.code, 'INVALID_REQUEST')
  assert.equal(routed.response.status, 400)
  assert.equal(routed.json.error.code, 'INVALID_REQUEST')
  assert.equal(malformedEncoded.response.status, 400)
  assert.equal(malformedEncoded.json.error.code, 'INVALID_REQUEST')
})

test('worker validates create-session payload shape before Durable Object routing', async () => {
  const env = createEnv()
  const invalidTtl = await route(env, '/sessions', {
    method: 'POST',
    body: {
      sessionId: 's_invalid_ttl',
      ttlSeconds: '3600',
    },
  })
  const invalidArena = await route(env, '/sessions', {
    method: 'POST',
    body: {
      sessionId: 's_invalid_arena',
      arena: {
        name: 'Bad Arena',
        width: 24,
        height: -1,
        activeHazards: ['floor_saw'],
      },
    },
  })
  const invalidTopology = await route(env, '/sessions', {
    method: 'POST',
    body: {
      sessionId: 's_invalid_topology',
      arena: {
        name: 'Bad Topology',
        width: 24,
        height: 16,
        activeHazards: ['floor_saw'],
        topology: {
          grid: { cellSize: 1 },
          spawnZones: [],
          hazards: [{ id: 'bad', type: 'pit', shape: { kind: 'circle', center: [0, 0] } }],
          terrain: [],
          obstacles: [],
        },
      },
    },
  })

  assert.equal(invalidTtl.response.status, 400)
  assert.equal(invalidTtl.json.error.code, 'INVALID_REQUEST')
  assert.ok(
    invalidTtl.json.error.issues.some((issue) => issue.code === 'INVALID_TTL'),
  )
  assert.equal(invalidArena.response.status, 400)
  assert.equal(invalidArena.json.error.code, 'INVALID_REQUEST')
  assert.ok(
    invalidArena.json.error.issues.some((issue) => issue.code === 'INVALID_ARENA_SIZE'),
  )
  assert.equal(invalidTopology.response.status, 400)
  assert.equal(invalidTopology.json.error.code, 'INVALID_REQUEST')
  assert.ok(
    invalidTopology.json.error.issues.some((issue) => issue.code === 'INVALID_ARENA_SHAPE'),
  )
})

test('worker routes session traffic through the Durable Object relay boundary', async () => {
  const env = createEnv()
  const sessionId = 's_route_integration'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId, seed: 'route-seed' },
  })

  assert.equal(created.response.status, 201)
  assert.equal(created.json.sessionId, sessionId)
  assert.equal(created.json.publicState.phase, 'waiting_for_agents')
  assert.equal(typeof created.json.publicState.stateVersion, 'string')
  assert.equal(typeof created.json.refereeToken, 'string')

  const duplicate = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId, seed: 'route-seed' },
  })

  assert.equal(duplicate.response.status, 409)
  assert.equal(duplicate.json.error.code, 'SESSION_EXISTS')

  const redInvite = inviteFor(created.json.invites, 'red')
  const blueInvite = inviteFor(created.json.invites, 'blue')
  const refereeToken = created.json.refereeToken
  const malformedClaim = await route(env, `/sessions/${sessionId}/claim`, {
    method: 'POST',
    body: {
      role: 'red',
      claimToken: redInvite.claimToken,
      agentName: 42,
    },
  })

  assert.equal(malformedClaim.response.status, 400)
  assert.equal(malformedClaim.json.error.code, 'INVALID_REQUEST')
  assert.ok(
    malformedClaim.json.error.issues.some((issue) => issue.code === 'INVALID_AGENT_NAME'),
  )

  const initialRedClaim = await route(env, `/sessions/${sessionId}/claim`, {
    method: 'POST',
    body: {
      role: 'red',
      claimToken: redInvite.claimToken,
      agentName: 'Red Bot',
      teamIdentity: testTeamIdentity('red'),
    },
  })

  assert.equal(initialRedClaim.response.status, 201)
  assert.equal(initialRedClaim.json.role, 'red')
  assert.equal(initialRedClaim.json.state.phase, 'waiting_for_agents')

  const invalidReset = await route(env, `/sessions/${sessionId}/reset-role`, {
    method: 'POST',
    token: initialRedClaim.json.roleToken,
    body: { role: 'red' },
  })

  assert.equal(invalidReset.response.status, 401)
  assert.equal(invalidReset.json.error.code, 'INVALID_TOKEN')

  const resetRed = await route(env, `/sessions/${sessionId}/reset-role`, {
    method: 'POST',
    token: refereeToken,
    body: { role: 'red' },
  })

  assert.equal(resetRed.response.status, 200)
  assert.equal(resetRed.json.invite.role, 'red')
  assert.notEqual(resetRed.json.invite.claimToken, redInvite.claimToken)
  assert.equal(resetRed.json.publicState.roles.red.claimed, false)
  assert.equal(resetRed.json.publicState.roles.red.submitted, false)

  const staleRedState = await route(env, `/sessions/${sessionId}/state`, {
    token: initialRedClaim.json.roleToken,
  })
  const staleRedClaim = await route(env, `/sessions/${sessionId}/claim`, {
    method: 'POST',
    body: {
      role: 'red',
      claimToken: redInvite.claimToken,
    },
  })

  assert.equal(staleRedState.response.status, 401)
  assert.equal(staleRedState.json.error.code, 'INVALID_TOKEN')
  assert.equal(staleRedClaim.response.status, 401)
  assert.equal(staleRedClaim.json.error.code, 'INVALID_TOKEN')

  const redClaim = await route(env, `/sessions/${sessionId}/claim`, {
    method: 'POST',
    body: {
      role: 'red',
      claimToken: resetRed.json.invite.claimToken,
      agentName: 'Replacement Red Bot',
      teamIdentity: testTeamIdentity('red', ' Replacement'),
    },
  })

  assert.equal(redClaim.response.status, 201)
  assert.equal(redClaim.json.role, 'red')
  assert.equal(redClaim.json.state.phase, 'waiting_for_agents')

  const blueClaim = await route(env, `/sessions/${sessionId}/claim`, {
    method: 'POST',
    body: {
      role: 'blue',
      claimToken: blueInvite.claimToken,
      agentName: 'Blue Bot',
      teamIdentity: testTeamIdentity('blue'),
    },
  })

  assert.equal(blueClaim.response.status, 201)
  assert.equal(blueClaim.json.role, 'blue')
  assert.equal(blueClaim.json.state.phase, 'submission_phase')

  const redToken = redClaim.json.roleToken
  const blueToken = blueClaim.json.roleToken
  const invalidState = await route(env, `/sessions/${sessionId}/state`, {
    token: 'not-a-real-token',
  })

  assert.equal(invalidState.response.status, 401)
  assert.equal(invalidState.json.error.code, 'INVALID_TOKEN')

  const redState = await route(env, `/sessions/${sessionId}/state`, {
    token: redToken,
  })

  assert.equal(redState.response.status, 200)
  assert.equal(redState.json.role, 'red')
  assert.equal(typeof redState.json.stateVersion, 'string')
  assert.equal(redState.json.opponent.role, 'blue')
  assert.equal(redState.json.opponent.claimed, true)
  assert.equal(redState.json.ownLoadout, undefined)
  assertRedactedPublicState(redState.json.opponent, [
    redInvite.claimToken,
    resetRed.json.invite.claimToken,
    blueInvite.claimToken,
    redToken,
    blueToken,
    refereeToken,
  ])

  assertAgentConnectionPacket(redState.json.agentPacket, 'red')
  assert.equal(redState.json.agentPacket.phase, 'choose_loadout')

  const redGameMasterPacket = await internalGameMasterPacketFor(env, sessionId, redToken)
  const chooseAction = findLegalAction(redGameMasterPacket, (action) => action.kind === 'choose_part')
  const chosenPart = catalogPartFromPacket(redGameMasterPacket, chooseAction.catalogRefs?.[0])
  const redSubmission = await route(env, `/sessions/${sessionId}/build-action`, {
    method: 'POST',
    token: redToken,
    body: {
      action: 'submit_build_action',
      decisionVersion: redState.json.agentPacket.decisionVersion,
      command: { kind: 'choose_part', part: `${chosenPart.category}.${chosenPart.id}` },
    },
  })

  assert.equal(redSubmission.response.status, 200)
  assert.equal(redSubmission.json.publicState.phase, 'submission_phase')
  assert.equal(redSubmission.json.packet.build.step, 'choose_attach_target')
  assert.equal(redSubmission.json.publicState.agent.red.nextAction, 'build_bot')
  assert.equal(redSubmission.json.publicState.roles.blue.submitted, false)
  assert.equal(redSubmission.json.publicState.replayAvailable, false)
  assertRoundPlanWindow(redSubmission.json.publicState.roundPlan)

  const earlyReplay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(earlyReplay.response.status, 404)
  assert.equal(earlyReplay.json.error.code, 'REPLAY_NOT_AVAILABLE')

  const preResolveState = await route(env, `/sessions/${sessionId}/state`, { token: redToken })

  assert.equal(preResolveState.response.status, 200)
  assert.equal(preResolveState.json.role, 'red')
  assertRoundPlanWindow(preResolveState.json.roundPlan)
  assert.equal(preResolveState.json.agentPacket.nextAction, 'build_bot')
  assert.equal(preResolveState.json.agentPacket.build.step, 'choose_attach_target')
  assert.deepEqual(preResolveState.json.opponent, {
    role: 'blue',
    identity: expectedLegacyTeamIdentity('blue'),
    claimed: true,
    submitted: false,
    wins: 0,
    losses: 0,
    winStreak: 0,
  })

  const preResolveReplay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(preResolveReplay.response.status, 404)
  assert.equal(preResolveReplay.json.error.code, 'REPLAY_NOT_AVAILABLE')

  const blueState = await route(env, `/sessions/${sessionId}/state`, { token: blueToken })
  const blueGameMasterPacket = await internalGameMasterPacketFor(env, sessionId, blueToken)
  const blueChooseAction = findLegalAction(blueGameMasterPacket, (action) => action.kind === 'choose_part')
  const bluePart = catalogPartFromPacket(blueGameMasterPacket, blueChooseAction.catalogRefs?.[0])
  const blueSubmission = await route(env, `/sessions/${sessionId}/build-action`, {
    method: 'POST',
    token: blueToken,
    body: {
      action: 'submit_build_action',
      decisionVersion: blueState.json.agentPacket.decisionVersion,
      command: { kind: 'choose_part', part: `${bluePart.category}.${bluePart.id}` },
    },
  })

  assert.equal(blueSubmission.response.status, 200)
  assert.equal(blueSubmission.json.publicState.phase, 'submission_phase')
  assert.equal(blueSubmission.json.publicState.agent.red.nextAction, 'build_bot')
  assert.equal(blueSubmission.json.publicState.agent.blue.nextAction, 'build_bot')
  assert.equal(blueSubmission.json.publicState.replayAvailable, false)
  assert.equal('awardOptions' in blueSubmission.json.publicState, false)

  const replay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(replay.response.status, 404)
  assert.equal(replay.json.error.code, 'REPLAY_NOT_AVAILABLE')

  const invalidAdvanceToken = await route(env, `/sessions/${sessionId}/advance-round`, {
    method: 'POST',
    token: redToken,
    body: {},
  })

  assert.equal(invalidAdvanceToken.response.status, 401)
  assert.equal(invalidAdvanceToken.json.error.code, 'INVALID_TOKEN')

  const advance = await route(env, `/sessions/${sessionId}/advance-round`, {
    method: 'POST',
    token: refereeToken,
    body: {},
  })

  assert.equal(advance.response.status, 409)
  assert.equal(advance.json.error.code, 'PHASE_CLOSED')

  const redAfterAdvance = await route(env, `/sessions/${sessionId}/state`, { token: redToken })
  const blueAfterAdvance = await route(env, `/sessions/${sessionId}/state`, { token: blueToken })

  assert.equal(redAfterAdvance.response.status, 200)
  assert.equal(blueAfterAdvance.response.status, 200)
  assert.equal(redAfterAdvance.json.agentPacket.nextAction, 'build_bot')
  assert.equal(blueAfterAdvance.json.agentPacket.nextAction, 'build_bot')

  const publicState = await route(env, `/sessions/${sessionId}/public`)

  assert.equal(publicState.response.status, 200)
  assert.equal(publicState.json.phase, 'submission_phase')
  assert.equal(typeof publicState.json.stateVersion, 'string')
  assert.equal(publicState.json.replayAvailable, false)
  assert.equal('lastResult' in publicState.json, false)
  assertRoundPlanWindow(publicState.json.roundPlan)
  assert.equal(publicState.json.agent.red.nextAction, 'build_bot')
  assert.equal(publicState.json.agent.blue.nextAction, 'build_bot')
  assertRedactedPublicState(publicState.json, [
    redInvite.claimToken,
    resetRed.json.invite.claimToken,
    blueInvite.claimToken,
    redToken,
    blueToken,
    refereeToken,
    'Spinner',
    'Body_Square_Medium',
    'commands',
  ])

  const finalRedState = await route(env, `/sessions/${sessionId}/state`, {
    token: redToken,
  })

  assert.equal(finalRedState.response.status, 200)
  assert.equal(finalRedState.json.ownLoadout, undefined)
  assert.equal(finalRedState.json.round, 1)
  assert.equal(JSON.stringify(finalRedState.json.opponent).includes('Spinner'), false)
  assert.equal('lastResult' in finalRedState.json, false)

  const staleReplay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(staleReplay.response.status, 404)
  assert.equal(staleReplay.json.error.code, 'REPLAY_NOT_AVAILABLE')
})

test('worker returns expired and rate-limited statuses through the Durable Object boundary', async () => {
  const env = createEnv()
  const sessionId = 's_route_limits'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId, seed: 'route-limits' },
  })

  assert.equal(created.response.status, 201)

  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')

  stored.expiresAt = '2000-01-01T00:00:00.000Z'
  await storage.put('agent-arena-session', stored)

  const expired = await route(env, `/sessions/${sessionId}/state`, {
    token: 'not-a-real-token',
  })

  assert.equal(expired.response.status, 410)
  assert.equal(expired.json.error.code, 'SESSION_EXPIRED')

  stored.expiresAt = '9999-01-01T00:00:00.000Z'
  stored.phase = 'waiting_for_agents'
  stored.rateLimits = {
    'state:invalid': {
      count: 120,
      resetAt: '9999-01-01T00:00:00.000Z',
    },
  }
  await storage.put('agent-arena-session', stored)

  const rateLimited = await route(env, `/sessions/${sessionId}/state`, {
    token: 'not-a-real-token',
  })

  assert.equal(rateLimited.response.status, 429)
  assert.equal(rateLimited.json.error.code, 'RATE_LIMITED')
})

test('round 2 build rehydrates prior confirmed blueprint healed to full', async () => {
  const env = createEnv()
  const sessionId = 's_round2_rehydration'
  const { refereeToken, redInvite, blueInvite, redPacket, bluePacket } =
    await bootstrapReadySession(env, sessionId)
  const firstPartAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const firstPartId = firstPartAction.catalogRefs?.[0]
  let packet = await placePartFromCatalog(
    env,
    sessionId,
    redInvite.claimToken,
    redPacket,
    firstPartId,
  )

  packet = await submitPacketAction(
    env,
    sessionId,
    redInvite.claimToken,
    packet,
    findLegalAction(packet, (action) => action.kind === 'confirm_loadout'),
  )

  const blueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const blueRawPacket = await internalGameMasterPacketFor(env, sessionId, blueInvite.claimToken)

  await submitPacketAction(
    env,
    sessionId,
    blueInvite.claimToken,
    blueRawPacket,
    findLegalAction(blueRawPacket, (action) => action.kind === 'confirm_loadout'),
  )

  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const confirmedStored = await storage.get('agent-arena-session')
  const confirmedParts = confirmedStored.roles.red.storedDesign.machine.parts.map(
    (part) => [part.instanceId, part.definitionId],
  )

  assert.equal(confirmedStored.roles.red.storedDesign.machine.parts.length, 2)

  await storeCompletedFight(env, sessionId)

  const damagedStored = await storage.get('agent-arena-session')

  damagedStored.roles.red.storedDesign.machine.runtime = {
    healthByInstanceId: { core: 1, part_1: 0 },
    destroyedInstanceIds: ['part_1'],
  }
  await storage.put('agent-arena-session', damagedStored)

  const advanced = await route(env, `/sessions/${sessionId}/advance-round`, {
    method: 'POST',
    token: refereeToken,
    body: {},
  })

  assert.equal(advanced.response.status, 200)
  assert.equal(advanced.json.publicState.phase, 'submission_phase')
  assert.equal(advanced.json.publicState.round, 2)
  assert.equal(advanced.json.publicState.roles.red.wins, 1)
  assert.equal(advanced.json.publicState.roles.blue.losses, 1)
  assert.equal(advanced.json.publicState.replayAvailable, false)
  assert.equal(advanced.json.publicState.replayStatus, 'none')
  assert.equal('lastResult' in advanced.json.publicState, false)

  const publicAfterAdvance = await route(env, `/sessions/${sessionId}/public`)

  assert.equal(publicAfterAdvance.response.status, 200)
  assert.equal(publicAfterAdvance.json.phase, 'submission_phase')
  assert.equal(publicAfterAdvance.json.round, 2)
  assert.equal(publicAfterAdvance.json.roles.red.wins, 1)
  assert.equal(publicAfterAdvance.json.roles.blue.losses, 1)
  assert.equal(publicAfterAdvance.json.replayAvailable, false)
  assert.equal(publicAfterAdvance.json.replayStatus, 'none')
  assert.equal('lastResult' in publicAfterAdvance.json, false)
  assert.equal(publicAfterAdvance.json.continuation.fightArchive.length, 1)
  assert.equal(publicAfterAdvance.json.continuation.fightArchive[0].fightId, 'fight_1')
  assert.equal(publicAfterAdvance.json.continuation.fightArchive[0].replayAvailable, true)

  const archivedReplay = await route(env, `/sessions/${sessionId}/replay?fightId=fight_1`)

  assert.equal(archivedReplay.response.status, 200)
  assert.equal(archivedReplay.json.round, 1)
  assert.equal(archivedReplay.json.summary, 'Red disabled Blue with weapon pressure.')

  const redNext = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

  assert.equal(redNext.response.status, 200)
  assert.equal('lastResult' in redNext.json, false)
  assert.equal(redNext.json.agentPacket.round, 2)
  assert.equal(redNext.json.agentPacket.phase, 'choose_loadout')

  const redNextRaw = await internalGameMasterPacketFor(env, sessionId, redInvite.claimToken)
  const rehydrated = redNextRaw.buildState.currentDesign

  assert.equal(rehydrated.version, 'machine:v1')
  assert.deepEqual(
    rehydrated.machine.parts.map((part) => [part.instanceId, part.definitionId]),
    confirmedParts,
  )
  assert.equal(rehydrated.machine.runtime, undefined)

  const storedAfter = await storage.get('agent-arena-session')

  assert.equal(storedAfter.roles.red.storedDesign.machine.parts.length, 2)
  assert.equal(storedAfter.roles.red.storedDesign.machine.runtime, undefined)

  const confirmAgain = findLegalAction(
    redNextRaw,
    (action) => action.kind === 'confirm_loadout',
  )
  const reconfirmed = await submitPacketAction(
    env,
    sessionId,
    redInvite.claimToken,
    redNextRaw,
    confirmAgain,
  )

  assert.equal(reconfirmed.nextAction, 'wait_for_opponent_loadout')
})

test('storedDesign is not overwritten by fresh initial state when build state is missing', async () => {
  const env = createEnv()
  const sessionId = 's_stored_design_not_overwritten'
  const { redInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const firstPartAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const packet = await placePartFromCatalog(
    env,
    sessionId,
    redInvite.claimToken,
    redPacket,
    firstPartAction.catalogRefs?.[0],
  )

  assert.equal(packet.buildState.currentDesign.machine.parts.length, 2)

  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')

  assert.equal(stored.roles.red.storedDesign.machine.parts.length, 2)
  stored.roles.red.loadoutBuildState = undefined
  await storage.put('agent-arena-session', stored)

  const redState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

  assert.equal(redState.response.status, 200)
  const redRawState = await internalGameMasterPacketFor(env, sessionId, redInvite.claimToken)
  assert.equal(
    redRawState.buildState.currentDesign.machine.parts.length,
    2,
  )

  const storedAfter = await storage.get('agent-arena-session')

  assert.equal(storedAfter.roles.red.storedDesign.machine.parts.length, 2)
})

async function submitBuildAction(env, sessionId, token, decisionVersion, command, expectStatus = 200) {
  const submitted = await route(env, `/sessions/${sessionId}/build-action`, {
    method: 'POST',
    token,
    body: {
      action: 'submit_build_action',
      decisionVersion,
      command,
    },
  })

  assert.equal(submitted.response.status, expectStatus, JSON.stringify(submitted.json))

  return submitted
}

test('POST /sessions/:id/build-action drives a full compact build flow without action ids', async () => {
  const env = createEnv()
  const sessionId = 's_compact_build_flow'
  const { redInvite, blueInvite, redPacket } = await bootstrapReadySession(env, sessionId)
  const chooseAction = findLegalAction(redPacket, (action) => action.kind === 'choose_part')
  const partId = chooseAction.catalogRefs?.[0]
  const part = catalogPartFromPacket(redPacket, partId)
  const alias = `${part.category}.${part.id}`

  const chosen = await submitBuildAction(env, sessionId, redInvite.claimToken, redPacket.decisionVersion, {
    kind: 'choose_part',
    part: alias,
  })

  assert.equal(chosen.json.compactBuild.step, 'choose_attach_target')
  assert.equal(chosen.json.compactBuild.selected.canonicalPartId, partId)
  assert.ok(chosen.json.compactBuild.targets.includes('core'))
  assert.equal('legalActions' in chosen.json.compactBuild, false)

  const targeted = await submitBuildAction(
    env,
    sessionId,
    redInvite.claimToken,
    chosen.json.compactBuild.decisionVersion,
    { kind: 'choose_attach_target', target: 'core' },
  )

  assert.equal(targeted.json.compactBuild.step, 'mount_part')
  assert.ok(targeted.json.compactBuild.mounts.length > 0)

  const [surface, u, v, yaw, roll] = targeted.json.compactBuild.mounts[0]
  const staleDecisionVersion = targeted.json.compactBuild.decisionVersion
  const mounted = await submitBuildAction(env, sessionId, redInvite.claimToken, staleDecisionVersion, {
    kind: 'mount_part',
    surface,
    u,
    v,
    yaw,
    roll,
  })

  assert.equal(mounted.json.compactBuild.step, 'choose_part')
  assert.equal(mounted.json.compactBuild.bot.parts.length, 2)
  assert.equal(mounted.json.compactBuild.bot.parts[1][1], alias)

  const stale = await submitBuildAction(
    env,
    sessionId,
    redInvite.claimToken,
    staleDecisionVersion,
    { kind: 'confirm_loadout' },
    400,
  )

  assert.equal(stale.json.error.code, 'SUBMISSION_INVALID')

  const confirmed = await submitBuildAction(
    env,
    sessionId,
    redInvite.claimToken,
    mounted.json.compactBuild.decisionVersion,
    { kind: 'confirm_loadout' },
  )

  assert.equal(confirmed.json.packet.nextAction, 'wait_for_opponent_loadout')

  const blueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const blueRawState = await internalGameMasterPacketFor(env, sessionId, blueInvite.claimToken)
  const blueConfirm = await submitPacketAction(
    env,
    sessionId,
    blueInvite.claimToken,
    blueRawState,
    findLegalAction(blueRawState, (action) => action.kind === 'confirm_loadout'),
  )

  assert.notEqual(blueConfirm, undefined)

  const wrongPhase = await submitBuildAction(
    env,
    sessionId,
    redInvite.claimToken,
    0,
    { kind: 'confirm_loadout' },
    409,
  )

  assert.equal(wrongPhase.json.error.code, 'PHASE_CLOSED')
})

test('POST /sessions/:id/combat-plan accepts compact combat plans and rejects legacy action names', async () => {
  const env = createEnv()
  const sessionId = 's_compact_combat_plan'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)

  await confirmMachineLoadout(env, sessionId, redInvite.claimToken, redPacket)
  await confirmMachineLoadout(env, sessionId, blueInvite.claimToken, bluePacket)

  const blueWaitingState = await gameMasterStateFor(env, sessionId, blueInvite)
  const redState = await gameMasterStateFor(env, sessionId, redInvite)
  const blueState = await gameMasterStateFor(env, sessionId, blueInvite)

  assert.equal(blueWaitingState.phase, 'combat_turn')
  assert.equal(blueWaitingState.combatCompact.v, 1)
  assert.equal(blueWaitingState.combatCompact.combat.fightStartedAt, undefined)
  assert.equal(blueWaitingState.combatCompact.combat.fightDeadlineAt, undefined)
  assert.equal(blueWaitingState.combatCompact.combat.fightSeconds, undefined)
  assert.equal(redState.combatCompact.v, 1)
  assert.equal(
    redState.combatCompact.combat.fightStartedAt === undefined ||
      typeof redState.combatCompact.combat.fightStartedAt === 'string',
    true,
  )
  assert.equal(
    redState.combatCompact.combat.fightDeadlineAt === undefined ||
      typeof redState.combatCompact.combat.fightDeadlineAt === 'string',
    true,
  )
  assert.equal(
    redState.combatCompact.combat.fightSeconds === undefined ||
      redState.combatCompact.combat.fightSeconds === 300,
    true,
  )
  assert.equal(Array.isArray(blueState.combatCompact.board.grid), true)

  const reachable = blueState.board?.reachableCells ?? []

  assert.ok(reachable.length > 0)

  const [, moveX, moveZ] = reachable[0].cellId.split(':')
  const compactAccepted = await route(env, `/sessions/${sessionId}/combat-plan`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: {
      action: 'submit_combat_plan',
      decisionVersion: blueState.decisionVersion,
      round: blueState.round,
      steps: [
        { kind: 'move', to: [Number(moveX), Number(moveZ)] },
        { kind: 'end_turn' },
      ],
    },
  })

  assert.equal(compactAccepted.response.status, 200, JSON.stringify(compactAccepted.json))

  const compactIllegal = await route(env, `/sessions/${sessionId}/combat-plan`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      action: 'submit_combat_plan',
      decisionVersion: redState.decisionVersion,
      round: redState.round,
      steps: [
        { kind: 'move', to: [999, 999] },
        { kind: 'end_turn' },
      ],
    },
  })

  assert.equal(compactIllegal.response.status, 400, JSON.stringify(compactIllegal.json))
  assert.equal(compactIllegal.json.error.code, 'SUBMISSION_INVALID')

  const legacyRejected = await route(env, `/sessions/${sessionId}/combat-plan`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      action: 'submit_combat_round_plan',
      decisionVersion: redState.decisionVersion,
      round: redState.round,
      steps: [{ kind: 'end_turn' }],
    },
  })

  assert.equal(legacyRejected.response.status, 400, JSON.stringify(legacyRejected.json))
  assert.equal(legacyRejected.json.error.code, 'SUBMISSION_INVALID')
})
