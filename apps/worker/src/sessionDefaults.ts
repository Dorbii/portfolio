import {
  TEAM_ROLES,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import { DEFAULT_STARTING_GOLD } from './sessionSupport.js'
import type {
  StoredRoleState,
  StoredSessionState,
} from './sessionTypes.js'

type LegacyStoredSessionState = Omit<StoredSessionState, 'phase'> & {
  phase: StoredSessionState['phase'] | 'referee_awards' | 'apply_awards'
  awardOptions?: unknown
  awardHistory?: unknown
}

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
  const legacyState = state as LegacyStoredSessionState

  if (legacyState.phase === 'referee_awards' || legacyState.phase === 'apply_awards') {
    state.phase = 'round_review'
  }

  delete legacyState.awardOptions
  delete legacyState.awardHistory

  state.rateLimits ??= {}
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
