import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgentArenaApiError,
  AgentArenaClient,
  createAgentArenaRoleApi,
  clearStoredTeamIdentity,
  createAgentInviteUrl,
  createAgentTeamIdentityStorageKey,
  createExternalAgentBriefMarkdown,
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
  actionSetId: 'red:r1:loadout:v1',
  instruction: 'Choose exactly one legal loadout action.',
  resources: {
    gold: 100,
    remainingGold: 100,
    partLimitRemaining: 12,
  },
  legalActions: [
    {
      id: 'loadout.red.r1.confirm',
      kind: 'confirm_loadout',
      label: 'Confirm loadout',
      summary: 'Lock the current bot design.',
    },
  ],
  submit: {
    method: 'POST',
    path: '/sessions/s_demo/action',
    body: {
      action: 'submit_game_action',
      actionSetId: 'red:r1:loadout:v1',
      decisionVersion: 1,
      actionId: '<legalActions.id>',
    },
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
  gameMaster: gameMasterPacket,
}

const gameActionSubmission = {
  action: 'submit_game_action',
  actionSetId: gameMasterPacket.actionSetId,
  decisionVersion: gameMasterPacket.decisionVersion,
  actionId: gameMasterPacket.legalActions[0].id,
}

const parameterizedGameActionSubmission = {
  ...gameActionSubmission,
  parameters: {
    destinationCellId: 'cell:5:2',
    targetId: 'opponent',
    targetCellId: 'cell:5:6',
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

  assert.ok(brief.includes('You are assigned role key `red` for session s_demo.'))
  assert.ok(brief.includes('This role key is not your team identity.'))
  assert.ok(brief.includes('https://arena.test/agent#session=s_demo&role=red&claimToken=cap_red&api=https%3A%2F%2Farena-api.test'))
  assert.ok(brief.includes('Contract: https://arena-api.test/agent-spec.json'))
  assert.ok(brief.includes('Actions schema: https://arena-api.test/openapi.json'))
  assert.ok(brief.includes('Player key / claimToken: cap_red'))
  assert.ok(brief.includes('## Do This First'))
  assert.ok(brief.includes('Generate your team identity, including its team color'))
  assert.ok(brief.includes('including its team color'))
  assert.ok(brief.includes('team color for your robot and UI label'))
  assert.ok(brief.includes('this handoff intentionally does not prefill it'))
  assert.ok(brief.includes('Custom GPT: import the Actions schema'))
  assert.ok(brief.includes('Browser automation agent with page JavaScript'))
  assert.ok(brief.includes('## Custom GPT Actions Path'))
  assert.ok(brief.includes('Do not use `window.AgentArenaRole` from a Custom GPT.'))
  assert.ok(brief.includes('## Browser Helper Path'))
  assert.ok(brief.includes('## Raw HTTP Fallback'))
  assert.ok(brief.includes('window.AgentArenaRole.waitForGameMasterPacket({ timeoutMs: 600000 })'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/roles/red/bootstrap'))
  assert.ok(brief.includes('GET https://arena-api.test/sessions/s_demo/state'))
  assert.ok(brief.includes('The packet is in `gameMaster`'))
  assert.ok(brief.includes('After the first bootstrap, do not keep resending teamIdentity'))
  assert.ok(brief.includes('Authorization: Bearer <claimToken>'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/action'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/chat'))
  assert.ok(brief.includes('POST https://arena-api.test/sessions/s_demo/reflection'))
  assert.ok(brief.includes('window.AgentArenaRole.bootstrapRole'))
  assert.ok(brief.includes('const agentName = \'<invent an agent name>\''))
  assert.ok(brief.includes('getTeamIdentityFromYourAgentState'))
  assert.ok(brief.includes('const packet = await window.AgentArenaRole.bootstrapRole({ agentName, teamIdentity })'))
  assert.ok(brief.includes('window.AgentArenaRole.submitAction'))
  assert.equal(brief.includes("colorHex: '<choose a #RRGGBB accent color>'"), false)
  assert.equal(brief.includes('You are the RED agent'), false)
  assert.ok(brief.includes('"action":"submit_game_action"'))
  assert.ok(brief.includes('"actionSetId":"<packet.actionSetId>"'))
  assert.ok(brief.includes('"actionId":"<legalActions[0].id>"'))
  assert.ok(brief.includes('actionId must be copied from legalActions exactly.'))
  assert.ok(brief.includes('packet.board.cells[].legal'))
  assert.ok(brief.includes('Inspect each legal action parameterSchema before submitting'))
  assert.ok(brief.includes("candidate.kind === 'propose_mount_pose'"))
  assert.ok(brief.includes("actionId: action.id"))
  assert.ok(brief.includes("parentInstanceId: 'core'"))
  assert.ok(brief.includes('Machine legality is not strategy quality'))
  assert.ok(brief.includes('shop and budget constraints still apply'))
  assert.ok(brief.includes('Reflection claims should be concise post-fight analysis, not hidden chain-of-thought.'))
  assert.ok(brief.includes('Phase: submission_phase'))
  assert.ok(brief.includes('State version: v1'))
  assert.ok(brief.includes('## Continuation Loop'))
  assert.ok(brief.includes('Timeout: 600000ms'))
  assert.ok(brief.includes('Watch field: eventVersion'))
  assert.ok(brief.includes('script#agent-arena-brief'))

  for (const legacyPublicName of [
    'submitRoundPlan',
    'submitTurnCommand',
    'submit_round_plan',
    'submit_turn_command',
    'movementOptions',
    'legalCommands',
    '/round-plan',
    '/turn-command',
    'primaryColor',
    'logo: {',
    'Baseline Spinner',
  ]) {
    assert.equal(brief.includes(legacyPublicName), false, legacyPublicName)
  }
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
  assert.equal(bootstrap.legalActions[0].id, 'loadout.red.r1.confirm')
  assert.deepEqual(calls, [
    {
      url: 'https://arena-api.test/sessions/s_demo/roles/red/bootstrap',
      method: 'POST',
      authorization: 'Bearer cap_red',
      body: { agentName: 'External Red' },
    },
  ])
})

test('agent client waits for the next GameMasterPacket through role state after bootstrap', async () => {
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
              gameMaster: {
                ...gameMasterPacket,
                eventVersion: 1,
                legalActions: [],
                nextAction: 'wait_for_opponent_loadout',
              },
            }
          : {
              ...roleState,
              gameMaster: {
                ...gameMasterPacket,
                eventVersion: 2,
              },
            },
      )
    },
  })

  const next = await client.waitForGameMasterPacket({ pollMs: 1, timeoutMs: 2_500 })

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

