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
  chatLog: [
    {
      id: 's_demo:chat:1',
      at: '2026-06-03T12:01:00.000Z',
      round: 1,
      phase: 'submission_phase',
      role: 'blue',
      kind: 'taunt',
      message: 'Try turning faster.',
    },
  ],
  privateChatLog: [
    {
      id: 's_demo:red:private-chat:1',
      at: '2026-06-03T12:01:30.000Z',
      round: 1,
      phase: 'submission_phase',
      role: 'red',
      kind: 'strategy',
      message: 'Keep traction budget available for round two.',
    },
  ],
  eventLog: [
    {
      at: '2026-06-03T12:00:00.000Z',
      type: 'role_claimed',
      message: 'red role claimed.',
    },
  ],
}

function combatSnapshot() {
  const baseBot = {
    position: [-6, 0, 0],
    health: 100,
    maxHealth: 100,
    partHealth: { core: 100 },
    stats: {
      armor: 0,
      chaos: 0,
      control: 0,
      durability: 100,
      footprint: 1,
      mass: 10,
      mobility: 10,
      stability: 10,
      style: 0,
      traction: 10,
      weaponThreat: 8,
    },
    hasUtilityControl: false,
    hasWeaponControl: true,
    weaponSlotCount: 1,
    weaponReach: 2,
    statuses: [],
    cooldowns: {},
    charges: {},
  }

  return {
    tick: 1,
    arena: { name: 'Compact Box', width: 24, height: 16, activeHazards: ['floor_saw'] },
    distance: 12,
    hardMaxTicks: 600,
    recentEvents: ['red spawned', 'blue spawned'],
    red: { ...baseBot, role: 'red' },
    blue: { ...baseBot, role: 'blue', position: [6, 0, 0] },
  }
}

const roundPlan = {
  action: 'submit_round_plan',
  schemaVersion: 2,
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
  tactics: {
    movementPolicy: 'hold_ground',
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
      chatLog: roleState.chatLog,
      eventLog: roleState.eventLog,
    },
  })

  assert.ok(brief.includes('You are the RED agent for session s_demo.'))
  assert.ok(brief.includes('https://arena.test/agent#session=s_demo&role=red&claimToken=cap_red&api=https%3A%2F%2Farena-api.test'))
  assert.ok(brief.includes('Contract: https://arena-api.test/agent-spec.json'))
  assert.ok(brief.includes('Player key / claimToken: cap_red'))
  assert.ok(brief.includes('## Do this first'))
  assert.ok(brief.includes('Default path: use the invite page helpers.'))
  assert.ok(brief.includes('keep this role thread alive with `waitForNextAction({ timeoutMs: 600000 })`'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/roles/red/bootstrap'))
  assert.ok(brief.includes('Authorization: Bearer <claimToken>'))
  assert.ok(brief.includes('## Browser page API'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/claim'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/chat'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/private-chat'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/turn-command'))
  assert.ok(brief.includes('window.AgentArenaRole.submitPrivateChatMessage'))
  assert.ok(brief.includes('window.AgentArenaRole.submitTurnCommand'))
  assert.ok(brief.includes('Do not submit hidden chain-of-thought'))
  assert.ok(brief.includes('window.AgentArenaRole.bootstrapRole'))
  assert.ok(brief.includes('window.AgentArenaRole.waitForNextAction({ timeoutMs: 600000 })'))
  assert.ok(brief.includes('submitRoundPlan(plan)'))
  assert.equal(brief.includes('window.AgentArenaRole.submitFallbackRoundPlan()'), false)
  assert.ok(brief.includes('If a submit succeeds, stop submitting that same build or turn'))
  assert.ok(brief.includes('Do not keep retrying'))
  assert.ok(brief.includes('## Only if browser helpers fail'))
  assert.ok(brief.includes('## Browser page API'))
  assert.ok(brief.includes('Build one legal custom v2 round plan'))
  assert.ok(brief.includes('contract.designPatterns'))
  assert.ok(brief.includes('not fixed classes'))
  assert.ok(brief.includes('## Strategy guidance'))
  assert.ok(brief.includes('state.combat.decision'))
  assert.ok(brief.includes('legalCommands'))
  assert.ok(brief.includes('movementOptions'))
  assert.ok(brief.includes('actionReadiness'))
  assert.ok(brief.includes('Kite And Punish'))
  assert.ok(brief.includes('120 second deadline'))
  assert.equal(brief.includes('## Fallback round plan'), false)
  assert.equal(brief.includes('Baseline Spinner'), false)
  assert.ok(brief.includes('Phase: submission_phase'))
  assert.ok(brief.includes('Gold: 100'))
  assert.ok(brief.includes('State version: v1'))
  assert.ok(brief.includes('## Continuation loop'))
  assert.ok(brief.includes('Timeout: 600000ms'))
  assert.ok(brief.includes('Watch field: stateVersion'))
  assert.equal(brief.includes('Body_Square_Medium'), false)
  assert.equal(brief.includes('Weapon_Spinner_Small'), false)
  assert.ok(brief.includes('script#agent-arena-brief'))
})

