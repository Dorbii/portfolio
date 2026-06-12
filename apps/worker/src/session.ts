import {
  TEAM_ROLES,
  normalizeCompactBuildActionSubmission,
  normalizeCompactCombatPlanSubmission,
  validateAgentBootstrapRequestShape,
  validateAgentChatMessageRequestShape,
  validateGameMasterActionParameters,
  validateGameMasterActionSubmissionShape,
  validatePostFightAgentReflectionShape,
  validateRoleClaimRequestShape,
  validateRoleResetRequestShape,
  type ActiveActionSet,
  type AgentBootstrapRequest,
  type CanonicalGameAction,
  type CombatBudget,
  type CombatPlanStep,
  type CombatRoundPlan,
  type CombatRoundPlanSubmission,
  type GameMasterActionKind,
  type GameMasterActionParameters,
  type GameMasterActionSubmission,
  type GameMasterLegalAction,
  type GameMasterNextAction,
  type GameMasterPacket,
  type InventoryItem,
  type GameMasterPhase,
  type MachineDesign,
  type MachineRuntimeState,
  type NormalizedGameMasterActionParameters,
  type RelayErrorResponse,
  type PostFightAgentReflection,
  type RoleClaimRequest,
  type RoleResetRequest,
  type SessionPhase,
  type SharedDebrief,
  type CompactBuildPacket,
  type LoadoutBuildState,
  type MachineCapabilities,
  type StoredDesign,
  type TeamRole,
  type ValidationIssue,
  type BotDesignSnapshot,
  type BotBlueprint,
  type GeneratedControls,
} from '../../../packages/schemas/src/index.js'
import {
  PART_CATALOG,
  defaultTacticsForBlueprint,
  deriveControls,
} from '../../../packages/catalog/src/index.js'
import { createReplayTimeline, type ReplayTimeline } from '../../../packages/replay/src/index.js'
import {
  applyLoadoutAction,
  botDesignSnapshotToLegacyBotBlueprintProjection,
  buildAgentBoardView,
  buildCombatPlanBoardView,
  buildLoadoutActionSet,
  buildFightDossier,
  deriveMachineCapabilities,
  deriveCombatBudget,
  buildCompactBuildView,
  buildCompactCombatView,
  createInitialLoadoutBuildState,
  createLoadoutBuildStateFromStoredDesign,
  ensureLoadoutBuildState,
  resolveCompactBuildAction,
  isLoadoutBuilderAction,
  LOADOUT_PART_LIMIT,
  loadoutLegalActionForPacket,
  machineDesignToLegacyBotBlueprintProjection,
  machineDesignToLegacyBotDesignSnapshotProjection,
  normalizeCombatRoundPlanSubmission as normalizeCombatRoundPlanSubmissionForSim,
  resolveLockstepCombatRound,
  resolveSubmittedGameActions,
  mergeFightDossier,
  validateCombatRoundPlanAgainstBoard,
  type CombatResult,
  type ResolveCombatInput,
} from '../../../packages/sim/src/index.js'
import {
  appendPrivateRoleChatMessages,
  appendRoleChatMessages,
  appendSessionEvent,
} from './sessionMessages.js'
import {
  findRoleBearer,
  findRoleAuthByToken,
  hasRefereeCapabilityToken,
} from './sessionAuth.js'
import { takeSessionRateLimit } from './sessionRateLimits.js'
import {
  applyCombatResultToScore,
  applyNextRoundEconomy,
  resolveMatchCompletion,
  shouldCompleteMatch,
} from './sessionRoundLifecycle.js'
import { resetStoredRoleClaim } from './sessionRoleReset.js'
import {
  cloneJson,
  combatSummary,
  addMilliseconds,
  defaultClock,
  defaultTokenFactory,
  defaultTokenHasher,
  isTeamRole,
  mergeRateLimits,
  nextActionForRole,
  normalizeTeamIdentity,
  relayError,
} from './sessionSupport.js'
import {
  createInitialSessionState,
  type InternalCreateSessionRequest,
} from './sessionCreation.js'
import {
  buildPacketReviewMetadata,
  consumePendingReflectionsIntoDebrief,
  hasStoredReflection,
  latestCompletedFightId,
  sharedDebriefCoversFight,
  storePrivateReflection,
  storedReflectionForRole,
} from './sessionContinuation.js'
import {
  buildPublicSessionState,
  buildRolePrivateState,
} from './sessionStateViews.js'
import { validateAgentBootstrapPatchRequestShape } from './sessionBootstrapValidation.js'
import type { LegacyTeamIdentity } from './sessionLegacyContracts.js'
import type {
  LegacyAdvanceRoundResponse,
  LegacyAgentBootstrapResponse,
  LegacyAgentChatMessagePostRequest,
  LegacyAgentChatMessageResponse,
  LegacyAgentPrivateChatMessagePostRequest,
  LegacyAgentPrivateChatMessageResponse,
  LegacyCreateSessionResponse,
  LegacyReplayPayload,
  LegacyRoleClaimResponse,
  LegacyRolePrivateState,
  LegacyRoleResetResponse,
  LegacySessionChatMessage,
  LegacySessionLogEvent,
} from './sessionLegacyContracts.js'
import type {
  Clock,
  RateLimitAction,
  RateLimitRule,
  RoleBearerAuth,
  SessionResult,
  StoredCombatState,
  LockedGameAction,
  StoredRoleState,
  StoredSessionState,
  TokenFactory,
  TokenHasher,
} from './sessionTypes.js'

export {
  calculateInterest,
} from './roundEconomy.js'
export { createSessionId } from './sessionSupport.js'
export type { StoredRoleState, StoredSessionState } from './sessionTypes.js'

const COMBAT_TURN_SECONDS = 60
const FIGHT_SECONDS = 300
const COMBAT_TURN_HANDOFF_DELAY_MS = 10_000
const COMBAT_TURN_START_GATE_GRACE_MS = 120_000
const ROUND_PLAN_SECONDS = 240
const GAME_MASTER_CATALOG_VERSION = 'part-catalog:v1'
const GAME_MASTER_ARENA_VERSION = 'arena:v1'
const GAME_MASTER_SUBMISSION_KEYS = new Set([
  'action',
  'actionSetId',
  'decisionVersion',
  'actionId',
  'parameters',
  'publicMessage',
])

export class SessionCoordinator {
  private state: StoredSessionState

  private readonly clock: Clock

  private readonly tokenFactory: TokenFactory

  private readonly tokenHasher: TokenHasher

  private readonly rateLimits: Record<RateLimitAction, RateLimitRule>

  private readonly pendingClaimTokens?: Record<TeamRole, string>

  private readonly pendingObserverTokens?: Record<TeamRole, string>

  private readonly pendingRefereeToken?: string

  private constructor(
    state: StoredSessionState,
    options: {
      clock?: Clock
      tokenFactory?: TokenFactory
      tokenHasher?: TokenHasher
      rateLimits?: Partial<Record<RateLimitAction, RateLimitRule>>
      pendingClaimTokens?: Record<TeamRole, string>
      pendingObserverTokens?: Record<TeamRole, string>
      pendingRefereeToken?: string
    } = {},
  ) {
    this.state = state
    this.clock = options.clock ?? defaultClock
    this.tokenFactory = options.tokenFactory ?? defaultTokenFactory
    this.tokenHasher = options.tokenHasher ?? defaultTokenHasher
    this.rateLimits = mergeRateLimits(options.rateLimits)
    this.pendingClaimTokens = options.pendingClaimTokens
    this.pendingObserverTokens = options.pendingObserverTokens
    this.pendingRefereeToken = options.pendingRefereeToken
  }

  static async create(
    request: InternalCreateSessionRequest = {},
    options: {
      clock?: Clock
      tokenFactory?: TokenFactory
      tokenHasher?: TokenHasher
      rateLimits?: Partial<Record<RateLimitAction, RateLimitRule>>
    } = {},
  ): Promise<SessionCoordinator> {
    const created = await createInitialSessionState(request, options)

    return new SessionCoordinator(created.state, {
      clock: created.clock,
      tokenFactory: created.tokenFactory,
      tokenHasher: created.tokenHasher,
      rateLimits: options.rateLimits,
      pendingClaimTokens: created.claimTokens,
      pendingObserverTokens: created.observerTokens,
      pendingRefereeToken: created.refereeToken,
    })
  }

  static fromState(
    state: StoredSessionState,
    options: {
      clock?: Clock
      tokenFactory?: TokenFactory
      tokenHasher?: TokenHasher
      rateLimits?: Partial<Record<RateLimitAction, RateLimitRule>>
    } = {},
  ): SessionCoordinator {
    return new SessionCoordinator(cloneJson(state), options)
  }

  exportState(): StoredSessionState {
    return cloneJson(this.state)
  }

  createResponse(): LegacyCreateSessionResponse {
    if (!this.pendingClaimTokens || !this.pendingObserverTokens || !this.pendingRefereeToken) {
      throw new Error('Capability tokens are only available immediately after session creation.')
    }

    const claimTokens = this.pendingClaimTokens
    const observerTokens = this.pendingObserverTokens

    return {
      sessionId: this.state.id,
      phase: this.state.phase,
      invites: TEAM_ROLES.map((role) => ({
        role,
        claimToken: claimTokens[role],
        observerToken: observerTokens[role],
        claimPath: `/sessions/${this.state.id}/claim`,
      })),
      refereeToken: this.pendingRefereeToken,
      publicState: this.getPublicState(),
    }
  }

  getPublicState(): ReturnType<typeof buildPublicSessionState> {
    const now = this.clock()

    this.resolveTimedTransitions(now)
    this.ensureGameMasterActionSets(now)

    return buildPublicSessionState(this.state)
  }

  async claimRole(request: RoleClaimRequest): Promise<SessionResult<LegacyRoleClaimResponse>> {
    const validation = validateRoleClaimRequestShape(request)

    if (!validation.ok) {
      return relayError(
        'INVALID_REQUEST',
        'Claim request failed validation.',
        validation.issues,
      )
    }

    if (!isTeamRole(request.role)) {
      return relayError('INVALID_ROLE', 'Claim request must choose red or blue.')
    }

    const now = this.clock()
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const rateLimitError = this.takeRateLimit('claim', request.role, now)

    if (rateLimitError) {
      return rateLimitError
    }

    const role = this.state.roles[request.role]

    if (role.claimedAt) {
      return relayError('ROLE_ALREADY_CLAIMED', `${request.role} has already been claimed.`)
    }

    if ((await this.tokenHasher(request.claimToken)) !== role.claimTokenHash) {
      return relayError('INVALID_TOKEN', 'Claim token does not match the requested role.')
    }

    if (!request.teamIdentity) {
      return relayError(
        'INVALID_REQUEST',
        'Claiming a role requires teamIdentity with team name, colorHex, and logoPrompt or logoAsset.',
      )
    }

    role.claimedAt = now
    const roleToken = this.tokenFactory(request.role, 'role')
    role.roleTokenHash = await this.tokenHasher(roleToken)
    role.teamIdentity = role.teamIdentity ??
      normalizeDistinctTeamIdentity(this.state, request.role, normalizeTeamIdentity(request.teamIdentity))

    if (request.agentName?.trim()) {
      role.agentName = request.agentName.trim().slice(0, 80)
    }

    this.touch(now)
    this.appendEvent('role_claimed', `${request.role} role claimed.`, now)
    this.advanceClaimPhase(now)

    return {
      ok: true,
      value: {
        sessionId: this.state.id,
        role: request.role,
        roleToken,
        state: buildRolePrivateState(this.state, role),
      },
    }
  }

