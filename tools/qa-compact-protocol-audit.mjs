// QA audit for the compact agent protocol (slice 11 matrix, payload audit).
// Plays a full session through the GPT wrapper and raw HTTP transports and
// reports compact payload sizes, forbidden-surface leaks, and lifecycle facts.
// Run after `npm test` (needs .test-build): node tools/qa-compact-protocol-audit.mjs
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'

import { AgentArenaSession, handleWorkerRequest } from '../.test-build/apps/worker/src/index.js'

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

  async delete(key) {
    this.#values.delete(key)
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

    if (!this.#storages.has(key)) {
      this.#storages.set(key, new FakeDurableObjectStorage())
    }

    return this.#storages.get(key)
  }

  get(id) {
    const key = String(id)

    if (!this.#objects.has(key)) {
      const durableObject = new AgentArenaSession(
        { storage: this.storageFor(key) },
        { AGENT_ARENA_SESSION: this },
      )

      this.#objects.set(key, { fetch: (request) => durableObject.fetch(request) })
    }

    return this.#objects.get(key)
  }
}

const env = { AGENT_ARENA_SESSION: new FakeDurableObjectNamespace() }

async function route(path, options = {}) {
  const headers = new Headers()

  if (options.token) {
    headers.set('authorization', `Bearer ${options.token}`)
  }
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json')
  }

  const response = await handleWorkerRequest(
    new Request(`https://arena-api.test${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    env,
  )
  const json = await response.json()

  return { status: response.status, json }
}

const findings = []
const samples = {}
const sizes = {}

function record(name, ok, detail) {
  findings.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

function forbiddenLeaks(value, forbiddenKeys) {
  const serialized = JSON.stringify(value)

  return forbiddenKeys.filter((key) => serialized.includes(`"${key}"`))
}

const sessionId = 's_qa_audit'
const created = await route('/sessions', { method: 'POST', body: { sessionId } })
const redInvite = created.json.invites.find((entry) => entry.role === 'red')
const blueInvite = created.json.invites.find((entry) => entry.role === 'blue')
const refereeToken = created.json.refereeToken
const gptInvite = (invite) =>
  `https://arena.dorbii.net/agent#session=${sessionId}&role=${invite.role}&claimToken=${invite.claimToken}&api=https%3A%2F%2Farena-api.test`

const identity = (role, name) => ({
  agentName: name,
  teamIdentity: {
    name: `${name} Team`,
    colorHex: role === 'red' ? '#ff4c5d' : '#5b9dff',
    logoPrompt: `${name} logo`,
  },
})

// --- transport 1: Custom GPT wrapper (red) ---
const claim = await route('/gpt/claim', {
  method: 'POST',
  body: { inviteUrl: gptInvite(redInvite), ...identity('red', 'GPT Red') },
})

assert.equal(claim.status, 200)

// --- transport 2: raw HTTP (blue) ---
const blueBootstrap = await route(`/sessions/${sessionId}/roles/blue/bootstrap`, {
  method: 'POST',
  token: blueInvite.claimToken,
  body: identity('blue', 'Raw Blue'),
})

assert.equal(blueBootstrap.status, 201)

const gptBuild = await route('/gpt/next', { method: 'POST', body: { inviteUrl: gptInvite(redInvite) } })
const gptBuildPacket = gptBuild.json.packet

samples.gpt_build_packet = gptBuildPacket
sizes.gpt_build_packet_bytes = JSON.stringify(gptBuildPacket).length
record('GPT build packet present (packet.build)', gptBuildPacket.build?.v === 1)
record(
  'GPT build packet omits legacy surfaces',
  forbiddenLeaks(gptBuildPacket, [
    'legalActions',
    'blockedActions',
    'foundationPartIds',
    'offeredPartIds',
    'slots',
    'buildState',
    'catalogDigest',
  ]).length === 0,
  `size ${sizes.gpt_build_packet_bytes} bytes`,
)
record(
  'A1/A3/A4: core row present, no catalog, no legalActions in compact build',
  JSON.stringify(gptBuildPacket.build.bot.parts[0]) === JSON.stringify(['core', 'body.Machine_Core', null, 20, 20]) &&
    gptBuildPacket.catalog === undefined,
)
record(
  'A5/A6/A7: offers without slot/stock and category-prefixed aliases',
  gptBuildPacket.build.store.offers.every(
    (offer) => !('slot' in offer) && !('stock' in offer) && /^(body|mobility|weapon|defense|utility|style)\./.test(offer.part),
  ),
)

// GPT compact build flow: choose -> target -> mount -> confirm
const offer = gptBuildPacket.build.store.offers.find((entry) => entry.weapon) ?? gptBuildPacket.build.store.offers[0]
const chose = await route('/gpt/act', {
  method: 'POST',
  body: { inviteUrl: gptInvite(redInvite), action: { kind: 'choose_part', part: offer.part } },
})

assert.equal(chose.status, 200, JSON.stringify(chose.json))
record('GPT compact choose_part accepted without actionId', chose.json.packet.build.step === 'choose_attach_target')

const targeted = await route('/gpt/act', {
  method: 'POST',
  body: { inviteUrl: gptInvite(redInvite), action: { kind: 'choose_attach_target', target: 'core' } },
})

assert.equal(targeted.status, 200, JSON.stringify(targeted.json))

const [surface, u, v, yaw, roll] = targeted.json.packet.build.mounts[0]
const mounted = await route('/gpt/act', {
  method: 'POST',
  body: { inviteUrl: gptInvite(redInvite), action: { kind: 'mount_part', surface, u, v, yaw, roll } },
})

assert.equal(mounted.status, 200, JSON.stringify(mounted.json))
record('GPT compact mount_part placed part', mounted.json.packet.build.bot.parts.length === 2)
record(
  'A-offer depletion: consumed offer absent from compact store',
  !mounted.json.packet.build.store.offers.some((entry) => entry.part === offer.part),
)

const confirmedRed = await route('/gpt/act', {
  method: 'POST',
  body: { inviteUrl: gptInvite(redInvite), action: { kind: 'confirm_loadout' } },
})

assert.equal(confirmedRed.status, 200)

// raw HTTP compact build flow for blue
const blueState1 = await route(`/sessions/${sessionId}/state`, { token: blueInvite.claimToken })
const rawBuild = blueState1.json.gameMaster.build

samples.raw_state_build = rawBuild
sizes.raw_state_build_bytes = JSON.stringify(rawBuild).length
record('Raw /state exposes packet.build for raw agents', rawBuild?.v === 1, `size ${sizes.raw_state_build_bytes} bytes`)

const blueFoundation = rawBuild.store.foundation[0]
const blueChoose = await route(`/sessions/${sessionId}/build-action`, {
  method: 'POST',
  token: blueInvite.claimToken,
  body: {
    action: 'submit_build_action',
    decisionVersion: rawBuild.decisionVersion,
    command: { kind: 'choose_part', part: blueFoundation.part },
  },
})

assert.equal(blueChoose.status, 200, JSON.stringify(blueChoose.json))
record('Raw /build-action compact choose_part accepted', blueChoose.json.compactBuild.step === 'choose_attach_target')

const blueTarget = await route(`/sessions/${sessionId}/build-action`, {
  method: 'POST',
  token: blueInvite.claimToken,
  body: {
    action: 'submit_build_action',
    decisionVersion: blueChoose.json.compactBuild.decisionVersion,
    command: { kind: 'choose_attach_target', target: 'core' },
  },
})

assert.equal(blueTarget.status, 200)

const [bSurface, bU, bV, bYaw, bRoll] = blueTarget.json.compactBuild.mounts[0]
const blueMount = await route(`/sessions/${sessionId}/build-action`, {
  method: 'POST',
  token: blueInvite.claimToken,
  body: {
    action: 'submit_build_action',
    decisionVersion: blueTarget.json.compactBuild.decisionVersion,
    command: { kind: 'mount_part', surface: bSurface, u: bU, v: bV, yaw: bYaw, roll: bRoll },
  },
})

assert.equal(blueMount.status, 200, JSON.stringify(blueMount.json))

const blueConfirm = await route(`/sessions/${sessionId}/build-action`, {
  method: 'POST',
  token: blueInvite.claimToken,
  body: {
    action: 'submit_build_action',
    decisionVersion: blueMount.json.compactBuild.decisionVersion,
    command: { kind: 'confirm_loadout' },
  },
})

assert.equal(blueConfirm.status, 200, JSON.stringify(blueConfirm.json))
record('Raw compact confirm_loadout accepted', blueConfirm.json.packet.nextAction === 'wait_for_opponent_loadout' || blueConfirm.json.packet.phase === 'combat_turn')

// --- combat ---
const gptCombat = await route('/gpt/next', { method: 'POST', body: { inviteUrl: gptInvite(redInvite) } })
const combatPacket = gptCombat.json.packet

samples.gpt_combat_packet = combatPacket
sizes.gpt_combat_packet_bytes = JSON.stringify(combatPacket).length
record('GPT combat packet exposes compact state (packet.combat.v=1)', combatPacket.combat?.v === 1, `size ${sizes.gpt_combat_packet_bytes} bytes`)
record(
  'Combat packet omits affordance surfaces',
  forbiddenLeaks(combatPacket, [
    'reachableCells',
    'attackableCells',
    'utilityOptions',
    'reachablePoses',
    'attackableTargets',
    'ascii',
    'legalActions',
    'actionSummary',
    'cells',
  ]).length === 0,
)

const blueCombatState = await route(`/sessions/${sessionId}/state`, { token: blueInvite.claimToken })
const blueCompactCombat = blueCombatState.json.gameMaster.combatCompact

samples.raw_state_combat_compact = blueCompactCombat
record('Raw /state exposes combatCompact', blueCompactCombat?.v === 1)

const redCombatWeapons = combatPacket.combat.combat.self.weapons

record(
  'Combat weapons carry mounted weapon ids (first two also slots)',
  redCombatWeapons.length > 0 && redCombatWeapons.every((weapon) => typeof weapon.id === 'string'),
  JSON.stringify(redCombatWeapons.map((weapon) => [weapon.id, weapon.slot ?? null])),
)

// compact combat plan via raw route (blue): move toward red then end_turn
const selfCell = blueCompactCombat.combat.self.cell
const stepX = selfCell[0] + (blueCompactCombat.combat.opponent.cell[0] > selfCell[0] ? 1 : -1)
const bluePlan = await route(`/sessions/${sessionId}/combat-plan`, {
  method: 'POST',
  token: blueInvite.claimToken,
  body: {
    action: 'submit_combat_plan',
    decisionVersion: blueCombatState.json.gameMaster.decisionVersion,
    round: blueCombatState.json.gameMaster.round,
    steps: [
      { kind: 'move', to: [stepX, selfCell[1]] },
      { kind: 'end_turn' },
    ],
  },
})

record('Raw compact combat plan accepted (tuple steps)', bluePlan.status === 200, JSON.stringify(bluePlan.json.error ?? ''))

// GPT combat plan with tuple steps via combat_plan compatibility id
const redPlan = await route('/gpt/act', {
  method: 'POST',
  body: {
    inviteUrl: gptInvite(redInvite),
    actionId: 'combat_plan',
    parameters: {
      steps: [
        { kind: 'move', to: [combatPacket.combat.combat.self.cell[0] - 1, combatPacket.combat.combat.self.cell[1]] },
        { kind: 'end_turn' },
      ],
    },
  },
})

record('GPT combat_plan accepts compact tuple steps', redPlan.status === 200, JSON.stringify(redPlan.json.error ?? ''))

// --- finish fight + round lifecycle ---
const storage = env.AGENT_ARENA_SESSION.storageFor(sessionId)
const preFight = await storage.get('agent-arena-session')
const redPartsBefore = preFight.roles.red.storedDesign.machine.parts.map((part) => [part.instanceId, part.definitionId])

preFight.phase = 'round_review'
preFight.lastResult = {
  winner: 'red',
  reason: 'QA harness fight completion.',
  damage: { red: 0, blue: 20 },
  remainingHealth: { red: 30, blue: 0 },
}
preFight.roles.red.storedDesign.machine.runtime = {
  healthByInstanceId: { core: 3, part_1: 0 },
  disabledInstanceIds: ['part_1'],
}
preFight.replay = { events: [], duration: 1, round: 1, summary: 'qa' }
await storage.put('agent-arena-session', preFight)

const advanced = await route(`/sessions/${sessionId}/advance-round`, {
  method: 'POST',
  token: refereeToken,
  body: {},
})

record('Referee advance-round succeeds', advanced.status === 200)

const redRound2 = await route('/gpt/next', { method: 'POST', body: { inviteUrl: gptInvite(redInvite) } })
const round2Build = redRound2.json.packet.build

samples.gpt_round2_build_packet = round2Build
record('B5/B6/B7: round 2 rehydrates the same blueprint', JSON.stringify(round2Build.bot.parts.map((row) => row[0])) === JSON.stringify(redPartsBefore.map(([instanceId]) => instanceId)))
record(
  'A10: round 2 compact packet shows healed full HP',
  round2Build.bot.parts.every(([, , , hp, maxHp]) => hp === maxHp) &&
    round2Build.bot.summary.hp === round2Build.bot.summary.maxHp,
)
record('Round 2 bot mode is existing', round2Build.bot.mode === 'existing')
record('Round 2 store offers reset (offers available again)', round2Build.store.offers.length > 0)
record('Round 2 edit surface lists removable parts', round2Build.edit.remove.length > 0)

// --- summary ---
const failures = findings.filter((finding) => !finding.ok)

mkdirSync(new URL('../../qa', import.meta.url).pathname, { recursive: true })
writeFileSync(
  new URL('../../qa/qa-payload-samples.json', import.meta.url).pathname,
  JSON.stringify({ sizes, samples }, null, 2),
)
writeFileSync(
  new URL('../../qa/qa-findings.json', import.meta.url).pathname,
  JSON.stringify(findings, null, 2),
)

console.log(`\nPayload sizes: ${JSON.stringify(sizes, null, 2)}`)
console.log(`\n${findings.length - failures.length}/${findings.length} checks passed`)

if (failures.length > 0) {
  process.exitCode = 1
}
