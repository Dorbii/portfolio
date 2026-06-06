import {
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import { DEFAULT_STARTING_GOLD } from './sessionSupport.js'
import type { StoredRoleState } from './sessionTypes.js'

export function createInitialRoleState(
  role: TeamRole,
  claimTokenHash: string,
  observerTokenHash?: string,
): StoredRoleState {
  return {
    role,
    claimTokenHash,
    observerTokenHash,
    gold: DEFAULT_STARTING_GOLD,
    wins: 0,
    losses: 0,
    winStreak: 0,
    inventory: [],
    privateChatLog: [],
  }
}