  // CODEX_INTENT: let external agents use one stable invite player key to claim or resume a role.
  // CODEX_RISK: interface
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  async bootstrapRole(
    roleName: TeamRole,
    playerKey: string,
    request: Partial<AgentBootstrapRequest> = {},
  ): Promise<SessionResult<LegacyAgentBootstrapResponse>> {
    const validation = validateAgentBootstrapPatchRequestShape(request)

    if (!validation.ok) {
      return relayError(
        'INVALID_REQUEST',
        'Bootstrap request failed validation.',
        validation.issues,
      )
    }

    const now = this.clock()
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const role = this.state.roles[roleName]
    const rateLimitAction: RateLimitAction = role.claimedAt ? 'state' : 'claim'
    const rateLimitError = this.takeRateLimit(rateLimitAction, roleName, now)

    if (rateLimitError) {
      return rateLimitError
    }

    const auth = await findRoleBearer(
      this.state,
      this.tokenHasher,
      roleName,
      playerKey,
      { allowObserver: false, allowUnclaimedClaimKey: true },
    )

    if (!auth) {
      return role.claimedAt
        ? relayError('ROLE_ALREADY_CLAIMED', `${roleName} has already been claimed by another player key.`)
        : relayError('INVALID_TOKEN', 'Player key does not match the requested role.')
    }

    let claimedNow = false

    if (auth.role.claimedAt && request.teamIdentity) {
      const requestedIdentity = normalizeDistinctTeamIdentity(
        this.state,
        roleName,
        normalizeTeamIdentity(request.teamIdentity),
      )

      if (auth.role.teamIdentity && !sameLockedTeamIdentity(auth.role.teamIdentity, requestedIdentity)) {
        return relayError(
          'INVALID_REQUEST',
          'Team identity is locked after the role is claimed.',
        )
      }

      auth.role.teamIdentity = auth.role.teamIdentity ?? requestedIdentity
    }

    if (!auth.role.claimedAt) {
      const publicValidation = validateAgentBootstrapRequestShape(request)

      if (!publicValidation.ok) {
        return relayError(
          'INVALID_REQUEST',
          'Bootstrap request failed validation.',
          publicValidation.issues,
        )
      }

      auth.role.claimedAt = now
      auth.role.teamIdentity = auth.role.teamIdentity ??
        normalizeDistinctTeamIdentity(
          this.state,
          roleName,
          normalizeTeamIdentity((request as AgentBootstrapRequest).teamIdentity),
        )
      claimedNow = true

      auth.role.agentName = (request as AgentBootstrapRequest).agentName.trim().slice(0, 80)

      this.touch(now)
      this.appendEvent('role_claimed', `${roleName} role claimed.`, now)
      this.advanceClaimPhase(now)
    }

    this.resolveTimedTransitions(now)
    this.ensureGameMasterActionSets(now)

    const state = buildRolePrivateState(this.state, auth.role)
    const packet = this.buildGameMasterPacket(roleName, now)

    return {
      ok: true,
      value: {
        sessionId: this.state.id,
        role: roleName,
        claimedNow,
        state,
        publicState: this.getPublicState(),
        nextAction: nextActionForRole(state),
        packet,
      },
    }
  }

