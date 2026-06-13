import { createReplayTimeline, type ReplayTimeline } from '../../../../packages/replay/src/index.js'
import type { PublicSessionState } from '../agent/agentSessionTypes.js'
import {
  arenaConfig,
  mockBotBlueprints,
  mockReplay,
  mockTeamIdentities,
} from '../mockSession'
import type { ReplayPayload } from './refereeClient'

export type RefereeReplayProofMode = 'machine'

export function resolveRefereeReplayProofMode(search: string): RefereeReplayProofMode | null {
  const params = new URLSearchParams(search)

  return params.get('proof') === 'machine' ? 'machine' : null
}

export function createRefereeReplayProof(now = new Date()): {
  publicSession: PublicSessionState
  replayPayload: ReplayPayload
} {
  const fightStartedAt = new Date(now.getTime() - 45_000).toISOString()
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  const replayPayload: ReplayPayload = {
    timeline: refereeMatchReplay,
    teamIdentities: mockTeamIdentities,
    botBlueprints: mockBotBlueprints,
  }

  return {
    publicSession: {
      sessionId: 's_machine_replay_proof',
      stateVersion: 'machine-replay-proof:v1',
      phase: 'replay_phase',
      round: 1,
      maxRounds: 3,
      expiresAt,
      arena: arenaConfig,
      roles: {
        red: {
          role: 'red',
          identity: mockTeamIdentities.red,
          claimed: true,
          submitted: true,
          wins: 0,
          losses: 1,
          winStreak: 0,
        },
        blue: {
          role: 'blue',
          identity: mockTeamIdentities.blue,
          claimed: true,
          submitted: true,
          wins: 1,
          losses: 0,
          winStreak: 1,
        },
      },
      combat: {
        tick: 8,
        openedAt: fightStartedAt,
        deadlineAt: new Date(now.getTime() + 30_000).toISOString(),
        turnSeconds: 60,
        fightStartedAt,
        submitted: {
          red: true,
          blue: true,
        },
        mode: 'lockstep_round_plan',
      },
      replayStatus: 'resolved',
      replayAvailable: true,
      replayVersion: 'machine-replay-proof:v1',
      lastResult: {
        winner: 'blue',
        reason: 'Ion Net disables Crimson Circuit after trapping it against the west rail.',
        damage: {
          red: 30,
          blue: 0,
        },
        remainingHealth: {
          red: 0,
          blue: 40,
        },
      },
      continuation: {
        completedFightCount: 1,
      },
      chatLog: [
        {
          id: 'proof-red-lock',
          at: new Date(now.getTime() - 40_000).toISOString(),
          round: 1,
          phase: 'combat_turn',
          role: 'red',
          agentName: mockTeamIdentities.red.name,
          kind: 'strategy',
          message: 'Closing behind the wedge and trying to force a rail pin.',
        },
        {
          id: 'proof-blue-lock',
          at: new Date(now.getTime() - 35_000).toISOString(),
          round: 1,
          phase: 'combat_turn',
          role: 'blue',
          agentName: mockTeamIdentities.blue.name,
          kind: 'strategy',
          message: 'Kiting toward the center hazard and keeping the net lined up on the drive side.',
        },
      ],
      eventLog: [],
    },
    replayPayload,
  }
}

const refereeMatchReplay: ReplayTimeline = createReplayTimeline({
  ...mockReplay,
  round: 1,
  summary: 'Ion Net disables Crimson Circuit after trapping it against the west rail.',
})
