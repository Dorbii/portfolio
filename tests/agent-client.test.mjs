import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgentArenaApiError,
  AgentArenaClient,
  createAgentArenaRoleApi,
  clearStoredTeamIdentity,
  createAgentInviteUrl,
  createAgentTeamIdentityStorageKey,
  createAgentRoleStorageKey,
  createSafeAgentHash,
  getValidAgentActions,
  parseAgentInviteFragment,
  readStoredTeamIdentity,
  serializeJsonForScript,
  writeStoredTeamIdentity,
} from '../.test-build/apps/web/src/agent/agentClient.js'

const invite = {
  sessionId: 's_demo',
  role: 'red',
  apiBase: 'https://arena-api.test',
  claimToken: 'cap_red',
}

const gameMasterPacket = {
  sessionId: 's_demo',
  role: 'red',
  phase: 'choose_loadout',
  nextAction: 'build_bot',
  round: 1,
  decisionVersion: 1,
  eventVersion: 1,
  instruction: 'Build phase: read packet.build and submit one compact build action.',
  resources: {
    gold: 100,
    remainingGold: 100,
    partLimitRemaining: 64,
  },
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
  agentPacket: gameMasterPacket,
}

const surrenderSubmission = {
  action: 'surrender',
  decisionVersion: gameMasterPacket.decisionVersion,
  publicMessage: 'compact surrender',
}

const compactCombatPlanSubmission = {
  action: 'submit_combat_plan',
  decisionVersion: gameMasterPacket.decisionVersion,
  round: 1,
  steps: [{ kind: 'end_turn' }],
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

test('agent team identity storage preserves selected team accent without claim token leakage', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
  const key = createAgentTeamIdentityStorageKey(invite)

  writeStoredTeamIdentity(storage, invite, {
    name: '  Aqua Circuit QA  ',
    colorHex: '#00D6A3',
    logoPrompt: 'Aqua Circuit QA gear logo',
  })

  assert.equal(key.includes('cap_red'), false)
  assert.deepEqual(readStoredTeamIdentity(storage, invite), {
    name: 'Aqua Circuit QA',
    primaryColor: '#00d6a3',
    logo: { mark: 'gear', initials: 'ACQG' },
  })

  clearStoredTeamIdentity(storage, invite)

  assert.equal(readStoredTeamIdentity(storage, invite), undefined)
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

      return jsonResponse(gameMasterPacket)
    },
  })

  const bootstrap = await client.bootstrapRole({ agentName: 'External Red' })

  assert.equal(bootstrap.nextAction, 'build_bot')
  assert.equal(bootstrap.actionSetId, undefined)
  assert.equal(bootstrap.legalActions, undefined)
  assert.deepEqual(calls, [
    {
      url: 'https://arena-api.test/sessions/s_demo/roles/red/bootstrap',
      method: 'POST',
      authorization: 'Bearer cap_red',
      body: { agentName: 'External Red' },
    },
  ])
})

test('agent client waits for the next AgentConnectionPacket through role state after bootstrap', async () => {
  let stateCalls = 0
  const client = new AgentArenaClient({
    invite,
    fetchImpl: async (url, init = {}) => {
      assert.equal(String(url), `${invite.apiBase}/sessions/s_demo/state`)
      assert.equal(init.method ?? 'GET', 'GET')
      stateCalls += 1

      return jsonResponse(
        stateCalls === 1
          ? {
              ...roleState,
              agentPacket: {
                ...gameMasterPacket,
                eventVersion: 1,
                nextAction: 'wait_for_opponent_loadout',
              },
            }
          : {
              ...roleState,
              agentPacket: {
                ...gameMasterPacket,
                eventVersion: 2,
                build: compactBuildPacketFixture,
              },
            },
      )
    },
  })

  const next = await client.waitForAgentPacket({ pollMs: 1, timeoutMs: 2_500 })

  assert.equal(stateCalls, 2)
  assert.equal(next.nextAction, 'build_bot')
  assert.equal(next.eventVersion, 2)
})

