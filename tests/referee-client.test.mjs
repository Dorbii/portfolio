import assert from 'node:assert/strict'
import test from 'node:test'

import * as refereeClientModule from '../.test-build/apps/web/src/referee/refereeClient.js'
import {
  ACTIVE_REFEREE_POLL_INTERVAL_MS,
  DEFAULT_ARENA_API_BASE,
  DEFAULT_ARENA_SITE_BASE,
  IDLE_REFEREE_POLL_INTERVAL_MS,
  advanceRound,
  buildInviteUrl,
  isSessionNotFoundError,
  createSession,
  loadReplayPayload,
  loadPublicSession,
  RefereeArenaApiError,
  refereePollIntervalMs,
  replayPayloadRequestKey,
  resetRoleClaim,
  writeStoredSession,
  readStoredSession,
  clearStoredSession,
} from '../.test-build/apps/web/src/referee/refereeClient.js'
import {
  createRefereeAgentLinks,
  hasInviteForRole,
} from '../.test-build/apps/web/src/referee/refereeAgentLinks.js'

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

function withFetchStub(callback) {
  const previousFetch = globalThis.fetch
  const calls = []

  globalThis.fetch = async (url, init = {}) => {
    const headers = new Headers(init.headers)
    const method = init.method ?? 'GET'
    const body = init.body
      ? typeof init.body === 'string'
        ? init.body
        : JSON.stringify(init.body)
      : undefined

    calls.push({ url: String(url), method, headers, body })
    return callback(calls, url, init)
  }

  return {
    restore() {
      globalThis.fetch = previousFetch
    },
    calls,
  }
}

function validMachineDesign(name, rootInstanceId = 'core') {
  return {
    name,
    rootInstanceId,
    parts: [
      {
        instanceId: rootInstanceId,
        definitionId: 'system:machine-core:v1',
        source: 'system_core',
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          orientation: {
            right: [1, 0, 0],
            up: [0, 1, 0],
            forward: [0, 0, 1],
          },
        },
        immutable: true,
      },
      {
        instanceId: `${rootInstanceId}-wheel`,
        definitionId: 'catalog:Wheel_Omni',
        source: 'catalog_part',
        transform: {
          position: [1, 0, 0],
          rotation: [0, 90, 90],
        },
      },
    ],
    attachments: [
      {
        parentInstanceId: rootInstanceId,
        childInstanceId: `${rootInstanceId}-wheel`,
        mountId: 'core_shell',
        transform: {
          position: [1, 0, 0],
          rotation: [0, 0, 0],
          orientation: {
            right: [1, 0, 0],
            up: [0, 1, 0],
            forward: [0, 0, 1],
          },
        },
      },
    ],
    runtime: {
      healthByInstanceId: {
        [rootInstanceId]: 20,
        [`${rootInstanceId}-wheel`]: 8,
      },
      detachedInstanceIds: [`${rootInstanceId}-wheel`],
      disabledInstanceIds: [],
      orientationByInstanceId: {
        [`${rootInstanceId}-wheel`]: {
          right: [0, 0, 1],
          up: [1, 0, 0],
          forward: [0, 1, 0],
        },
      },
    },
  }
}

test('referee invite URLs use production defaults and claimToken', () => {
  const inviteUrl = buildInviteUrl({
    role: 'red',
    claimToken: 'cap_red',
    sessionId: 's_demo',
    apiBase: DEFAULT_ARENA_API_BASE,
  })
  const params = new URLSearchParams({
    session: 's_demo',
    role: 'red',
    claimToken: 'cap_red',
    api: DEFAULT_ARENA_API_BASE,
  })

  assert.equal(
    inviteUrl,
    `${DEFAULT_ARENA_SITE_BASE}/agent#${params.toString()}`,
  )
  assert.equal(inviteUrl.includes('invite='), false)
})

