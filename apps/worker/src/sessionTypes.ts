import type {
  AppliedRefereeAward,
  ArenaConfig,
  CombatSummary,
  GeneratedControls,
  InventoryItem,
  NormalizedRoundPlanSubmission,
  RefereeAwardOption,
  RelayErrorResponse,
  ReplayPayload,
  RoundPlanSubmission,
  SessionChatMessage,
  SessionLogEvent,
  SessionPhase,
  TeamRole,
} from '../../../packages/schemas/src/index.js'

export type TokenKind = 'claim' | 'role' | 'referee'
export type TokenOwner = TeamRole | 'referee'
export type TokenFactory = (owner: TokenOwner, kind: TokenKind) => string
export type Clock = () => string
export type TokenHasher = (token: string) => Promise<string>

export type RateLimitAction =
  | 'claim'
  | 'state'
  | 'submit'
  | 'chat'
  | 'private_chat'
  | 'referee_awards'
  | 'reset_role'

export type RateLimitRule = {
  windowMs: number
  max: number
}

export type StoredRoleState = {
  role: TeamRole
  claimTokenHash: string
  roleTokenHash?: string
  agentName?: string
  claimedAt?: string
  submittedAt?: string
  gold: number
  wins: number
  losses: number
  winStreak: number
  inventory: InventoryItem[]
  controls?: GeneratedControls
  submission?: RoundPlanSubmission
  normalizedSubmission?: NormalizedRoundPlanSubmission
  submissionBaseline?: {
    gold: number
    inventory: InventoryItem[]
  }
  privateChatLog: SessionChatMessage[]
}

export type StoredSessionState = {
  id: string
  phase: SessionPhase
  round: number
  maxRounds: number
  seed: string
  arena: ArenaConfig
  createdAt: string
  expiresAt: string
  updatedAt: string
  roles: Record<TeamRole, StoredRoleState>
  refereeTokenHash?: string
  awardOptions: RefereeAwardOption[]
  awardHistory: AppliedRefereeAward[]
  replay?: ReplayPayload
  lastResult?: CombatSummary
  chatLog: SessionChatMessage[]
  eventLog: SessionLogEvent[]
  rateLimits: Record<string, StoredRateLimit>
}

export type StoredRateLimit = {
  count: number
  resetAt: string
}

export type SessionResult<T> =
  | {
      ok: true
      value: T
    }
  | RelayErrorResponse

export type RoleBearerAuth = {
  role: StoredRoleState
}