  async getRoleStateForToken(roleToken: string): Promise<SessionResult<LegacyRolePrivateState>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'state', now)

    if (!auth.ok) {
      return auth
    }

    this.resolveTimedTransitions(now)
    this.markCombatTurnSeen(auth.value.role.role, now)
    this.ensureGameMasterActionSets(now)

    return {
      ok: true,
      value: {
        ...buildRolePrivateState(this.state, auth.value.role),
        gameMaster: this.buildGameMasterPacket(auth.value.role.role, now),
      },
    }
  }

  async getGameMasterPacketForToken(roleToken: string): Promise<SessionResult<GameMasterPacket>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'state', now)

    if (!auth.ok) {
      return auth
    }

    this.resolveTimedTransitions(now)
    this.markCombatTurnSeen(auth.value.role.role, now)
    this.ensureGameMasterActionSets(now)

    return {
      ok: true,
      value: this.buildGameMasterPacket(auth.value.role.role, now),
    }
  }

  async submitGameMasterAction(
    roleToken: string,
    request: unknown,
  ): Promise<
    SessionResult<{
      packet: GameMasterPacket
      publicState: ReturnType<typeof buildPublicSessionState>
    }>
  > {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'action', now)

    if (!auth.ok) {
      return auth
    }

    this.resolveTimedTransitions(now)
    this.ensureGameMasterActionSets(now)

    if (!isAllowedGameMasterSubmissionShape(request)) {
      return relayError(
        'SUBMISSION_INVALID',
        'GameMaster action submission may include only action, actionSetId, decisionVersion, actionId, parameters, and publicMessage.',
      )
    }

    const validation = validateGameMasterActionSubmissionShape(request)

    if (!validation.ok) {
      return relayError('SUBMISSION_INVALID', 'GameMaster action submission failed validation.', validation.issues)
    }

    const role = auth.value.role
    const submission = request as GameMasterActionSubmission
    const activeSet = this.state.activeActionSets?.[role.role]

    if (!activeSet) {
      return relayError(
        'PHASE_CLOSED',
        `No active GameMaster action set is available for ${role.role} during ${this.state.phase}.`,
      )
    }

    if (submission.actionSetId !== activeSet.actionSetId) {
      return relayError('SUBMISSION_INVALID', 'actionSetId does not match the active action set.')
    }

    if (submission.decisionVersion !== activeSet.decisionVersion) {
      return relayError('SUBMISSION_INVALID', 'decisionVersion is stale or does not match the active action set.')
    }

    const resolvedSubmission = resolveSubmittedGameAction(activeSet, submission)

    if (!resolvedSubmission.ok) {
      return relayError(
        'SUBMISSION_INVALID',
        'GameMaster action submission failed validation.',
        resolvedSubmission.issues,
      )
    }

    const canonicalAction = resolvedSubmission.action

    if (
      this.state.phase === 'combat_turn' &&
      this.state.combat?.mode === 'lockstep_round_plan' &&
      canonicalAction.kind !== 'surrender'
    ) {
      return relayError(
        'SUBMISSION_INVALID',
        'Combat movement, attack, and utility now require submit_combat_round_plan. Only surrender is accepted through submit_game_action during combat.',
      )
    }

    const requestHash = hashGameMasterSubmission(
      submission,
      resolvedSubmission.normalizedParameters,
    )
    const existingLock = this.state.lockedActions?.[role.role]

    if (existingLock) {
      if (
        existingLock.actionSetId === submission.actionSetId &&
        existingLock.decisionVersion === submission.decisionVersion &&
        existingLock.actionId === submission.actionId &&
        existingLock.requestHash === requestHash
      ) {
        return {
          ok: true,
          value: {
            packet: this.buildGameMasterPacket(role.role, now),
            publicState: this.getPublicState(),
          },
        }
      }

      return relayError(
        'ALREADY_SUBMITTED',
        `${role.role} already locked a different GameMaster action for this decision.`,
      )
    }

    if (this.state.phase === 'submission_phase' && isLoadoutBuilderAction(canonicalAction)) {
      return this.applyLoadoutGameMasterAction(
        role.role,
        activeSet,
        submission,
        canonicalAction,
        requestHash,
        now,
      )
    }

    this.lockRoleAction(role.role, activeSet, submission, requestHash, now)
    this.touch(now)
    this.appendEvent('game_action_submitted', `${role.role} locked a GameMaster action.`, now)

    if (this.state.phase === 'combat_turn' && canonicalAction.kind === 'surrender') {
      this.completeSurrender(role.role, now)

      return {
        ok: true,
        value: {
          packet: this.buildGameMasterPacket(role.role, now),
          publicState: this.getPublicState(),
        },
      }
    }

    this.resolveLockedActionsIfReady(now)

    return {
      ok: true,
      value: {
        packet: this.buildGameMasterPacket(role.role, now),
        publicState: this.getPublicState(),
      },
    }
  }

  async submitCompactBuildAction(
    roleToken: string,
    request: unknown,
  ): Promise<
    SessionResult<{
      packet: GameMasterPacket
      compactBuild?: CompactBuildPacket
      publicState: ReturnType<typeof buildPublicSessionState>
    }>
  > {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'action', now)

    if (!auth.ok) {
      return auth
    }

    this.resolveTimedTransitions(now)
    this.ensureGameMasterActionSets(now)

    const normalized = normalizeCompactBuildActionSubmission(request)

    if (!normalized.ok) {
      return relayError('SUBMISSION_INVALID', 'Compact build action failed validation.', normalized.issues)
    }

    if (this.state.phase !== 'submission_phase' || gameMasterPhaseForSession(this.state.phase) !== 'choose_loadout') {
      return relayError('PHASE_CLOSED', `Compact build actions can only be submitted during the build phase, not ${this.state.phase}.`)
    }

    const roleName = auth.value.role.role
    const role = this.state.roles[roleName]
    const activeSet = this.state.activeActionSets?.[roleName]

    if (!activeSet) {
      return relayError(
        'PHASE_CLOSED',
        `No active GameMaster action set is available for ${roleName} during ${this.state.phase}.`,
      )
    }

    const submission = normalized.submission

    if (submission.decisionVersion !== activeSet.decisionVersion) {
      return relayError('SUBMISSION_INVALID', 'decisionVersion is stale or does not match the active action set.')
    }

    const buildState = ensureRoleBuildStateFromStoredDesign(roleName, role)
    const resolved = resolveCompactBuildAction({
      actionSet: activeSet,
      buildState,
      command: submission.command,
    })

    if (!resolved.ok) {
      return relayError('SUBMISSION_INVALID', 'Compact build action failed validation.', resolved.issues)
    }

    // Compact intent resolves into a canonical server-authored action and then
    // reuses the exact legacy submission pipeline (parameter validation,
    // idempotent locking, loadout application). No second legality system.
    const canonicalSubmission: GameMasterActionSubmission = {
      action: 'submit_game_action',
      actionSetId: activeSet.actionSetId,
      decisionVersion: submission.decisionVersion,
      actionId: resolved.value.canonicalAction.id,
      ...(resolved.value.parameters ? { parameters: resolved.value.parameters } : {}),
      ...(submission.publicMessage ? { publicMessage: submission.publicMessage } : {}),
    }
    const resolvedSubmission = resolveSubmittedGameAction(activeSet, canonicalSubmission)

    if (!resolvedSubmission.ok) {
      return relayError('SUBMISSION_INVALID', 'Compact build action failed validation.', resolvedSubmission.issues)
    }

    const canonicalAction = resolvedSubmission.action

    if (!isLoadoutBuilderAction(canonicalAction)) {
      return relayError('SUBMISSION_INVALID', 'Compact build actions may only resolve to loadout builder actions.')
    }

    const requestHash = hashGameMasterSubmission(canonicalSubmission, resolvedSubmission.normalizedParameters)
    const applied = this.applyLoadoutGameMasterAction(
      roleName,
      activeSet,
      canonicalSubmission,
      canonicalAction,
      requestHash,
      now,
    )

    if (!applied.ok) {
      return applied
    }

    return {
      ok: true,
      value: {
        packet: applied.value.packet,
        compactBuild: this.buildCompactBuildPacketForRole(roleName, now),
        publicState: applied.value.publicState,
      },
    }
  }

  buildCompactBuildPacketForRole(roleName: TeamRole, now = this.clock()): CompactBuildPacket | undefined {
    if (gameMasterPhaseForSession(this.state.phase) !== 'choose_loadout') {
      return undefined
    }

    this.ensureGameMasterActionSets(now)

    const role = this.state.roles[roleName]
    const activeSet = this.state.activeActionSets?.[roleName]
    const buildState = ensureRoleBuildStateFromStoredDesign(roleName, role)

    return buildCompactBuildView({
      role: roleName,
      round: this.state.round,
      decisionVersion: activeSet?.decisionVersion ?? decisionVersionForRole(this.state, roleName),
      gold: role.gold,
      buildState,
      actionSet: activeSet,
      store: activeSet?.catalogStore,
    })
  }

  async submitCombatRoundPlan(
    roleToken: string,
    request: unknown,
  ): Promise<
    SessionResult<{
      packet: GameMasterPacket
      publicState: ReturnType<typeof buildPublicSessionState>
      submittedPlan?: CombatRoundPlan
    }>
  > {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'action', now)

    if (!auth.ok) {
      return auth as SessionResult<{
        packet: GameMasterPacket
        publicState: ReturnType<typeof buildPublicSessionState>
        submittedPlan?: CombatRoundPlan
      }>
    }

    this.resolveTimedTransitions(now)
    this.ensureGameMasterActionSets(now)

    return this.submitCombatRoundPlanForRole(auth.value.role.role, request, now)
  }

  private submitCombatRoundPlanForRole(
    roleName: TeamRole,
    request: unknown,
    now: string,
  ): SessionResult<{
    packet: GameMasterPacket
    publicState: ReturnType<typeof buildPublicSessionState>
    submittedPlan?: CombatRoundPlan
  }> {
    const combat = this.state.combat

    if (this.state.phase !== 'combat_turn' || !combat) {
      return relayError('PHASE_CLOSED', 'Combat round plans can only be submitted during combat.')
    }

    if (!isCombatTurnOpen(this.state, now)) {
      return relayError('PHASE_CLOSED', `Combat round ${combat.nextTick} opens at ${combat.openedAt}.`)
    }

    const normalized = isRecord(request) && request.action === 'submit_combat_plan'
      ? normalizeCompactCombatPlanSubmission(request)
      : normalizeCombatRoundPlanSubmissionForSim(request)

    if (!normalized.ok) {
      return relayError('SUBMISSION_INVALID', 'Combat round plan failed validation.', (normalized as { ok: false; issues: ValidationIssue[] }).issues)
    }

    const submission = normalized.submission
    const decisionVersion = decisionVersionForRole(this.state, roleName)

    if (submission.round !== this.state.round) {
      return relayError('SUBMISSION_INVALID', `Combat round plan round ${submission.round} does not match current round ${this.state.round}.`)
    }

    if (submission.decisionVersion !== decisionVersion) {
      return relayError('SUBMISSION_INVALID', 'decisionVersion is stale or does not match the current combat round.')
    }

    const budget = this.ensureCombatBudgetForRole(roleName)
    const selfCombat = roleName === 'red' ? combat.snapshot.red : combat.snapshot.blue
    const opponentCombat = roleName === 'red' ? combat.snapshot.blue : combat.snapshot.red
    const board = buildCombatPlanBoardView({
      arena: this.state.arena,
      role: roleName,
      self: selfCombat,
      opponent: opponentCombat,
      actions: [],
      snapshot: combat.snapshot,
      budget,
      machineCapabilities: machineCapabilitiesForRole(this.state.roles[roleName]),
    })
    const validation = validateCombatRoundPlanAgainstBoard({
      submission,
      budget,
      board,
    })

    if (!validation.ok) {
      return relayError('SUBMISSION_INVALID', 'Combat round plan failed board/budget validation.', (validation as { ok: false; issues: ValidationIssue[] }).issues)
    }

    const plan: CombatRoundPlan = {
      role: roleName,
      round: this.state.round,
      decisionVersion,
      steps: validation.normalizedSteps.length > 0
        ? validation.normalizedSteps.map(cloneCombatPlanStep)
        : [{ kind: 'end_turn' }],
      submittedAt: now,
    }
    const existing = combat.submittedPlans?.[roleName]

    if (existing) {
      if (combatRoundPlansEquivalent(existing, plan)) {
        return {
          ok: true,
          value: {
            packet: this.buildGameMasterPacket(roleName, now),
            publicState: this.getPublicState(),
            submittedPlan: existing,
          },
        }
      }

      return relayError('ALREADY_SUBMITTED', `${roleName} already submitted a different combat round plan.`)
    }

    combat.submittedPlans = {
      ...(combat.submittedPlans ?? {}),
      [roleName]: plan,
    }
    this.touch(now)
    this.appendEvent(
      'game_action_submitted',
      `${roleName} submitted ${plan.steps.length} combat round plan step${plan.steps.length === 1 ? '' : 's'}.`,
      now,
    )
    this.resolveCombatTurnIfReady(now)

    return {
      ok: true,
      value: {
        packet: this.buildGameMasterPacket(roleName, now),
        publicState: this.getPublicState(),
        submittedPlan: plan,
      },
    }
  }

  async submitGptCombatPlan(
    roleToken: string,
    request: unknown,
  ): Promise<
    SessionResult<{
      packet: GameMasterPacket
      publicState: ReturnType<typeof buildPublicSessionState>
      submittedSteps: number
      submittedPlan?: CombatRoundPlan
    }>
  > {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'action', now)

    if (!auth.ok) {
      return auth as SessionResult<{
        packet: GameMasterPacket
        publicState: ReturnType<typeof buildPublicSessionState>
        submittedSteps: number
        submittedPlan?: CombatRoundPlan
      }>
    }

    this.resolveTimedTransitions(now)
    this.ensureGameMasterActionSets(now)

    if (this.state.phase !== 'combat_turn' || !this.state.combat) {
      return relayError('PHASE_CLOSED', 'Combat plans can only be submitted during combat.')
    }

    const roleName = auth.value.role.role
    const submission = combatRoundPlanSubmissionFromGptRequest(
      request,
      this.state.round,
      decisionVersionForRole(this.state, roleName),
    )

    if (!submission) {
      return relayError('SUBMISSION_INVALID', 'Combat plan requires at least one move, attack, utility, or end_turn step.')
    }

    const submittedStepCount = submission.steps.length
    const result = this.submitCombatRoundPlanForRole(roleName, submission, now)

    if (!result.ok) {
      return result as SessionResult<{
        packet: GameMasterPacket
        publicState: ReturnType<typeof buildPublicSessionState>
        submittedSteps: number
        submittedPlan?: CombatRoundPlan
      }>
    }

    return {
      ok: true,
      value: {
        ...result.value,
        submittedSteps: submittedStepCount,
      },
    }
  }

  private applyLoadoutGameMasterAction(
    roleName: TeamRole,
    activeSet: ActiveActionSet,
    submission: GameMasterActionSubmission,
    canonicalAction: CanonicalGameAction,
    requestHash: string,
    now: string,
  ): SessionResult<{
    packet: GameMasterPacket
    publicState: ReturnType<typeof buildPublicSessionState>
  }> {
    const role = this.state.roles[roleName]
    const existingLock = this.state.lockedActions?.[roleName]

    if (existingLock) {
      if (
        existingLock.actionSetId === submission.actionSetId &&
        existingLock.decisionVersion === submission.decisionVersion &&
        existingLock.actionId === submission.actionId &&
        existingLock.requestHash === requestHash
      ) {
        return {
          ok: true,
          value: {
            packet: this.buildGameMasterPacket(roleName, now),
            publicState: this.getPublicState(),
          },
        }
      }

      return relayError(
        'ALREADY_SUBMITTED',
        `${roleName} already locked a different GameMaster action for this decision.`,
      )
    }

    const result = applyLoadoutAction({
      role: roleName,
      gold: role.gold,
      inventory: role.inventory,
      buildState: role.loadoutBuildState,
      action: canonicalAction,
    })

    if (!result.ok) {
      return relayError('SUBMISSION_INVALID', 'Loadout action failed validation.', result.issues)
    }

    if (result.confirmed) {
      const legacyDesign = storedDesignToLegacyBotDesignSnapshotProjection(
        result.buildState.currentDesign,
        result.buildState.legacyDraft?.name,
      )

      role.storedDesign = result.buildState.currentDesign
      role.currentDesign = legacyDesign
      role.loadoutBuildState = result.buildState
      applyCombatCompatibilityControls(role, result.buildState.currentDesign)
      role.loadoutConfirmedAt = now
      this.lockRoleAction(roleName, activeSet, submission, requestHash, now)
      this.touch(now)
      this.appendEvent('game_action_submitted', `${roleName} confirmed a server-built loadout.`, now)
      this.appendEvent('loadout_ready', `${roleName} loadout ready for combat.`, now)
      this.resolveLockedActionsIfReady(now)

      return {
        ok: true,
        value: {
          packet: this.buildGameMasterPacket(roleName, now),
          publicState: this.getPublicState(),
        },
      }
    }

    role.gold = result.gold
    role.inventory = result.inventory
    role.storedDesign = result.buildState.currentDesign
    role.currentDesign = storedDesignToLegacyBotDesignSnapshotProjection(
      result.buildState.currentDesign,
      result.buildState.legacyDraft?.name,
    )
    role.loadoutBuildState = result.buildState
    role.loadoutVersion = (role.loadoutVersion ?? 0) + 1
    this.touch(now)
    this.appendEvent('game_action_submitted', `${roleName} applied a server-authored loadout action.`, now)

    return {
      ok: true,
      value: {
        packet: this.buildGameMasterPacket(roleName, now),
        publicState: this.getPublicState(),
      },
    }
  }

  async submitChatMessage(
    roleToken: string,
    request: unknown,
  ): Promise<SessionResult<LegacyAgentChatMessageResponse>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'chat', now)

    if (!auth.ok) {
      return auth
    }

    const role = auth.value.role
    const validation = validateAgentChatMessageRequestShape(request, 'public')

    if (!validation.ok) {
      return relayError('INVALID_REQUEST', 'Chat message failed validation.', validation.issues)
    }

    const [message] = this.appendChatMessages(
      role,
      [request as LegacyAgentChatMessagePostRequest],
      now,
    )

    this.touch(now)

    return {
      ok: true,
      value: {
        message,
        state: buildRolePrivateState(this.state, role),
        publicState: this.getPublicState(),
      },
    }
  }

  async submitPrivateChatMessage(
    roleToken: string,
    request: unknown,
  ): Promise<SessionResult<LegacyAgentPrivateChatMessageResponse>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'private_chat', now)

    if (!auth.ok) {
      return auth
    }

    const role = auth.value.role
    const validation = validateAgentChatMessageRequestShape(request, 'private')

    if (!validation.ok) {
      return relayError('INVALID_REQUEST', 'Private chat message failed validation.', validation.issues)
    }

    const [message] = this.appendPrivateChatMessages(
      role,
      [request as LegacyAgentPrivateChatMessagePostRequest],
      now,
    )

    return {
      ok: true,
      value: {
        message,
        state: buildRolePrivateState(this.state, role),
      },
    }
  }

  async submitPostFightReflection(
    roleToken: string,
    request: unknown,
  ): Promise<SessionResult<{ packet: GameMasterPacket }>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'reflection', now)

    if (!auth.ok) {
      return auth
    }

    const validation = validatePostFightAgentReflectionShape(request)

    if (!validation.ok) {
      return relayError('INVALID_REQUEST', 'Post-fight reflection failed validation.', validation.issues)
    }

    const reflection = request as PostFightAgentReflection
    const role = auth.value.role
    const fightId = latestCompletedFightId(this.state)

    if (reflection.role !== role.role) {
      return relayError('FORBIDDEN', 'Reflection role must match the authenticated role.')
    }

    if (this.state.phase !== 'round_review' && this.state.phase !== 'session_complete') {
      return relayError(
        'PHASE_CLOSED',
        `Post-fight reflection is available only after a completed fight; current phase is ${this.state.phase}.`,
      )
    }

    if (!this.state.lastResult || !this.state.replay || !this.state.fightDossier || !fightId) {
      return relayError('PHASE_CLOSED', 'Post-fight reflection requires a completed fight and replay dossier.')
    }

    if (reflection.fightId !== fightId) {
      return relayError('INVALID_REQUEST', 'Reflection fightId must match the latest completed fight.')
    }

    if (reflection.decisionVersion !== decisionVersionForState(this.state)) {
      return relayError('INVALID_REQUEST', 'Reflection decisionVersion is stale or does not match the current packet.')
    }

    if (sharedDebriefCoversFight(this.state, fightId)) {
      return relayError('PHASE_CLOSED', 'Post-fight reflection is closed after the shared debrief has been built.')
    }

    const existing = storedReflectionForRole(this.state, role.role, fightId)

    if (existing?.status === 'consumed_into_shared_debrief') {
      return relayError('ALREADY_SUBMITTED', 'Reflection has already been consumed into the shared debrief.')
    }

    if (existing?.status === 'private_pending') {
      return relayError('ALREADY_SUBMITTED', 'Reflection has already been submitted for this fight.')
    }

    storePrivateReflection(this.state, reflection, now)

    if (
      TEAM_ROLES.every((teamRole) => hasStoredReflection(this.state, teamRole, fightId)) &&
      !sharedDebriefCoversFight(this.state, fightId)
    ) {
      consumePendingReflectionsIntoDebrief(this.state, now)
    }

    this.touch(now)
    this.appendEvent('reflection_submitted', `${role.role} submitted private post-fight reflection.`, now)

    return {
      ok: true,
      value: {
        packet: this.buildGameMasterPacket(role.role, now),
      },
    }
  }

  buildContinuationDebrief(): SessionResult<{ sharedDebrief: SharedDebrief }> {
    const now = this.clock()

    if (!this.state.lastResult || !this.state.fightDossier) {
      return relayError('PHASE_CLOSED', 'A completed fight dossier is required before building a debrief.')
    }

    const sharedDebrief = consumePendingReflectionsIntoDebrief(this.state, now)

    if (!sharedDebrief) {
      return relayError('PHASE_CLOSED', 'A completed fight dossier is required before building a debrief.')
    }

    this.touch(now)

    return {
      ok: true,
      value: {
        sharedDebrief,
      },
    }
  }

  async advanceRound(
    refereeToken: string,
  ): Promise<SessionResult<LegacyAdvanceRoundResponse>> {
    const now = this.clock()
    const authError = await this.authorizeRefereeAction(refereeToken, 'advance_round', now)

    if (authError) {
      return authError
    }

    if (this.state.phase !== 'round_review') {
      return relayError(
        'PHASE_CLOSED',
        `Rounds can be advanced only during round_review; current phase is ${this.state.phase}.`,
      )
    }

    if (!this.state.lastResult) {
      return relayError('INVALID_REQUEST', 'Combat result is required before the round can advance.')
    }

    this.applyReviewAndAdvance(now)

    return {
      ok: true,
      value: {
        publicState: this.getPublicState(),
      },
    }
  }

  async advanceRoundAfterSharedDebrief(
    roleToken: string,
  ): Promise<SessionResult<{
    packet: GameMasterPacket
    publicState: ReturnType<typeof buildPublicSessionState>
  }>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'action', now)

    if (!auth.ok) {
      return auth
    }

    this.resolveTimedTransitions(now)

    if (this.state.phase !== 'round_review') {
      return relayError(
        'PHASE_CLOSED',
        `Role-driven round advance is available only during round_review; current phase is ${this.state.phase}.`,
      )
    }

    if (!this.state.lastResult) {
      return relayError('INVALID_REQUEST', 'Combat result is required before the round can advance.')
    }

    const fightId = latestCompletedFightId(this.state)

    if (!fightId || !sharedDebriefCoversFight(this.state, fightId)) {
      return relayError('PHASE_CLOSED', 'Shared debrief must be available before GPT role advance.')
    }

    this.applyReviewAndAdvance(now, 'Agent advanced round review after shared debrief.')
    this.ensureGameMasterActionSets(now)

    return {
      ok: true,
      value: {
        packet: this.buildGameMasterPacket(auth.value.role.role, now),
        publicState: this.getPublicState(),
      },
    }
  }

  async resetRole(
    refereeToken: string,
    request: unknown,
  ): Promise<SessionResult<LegacyRoleResetResponse>> {
    const now = this.clock()
    const authError = await this.authorizeRefereeAction(refereeToken, 'reset_role', now)

    if (authError) {
      return authError
    }

    const validation = validateRoleResetRequestShape(request)

    if (!validation.ok) {
      return relayError('INVALID_REQUEST', 'Role reset request failed validation.', validation.issues)
    }

    if (this.state.phase !== 'waiting_for_agents' && this.state.phase !== 'submission_phase') {
      return relayError(
        'PHASE_CLOSED',
        `Roles can be reset only before combat resolves; current phase is ${this.state.phase}.`,
      )
    }

    const roleName = (request as RoleResetRequest).role
    const reset = await resetStoredRoleClaim(
      this.state,
      roleName,
      this.tokenFactory,
      this.tokenHasher,
    )

    if (!reset.ok) {
      return reset
    }

    const { claimToken, observerToken } = reset.value

    this.touch(now)
    this.appendEvent('role_reset', `${roleName} role reset by referee.`, now)

    if (this.state.phase === 'submission_phase') {
      this.state.roundPlan = undefined
      this.state.activeActionSets = undefined
      this.state.lockedActions = undefined
      this.changePhase('waiting_for_agents', `${roleName} role needs a fresh claim.`, now)
    }

    return {
      ok: true,
      value: {
        invite: {
          role: roleName,
          claimToken,
          observerToken,
          claimPath: `/sessions/${this.state.id}/claim`,
        },
        publicState: this.getPublicState(),
      },
    }
  }

  getReplay(): SessionResult<LegacyReplayPayload> {
    const activeError = this.requireActive()

    if (activeError) {
      return activeError
    }

    this.resolveTimedTransitions()

    if (!this.state.replay) {
      return relayError('REPLAY_NOT_AVAILABLE', 'Replay is available after both loadouts resolve.')
    }

    return {
      ok: true,
      value: cloneJson(this.state.replay),
    }
  }

  private buildGameMasterPacket(roleName: TeamRole, now = this.clock()): GameMasterPacket {
    this.ensureGameMasterActionSets(now)

    const role = this.state.roles[roleName]
    const activeSet = this.state.activeActionSets?.[roleName]
    const locked = this.state.lockedActions?.[roleName]
    const combat = this.state.phase === 'combat_turn' ? this.state.combat : undefined
    const planSubmitted = Boolean(combat?.submittedPlans?.[roleName])
    const rawLegalActions = activeSet && !locked && !planSubmitted ? legalActionsForPacket(activeSet) : []
    const legalActions = combat?.mode === 'lockstep_round_plan'
      ? rawLegalActions.filter((action) => action.kind === 'surrender')
      : rawLegalActions
    const blockedActions = activeSet && !locked && !planSubmitted ? activeSet.blockedActions ?? [] : []
    const selfCombat = combat
      ? roleName === 'red' ? combat.snapshot.red : combat.snapshot.blue
      : undefined
    const opponentCombat = combat
      ? roleName === 'red' ? combat.snapshot.blue : combat.snapshot.red
      : undefined
    const buildState = gameMasterPhaseForSession(this.state.phase) === 'choose_loadout'
      ? ensureRoleBuildStateFromStoredDesign(roleName, role)
      : undefined
    const combatBudget = combat && selfCombat && opponentCombat
      ? this.ensureCombatBudgetForRole(roleName)
      : undefined
    const board = selfCombat && opponentCombat && combatBudget
      ? buildCombatPlanBoardView({
          arena: this.state.arena,
          role: roleName,
          self: selfCombat,
          opponent: opponentCombat,
          actions: [],
          snapshot: combat!.snapshot,
          budget: combatBudget,
          machineCapabilities: machineCapabilitiesForRole(role),
        })
      : selfCombat && opponentCombat
        ? buildAgentBoardView({
            arena: this.state.arena,
            role: roleName,
            self: selfCombat,
            opponent: opponentCombat,
            actions: activeSet && !locked ? Object.values(activeSet.actions) : [],
          })
        : { arena: this.state.arena }
    const submit = combat?.mode === 'lockstep_round_plan' && combatBudget && !planSubmitted && isCombatTurnOpen(this.state, now)
      ? {
          method: 'POST' as const,
          path: `/sessions/${this.state.id}/combat-plan`,
          body: {
            action: 'submit_combat_round_plan' as const,
            decisionVersion: decisionVersionForRole(this.state, roleName),
            round: this.state.round,
            steps: [{ kind: 'end_turn' as const }],
          },
        }
      : activeSet && legalActions.length > 0
        ? {
            method: 'POST' as const,
            path: `/sessions/${this.state.id}/action`,
            body: {
              action: 'submit_game_action' as const,
              actionSetId: activeSet.actionSetId,
              decisionVersion: activeSet.decisionVersion,
              actionId: '<legalActions.id>',
            },
          }
        : undefined
    const review = buildPacketReviewMetadata(this.state, roleName)

    return cloneJson({
      sessionId: this.state.id,
      role: roleName,
      phase: gameMasterPhaseForSession(this.state.phase),
      nextAction: nextGameMasterActionForRole(this.state, roleName, now),
      round: this.state.round,
      fightId: activeSet?.fightId ?? latestCompletedFightId(this.state),
      turnId: activeSet?.turnId,
      decisionVersion: activeSet?.decisionVersion ?? decisionVersionForRole(this.state, roleName),
      eventVersion: eventVersionForState(this.state),
      actionSetId: activeSet?.actionSetId,
      catalogDigest: activeSet?.catalogDigest,
      instruction: gameMasterInstruction(this.state, roleName, now),
      resources: {
        gold: role.gold,
        remainingGold: role.gold,
        partLimitRemaining: Math.max(0, LOADOUT_PART_LIMIT - (buildState?.legacyDraft?.parts.length ?? 0)),
      },
      catalog: {
        version: GAME_MASTER_CATALOG_VERSION,
        ...(activeSet?.catalogDigest ? { digest: activeSet.catalogDigest } : {}),
        parts: PART_CATALOG,
      },
      ...(activeSet?.catalogStore ? { store: activeSet.catalogStore } : {}),
      ...(buildState ? { buildState } : {}),
      board,
      ...(combat && selfCombat && opponentCombat && combatBudget
        ? {
            combat: {
              round: this.state.round,
              decisionVersion: decisionVersionForRole(this.state, roleName),
              deadlineAt: combat.deadlineAt,
              fightStartedAt: combat.fightStartedAt,
              fightDeadlineAt: combat.fightDeadlineAt,
              fightSeconds: combat.fightSeconds,
              cutoffReason: combat.cutoffReason,
              submitted: planSubmitted,
              opponentSubmitted: Boolean(combat.submittedPlans?.[opponentRoleName(roleName)]),
              budget: combatBudget,
              self: {
                hp: selfCombat.health,
                maxHp: selfCombat.maxHealth,
                mass: selfCombat.stats.mass,
                drive: selfCombat.stats.mobility,
                weaponReach: selfCombat.weaponReach,
                anchor: boardAnchor(board, 'self'),
              },
              opponent: {
                hp: opponentCombat.health,
                maxHp: opponentCombat.maxHealth,
                mass: opponentCombat.stats.mass,
                drive: opponentCombat.stats.mobility,
                weaponReach: opponentCombat.weaponReach,
                anchor: boardAnchor(board, 'opponent'),
              },
              ...(combat.submittedPlans?.[roleName]
                ? { submittedPlan: combat.submittedPlans[roleName] }
                : {}),
            },
          }
        : {}),
      ...(selfCombat && opponentCombat
        ? {
      visibleState: {
              self: {
                health: selfCombat.health,
                maxHealth: selfCombat.maxHealth,
                statuses: selfCombat.statuses,
              },
              opponent: {
                health: opponentCombat.health,
                maxHealth: opponentCombat.maxHealth,
                statuses: opponentCombat.statuses,
              },
              turn: combat?.nextTick,
            },
          }
        : {}),
      legalActions,
      ...(blockedActions.length > 0 ? { blockedActions } : {}),
      ...(review ? { review } : {}),
      ...(this.state.sharedDebrief ? { sharedDebrief: cloneJson(this.state.sharedDebrief) } : {}),
      ...(submit ? { submit } : {}),
      // Compact combat protocol view: state in, intent out; no affordance menus.
      ...(combat && selfCombat && opponentCombat && combatBudget
        ? {
            combatCompact: buildCompactCombatView({
              role: roleName,
              round: this.state.round,
              decisionVersion: decisionVersionForRole(this.state, roleName),
              fightStartedAt: combat.fightStartedAt,
              fightDeadlineAt: combat.fightDeadlineAt,
              fightSeconds: combat.fightSeconds,
              cutoffReason: combat.cutoffReason,
              snapshot: combat.snapshot,
              budget: combatBudget,
              arena: this.state.arena,
              selfCapabilities: this.combatMachineCapabilitiesForRole(roleName),
              opponentCapabilities: this.combatMachineCapabilitiesForRole(opponentRoleName(roleName)),
            }),
          }
        : {}),
      // Compact build protocol view: browser/raw agents can play the build
      // phase from packet.build without depending on legalActions menus.
      ...(buildState && gameMasterPhaseForSession(this.state.phase) === 'choose_loadout'
        ? {
            build: buildCompactBuildView({
              role: roleName,
              round: this.state.round,
              decisionVersion: activeSet?.decisionVersion ?? decisionVersionForRole(this.state, roleName),
              gold: role.gold,
              buildState,
              actionSet: activeSet,
              store: activeSet?.catalogStore,
            }),
          }
        : {}),
    })
  }

  private combatMachineCapabilitiesForRole(roleName: TeamRole): MachineCapabilities | undefined {
    const stored = this.state.roles[roleName].storedDesign
    const baseline = this.state.combat?.baselineMachineDesigns?.[roleName] ??
      (stored?.version === 'machine:v1' ? stored.machine : undefined)

    if (!baseline) {
      return undefined
    }

    const runtime = this.state.combat?.machineRuntime?.[roleName]

    return deriveMachineCapabilities(runtime ? { ...baseline, runtime } : baseline)
  }

  private ensureGameMasterActionSets(now: string): void {
    const phase = gameMasterPhaseForSession(this.state.phase)

    if (phase !== 'choose_loadout' && phase !== 'combat_turn') {
      this.state.activeActionSets = undefined
      this.state.lockedActions = undefined
      return
    }

    if (phase === 'combat_turn' && !isCombatTurnOpen(this.state, now)) {
      this.state.activeActionSets = undefined
      this.state.lockedActions = undefined
      return
    }

    const activeActionSets = this.state.activeActionSets ?? {}
    const lockedActions = this.state.lockedActions ?? {}
    const nextActionSets: Partial<Record<TeamRole, ActiveActionSet>> = {}
    const nextLockedActions: Partial<Record<TeamRole, LockedGameAction>> = {}

    for (const roleName of TEAM_ROLES) {
      const existingSet = activeActionSets[roleName]
      const existingLock = lockedActions[roleName]

      if (existingLock && existingSet?.actionSetId === existingLock.actionSetId) {
        nextLockedActions[roleName] = existingLock
        nextActionSets[roleName] = {
          ...existingSet,
          locked: {
            actionId: existingLock.actionId,
            submittedAt: existingLock.submittedAt,
            requestHash: existingLock.requestHash,
          },
        }
        continue
      }

      const actionSetId = actionSetIdForState(this.state, roleName)

      nextActionSets[roleName] = existingSet?.actionSetId === actionSetId
        ? existingSet
        : createGameMasterActionSet(this.state, roleName, phase, now)

      if (existingLock?.actionSetId === actionSetId) {
        nextLockedActions[roleName] = existingLock
        nextActionSets[roleName]!.locked = {
          actionId: existingLock.actionId,
          submittedAt: existingLock.submittedAt,
          requestHash: existingLock.requestHash,
        }
      }
    }

    this.state.activeActionSets = nextActionSets
    this.state.lockedActions = Object.keys(nextLockedActions).length > 0
      ? nextLockedActions
      : undefined
  }

  private lockRoleAction(
    roleName: TeamRole,
    activeSet: ActiveActionSet,
    submission: GameMasterActionSubmission,
    requestHash: string,
    now: string,
  ): void {
    const lockedAction: LockedGameAction = {
      role: roleName,
      actionSetId: submission.actionSetId,
      decisionVersion: submission.decisionVersion,
      actionId: submission.actionId,
      submittedAt: now,
      requestHash,
    }

    this.state.lockedActions = {
      ...(this.state.lockedActions ?? {}),
      [roleName]: lockedAction,
    }
    activeSet.locked = {
      actionId: submission.actionId,
      submittedAt: now,
      requestHash,
    }
  }

  private resolveLockedActionsIfReady(now = this.clock()): void {
    if (gameMasterPhaseForSession(this.state.phase) !== 'choose_loadout') {
      return
    }

    if (TEAM_ROLES.every((roleName) => this.state.roles[roleName].loadoutConfirmedAt)) {
      this.state.activeActionSets = undefined
      this.state.lockedActions = undefined
      this.openCombatTurn(now)
    }
  }

  private async authorizeRoleAction(
    roleToken: string,
    action: RateLimitAction,
    now: string,
  ): Promise<SessionResult<RoleBearerAuth>> {
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const auth = await findRoleAuthByToken(this.state, this.tokenHasher, roleToken, {
      allowUnclaimedClaimKey: action === 'state',
    })
    const rateLimitError = this.takeRateLimit(action, auth?.role.role ?? 'invalid', now)

    if (rateLimitError) {
      return rateLimitError
    }

    if (!auth) {
      return relayError('INVALID_TOKEN', 'Role bearer token is missing or invalid.')
    }

    if (auth.scope === 'observer' && action !== 'state') {
      return relayError(
        'FORBIDDEN',
        'Observer cockpit tokens are read-only; use an agent player key for role mutations.',
      )
    }

    return { ok: true, value: auth }
  }

  private async authorizeRefereeAction(
    refereeToken: string,
    action: RateLimitAction,
    now: string,
  ): Promise<RelayErrorResponse | undefined> {
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const hasRefereeToken = await hasRefereeCapabilityToken(this.state, this.tokenHasher, refereeToken)
    const rateLimitError = this.takeRateLimit(
      action,
      hasRefereeToken ? 'referee' : 'invalid',
      now,
    )

    if (rateLimitError) {
      return rateLimitError
    }

    return hasRefereeToken
      ? undefined
      : relayError('INVALID_TOKEN', 'Referee capability token is missing or invalid.')
  }

  private applyReviewAndAdvance(now: string, message = 'Referee advanced round review.'): void {
    this.consumeDebriefIfReady(now)
    this.appendEvent(
      'round_advanced',
      message,
      now,
    )
    applyCombatResultToScore(this.state)

    if (shouldCompleteMatch(this.state)) {
      this.completeMatch(now)
      return
    }

    this.advanceToNextRound(now)
  }

  private consumeDebriefIfReady(now: string): void {
    const fightId = latestCompletedFightId(this.state)

    if (!this.state.fightDossier || !fightId || sharedDebriefCoversFight(this.state, fightId)) {
      return
    }

    consumePendingReflectionsIntoDebrief(this.state, now)
  }

  private completeMatch(now: string): void {
    const completion = resolveMatchCompletion(this.state)

    this.appendEvent('session_completed', completion.reason, now)
    this.changePhase('session_complete', `Session complete: ${completion.winner}.`, now)
  }

  private advanceToNextRound(now: string): void {
    applyNextRoundEconomy(this.state)
    this.appendEvent('economy_applied', `Round ${this.state.round} economy applied.`, now)
    this.openRoundPlanWindow(now)
    this.changePhase('submission_phase', `Round ${this.state.round} loadout selection is open.`, now)
  }

  expireIfNeeded(now = this.clock()): boolean {
    if (this.state.phase === 'expired') {
      return false
    }

    if (Date.parse(now) <= Date.parse(this.state.expiresAt)) {
      return false
    }

    this.changePhase('expired', 'Session expired.', now)

    return true
  }

  private requireActive(now = this.clock()): RelayErrorResponse | undefined {
    this.expireIfNeeded(now)

    if (this.state.phase !== 'expired') {
      return undefined
    }

    return relayError('SESSION_EXPIRED', 'Session has expired.')
  }

  private takeRateLimit(
    action: RateLimitAction,
    key: string,
    now: string,
  ): RelayErrorResponse | undefined {
    return takeSessionRateLimit(this.state, this.rateLimits, action, key, now)
  }

  private advanceClaimPhase(now: string): void {
    const bothClaimed = TEAM_ROLES.every((role) => this.state.roles[role].claimedAt)

    if (bothClaimed && this.state.phase === 'waiting_for_agents') {
      this.openRoundPlanWindow(now)
      this.changePhase('submission_phase', 'Both roles claimed; loadout selection is open.', now)
    }
  }

  private openCombatTurn(now: string): void {
    const baselineMachineDesigns = this.createCombatBaselineMachineDesigns()
    const resolution = resolveSubmittedGameActions(this.buildCombatInput(baselineMachineDesigns), {
      red: [],
      blue: [],
    })

    this.state.roundPlan = undefined

    if (resolution.status === 'complete') {
      this.completeCombat(resolution.result, now)
      return
    }

    this.state.combat = this.createCombatState({
      nextTick: resolution.nextTick,
      snapshot: resolution.snapshot,
      now,
      startGate: true,
      actions: { red: [], blue: [] },
      baselineMachineDesigns,
    })
    this.appendEvent(
      'combat_start_staged',
      `Round ${this.state.round} combat staged; waiting for both agents to fetch the combat packet.`,
      now,
    )
    this.changePhase('combat_turn', `Combat turn ${resolution.nextTick} is staged; waiting for both agents to arrive.`, now)
  }

  private resolveExpiredCombatTurn(now: string): void {
    const combat = this.state.combat

    if (this.state.phase !== 'combat_turn' || !combat) {
      return
    }

    if (Date.parse(now) < Date.parse(combat.deadlineAt)) {
      return
    }

    for (const roleName of TEAM_ROLES) {
      if (combat.submittedPlans?.[roleName]) {
        continue
      }

      const decisionVersion = decisionVersionForRole(this.state, roleName)
      const timeoutPlan: CombatRoundPlan = {
        role: roleName,
        round: this.state.round,
        decisionVersion,
        steps: [{ kind: 'end_turn' }],
        submittedAt: now,
      }

      combat.submittedPlans = {
        ...(combat.submittedPlans ?? {}),
        [roleName]: timeoutPlan,
      }
      this.appendEvent(
        'combat_plan_timed_out',
        `${roleName} timed out on combat round ${combat.nextTick}; end_turn plan applied.`,
        now,
      )
    }

    this.resolveCombatTurnIfReady(now)
  }

  private resolveExpiredFightWindow(now: string): void {
    const combat = this.state.combat

    if (
      this.state.phase !== 'combat_turn' ||
      !combat ||
      Boolean(combat.startGate) ||
      !combat.fightDeadlineAt ||
      Date.parse(now) < Date.parse(combat.fightDeadlineAt)
    ) {
      return
    }

    combat.cutoffReason = 'fight_wall_clock_expired'
    this.completeCombat(this.fightCutoffResult(combat, now), now)
  }

  private fightCutoffResult(combat: StoredCombatState, now: string): CombatResult {
    const redHealth = combat.snapshot.red.health
    const blueHealth = combat.snapshot.blue.health
    const winner = redHealth === blueHealth ? 'draw' : redHealth > blueHealth ? 'red' : 'blue'
    const reason = winner === 'draw'
      ? 'Fight wall-clock expired; round ends in a draw on equal remaining health.'
      : `Fight wall-clock expired; ${capitalizeRole(winner)} wins on remaining health.`
    const startedAt = combat.fightStartedAt ?? combat.openedAt
    const duration = Math.max(1, Math.ceil((Date.parse(now) - Date.parse(startedAt)) / 1000))
    const replayEvents = combat.lockstepEvents && combat.lockstepEvents.length > 0
      ? combat.lockstepEvents
      : [
          { t: 0, type: 'spawn' as const, bot: 'red' as const, position: combat.snapshot.red.position, rotation: [0, 90, 0] as [number, number, number] },
          { t: 0, type: 'spawn' as const, bot: 'blue' as const, position: combat.snapshot.blue.position, rotation: [0, -90, 0] as [number, number, number] },
        ]

    return {
      winner,
      reason,
      damage: {
        red: Math.max(0, combat.snapshot.red.maxHealth - redHealth),
        blue: Math.max(0, combat.snapshot.blue.maxHealth - blueHealth),
      },
      remainingHealth: {
        red: redHealth,
        blue: blueHealth,
      },
      partHealth: {
        red: { ...combat.snapshot.red.partHealth },
        blue: { ...combat.snapshot.blue.partHealth },
      },
      stats: {
        red: { ...combat.snapshot.red.stats },
        blue: { ...combat.snapshot.blue.stats },
      },
      replay: createReplayTimeline({
        round: this.state.round,
        duration,
        events: replayEvents,
        summary: reason,
      }),
      log: [...(combat.lockstepLog ?? []), reason],
      ...(combat.machineRuntime ? { machineRuntime: combat.machineRuntime } : {}),
    }
  }

  private resolveCombatTurnIfReady(now: string): void {
    const combat = this.state.combat

    if (this.state.phase !== 'combat_turn' || !combat) {
      return
    }

    const redPlan = combat.submittedPlans?.red
    const bluePlan = combat.submittedPlans?.blue

    if (!redPlan || !bluePlan) {
      return
    }

    const resolution = resolveLockstepCombatRound({
      ...this.buildCombatInput(combat.baselineMachineDesigns),
      roundIndex: combat.nextTick,
      snapshot: combat.snapshot,
      plans: {
        red: redPlan,
        blue: bluePlan,
      },
      budgets: combat.budgets,
      priorEvents: combat.lockstepEvents,
      priorLog: combat.lockstepLog,
      elapsedSubsteps: combat.elapsedSubsteps,
      machineRuntime: combat.machineRuntime,
    })

    if (resolution.status === 'complete') {
      this.applyMachineRuntimeState(resolution.result.machineRuntime)
      this.completeCombat(resolution.result, now)
      return
    }

    this.applyMachineRuntimeState(resolution.machineRuntime)
    this.state.replay = this.replayPayloadFromTimeline(resolution.replay)
    this.state.combat = this.createCombatState({
      nextTick: resolution.nextRound,
      snapshot: resolution.snapshot,
      now,
      opensAt: addMilliseconds(now, COMBAT_TURN_HANDOFF_DELAY_MS),
      actions: combat.actions,
      baselineMachineDesigns: combat.baselineMachineDesigns,
      lockstepEvents: resolution.events,
      lockstepLog: resolution.log,
      elapsedSubsteps: resolution.elapsedSubsteps,
      machineRuntime: resolution.machineRuntime,
      planConsumption: resolution.consumed,
      fightStartedAt: combat.fightStartedAt,
      fightDeadlineAt: combat.fightDeadlineAt,
      fightSeconds: combat.fightSeconds,
    })
    this.state.activeActionSets = undefined
    this.state.lockedActions = undefined
    this.touch(now)
  }

  private resolveTimedTransitions(now = this.clock()): void {
    this.expireIfNeeded(now)

    if (this.state.phase === 'expired') {
      return
    }

    this.resolveExpiredLoadoutWindow(now)
    this.resolveCombatStartGate(now)
    this.resolveExpiredFightWindow(now)
    this.resolveExpiredCombatTurn(now)
  }

  private markCombatTurnSeen(roleName: TeamRole, now: string): void {
    const combat = this.state.combat

    if (this.state.phase !== 'combat_turn' || !combat?.startGate) {
      return
    }

    if (Date.parse(now) >= Date.parse(combat.startGate.graceDeadlineAt)) {
      this.releaseCombatStartGate(combat.startGate.graceDeadlineAt)
      return
    }

    combat.startGate.readyBy = {
      ...combat.startGate.readyBy,
      [roleName]: combat.startGate.readyBy[roleName] ?? now,
    }

    if (TEAM_ROLES.every((role) => combat.startGate?.readyBy[role])) {
      this.releaseCombatStartGate(now)
      return
    }

    this.touch(now)
  }

  private resolveCombatStartGate(now: string): void {
    const combat = this.state.combat

    if (
      this.state.phase !== 'combat_turn' ||
      !combat?.startGate ||
      Date.parse(now) < Date.parse(combat.startGate.graceDeadlineAt)
    ) {
      return
    }

    this.releaseCombatStartGate(combat.startGate.graceDeadlineAt)
  }

  private releaseCombatStartGate(openedAt: string): void {
    const combat = this.state.combat

    if (this.state.phase !== 'combat_turn' || !combat?.startGate) {
      return
    }

    combat.openedAt = openedAt
    combat.deadlineAt = addMilliseconds(openedAt, COMBAT_TURN_SECONDS * 1000)
    combat.fightStartedAt = combat.fightStartedAt ?? openedAt
    combat.fightSeconds = combat.fightSeconds ?? FIGHT_SECONDS
    combat.fightDeadlineAt = combat.fightDeadlineAt ?? addMilliseconds(combat.fightStartedAt, combat.fightSeconds * 1000)
    combat.startGate = undefined
    this.state.activeActionSets = undefined
    this.state.lockedActions = undefined
    this.appendEvent('combat_started', `Round ${this.state.round} combat clock started.`, openedAt)
    this.touch(openedAt)
  }

  private resolveExpiredLoadoutWindow(now: string): void {
    if (this.state.phase !== 'submission_phase' || !this.state.roundPlan) {
      return
    }

    if (Date.parse(now) < Date.parse(this.state.roundPlan.deadlineAt)) {
      return
    }

    for (const roleName of TEAM_ROLES) {
      const role = this.state.roles[roleName]

      if (role.loadoutConfirmedAt) {
        continue
      }

      this.finalizeLoadoutForRole(roleName, now)
    }

    this.resolveLockedActionsIfReady(now)
  }

  private finalizeLoadoutForRole(roleName: TeamRole, now: string): void {
    // TODO(product rule, do not implement public cancel_move yet): if
    // selectedMovingPartId exists when auto-confirming on timeout and a prior
    // confirmed storedDesign exists, the incomplete draft should be discarded
    // and rehydrated from that previous confirmed design so the mid-move part
    // is not silently lost. Implementing this requires tracking the last
    // confirmed design separately from the live draft (storedDesign currently
    // mirrors the in-progress draft), so the current behavior refunds the
    // pending moved part instead.
    const role = this.state.roles[roleName]
    const buildState = ensureLoadoutBuildState(roleName, role.loadoutBuildState)
    const pendingMovedPartId = buildState.selectedMovingPartId ? buildState.selectedPartId : undefined
    const finalizedBuildState = {
      ...buildState,
      step: 'choose_part' as const,
      selectedPartId: undefined,
      selectedMovingPartId: undefined,
      selectedAttachTargetId: undefined,
      selectedMount: undefined,
      selectedMountKind: undefined,
      selectedMountMotion: undefined,
      selectedMountCollisionPolicy: undefined,
      selectedMountSector: undefined,
      selectedAttachCell: undefined,
      selectedRotation: undefined,
    }

    if (pendingMovedPartId) {
      const refundedGold = PART_CATALOG.find((part) => part.id === pendingMovedPartId)?.cost ?? 0

      role.gold += refundedGold
      role.inventory = decrementInventory(role.inventory, pendingMovedPartId)
    }

    role.loadoutBuildState = finalizedBuildState
    role.storedDesign = finalizedBuildState.currentDesign
    role.currentDesign = storedDesignToLegacyBotDesignSnapshotProjection(
      finalizedBuildState.currentDesign,
      finalizedBuildState.legacyDraft?.name,
    )
    applyCombatCompatibilityControls(role, finalizedBuildState.currentDesign)
    role.loadoutVersion = (role.loadoutVersion ?? 0) + 1
    role.loadoutConfirmedAt = now
    this.appendEvent('game_action_submitted', `${roleName} loadout window expired; current server-built loadout auto-confirmed.`, now)
    this.appendEvent('loadout_ready', `${roleName} loadout ready for combat.`, now)
    this.touch(now)
  }

  private ensureCombatBudgetForRole(roleName: TeamRole): CombatBudget {
    const combat = this.state.combat

    if (!combat) {
      return { movement: 0, actionTime: 0, weaponCooldowns: {} }
    }

    const existing = combat.budgets?.[roleName]

    if (existing) {
      return cloneCombatBudget(existing)
    }

    const budget = deriveCombatBudget({
      role: roleName,
      snapshot: combat.snapshot,
      machineCapabilities: machineCapabilitiesForRole(this.state.roles[roleName]),
    })

    combat.budgets = {
      ...(combat.budgets ?? {}),
      [roleName]: budget,
    }

    return cloneCombatBudget(budget)
  }

  private createCombatBudgets(snapshot: StoredCombatState['snapshot']): Record<TeamRole, CombatBudget> {
    return {
      red: deriveCombatBudget({
        role: 'red',
        snapshot,
        machineCapabilities: machineCapabilitiesForRole(this.state.roles.red),
      }),
      blue: deriveCombatBudget({
        role: 'blue',
        snapshot,
        machineCapabilities: machineCapabilitiesForRole(this.state.roles.blue),
      }),
    }
  }

  private createCombatState(input: {
    nextTick: number
    snapshot: StoredCombatState['snapshot']
    now: string
    opensAt?: string
    startGate?: boolean
    actions: StoredCombatState['actions']
    submittedPlans?: StoredCombatState['submittedPlans']
    budgets?: StoredCombatState['budgets']
    planConsumption?: StoredCombatState['planConsumption']
    lockstepEvents?: StoredCombatState['lockstepEvents']
    lockstepLog?: StoredCombatState['lockstepLog']
    elapsedSubsteps?: number
    machineRuntime?: StoredCombatState['machineRuntime']
    baselineMachineDesigns?: StoredCombatState['baselineMachineDesigns']
    fightStartedAt?: string
    fightDeadlineAt?: string
    fightSeconds?: number
  }): StoredCombatState {
    const openedAt = input.startGate
      ? addMilliseconds(input.now, COMBAT_TURN_START_GATE_GRACE_MS)
      : input.opensAt ?? input.now
    const budgets = input.budgets ?? this.createCombatBudgets(input.snapshot)

    return {
      nextTick: input.nextTick,
      mode: 'lockstep_round_plan',
      openedAt,
      deadlineAt: addMilliseconds(openedAt, COMBAT_TURN_SECONDS * 1000),
      turnSeconds: COMBAT_TURN_SECONDS,
      roundSeconds: COMBAT_TURN_SECONDS,
      ...(input.fightStartedAt ? { fightStartedAt: input.fightStartedAt } : {}),
      ...(input.fightDeadlineAt ? { fightDeadlineAt: input.fightDeadlineAt } : {}),
      ...(input.fightSeconds ? { fightSeconds: input.fightSeconds } : {}),
      decisionVersion: this.state.round * 1000 + 200 + input.nextTick,
      ...(input.startGate
        ? {
            startGate: {
              readyBy: {},
              graceDeadlineAt: openedAt,
            },
          }
        : {}),
      ...(input.baselineMachineDesigns ? { baselineMachineDesigns: input.baselineMachineDesigns } : {}),
      actions: input.actions,
      budgets,
      ...(input.submittedPlans ? { submittedPlans: input.submittedPlans } : {}),
      ...(input.planConsumption ? { planConsumption: input.planConsumption } : {}),
      ...(input.lockstepEvents ? { lockstepEvents: input.lockstepEvents } : {}),
      ...(input.lockstepLog ? { lockstepLog: input.lockstepLog } : {}),
      ...(input.elapsedSubsteps !== undefined ? { elapsedSubsteps: input.elapsedSubsteps } : {}),
      ...(input.machineRuntime ? { machineRuntime: input.machineRuntime } : {}),
      pending: {},
      snapshot: input.snapshot,
    }
  }

  private openRoundPlanWindow(now: string): void {
    this.state.roundPlan = {
      openedAt: now,
      deadlineAt: addMilliseconds(now, ROUND_PLAN_SECONDS * 1000),
      planSeconds: ROUND_PLAN_SECONDS,
    }
  }

  private createCombatBaselineMachineDesigns(): StoredCombatState['baselineMachineDesigns'] {
    const baselineMachineDesigns: Partial<Record<TeamRole, MachineDesign>> = {}

    for (const roleName of TEAM_ROLES) {
      const role = this.state.roles[roleName]

      if (role.storedDesign?.version === 'machine:v1' && role.loadoutConfirmedAt) {
        baselineMachineDesigns[roleName] = cloneJson(role.storedDesign.machine)
      }
    }

    return Object.keys(baselineMachineDesigns).length > 0 ? baselineMachineDesigns : undefined
  }

  // CODEX_INTENT: pass baseline machine designs into cumulative native resolver replay while retaining projected blueprints for replay compatibility.
  // CODEX_RISK: data_semantics
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  private buildCombatInput(
    baselineMachineDesigns?: StoredCombatState['baselineMachineDesigns'],
  ): ResolveCombatInput {
    const red = this.state.roles.red
    const blue = this.state.roles.blue
    const redAuthority = this.combatAuthorityForRole(red, baselineMachineDesigns?.red)
    const blueAuthority = this.combatAuthorityForRole(blue, baselineMachineDesigns?.blue)

    return {
      round: this.state.round,
      seed: `${this.state.id}:${this.state.seed}`,
      arena: this.state.arena,
      red: {
        blueprint: redAuthority.blueprint,
        tactics: defaultTacticsForBlueprint(redAuthority.blueprint),
        ...(redAuthority.machineDesign ? { machineDesign: redAuthority.machineDesign } : {}),
      },
      blue: {
        blueprint: blueAuthority.blueprint,
        tactics: defaultTacticsForBlueprint(blueAuthority.blueprint),
        ...(blueAuthority.machineDesign ? { machineDesign: blueAuthority.machineDesign } : {}),
      },
    }
  }

  private combatAuthorityForRole(
    role: StoredRoleState,
    baselineMachineDesign?: MachineDesign,
  ): {
    blueprint: BotBlueprint
    machineDesign?: ResolveCombatInput['red']['machineDesign']
  } {
    if (role.storedDesign && role.loadoutConfirmedAt) {
      if (role.storedDesign.version === 'machine:v1') {
        const machineDesign = baselineMachineDesign ?? role.storedDesign.machine

        return {
          blueprint: storedDesignToLegacyBotBlueprintProjection(
            { version: 'machine:v1', machine: machineDesign },
            legacyProjectionNameForRole(role),
          ),
          machineDesign,
        }
      }

      return {
        blueprint: storedDesignToLegacyBotBlueprintProjection(
          role.storedDesign,
          legacyProjectionNameForRole(role),
        ),
      }
    }

    if (role.currentDesign && role.loadoutConfirmedAt) {
      return { blueprint: botDesignSnapshotToLegacyBotBlueprintProjection(role.currentDesign) }
    }

    throw new Error(`${role.role} requires a confirmed loadout to resolve combat.`)
  }

  // CODEX_INTENT: persist machine runtime facts that affect later turn capability derivation.
  // CODEX_RISK: data_semantics
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  private applyMachineRuntimeState(runtime: Partial<Record<TeamRole, MachineRuntimeState>> | undefined): void {
    if (!runtime) {
      return
    }

    for (const roleName of TEAM_ROLES) {
      const role = this.state.roles[roleName]
      const roleRuntime = runtime[roleName]

      if (!roleRuntime || role.storedDesign?.version !== 'machine:v1') {
        continue
      }

      role.storedDesign = {
        version: 'machine:v1',
        machine: {
          ...role.storedDesign.machine,
          runtime: cloneJson(roleRuntime),
        },
      }
    }
  }

  private replayCompatibilityBlueprintForRole(role: StoredRoleState): BotBlueprint {
    if (role.storedDesign && role.loadoutConfirmedAt) {
      return storedDesignToLegacyBotBlueprintProjection(
        role.storedDesign,
        legacyProjectionNameForRole(role),
      )
    }

    if (role.currentDesign && role.loadoutConfirmedAt) {
      return botDesignSnapshotToLegacyBotBlueprintProjection(role.currentDesign)
    }

    throw new Error(`${role.role} requires a confirmed loadout to project replay compatibility.`)
  }

  private replayMachineDesignsForRoles(): Partial<Record<TeamRole, MachineDesign>> | undefined {
    const machineDesigns: Partial<Record<TeamRole, MachineDesign>> = {}

    for (const roleName of TEAM_ROLES) {
      const role = this.state.roles[roleName]

      if (role.storedDesign?.version === 'machine:v1' && role.loadoutConfirmedAt) {
        machineDesigns[roleName] = cloneJson(role.storedDesign.machine)
      }
    }

    return machineDesigns.red || machineDesigns.blue ? machineDesigns : undefined
  }

  private replayPayloadFromTimeline(replay: ReplayTimeline): LegacyReplayPayload {
    const red = this.state.roles.red
    const blue = this.state.roles.blue

    if (!red.teamIdentity || !blue.teamIdentity) {
      throw new Error('Both team identities are required to create a replay payload.')
    }

    const machineDesigns = this.replayMachineDesignsForRoles()

    return {
      ...cloneJson(replay),
      teamIdentities: {
        red: cloneJson(red.teamIdentity),
        blue: cloneJson(blue.teamIdentity),
      },
      botBlueprints: {
        red: cloneJson(this.replayCompatibilityBlueprintForRole(red)),
        blue: cloneJson(this.replayCompatibilityBlueprintForRole(blue)),
      },
      ...(machineDesigns ? { machineDesigns } : {}),
    }
  }

  private completeCombat(result: CombatResult, now: string): void {
    const red = this.state.roles.red
    const blue = this.state.roles.blue
    const botBlueprints = {
      red: cloneJson(this.replayCompatibilityBlueprintForRole(red)),
      blue: cloneJson(this.replayCompatibilityBlueprintForRole(blue)),
    }
    const fightId = `fight_${this.state.round}`

    this.state.replay = this.replayPayloadFromTimeline(result.replay)
    this.state.fightDossier = mergeFightDossier(
      this.state.fightDossier,
      buildFightDossier({
        sessionId: this.state.id,
        fightId,
        replay: result.replay,
        result,
        botBlueprints,
      }),
    )
    this.state.combat = undefined
    this.state.activeActionSets = undefined
    this.state.lockedActions = undefined
    this.state.lastResult = combatSummary(result)
    this.appendEvent('combat_resolved', result.reason, now)
    this.changePhase('combat_resolved', 'Combat result recorded.', now)
    this.changePhase('replay_phase', 'Replay timeline is available.', now)
    this.changePhase('round_review', 'Round review is ready for referee advance.', now)
  }

  private completeSurrender(surrenderingRole: TeamRole, now: string): void {
    const combat = this.state.combat

    if (this.state.phase !== 'combat_turn' || !combat) {
      return
    }

    const winner = oppositeRole(surrenderingRole)
    const reason = `${capitalizeRole(surrenderingRole)} surrendered; ${capitalizeRole(winner)} wins the round.`
    const result: CombatResult = {
      winner,
      reason,
      damage: {
        red: Math.max(0, combat.snapshot.red.maxHealth - combat.snapshot.red.health),
        blue: Math.max(0, combat.snapshot.blue.maxHealth - combat.snapshot.blue.health),
      },
      remainingHealth: {
        red: combat.snapshot.red.health,
        blue: combat.snapshot.blue.health,
      },
      partHealth: {
        red: { ...combat.snapshot.red.partHealth },
        blue: { ...combat.snapshot.blue.partHealth },
      },
      stats: {
        red: { ...combat.snapshot.red.stats },
        blue: { ...combat.snapshot.blue.stats },
      },
      replay: createReplayTimeline({
        round: this.state.round,
        duration: 1,
        events: [
          { t: 0, type: 'spawn', bot: 'red', position: combat.snapshot.red.position, rotation: [0, 90, 0] },
          { t: 0, type: 'spawn', bot: 'blue', position: combat.snapshot.blue.position, rotation: [0, -90, 0] },
        ],
        summary: reason,
      }),
      log: [
        `Round ${this.state.round}: ${reason}`,
        `Red damage taken: ${Math.max(0, combat.snapshot.red.maxHealth - combat.snapshot.red.health)}. Blue damage taken: ${Math.max(0, combat.snapshot.blue.maxHealth - combat.snapshot.blue.health)}.`,
      ],
    }

    this.completeCombat(result, now)
  }

  private changePhase(phase: SessionPhase, message: string, at: string): void {
    this.state.phase = phase
    this.touch(at)
    this.appendEvent('phase_changed', message, at)
  }

  private appendEvent(
    type: LegacySessionLogEvent['type'],
    message: string,
    at = this.clock(),
  ): void {
    appendSessionEvent(this.state, type, message, at)
  }

  private appendChatMessages(
    role: StoredRoleState,
    requests: LegacyAgentChatMessagePostRequest[],
    at: string,
  ): LegacySessionChatMessage[] {
    return appendRoleChatMessages(this.state, role, requests, at)
  }

  private appendPrivateChatMessages(
    role: StoredRoleState,
    requests: LegacyAgentPrivateChatMessagePostRequest[],
    at: string,
  ): LegacySessionChatMessage[] {
    return appendPrivateRoleChatMessages(this.state, role, requests, at)
  }

  private touch(at = this.clock()): void {
    this.state.updatedAt = at
  }

}