test('referee invite URLs can use observer-only cockpit tokens', () => {
  const inviteUrl = buildInviteUrl({
    role: 'blue',
    observerToken: 'obs_blue',
    sessionId: 's_demo',
    apiBase: DEFAULT_ARENA_API_BASE,
  })
  const params = new URLSearchParams({
    session: 's_demo',
    role: 'blue',
    observerToken: 'obs_blue',
    api: DEFAULT_ARENA_API_BASE,
  })

  assert.equal(
    inviteUrl,
    `${DEFAULT_ARENA_SITE_BASE}/agent#${params.toString()}`,
  )
  assert.equal(inviteUrl.includes('claimToken'), false)
})

test('referee cockpit links tolerate claim-only invite payloads', () => {
  const links = createRefereeAgentLinks({
    activeSessionId: 's_demo',
    apiBase: DEFAULT_ARENA_API_BASE,
    invites: [{ role: 'red', claimToken: 'cap_red', claimPath: '/sessions/s_demo/claim' }],
    siteBase: 'http://127.0.0.1:5175',
  })

  assert.equal(hasInviteForRole([{ role: 'red', claimToken: 'cap_red' }], 'red'), true)
  assert.equal(links.hasAnyInvite, true)
  assert.equal(links.redCockpitUrl.startsWith('http://127.0.0.1:5175/agent#'), true)
  assert.equal(links.redCockpitUrl.includes('claimToken=cap_red'), true)
  assert.equal(links.redCockpitUrl.includes('observerToken='), false)
  assert.equal(links.redInviteUrl.includes('claimToken=cap_red'), true)
  assert.equal(links.blueCockpitUrl, '')
})

test('referee replay request key uses resolved status as gate', () => {
  assert.equal(
    replayPayloadRequestKey({
      activeSessionId: 's_demo',
      replayAvailable: false,
      replayStatus: 'resolved',
      replayVersion: 'replay-v1',
      round: 1,
    }),
    '',
  )
  assert.equal(
    replayPayloadRequestKey({
      activeSessionId: 's_demo',
      replayAvailable: true,
      replayStatus: 'live_partial',
      replayVersion: 'replay-v1',
      round: 1,
    }),
    '',
  )
  assert.equal(
    replayPayloadRequestKey({
      activeSessionId: 's_demo',
      replayAvailable: true,
      replayStatus: 'resolved',
      replayVersion: 'replay-v1',
      round: 1,
    }),
    's_demo|replay-v1',
  )
})

test('referee replay request key clears after resolved replay leaves current round', () => {
  const resolvedKey = replayPayloadRequestKey({
    activeSessionId: 's_demo',
    replayAvailable: true,
    replayStatus: 'resolved',
    round: 1,
    replayVersion: 'replay-v1',
  })
  const roundTwoLoadoutKey = replayPayloadRequestKey({
    activeSessionId: 's_demo',
    replayAvailable: false,
    replayStatus: 'none',
    round: 2,
    replayVersion: undefined,
  })
  const staleResolvedIdentityKey = replayPayloadRequestKey({
    activeSessionId: 's_demo',
    replayAvailable: true,
    replayStatus: 'none',
    round: 2,
    replayVersion: 'replay-v1',
  })

  assert.equal(resolvedKey, 's_demo|replay-v1')
  assert.equal(roundTwoLoadoutKey, '')
  assert.equal(staleResolvedIdentityKey, '')
  assert.notEqual(roundTwoLoadoutKey, resolvedKey)
  assert.notEqual(staleResolvedIdentityKey, resolvedKey)
})

test('referee replay request key includes round fallback and changes across rounds', () => {
  const roundOneLegacy = replayPayloadRequestKey({
    activeSessionId: 's_demo',
    replayAvailable: true,
    replayStatus: 'resolved',
    replayVersion: undefined,
    round: 1,
  })
  const roundTwoLegacy = replayPayloadRequestKey({
    activeSessionId: 's_demo',
    replayAvailable: true,
    replayStatus: 'resolved',
    replayVersion: undefined,
    round: 2,
  })

  assert.equal(roundOneLegacy, 's_demo|round:1')
  assert.equal(roundTwoLegacy, 's_demo|round:2')
  assert.notEqual(
    roundOneLegacy,
    roundTwoLegacy,
  )
})

