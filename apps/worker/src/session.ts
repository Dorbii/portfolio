import {
  TEAM_ROLES,
  type ArenaConfig,
  type CombatSummary,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type GeneratedControls,
  type InventoryItem,
  type PublicSessionState,
  type RelayErrorResponse,
  type RoleClaimRequest,
  type RoleClaimResponse,
  type RolePrivateState,
  type RolePublicState,
  type RoundPlanSubmission,
  type RoundSubmissionResponse,
  type SessionLogEvent,
  type SessionPhase,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import { validateRoundSubmission } from '../../../packages/catalog/src/index.js'
import {
  resolveCombat,
  type CombatResult,
} from '../../../packages/sim/src/index.js'
import type { ReplayTimeline } from '../../../packages/replay/src/index.js'

const DEFAULT_ARENA: ArenaConfig = {
  name: 'Compact Box',
  width: 24,
  height: 16,
  activeHazards: ['floor_saw'],
}

const DEFAULT_MAX_ROUNDS = 7
const DEFAULT_STARTING_GOLD = 100
const MAX_ROUNDS_LIMIT = 25
const DEFAULT_SESSION_TTL_MS = 6 * 60 * 60 * 1000
const MIN_SESSION_TTL_MS = 60 * 1000
const MAX_SESSION_TTL_MS = 24 * 60 * 60 * 1000

type TokenKind = 'claim' | 'role'
type TokenFactory = (role: TeamRole, kind: TokenKind) => string
type Clock = () => string
type TokenHasher = (token: string) => Promise<string>
type RateLimitAction = 'claim' | 'state' | 'submit'
type RateLimitRule = {
  windowMs: number
  max: number
}

const DEFAULT_RATE_LIMITS: Record<RateLimitAction, RateLimitRule> = {
  claim: { windowMs: 60 * 1000, max: 20 },
  state: { windowMs: 60 * 1000, max: 120 },
  submit: { windowMs: 60 * 1000, max: 20 },
}

export type StoredRoleState = {
  role: TeamRole
  claimTokenHash: string
  roleTokenHash?: string
  agentName?: string
  claimedAt?: string
  submittedAt?: string
  gold: number
  inventory: InventoryItem[]
  controls?: GeneratedControls
  submission?: RoundPlanSubmission
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
  replay?: ReplayTimeline
  lastResult?: CombatSummary
  eventLog: SessionLogEvent[]
  rateLimits: Record<string, StoredRateLimit>
}

type StoredRateLimit = {
  count: number
  resetAt: string
}

type SessionResult<T> =
  | {
      ok: true
      value: T
    }
  | RelayErrorResponse

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function defaultClock(): string {
  return new Date().toISOString()
}

async function defaultTokenHasher(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function randomTokenPart(): string {
  const uuid = globalThis.crypto?.randomUUID?.()

  if (uuid) {
    return uuid.replaceAll('-', '')
  }

  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)

  if (bytes.some((byte) => byte !== 0)) {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  throw new Error('Secure random token generation is unavailable.')
}

function defaultTokenFactory(role: TeamRole, kind: TokenKind): string {
  const prefix = kind === 'claim' ? 'cap' : 'role'

  return `${prefix}_${role}_${randomTokenPart()}`
}

function relayError(
  code: RelayErrorResponse['error']['code'],
  message: string,
  issues?: RelayErrorResponse['error']['issues'],
): RelayErrorResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(issues ? { issues } : {}),
    },
  }
}

function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && TEAM_ROLES.includes(value as TeamRole)
}

function isArenaConfig(value: unknown): value is ArenaConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const arena = value as Record<string, unknown>
  const width = arena.width
  const height = arena.height
  const activeHazards = arena.activeHazards

  return (
    typeof arena.name === 'string' &&
    typeof width === 'number' &&
    Number.isInteger(width) &&
    typeof height === 'number' &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    Array.isArray(activeHazards) &&
    activeHazards.every((hazard) => typeof hazard === 'string')
  )
}

function safeText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function safeMaxRounds(value: unknown): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_ROUNDS_LIMIT
    ? value
    : DEFAULT_MAX_ROUNDS
}

function safeTtlMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SESSION_TTL_MS
  }

  const ttlMs = Math.floor(value * 1000)

  if (ttlMs < MIN_SESSION_TTL_MS || ttlMs > MAX_SESSION_TTL_MS) {
    return DEFAULT_SESSION_TTL_MS
  }

  return ttlMs
}

function addMilliseconds(value: string, ms: number): string {
  return new Date(Date.parse(value) + ms).toISOString()
}

