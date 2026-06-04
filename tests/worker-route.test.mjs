import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgentArenaSession,
  handleWorkerRequest,
} from '../.test-build/apps/worker/src/index.js'
import { validateReplayTimeline } from '../.test-build/packages/replay/src/index.js'

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
  assert.ok(json.browserApi.methods.includes('waitForStateChange'))
  assert.ok(json.browserApi.methods.includes('waitForNextSubmissionWindow'))
  assert.ok(json.objective.includes('Build and submit'))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('/roles/:role/bootstrap')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('private player key')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('/agent-spec.json')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('window.AgentArenaRole helpers')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('Prefer a varied legal custom plan')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('public chat')))
  assert.ok(json.externalAgentGuide.firstRead.some((item) => item.includes('stateVersion')))
  assert.ok(json.externalAgentGuide.fallback.includes('window.AgentArenaRole.bootstrapRole()'))
  assert.ok(json.externalAgentGuide.fallback.includes('submitFallbackRoundPlan() only if'))
  assert.ok(json.externalAgentGuide.fallback.includes('do not keep retrying'))
  assert.equal(json.continuationProtocol.transport, 'polling')
  assert.equal(json.continuationProtocol.watchField, 'stateVersion')
  assert.ok(json.continuationProtocol.browserHelpers.includes('waitForNextSubmissionWindow()'))
  assert.ok(json.submissionChecklist.some((item) => item.includes('First round starts with 100 gold')))
  assert.ok(json.partCatalog.some((part) => part.id === 'Body_Square_Medium' && part.cost === 22))
  assert.ok(json.partCatalog.some((part) => part.id === 'Weapon_Spinner_Small'))
  assert.equal(json.examples.roundPlanSubmission.blueprint.name, 'Baseline Spinner')
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
        action.name === 'get_replay' &&
        action.method === 'GET' &&
        action.path === '/sessions/:sessionId/replay' &&
        action.phase === 'replay_phase | referee_awards' &&
        action.returns.includes('botBlueprints') &&
        action.returns.includes('pending submissions are not public before resolution'),
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_referee_awards' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/referee-awards',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'submit_chat_message' &&
        action.method === 'POST' &&
        action.path === '/sessions/:sessionId/chat',
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
  assert.equal(blueBootstrap.json.nextAction, 'submit_round_plan')
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

  const publicState = await route(env, `/sessions/${sessionId}/public`)

  assert.equal(publicState.json.chatLog[0].message, 'Bring something that can turn.')
  assertRedactedPublicState(publicState.json, [
    redInvite.claimToken,
    blueInvite.claimToken,
  ])
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

  const earlyReplay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(earlyReplay.response.status, 404)
  assert.equal(earlyReplay.json.error.code, 'REPLAY_NOT_AVAILABLE')

  const preResolveState = await route(env, `/sessions/${sessionId}/state`, { token: redToken })

  assert.equal(preResolveState.response.status, 200)
  assert.equal(preResolveState.json.role, 'red')
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
  assert.equal(blueSubmission.json.publicState.phase, 'referee_awards')
  assert.equal(blueSubmission.json.publicState.roles.red.submitted, true)
  assert.equal(blueSubmission.json.publicState.roles.blue.submitted, true)
  assert.equal(blueSubmission.json.publicState.replayAvailable, true)
  assert.equal(blueSubmission.json.publicState.awardOptions.length, 3)

  const replay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(replay.response.status, 200)
  assert.equal(validateReplayTimeline(replay.json), true)
  assert.equal(replay.json.botBlueprints?.red?.name, 'Spinner')
  assert.equal(replay.json.botBlueprints?.blue?.name, 'Spinner')
  assert.equal(replay.json.botBlueprints?.red?.blocks?.length > 0, true)
  assert.equal(replay.json.botBlueprints?.blue?.blocks?.length > 0, true)
  assert.equal(replay.json.botBlueprints?.red?.blocks[0].id, 'core')
  assert.equal(replay.json.botBlueprints?.red?.blocks[0].partId, 'Body_Square_Medium')

  const invalidAwardsToken = await route(env, `/sessions/${sessionId}/referee-awards`, {
    method: 'POST',
    token: redToken,
    body: { awards: [] },
  })

  assert.equal(invalidAwardsToken.response.status, 401)
  assert.equal(invalidAwardsToken.json.error.code, 'INVALID_TOKEN')

  const invalidAwards = await route(env, `/sessions/${sessionId}/referee-awards`, {
    method: 'POST',
    token: refereeToken,
    body: {
      awards: [
        {
          awardId: blueSubmission.json.publicState.awardOptions[0].id,
          targetTeam: 'red',
        },
        {
          awardId: blueSubmission.json.publicState.awardOptions[1].id,
          targetTeam: 'red',
        },
      ],
    },
  })

  assert.equal(invalidAwards.response.status, 400)
  assert.equal(invalidAwards.json.error.code, 'SUBMISSION_INVALID')

  const awards = await route(env, `/sessions/${sessionId}/referee-awards`, {
    method: 'POST',
    token: refereeToken,
    body: {
      awards: [
        {
          awardId: blueSubmission.json.publicState.awardOptions[0].id,
          targetTeam: 'blue',
        },
      ],
    },
  })

  assert.equal(awards.response.status, 200)
  assert.equal(awards.json.publicState.phase, 'submission_phase')
  assert.equal(awards.json.publicState.round, 2)
  assert.equal(awards.json.publicState.roles.red.submitted, false)
  assert.equal(awards.json.publicState.roles.blue.submitted, false)

  const publicState = await route(env, `/sessions/${sessionId}/public`)

  assert.equal(publicState.response.status, 200)
  assert.equal(publicState.json.phase, 'submission_phase')
  assert.equal(typeof publicState.json.stateVersion, 'string')
  assert.equal(publicState.json.replayAvailable, false)
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