test('referee replay request key uses replayVersion identity before round fallback', () => {
  assert.notEqual(
    replayPayloadRequestKey({
      activeSessionId: 's_demo',
      replayAvailable: true,
      replayStatus: 'resolved',
      replayVersion: 'replay-v1',
      round: 1,
    }),
    replayPayloadRequestKey({
      activeSessionId: 's_demo',
      replayAvailable: true,
      replayStatus: 'resolved',
      replayVersion: 'replay-v2',
      round: 1,
    }),
  )
})

test('referee polling uses active cadence only for combat and replay-active states', () => {
  assert.equal(
    refereePollIntervalMs({ phase: 'combat_turn', replayAvailable: false }),
    ACTIVE_REFEREE_POLL_INTERVAL_MS,
  )
  assert.equal(
    refereePollIntervalMs({ phase: 'replay_phase', replayAvailable: true }),
    ACTIVE_REFEREE_POLL_INTERVAL_MS,
  )
  assert.equal(
    refereePollIntervalMs({ phase: 'round_review', replayAvailable: true }),
    ACTIVE_REFEREE_POLL_INTERVAL_MS,
  )
  assert.equal(
    refereePollIntervalMs({ phase: 'round_review', replayAvailable: false }),
    IDLE_REFEREE_POLL_INTERVAL_MS,
  )
  assert.equal(
    refereePollIntervalMs({ phase: 'submission_phase', replayAvailable: false }),
    IDLE_REFEREE_POLL_INTERVAL_MS,
  )
  assert.equal(refereePollIntervalMs({ phase: 'session_complete', replayAvailable: true }), undefined)
  assert.equal(refereePollIntervalMs({ phase: 'expired', replayAvailable: true }), undefined)
})

test('referee createSession posts to /sessions', async () => {
  const { calls, restore } = withFetchStub(() =>
    jsonResponse({ sessionId: 's_demo', phase: 'submission_phase', invites: [], refereeToken: 'r_token', publicState: {} }),
  )

  try {
    await createSession(DEFAULT_ARENA_API_BASE)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'POST')
    assert.equal(calls[0].url, `${DEFAULT_ARENA_API_BASE}/sessions`)
    assert.equal(calls[0].headers.get('authorization'), null)
    assert.equal(calls[0].body, '{}')
  } finally {
    restore()
  }
})

test('referee loadPublicSession GETs /public without authorization', async () => {
  const sessionId = 's_demo'
  const { calls, restore } = withFetchStub(() =>
    jsonResponse({
      sessionId: 's_demo',
      phase: 'submission_phase',
      round: 1,
      maxRounds: 3,
      expiresAt: '2026-06-03T12:00:00.000Z',
      arena: { width: 16, height: 16, name: 'Test Arena', activeHazards: [] },
      roles: {
        red: { role: 'red', claimed: false, submitted: false },
        blue: { role: 'blue', claimed: false, submitted: false },
      },
      replayAvailable: false,
      eventLog: [],
    }),
  )

  try {
    await loadPublicSession(DEFAULT_ARENA_API_BASE, sessionId)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'GET')
    assert.equal(calls[0].url, `${DEFAULT_ARENA_API_BASE}/sessions/${encodeURIComponent(sessionId)}/public`)
    assert.equal(calls[0].headers.get('authorization'), null)
  } finally {
    restore()
  }
})

test('referee recognizes missing sessions as stale invite storage failures', () => {
  assert.equal(
    isSessionNotFoundError(new RefereeArenaApiError({
      status: 404,
      code: 'SESSION_NOT_FOUND',
      message: 'Session has not been created.',
    })),
    true,
  )
  assert.equal(
    isSessionNotFoundError(new RefereeArenaApiError({
      status: 404,
      code: 'INVALID_ACTION',
      message: 'Unsupported session action.',
    })),
    false,
  )
})