function controlsForStoredLegacyDesign(design: StoredDesign): GeneratedControls | undefined {
  if (design.version === 'machine:v1') {
    return undefined
  }

  return deriveControls(storedDesignToLegacyBotBlueprintProjection(design))
}

function applyCombatCompatibilityControls(role: StoredRoleState, design: StoredDesign): void {
  const controls = controlsForStoredLegacyDesign(design)

  if (controls) {
    role.controls = controls
    return
  }

  delete role.controls
}

function decrementInventory(inventory: InventoryItem[], partId: string): InventoryItem[] {
  return inventory
    .map((item) => item.partId === partId ? { ...item, quantity: item.quantity - 1 } : item)
    .filter((item) => item.quantity > 0)
}

function oppositeRole(role: TeamRole): TeamRole {
  return role === 'red' ? 'blue' : 'red'
}

function capitalizeRole(role: TeamRole): string {
  return role === 'red' ? 'Red' : 'Blue'
}

function machineCapabilitiesForRole(role: StoredRoleState) {
  if (!role.loadoutConfirmedAt || role.storedDesign?.version !== 'machine:v1') {
    return undefined
  }

  return deriveMachineCapabilities(role.storedDesign.machine)
}

function storedDesignToLegacyBotBlueprintProjection(
  design: StoredDesign,
  legacyName?: string,
): BotBlueprint {
  // CODEX_INTENT: keep replay/display blueprint compatibility as a projection from StoredDesign.
  // CODEX_RISK: data_semantics
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  const blueprint = design.version === 'machine:v1'
    ? machineDesignToLegacyBotBlueprintProjection(design.machine)
    : botDesignSnapshotToLegacyBotBlueprintProjection(design.design)

  return legacyName ? { ...blueprint, name: legacyName } : blueprint
}

