import type {
  AgentChatMessageRequest,
  ArenaConfig,
  BotBlueprint,
  ChampionRecord,
  CombatBotSnapshot,
  CombatBudget,
  CombatPlanConsumptionSummary,
  CombatRoundPlan,
  CombatTurnSnapshot,
  GeneratedControls,
  GameMasterActionResponse,
  GameMasterActionSubmission,
  GameMasterPacket,
  InventoryItem,
  MachineDesign,
  PostFightAgentReflection,
  PostFightReflectionResponse,
  SessionPhase,
  SharedDebrief,
  TeamEconomySummary,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { LegacyTeamIdentity } from '../shared/teamVisuals'

export type CombatDecisionBrief = {
  tick: number
  deadlineAt: string
  turnSeconds: number
  range: {
    distance: number
    band: 'contact' | 'close' | 'mid' | 'long'
    preferred: string
    selfWeaponReach: number
    opponentWeaponReach: number
    insideSelfWeaponReach: boolean
    insideOpponentWeaponReach: boolean
  }
  positioning: Record<string, unknown>
  hazards: Record<string, unknown>
  health: Record<string, number>
  arenaPressure: Record<string, unknown>
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
  movementGuidance: {
    reasons: string[]
  }
  previousResolvedTurn?: unknown
  tacticalCues: string[]
}

export type CombatTurnPublicState = {
  tick: number
  openedAt: string
  deadlineAt: string
  turnSeconds: number
  submitted: Record<TeamRole, boolean>
  mode?: 'legacy_tick_actions' | 'lockstep_round_plan'
  roundSeconds?: number
  decisionVersion?: number
  budgets?: Partial<Record<TeamRole, CombatBudget>>
  planConsumption?: Partial<Record<TeamRole, CombatPlanConsumptionSummary>>
}

export type CombatTurnPrivateState = CombatTurnPublicState & {
  snapshot: CombatTurnSnapshot
  self: CombatBotSnapshot
  opponent: CombatBotSnapshot
  decision: CombatDecisionBrief
  submittedPlans?: Partial<Record<TeamRole, CombatRoundPlan>>
  lockstepEvents?: unknown[]
  lockstepLog?: string[]
  elapsedSubsteps?: number
}

export type SessionChatMessage = {
  id: string
  at: string
  round: number
  phase: SessionPhase
  role: TeamRole
  agentName?: string
  kind: 'taunt' | 'observation' | 'strategy' | 'reflection'
  message: string
}

export type SessionLogEvent = {
  at: string
  type: string
  message: string
}

export type RolePublicState = Partial<TeamEconomySummary> & {
  role: TeamRole
  identity?: LegacyTeamIdentity
  claimed: boolean
  submitted: boolean
}

export type ConfirmedLoadoutView = {
  blueprint: BotBlueprint
  confirmedAt?: string
  // CODEX_INTENT: carry machine-authority loadout data through private state for cockpit/replay visual parity.
  // CODEX_RISK: interface
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  machineDesign?: MachineDesign
}

export type PublicContinuationState = {
  completedFightCount: number
  sharedDebrief?: SharedDebrief
  saved?: boolean
  quit?: boolean
  continuedSessionId?: string
  championRole?: TeamRole
  championRecord?: ChampionRecord
  challengerBonusGold?: number
}

export type RoleInvite = {
  role: TeamRole
  claimToken: string
  observerToken: string
  claimPath: string
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
  roundPlan?: {
    openedAt: string
    deadlineAt: string
    planSeconds: number
  }
  combat?: CombatTurnPublicState
  gameMaster?: Partial<Record<TeamRole, Pick<GameMasterPacket, 'phase' | 'nextAction' | 'decisionVersion' | 'eventVersion' | 'actionSetId'>>>
  replayAvailable: boolean
  lastResult?: CombatSummary
  continuation: PublicContinuationState
  chatLog: SessionChatMessage[]
  eventLog: SessionLogEvent[]
}

export type RolePrivateState = Partial<TeamEconomySummary> & {
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
  ownLoadout?: ConfirmedLoadoutView
  roundPlan?: PublicSessionState['roundPlan']
  combat?: CombatTurnPrivateState
  gameMaster?: GameMasterPacket
  opponent: RolePublicState
  replayAvailable: boolean
  lastResult?: CombatSummary
  chatLog: SessionChatMessage[]
  privateChatLog: SessionChatMessage[]
  eventLog: SessionLogEvent[]
}

export type AgentBootstrapResponse = GameMasterPacket
export type GameMasterActionPostRequest = GameMasterActionSubmission
export type GameMasterActionClientResponse = GameMasterActionResponse
export type PostFightReflectionPostRequest = PostFightAgentReflection
export type PostFightReflectionClientResponse = PostFightReflectionResponse

export type CombatSummary = {
  winner: TeamRole | 'draw'
  reason: string
  damage: Record<TeamRole, number>
  remainingHealth: Record<TeamRole, number>
}

export type RoleClaimResponse = {
  sessionId: string
  role: TeamRole
  roleToken: string
  state: RolePrivateState
}

export type CreateSessionResponse = {
  sessionId: string
  phase: SessionPhase
  invites: RoleInvite[]
  refereeToken: string
  publicState: PublicSessionState
}

export type RoleResetResponse = {
  invite: RoleInvite
  publicState: PublicSessionState
}

export type AdvanceRoundResponse = {
  publicState: PublicSessionState
}

export type AgentChatMessageResponse = {
  message: SessionChatMessage
  state: RolePrivateState
  publicState: PublicSessionState
}

export type AgentPrivateChatMessageResponse = {
  message: SessionChatMessage
  state: RolePrivateState
}

export type AgentChatMessagePostRequest = AgentChatMessageRequest
export type AgentPrivateChatMessagePostRequest = AgentChatMessageRequest
