import type { TeamRole } from '../../../packages/schemas/src/index.js'
import type { LegacyCombatSummary } from './sessionLegacyContracts.js'

const DEFAULT_INTEREST_RATE = 0.1
const DEFAULT_INTEREST_CAP = 25

export const DEFAULT_WINNER_BONUS = 25

export function calculateInterest(unspentGold: number): number {
  return Math.min(
    Math.floor(Math.max(0, unspentGold) * DEFAULT_INTEREST_RATE),
    DEFAULT_INTEREST_CAP,
  )
}

export function calculateWinnerBonus(
  result: LegacyCombatSummary | undefined,
  role: TeamRole,
): number {
  return result?.winner === role ? DEFAULT_WINNER_BONUS : 0
}
