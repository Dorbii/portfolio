import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgentArenaSession,
  handleWorkerRequest,
} from '../.test-build/apps/worker/src/index.js'
import {
  HAZARD_PREFERENCES,
  MOVEMENT_POLICIES,
  PREFERRED_RANGES,
  TACTIC_STYLES,
  TARGET_PRIORITIES,
  validateAgentBootstrapRequestShape,
  validateGameMasterActionParameters,
  validateGameMasterActionSubmissionShape,
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
      {
        AGENT_ARENA_SESSION: this,
      },
    )
    const stub = {
      fetch: (request) => durableObject.fetch(request),
    }

    this.#objects.set(key, stub)

    return stub
  }
}

function createEnv() {
  return {
    AGENT_ARENA_SESSION: new FakeDurableObjectNamespace(),
  }
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

function assertRedactedPublicState(publicState, hiddenValues) {
  const publicJson = JSON.stringify(publicState)

  for (const hiddenValue of hiddenValues) {
    assert.equal(publicJson.includes(hiddenValue), false)
  }
}

function assertRoundPlanWindow(roundPlan) {
  assert.equal(roundPlan.planSeconds, 120)
  assert.equal(Date.parse(roundPlan.deadlineAt) - Date.parse(roundPlan.openedAt), 120_000)
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
  const submitted = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token,
    body: {
      ...actionSubmissionFromPacket(packet, action.id),
      ...(parameters ? { parameters } : {}),
    },
  })

  assert.equal(submitted.response.status, 200)
  assertGameMasterPacket(submitted.json.packet, packet.role)

  return submitted.json.packet
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
    redPacket: redReadyState.json.gameMaster,
    bluePacket: blueBootstrap.json,
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
  assert.equal(json.version, '0.2.0-gamemaster')
  assert.equal(json.browserApi.global, 'window.AgentArenaRole')
  assert.equal(json.browserApi.briefScriptTagId, 'agent-arena-brief')
  assert.ok(json.browserApi.methods.includes('bootstrapRole'))
  assert.ok(json.browserApi.methods.includes('getState'))
  assert.ok(json.browserApi.methods.includes('waitForGameMasterPacket'))
  assert.ok(json.browserApi.methods.includes('submitAction'))
  assert.ok(json.browserApi.methods.includes('submitPostFightReflection'))
  assert.ok(json.browserApi.methods.includes('sendChatMessage'))
  assert.equal(json.browserApi.methods.includes('submitRoundPlan'), false)
  assert.equal(json.browserApi.methods.includes('submitTurnCommand'), false)
  assert.equal(json.browserApi.methods.includes('saveCompletedSession'), false)
  assert.equal(json.browserApi.methods.includes('continueChampionSession'), false)
  assert.equal(json.browserApi.methods.includes('quitCompletedSession'), false)
  assert.equal(JSON.stringify(json).includes('/save'), false)
  assert.equal(JSON.stringify(json).includes('/continue'), false)
  assert.equal(JSON.stringify(json).includes('/quit'), false)
  assert.ok(json.objective.includes('server-authored legal action menus'))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('/roles/:role/bootstrap')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('private player key')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('invent your own team identity')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('GameMasterPacket')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('legalActions')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('blockedActions')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('error.issues')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('parameterSchema')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('budget rules')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('mobility-less machines can still be legal')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('bootstrapRole({ agentName, teamIdentity })')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('canonical payload maps')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('untrusted')))
  assert.ok(json.externalAgentGuide.fallback.includes('runtime cannot play the role'))
  assert.equal(json.externalAgentGuide.fallback.includes('submitRoundPlan'), false)
  assert.equal(json.externalAgentGuide.fallback.includes('submitTurnCommand'), false)
  assert.ok(json.rules.packetFields.required.includes('decisionVersion'))
  assert.ok(json.rules.packetFields.required.includes('eventVersion'))
  assert.ok(json.rules.packetFields.required.includes('legalActions'))
  assert.ok(json.rules.packetFields.optional.includes('blockedActions'))
  assert.deepEqual(json.rules.teamIdentitySchema.requiredOnFirstConnect, [
    'name',
    'colorHex',
    'logoPrompt or logoAsset',
  ])
  assert.equal(json.rules.teamIdentitySchema.colorHex, 'string formatted as #RRGGBB hex color')
  assert.ok(json.rules.teamIdentitySchema.logoPrompt.includes('text prompt'))
  assert.ok(json.rules.teamIdentitySchema.logoAsset.includes('image_url'))
  assert.equal(json.rules.packetFields.versionContract.decisionVersion, 'snapshot both agents choose from')
  assert.equal(json.rules.packetFields.versionContract.actionSetId, 'exact role-specific legal menu')
  assert.equal(json.rules.packetFields.versionContract.eventVersion, 'chat, replay, and public-state progression')
  assert.equal(json.rules.submissionSchema.action, 'submit_game_action')
  assert.deepEqual(json.rules.submissionSchema.required, [
    'action',
    'actionSetId',
    'decisionVersion',
    'actionId',
  ])
  assert.ok(json.rules.submissionSchema.optional.includes('parameters'))
  assert.ok(json.partCatalog.some((part) => part.id === 'Body_Square_Medium' && part.cost === 22))
  assert.ok(json.partCatalog.some((part) => part.id === 'Weapon_Spinner_Small'))
  assert.ok(json.partCatalog.some((part) => part.id === 'Utility_DroneController' && part.behavior?.id === 'drone_controller'))
  assertCatalogGuidance(json)
  assert.equal(json.examples.gameMasterPacket.actionSetId, 'red:r1:fight_1:turn_3:v12')
  assert.equal(json.examples.gameMasterPacket.decisionVersion, 12)
  assert.equal(json.examples.gameMasterPacket.eventVersion, 21)
  assert.ok(json.examples.gameMasterPacket.legalActions.some((action) => action.id === 'combat.red.r1.f1.t3.hold'))
  assert.ok(
    json.examples.gameMasterPacket.legalActions.some(
      (action) => action.parameterSchema?.properties?.commitment?.maximum === 3,
    ),
  )
  assert.equal(json.examples.gameMasterPacket.submit.body.action, 'submit_game_action')
  assert.equal(json.examples.gameMasterActionSubmission.action, 'submit_game_action')
  assert.deepEqual(json.examples.gameMasterActionSubmission.parameters, { commitment: 2 })
  assert.equal(json.examples.mountPoseActionSubmission.action, 'submit_game_action')
  assert.equal(json.examples.mountPoseActionSubmission.actionId, 'loadout.red.r1.mount_pose.Laser_A.core')
  assert.deepEqual(json.examples.mountPoseActionSubmission.parameters, {
    parentInstanceId: 'core',
    childPartId: 'Laser_A',
    mountSurfaceId: 'core_shell',
    u: 0.37,
    v: 0.82,
    yawDegrees: 120,
    rollDegrees: 15,
  })
  assert.equal(json.examples.teamIdentity.name, 'Voltage Choir')
  assert.equal(json.examples.teamIdentity.colorHex, '#00d6a3')
  assert.equal(typeof json.examples.teamIdentity.logoPrompt, 'string')
  assert.equal('primaryColor' in json.examples.teamIdentity, false)
  assert.equal('logo' in json.examples.teamIdentity, false)
  const exportedSubmissionValidation = validateGameMasterActionSubmissionShape({
    ...json.examples.gameMasterActionSubmission,
    forgedField: true,
  })

  assert.equal(exportedSubmissionValidation.ok, false)
  assert.ok(exportedSubmissionValidation.issues.some((issue) => issue.code === 'UNKNOWN_FIELD'))
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
        action.name === 'submit_game_action' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/action' &&
        action.body.action === 'submit_game_action',
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
  assertGameMasterPacket(redBootstrap.json, 'red')
  assert.equal(redBootstrap.json.phase, 'wait_for_opponent_claim')
  assert.equal(redBootstrap.json.nextAction, 'wait_for_opponent_claim')
  assert.equal(redBootstrap.json.actionSetId, undefined)
  assert.equal(redBootstrap.json.legalActions.length, 0)

  const resumedRed = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {},
  })

  assert.equal(resumedRed.response.status, 200)
  assertGameMasterPacket(resumedRed.json, 'red')
  assert.equal(resumedRed.json.phase, 'wait_for_opponent_claim')

  const repeatedIdentityRed = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: bootstrapBody('red', 'External Red'),
  })

  assert.equal(repeatedIdentityRed.response.status, 200)
  assertGameMasterPacket(repeatedIdentityRed.json, 'red')

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
  assertGameMasterPacket(redState.json.gameMaster, 'red')

  const blueBootstrap = await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: bootstrapBody('blue'),
  })

  assert.equal(blueBootstrap.response.status, 201)
  assertGameMasterPacket(blueBootstrap.json, 'blue')
  assert.equal(blueBootstrap.json.phase, 'choose_loadout')
  assert.equal(blueBootstrap.json.nextAction, 'build_bot')
  assert.equal(blueBootstrap.json.buildState.step, 'choose_part')
  assert.equal(blueBootstrap.json.legalActions[0].kind, 'choose_part')
  assert.equal(
    blueBootstrap.json.legalActions
      .filter((action) => action.kind !== 'confirm_loadout')
      .every((action) => action.kind === 'choose_part'),
    true,
  )
  assert.equal(blueBootstrap.json.legalActions.at(-1).kind, 'confirm_loadout')
  assert.equal(blueBootstrap.json.submit.body.actionSetId, blueBootstrap.json.actionSetId)
  assert.equal(blueBootstrap.json.submit.body.decisionVersion, blueBootstrap.json.decisionVersion)
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
      action: 'submit_game_action',
      actionSetId: 'observer-cannot-lock',
      decisionVersion: 1,
      actionId: 'observer-cannot-lock',
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