test('agent state script serialization escapes html-sensitive text', () => {
  const serialized = serializeJsonForScript({
    value: '</script><div>bad</div>',
  })

  assert.equal(serialized.includes('</script>'), false)
  assert.equal(serialized.includes('\\u003c/script>'), true)
})

test('agent client claims, reads state, and submits compact surrender with bearer auth', async () => {
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

      if (call.url.endsWith('/action')) {
        return jsonResponse({
          packet: {
            ...gameMasterPacket,
            nextAction: 'wait_for_opponent_loadout',
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
  const submission = await client.surrender(surrenderSubmission)

  assert.equal(claim.roleToken, 'role_red')
  assert.equal(state.role, 'red')
  assert.equal(submission.packet.nextAction, 'wait_for_opponent_loadout')
  assert.deepEqual(
    calls.map((call) => [call.method, call.url.replace(invite.apiBase, ''), call.authorization]),
    [
      ['POST', '/sessions/s_demo/claim', null],
      ['GET', '/sessions/s_demo/state', 'Bearer role_red'],
      ['POST', '/sessions/s_demo/action', 'Bearer role_red'],
    ],
  )
  assert.deepEqual(calls[0].body, {
    role: 'red',
    claimToken: 'cap_red',
    agentName: 'Red',
  })
  assert.deepEqual(calls[2].body, surrenderSubmission)
})

test('agent client submits compact combat plans', async () => {
  const calls = []
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async (url, init = {}) => {
      calls.push({
        url: String(url),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      })

      return jsonResponse({
        packet: gameMasterPacket,
        publicState: {
          sessionId: invite.sessionId,
          stateVersion: 'v2',
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
            blue: { role: 'blue', claimed: true, submitted: false },
          },
          replayAvailable: false,
          eventLog: roleState.eventLog,
        },
      })
    },
  })

  await client.submitCombatPlan(compactCombatPlanSubmission)

  assert.equal(calls[0].url.endsWith('/combat-plan'), true)
  assert.deepEqual(calls[0].body, compactCombatPlanSubmission)
})

test('agent client rejects unsupported surrender payload fields before posting', async () => {
  const calls = []
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async (url) => {
      calls.push(String(url))

      return jsonResponse({})
    },
  })

  await assert.rejects(
    () =>
      client.surrender({
        ...surrenderSubmission,
        move: 'forward',
      }),
    (error) => {
      assert.equal(error instanceof AgentArenaApiError, true)
      assert.equal(error.status, 400)
      assert.equal(error.code, 'INVALID_REQUEST')
      assert.match(error.message, /surrender/)

      return true
    },
  )
  assert.deepEqual(calls, [])
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
    () => client.surrender(surrenderSubmission),
    (error) => {
      assert.equal(error instanceof AgentArenaApiError, true)
      assert.equal(error.status, 400)
      assert.equal(error.code, 'SUBMISSION_INVALID')
      assert.equal(error.issues[0].code, 'UNKNOWN_PART')
      assert.match(error.message, /purchases\.0\.partId/)
      assert.match(error.message, /UNKNOWN_PART/)
      assert.match(error.message, /Unknown part/)

      return true
    },
  )
})

test('browser role API exposes only the packet-based public helper surface', async () => {
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'role_red',
    fetchImpl: async () => jsonResponse(roleState),
  })
  const roleApi = createAgentArenaRoleApi(client, () => roleState)

  assert.deepEqual(
    Object.keys(roleApi).sort(),
    [
      'bootstrapRole',
      'getState',
      'sendChatMessage',
      'submitBuildAction',
      'submitCombatPlan',
      'submitPostFightReflection',
      'surrender',
      'waitForAgentPacket',
    ],
  )
  assert.equal('submitRoundPlan' in roleApi, false)
  assert.equal('submitTurnCommand' in roleApi, false)

  const actions = getValidAgentActions(roleState)

  assert.deepEqual(
    actions.map((action) => [action.name, action.available]),
    [
      ['bootstrap_role', true],
      ['get_role_state', true],
      ['wait_for_agent_packet', true],
      ['submit_build_action', false],
      ['submit_combat_plan', false],
      ['surrender', false],
      ['submit_post_fight_reflection', false],
      ['send_chat_message', true],
    ],
  )
})

