import {
  TEAM_ROLES,
  validateAgentBootstrapRequestShape,
  validateAgentChatMessageRequestShape,
  validateRoleClaimRequestShape,
  validateRoleResetRequestShape,
  validateTurnCommandSubmissionShape,
  type AdvanceRoundResponse,
  type AgentChatMessagePostRequest,
  type AgentChatMessageResponse,
  type AgentPrivateChatMessagePostRequest,
  type AgentPrivateChatMessageResponse,
  type AgentBootstrapRequest,
  type AgentBootstrapResponse,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type PublicSessionState,
  type ReplayPayload,
  type RelayErrorResponse,
  type RoleClaimRequest,
  type RoleClaimResponse,
  type RolePrivateState,
  type RoleResetRequest,
  type RoleResetResponse,
  type RoundPlanSubmission,
  type RoundSubmissionResponse,
  type SessionChatMessage,
  type SessionLogEvent,
  type SessionPhase,
  type TeamRole,
  type TurnCommand,
  type TurnCommandResponse,
  type TurnCommandSubmission,
} from '../../../packages/schemas/src/index.js'
import {
  normalizeRoundSubmission,
  validateRoundSubmission,
  validateSubmittedTurnCommand,
} from '../../../packages/catalog/src/index.js'
import {
  resolveSubmittedCombat,
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
import { createInitialSessionState } from './sessionCreation.js'
import {
  buildPublicSessionState,
  buildRolePrivateState,
} from './sessionStateViews.js'
import type {
  Clock,
  RateLimitAction,
  RateLimitRule,
  RoleBearerAuth,
  SessionResult,
  StoredCombatState,
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
    request: CreateSessionRequest = {},
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

  createResponse(): CreateSessionResponse {
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

  getPublicState(): PublicSessionState {
    const now = this.clock()

    this.expireIfNeeded(now)
    this.resolveExpiredCombatTurn(now)

    return buildPublicSessionState(this.state)
  }

  async claimRole(request: RoleClaimRequest): Promise<SessionResult<RoleClaimResponse>> {
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
        'Claiming a role requires teamIdentity with team name, primaryColor, and optional logo.',
      )
    }

    role.claimedAt = now
    const roleToken = this.tokenFactory(request.role, 'role')
    role.roleTokenHash = await this.tokenHasher(roleToken)
    role.teamIdentity = normalizeTeamIdentity(request.teamIdentity)

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
    request: AgentBootstrapRequest = {},
  ): Promise<SessionResult<AgentBootstrapResponse>> {
    const validation = validateAgentBootstrapRequestShape(request)

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
      return relayError(
        'INVALID_REQUEST',
        'Team identity is locked after the role is claimed.',
      )
    }

    if (!auth.role.claimedAt) {
      if (!request.teamIdentity) {
        return relayError(
          'INVALID_REQUEST',
          'Bootstrapping an unclaimed role requires teamIdentity with team name, primaryColor, and optional logo.',
        )
      }

      auth.role.claimedAt = now
      auth.role.teamIdentity = normalizeTeamIdentity(request.teamIdentity)
      claimedNow = true

      if (request.agentName?.trim()) {
        auth.role.agentName = request.agentName.trim().slice(0, 80)
      }

      this.touch(now)
      this.appendEvent('role_claimed', `${roleName} role claimed.`, now)
      this.advanceClaimPhase(now)
    }

    this.resolveExpiredCombatTurn(now)

    const state = buildRolePrivateState(this.state, auth.role)

    return {
      ok: true,
      value: {
        sessionId: this.state.id,
        role: roleName,
        claimedNow,
        state,
        publicState: this.getPublicState(),
        nextAction: nextActionForRole(state),
      },
    }
  }

  async getRoleStateForToken(roleToken: string): Promise<SessionResult<RolePrivateState>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'state', now)

    if (!auth.ok) {
      return auth
    }

    this.resolveExpiredCombatTurn(now)

    return {
      ok: true,
      value: buildRolePrivateState(this.state, auth.value.role),
    }
  }

  async submitRoundPlan(
    roleToken: string,
    submission: unknown,
  ): Promise<SessionResult<RoundSubmissionResponse>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'submit', now)

    if (!auth.ok) {
      return auth
    }

    const role = auth.value.role

    if (role.submittedAt) {
      return relayError('ALREADY_SUBMITTED', `${role.role} already submitted this round.`)
    }

    if (this.state.phase !== 'submission_phase') {
      return relayError(
        'PHASE_CLOSED',
        `Round plans are only accepted during submission_phase; current phase is ${this.state.phase}.`,
      )
    }

    const validation = validateRoundSubmission({
      gold: role.gold,
      inventory: role.inventory,
      submission: submission as RoundPlanSubmission,
    })

    if (!validation.ok) {
      return relayError('SUBMISSION_INVALID', 'Round plan failed validation.', validation.issues)
    }

    role.submissionBaseline = {
      gold: role.gold,
      inventory: cloneJson(role.inventory),
    }
    role.gold = validation.goldRemaining
    role.inventory = validation.inventory
    role.controls = validation.controls
    role.submission = cloneJson(submission as RoundPlanSubmission)
    role.normalizedSubmission = validation.normalizedSubmission
    role.submittedAt = now

    this.touch(now)
    this.appendChatMessages(role, (submission as RoundPlanSubmission).chat ?? [], now)
    this.appendEvent('round_plan_submitted', `${role.role} submitted a round plan.`, now)
    this.resolveIfReady(now)

    return {
      ok: true,
      value: {
        state: buildRolePrivateState(this.state, role),
        publicState: this.getPublicState(),
      },
    }
  }

  async submitTurnCommand(
    roleToken: string,
    request: unknown,
  ): Promise<SessionResult<TurnCommandResponse>> {
    const now = this.clock()
    const auth = await this.authorizeRoleAction(roleToken, 'turn', now)

    if (!auth.ok) {
      return auth
    }

    const role = auth.value.role

    this.resolveExpiredCombatTurn(now)

    const combat = this.state.combat

    if (this.state.phase !== 'combat_turn' || !combat) {
      return relayError(
        'PHASE_CLOSED',
        `Turn commands are only accepted during combat_turn; current phase is ${this.state.phase}.`,
      )
    }

    if (combat.pending[role.role]) {
      return relayError('ALREADY_SUBMITTED', `${role.role} already submitted combat turn ${combat.nextTick}.`)
    }

    const shape = validateTurnCommandSubmissionShape(request, combat.nextTick)

    if (!shape.ok) {
      return relayError('SUBMISSION_INVALID', 'Turn command failed validation.', shape.issues)
    }

    const submitted = request as TurnCommandSubmission
    const command = turnCommandFromSubmission(submitted)
    const controls = role.controls

    if (!controls) {
      return relayError('INVALID_REQUEST', `${role.role} has no controls for the current round.`)
    }

    const controlValidation = validateSubmittedTurnCommand({ controls, command })

    if (!controlValidation.ok) {
      return relayError('SUBMISSION_INVALID', 'Turn command uses unavailable controls.', controlValidation.issues)
    }

    combat.pending[role.role] = command
    this.touch(now)
    this.appendEvent('turn_command_submitted', `${role.role} submitted combat turn ${combat.nextTick}.`, now)
    this.resolveCombatTurnIfReady(now)

    return {
      ok: true,
      value: {
        state: buildRolePrivateState(this.state, role),
        publicState: this.getPublicState(),
      },
    }
  }

  async submitChatMessage(
    roleToken: string,
    request: unknown,
  ): Promise<SessionResult<AgentChatMessageResponse>> {
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
      [request as AgentChatMessagePostRequest],
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
  ): Promise<SessionResult<AgentPrivateChatMessageResponse>> {
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
      [request as AgentPrivateChatMessagePostRequest],
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

  async advanceRound(
    refereeToken: string,
  ): Promise<SessionResult<AdvanceRoundResponse>> {
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
  ): Promise<SessionResult<RoleResetResponse>> {
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

  getReplay(): SessionResult<ReplayPayload> {
    const activeError = this.requireActive()

    if (activeError) {
      return activeError
    }

    if (!this.state.replay) {
      return relayError('REPLAY_NOT_AVAILABLE', 'Replay is available after both plans resolve.')
    }

    return {
      ok: true,
      value: cloneJson(this.state.replay),
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

    const auth = await findRoleAuthByToken(this.state, this.tokenHasher, roleToken)
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

  private completeMatch(now: string): void {
    const completion = resolveMatchCompletion(this.state)

    this.appendEvent('session_completed', completion.reason, now)
    this.changePhase('session_complete', `Session complete: ${completion.winner}.`, now)
  }

  private advanceToNextRound(now: string): void {
    applyNextRoundEconomy(this.state)
    this.appendEvent('economy_applied', `Round ${this.state.round} economy applied.`, now)
    this.openRoundPlanWindow(now)
    this.changePhase('submission_phase', `Round ${this.state.round} plans are open.`, now)
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
      this.changePhase('submission_phase', 'Both roles claimed; round plans are open.', now)
    }
  }

  private resolveIfReady(now: string): void {
    const red = this.state.roles.red
    const blue = this.state.roles.blue

    if (!red.submission || !blue.submission) {
      return
    }

    this.changePhase('submissions_locked', 'Both round plans accepted.', now)
    this.openCombatTurn(now)
  }

  private openCombatTurn(now: string): void {
    const resolution = resolveSubmittedCombat(this.buildCombatInput(), {
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
      commands: { red: [], blue: [] },
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
      combat.pending[roleName] = createTimeoutTurnCommand(
        combat.nextTick,
        role.controls,
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

    const redCommand = combat.pending.red
    const blueCommand = combat.pending.blue

    if (!redCommand || !blueCommand) {
      return
    }

    combat.commands.red.push(redCommand)
    combat.commands.blue.push(blueCommand)

    const resolution = resolveSubmittedCombat(this.buildCombatInput(), combat.commands)

    if (resolution.status === 'complete') {
      this.completeCombat(resolution.result, now)
      return
    }

    this.state.combat = this.createCombatState({
      nextTick: resolution.nextTick,
      snapshot: resolution.snapshot,
      now,
      commands: combat.commands,
    })
    this.touch(now)
  }

  private createCombatState(input: {
    nextTick: number
    snapshot: StoredCombatState['snapshot']
    now: string
    commands: StoredCombatState['commands']
  }): StoredCombatState {
    return {
      nextTick: input.nextTick,
      openedAt: input.now,
      deadlineAt: addMilliseconds(input.now, COMBAT_TURN_SECONDS * 1000),
      turnSeconds: COMBAT_TURN_SECONDS,
      commands: input.commands,
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

  private buildCombatInput(): ResolveCombatInput {
    const red = this.state.roles.red
    const blue = this.state.roles.blue
    const redSubmission = red.normalizedSubmission
      ?? (red.submission ? normalizeRoundSubmission(red.submission) : undefined)
    const blueSubmission = blue.normalizedSubmission
      ?? (blue.submission ? normalizeRoundSubmission(blue.submission) : undefined)

    if (!redSubmission || !blueSubmission) {
      throw new Error('Both normalized round submissions are required to resolve combat.')
    }

    return {
      round: this.state.round,
      seed: `${this.state.id}:${this.state.seed}`,
      arena: this.state.arena,
      red: {
        blueprint: redSubmission.blueprint,
        tactics: redSubmission.tactics,
      },
      blue: {
        blueprint: blueSubmission.blueprint,
        tactics: blueSubmission.tactics,
      },
    }
  }

  private completeCombat(result: CombatResult, now: string): void {
    const red = this.state.roles.red
    const blue = this.state.roles.blue

    if (!red.submission || !blue.submission) {
      throw new Error('Both round submissions are required to complete combat.')
    }

    this.state.replay = {
      ...result.replay,
      botBlueprints: {
        red: cloneJson(red.submission.blueprint),
        blue: cloneJson(blue.submission.blueprint),
      },
    }
    this.state.combat = undefined
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
    type: SessionLogEvent['type'],
    message: string,
    at = this.clock(),
  ): void {
    appendSessionEvent(this.state, type, message, at)
  }

  private appendChatMessages(
    role: StoredRoleState,
    requests: AgentChatMessagePostRequest[],
    at: string,
  ): SessionChatMessage[] {
    return appendRoleChatMessages(this.state, role, requests, at)
  }

  private appendPrivateChatMessages(
    role: StoredRoleState,
    requests: AgentPrivateChatMessagePostRequest[],
    at: string,
  ): SessionChatMessage[] {
    return appendPrivateRoleChatMessages(this.state, role, requests, at)
  }

  private touch(at = this.clock()): void {
    this.state.updatedAt = at
  }

}

function turnCommandFromSubmission(submission: TurnCommandSubmission): TurnCommand {
  return {
    tick: submission.tick,
    ...(submission.move ? { move: submission.move } : {}),
    ...(submission.weaponA ? { weaponA: submission.weaponA } : {}),
    ...(submission.weaponB ? { weaponB: submission.weaponB } : {}),
    ...(submission.utility ? { utility: submission.utility } : {}),
  }
}

function createTimeoutTurnCommand(
  tick: number,
  controls: StoredRoleState['controls'],
): TurnCommand {
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

  return command
}