test('state and public routes embed GameMaster action-set versions for agents', async () => {
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
  assertGameMasterPacket(redState.json.gameMaster, 'red')
  assert.equal(redState.json.gameMaster.actionSetId, redPacket.actionSetId)
  assert.equal(redState.json.gameMaster.decisionVersion, redPacket.decisionVersion)
  assert.equal(publicState.response.status, 200)
  assert.equal(publicState.json.gameMaster.red.actionSetId, redPacket.actionSetId)
  assert.equal(publicState.json.gameMaster.blue.actionSetId, bluePacket.actionSetId)
  assert.equal(publicState.json.gameMaster.red.decisionVersion, redPacket.decisionVersion)
  assert.equal(publicState.json.gameMaster.blue.decisionVersion, bluePacket.decisionVersion)
  assert.equal(publicState.json.gameMaster.red.eventVersion, publicState.json.gameMaster.blue.eventVersion)
  assert.equal(blueInvite.claimToken.startsWith('cap_blue_'), true)
})

test('POST /sessions/:id/action accepts a valid server-authored action id', async () => {
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

  assert.equal(submission.response.status, 200)
  assertGameMasterPacket(submission.json.packet, 'red')
  assert.equal(submission.json.packet.nextAction, 'build_bot')
  assert.equal(submission.json.packet.buildState.step, 'choose_attach_target')
  assert.equal(submission.json.packet.buildState.selectedPartId, partId)
  assert.equal(submission.json.packet.legalActions[0].kind, 'choose_attach_target')
  assert.equal(submission.json.publicState.gameMaster.red.nextAction, 'build_bot')
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
  const invalid = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      ...actionSubmissionFromPacket(packet, poseAction.id),
      parameters: {
        ...validParameters,
        u: -0.1,
      },
    },
  })
  const afterRejected = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

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
  assert.equal(invalid.response.status, 400)
  assert.equal(invalid.json.error.code, 'SUBMISSION_INVALID')
  assert.ok(invalid.json.error.issues.some((issue) => issue.code === 'PARAMETER_OUT_OF_RANGE'))
  assert.ok(invalid.json.error.issues.some((issue) => issue.message.includes('between 0 and 1')))
  assert.equal(afterRejected.json.gameMaster.resources.remainingGold, packet.resources.remainingGold)
  assert.deepEqual(afterRejected.json.gameMaster.buildState.currentDesign, packet.buildState.currentDesign)
  assert.equal(afterRejected.json.gameMaster.buildState.step, 'propose_mount_pose')

  const valid = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {
      ...actionSubmissionFromPacket(packet, poseAction.id),
      parameters: validParameters,
    },
  })

  assert.equal(valid.response.status, 200)
  assert.equal(valid.json.packet.resources.remainingGold, 100 - selectedPart.cost)
  assert.equal(valid.json.packet.buildState.currentDesign.machine.parts.length, 2)
  assert.deepEqual(
    valid.json.packet.buildState.currentDesign.machine.attachments.map((attachment) => [
      attachment.parentInstanceId,
      attachment.childInstanceId,
      attachment.mountId,
    ]),
    [['core', 'part_1', 'core_shell']],
  )
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

