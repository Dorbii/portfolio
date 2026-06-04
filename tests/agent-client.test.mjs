import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgentArenaApiError,
  AgentArenaClient,
  createAgentArenaRoleApi,
  createAgentInviteUrl,
  createExternalAgentBriefMarkdown,
  createAgentRoleStorageKey,
  createSafeAgentHash,
  getValidAgentActions,
  parseAgentInviteFragment,
  serializeJsonForScript,
} from '../.test-build/apps/web/src/agent/agentClient.js'

const invite = {
  sessionId: 's_demo',
  role: 'red',
  apiBase: 'https://arena-api.test',
  claimToken: 'cap_red',
}

const roleState = {
  sessionId: 's_demo',
  stateVersion: 'v1',
  role: 'red',
  phase: 'submission_phase',
  round: 1,
  expiresAt: '2026-06-03T12:00:00.000Z',
  gold: 100,
  inventory: [],
  submitted: false,
  opponent: {
    role: 'blue',
    claimed: true,
    submitted: false,
  },
  replayAvailable: false,
  eventLog: [
    {
      at: '2026-06-03T12:00:00.000Z',
      type: 'role_claimed',
      message: 'red role claimed.',
    },
  ],
}

const roundPlan = {
  action: 'submit_round_plan',
  purchases: [],
  blueprint: {
    name: 'Test',
    blocks: [
      {
        id: 'core',
        partId: 'Body_Square_Small',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
    ],
  },
  turnPlan: {
    commands: [
      { tick: 1, move: 'brake' },
      { tick: 2, move: 'brake' },
      { tick: 3, move: 'brake' },
      { tick: 4, move: 'brake' },
      { tick: 5, move: 'brake' },
    ],
  },
}

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

test('agent invite fragment parser accepts claimToken and api base', () => {
  const result = parseAgentInviteFragment(
    '#session=s_demo&role=red&claimToken=cap_red&api=https://arena-api.test/',
    'https://arena.test',
  )

  assert.equal(result.ok, true)
  assert.equal(result.value.sessionId, 's_demo')
  assert.equal(result.value.role, 'red')
  assert.equal(result.value.claimToken, 'cap_red')
  assert.equal(result.value.apiBase, 'https://arena-api.test')
})

test('agent invite fragment parser keeps invite alias compatible', () => {
  const result = parseAgentInviteFragment(
    '#session=s_demo&role=blue&invite=cap_blue&api=https://arena.test',
    'https://arena.test',
  )

  assert.equal(result.ok, true)
  assert.equal(result.value.claimToken, 'cap_blue')
  assert.equal(result.value.apiBase, 'https://arena.test')
})

test('agent invite fragment parser requires an explicit api value', () => {
  const result = parseAgentInviteFragment(
    '#session=s_demo&role=blue&invite=cap_blue',
    'https://arena.test',
  )

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((message) => message.includes('Missing required api')))
})

test('agent invite fragment parser accepts https and loopback http api bases only', () => {
  const httpsResult = parseAgentInviteFragment(
    '#session=s_demo&role=red&api=https://arena-api.test/',
    'https://arena.test',
  )
  const localhostResult = parseAgentInviteFragment(
    '#session=s_demo&role=red&api=http://localhost:5173/',
    'https://arena.test',
  )
  const ipv4Result = parseAgentInviteFragment(
    '#session=s_demo&role=red&api=http://127.0.0.1:8787/',
    'https://arena.test',
  )
  const ipv6Result = parseAgentInviteFragment(
    '#session=s_demo&role=red&api=http://[::1]:8787/',
    'https://arena.test',
  )
  const insecureResult = parseAgentInviteFragment(
    '#session=s_demo&role=red&api=http://arena-api.test',
    'https://arena.test',
  )
  const schemeResult = parseAgentInviteFragment(
    '#session=s_demo&role=red&api=ftp://arena-api.test',
    'https://arena.test',
  )

  assert.equal(httpsResult.ok, true)
  assert.equal(httpsResult.value.apiBase, 'https://arena-api.test')
  assert.equal(localhostResult.ok, true)
  assert.equal(localhostResult.value.apiBase, 'http://localhost:5173')
  assert.equal(ipv4Result.ok, true)
  assert.equal(ipv4Result.value.apiBase, 'http://127.0.0.1:8787')
  assert.equal(ipv6Result.ok, true)
  assert.equal(ipv6Result.value.apiBase, 'http://[::1]:8787')
  assert.equal(insecureResult.ok, false)
  assert.ok(insecureResult.errors.some((message) => message.includes('must use https')))
  assert.equal(schemeResult.ok, false)
  assert.ok(schemeResult.errors.some((message) => message.includes('must use https')))
})