test('agent client bootstraps with invite claim token as bearer player key', async () => {
  const calls = []
  const client = new AgentArenaClient({
    invite,
    fetchImpl: async (url, init = {}) => {
      const headers = new Headers(init.headers)
      calls.push({
        url: String(url),
        method: init.method ?? 'GET',
        authorization: headers.get('authorization'),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      })

      return jsonResponse({
        sessionId: invite.sessionId,
        role: invite.role,
        claimedNow: true,
        state: roleState,
        publicState: {
          sessionId: invite.sessionId,
          stateVersion: 'v1',
          phase: 'waiting_for_agents',
          round: 1,
          maxRounds: 7,
          expiresAt: '2026-06-03T18:00:00.000Z',
          arena: {
            name: 'Test Box',
            width: 24,
            height: 16,
            activeHazards: [],
          },
          roles: {
            red: { role: 'red', claimed: true, submitted: false },
            blue: { role: 'blue', claimed: false, submitted: false },
          },
          replayAvailable: false,
          eventLog: roleState.eventLog,
        },
        nextAction: 'wait_for_opponent_claim',
      })
    },
  })

  const bootstrap = await client.bootstrapRole({ agentName: 'External Red' })

  assert.equal(bootstrap.claimedNow, true)
  assert.equal(bootstrap.nextAction, 'wait_for_opponent_claim')
  assert.deepEqual(calls, [
    {
      url: 'https://arena-api.test/sessions/s_demo/roles/red/bootstrap',
      method: 'POST',
      authorization: 'Bearer cap_red',
      body: { agentName: 'External Red' },
    },
  ])
})