test('agent client claims, reads state, and submits GameMaster action ids with bearer auth', async () => {
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
            legalActions: [],
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
  const submission = await client.submitAction(gameActionSubmission)

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
  assert.deepEqual(calls[2].body, gameActionSubmission)
})

test('agent client submits schema-defined GameMaster action parameters', async () => {
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

  await client.submitAction(parameterizedGameActionSubmission)

  assert.equal(calls[0].url.endsWith('/action'), true)
  assert.deepEqual(calls[0].body, parameterizedGameActionSubmission)
})

test('agent client rejects submitAction gameplay payload fields before posting', async () => {
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
      client.submitAction({
        ...gameActionSubmission,
        move: 'forward',
      }),
    (error) => {
      assert.equal(error instanceof AgentArenaApiError, true)
      assert.equal(error.status, 400)
      assert.equal(error.code, 'INVALID_REQUEST')
      assert.match(error.message, /actionSetId/)

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
    () => client.submitAction(gameActionSubmission),
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
      'submitAction',
      'submitPostFightReflection',
      'waitForGameMasterPacket',
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
      ['wait_for_game_master_packet', true],
      ['submit_game_action', true],
      ['submit_post_fight_reflection', false],
      ['send_chat_message', true],
    ],
  )
})

test('browser role API marks submit action unavailable when role is locked', async () => {
  const lockedState = {
    ...roleState,
    phase: 'round_review',
    gameMaster: {
      ...gameMasterPacket,
      legalActions: [],
      nextAction: 'view_replay',
      phase: 'round_review',
    },
  }
  const actions = getValidAgentActions(lockedState)
  const submitAction = actions.find((action) => action.name === 'submit_game_action')

  assert.equal(submitAction?.available, false)
  assert.ok(Boolean(submitAction?.reason))
})

test('browser role API marks role-gated actions unavailable before claim', async () => {
  const actions = getValidAgentActions(null)

  assert.deepEqual(
    actions.map((action) => action.available),
    [true, false, false, false, false, false],
  )
})

test('browser role API bootstrap override returns GameMasterPacket actions', async () => {
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
  assert.equal(bootstrap.legalActions[0].id, 'loadout.red.r1.confirm')
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
  assert.equal(state.gameMaster.legalActions[0].id, 'loadout.red.r1.confirm')
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
            legalActions: [],
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