test('agent invite fragment parser rejects unusable fragments', () => {
  const result = parseAgentInviteFragment(
    '#session=bad session&role=green&api=not a url',
    'https://arena.test',
  )

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((message) => message.includes('Session must start')))
  assert.ok(result.errors.some((message) => message.includes('Role must be red or blue')))
  assert.ok(result.errors.some((message) => message.includes('must use https')))
})

test('agent token helpers avoid writing invite capability into the scrubbed hash', () => {
  const key = createAgentRoleStorageKey(invite)
  const hash = createSafeAgentHash(invite)
  const inviteUrl = createAgentInviteUrl(invite)

  assert.equal(key.includes('cap_red'), false)
  assert.equal(hash.includes('cap_red'), false)
  assert.equal(hash.includes('claimToken'), false)
  assert.equal(inviteUrl.includes('claimToken=cap_red'), true)
  assert.equal(hash.includes('session=s_demo'), true)
})

test('external agent brief is self-contained enough to claim and submit', () => {
  const brief = createExternalAgentBriefMarkdown({
    invite,
    inviteUrl: createAgentInviteUrl(invite, 'https://arena.test'),
    state: roleState,
    publicState: {
      sessionId: invite.sessionId,
      stateVersion: 'v1',
      phase: 'submission_phase',
      round: 1,
      maxRounds: 7,
      expiresAt: roleState.expiresAt,
      arena: {
        name: 'Compact Box',
        width: 24,
        height: 16,
        activeHazards: ['floor_saw'],
      },
      roles: {
        red: { role: 'red', claimed: true, submitted: false },
        blue: { role: 'blue', claimed: true, submitted: false },
      },
      replayAvailable: false,
      eventLog: roleState.eventLog,
    },
  })

  assert.ok(brief.includes('You are the RED agent for session s_demo.'))
  assert.ok(brief.includes('https://arena.test/agent#session=s_demo&role=red&claimToken=cap_red&api=https%3A%2F%2Farena-api.test'))
  assert.ok(brief.includes('Contract: https://arena-api.test/agent-spec.json'))
  assert.ok(brief.includes('Preferred path: use the HTTP API directly.'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/claim'))
  assert.ok(brief.includes('If Browser, Chrome, Playwright, or another UI bridge fails'))
  assert.ok(brief.includes('Authorization: Bearer <roleToken>'))
  assert.ok(brief.includes('## HTTP requests'))
  assert.ok(brief.includes('Phase: submission_phase'))
  assert.ok(brief.includes('Gold: 100'))
  assert.ok(brief.includes('State version: v1'))
  assert.ok(brief.includes('## Continuation loop'))
  assert.ok(brief.includes('Watch field: stateVersion'))
  assert.ok(brief.includes('window.AgentArenaRole.waitForNextSubmissionWindow()'))
  assert.ok(brief.includes('Body_Square_Medium'))
  assert.ok(brief.includes('Weapon_Spinner_Small'))
  assert.ok(brief.includes('script#agent-arena-brief'))
})

test('agent state script serialization escapes html-sensitive text', () => {
  const serialized = serializeJsonForScript({
    value: '</script><div>bad</div>',
  })

  assert.equal(serialized.includes('</script>'), false)
  assert.equal(serialized.includes('\\u003c/script>'), true)
})

test('agent client claims, reads state, and submits with bearer auth', async () => {
  const calls = []
  let roleToken
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => roleToken,
    fetchImpl: async (url, init = {}) => {
      const headers = new Headers(init.headers)
      const call = {
        url: String(url),
        method: init.method ?? 'GET',
        authorization: headers.get('authorization'),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      }

      calls.push(call)

      if (call.url.endsWith('/claim')) {
        return jsonResponse({
          sessionId: invite.sessionId,
          role: invite.role,
          roleToken: 'role_red',
          state: roleState,
        }, { status: 201 })
      }

      if (call.url.endsWith('/state')) {
        return jsonResponse(roleState)
      }

      if (call.url.endsWith('/round-plan')) {
        return jsonResponse({
          state: {
            ...roleState,
            submitted: true,
          },
          publicState: {
            sessionId: invite.sessionId,
            stateVersion: 'v2',
            phase: 'submission_phase',
            round: 1,
            maxRounds: 7,
            expiresAt: roleState.expiresAt,
            arena: {
              name: 'Compact Box',
              width: 24,
              height: 16,
              activeHazards: ['floor_saw'],
            },
            roles: {
              red: { role: 'red', claimed: true, submitted: true },
              blue: { role: 'blue', claimed: true, submitted: false },
            },
            replayAvailable: false,
            eventLog: roleState.eventLog,
          },
        })
      }

      throw new Error(`Unexpected URL ${call.url}`)
    },
  })

  const claim = await client.claimRole({ claimToken: 'cap_red', agentName: 'Red' })
  roleToken = claim.roleToken
  const state = await client.getState()
  const submission = await client.submitRoundPlan(roundPlan)

  assert.equal(claim.roleToken, 'role_red')
  assert.equal(state.role, 'red')
  assert.equal(submission.state.submitted, true)
  assert.deepEqual(
    calls.map((call) => [call.method, call.url.replace(invite.apiBase, ''), call.authorization]),
    [
      ['POST', '/sessions/s_demo/claim', null],
      ['GET', '/sessions/s_demo/state', 'Bearer role_red'],
      ['POST', '/sessions/s_demo/round-plan', 'Bearer role_red'],
    ],
  )
  assert.deepEqual(calls[0].body, {
    role: 'red',
    claimToken: 'cap_red',
    agentName: 'Red',
  })
})