function storedDesignToLegacyBotDesignSnapshotProjection(
  design: StoredDesign,
  legacyName?: string,
): BotDesignSnapshot {
  const snapshot = design.version === 'machine:v1'
    ? machineDesignToLegacyBotDesignSnapshotProjection(design.machine)
    : cloneJson(design.design)

  return legacyName ? { ...snapshot, name: legacyName } : snapshot
}

function legacyProjectionNameForRole(role: StoredRoleState): string | undefined {
  return role.loadoutBuildState?.legacyDraft?.name ?? role.currentDesign?.name
}

function isAllowedGameMasterSubmissionShape(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return Object.keys(value).every((key) => GAME_MASTER_SUBMISSION_KEYS.has(key))
}

function hashGameMasterSubmission(
  submission: GameMasterActionSubmission,
  normalizedParameters?: NormalizedGameMasterActionParameters,
): string {
  return stableStringify({
    action: submission.action,
    actionSetId: submission.actionSetId,
    decisionVersion: submission.decisionVersion,
    actionId: submission.actionId,
    parameters: normalizedParameters ?? {},
    publicMessage: submission.publicMessage ?? '',
  })
}

function resolveSubmittedGameAction(
  activeSet: ActiveActionSet,
  submission: GameMasterActionSubmission,
): {
  ok: true
  action: CanonicalGameAction
  normalizedParameters?: NormalizedGameMasterActionParameters
} | {
  ok: false
  issues: ValidationIssue[]
} {
  const canonicalAction = activeSet.actions[submission.actionId]

  if (!canonicalAction) {
    return {
      ok: false,
      issues: [
        {
          code: 'INVALID_ACTION_ID',
          path: 'actionSubmission.actionId',
          message: 'actionId is not legal for the active action set.',
        },
      ],
    }
  }

  if (!canonicalAction.parameterSchema) {
    if (submission.parameters !== undefined) {
      return {
        ok: false,
        issues: [
          {
            code: 'UNEXPECTED_PARAMETERS',
            path: 'actionSubmission.parameters',
            message: 'This action does not accept parameters.',
          },
        ],
      }
    }

    return { ok: true, action: canonicalAction }
  }

  const parameters = submission.parameters ?? {}
  const validation = validateGameMasterActionParameters(parameters, canonicalAction.parameterSchema)

  if (!validation.ok) {
    return validation
  }

  return {
    ok: true,
    action: {
      ...canonicalAction,
      payload: {
        ...canonicalAction.payload,
        parameters: validation.parameters,
      },
    },
    normalizedParameters: validation.parameters,
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableJsonValue(value))
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableJsonValue)
  }

  if (typeof value !== 'object' || value === null) {
    return value
  }

  const sorted: Record<string, unknown> = {}

  for (const key of Object.keys(value).sort()) {
    sorted[key] = stableJsonValue((value as Record<string, unknown>)[key])
  }

  return sorted
}

