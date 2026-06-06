import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgentArenaSession,
  handleWorkerRequest,
} from '../.test-build/apps/worker/src/index.js'
import { validateReplayTimeline } from '../.test-build/packages/replay/src/index.js'
import {
  HAZARD_PREFERENCES,
  MOVEMENT_POLICIES,
  PREFERRED_RANGES,
  TACTIC_STYLES,
  TARGET_PRIORITIES,
  WEAPON_CADENCES,
} from '../.test-build/packages/schemas/src/index.js'

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
  openingScript: {
    commands: [
      { tick: 1, move: 'forward', weaponA: 'hold' },
      { tick: 2, move: 'forward', weaponA: 'fire' },
      { tick: 3, move: 'turn_left', weaponA: 'hold' },
      { tick: 4, move: 'forward', weaponA: 'fire' },
      { tick: 5, move: 'brake', weaponA: 'hold' },
    ],
  },
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

    const durableObject = new AgentArenaSession({
      storage: this.storageFor(key),
    })
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

async function resolveLiveRouteCombat(env, sessionId, redToken, blueToken, firstState) {
  let state = firstState

  for (let index = 0; index < 90; index += 1) {
    const tick = state.combat.tick
    const command = {
      action: 'submit_turn_command',
      tick,
      move: 'dash_forward',
      weaponA: 'fire',
    }

    const redTurn = await route(env, `/sessions/${sessionId}/turn-command`, {
      method: 'POST',
      token: redToken,
      body: command,
    })
    const blueTurn = await route(env, `/sessions/${sessionId}/turn-command`, {
      method: 'POST',
      token: blueToken,
      body: command,
    })

    assert.equal(redTurn.response.status, 200)
    assert.equal(blueTurn.response.status, 200)

    if (blueTurn.json.publicState.phase === 'round_review') {
      return blueTurn
    }

    state = blueTurn.json.state
  }

  throw new Error('Route combat did not resolve within expected turn budget.')
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
  assert.equal(json.name, 'Agent Arena')
  assert.equal(json.version, '0.1.0')
  assert.equal(json.browserApi.global, 'window.AgentArenaRole')
  assert.equal(json.browserApi.briefScriptTagId, 'agent-arena-brief')
  assert.ok(json.browserApi.methods.includes('bootstrapRole'))
  assert.ok(json.browserApi.methods.includes('claimRole'))
  assert.ok(json.browserApi.methods.includes('getFallbackRoundPlan'))
  assert.ok(json.browserApi.methods.includes('submitFallbackRoundPlan'))
  assert.ok(json.browserApi.methods.includes('submitChatMessage'))
  assert.ok(json.browserApi.methods.includes('submitPrivateChatMessage'))
  assert.ok(json.browserApi.methods.includes('getPrivateChatLog'))
  assert.ok(json.browserApi.methods.includes('waitForStateChange'))
  assert.ok(json.browserApi.methods.includes('waitForNextSubmissionWindow'))
  assert.ok(json.browserApi.methods.includes('waitForNextAction'))
  assert.ok(json.objective.includes('Build and submit'))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('/roles/:role/bootstrap')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('private player key')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('/agent-spec.json')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('designPatterns')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('mandatory fixed classes')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('catalogGuidance.capabilities')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('window.AgentArenaRole helpers')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('Prefer a varied legal custom plan')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('Table Talk')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('state.chatLog')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('untrusted/deceptive input')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('Agent Journal')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('stateVersion')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('waitForNextAction({ timeoutMs: 600000 })')))
  assert.ok(json.externalAgentGuide.fallback.includes('window.AgentArenaRole.bootstrapRole()'))
  assert.ok(json.externalAgentGuide.fallback.includes('submitFallbackRoundPlan() only if'))
  assert.ok(json.externalAgentGuide.fallback.includes('do not keep retrying'))
  assert.equal(json.continuationProtocol.transport, 'polling')
  assert.equal(json.continuationProtocol.defaultTimeoutMs, 600000)
  assert.equal(json.continuationProtocol.watchField, 'stateVersion')
  assert.ok(json.continuationProtocol.browserHelpers.includes('waitForNextAction({ timeoutMs })'))
  assert.ok(json.submissionChecklist.some((item) => item.includes('First round starts with 100 gold')))
  assert.ok(json.submissionChecklist.some((item) => item.includes('Feature gates describe system support')))
  assert.equal(json.rules.submissionSchemas.preferred.schemaVersion, 2)
  assert.ok(json.rules.submissionSchemas.preferred.tactics.movementPolicy.includes('hold_ground'))
  assert.equal(json.rules.combatTurnSeconds, 120)
  assert.equal(json.rules.turnCommandSchema.action, 'submit_turn_command')
  assert.ok(json.rules.turnCommandSchema.note.includes('movement plus weapon and utility'))
  assert.equal(json.rules.turnDecisionContext.location, 'private state.combat.decision')
  assert.ok(json.rules.turnDecisionContext.fields.movementOptions.includes('suggestions'))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('state.combat.decision')))
  assert.ok(json.turnStrategyGuidance.some((strategy) => strategy.id === 'kite_and_punish'))
  assert.ok(
    json.turnStrategyGuidance.some((strategy) =>
      strategy.turnAdvice.some((advice) => advice.includes('state.combat.decision')),
    ),
  )
  assert.ok(json.partCatalog.some((part) => part.id === 'Body_Square_Medium' && part.cost === 22))
  assert.ok(json.partCatalog.some((part) => part.id === 'Weapon_Spinner_Small'))
  assert.ok(json.partCatalog.some((part) => part.id === 'Utility_DroneController' && part.behavior?.id === 'drone_controller'))
  assertLegalDesignPatterns(json)
  assertCatalogGuidance(json)
  assert.equal(json.examples.roundPlanSubmission.blueprint.name, 'Baseline Spinner')
  assert.equal(json.examples.roundPlanSubmission.schemaVersion, 2)
  assert.equal(json.examples.roundPlanSubmission.openingScript.commands.length, 5)
  assert.equal(json.examples.turnCommandSubmission.action, 'submit_turn_command')
  assert.ok(
    json.examples.roundPlanSubmission.purchases.some(
      (purchase) => purchase.partId === 'Body_Square_Medium',
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
        action.name === 'create_session' &&
        action.method === 'POST' &&
        action.path === '/sessions' &&
        action.auth === 'none; protected by Cloudflare rate limiting/WAF',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_turn_command' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/turn-command' &&
        action.phase === 'combat_turn',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_private_chat_message' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/private-chat' &&
        action.returns.includes('Agent Journal') &&
        action.returns.includes('opponent private state do not include this entry'),
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'get_replay' &&
        action.method === 'GET' &&
        action.path === '/sessions/:sessionId/replay' &&
        action.phase === 'replay_phase | round_review' &&
        action.returns.includes('botBlueprints') &&
        action.returns.includes('pending submissions are not public before resolution'),
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'advance_round' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/advance-round',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_chat_message' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/chat' &&
        action.returns.includes('opponent role context includes the same message in state.chatLog'),
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'reset_role_claim' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/reset-role' &&
        action.auth === 'referee capability token',
    ),
  )
})