test('agent client waits for the next playable action with a bounded timer', async () => {
  let bootstrapCalls = 0
  const client = new AgentArenaClient({
    invite,
    fetchImpl: async (url) => {
      assert.equal(String(url), `${invite.apiBase}/sessions/s_demo/roles/red/bootstrap`)
      bootstrapCalls += 1

      return jsonResponse({
        sessionId: invite.sessionId,
        role: invite.role,
        claimedNow: false,
        state: {
          ...roleState,
          submitted: bootstrapCalls === 1,
          stateVersion: bootstrapCalls === 1 ? 'v1' : 'v2',
        },
        publicState: {
          sessionId: invite.sessionId,
          stateVersion: bootstrapCalls === 1 ? 'v1' : 'v2',
          phase: 'submission_phase',
          round: 1,
          maxRounds: 7,
          expiresAt: roleState.expiresAt,
          arena: {
            name: 'Compact Box',
            width: 24,
            height: 16,
            activeHazards: [],
          },
          roles: {
            red: { role: 'red', claimed: true, submitted: bootstrapCalls === 1 },
            blue: { role: 'blue', claimed: true, submitted: true },
          },
          replayAvailable: false,
          eventLog: roleState.eventLog,
        },
        nextAction: bootstrapCalls === 1 ? 'wait_for_opponent_submission' : 'submit_round_plan',
      })
    },
  })

  const next = await client.waitForNextAction({ pollMs: 1, timeoutMs: 2_500 })

  assert.equal(bootstrapCalls, 2)
  assert.equal(next.nextAction, 'submit_round_plan')
  assert.equal(next.state.stateVersion, 'v2')
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

      if (call.url.endsWith('/turn-command')) {
        return jsonResponse({
          state: {
            ...roleState,
            phase: 'combat_turn',
            combat: {
              tick: 2,
              openedAt: '2026-06-03T12:02:00.000Z',
              deadlineAt: '2026-06-03T12:04:00.000Z',
              turnSeconds: 120,
              submitted: { red: false, blue: false },
              snapshot: combatSnapshot(),
              self: combatSnapshot().red,
              opponent: combatSnapshot().blue,
            },
          },
          publicState: {
            sessionId: invite.sessionId,
            stateVersion: 'v3',
            phase: 'combat_turn',
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
              blue: { role: 'blue', claimed: true, submitted: true },
            },
            combat: {
              tick: 2,
              openedAt: '2026-06-03T12:02:00.000Z',
              deadlineAt: '2026-06-03T12:04:00.000Z',
              turnSeconds: 120,
              submitted: { red: false, blue: false },
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
  const turn = await client.submitTurnCommand({
    action: 'submit_turn_command',
    tick: 1,
    move: 'brake',
    weaponA: 'hold',
  })

  assert.equal(claim.roleToken, 'role_red')
  assert.equal(state.role, 'red')
  assert.equal(submission.state.submitted, true)
  assert.equal(turn.state.combat.tick, 2)
  assert.deepEqual(
    calls.map((call) => [call.method, call.url.replace(invite.apiBase, ''), call.authorization]),
    [
      ['POST', '/sessions/s_demo/claim', null],
      ['GET', '/sessions/s_demo/state', 'Bearer role_red'],
      ['POST', '/sessions/s_demo/round-plan', 'Bearer role_red'],
      ['POST', '/sessions/s_demo/turn-command', 'Bearer role_red'],
    ],
  )
  assert.deepEqual(calls[0].body, {
    role: 'red',
    claimToken: 'cap_red',
    agentName: 'Red',
  })
  assert.deepEqual(calls[3].body, {
    action: 'submit_turn_command',
    tick: 1,
    move: 'brake',
    weaponA: 'hold',
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
      ['bootstrap_role', true],
      ['claim_role', false],
      ['get_role_state', true],
      ['get_match_log', true],
      ['get_chat_log', true],
      ['get_private_chat_log', true],
      ['wait_for_state_change', true],
      ['wait_for_next_submission_window', false],
      ['wait_for_next_action', true],
      ['submit_round_plan', true],
      ['submit_turn_command', false],
      ['submit_chat_message', true],
      ['submit_private_chat_message', true],
    ],
  )

  const combatActions = getValidAgentActions({
    ...roleState,
    phase: 'combat_turn',
    combat: {
      tick: 1,
      openedAt: '2026-06-03T12:02:00.000Z',
      deadlineAt: '2026-06-03T12:04:00.000Z',
      turnSeconds: 120,
      submitted: { red: false, blue: true },
      snapshot: combatSnapshot(),
      self: combatSnapshot().red,
      opponent: combatSnapshot().blue,
    },
  })
  assert.equal(
    combatActions.find((action) => action.name === 'submit_turn_command')?.available,
    true,
  )
})

test('browser role API marks submit action unavailable when role is locked', async () => {
  const lockedState = { ...roleState, phase: 'round_review' }
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

test('browser role API marks role-gated actions unavailable before claim', async () => {
  const actions = getValidAgentActions(null)

  assert.deepEqual(
    actions.map((action) => action.available),
    [true, true, true, false, false, false, false, false, false, false, false, false, false, false],
  )
})

test('browser role API can claim through the invite page helper', async () => {
  let claimedName
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => undefined,
    fetchImpl: async () => jsonResponse(roleState),
  })
  const roleApi = createAgentArenaRoleApi(client, () => null, {
    claimRole: async (input) => {
      claimedName = input?.agentName

      return {
        sessionId: invite.sessionId,
        role: invite.role,
        roleToken: 'role_red',
        state: roleState,
      }
    },
  })
  const claim = await roleApi.claimRole({ agentName: 'Browser Red' })

  assert.equal(claimedName, 'Browser Red')
  assert.equal(claim.roleToken, 'role_red')
})

test('browser role API bootstrap override keeps follow-up actions state-aware', async () => {
  let currentState = null
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'cap_red',
    fetchImpl: async () => jsonResponse(roleState),
  })
  const roleApi = createAgentArenaRoleApi(client, () => currentState, {
    bootstrapRole: async () => {
      currentState = roleState

      return {
        sessionId: invite.sessionId,
        role: invite.role,
        claimedNow: false,
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
            activeHazards: [],
          },
          roles: {
            red: { role: 'red', claimed: true, submitted: false },
            blue: { role: 'blue', claimed: true, submitted: false },
          },
          replayAvailable: false,
          eventLog: roleState.eventLog,
        },
        nextAction: 'submit_round_plan',
      }
    },
  })

  const bootstrap = await roleApi.bootstrapRole()
  const actions = await roleApi.getValidActions()
  const submitAction = actions.find((action) => action.name === 'submit_round_plan')

  assert.equal(bootstrap.nextAction, 'submit_round_plan')
  assert.equal(submitAction?.available, true)
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

test('browser role API posts and reads public chat through authenticated endpoints', async () => {
  const calls = []
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async (url, init = {}) => {
      const headers = new Headers(init.headers)
      calls.push({
        url: String(url),
        method: init.method ?? 'GET',
        authorization: headers.get('authorization'),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      })

      if (String(url).endsWith('/chat')) {
        return jsonResponse({
          message: {
            id: 's_demo:chat:2',
            at: '2026-06-03T12:02:00.000Z',
            round: 1,
            phase: 'submission_phase',
            role: 'red',
            kind: 'strategy',
            message: 'Your armor held, but your drive looked slow.',
          },
          state: {
            ...roleState,
            chatLog: [
              ...roleState.chatLog,
              {
                id: 's_demo:chat:2',
                at: '2026-06-03T12:02:00.000Z',
                round: 1,
                phase: 'submission_phase',
                role: 'red',
                kind: 'strategy',
                message: 'Your armor held, but your drive looked slow.',
              },
            ],
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
              red: { role: 'red', claimed: true, submitted: false },
              blue: { role: 'blue', claimed: true, submitted: false },
            },
            replayAvailable: false,
            chatLog: roleState.chatLog,
            eventLog: roleState.eventLog,
          },
        })
      }

      return jsonResponse(roleState)
    },
  })
  const roleApi = createAgentArenaRoleApi(client, () => roleState)
  const posted = await roleApi.submitChatMessage({
    kind: 'strategy',
    message: 'Your armor held, but your drive looked slow.',
  })
  const chatLog = await roleApi.getChatLog()

  assert.equal(posted.message.kind, 'strategy')
  assert.deepEqual(chatLog, roleState.chatLog)
  assert.deepEqual(
    calls.map((call) => [call.method, call.url.replace(invite.apiBase, ''), call.authorization]),
    [
      ['POST', '/sessions/s_demo/chat', 'Bearer role_red'],
      ['GET', '/sessions/s_demo/state', 'Bearer role_red'],
    ],
  )
  assert.deepEqual(calls[0].body, {
    kind: 'strategy',
    message: 'Your armor held, but your drive looked slow.',
  })
})