test('agent client surfaces relay validation errors', async () => {
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async () =>
      jsonResponse(
        {
          ok: false,
          error: {
            code: 'SUBMISSION_INVALID',
            message: 'Round plan failed validation.',
            issues: [
              {
                code: 'UNKNOWN_PART',
                path: 'purchases.0.partId',
                message: 'Unknown part.',
              },
            ],
          },
        },
        { status: 400 },
      ),
  })

  await assert.rejects(
    () => client.submitRoundPlan(roundPlan),
    (error) => {
      assert.equal(error instanceof AgentArenaApiError, true)
      assert.equal(error.status, 400)
      assert.equal(error.code, 'SUBMISSION_INVALID')
      assert.equal(error.issues[0].code, 'UNKNOWN_PART')

      return true
    },
  )
})

test('browser role API exposes valid actions from current role state', async () => {
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async () => jsonResponse(roleState),
  })
  const roleApi = createAgentArenaRoleApi(client, () => roleState)
  const actions = await roleApi.getValidActions()

  assert.deepEqual(
    actions.map((action) => [action.name, action.available]),
    [
      ['get_contract', true],
      ['get_role_state', true],
      ['get_match_log', true],
      ['wait_for_state_change', true],
      ['wait_for_next_submission_window', false],
      ['submit_round_plan', true],
    ],
  )
})

test('browser role API marks submit action unavailable when role is locked', async () => {
  const lockedState = { ...roleState, phase: 'referee_awards' }
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async () => jsonResponse(lockedState),
  })
  const roleApi = createAgentArenaRoleApi(client, () => lockedState)
  const actions = await roleApi.getValidActions()
  const submitAction = actions.find((action) => action.name === 'submit_round_plan')

  assert.equal(submitAction?.available, false)
  assert.ok(Boolean(submitAction?.reason))
})

test('browser role API marks all actions unavailable before claim', async () => {
  const actions = getValidAgentActions(null)

  assert.deepEqual(
    actions.map((action) => action.available),
    [true, false, false, false, false, false],
  )
})

test('browser role API reads match log through the client state endpoint', async () => {
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async (url, init = {}) => {
      const headers = new Headers(init.headers)

      assert.equal(String(url), `${invite.apiBase}/sessions/s_demo/state`)
      assert.equal(headers.get('authorization'), 'Bearer role_red')

      return jsonResponse(roleState)
    },
  })
  const roleApi = createAgentArenaRoleApi(client, () => roleState)
  const matchLog = await roleApi.getMatchLog()

  assert.deepEqual(matchLog, roleState.eventLog)
})

test('browser role API waitForPhase returns matching phase and rejects terminal phases', async () => {
  const matchingClient = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async () => jsonResponse({ ...roleState, phase: 'replay_phase' }),
  })
  const matchingApi = createAgentArenaRoleApi(matchingClient, () => roleState)
  const replayState = await matchingApi.waitForPhase('replay_phase')

  assert.equal(replayState.phase, 'replay_phase')

  const terminalClient = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async () => jsonResponse({ ...roleState, phase: 'expired' }),
  })
  const terminalApi = createAgentArenaRoleApi(terminalClient, () => roleState)

  await assert.rejects(
    () => terminalApi.waitForPhase('replay_phase'),
    (error) => {
      assert.equal(error instanceof AgentArenaApiError, true)
      assert.equal(error.status, 409)
      assert.equal(error.code, 'SESSION_EXPIRED')

      return true
    },
  )
})

test('browser role API can wait on stateVersion or the next submission window', async () => {
  const changedClient = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async () => jsonResponse({ ...roleState, stateVersion: 'v2' }),
  })
  const changedApi = createAgentArenaRoleApi(changedClient, () => roleState)
  const changedState = await changedApi.waitForStateChange('v1')

  assert.equal(changedState.stateVersion, 'v2')

  const playableClient = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async () =>
      jsonResponse({
        ...roleState,
        stateVersion: 'v3',
        phase: 'submission_phase',
        submitted: false,
      }),
  })
  const playableApi = createAgentArenaRoleApi(playableClient, () => roleState)
  const playableState = await playableApi.waitForNextSubmissionWindow()

  assert.equal(playableState.phase, 'submission_phase')
  assert.equal(playableState.submitted, false)
})