test('OPTIONS returns CORS preflight headers', async () => {
  const response = await handleWorkerRequest(
    new Request('https://arena-api.test/sessions/s_demo/round-plan', {
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
    body: { agentName: 'External Red' },
  })

  assert.equal(redBootstrap.response.status, 201)
  assert.equal(redBootstrap.json.claimedNow, true)
  assert.equal(redBootstrap.json.state.role, 'red')
  assert.equal(redBootstrap.json.state.phase, 'waiting_for_agents')
  assert.equal(redBootstrap.json.publicState.roles.red.claimed, true)
  assert.equal(redBootstrap.json.nextAction, 'wait_for_opponent_claim')

  const resumedRed = await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {},
  })

  assert.equal(resumedRed.response.status, 200)
  assert.equal(resumedRed.json.claimedNow, false)
  assert.equal(resumedRed.json.state.role, 'red')

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

  const blueBootstrap = await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: {},
  })

  assert.equal(blueBootstrap.response.status, 201)
  assert.equal(blueBootstrap.json.state.phase, 'submission_phase')
  assertRoundPlanWindow(blueBootstrap.json.state.roundPlan)
  assert.equal(blueBootstrap.json.nextAction, 'submit_round_plan')
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

  const observerSubmission = await route(env, `/sessions/${sessionId}/round-plan`, {
    method: 'POST',
    token: redInvite.observerToken,
    body: validSpinnerSubmission,
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

test('POST /sessions/:id/round-plan accepts v2 tactics submissions', async () => {
  const env = createEnv()
  const sessionId = 's_v2_route'
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId },
  })
  const redInvite = inviteFor(created.json.invites, 'red')
  const blueInvite = inviteFor(created.json.invites, 'blue')

  await route(env, `/sessions/${sessionId}/roles/red/bootstrap`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: {},
  })
  await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: {},
  })

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

  const redSubmission = await route(env, `/sessions/${sessionId}/round-plan`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: v2Submission,
  })
  const blueSubmission = await route(env, `/sessions/${sessionId}/round-plan`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: v2Submission,
  })

  assert.equal(redSubmission.response.status, 200)
  assert.equal(redSubmission.json.publicState.phase, 'submission_phase')
  assertRoundPlanWindow(redSubmission.json.publicState.roundPlan)
  assert.equal(redSubmission.json.state.ownSubmission.schemaVersion, 2)
  assert.equal('turnPlan' in redSubmission.json.state.ownSubmission, false)
  assert.equal(blueSubmission.response.status, 200)
  assert.equal(blueSubmission.json.publicState.phase, 'combat_turn')
  assert.equal(blueSubmission.json.publicState.roundPlan, undefined)
  assert.equal(blueSubmission.json.publicState.replayAvailable, false)
  assert.equal(blueSubmission.json.state.combat.tick, 1)
  assert.equal('decision' in blueSubmission.json.publicState.combat, false)
  assert.equal(blueSubmission.json.state.combat.decision.tick, 1)
  assert.equal(blueSubmission.json.state.combat.decision.legalCommands.movement.includes('forward'), true)
  assert.equal(blueSubmission.json.state.combat.decision.range.distance, 12)
  assert.equal(blueSubmission.json.state.combat.decision.range.band, 'long')
  assert.equal(blueSubmission.json.state.combat.decision.movementOptions.recommended.includes('dash_forward'), true)
  assert.ok(
    blueSubmission.json.state.combat.decision.tacticalCues.some((cue) =>
      cue.includes('movement can be combined'),
    ),
  )

  const redTurn = await route(env, `/sessions/${sessionId}/turn-command`, {
    method: 'POST',
    token: redInvite.claimToken,
    body: { action: 'submit_turn_command', tick: 1, move: 'forward', weaponA: 'hold' },
  })
  const blueTurn = await route(env, `/sessions/${sessionId}/turn-command`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: { action: 'submit_turn_command', tick: 1, move: 'forward', weaponA: 'hold' },
  })

  assert.equal(redTurn.response.status, 200)
  assert.equal(redTurn.json.publicState.combat.submitted.red, true)
  assert.equal(blueTurn.response.status, 200)
  assert.equal(blueTurn.json.publicState.phase, 'combat_turn')
  assert.equal(blueTurn.json.publicState.combat.tick, 2)
  assert.equal(blueTurn.json.state.combat.decision.tick, 2)
  assert.equal(blueTurn.json.state.combat.decision.previousResolvedTurn.self.move, 'forward')
  assert.equal(blueTurn.json.state.combat.decision.previousResolvedTurn.opponent.move, 'forward')
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
    body: { agentName: 'Red Talker' },
  })
  await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: {},
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
    body: { agentName: 'Red Private' },
  })
  await route(env, `/sessions/${sessionId}/roles/blue/bootstrap`, {
    method: 'POST',
    token: blueInvite.claimToken,
    body: { agentName: 'Blue Private' },
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
  assert.equal(redState.json.ownSubmission, undefined)
  assertRedactedPublicState(redState.json.opponent, [
    redInvite.claimToken,
    resetRed.json.invite.claimToken,
    blueInvite.claimToken,
    redToken,
    blueToken,
    refereeToken,
  ])

  const redSubmission = await route(env, `/sessions/${sessionId}/round-plan`, {
    method: 'POST',
    token: redToken,
    body: validSpinnerSubmission,
  })

  assert.equal(redSubmission.response.status, 200)
  assert.equal(redSubmission.json.publicState.phase, 'submission_phase')
  assert.equal(redSubmission.json.publicState.roles.red.submitted, true)
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
  assert.deepEqual(preResolveState.json.opponent, {
    role: 'blue',
    claimed: true,
    submitted: false,
    wins: 0,
    losses: 0,
    winStreak: 0,
  })

  const preResolveReplay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(preResolveReplay.response.status, 404)
  assert.equal(preResolveReplay.json.error.code, 'REPLAY_NOT_AVAILABLE')

  const blueSubmission = await route(env, `/sessions/${sessionId}/round-plan`, {
    method: 'POST',
    token: blueToken,
    body: validSpinnerSubmission,
  })

  assert.equal(blueSubmission.response.status, 200)
  assert.equal(blueSubmission.json.publicState.phase, 'combat_turn')
  assert.equal(blueSubmission.json.publicState.roles.red.submitted, true)
  assert.equal(blueSubmission.json.publicState.roles.blue.submitted, true)
  assert.equal(blueSubmission.json.publicState.replayAvailable, false)
  assert.equal(blueSubmission.json.publicState.roundPlan, undefined)
  assert.equal('awardOptions' in blueSubmission.json.publicState, false)

  const resolved = await resolveLiveRouteCombat(
    env,
    sessionId,
    redToken,
    blueToken,
    blueSubmission.json.state,
  )

  assert.equal(resolved.json.publicState.phase, 'round_review')
  assert.equal(resolved.json.publicState.replayAvailable, true)

  const replay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(replay.response.status, 200)
  assert.equal(validateReplayTimeline(replay.json), true)
  assert.equal(replay.json.botBlueprints?.red?.name, 'Spinner')
  assert.equal(replay.json.botBlueprints?.blue?.name, 'Spinner')
  assert.equal(replay.json.botBlueprints?.red?.blocks?.length > 0, true)
  assert.equal(replay.json.botBlueprints?.blue?.blocks?.length > 0, true)
  assert.equal(replay.json.botBlueprints?.red?.blocks[0].id, 'core')
  assert.equal(replay.json.botBlueprints?.red?.blocks[0].partId, 'Body_Square_Medium')

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

  assert.equal(advance.response.status, 200)
  assert.equal(advance.json.publicState.phase, 'submission_phase')
  assert.equal(advance.json.publicState.round, 2)
  assert.equal(advance.json.publicState.roles.red.submitted, false)
  assert.equal(advance.json.publicState.roles.blue.submitted, false)
  assertRoundPlanWindow(advance.json.publicState.roundPlan)

  const redAfterAdvance = await route(env, `/sessions/${sessionId}/state`, { token: redToken })
  const blueAfterAdvance = await route(env, `/sessions/${sessionId}/state`, { token: blueToken })

  assert.equal(redAfterAdvance.response.status, 200)
  assert.equal(blueAfterAdvance.response.status, 200)
  assert.equal(redAfterAdvance.json.gold, 103)
  assert.equal(blueAfterAdvance.json.gold, 78)

  const publicState = await route(env, `/sessions/${sessionId}/public`)

  assert.equal(publicState.response.status, 200)
  assert.equal(publicState.json.phase, 'submission_phase')
  assert.equal(typeof publicState.json.stateVersion, 'string')
  assert.equal(publicState.json.replayAvailable, false)
  assertRoundPlanWindow(publicState.json.roundPlan)
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
  assert.equal(finalRedState.json.ownSubmission, undefined)
  assert.equal(finalRedState.json.round, 2)
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