function sameLockedTeamIdentity(
  existing: LegacyTeamIdentity,
  requested: LegacyTeamIdentity,
): boolean {
  return (
    existing.name === requested.name &&
    existing.primaryColor === requested.primaryColor &&
    existing.logo?.mark === requested.logo?.mark &&
    existing.logo?.initials === requested.logo?.initials
  )
}

const MAX_LOCKED_TEAM_NAME_LENGTH = 40

function normalizeDistinctTeamIdentity(
  state: StoredSessionState,
  roleName: TeamRole,
  identity: LegacyTeamIdentity,
): LegacyTeamIdentity {
  const opponentIdentity = state.roles[oppositeRole(roleName)].teamIdentity

  if (!opponentIdentity || teamNameKey(opponentIdentity.name) !== teamNameKey(identity.name)) {
    return identity
  }

  return {
    ...identity,
    name: roleDistinctTeamName(identity.name, roleName),
  }
}

function teamNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function roleDistinctTeamName(name: string, roleName: TeamRole): string {
  const suffix = ` ${capitalizeRole(roleName)}`
  const compactName = name.trim().replace(/\s+/g, ' ')
  const maxBaseLength = Math.max(1, MAX_LOCKED_TEAM_NAME_LENGTH - suffix.length)
  const baseName = compactName.slice(0, maxBaseLength).trimEnd()

  return `${baseName}${suffix}`
}

