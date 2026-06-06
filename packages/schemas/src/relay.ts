import type {
  ArenaConfig,
  AgentChatMessageRequest,
  BotBlueprint,
  CombatBotSnapshot,
  CombatTurnSnapshot,
  GeneratedControls,
  InventoryItem,
  RoundPlanSubmission,
  SessionPhase,
  SessionChatMessage,
  TeamEconomySummary,
  TeamRole,
  TurnCommandSubmission,
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

// CODEX_INTENT: define the external-agent bootstrap contract that uses one player key for claim/resume.
// CODEX_RISK: interface
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export type AgentBootstrapRequest = {
  agentName?: string
}

export type RoleResetRequest = {
  role: TeamRole
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
    | 'role_reset'
    | 'phase_changed'
    | 'round_plan_submitted'
    | 'turn_command_submitted'
    | 'turn_command_timed_out'
    | 'combat_resolved'
    | 'round_advanced'
    | 'economy_applied'
    | 'session_completed'
  message: string
}

export type CombatTurnPublicState = {
  tick: number
  openedAt: string
  deadlineAt: string
  turnSeconds: number
  submitted: Record<TeamRole, boolean>
}

export type CombatTurnPrivateState = CombatTurnPublicState & {
  snapshot: CombatTurnSnapshot
  self: CombatBotSnapshot
  opponent: CombatBotSnapshot
}

export type RolePublicState = Partial<TeamEconomySummary> & {
  role: TeamRole
  claimed: boolean
  submitted: boolean
}

export type PublicSessionState = {
  sessionId: string
  stateVersion: string
  phase: SessionPhase
  round: number
  maxRounds: number
  expiresAt: string
  arena: ArenaConfig
  roles: Record<TeamRole, RolePublicState>
  combat?: CombatTurnPublicState
  replayAvailable: boolean
  lastResult?: CombatSummary
  chatLog: SessionChatMessage[]
  eventLog: SessionLogEvent[]
}

export type RolePrivateState = Partial<TeamEconomySummary> & {
  sessionId: string
  stateVersion: string
  role: TeamRole
  phase: SessionPhase
  round: number
  expiresAt: string
  gold: number
  inventory: InventoryItem[]
  controls?: GeneratedControls
  submitted: boolean
  ownSubmission?: RoundPlanSubmission
  combat?: CombatTurnPrivateState
  opponent: RolePublicState
  replayAvailable: boolean
  lastResult?: CombatSummary
  chatLog: SessionChatMessage[]
  privateChatLog: SessionChatMessage[]
  eventLog: SessionLogEvent[]
}

export type ReplayPayload = {
  round: number
  duration: number
  events: {
    t: number
    type: string
    [key: string]: unknown
  }[]
  summary: string
  botBlueprints: Record<TeamRole, BotBlueprint>
}

export type CreateSessionResponse = {
  sessionId: string
  phase: SessionPhase
  invites: RoleInvite[]
  refereeToken: string
  publicState: PublicSessionState
}

export type RoleClaimResponse = {
  sessionId: string
  role: TeamRole
  roleToken: string
  state: RolePrivateState
}

export type AgentNextAction =
  | 'wait_for_opponent_claim'
  | 'submit_round_plan'
  | 'submit_turn_command'
  | 'wait_for_opponent_submission'
  | 'wait_for_opponent_turn'
  | 'wait_for_referee'
  | 'wait_for_next_round'
  | 'stop'

export type AgentBootstrapResponse = {
  sessionId: string
  role: TeamRole
  claimedNow: boolean
  state: RolePrivateState
  publicState: PublicSessionState
  nextAction: AgentNextAction
}

export type RoleResetResponse = {
  invite: RoleInvite
  publicState: PublicSessionState
}

export type RoundSubmissionResponse = {
  state: RolePrivateState
  publicState: PublicSessionState
}

export type TurnCommandResponse = {
  state: RolePrivateState
  publicState: PublicSessionState
}

export type TurnCommandPostRequest = TurnCommandSubmission

export type AgentChatMessageResponse = {
  message: SessionChatMessage
  state: RolePrivateState
  publicState: PublicSessionState
}

export type AgentChatMessagePostRequest = AgentChatMessageRequest

export type AgentPrivateChatMessageResponse = {
  message: SessionChatMessage
  state: RolePrivateState
}

export type AgentPrivateChatMessagePostRequest = AgentChatMessageRequest

export type AdvanceRoundResponse = {
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
