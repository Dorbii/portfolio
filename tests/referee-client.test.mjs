import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_ARENA_API_BASE,
  DEFAULT_ARENA_SITE_BASE,
  advanceRound,
  buildInviteUrl,
  createSession,
  loadReplayPayload,
  loadPublicSession,
  resetRoleClaim,
  writeStoredSession,
  readStoredSession,
  clearStoredSession,
} from '../.test-build/apps/web/src/referee/refereeClient.js'

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

test('referee loadReplayPayload normalizes top-level replay payloads with bot blueprints', async () => {
  const sessionId = 's_demo'
  const { calls, restore } = withFetchStub(() =>
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
    const replay = await loadReplayPayload(DEFAULT_ARENA_API_BASE, sessionId)

    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, 'GET')
    assert.equal(calls[0].url, `${DEFAULT_ARENA_API_BASE}/sessions/${encodeURIComponent(sessionId)}/replay`)
    assert.equal(calls[0].headers.get('authorization'), null)
    assert.equal(replay.timeline.round, 1)
    assert.equal(replay.timeline.events.length, 1)
    assert.equal(replay.botBlueprints.red.name, 'Red')
    assert.equal(replay.botBlueprints.blue.name, 'Blue')
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

test('referee session storage persists referee token and role handoff tokens until session expiry', () => {
  const storage = new Map()
  const sessionId = 's_demo'
  const apiBase = DEFAULT_ARENA_API_BASE
  const data = {
    refereeToken: 'r_ref',
    invites: [{ role: 'red', claimToken: 'cap_red', claimPath: '/sessions/s_demo/claim' }],
    expiresAt: '9999-01-01T00:00:00.000Z',
  }
  const invite = { role: 'red', claimToken: 'cap_red' }
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
    sessionId,
    apiBase,
  })

  assert.equal(loaded?.sessionId, sessionId)
  assert.equal(loaded?.apiBase, apiBase)
  assert.equal(loaded?.refereeToken, data.refereeToken)
  assert.deepEqual(loaded?.invites, data.invites)
  assert.equal(loaded?.expiresAt, data.expiresAt)
  assert.equal(JSON.stringify(storage.get(`agent-arena:referee-console:${apiBase}:${sessionId}`)).includes('cap_red'), true)
  assert.equal(calls.some(([op, key]) => op === 'set' && key === `agent-arena:referee-console:${apiBase}:${sessionId}`), true)
  assert.equal(inviteLink.includes('invite='), false)
  assert.equal(inviteLink.includes('refereeToken'), false)
  clearStoredSession(mockStorage, apiBase, sessionId)
  assert.equal(calls.some(([op, key]) => op === 'remove' && key === `agent-arena:referee-console:${apiBase}:${sessionId}`), true)
})

test('referee session storage preserves existing role handoff tokens when saving token-only updates', () => {
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
    { role: 'red', claimToken: 'cap_red', claimPath: '/sessions/s_demo/claim' },
    { role: 'blue', claimToken: 'cap_blue', claimPath: '/sessions/s_demo/claim' },
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
