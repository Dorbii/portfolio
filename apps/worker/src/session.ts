import {
  TEAM_ROLES,
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
  type GameMasterActionKind,
  type GameMasterActionParameters,
  type GameMasterActionSubmission,
  type GameMasterLegalAction,
  type GameMasterNextAction,
  type GameMasterPacket,
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
  type StoredDesign,
  type TeamRole,
  type TurnCommand,
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
import {
  applyLoadoutAction,
  botDesignSnapshotToLegacyBotBlueprintProjection,
  buildCombatActionSet,
  buildLoadoutActionSet,
  buildFightDossier,
  combatLegalActionForPacket,
  combatAnchorForPosition,
  deriveMachineCapabilities,
  isCombatAction,
  ensureLoadoutBuildState,
  isLoadoutBuilderAction,
  LOADOUT_PART_LIMIT,
  loadoutLegalActionForPacket,
  machineDesignToLegacyBotBlueprintProjection,
  machineDesignToLegacyBotDesignSnapshotProjection,
  resolveSubmittedGameActions,
  mergeFightDossier,
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
  consumePendingReflectionsIntoDebrief,
  hasStoredReflection,
  latestCompletedFightId,
  storePrivateReflection,
  storedReflectionForRole,
} from './sessionContinuation.js'
import {
  buildPublicSessionState,
  buildRolePrivateState,
} from './sessionStateViews.js'
import { validateLegacyAgentBootstrapRequestShape } from './sessionBootstrapLegacy.js'
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

const COMBAT_TURN_SECONDS = 120
const ROUND_PLAN_SECONDS = 120
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

    this.expireIfNeeded(now)
    this.resolveExpiredCombatTurn(now)
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
    role.teamIdentity = role.teamIdentity ?? normalizeTeamIdentity(request.teamIdentity)

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
    const validation = validateLegacyAgentBootstrapRequestShape(request)

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
      const requestedIdentity = normalizeTeamIdentity(request.teamIdentity)

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
        normalizeTeamIdentity((request as AgentBootstrapRequest).teamIdentity)
      claimedNow = true

      auth.role.agentName = (request as AgentBootstrapRequest).agentName.trim().slice(0, 80)

      this.touch(now)
      this.appendEvent('role_claimed', `${roleName} role claimed.`, now)
      this.advanceClaimPhase(now)
    }

    this.resolveExpiredCombatTurn(now)
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

    this.resolveExpiredCombatTurn(now)
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

    this.resolveExpiredCombatTurn(now)
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

    this.resolveExpiredCombatTurn(now)
    this.ensureGameMasterActionSets(now)

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
    this.resolveLockedActionsIfReady(now)

    return {
      ok: true,
      value: {
        packet: this.buildGameMasterPacket(role.role, now),
        publicState: this.getPublicState(),
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

    if (this.state.sharedDebrief) {
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
    const legalActions = activeSet && !locked ? legalActionsForPacket(activeSet) : []
    const blockedActions = activeSet && !locked ? activeSet.blockedActions ?? [] : []
    const combat = this.state.phase === 'combat_turn' ? this.state.combat : undefined
    const selfCombat = combat
      ? roleName === 'red' ? combat.snapshot.red : combat.snapshot.blue
      : undefined
    const opponentCombat = combat
      ? roleName === 'red' ? combat.snapshot.blue : combat.snapshot.red
      : undefined
    const buildState = gameMasterPhaseForSession(this.state.phase) === 'choose_loadout'
      ? ensureLoadoutBuildState(roleName, role.loadoutBuildState)
      : undefined
    const submit = activeSet && legalActions.length > 0
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

    return cloneJson({
      sessionId: this.state.id,
      role: roleName,
      phase: gameMasterPhaseForSession(this.state.phase),
      nextAction: nextGameMasterActionForRole(this.state, roleName),
      round: this.state.round,
      fightId: activeSet?.fightId ?? latestCompletedFightId(this.state),
      turnId: activeSet?.turnId,
      decisionVersion: activeSet?.decisionVersion ?? decisionVersionForRole(this.state, roleName),
      eventVersion: eventVersionForState(this.state),
      actionSetId: activeSet?.actionSetId,
      catalogDigest: activeSet?.catalogDigest,
      instruction: gameMasterInstruction(this.state, roleName),
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
      board: {
        arena: this.state.arena,
        ...(selfCombat
          ? {
              self: {
                anchor: combatAnchorForPosition(this.state.arena, selfCombat.position),
                facing: roleName === 'red' ? 'east' as const : 'west' as const,
              },
            }
          : {}),
        ...(opponentCombat
          ? {
              opponent: {
                anchor: combatAnchorForPosition(this.state.arena, opponentCombat.position),
                facing: roleName === 'red' ? 'west' as const : 'east' as const,
              },
            }
          : {}),
      },
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
      ...(this.state.sharedDebrief ? { sharedDebrief: cloneJson(this.state.sharedDebrief) } : {}),
      ...(submit ? { submit } : {}),
    })
  }

  private ensureGameMasterActionSets(now: string): void {
    const phase = gameMasterPhaseForSession(this.state.phase)

    if (phase !== 'choose_loadout' && phase !== 'combat_turn') {
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
    if (gameMasterPhaseForSession(this.state.phase) === 'choose_loadout') {
      if (TEAM_ROLES.every((roleName) => this.state.roles[roleName].loadoutConfirmedAt)) {
        this.state.activeActionSets = undefined
        this.state.lockedActions = undefined
        this.openCombatTurn(now)
      }

      return
    }

    if (this.state.phase !== 'combat_turn' || !this.state.combat) {
      return
    }

    const redAction = this.lockedCanonicalAction('red')
    const blueAction = this.lockedCanonicalAction('blue')

    if (!redAction || !blueAction) {
      return
    }
    if (!isCombatAction(redAction) || !isCombatAction(blueAction)) {
      return
    }

    this.state.combat.pending = {
      red: redAction,
      blue: blueAction,
    }
    this.resolveCombatTurnIfReady(now)
  }

  private lockedCanonicalAction(roleName: TeamRole): CanonicalGameAction | undefined {
    const lock = this.state.lockedActions?.[roleName]
    const activeSet = this.state.activeActionSets?.[roleName]

    if (!lock || !activeSet || lock.actionSetId !== activeSet.actionSetId) {
      return undefined
    }

    return activeSet.actions[lock.actionId]
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

  private applyReviewAndAdvance(now: string): void {
    this.consumeDebriefIfReady(now)
    this.appendEvent(
      'round_advanced',
      'Referee advanced round review.',
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
    if (!this.state.fightDossier || this.state.sharedDebrief) {
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
      actions: { red: [], blue: [] },
      baselineMachineDesigns,
    })
    this.changePhase('combat_turn', `Combat turn ${resolution.nextTick} is open.`, now)
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
      if (combat.pending[roleName]) {
        continue
      }

      const role = this.state.roles[roleName]
      combat.pending[roleName] = createTimeoutCombatAction(
        roleName,
        this.state.round,
        combat.nextTick,
        controlsForRoleState(role),
      )
      this.appendEvent(
        'turn_command_timed_out',
        `${roleName} timed out on combat turn ${combat.nextTick}; no-op command applied.`,
        now,
      )
    }

    this.resolveCombatTurnIfReady(now)
  }

  private resolveCombatTurnIfReady(now: string): void {
    const combat = this.state.combat

    if (this.state.phase !== 'combat_turn' || !combat) {
      return
    }

    const redAction = combat.pending.red
    const blueAction = combat.pending.blue

    if (!redAction || !blueAction) {
      return
    }

    combat.actions.red.push(redAction)
    combat.actions.blue.push(blueAction)

    const resolution = resolveSubmittedGameActions(
      this.buildCombatInput(combat.baselineMachineDesigns),
      combat.actions,
    )

    if (resolution.status === 'complete') {
      this.applyMachineRuntimeState(resolution.result.machineRuntime)
      this.completeCombat(resolution.result, now)
      return
    }

    this.applyMachineRuntimeState(resolution.machineRuntime)
    this.state.combat = this.createCombatState({
      nextTick: resolution.nextTick,
      snapshot: resolution.snapshot,
      now,
      actions: combat.actions,
      baselineMachineDesigns: combat.baselineMachineDesigns,
    })
    this.state.activeActionSets = undefined
    this.state.lockedActions = undefined
    this.touch(now)
  }

  private createCombatState(input: {
    nextTick: number
    snapshot: StoredCombatState['snapshot']
    now: string
    actions: StoredCombatState['actions']
    baselineMachineDesigns?: StoredCombatState['baselineMachineDesigns']
  }): StoredCombatState {
    return {
      nextTick: input.nextTick,
      openedAt: input.now,
      deadlineAt: addMilliseconds(input.now, COMBAT_TURN_SECONDS * 1000),
      turnSeconds: COMBAT_TURN_SECONDS,
      ...(input.baselineMachineDesigns ? { baselineMachineDesigns: input.baselineMachineDesigns } : {}),
      actions: input.actions,
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

  private completeCombat(result: CombatResult, now: string): void {
    const red = this.state.roles.red
    const blue = this.state.roles.blue

    if (!red.teamIdentity || !blue.teamIdentity) {
      throw new Error('Both team identities are required to complete combat.')
    }

    const botBlueprints = {
      red: cloneJson(this.replayCompatibilityBlueprintForRole(red)),
      blue: cloneJson(this.replayCompatibilityBlueprintForRole(blue)),
    }
    const machineDesigns = this.replayMachineDesignsForRoles()
    const fightId = `fight_${this.state.round}`

    this.state.replay = {
      ...result.replay,
      teamIdentities: {
        red: cloneJson(red.teamIdentity),
        blue: cloneJson(blue.teamIdentity),
      },
      botBlueprints,
      ...(machineDesigns ? { machineDesigns } : {}),
    }
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

function createTimeoutCombatAction(
  roleName: TeamRole,
  round: number,
  tick: number,
  controls: StoredRoleState['controls'],
): CanonicalGameAction {
  const command: TurnCommand = { tick }
  const move = controls?.movement.includes('brake')
    ? 'brake'
    : controls?.movement[0]

  if (move) {
    command.move = move
  }
  if (controls?.weaponA?.includes('hold')) {
    command.weaponA = 'hold'
  }
  if (controls?.weaponB?.includes('hold')) {
    command.weaponB = 'hold'
  }
  if (controls?.utility?.includes('hold')) {
    command.utility = 'hold'
  }

  return createCanonicalCombatAction(roleName, round, tick, command, 'timeout')
}

function createCanonicalCombatAction(
  roleName: TeamRole,
  round: number,
  tick: number,
  command: TurnCommand,
  source: string,
): CanonicalGameAction {
  return {
    id: `combat.${roleName}.r${round}.t${tick}.${source}.${command.move ?? 'hold'}`,
    kind: command.weaponA === 'fire' || command.weaponB === 'fire'
      ? command.move && command.move !== 'brake' ? 'move_and_attack' : 'attack'
      : command.utility === 'activate'
        ? 'use_utility'
        : command.move && command.move !== 'brake'
          ? 'move'
          : 'hold',
    role: roleName,
    payload: {
      scope: 'combat_turn',
      source,
      command,
      label: source === 'timeout' ? 'Timed-out hold' : 'Server-selected combat action',
      summary: 'Server-wrapped canonical combat action.',
    },
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

function controlsForRoleState(role: StoredRoleState): StoredRoleState['controls'] {
  if (role.storedDesign?.version === 'machine:v1') {
    return { movement: ['brake'] }
  }

  if (role.controls) {
    return role.controls
  }
  if (role.storedDesign) {
    return controlsForStoredLegacyDesign(role.storedDesign)
  }
  if (role.currentDesign) {
    return deriveControls(botDesignSnapshotToLegacyBotBlueprintProjection(role.currentDesign))
  }

  return { movement: ['brake'] }
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

function createGameMasterActionSet(
  state: StoredSessionState,
  roleName: TeamRole,
  phase: GameMasterPhase,
  now: string,
): ActiveActionSet {
  if (phase === 'choose_loadout') {
    const role = state.roles[roleName]

    role.loadoutBuildState = ensureLoadoutBuildState(roleName, role.loadoutBuildState)
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

  const role = state.roles[roleName]
  const machineCapabilities = machineCapabilitiesForRole(role)

  return buildCombatActionSet({
    role: roleName,
    round: state.round,
    tick: state.combat.nextTick,
    decisionVersion: decisionVersionForRole(state, roleName),
    actionSetId: actionSetIdForState(state, roleName),
    createdAt: now,
    catalogVersion: GAME_MASTER_CATALOG_VERSION,
    arenaVersion: `${GAME_MASTER_ARENA_VERSION}:${state.arena.width}x${state.arena.height}`,
    expiresAt: state.combat.deadlineAt,
    snapshot: state.combat.snapshot,
    ...(machineCapabilities
      ? { machineCapabilities }
      : { controls: controlsForRoleState(role) }),
  })
}

function legalActionsForPacket(actionSet: ActiveActionSet): GameMasterLegalAction[] {
  return Object.values(actionSet.actions).map((action) => {
    if (isLoadoutBuilderAction(action)) {
      return legalActionWithParameterMetadata(action, loadoutLegalActionForPacket(action))
    }
    if (isCombatAction(action)) {
      return legalActionWithParameterMetadata(action, combatLegalActionForPacket(action))
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
  return kind === 'hold' ? 'Hold position' : 'Ready'
}

function legalActionSummary(kind: GameMasterActionKind): string {
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
    return state.lockedActions?.[roleName] ? 'wait_for_opponent_turn' : 'choose_turn'
  }

  if (phase === 'replay_phase') {
    return 'view_replay'
  }

  if (phase === 'round_review') {
    const fightId = latestCompletedFightId(state)

    if (
      fightId &&
      !state.sharedDebrief &&
      !hasStoredReflection(state, roleName, fightId)
    ) {
      return 'submit_reflection'
    }

    return 'wait_for_debrief'
  }

  return 'wait_for_debrief'
}

function gameMasterInstruction(state: StoredSessionState, roleName: TeamRole): string {
  if (state.lockedActions?.[roleName]) {
    return 'Your action is locked. Wait for the other role or the next server-authored packet.'
  }

  const fightId = latestCompletedFightId(state)

  if (
    gameMasterPhaseForSession(state.phase) === 'round_review' &&
    fightId &&
    !state.sharedDebrief &&
    !hasStoredReflection(state, roleName, fightId)
  ) {
    return 'Submit a private post-fight reflection for the completed fight. Do not include hidden chain-of-thought.'
  }

  if (state.activeActionSets?.[roleName]) {
    return 'Choose one legal action from this packet. Submit parameters only when that legal action exposes parameterSchema.'
  }

  return 'Wait for the next server-authored GameMaster packet.'
}
