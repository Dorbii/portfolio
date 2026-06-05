import {
  TEAM_ROLES,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import { DEFAULT_STARTING_GOLD } from './sessionSupport.js'
import type {
  StoredRoleState,
  StoredSessionState,
} from './sessionTypes.js'

export function createInitialRoleState(
  role: TeamRole,
  claimTokenHash: string,
): StoredRoleState {
  return {
    role,
    claimTokenHash,
    gold: DEFAULT_STARTING_GOLD,
    wins: 0,
    losses: 0,
    winStreak: 0,
    inventory: [],
    privateChatLog: [],
  }
}

export function ensureStoredSessionDefaults(state: StoredSessionState): void {
  state.rateLimits ??= {}
  state.awardOptions ??= []
  state.awardHistory ??= []
  state.chatLog ??= []

  for (const role of TEAM_ROLES) {
    ensureStoredRoleDefaults(state.roles[role])
  }
}

function ensureStoredRoleDefaults(role: StoredRoleState): void {
  role.wins ??= 0
  role.losses ??= 0
  role.winStreak ??= 0
  role.privateChatLog ??= []
}
