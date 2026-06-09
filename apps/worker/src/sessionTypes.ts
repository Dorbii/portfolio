import type {
  ArenaConfig,
  ActiveActionSet,
  BotDesignSnapshot,
  CanonicalGameAction,
  ChampionContinuationSave,
  ChampionContinuationSeed,
  CombatBudget,
  CombatRoundPlan,
  CombatPlanConsumptionSummary,
  CombatTurnSnapshot,
  GameMasterActionSubmission,
  GeneratedControls,
  InventoryItem,
  LoadoutBuildState,
  FightDossier,
  MachineDesign,
  MachineRuntimeState,
  RelayErrorResponse,
  SessionPhase,
  SharedDebrief,
  StoredDesign,
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
import type { ReplayEvent } from '../../../packages/replay/src/index.js'

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
  storedDesign?: StoredDesign
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
  /**
   * Legacy tick index retained for old packets/tests. In lockstep mode this is the
   * current combat round-plan index.
   */
  nextTick: number
  mode?: 'legacy_tick_actions' | 'lockstep_round_plan'
  openedAt: string
  deadlineAt: string
  turnSeconds: number
  roundSeconds?: number
  decisionVersion?: number
  startGate?: {
    readyBy: Partial<Record<TeamRole, string>>
    graceDeadlineAt: string
  }
  baselineMachineDesigns?: Partial<Record<TeamRole, MachineDesign>>
  /** Legacy one-canonical-action-per-tick history. Kept until the UI/tests are fully migrated. */
  actions: Record<TeamRole, CanonicalGameAction[]>
  /** Legacy pending canonical actions. Not authoritative in lockstep mode. */
  pending: Partial<Record<TeamRole, CanonicalGameAction>>
  /** Legacy GPT semantic queue. Superseded by submittedPlans. */
  plans?: Partial<Record<TeamRole, StoredCombatPlanStep[]>>
  budgets?: Partial<Record<TeamRole, CombatBudget>>
  submittedPlans?: Partial<Record<TeamRole, CombatRoundPlan>>
  planConsumption?: Partial<Record<TeamRole, CombatPlanConsumptionSummary>>
  lockstepEvents?: ReplayEvent[]
  lockstepLog?: string[]
  elapsedSubsteps?: number
  machineRuntime?: Partial<Record<TeamRole, MachineRuntimeState>>
  snapshot: CombatTurnSnapshot
}

export type StoredCombatPlanStep = {
  kind: 'move' | 'attack' | 'utility' | 'hold' | 'surrender'
  actionId?: string
  cellId?: string
  attackActionId?: string
  targetCellId?: string
  weaponSlot?: 'weaponA' | 'weaponB'
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
