import type {
  ArenaConfig,
  ActiveActionSet,
  BotDesignSnapshot,
  CanonicalGameAction,
  ChampionContinuationSave,
  ChampionContinuationSeed,
  CombatTurnSnapshot,
  GameMasterActionSubmission,
  GeneratedControls,
  InventoryItem,
  LoadoutBuildState,
  FightDossier,
  RelayErrorResponse,
  SessionPhase,
  SharedDebrief,
  PostFightAgentReflection,
  TeamRole,
} from '../../../packages/schemas/src/index.js'
import type {
  LegacyCombatSummary,
  LegacyReplayPayload,
  LegacySessionChatMessage,
  LegacySessionLogEvent,
  LegacyTeamIdentity,
} from './sessionLegacyContracts.js'

export type TokenKind = 'claim' | 'observer' | 'role' | 'referee'
export type TokenOwner = TeamRole | 'referee'
export type TokenFactory = (owner: TokenOwner, kind: TokenKind) => string
export type Clock = () => string
export type TokenHasher = (token: string) => Promise<string>

export type RateLimitAction =
  | 'claim'
  | 'action'
  | 'state'
  | 'chat'
  | 'private_chat'
  | 'reflection'
  | 'advance_round'
  | 'reset_role'
  | 'save_session'
  | 'continue_session'
  | 'quit_session'

export type RateLimitRule = {
  windowMs: number
  max: number
}

export type StoredRoleState = {
  role: TeamRole
  claimTokenHash: string
  observerTokenHash?: string
  roleTokenHash?: string
  agentName?: string
  teamIdentity?: LegacyTeamIdentity
  claimedAt?: string
  gold: number
  wins: number
  losses: number
  winStreak: number
  inventory: InventoryItem[]
  currentDesign?: BotDesignSnapshot
  loadoutBuildState?: LoadoutBuildState
  loadoutVersion?: number
  loadoutConfirmedAt?: string
  controls?: GeneratedControls
  privateChatLog: LegacySessionChatMessage[]
}

export type StoredPostFightReflectionStatus =
  | 'private_pending'
  | 'consumed_into_shared_debrief'

export type StoredPostFightReflection = {
  reflectionId: string
  status: StoredPostFightReflectionStatus
  submittedAt: string
  consumedAt?: string
  debriefId?: string
  reflection: PostFightAgentReflection
}

export type StoredCombatState = {
  nextTick: number
  openedAt: string
  deadlineAt: string
  turnSeconds: number
  actions: Record<TeamRole, CanonicalGameAction[]>
  pending: Partial<Record<TeamRole, CanonicalGameAction>>
  snapshot: CombatTurnSnapshot
}

export type StoredRoundPlanState = {
  openedAt: string
  deadlineAt: string
  planSeconds: number
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
  roundPlan?: StoredRoundPlanState
  combat?: StoredCombatState
  activeActionSets?: Partial<Record<TeamRole, ActiveActionSet>>
  lockedActions?: Partial<Record<TeamRole, LockedGameAction>>
  replay?: LegacyReplayPayload
  lastResult?: LegacyCombatSummary
  reflections?: StoredPostFightReflection[]
  fightDossier?: FightDossier
  sharedDebrief?: SharedDebrief
  championSave?: ChampionContinuationSave
  sourceChampionSave?: ChampionContinuationSave
  continuationSeed?: ChampionContinuationSeed
  continuedSessionId?: string
  quitAt?: string
  chatLog: LegacySessionChatMessage[]
  eventLog: LegacySessionLogEvent[]
  rateLimits: Record<string, StoredRateLimit>
}

export type LockedGameAction = Pick<
  GameMasterActionSubmission,
  'actionSetId' | 'decisionVersion' | 'actionId'
> & {
  role: TeamRole
  submittedAt: string
  requestHash: string
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

export type RoleBearerScope = 'agent' | 'observer'

export type RoleBearerAuth = {
  role: StoredRoleState
  scope: RoleBearerScope
}