function mergeRateLimits(
  overrides?: Partial<Record<RateLimitAction, RateLimitRule>>,
): Record<RateLimitAction, RateLimitRule> {
  return {
    claim: overrides?.claim ?? DEFAULT_RATE_LIMITS.claim,
    state: overrides?.state ?? DEFAULT_RATE_LIMITS.state,
    submit: overrides?.submit ?? DEFAULT_RATE_LIMITS.submit,
  }
}

function rolePublicState(role: StoredRoleState): RolePublicState {
  return {
    role: role.role,
    claimed: Boolean(role.claimedAt),
    submitted: Boolean(role.submittedAt),
  }
}

function combatSummary(result: CombatResult): CombatSummary {
  return {
    winner: result.winner,
    reason: result.reason,
    damage: result.damage,
    remainingHealth: result.remainingHealth,
  }
}

export function createSessionId(): string {
  return `s_${randomTokenPart().slice(0, 12)}`
}

export class SessionCoordinator {
  private state: StoredSessionState

  private readonly clock: Clock

  private readonly tokenFactory: TokenFactory

  private readonly tokenHasher: TokenHasher

  private readonly rateLimits: Record<RateLimitAction, RateLimitRule>

  private readonly pendingClaimTokens?: Record<TeamRole, string>

  private constructor(
    state: StoredSessionState,
    options: {
      clock?: Clock
      tokenFactory?: TokenFactory
      tokenHasher?: TokenHasher
      rateLimits?: Partial<Record<RateLimitAction, RateLimitRule>>
      pendingClaimTokens?: Record<TeamRole, string>
    } = {},
  ) {
    this.state = state
    this.state.rateLimits ??= {}
    this.clock = options.clock ?? defaultClock
    this.tokenFactory = options.tokenFactory ?? defaultTokenFactory
    this.tokenHasher = options.tokenHasher ?? defaultTokenHasher
    this.rateLimits = mergeRateLimits(options.rateLimits)
    this.pendingClaimTokens = options.pendingClaimTokens
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
    const clock = options.clock ?? defaultClock
    const tokenFactory = options.tokenFactory ?? defaultTokenFactory
    const tokenHasher = options.tokenHasher ?? defaultTokenHasher
    const now = clock()
    const sessionId = safeText(request.sessionId) ?? createSessionId()
    const seed = safeText(request.seed) ?? sessionId
    const arena = isArenaConfig(request.arena) ? request.arena : DEFAULT_ARENA
    const claimTokens: Record<TeamRole, string> = {
      red: tokenFactory('red', 'claim'),
      blue: tokenFactory('blue', 'claim'),
    }

    const state: StoredSessionState = {
      id: sessionId,
      phase: 'waiting_for_agents',
      round: 1,
      maxRounds: safeMaxRounds(request.maxRounds),
      seed,
      arena,
      createdAt: now,
      expiresAt: addMilliseconds(now, safeTtlMs(request.ttlSeconds)),
      updatedAt: now,
      roles: {
        red: {
          role: 'red',
          claimTokenHash: await tokenHasher(claimTokens.red),
          gold: DEFAULT_STARTING_GOLD,
          inventory: [],
        },
        blue: {
          role: 'blue',
          claimTokenHash: await tokenHasher(claimTokens.blue),
          gold: DEFAULT_STARTING_GOLD,
          inventory: [],
        },
      },
      rateLimits: {},
      eventLog: [
        {
          at: now,
          type: 'session_created',
          message: `Session ${sessionId} opened for role claims.`,
        },
      ],
    }

    return new SessionCoordinator(state, {
      clock,
      tokenFactory,
      tokenHasher,
      rateLimits: options.rateLimits,
      pendingClaimTokens: claimTokens,
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
    if (!this.pendingClaimTokens) {
      throw new Error('Claim tokens are only available immediately after session creation.')
    }

    const claimTokens = this.pendingClaimTokens

    return {
      sessionId: this.state.id,
      phase: this.state.phase,
      invites: TEAM_ROLES.map((role) => ({
        role,
        claimToken: claimTokens[role],
        claimPath: `/sessions/${this.state.id}/claim`,
      })),
      publicState: this.getPublicState(),
    }
  }

  getPublicState(): PublicSessionState {
    this.expireIfNeeded()

    return cloneJson({
      sessionId: this.state.id,
      phase: this.state.phase,
      round: this.state.round,
      maxRounds: this.state.maxRounds,
      expiresAt: this.state.expiresAt,
      arena: this.state.arena,
      roles: {
        red: rolePublicState(this.state.roles.red),
        blue: rolePublicState(this.state.roles.blue),
      },
      replayAvailable: Boolean(this.state.replay),
      ...(this.state.lastResult ? { lastResult: this.state.lastResult } : {}),
      eventLog: this.state.eventLog,
    })
  }

  async claimRole(request: RoleClaimRequest): Promise<SessionResult<RoleClaimResponse>> {
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

    role.claimedAt = now
    const roleToken = this.tokenFactory(request.role, 'role')
    role.roleTokenHash = await this.tokenHasher(roleToken)

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
        state: this.buildRoleState(role),
      },
    }
  }