test('browser role API posts and reads private notes through authenticated endpoints', async () => {
  const calls = []
  const privateMessage = {
    id: 's_demo:red:private-chat:2',
    at: '2026-06-03T12:03:00.000Z',
    round: 1,
    phase: 'submission_phase',
    role: 'red',
    kind: 'strategy',
    message: 'Keep the next build compact and invest in turning.',
  }
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async (url, init = {}) => {
      const headers = new Headers(init.headers)
      calls.push({
        url: String(url),
        method: init.method ?? 'GET',
        authorization: headers.get('authorization'),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      })

      if (String(url).endsWith('/private-chat')) {
        return jsonResponse({
          message: privateMessage,
          state: {
            ...roleState,
            privateChatLog: [
              ...roleState.privateChatLog,
              privateMessage,
            ],
          },
        })
      }

      return jsonResponse(roleState)
    },
  })
  const roleApi = createAgentArenaRoleApi(client, () => roleState)
  const posted = await roleApi.submitPrivateChatMessage({
    kind: 'strategy',
    message: 'Keep the next build compact and invest in turning.',
  })
  const privateChatLog = await roleApi.getPrivateChatLog()

  assert.equal(posted.message.kind, 'strategy')
  assert.equal(posted.state.privateChatLog.at(-1).message, privateMessage.message)
  assert.deepEqual(privateChatLog, roleState.privateChatLog)
  assert.deepEqual(
    calls.map((call) => [call.method, call.url.replace(invite.apiBase, ''), call.authorization]),
    [
      ['POST', '/sessions/s_demo/private-chat', 'Bearer role_red'],
      ['GET', '/sessions/s_demo/state', 'Bearer role_red'],
    ],
  )
  assert.deepEqual(calls[0].body, {
    kind: 'strategy',
    message: 'Keep the next build compact and invest in turning.',
  })
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
