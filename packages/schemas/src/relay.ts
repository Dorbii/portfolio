import type {
  ArenaConfig,
  GeneratedControls,
  InventoryItem,
  RoundPlanSubmission,
  SessionPhase,
  TeamRole,
  ValidationIssue,
} from './types.js'

export type CreateSessionRequest = {
  sessionId?: string
  seed?: string
  maxRounds?: number
  ttlSeconds?: number
  arena?: ArenaConfig
}

export type RoleInvite = {
  role: TeamRole
  claimToken: string
  claimPath: string
}

export type RoleClaimRequest = {
  role: TeamRole
  claimToken: string
  agentName?: string
}

export type CombatSummary = {
  winner: TeamRole | 'draw'
  reason: string
  damage: Record<TeamRole, number>
  remainingHealth: Record<TeamRole, number>
}

export type SessionLogEvent = {
  at: string
  type:
    | 'session_created'
    | 'role_claimed'
    | 'phase_changed'
    | 'round_plan_submitted'
    | 'combat_resolved'
  message: string
}

export type RolePublicState = {
  role: TeamRole
  claimed: boolean
  submitted: boolean
}

export type PublicSessionState = {
  sessionId: string
  phase: SessionPhase
  round: number
  maxRounds: number
  expiresAt: string
  arena: ArenaConfig
  roles: Record<TeamRole, RolePublicState>
  replayAvailable: boolean
  lastResult?: CombatSummary
  eventLog: SessionLogEvent[]
}

export type RolePrivateState = {
  sessionId: string
  role: TeamRole
  phase: SessionPhase
  round: number
  expiresAt: string
  gold: number
  inventory: InventoryItem[]
  controls?: GeneratedControls
  submitted: boolean
  ownSubmission?: RoundPlanSubmission
  opponent: RolePublicState
  replayAvailable: boolean
  lastResult?: CombatSummary
  eventLog: SessionLogEvent[]
}

export type CreateSessionResponse = {
  sessionId: string
  phase: SessionPhase
  invites: RoleInvite[]
  publicState: PublicSessionState
}

export type RoleClaimResponse = {
  sessionId: string
  role: TeamRole
  roleToken: string
  state: RolePrivateState
}

export type RoundSubmissionResponse = {
  state: RolePrivateState
  publicState: PublicSessionState
}

export type RelayErrorCode =
  | 'BAD_JSON'
  | 'INVALID_ACTION'
  | 'INVALID_REQUEST'
  | 'INVALID_ROLE'
  | 'INVALID_TOKEN'
  | 'RATE_LIMITED'
  | 'ROLE_ALREADY_CLAIMED'
  | 'SESSION_EXPIRED'
  | 'SESSION_EXISTS'
  | 'SESSION_NOT_FOUND'
  | 'WORKER_NOT_CONFIGURED'
  | 'PHASE_CLOSED'
  | 'ALREADY_SUBMITTED'
  | 'SUBMISSION_INVALID'
  | 'REPLAY_NOT_AVAILABLE'

export type RelayErrorResponse = {
  ok: false
  error: {
    code: RelayErrorCode
    message: string
    issues?: ValidationIssue[]
  }
}
