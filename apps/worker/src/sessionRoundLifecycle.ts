import {
  TEAM_ROLES,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import {
  calculateInterest,
  calculateWinnerBonus,
} from './roundEconomy.js'
import {
  DEFAULT_BASE_INCOME,
  DEFAULT_WIN_STREAK_TARGET,
} from './sessionSupport.js'
import type { StoredSessionState } from './sessionTypes.js'

export type MatchCompletion = {
  reason: string
  winner: TeamRole | 'draw'
}

export function applyCombatResultToScore(state: StoredSessionState): void {
  const result = state.lastResult

  if (!result) {
    return
  }

  if (result.winner === 'draw') {
    for (const role of TEAM_ROLES) {
      state.roles[role].winStreak = 0
    }

    return
  }

  const winner = state.roles[result.winner]
  const loserRole = result.winner === 'red' ? 'blue' : 'red'
  const loser = state.roles[loserRole]

  winner.wins += 1
  winner.winStreak += 1
  loser.losses += 1
  loser.winStreak = 0
}

export function shouldCompleteMatch(state: StoredSessionState): boolean {
  return (
    TEAM_ROLES.some(
      (role) => state.roles[role].winStreak >= DEFAULT_WIN_STREAK_TARGET,
    ) || state.round >= state.maxRounds
  )
}

export function resolveMatchCompletion(state: StoredSessionState): MatchCompletion {
  const red = state.roles.red
  const blue = state.roles.blue
  const scoreWinner =
    red.wins === blue.wins ? 'draw' : red.wins > blue.wins ? 'red' : 'blue'
  const streakWinner = TEAM_ROLES.find(
    (role) => state.roles[role].winStreak >= DEFAULT_WIN_STREAK_TARGET,
  )

  if (streakWinner) {
    return {
      reason: `${streakWinner} reached a ${DEFAULT_WIN_STREAK_TARGET}-win streak.`,
      winner: streakWinner,
    }
  }

  return {
    reason: `Max rounds reached with score Red ${red.wins} - Blue ${blue.wins}.`,
    winner: scoreWinner,
  }
}

export function applyNextRoundEconomy(state: StoredSessionState): void {
  for (const role of TEAM_ROLES) {
    const team = state.roles[role]
    const interest = calculateInterest(team.gold)
    const winnerBonus = calculateWinnerBonus(state.lastResult, role)

    team.gold += DEFAULT_BASE_INCOME + interest + winnerBonus
    team.controls = undefined
    team.currentDesign = undefined
    team.loadoutBuildState = undefined
    team.loadoutVersion = undefined
    team.loadoutConfirmedAt = undefined
  }

  state.round += 1
  state.combat = undefined
  state.replay = undefined
  delete state.lastResult
}