test('POST /sessions/:id/action locks once and accepts duplicate same submission idempotently', async () => {
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

  assert.equal(first.response.status, 200)
  assert.equal(duplicate.response.status, 200)
  assert.equal(duplicate.json.packet.nextAction, 'wait_for_opponent_loadout')
  assert.equal(changed.response.status, 409)
  assert.equal(changed.json.error.code, 'ALREADY_SUBMITTED')
})

test('red action submission does not stale blue action-set decision version', async () => {
  const env = createEnv()
  const sessionId = 's_action_red_first_blue_stable'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)
  const redSubmission = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: actionSubmissionFromPacket(redPacket),
  })
  const blueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const blueSubmission = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: actionSubmissionFromPacket(bluePacket),
  })

  assert.equal(redSubmission.response.status, 200)
  assert.equal(blueState.response.status, 200)
  assert.equal(blueState.json.gameMaster.actionSetId, bluePacket.actionSetId)
  assert.equal(blueState.json.gameMaster.decisionVersion, bluePacket.decisionVersion)
  assert.ok(blueState.json.gameMaster.eventVersion > bluePacket.eventVersion)
  assert.equal(blueSubmission.response.status, 200)
})

test('combat /action uses generated canonical actions and preserves blue set after red locks first', async () => {
  const env = createEnv()
  const sessionId = 's_combat_generated_actions'
  const { redInvite, blueInvite, redPacket, bluePacket } = await bootstrapReadySession(env, sessionId)

  const redAfterConfirm = await confirmMachineLoadout(
    env,
    sessionId,
    redInvite.claimToken,
    redPacket,
  )
  const blueAfterConfirm = await confirmMachineLoadout(
    env,
    sessionId,
    blueInvite.claimToken,
    bluePacket,
  )
  const redCombatState = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const blueCombatState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const redCombatPacket = redCombatState.json.gameMaster
  const blueCombatPacket = blueCombatState.json.gameMaster
  const redHold = findLegalAction(redCombatPacket, (action) => action.kind === 'hold')
  const blueHold = findLegalAction(blueCombatPacket, (action) => action.kind === 'hold')

  assert.equal(redAfterConfirm.nextAction, 'wait_for_opponent_loadout')
  assert.equal(blueAfterConfirm.phase, 'combat_turn')
  assert.equal(redCombatState.response.status, 200)
  assert.equal(blueCombatState.response.status, 200)
  assertGameMasterPacket(redCombatPacket, 'red')
  assertGameMasterPacket(blueCombatPacket, 'blue')
  assert.equal(redCombatPacket.phase, 'combat_turn')
  assert.equal(redCombatPacket.nextAction, 'choose_turn')
  assert.equal(redCombatPacket.turnId, 'turn_1')
  assert.equal(redCombatPacket.visibleState.turn, 1)
  assert.equal(redCombatPacket.legalActions.some((action) => action.kind === 'ready'), false)
  assert.equal(redCombatPacket.legalActions.every((action) => action.id.startsWith('combat.red.r1.t1.')), true)
  assert.equal(JSON.stringify(redCombatPacket).includes('slice_2_minimal_action_bridge'), false)
  assert.equal(JSON.stringify(redCombatPacket.legalActions).includes('command'), false)

  const redSubmission = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: actionSubmissionFromPacket(redCombatPacket, redHold.id),
  })
  const blueAfterRed = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })

  assert.equal(redSubmission.response.status, 200)
  assert.equal(redSubmission.json.packet.nextAction, 'wait_for_opponent_turn')
  assert.equal(blueAfterRed.response.status, 200)
  assert.equal(
    redSubmission.json.publicState.eventLog.some((event) => event.message.includes(redHold.id)),
    false,
  )
  assert.equal(
    blueAfterRed.json.eventLog.some((event) => event.message.includes(redHold.id)),
    false,
  )
  assert.equal(
    blueAfterRed.json.eventLog.some((event) => event.message === 'red locked a GameMaster action.'),
    true,
  )
  assert.equal(blueAfterRed.json.gameMaster.actionSetId, blueCombatPacket.actionSetId)
  assert.equal(blueAfterRed.json.gameMaster.decisionVersion, blueCombatPacket.decisionVersion)
  assert.deepEqual(
    blueAfterRed.json.gameMaster.legalActions.map((action) => action.id),
    blueCombatPacket.legalActions.map((action) => action.id),
  )

  const blueSubmission = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: actionSubmissionFromPacket(blueCombatPacket, blueHold.id),
  })
  const redNextTurn = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })

  assert.equal(blueSubmission.response.status, 200)
  assert.equal(blueSubmission.json.publicState.phase, 'round_review')
  assert.equal(blueSubmission.json.publicState.lastResult.damage.red, 0)
  assert.equal(blueSubmission.json.publicState.lastResult.damage.blue, 0)
  assert.equal(blueSubmission.json.publicState.combat, undefined)
  assert.equal(redNextTurn.response.status, 200)
  assert.equal(redNextTurn.json.gameMaster.phase, 'round_review')
  assert.equal(redNextTurn.json.gameMaster.nextAction, 'submit_reflection')
  assert.equal(redNextTurn.json.gameMaster.actionSetId, undefined)
  assert.deepEqual(redNextTurn.json.gameMaster.legalActions, [])
})