test('browser role API marks compact actions unavailable when role is locked', async () => {
  const lockedState = {
    ...roleState,
    phase: 'round_review',
    agentPacket: {
      ...gameMasterPacket,
      nextAction: 'view_replay',
      phase: 'round_review',
    },
  }
  const actions = getValidAgentActions(lockedState)
  const buildAction = actions.find((action) => action.name === 'submit_build_action')
  const combatAction = actions.find((action) => action.name === 'submit_combat_plan')

  assert.equal(buildAction?.available, false)
  assert.ok(Boolean(buildAction?.reason))
  assert.equal(combatAction?.available, false)
  assert.ok(Boolean(combatAction?.reason))
})

test('browser role API marks role-gated actions unavailable before claim', async () => {
  const actions = getValidAgentActions(null)

  assert.deepEqual(
    actions.map((action) => action.available),
    [true, false, false, false, false, false, false, false],
  )
})

test('browser role API bootstrap override returns agent packets', async () => {
  let agentName
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'cap_red',
    fetchImpl: async () => jsonResponse(roleState),
  })
  const roleApi = createAgentArenaRoleApi(client, () => roleState, {
    bootstrapRole: async (input) => {
      agentName = input?.agentName

      return gameMasterPacket
    },
  })

  const bootstrap = await roleApi.bootstrapRole({ agentName: 'Browser Red' })

  assert.equal(agentName, 'Browser Red')
  assert.equal(bootstrap.nextAction, 'build_bot')
  assert.equal(bootstrap.legalActions, undefined)
})

test('browser role API reads private state through the client state endpoint', async () => {
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
  const state = await roleApi.getState()

  assert.equal(state.role, 'red')
  assert.equal(state.agentPacket.nextAction, 'build_bot')
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
  const posted = await roleApi.sendChatMessage({
    kind: 'strategy',
    message: 'Your armor held, but your drive looked slow.',
  })

  assert.equal(posted.message.kind, 'strategy')
  assert.deepEqual(
    calls.map((call) => [call.method, call.url.replace(invite.apiBase, ''), call.authorization]),
    [
      ['POST', '/sessions/s_demo/chat', 'Bearer role_red'],
    ],
  )
  assert.deepEqual(calls[0].body, {
    kind: 'strategy',
    message: 'Your armor held, but your drive looked slow.',
  })
})

test('browser role API posts post-fight reflection through the helper path', async () => {
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

      if (String(url).endsWith('/reflection')) {
        return jsonResponse({
          packet: {
            ...gameMasterPacket,
            nextAction: 'wait_for_debrief',
          },
        })
      }

      return jsonResponse(roleState)
    },
  })
  const roleApi = createAgentArenaRoleApi(client, () => roleState)
  const posted = await roleApi.submitPostFightReflection({
    action: 'submit_post_fight_reflection',
    fightId: 'fight_1',
    role: 'red',
    decisionVersion: 1,
    claims: {
      ownWeaknesses: ['drive exposed'],
      opponentThreats: ['net control'],
      suggestedDesignChanges: ['add side armor'],
      suggestedTacticalChanges: ['close distance earlier'],
    },
    confidence: 'medium',
  })

  assert.equal(posted.packet.nextAction, 'wait_for_debrief')
  assert.deepEqual(
    calls.map((call) => [call.method, call.url.replace(invite.apiBase, ''), call.authorization]),
    [
      ['POST', '/sessions/s_demo/reflection', 'Bearer role_red'],
    ],
  )
  assert.deepEqual(calls[0].body, {
    action: 'submit_post_fight_reflection',
    fightId: 'fight_1',
    role: 'red',
    decisionVersion: 1,
    claims: {
      ownWeaknesses: ['drive exposed'],
      opponentThreats: ['net control'],
      suggestedDesignChanges: ['add side armor'],
      suggestedTacticalChanges: ['close distance earlier'],
    },
    confidence: 'medium',
  })
})