// Round 2+ rule: if a confirmed blueprint exists from a prior round and the
// editable draft was cleared by round advancement, rehydrate the draft from
// the stored blueprint (healed to full) instead of starting a fresh core-only
// build that would overwrite the carried-forward bot.
function ensureRoleBuildStateFromStoredDesign(
  roleName: TeamRole,
  role: StoredRoleState,
): LoadoutBuildState {
  if (role.loadoutBuildState) {
    return ensureLoadoutBuildState(roleName, role.loadoutBuildState)
  }

  if (role.storedDesign) {
    return createLoadoutBuildStateFromStoredDesign(roleName, role.storedDesign)
  }

  return createInitialLoadoutBuildState(roleName)
}

function createGameMasterActionSet(
  state: StoredSessionState,
  roleName: TeamRole,
  phase: GameMasterPhase,
  now: string,
): ActiveActionSet {
  if (phase === 'choose_loadout') {
    const role = state.roles[roleName]

    role.loadoutBuildState = ensureRoleBuildStateFromStoredDesign(roleName, role)
    role.storedDesign = role.loadoutBuildState.currentDesign
    role.currentDesign = storedDesignToLegacyBotDesignSnapshotProjection(
      role.loadoutBuildState.currentDesign,
      role.loadoutBuildState.legacyDraft?.name,
    )

    return buildLoadoutActionSet({
      role: roleName,
      round: state.round,
      decisionVersion: decisionVersionForRole(state, roleName),
      actionSetId: actionSetIdForState(state, roleName),
      createdAt: now,
      arenaVersion: `${GAME_MASTER_ARENA_VERSION}:${state.arena.width}x${state.arena.height}`,
      gold: role.gold,
      buildState: role.loadoutBuildState,
      storeSeed: `${state.id}:fight_${state.round}:round_${state.round}:${roleName}`,
      expiresAt: state.roundPlan?.deadlineAt,
    })
  }

  if (!state.combat) {
    throw new Error('Combat action sets require an active combat state.')
  }

  return buildCombatSurrenderActionSet({
    state,
    roleName,
    now,
  })
}