test('referee loadReplayPayload normalizes top-level replay payloads with render contracts', async () => {
  const sessionId = 's_demo'
  const { calls, restore } = withFetchStub(() =>
    jsonResponse({
      round: 1,
      duration: 6,
      summary: 'Red wins.',
      events: [{ t: 0, type: 'spawn', bot: 'red', position: [0, 0, 0], rotation: [0, 90, 0] }],
      teamIdentities: {
        red: { name: 'Red Team', primaryColor: '#ff4c5d', logo: { mark: 'shield', initials: 'R' } },
        blue: { name: 'Blue Team', primaryColor: '#5b9dff', logo: { mark: 'shield', initials: 'B' } },
      },
      botBlueprints: {
        red: { name: 'Red', blocks: [] },
        blue: { name: 'Blue', blocks: [] },
      },
      machineDesigns: {
        red: validMachineDesign('Red machine', 'red-core'),
        blue: validMachineDesign('Blue machine', 'blue-core'),
      },
    }),
  )

  try {
    const replay = await loadReplayPayload(DEFAULT_ARENA_API_BASE, sessionId)

    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'GET')
    assert.equal(calls[0].url, `${DEFAULT_ARENA_API_BASE}/sessions/${encodeURIComponent(sessionId)}/replay`)
    assert.equal(calls[0].headers.get('authorization'), null)
    assert.equal(replay.timeline.round, 1)
    assert.equal(replay.timeline.events.length, 1)
    assert.equal(replay.teamIdentities.red.primaryColor, '#ff4c5d')
    assert.equal(replay.teamIdentities.blue.primaryColor, '#5b9dff')
    assert.equal(replay.botBlueprints.red.name, 'Red')
    assert.equal(replay.botBlueprints.blue.name, 'Blue')
    assert.equal(replay.machineDesigns.red.name, 'Red machine')
    assert.equal(replay.machineDesigns.red.runtime.healthByInstanceId['red-core'], 20)
    assert.equal(replay.machineDesigns.blue.name, 'Blue machine')
    assert.deepEqual(replay.machineDesigns.blue.runtime.detachedInstanceIds, ['blue-core-wheel'])
  } finally {
    restore()
  }
})

test('referee loadReplayPayload omits machine designs with malformed nested transforms', async () => {
  const sessionId = 's_demo'
  const malformedRed = validMachineDesign('Malformed red machine', 'red-core')

  malformedRed.parts[1].transform.rotation = [0, Number.POSITIVE_INFINITY, 0]

  const { restore } = withFetchStub(() =>
    jsonResponse({
      round: 1,
      duration: 6,
      summary: 'Blue wins.',
      events: [{ t: 0, type: 'spawn', bot: 'blue', position: [0, 0, 0], rotation: [0, -90, 0] }],
      teamIdentities: {
        red: { name: 'Red Team', primaryColor: '#ff4c5d' },
        blue: { name: 'Blue Team', primaryColor: '#5b9dff' },
      },
      botBlueprints: {
        red: { name: 'Red legacy', blocks: [] },
        blue: { name: 'Blue legacy', blocks: [] },
      },
      machineDesigns: {
        red: malformedRed,
        blue: validMachineDesign('Blue machine', 'blue-core'),
      },
    }),
  )

  try {
    const replay = await loadReplayPayload(DEFAULT_ARENA_API_BASE, sessionId)

    assert.equal(replay.machineDesigns.red, undefined)
    assert.equal(replay.machineDesigns.blue.name, 'Blue machine')
  } finally {
    restore()
  }
})

test('referee loadReplayPayload preserves legacy replay payloads without machine designs', async () => {
  const sessionId = 's_demo'
  const { restore } = withFetchStub(() =>
    jsonResponse({
      timeline: {
        round: 2,
        duration: 5,
        summary: 'Legacy replay.',
        events: [{ t: 0, type: 'spawn', bot: 'red', position: [0, 0, 0], rotation: [0, 90, 0] }],
      },
      teamIdentities: {
        red: { name: 'Red Team', primaryColor: '#ff4c5d' },
        blue: { name: 'Blue Team', primaryColor: '#5b9dff' },
      },
      botBlueprints: {
        red: { name: 'Red legacy', blocks: [] },
        blue: { name: 'Blue legacy', blocks: [] },
      },
    }),
  )

  try {
    const replay = await loadReplayPayload(DEFAULT_ARENA_API_BASE, sessionId)

    assert.equal(replay.timeline.round, 2)
    assert.equal(replay.botBlueprints.red.name, 'Red legacy')
    assert.equal(replay.machineDesigns, undefined)
  } finally {
    restore()
  }
})

