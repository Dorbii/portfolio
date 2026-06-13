import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRefereeObserverView } from '../.test-build/apps/web/src/referee/refereeObserverView.js'

function makePublicSession(overrides = {}) {
  return {
    round: 1,
    roundPlan: null,
    chatLog: [],
    arena: {
      activeHazards: [''],
      activeWeapons: [],
      config: { height: 100, width: 100 },
      hazards: [],
      name: 'Arena',
      width: 100,
      height: 100,
      activeRound: 1,
      terrain: 'flat',
      weather: null,
      obstacles: [],
    },
    combat: null,
    continuation: null,
    fightDossier: [],
    roles: {
      red: {
        claimed: true,
        losses: 0,
        wins: 0,
        submitted: false,
        identity: {
          name: 'Red Team',
          primaryColor: '#ff4c5d',
        },
      },
      blue: {
        claimed: true,
        losses: 0,
        wins: 0,
        submitted: false,
        identity: {
          name: 'Blue Team',
          primaryColor: '#5b9dff',
        },
      },
    },
    ...overrides,
  }
}

function makeReplayPayload() {
  return {
    timeline: {
      duration: 12,
      round: 1,
      events: [
        { type: 'impact', attacker: 'red' },
        { type: 'impact', attacker: 'blue' },
        { type: 'impact', attacker: 'blue' },
      ],
      summary: '1-round mock replay',
    },
    teamIdentities: {
      red: {
        name: 'Red Team',
        primaryColor: '#ff4c5d',
      },
      blue: {
        name: 'Blue Team',
        primaryColor: '#5b9dff',
      },
    },
    botBlueprints: {
      red: { name: 'Red blueprint' },
      blue: { name: 'Blue blueprint' },
    },
  }
}

test('live combat uses no resolved replay metrics even with payload present', () => {
  const publicSession = makePublicSession({
    phase: 'combat_turn',
    replayStatus: 'live_partial',
    replayAvailable: true,
    lastResult: {
      reason: 'Fight ongoing',
      winner: 'red',
      remainingHealth: { red: 80, blue: 90 },
      damage: { red: 20, blue: 10 },
    },
  })

  const observerView = buildRefereeObserverView({
    publicSession,
    replayPayload: makeReplayPayload(),
  })

  assert.equal(observerView.stage, 'live_combat')
  assert.equal(observerView.showReplay, false)
  assert.equal(observerView.canUseReplayPayload, false)
  assert.equal(observerView.canUseCurrentResult, false)
  assert.equal(observerView.showCockpitStrip, false)
  assert.equal(observerView.teams.red.damageTaken, 0)
  assert.equal(observerView.teams.red.hitCount, 0)
  assert.equal(observerView.teams.red.lifecycle.label, 'Combat live')
  assert.equal(observerView.teams.red.healthLabel, 'Pending')
  assert.equal(observerView.teams.red.lifecycle.label !== 'Done', true)
})

test('round_review with live partial ignores stale resolved signals', () => {
  const publicSession = makePublicSession({
    phase: 'round_review',
    replayStatus: 'live_partial',
    replayAvailable: true,
    lastResult: {
      reason: 'Fight in progress',
      winner: 'red',
      remainingHealth: { red: 80, blue: 90 },
      damage: { red: 20, blue: 10 },
    },
  })

  const observerView = buildRefereeObserverView({
    publicSession,
    replayPayload: makeReplayPayload(),
  })

  assert.equal(observerView.stage, 'round_review')
  assert.equal(observerView.showReplay, false)
  assert.equal(observerView.canUseReplayPayload, false)
  assert.equal(observerView.canUseCurrentResult, false)
  assert.equal(observerView.replayClockLabel, '--')
  assert.equal(observerView.replayEventCount, 0)
  assert.equal(observerView.teams.red.damageTaken, 0)
  assert.equal(observerView.teams.red.hitCount, 0)
  assert.equal(observerView.teams.red.lifecycle.label, 'Building')
  assert.equal(observerView.teams.blue.lifecycle.label, 'Building')
  assert.equal(observerView.decisionText, 'Round Review')
})

test('resolved replay uses winner metrics and replay payload when resolved', () => {
  const publicSession = makePublicSession({
    phase: 'combat_resolved',
    replayStatus: 'resolved',
    replayAvailable: true,
    round: 1,
    lastResult: {
      reason: 'Fight wall-clock expired',
      winner: 'blue',
      remainingHealth: { red: 20, blue: 40 },
      damage: { red: 80, blue: 60 },
    },
  })

  const observerView = buildRefereeObserverView({
    publicSession,
    replayPayload: makeReplayPayload(),
  })

  assert.equal(observerView.stage, 'resolved_replay')
  assert.equal(observerView.showReplay, true)
  assert.equal(observerView.canUseReplayPayload, true)
  assert.equal(observerView.canUseCurrentResult, true)
  assert.equal(observerView.replayEventCount, 3)
  assert.equal(observerView.decisionText, 'Blue wins')
  assert.equal(observerView.teams.red.damageTaken, 80)
  assert.equal(observerView.teams.red.hitCount, 1)
  assert.equal(observerView.teams.blue.damageTaken, 60)
  assert.equal(observerView.teams.blue.hitCount, 2)
  assert.equal(observerView.teams.blue.lifecycle.label, 'Done')
  assert.equal(observerView.teams.red.lifecycle.label, 'Done')
})