function buildCombatSurrenderActionSet(input: {
  state: StoredSessionState
  roleName: TeamRole
  now: string
}): ActiveActionSet {
  const combat = input.state.combat

  if (!combat) {
    throw new Error('Combat surrender action set requires an active combat state.')
  }

  const actionId = `combat.${input.roleName}.r${input.state.round}.t${combat.nextTick}.surrender`

  return {
    actionSetId: actionSetIdForState(input.state, input.roleName),
    role: input.roleName,
    phase: 'combat_turn',
    round: input.state.round,
    turnId: `turn_${combat.nextTick}`,
    decisionVersion: decisionVersionForRole(input.state, input.roleName),
    catalogVersion: GAME_MASTER_CATALOG_VERSION,
    arenaVersion: `${GAME_MASTER_ARENA_VERSION}:${input.state.arena.width}x${input.state.arena.height}`,
    createdAt: input.now,
    expiresAt: combat.deadlineAt,
    actions: {
      [actionId]: {
        id: actionId,
        kind: 'surrender',
        role: input.roleName,
        payload: {
          scope: 'combat_surrender',
          label: 'Surrender round',
          summary: 'Concede this round immediately; the opponent wins and combat ends.',
        },
      },
    },
  }
}

function legalActionsForPacket(actionSet: ActiveActionSet): GameMasterLegalAction[] {
  return Object.values(actionSet.actions).map((action) => {
    if (isLoadoutBuilderAction(action)) {
      return legalActionWithParameterMetadata(action, loadoutLegalActionForPacket(action))
    }
    return legalActionWithParameterMetadata(action, {
      id: action.id,
      kind: action.kind,
      label: legalActionLabel(action.kind),
      summary: legalActionSummary(action.kind),
    })
  })
}

function legalActionWithParameterMetadata(
  action: CanonicalGameAction,
  legalAction: GameMasterLegalAction,
): GameMasterLegalAction {
  return {
    ...legalAction,
    ...(action.parameterSchema ? { parameterSchema: action.parameterSchema } : {}),
    ...(hasParameterExamples(action.parameterExamples)
      ? { parameterExamples: action.parameterExamples }
      : {}),
  }
}

function hasParameterExamples(
  examples: GameMasterActionParameters[] | undefined,
): examples is GameMasterActionParameters[] {
  return Array.isArray(examples) && examples.length > 0
}

function legalActionLabel(kind: GameMasterActionKind): string {
  if (kind === 'surrender') {
    return 'Surrender round'
  }

  return kind === 'hold' ? 'Hold position' : 'Ready'
}

function legalActionSummary(kind: GameMasterActionKind): string {
  if (kind === 'surrender') {
    return 'Concede this round immediately; the opponent wins and combat ends.'
  }

  return kind === 'hold'
    ? 'Keep the current combat posture.'
    : 'Lock the selected server-authored action.'
}

function actionSetIdForState(state: StoredSessionState, roleName: TeamRole): string {
  const decisionVersion = decisionVersionForRole(state, roleName)

  if (state.phase === 'combat_turn') {
    return `${roleName}:r${state.round}:turn_${state.combat?.nextTick ?? 0}:v${decisionVersion}`
  }

  const buildStep = state.roles[roleName].loadoutBuildState?.step ?? 'choose_part'

  return `${roleName}:r${state.round}:loadout:${buildStep}:v${decisionVersion}`
}

function decisionVersionForRole(state: StoredSessionState, roleName: TeamRole): number {
  if (state.phase === 'submission_phase') {
    return 100 + (state.roles[roleName].loadoutVersion ?? 0)
  }

  return decisionVersionForState(state)
}

function decisionVersionForState(state: StoredSessionState): number {
  const phaseVersion: Record<SessionPhase, number> = {
    created: 0,
    waiting_for_agents: 10,
    round_setup: 20,
    submission_phase: 100,
    submissions_locked: 150,
    combat_turn: 200 + (state.combat?.nextTick ?? 0),
    combat_resolved: 300,
    replay_phase: 400,
    round_review: 500,
    session_complete: 900,
    expired: 999,
  }

  return state.round * 1000 + phaseVersion[state.phase]
}

function eventVersionForState(state: StoredSessionState): number {
  return state.eventLog.length +
    state.chatLog.length +
    (state.reflections?.length ?? 0) +
    (state.sharedDebrief ? 1 : 0)
}

function gameMasterPhaseForSession(phase: SessionPhase): GameMasterPhase {
  if (phase === 'expired') {
    return 'expired'
  }

  if (phase === 'session_complete') {
    return 'session_complete'
  }

  if (phase === 'submission_phase') {
    return 'choose_loadout'
  }

  if (phase === 'combat_turn') {
    return 'combat_turn'
  }

  if (phase === 'replay_phase') {
    return 'replay_phase'
  }

  if (phase === 'round_review' || phase === 'combat_resolved' || phase === 'submissions_locked') {
    return 'round_review'
  }

  return 'wait_for_opponent_claim'
}

function nextGameMasterActionForRole(
  state: StoredSessionState,
  roleName: TeamRole,
  now: string,
): GameMasterNextAction {
  const phase = gameMasterPhaseForSession(state.phase)

  if (phase === 'expired') {
    return 'stop'
  }

  if (phase === 'session_complete') {
    return 'session_complete'
  }

  if (phase === 'wait_for_opponent_claim') {
    return 'wait_for_opponent_claim'
  }

  if (phase === 'choose_loadout') {
    return state.lockedActions?.[roleName] ? 'wait_for_opponent_loadout' : 'build_bot'
  }

  if (phase === 'combat_turn') {
    if (!isCombatTurnOpen(state, now)) {
      return 'wait_for_opponent_turn'
    }

    return state.combat?.submittedPlans?.[roleName] || state.lockedActions?.[roleName]
      ? 'wait_for_opponent_turn'
      : 'choose_turn'
  }

  if (phase === 'replay_phase') {
    return 'view_replay'
  }

  if (phase === 'round_review') {
    const fightId = latestCompletedFightId(state)

    if (
      fightId &&
      !sharedDebriefCoversFight(state, fightId) &&
      !hasStoredReflection(state, roleName, fightId)
    ) {
      return 'submit_reflection'
    }

    return 'wait_for_debrief'
  }

  return 'wait_for_debrief'
}

function gameMasterInstruction(state: StoredSessionState, roleName: TeamRole, now: string): string {
  if (
    gameMasterPhaseForSession(state.phase) === 'combat_turn' &&
    !isCombatTurnOpen(state, now) &&
    state.combat
  ) {
    return `Next combat round opens at ${state.combat.openedAt}. Keep polling for the combat plan packet.`
  }

  if (state.combat?.submittedPlans?.[roleName]) {
    return 'Your combat round plan is submitted. Wait for the opponent or the next round packet.'
  }

  if (state.lockedActions?.[roleName]) {
    return 'Your action is locked. Wait for the other role or the next server-authored packet.'
  }

  const fightId = latestCompletedFightId(state)

  if (
    gameMasterPhaseForSession(state.phase) === 'round_review' &&
    fightId &&
    !sharedDebriefCoversFight(state, fightId) &&
    !hasStoredReflection(state, roleName, fightId)
  ) {
    return 'Submit a private post-fight reflection for the completed fight. Do not include hidden chain-of-thought.'
  }

  if (state.phase === 'combat_turn' && state.combat?.mode === 'lockstep_round_plan') {
    return 'Submit one combat round plan using packet.combat.budget and the current board affordances when present. Compact GPT packets expose packet.combat.combat and packet.combat.board grid/terrain instead of raw affordance arrays. Each move step names a destination cellId; the resolver advances one cell per substep.'
  }

  if (state.activeActionSets?.[roleName]) {
    return 'Choose one legal action from this packet. Submit parameters only when that legal action exposes parameterSchema.'
  }

  return 'Wait for the next server-authored GameMaster packet.'
}

function isCombatTurnOpen(state: StoredSessionState, now: string): boolean {
  return (
    state.phase === 'combat_turn' &&
    Boolean(state.combat) &&
    Date.parse(now) >= Date.parse(state.combat?.openedAt ?? now)
  )
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function combatRoundPlanSubmissionFromGptRequest(
  request: unknown,
  round: number,
  decisionVersion: number,
): CombatRoundPlanSubmission | undefined {
  const steps = combatPlanStepsFromGptRequest(request)

  if (steps.length === 0) {
    return undefined
  }

  return {
    action: 'submit_combat_round_plan',
    round,
    decisionVersion,
    steps,
    ...(isRecord(request) && typeof request.publicMessage === 'string'
      ? { publicMessage: request.publicMessage }
      : {}),
  }
}

function combatPlanStepsFromGptRequest(request: unknown): CombatPlanStep[] {
  const source = isRecord(request) && isRecord(request.parameters)
    ? request.parameters
    : request
  const rawSteps = isRecord(source)
    ? source.steps ?? source.actions ?? source.plan
    : undefined

  if (!Array.isArray(rawSteps)) {
    return []
  }

  return rawSteps
    .slice(0, 16)
    .map(parseCombatPlanStepFromGpt)
    .filter((step): step is CombatPlanStep => step !== undefined)
}

function parseCombatPlanStepFromGpt(input: unknown): CombatPlanStep | undefined {
  if (typeof input === 'string') {
    return combatPlanStepFromKind(input)
  }
  if (!isRecord(input)) {
    return undefined
  }

  const rawKind = stringField(input, 'kind') ?? stringField(input, 'action') ?? stringField(input, 'actionId')
  const kind = normalizeRoundPlanStepKind(rawKind) ?? (stringField(input, 'cellId') ? 'move' : undefined)

  if (!kind) {
    return undefined
  }

  if (kind === 'move') {
    const cellId = stringField(input, 'cellId') ??
      stringField(input, 'destinationCellId') ??
      cellIdFromTupleField(input, 'to')

    return cellId ? { kind: 'move', cellId } : undefined
  }

  if (kind === 'attack') {
    const weaponSlot = stringField(input, 'weaponSlot') === 'weaponB' ? 'weaponB' : 'weaponA'
    const targetCellId = stringField(input, 'targetCellId') ??
      stringField(input, 'cellId') ??
      cellIdFromTupleField(input, 'target')

    return {
      kind: 'attack',
      weaponSlot,
      ...(targetCellId ? { targetCellId } : {}),
    }
  }

  if (kind === 'utility') {
    const utilityId = stringField(input, 'utilityId') ?? stringField(input, 'utility') ?? stringField(input, 'actionId')
    const cellId = stringField(input, 'cellId') ?? cellIdFromTupleField(input, 'at')

    return {
      kind: 'utility',
      ...(utilityId ? { utilityId } : {}),
      ...(cellId ? { cellId } : {}),
    }
  }

  return { kind: 'end_turn' }
}

function cellIdFromTupleField(input: Record<string, unknown>, field: string): string | undefined {
  const value = input[field]

  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry) => typeof entry === 'number' && Number.isInteger(entry))
  ) {
    return `cell:${value[0]}:${value[1]}`
  }

  return undefined
}

function combatPlanStepFromKind(input: string): CombatPlanStep | undefined {
  const kind = normalizeRoundPlanStepKind(input)

  if (kind === 'end_turn') {
    return { kind: 'end_turn' }
  }

  return undefined
}

function normalizeRoundPlanStepKind(input: string | undefined): CombatPlanStep['kind'] | undefined {
  switch (input) {
    case 'move':
    case 'attack':
    case 'utility':
      return input
    case 'use_utility':
      return 'utility'
    case 'hold':
    case 'wait':
    case 'end':
    case 'end_turn':
    case 'surrender':
      return 'end_turn'
    default:
      return undefined
  }
}

function cloneCombatPlanStep(step: CombatPlanStep): CombatPlanStep {
  return { ...step } as CombatPlanStep
}

function cloneCombatBudget(budget: CombatBudget): CombatBudget {
  return {
    movement: budget.movement,
    actionTime: budget.actionTime,
    weaponCooldowns: { ...budget.weaponCooldowns },
  }
}

function combatRoundPlansEquivalent(left: CombatRoundPlan, right: CombatRoundPlan): boolean {
  return left.role === right.role &&
    left.round === right.round &&
    left.decisionVersion === right.decisionVersion &&
    JSON.stringify(left.steps) === JSON.stringify(right.steps)
}

function boardAnchor(board: unknown, key: 'self' | 'opponent'): { x: number; z: number } {
  const anchor = isRecord(board) && isRecord(board[key]) && isRecord(board[key].anchor)
    ? board[key].anchor
    : undefined
  const x = anchor && typeof anchor.x === 'number' ? anchor.x : 0
  const z = anchor && typeof anchor.z === 'number' ? anchor.z : 0

  return { x, z }
}

function opponentRoleName(roleName: TeamRole): TeamRole {
  return roleName === 'red' ? 'blue' : 'red'
}