const compactBuildPacketFixture = {
  v: 1,
  phase: 'build',
  round: 1,
  decisionVersion: 1,
  step: 'choose_part',
  budget: { gold: 100, parts: 64 },
  bot: {
    mode: 'new',
    summary: { hp: 20, maxHp: 20, mass: 0, armor: 0, stability: 0, movement: {}, weapons: [], utility: [] },
    partSchema: ['id', 'part', 'parent', 'hp', 'maxHp'],
    parts: [['core', 'body.Machine_Core', null, 20, 20]],
  },
  store: { foundation: [{ part: 'body.Frame_Strut', cost: 1, mass: 2, hp: 10 }], offers: [] },
  edit: { confirm: true, remove: [], removeSubtree: [], move: [], rotate: [] },
  requirements: { confirm_loadout: { ok: true, missing: [], issues: [] } },
  issues: [],
}

test('agent client treats compact build packets as playable', async () => {
  let stateCalls = 0
  const client = new AgentArenaClient({
    invite,
    fetchImpl: async () => {
      stateCalls += 1

      return jsonResponse({
        ...roleState,
        agentPacket: {
          ...gameMasterPacket,
          build: compactBuildPacketFixture,
        },
      })
    },
  })

  const next = await client.waitForAgentPacket({ pollMs: 1, timeoutMs: 2_500 })

  assert.equal(stateCalls, 1)
  assert.equal(next.phase, 'choose_loadout')
  assert.equal(next.build.step, 'choose_part')
  assert.equal(next.legalActions, undefined)
})

test('agent client submits compact build actions to the build-action endpoint', async () => {
  const requests = []
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => 'cap_red',
    fetchImpl: async (url, init = {}) => {
      requests.push({ url: String(url), init })

      return jsonResponse({
        packet: {
          ...gameMasterPacket,
          build: compactBuildPacketFixture,
        },
        publicState: { phase: 'submission_phase' },
      })
    },
  })

  const response = await client.submitBuildAction({
    action: 'submit_build_action',
    decisionVersion: 7,
    command: { kind: 'choose_part', part: 'body.Frame_Strut' },
    publicMessage: 'compact path',
  })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, `${invite.apiBase}/sessions/s_demo/build-action`)
  assert.equal(requests[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    action: 'submit_build_action',
    decisionVersion: 7,
    command: { kind: 'choose_part', part: 'body.Frame_Strut' },
    publicMessage: 'compact path',
  })
  assert.equal(response.packet.build.v, 1)

  await assert.rejects(
    () =>
      client.submitBuildAction({
        action: 'submit_build_action',
        decisionVersion: 7,
        command: { kind: 'confirm_loadout' },
        actionSetId: 'forged',
      }),
    (error) => error.code === 'INVALID_REQUEST',
  )
  assert.equal(requests.length, 1)
})

test('browser role API surfaces submit_build_action for compact build packets', () => {
  const compactState = {
    ...roleState,
    agentPacket: {
      ...gameMasterPacket,
      build: compactBuildPacketFixture,
    },
  }
  const actions = getValidAgentActions(compactState)
  const buildAction = actions.find((action) => action.name === 'submit_build_action')
  const combatAction = actions.find((action) => action.name === 'submit_combat_plan')

  assert.equal(buildAction?.available, true)
  assert.equal(combatAction?.available, false)
})