  async getRoleStateForToken(roleToken: string): Promise<SessionResult<RolePrivateState>> {
    const now = this.clock()
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const role = await this.findRoleByToken(roleToken)
    const rateLimitError = this.takeRateLimit('state', role?.role ?? 'invalid', now)

    if (rateLimitError) {
      return rateLimitError
    }

    if (!role) {
      return relayError('INVALID_TOKEN', 'Role bearer token is missing or invalid.')
    }

    return {
      ok: true,
      value: this.buildRoleState(role),
    }
  }

  async submitRoundPlan(
    roleToken: string,
    submission: unknown,
  ): Promise<SessionResult<RoundSubmissionResponse>> {
    const now = this.clock()
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const role = await this.findRoleByToken(roleToken)
    const rateLimitError = this.takeRateLimit('submit', role?.role ?? 'invalid', now)

    if (rateLimitError) {
      return rateLimitError
    }

    if (!role) {
      return relayError('INVALID_TOKEN', 'Role bearer token is missing or invalid.')
    }

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

    role.gold = validation.goldRemaining
    role.inventory = validation.inventory
    role.controls = validation.controls
    role.submission = cloneJson(submission as RoundPlanSubmission)
    role.submittedAt = now

    this.touch(now)
    this.appendEvent('round_plan_submitted', `${role.role} submitted a round plan.`, now)
    this.resolveIfReady(now)

    return {
      ok: true,
      value: {
        state: this.buildRoleState(role),
        publicState: this.getPublicState(),
      },
    }
  }

  getReplay(): SessionResult<ReplayTimeline> {
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

  private buildRoleState(role: StoredRoleState): RolePrivateState {
    const opponent = role.role === 'red' ? this.state.roles.blue : this.state.roles.red

    return cloneJson({
      sessionId: this.state.id,
      role: role.role,
      phase: this.state.phase,
      round: this.state.round,
      expiresAt: this.state.expiresAt,
      gold: role.gold,
      inventory: role.inventory,
      ...(role.controls ? { controls: role.controls } : {}),
      submitted: Boolean(role.submittedAt),
      ...(role.submission ? { ownSubmission: role.submission } : {}),
      opponent: rolePublicState(opponent),
      replayAvailable: Boolean(this.state.replay),
      ...(this.state.lastResult ? { lastResult: this.state.lastResult } : {}),
      eventLog: this.state.eventLog,
    })
  }

  private async findRoleByToken(roleToken: string): Promise<StoredRoleState | undefined> {
    if (!roleToken.trim()) {
      return undefined
    }

    const roleTokenHash = await this.tokenHasher(roleToken)

    return TEAM_ROLES.map((role) => this.state.roles[role]).find(
      (role) => role.roleTokenHash === roleTokenHash,
    )
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
    const rule = this.rateLimits[action]
    const bucketKey = `${action}:${key}`
    const current = this.state.rateLimits[bucketKey]
    const nowMs = Date.parse(now)

    if (!current || Date.parse(current.resetAt) <= nowMs) {
      this.state.rateLimits[bucketKey] = {
        count: 1,
        resetAt: addMilliseconds(now, rule.windowMs),
      }

      return undefined
    }

    if (current.count >= rule.max) {
      return relayError(
        'RATE_LIMITED',
        `${action} rate limit exceeded. Try again after ${current.resetAt}.`,
      )
    }

    current.count += 1

    return undefined
  }

  private advanceClaimPhase(now: string): void {
    const bothClaimed = TEAM_ROLES.every((role) => this.state.roles[role].claimedAt)

    if (bothClaimed && this.state.phase === 'waiting_for_agents') {
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

    const result = resolveCombat({
      round: this.state.round,
      seed: `${this.state.id}:${this.state.seed}`,
      arena: this.state.arena,
      red: {
        blueprint: red.submission.blueprint,
        turnPlan: red.submission.turnPlan,
      },
      blue: {
        blueprint: blue.submission.blueprint,
        turnPlan: blue.submission.turnPlan,
      },
    })

    this.state.replay = result.replay
    this.state.lastResult = combatSummary(result)
    this.appendEvent('combat_resolved', result.reason, now)
    this.changePhase('combat_resolved', 'Combat result recorded.', now)
    this.changePhase('replay_phase', 'Replay timeline is available.', now)
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
    this.state.eventLog.push({ at, type, message })
  }

  private touch(at = this.clock()): void {
    this.state.updatedAt = at
  }
}