test('referee loadReplayPayload rejects replay payloads without team identities', async () => {
  const sessionId = 's_demo'
  const { restore } = withFetchStub(() =>
    jsonResponse({
      round: 1,
      duration: 6,
      summary: 'Red wins.',
      events: [{ t: 0, type: 'spawn', bot: 'red', position: [0, 0, 0], rotation: [0, 90, 0] }],
      botBlueprints: {
        red: { name: 'Red', blocks: [] },
        blue: { name: 'Blue', blocks: [] },
      },
    }),
  )

  try {
    await assert.rejects(
      () => loadReplayPayload(DEFAULT_ARENA_API_BASE, sessionId),
      /Replay payload is missing post-combat bot blueprints or team identities/,
    )
  } finally {
    restore()
  }
})

test('referee advanceRound posts /advance-round with bearer token', async () => {
  const sessionId = 's_demo'
  const refereeToken = 'r_ref'
  const response = { publicState: { eventLog: [], replayAvailable: false } }
  const { calls, restore } = withFetchStub(() => jsonResponse(response))

  try {
    await advanceRound(DEFAULT_ARENA_API_BASE, sessionId, refereeToken)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'POST')
    assert.equal(
      calls[0].url,
      `${DEFAULT_ARENA_API_BASE}/sessions/${encodeURIComponent(sessionId)}/advance-round`,
    )
    assert.equal(calls[0].headers.get('authorization'), `Bearer ${refereeToken}`)
    assert.equal(calls[0].body, JSON.stringify({}))
  } finally {
    restore()
  }
})

test('referee client does not expose deferred Slice 7 session completion helpers', () => {
  assert.equal('saveCompletedSession' in refereeClientModule, false)
  assert.equal('continueChampionSession' in refereeClientModule, false)
  assert.equal('quitCompletedSession' in refereeClientModule, false)
  assert.equal('canSubmitSessionCompletionAction' in refereeClientModule, false)
})

test('referee resetRoleClaim posts /reset-role with bearer token', async () => {
  const sessionId = 's_demo'
  const refereeToken = 'r_ref'
  const response = {
    invite: { role: 'red', claimToken: 'cap_red_fresh', claimPath: '/sessions/s_demo/claim' },
    publicState: {
      sessionId,
      stateVersion: 'v_2',
      phase: 'waiting_for_agents',
      round: 1,
      maxRounds: 3,
      expiresAt: '2026-06-03T12:00:00.000Z',
      arena: { width: 16, height: 16, name: 'Test Arena', activeHazards: [] },
      roles: {
        red: { role: 'red', claimed: false, submitted: false },
        blue: { role: 'blue', claimed: true, submitted: false },
      },
      replayAvailable: false,
      eventLog: [],
    },
  }
  const { calls, restore } = withFetchStub(() => jsonResponse(response))

  try {
    await resetRoleClaim(DEFAULT_ARENA_API_BASE, sessionId, refereeToken, 'red')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'POST')
    assert.equal(
      calls[0].url,
      `${DEFAULT_ARENA_API_BASE}/sessions/${encodeURIComponent(sessionId)}/reset-role`,
    )
    assert.equal(calls[0].headers.get('authorization'), `Bearer ${refereeToken}`)
    assert.equal(calls[0].body, JSON.stringify({ role: 'red' }))
  } finally {
    restore()
  }
})

