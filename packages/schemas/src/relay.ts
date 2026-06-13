import type {
  AgentChatMessageRequest,
  AgentConnectionAction,
  AgentConnectionPacket,
  AgentConnectionResponse,
  ArenaConfig,
  BotBlueprint,
  ReplayLifecycleStatus,
  PostFightAgentReflection,
  SharedDebrief,
  SessionChatMessage,
  SessionPhase,
  TeamEconomySummary,
  TeamIdentity,
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
  observerToken: string
  claimPath: string
}

export type RoleClaimRequest = {
  role: TeamRole
  claimToken: string
  agentName?: string
  teamIdentity: TeamIdentity
}

export type AgentBootstrapRequest = {
  agentName: string
  teamIdentity: TeamIdentity
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
    | 'loadout_ready'
    | 'combat_start_staged'
    | 'combat_started'
    | 'game_action_submitted'
    | 'combat_plan_timed_out'
    | 'combat_resolved'
    | 'round_advanced'
    | 'economy_applied'
    | 'reflection_submitted'
    | 'session_completed'
  message: string
}

export type RolePublicState = Partial<TeamEconomySummary> & {
  role: TeamRole
  identity?: TeamIdentity
  claimed: boolean
  submitted: boolean
}

export type PublicContinuationState = {
  completedFightCount: number
  sharedDebrief?: SharedDebrief
  fightArchive: PublicFightArchiveEntry[]
}

export type PublicFightArchiveEntry = {
  fightId: string
  winner: TeamRole | 'draw'
  reason: string
  duration: number
  damageTaken: Record<TeamRole, number>
  replayAvailable: boolean
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
  agent?: Partial<Record<TeamRole, Pick<AgentConnectionPacket, 'phase' | 'nextAction' | 'decisionVersion' | 'eventVersion'>>>
  replayStatus: ReplayLifecycleStatus
  replayAvailable: boolean
  replayVersion?: string
  lastResult?: CombatSummary
  continuation: PublicContinuationState
  chatLog: SessionChatMessage[]
  eventLog: SessionLogEvent[]
}

export type RolePrivateState = Partial<TeamEconomySummary> & {
  sessionId: string
  stateVersion: string
  role: TeamRole
  identity?: TeamIdentity
  phase: SessionPhase
  round: number
  expiresAt: string
  agentPacket: AgentConnectionPacket
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
  teamIdentities: Record<TeamRole, TeamIdentity>
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

export type AgentBootstrapResponse = AgentConnectionPacket

export type RoleResetResponse = {
  invite: RoleInvite
  publicState: PublicSessionState
}

export type AgentConnectionActionPostRequest = AgentConnectionAction

export type AgentConnectionActionResponse = AgentConnectionResponse<PublicSessionState>

export type PostFightReflectionPostRequest = PostFightAgentReflection

export type PostFightReflectionResponse = {
  packet: AgentConnectionPacket
}

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
  | 'FORBIDDEN'
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