test('POST /sessions/:id/reflection accepts only private post-fight reflections after completed fight', async () => {
  const env = createEnv()
  const sessionId = 's_reflection_route'
  const { refereeToken, redInvite, blueInvite, redPacket } = await bootstrapReadySession(env, sessionId)
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
    body: routePostFightReflection('blue', redState.json.gameMaster.decisionVersion),
  })
  const submitted = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('red', redState.json.gameMaster.decisionVersion),
  })
  const duplicate = await route(env, `/sessions/${sessionId}/reflection`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: routePostFightReflection('red', redState.json.gameMaster.decisionVersion),
  })
  const blueState = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })
  const publicState = await route(env, `/sessions/${sessionId}/public`)
  const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
  const stored = await storage.get('agent-arena-session')
  const advanced = await route(env, `/sessions/${sessionId}/advance-round`, {
    method: 'POST',
    token: refereeToken,
    body: {},
  })
  const consumed = await storage.get('agent-arena-session')
  const redNext = await route(env, `/sessions/${sessionId}/state`, {
    token: redInvite.claimToken,
  })
  const blueNext = await route(env, `/sessions/${sessionId}/state`, {
    token: blueInvite.claimToken,
  })

  assert.equal(redState.response.status, 200)
  assert.equal(redState.json.gameMaster.fightId, 'fight_1')
  assert.equal(redState.json.gameMaster.nextAction, 'submit_reflection')
  assert.equal(mismatch.response.status, 403)
  assert.equal(mismatch.json.error.code, 'FORBIDDEN')
  assert.equal(submitted.response.status, 200)
  assert.equal(submitted.json.packet.nextAction, 'wait_for_debrief')
  assert.equal(duplicate.response.status, 409)
  assert.equal(duplicate.json.error.code, 'ALREADY_SUBMITTED')
  assert.equal(stored.reflections[0].status, 'private_pending')
  assert.equal(JSON.stringify(blueState.json).includes('secret weak drive note'), false)
  assert.equal(JSON.stringify(publicState.json).includes('secret weak drive note'), false)
  assert.equal(advanced.response.status, 200)
  assert.equal(consumed.reflections[0].status, 'consumed_into_shared_debrief')
  assert.equal(consumed.reflections[0].debriefId, consumed.sharedDebrief.debriefId)
  assert.equal(JSON.stringify(consumed.sharedDebrief).includes('secret weak drive note'), false)
  assert.deepEqual(redNext.json.gameMaster.sharedDebrief, blueNext.json.gameMaster.sharedDebrief)
  assert.equal(JSON.stringify(redNext.json.gameMaster.sharedDebrief).includes('secret weak drive note'), false)
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
    body: routePostFightReflection('red', redState.json.gameMaster.decisionVersion),
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

  assertGameMasterPacket(redState.json.gameMaster, 'red')
  assert.equal(redState.json.gameMaster.phase, 'choose_loadout')

  const redSubmission = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: redToken,
    body: actionSubmissionFromPacket(redState.json.gameMaster),
  })

  assert.equal(redSubmission.response.status, 200)
  assert.equal(redSubmission.json.publicState.phase, 'submission_phase')
  assert.equal(redSubmission.json.packet.buildState.step, 'choose_attach_target')
  assert.equal(redSubmission.json.publicState.gameMaster.red.nextAction, 'build_bot')
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
  assert.equal(preResolveState.json.gameMaster.nextAction, 'build_bot')
  assert.equal(preResolveState.json.gameMaster.buildState.step, 'choose_attach_target')
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
  const blueSubmission = await route(env, `/sessions/${sessionId}/action`, {
    method: 'POST',
    token: blueToken,
    body: actionSubmissionFromPacket(blueState.json.gameMaster),
  })

  assert.equal(blueSubmission.response.status, 200)
  assert.equal(blueSubmission.json.publicState.phase, 'submission_phase')
  assert.equal(blueSubmission.json.publicState.gameMaster.red.nextAction, 'build_bot')
  assert.equal(blueSubmission.json.publicState.gameMaster.blue.nextAction, 'build_bot')
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
  assert.equal(redAfterAdvance.json.gameMaster.nextAction, 'build_bot')
  assert.equal(blueAfterAdvance.json.gameMaster.nextAction, 'build_bot')

  const publicState = await route(env, `/sessions/${sessionId}/public`)

  assert.equal(publicState.response.status, 200)
  assert.equal(publicState.json.phase, 'submission_phase')
  assert.equal(typeof publicState.json.stateVersion, 'string')
  assert.equal(publicState.json.replayAvailable, false)
  assertRoundPlanWindow(publicState.json.roundPlan)
  assert.equal(publicState.json.gameMaster.red.nextAction, 'build_bot')
  assert.equal(publicState.json.gameMaster.blue.nextAction, 'build_bot')
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
