import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgentArenaSession,
  handleWorkerRequest,
} from '../.test-build/apps/worker/src/index.js'

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
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'create_session' &&
        action.method === 'POST' &&
        action.path === '/sessions',
    ),
  )
  assert.ok(
    json.actions.some(
      (action) =>
        action.name === 'get_replay' &&
        action.method === 'GET' &&
        action.path === '/sessions/:sessionId/replay' &&
        action.phase === 'replay_phase | referee_awards' &&
        action.returns.includes('while replayAvailable is true'),
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
  const { response, json } = await route({}, '/sessions', {
    method: 'POST',
    body: { sessionId: 's_missing_binding' },
  })

  assert.equal(response.status, 500)
  assert.equal(json.ok, false)
  assert.equal(json.error.code, 'WORKER_NOT_CONFIGURED')
})

test('worker rejects invalid session ids before Durable Object routing', async () => {
  const env = createEnv()
  const created = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId: 'not valid' },
  })
  const routed = await route(env, '/sessions/not%20valid/public')

  assert.equal(created.response.status, 400)
  assert.equal(created.json.error.code, 'INVALID_REQUEST')
  assert.equal(routed.response.status, 400)
  assert.equal(routed.json.error.code, 'INVALID_REQUEST')
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
  assert.equal(typeof created.json.refereeToken, 'string')

  const duplicate = await route(env, '/sessions', {
    method: 'POST',
    body: { sessionId, seed: 'route-seed' },
  })

  assert.equal(duplicate.response.status, 409)
  assert.equal(duplicate.json.error.code, 'SESSION_EXISTS')

  const redInvite = inviteFor(created.json.invites, 'red')
  const blueInvite = inviteFor(created.json.invites, 'blue')
  const redClaim = await route(env, `/sessions/${sessionId}/claim`, {
    method: 'POST',
    body: {
      role: 'red',
      claimToken: redInvite.claimToken,
      agentName: 'Red Bot',
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
  const refereeToken = created.json.refereeToken
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
  assert.equal(redState.json.opponent.role, 'blue')
  assert.equal(redState.json.opponent.claimed, true)
  assert.equal(redState.json.ownSubmission, undefined)
  assertRedactedPublicState(redState.json.opponent, [
    redInvite.claimToken,
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
  assert.equal(publicState.json.replayAvailable, false)
  assertRedactedPublicState(publicState.json, [
    redInvite.claimToken,
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

  const replay = await route(env, `/sessions/${sessionId}/replay`)

  assert.equal(replay.response.status, 404)
  assert.equal(replay.json.error.code, 'REPLAY_NOT_AVAILABLE')
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