test('referee session storage persists referee token and role invite tokens until session expiry', () => {
  const storage = new Map()
  const sessionId = 's_demo'
  const apiBase = DEFAULT_ARENA_API_BASE
  const data = {
    refereeToken: 'r_ref',
    invites: [{ role: 'red', claimToken: 'cap_red', observerToken: 'obs_red', claimPath: '/sessions/s_demo/claim' }],
    expiresAt: '9999-01-01T00:00:00.000Z',
  }
  const invite = { role: 'red', claimToken: 'cap_red', observerToken: 'obs_red' }
  const calls = []
  const mockStorage = {
    getItem: (key) => {
      calls.push(['get', key])
      return storage.get(key) ?? null
    },
    setItem: (key, value) => {
      calls.push(['set', key, value])
      storage.set(key, value)
    },
    removeItem: (key) => {
      calls.push(['remove', key])
      storage.delete(key)
    },
  }

  writeStoredSession(mockStorage, apiBase, sessionId, data)
  const loaded = readStoredSession(mockStorage, apiBase, sessionId)
  const inviteLink = buildInviteUrl({
    role: invite.role,
    claimToken: invite.claimToken,
    observerToken: invite.observerToken,
    sessionId,
    apiBase,
  })

  assert.equal(loaded?.sessionId, sessionId)
  assert.equal(loaded?.apiBase, apiBase)
  assert.equal(loaded?.refereeToken, data.refereeToken)
  assert.deepEqual(loaded?.invites, data.invites)
  assert.equal(loaded?.expiresAt, data.expiresAt)
  assert.equal(JSON.stringify(storage.get(`agent-arena:referee-console:${apiBase}:${sessionId}`)).includes('cap_red'), true)
  assert.equal(JSON.stringify(storage.get(`agent-arena:referee-console:${apiBase}:${sessionId}`)).includes('obs_red'), true)
  assert.equal(calls.some(([op, key]) => op === 'set' && key === `agent-arena:referee-console:${apiBase}:${sessionId}`), true)
  assert.equal(inviteLink.includes('invite='), false)
  assert.equal(inviteLink.includes('refereeToken'), false)
  clearStoredSession(mockStorage, apiBase, sessionId)
  assert.equal(calls.some(([op, key]) => op === 'remove' && key === `agent-arena:referee-console:${apiBase}:${sessionId}`), true)
})

test('referee session storage preserves existing role invite tokens when saving token-only updates', () => {
  const storage = new Map()
  const sessionId = 's_demo'
  const apiBase = DEFAULT_ARENA_API_BASE
  const mockStorage = {
    getItem: (storedKey) => storage.get(storedKey) ?? null,
    setItem: (storedKey, value) => {
      storage.set(storedKey, value)
    },
    removeItem: (storedKey) => {
      storage.delete(storedKey)
    },
  }
  const invites = [
    { role: 'red', claimToken: 'cap_red', observerToken: 'obs_red', claimPath: '/sessions/s_demo/claim' },
    { role: 'blue', claimToken: 'cap_blue', observerToken: 'obs_blue', claimPath: '/sessions/s_demo/claim' },
  ]

  writeStoredSession(mockStorage, apiBase, sessionId, {
    refereeToken: 'r_ref',
    invites,
    expiresAt: '9999-01-01T00:00:00.000Z',
  })
  writeStoredSession(mockStorage, apiBase, sessionId, {
    refereeToken: 'r_ref_next',
    expiresAt: '9999-01-01T00:00:00.000Z',
  })

  const loaded = readStoredSession(mockStorage, apiBase, sessionId)

  assert.equal(loaded?.refereeToken, 'r_ref_next')
  assert.deepEqual(loaded?.invites, invites)
})

test('referee session storage drops expired or malformed records', () => {
  const storage = new Map()
  const sessionId = 's_demo'
  const apiBase = DEFAULT_ARENA_API_BASE
  const key = `agent-arena:referee-console:${apiBase}:${sessionId}`
  const calls = []
  const mockStorage = {
    getItem: (storedKey) => {
      calls.push(['get', storedKey])
      return storage.get(storedKey) ?? null
    },
    setItem: (storedKey, value) => {
      calls.push(['set', storedKey, value])
      storage.set(storedKey, value)
    },
    removeItem: (storedKey) => {
      calls.push(['remove', storedKey])
      storage.delete(storedKey)
    },
  }

  storage.set(key, JSON.stringify({
    sessionId,
    apiBase,
    refereeToken: 'r_ref',
    expiresAt: '2000-01-01T00:00:00.000Z',
  }))

  assert.equal(readStoredSession(mockStorage, apiBase, sessionId), null)
  assert.equal(storage.has(key), false)
  assert.equal(calls.some(([op, storedKey]) => op === 'remove' && storedKey === key), true)
})
