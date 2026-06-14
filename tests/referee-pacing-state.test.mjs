import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildRefereePacingState,
  resolveRefereeAutoAdvanceGate,
} from '../.test-build/apps/web/src/referee/refereePacingState.js'
import {
  formatLivePlaybackStatus,
  formatLivePlaybackStatusLabel,
} from '../.test-build/apps/web/src/referee/livePlaybackStatusCopy.js'

const NOW = Date.parse('2026-06-03T00:00:05.000Z')

function makePublicSession(overrides = {}) {
  return {
    sessionId: 's_pacing',
    stateVersion: 'v1',
    phase: 'submission_phase',
    round: 1,
    maxRounds: 3,
    expiresAt: '2026-06-03T01:00:00.000Z',
    arena: { name: 'Arena' },
    roles: {
      red: {
        role: 'red',
        claimed: true,
        submitted: false,
        wins: 0,
        losses: 0,
        winStreak: 0,
      },
      blue: {
        role: 'blue',
        claimed: true,
        submitted: false,
        wins: 0,
        losses: 0,
        winStreak: 0,
      },
    },
    replayStatus: 'none',
    replayAvailable: false,
    continuation: {
      completedFightCount: 0,
      fightArchive: [],
    },
    chatLog: [],
    eventLog: [
      {
        at: '2026-06-03T00:00:00.000Z',
        type: 'session_created',
        message: 'Session created.',
      },
    ],
    ...overrides,
  }
}

function reviewRoleState(role, {
  debriefAvailable = false,
  fightId = 'fight_1',
  opponentSubmitted = false,
  required = true,
  submitted = false,
} = {}) {
  return {
    role,
    agentPacket: {
      review: {
        fightId,
        reflection: {
          required,
          submitted,
          opponentSubmitted,
        },
        debrief: {
          available: debriefAvailable,
        },
      },
    },
  }
}

function livePlaybackStatus(overrides = {}) {
  return {
    bufferDepthSeconds: 0,
    bufferHealth: 0,
    lastSeq: 0,
    maxCommittedEventTime: 0,
    playheadTime: 0,
    serverLagSeconds: 0,
    status: 'idle',
    targetDelaySeconds: 1.2,
    ...overrides,
  }
}

test('pacing state shows the blocking combat agent', () => {
  const publicSession = makePublicSession({
    phase: 'combat_turn',
    combat: {
      tick: 2,
      openedAt: '2026-06-03T00:00:04.000Z',
      deadlineAt: '2026-06-03T00:01:04.000Z',
      turnSeconds: 60,
      submitted: {
        red: true,
        blue: false,
      },
    },
  })

  const pacing = buildRefereePacingState({
    nowMs: NOW,
    publicSession,
    roleStates: {},
  })

  assert.equal(pacing.viewerStateLabel, 'Waiting on agents')
  assert.equal(pacing.activeBlockerLabel, 'Blue thinking')
  assert.equal(pacing.roleStates.red.label, 'Red submitted')
  assert.equal(pacing.roleStates.blue.label, 'Blue thinking')
})

test('pacing state separates confirmed playback from next decision handoff', () => {
  const publicSession = makePublicSession({
    phase: 'combat_turn',
    combat: {
      tick: 3,
      openedAt: '2026-06-03T00:00:06.500Z',
      deadlineAt: '2026-06-03T00:01:06.500Z',
      turnSeconds: 60,
      submitted: {
        red: false,
        blue: false,
      },
    },
  })

  const pacing = buildRefereePacingState({
    livePlaybackStatus: livePlaybackStatus({
      bufferDepthSeconds: 0.8,
      bufferHealth: 0.6,
      maxCommittedEventTime: 2.4,
      playheadTime: 1.6,
      status: 'playing',
    }),
    nowMs: NOW,
    publicSession,
    roleStates: {},
  })

  assert.equal(pacing.viewerStateLabel, 'Playing confirmed combat')
  assert.equal(pacing.activeBlockerLabel, 'Next decision pending')
  assert.equal(pacing.metrics.lastCombatBurstLabel, '2.4s')
  assert.equal(pacing.metrics.combatWatchedVsWallLabel, '2.4s / 5s')
})

test('round review blocks on the missing reflection before shared debrief', () => {
  const publicSession = makePublicSession({
    phase: 'round_review',
    replayStatus: 'resolved',
    replayAvailable: true,
    continuation: {
      completedFightCount: 1,
      fightArchive: [
        {
          fightId: 'fight_1',
          winner: 'red',
          reason: 'Red wins.',
          duration: 12,
          damageTaken: { red: 0, blue: 40 },
          replayAvailable: true,
        },
      ],
    },
  })
  const roleStates = {
    red: reviewRoleState('red', { required: false, submitted: true }),
    blue: reviewRoleState('blue', { required: true, submitted: false, opponentSubmitted: true }),
  }

  const pacing = buildRefereePacingState({
    nowMs: NOW,
    publicSession,
    roleStates,
  })
  const gate = resolveRefereeAutoAdvanceGate(publicSession, roleStates)

  assert.equal(pacing.viewerStateLabel, 'Round review')
  assert.equal(pacing.activeBlockerLabel, 'Blue thinking')
  assert.equal(gate.ready, false)
  assert.equal(gate.reason, 'Blue reflection pending.')
})

test('round review can auto advance only after shared debrief covers the latest fight', () => {
  const publicSession = makePublicSession({
    phase: 'round_review',
    replayStatus: 'resolved',
    replayAvailable: true,
    continuation: {
      completedFightCount: 1,
      fightArchive: [
        {
          fightId: 'fight_1',
          winner: 'blue',
          reason: 'Blue wins.',
          duration: 9,
          damageTaken: { red: 40, blue: 5 },
          replayAvailable: true,
        },
      ],
      sharedDebrief: {
        debriefId: 's_pacing:debrief:fight_1',
        sourceSessionId: 's_pacing',
        fightIds: ['fight_1'],
        summary: 'Blue won on measured fight data.',
        championImprovementHints: [],
        challengerCounterplayHints: [],
        evidence: [],
      },
    },
  })

  const pacing = buildRefereePacingState({
    nowMs: NOW,
    publicSession,
    roleStates: {},
  })

  assert.equal(pacing.activeBlockerLabel, 'Waiting for referee round advance')
  assert.equal(pacing.autoAdvanceGate.ready, true)
  assert.equal(pacing.roleStates.red.label, 'Red submitted')
  assert.equal(pacing.roleStates.blue.label, 'Blue submitted')
})

test('live playback status copy hides buffer implementation language', () => {
  const drained = livePlaybackStatus({ status: 'drained', pausedReason: 'buffer_drained' })
  const playing = livePlaybackStatus({
    bufferDepthSeconds: 1.2,
    status: 'catching_up',
  })

  assert.equal(formatLivePlaybackStatusLabel(drained), 'Caught up; next decision pending')
  assert.equal(formatLivePlaybackStatus(drained).includes('Live buffer'), false)
  assert.equal(formatLivePlaybackStatusLabel(playing), 'Playing confirmed combat')
  assert.equal(formatLivePlaybackStatus(playing), 'Playing confirmed combat; 1.2s buffered.')
})