test('round_review with resolved status uses resolved_replay lifecycle', () => {
  const publicSession = makePublicSession({
    phase: 'round_review',
    replayStatus: 'resolved',
    replayAvailable: true,
    lastResult: {
      reason: 'Round review loaded',
      winner: 'red',
      remainingHealth: { red: 55, blue: 65 },
      damage: { red: 45, blue: 35 },
    },
  })

  const observerView = buildRefereeObserverView({
    publicSession,
    replayPayload: makeReplayPayload(),
  })

  assert.equal(observerView.stage, 'resolved_replay')
  assert.equal(observerView.canUseCurrentResult, true)
  assert.equal(observerView.canUseReplayPayload, true)
  assert.equal(observerView.showReplay, true)
  assert.equal(observerView.replayClockLabel, '12s')
  assert.equal(observerView.teams.red.damageTaken, 45)
  assert.equal(observerView.teams.blue.damageTaken, 35)
  assert.equal(observerView.teams.red.hitCount, 1)
  assert.equal(observerView.teams.blue.hitCount, 2)
  assert.equal(observerView.teams.red.lifecycle.label, 'Done')
  assert.equal(observerView.teams.blue.lifecycle.label, 'Done')
  assert.equal(observerView.decisionText, 'Red wins')
})

test('resolved replay waits for payload without falling back to live combat display', () => {
  const publicSession = makePublicSession({
    phase: 'round_review',
    replayStatus: 'resolved',
    replayAvailable: true,
    lastResult: {
      reason: 'Round review loaded',
      winner: 'red',
      remainingHealth: { red: 55, blue: 65 },
      damage: { red: 45, blue: 35 },
    },
  })

  const observerView = buildRefereeObserverView({
    publicSession,
    replayPayload: null,
  })

  assert.equal(observerView.stage, 'resolved_replay')
  assert.equal(observerView.canUseCurrentResult, true)
  assert.equal(observerView.canUseReplayPayload, true)
  assert.equal(observerView.showReplay, false)
  assert.equal(observerView.showReplayStatus, true)
  assert.equal(observerView.showCockpitStrip, true)
  assert.equal(observerView.replayEventCount, 0)
  assert.equal(observerView.teams.red.damageTaken, 45)
  assert.equal(observerView.teams.blue.damageTaken, 35)
  assert.equal(observerView.teams.red.hitCount, 0)
  assert.equal(observerView.teams.blue.hitCount, 0)
  assert.equal(observerView.decisionText, 'Red wins')
})

test('round 2 loadout has no stale current result display', () => {
  const publicSession = makePublicSession({
    phase: 'submission_phase',
    round: 2,
    replayStatus: 'none',
    replayAvailable: false,
    lastResult: {
      reason: 'Round 1 completed',
      winner: 'red',
      remainingHealth: { red: 10, blue: 90 },
      damage: { red: 90, blue: 10 },
    },
  })

  const observerView = buildRefereeObserverView({
    publicSession,
    replayPayload: makeReplayPayload(),
  })

  assert.equal(observerView.stage, 'loadout_window')
  assert.equal(observerView.canUseCurrentResult, false)
  assert.equal(observerView.canUseReplayPayload, false)
  assert.equal(observerView.showReplay, false)
  assert.equal(observerView.replayClockLabel, '--')
  assert.equal(observerView.showCockpitStrip, true)
  assert.equal(observerView.teams.red.damageTaken, 0)
  assert.equal(observerView.teams.red.hitCount, 0)
  assert.equal(observerView.teams.red.lifecycle.label, 'Building')
  assert.equal(observerView.teams.blue.lifecycle.label, 'Building')
  assert.equal(observerView.teams.red.healthLabel, 'Pending')
  assert.equal(observerView.decisionText, 'Submission Phase')
})

test('resolved replay hides the stage cockpit strip when replay payload is rendered', () => {
  const publicSession = makePublicSession({
    phase: 'combat_resolved',
    replayStatus: 'resolved',
    replayAvailable: true,
    lastResult: {
      reason: 'Replay complete',
      winner: 'red',
      remainingHealth: { red: 90, blue: 10 },
      damage: { red: 10, blue: 90 },
    },
  })

  const observerView = buildRefereeObserverView({
    publicSession,
    replayPayload: makeReplayPayload(),
  })

  assert.equal(observerView.stage, 'resolved_replay')
  assert.equal(observerView.showCockpitStrip, false)
  assert.equal(observerView.decisionText, 'Red wins')
})

test('panel helpers avoid stale round result in loadout state', () => {
  const publicSession = makePublicSession({
    phase: 'submission_phase',
    round: 2,
    replayStatus: 'none',
    replayAvailable: false,
    lastResult: {
      reason: 'Round 1 completed',
      winner: 'blue',
      remainingHealth: { red: 1, blue: 1 },
      damage: { red: 99, blue: 99 },
    },
  })

  const observerView = buildRefereeObserverView({
    publicSession,
    replayPayload: null,
  })

  assert.equal(observerView.teams.red.damageTaken, 0)
  assert.equal(observerView.teams.red.hitCount, 0)
  assert.equal(observerView.teams.blue.hitCount, 0)
  assert.equal(observerView.teams.red.healthLabel, 'Pending')
  assert.equal(observerView.teams.red.lifecycle.label, 'Building')
  assert.equal(observerView.teams.blue.lifecycle.label, 'Building')
})
