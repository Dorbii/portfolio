import type {
  AgentChatMessageRequest,
  ArenaConfig,
  BotBlueprint,
  ChampionContinuationSave,
  ChampionRecord,
  CombatBotSnapshot,
  CombatTurnSnapshot,
  GeneratedControls,
  GameMasterNextAction,
  GameMasterPacket,
  InventoryItem,
  PostFightAgentReflection,
  SessionPhase,
  SharedDebrief,
  TeamEconomySummary,
  TeamRole,
  TurnCommand,
} from '../../../packages/schemas/src/index.js'

export const LEGACY_TEAM_LOGO_MARKS = [
  'shield',
  'bolt',
  'gear',
  'star',
  'wedge',
  'crosshair',
] as const

export type LegacyTeamLogoMark = (typeof LEGACY_TEAM_LOGO_MARKS)[number]

export type LegacyTeamIdentity = {
  name: string
  primaryColor: string
  logo?: {
    mark: LegacyTeamLogoMark
    initials?: string
  }
}

export type LegacySessionLogEvent = {
  at: string
  type:
    | 'session_created'
    | 'role_claimed'
    | 'role_reset'
    | 'phase_changed'
    | 'round_plan_submitted'
    | 'turn_command_submitted'
    | 'turn_command_timed_out'
    | 'game_action_submitted'
    | 'combat_resolved'
    | 'reflection_submitted'
    | 'debrief_generated'
    | 'round_advanced'
    | 'economy_applied'
    | 'session_completed'
    | 'session_saved'
    | 'session_continued'
    | 'session_quit'
  message: string
}

export type LegacyLoadoutWindowState = {
  openedAt: string
  deadlineAt: string
  planSeconds: number
}

export type LegacyConfirmedLoadoutView = {
  blueprint: BotBlueprint
  confirmedAt?: string
}

export type LegacyCombatTurnPublicState = {
  tick: number
  openedAt: string
  deadlineAt: string
  turnSeconds: number
  submitted: Record<TeamRole, boolean>
}

export type LegacyCombatTurnPrivateState = LegacyCombatTurnPublicState & {
  snapshot: CombatTurnSnapshot
  self: CombatBotSnapshot
  opponent: CombatBotSnapshot
  decision: unknown
}

export type LegacyRolePublicState = Partial<TeamEconomySummary> & {
  role: TeamRole
  identity?: LegacyTeamIdentity
  claimed: boolean
  submitted: boolean
}

export type LegacyPublicSessionState = {
  sessionId: string
  stateVersion: string
  phase: SessionPhase
  round: number
  maxRounds: number
  expiresAt: string
  arena: ArenaConfig
  roles: Record<TeamRole, LegacyRolePublicState>
  roundPlan?: LegacyLoadoutWindowState
  combat?: LegacyCombatTurnPublicState
  gameMaster?: Partial<Record<TeamRole, Pick<GameMasterPacket, 'phase' | 'nextAction' | 'decisionVersion' | 'eventVersion' | 'actionSetId'>>>
  replayAvailable: boolean
  lastResult?: LegacyCombatSummary
  continuation: {
    completedFightCount: number
    sharedDebrief?: SharedDebrief
    saved?: boolean
    quit?: boolean
    continuedSessionId?: string
    championRole?: TeamRole
    championRecord?: ChampionRecord
    challengerBonusGold?: number
  }
  chatLog: LegacySessionChatMessage[]
  eventLog: LegacySessionLogEvent[]
}

export type LegacyRolePrivateState = Partial<TeamEconomySummary> & {
  sessionId: string
  stateVersion: string
  role: TeamRole
  identity?: LegacyTeamIdentity
  phase: SessionPhase
  round: number
  expiresAt: string
  gold: number
  inventory: InventoryItem[]
  controls?: GeneratedControls
  submitted: boolean
  ownLoadout?: LegacyConfirmedLoadoutView
  roundPlan?: LegacyLoadoutWindowState
  combat?: LegacyCombatTurnPrivateState
  gameMaster?: GameMasterPacket
  opponent: LegacyRolePublicState
  replayAvailable: boolean
  lastResult?: LegacyCombatSummary
  chatLog: LegacySessionChatMessage[]
  privateChatLog: LegacySessionChatMessage[]
  eventLog: LegacySessionLogEvent[]
}

export type LegacyCombatSummary = {
  winner: TeamRole | 'draw'
  reason: string
  damage: Record<TeamRole, number>
  remainingHealth: Record<TeamRole, number>
}

export type LegacySessionChatMessage = {
  id: string
  at: string
  round: number
  phase: SessionPhase
  role: TeamRole
  agentName?: string
  kind: 'taunt' | 'observation' | 'strategy' | 'reflection'
  message: string
}

export type LegacyRoleClaimResponse = {
  sessionId: string
  role: TeamRole
  roleToken: string
  state: LegacyRolePrivateState
}

export type LegacyCreateSessionResponse = {
  sessionId: string
  phase: SessionPhase
  invites: {
    role: TeamRole
    claimToken: string
    observerToken: string
    claimPath: string
  }[]
  refereeToken: string
  publicState: LegacyPublicSessionState
}

export type LegacyAgentBootstrapResponse = {
  sessionId: string
  role: TeamRole
  claimedNow: boolean
  state: LegacyRolePrivateState
  publicState: LegacyPublicSessionState
  nextAction: GameMasterNextAction
  packet: GameMasterPacket
}

export type LegacyRoleResetResponse = {
  invite: {
    role: TeamRole
    claimToken: string
    observerToken: string
    claimPath: string
  }
  publicState: LegacyPublicSessionState
}

export type LegacyAgentChatMessageResponse = {
  message: LegacySessionChatMessage
  state: LegacyRolePrivateState
  publicState: LegacyPublicSessionState
}

export type LegacyAgentChatMessagePostRequest = AgentChatMessageRequest

export type LegacyAgentPrivateChatMessageResponse = {
  message: LegacySessionChatMessage
  state: LegacyRolePrivateState
}

export type LegacyAgentPrivateChatMessagePostRequest = AgentChatMessageRequest

export type LegacyPostFightReflectionReceipt = {
  reflectionId: string
  fightId: string
  role: TeamRole
  status: 'private_pending' | 'consumed_into_shared_debrief'
  submittedAt: string
}

export type LegacyPostFightReflectionResponse = {
  reflection: LegacyPostFightReflectionReceipt
  packet: GameMasterPacket
}

export type LegacyPostFightReflectionPostRequest = PostFightAgentReflection

export type LegacyAdvanceRoundResponse = {
  publicState: LegacyPublicSessionState
}

export type LegacySaveCompletedSessionResponse = {
  save: ChampionContinuationSave
  publicState: LegacyPublicSessionState
}

export type LegacyContinueChampionSessionResponse = {
  save: ChampionContinuationSave
  nextSessionId: string
  nextSession: LegacyCreateSessionResponse
  publicState: LegacyPublicSessionState
}

export type LegacyQuitCompletedSessionResponse = {
  publicState: LegacyPublicSessionState
}

export type LegacyReplayPayload = {
  round: number
  duration: number
  events: {
    t: number
    type: string
    [key: string]: unknown
  }[]
  summary: string
  teamIdentities: Record<TeamRole, LegacyTeamIdentity>
  botBlueprints: Record<TeamRole, BotBlueprint>
}

export type LegacySubmittedCombatCommands = Record<TeamRole, TurnCommand[]>
