import type {
  ArenaConfig,
  AgentChatMessageRequest,
  BotBlueprint,
  CombatBotSnapshot,
  ArenaGridCell,
  ArenaHazardThreat,
  CombatTurnSnapshot,
  GeneratedControls,
  InventoryItem,
  MovementCommand,
  PreferredRange,
  RoundPlanSubmission,
  SessionPhase,
  SessionChatMessage,
  TeamEconomySummary,
  TeamIdentity,
  TeamRole,
  TurnCommandSubmission,
  TurnCommand,
  UtilityCommand,
  ValidationIssue,
  WeaponCommand,
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
  teamIdentity?: TeamIdentity
}

// CODEX_INTENT: define the external-agent bootstrap contract that uses one player key for claim/resume.
// CODEX_RISK: interface
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export type AgentBootstrapRequest = {
  agentName?: string
  teamIdentity?: TeamIdentity
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

export type CombatRangeBand = 'contact' | 'close' | 'mid' | 'long'

export type CombatTurnLegalCommands = {
  movement: MovementCommand[]
  weaponA?: WeaponCommand[]
  weaponB?: WeaponCommand[]
  utility?: UtilityCommand[]
}

export type CombatTurnDecisionContext = {
  tick: number
  deadlineAt: string
  turnSeconds: number
  legalCommands: CombatTurnLegalCommands
  range: {
    distance: number
    band: CombatRangeBand
    preferred: PreferredRange
    selfWeaponReach: number
    opponentWeaponReach: number
    insideSelfWeaponReach: boolean
    insideOpponentWeaponReach: boolean
  }
  positioning: {
    selfCell: ArenaGridCell
    opponentCell: ArenaGridCell
    distanceCells: number
    bearingToOpponent: 'north' | 'south' | 'east' | 'west' | 'same_cell'
    lineOfSight: boolean
  }
  hazards: {
    active: string[]
    selfThreats: ArenaHazardThreat[]
    opponentThreats: ArenaHazardThreat[]
    threatenedLegalMoves: {
      command: MovementCommand
      targetCell: ArenaGridCell
      hazards: ArenaHazardThreat[]
    }[]
  }
  health: {
    selfPct: number
    opponentPct: number
    deltaPct: number
    retreatAtHealthPct: number
  }
  arenaPressure: {
    selfDistanceToNearestWall: number
    opponentDistanceToNearestWall: number
    selfNearWall: boolean
    opponentNearWall: boolean
    selfNearHazard: boolean
    opponentNearHazard: boolean
    selfNearCenterHazard: boolean
    opponentNearCenterHazard: boolean
    activeHazards: string[]
  }
  actionReadiness: {
    weaponA: {
      canFire: boolean
      reason: string
    }
    weaponB?: {
      canFire: boolean
      reason: string
    }
    utility?: {
      canActivate: boolean
      reason: string
    }
  }
  movementOptions: {
    recommended: MovementCommand[]
    avoid: MovementCommand[]
    reasons: string[]
  }
  previousResolvedTurn?: {
    self?: TurnCommand
    opponent?: TurnCommand
  }
  tacticalCues: string[]
}

export type RoundPlanWindowState = {
  openedAt: string
  deadlineAt: string
  planSeconds: number
}

export type CombatTurnPrivateState = CombatTurnPublicState & {
  snapshot: CombatTurnSnapshot
  self: CombatBotSnapshot
  opponent: CombatBotSnapshot
  decision: CombatTurnDecisionContext
}

export type RolePublicState = Partial<TeamEconomySummary> & {
  role: TeamRole
  identity?: TeamIdentity
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
  roundPlan?: RoundPlanWindowState
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
  identity?: TeamIdentity
  phase: SessionPhase
  round: number
  expiresAt: string
  gold: number
  inventory: InventoryItem[]
  controls?: GeneratedControls
  submitted: boolean
  ownSubmission?: RoundPlanSubmission
  roundPlan?: RoundPlanWindowState
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
