import {
  TEAM_ROLES,
  validateAgentBootstrapRequestShape,
  validateAgentChatMessageRequestShape,
  validateSubmitRefereeAwardsRequestShape,
  validateRoleResetRequestShape,
  type AgentChatMessagePostRequest,
  type AgentChatMessageResponse,
  type AgentBootstrapRequest,
  type AgentBootstrapResponse,
  type AgentNextAction,
  type AppliedRefereeAward,
  type ArenaConfig,
  type CombatSummary,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type GeneratedControls,
  type InventoryItem,
  type PublicSessionState,
  type ReplayPayload,
  type RefereeAwardOption,
  type RefereeAwardsResponse,
  type RelayErrorResponse,
  type RoleClaimRequest,
  type RoleClaimResponse,
  type RolePrivateState,
  type RolePublicState,
  type RoleResetRequest,
  type RoleResetResponse,
  type RoundPlanSubmission,
  type RoundSubmissionResponse,
  type SessionLogEvent,
  type SessionPhase,
  type SessionChatMessage,
  type SubmitRefereeAwardsRequest,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import { validateRoundSubmission } from '../../../packages/catalog/src/index.js'
import {
  createSeededRng,
  resolveCombat,
  type CombatResult,
} from '../../../packages/sim/src/index.js'

const DEFAULT_ARENA: ArenaConfig = {
  name: 'Compact Box',
  width: 24,
  height: 16,
  activeHazards: ['floor_saw'],
}

const DEFAULT_MAX_ROUNDS = 7
const DEFAULT_STARTING_GOLD = 100
const DEFAULT_BASE_INCOME = 50
const DEFAULT_INTEREST_RATE = 0.1
const DEFAULT_INTEREST_CAP = 25
const DEFAULT_WIN_STREAK_TARGET = 3
const MAX_ROUNDS_LIMIT = 25
const DEFAULT_SESSION_TTL_MS = 6 * 60 * 60 * 1000
const MIN_SESSION_TTL_MS = 60 * 1000
const MAX_SESSION_TTL_MS = 24 * 60 * 60 * 1000

type TokenKind = 'claim' | 'role' | 'referee'
type TokenOwner = TeamRole | 'referee'
type TokenFactory = (owner: TokenOwner, kind: TokenKind) => string
type Clock = () => string
type TokenHasher = (token: string) => Promise<string>
type RateLimitAction = 'claim' | 'state' | 'submit' | 'chat' | 'referee_awards' | 'reset_role'
type RateLimitRule = {
  windowMs: number
  max: number
}

const DEFAULT_RATE_LIMITS: Record<RateLimitAction, RateLimitRule> = {
  claim: { windowMs: 60 * 1000, max: 20 },
  state: { windowMs: 60 * 1000, max: 120 },
  submit: { windowMs: 60 * 1000, max: 20 },
  chat: { windowMs: 60 * 1000, max: 30 },
  referee_awards: { windowMs: 60 * 1000, max: 20 },
  reset_role: { windowMs: 60 * 1000, max: 20 },
}

type RefereeAwardCard = {
  id: string
  title: string
  description: string
  gold: number
}

const REFEREE_AWARD_CARDS: RefereeAwardCard[] = [
  {
    id: 'most-stylish',
    title: 'Most Stylish',
    description: 'Readable silhouette, memorable identity, and enough restraint to still look engineered.',
    gold: 25,
  },
  {
    id: 'coolest-idea',
    title: 'Coolest Idea',
    description: 'The build tried something specific instead of drifting into generic weapon mass.',
    gold: 20,
  },
  {
    id: 'best-engineering',
    title: 'Best Engineering',
    description: 'The design had the cleanest relationship between parts, motion, and fight plan.',
    gold: 25,
  },
  {
    id: 'budget-genius',
    title: 'Budget Genius',
    description: 'The team preserved economy without submitting a throwaway machine.',
    gold: 20,
  },
  {
    id: 'most-chaotic',
    title: 'Most Chaotic',
    description: 'The fight became stranger because this bot existed, and that deserves a sponsor.',
    gold: 20,
  },
  {
    id: 'best-use-of-parts',
    title: 'Best Use of Parts',
    description: 'Parts were arranged with intent instead of merely spending the available budget.',
    gold: 25,
  },
  {
    id: 'funniest-bot',
    title: 'Funniest Bot',
    description: 'The machine made a bad idea legible enough to become entertaining.',
    gold: 20,
  },
  {
    id: 'most-improved',
    title: 'Most Improved',
    description: 'This round showed clearer adaptation than the previous submitted approach.',
    gold: 25,
  },
  {
    id: 'best-counterbuild',
    title: 'Best Counterbuild',
    description: 'The bot answered the opponent instead of pretending the matchup did not exist.',
    gold: 25,
  },
  {
    id: 'sponsor-favorite',
    title: 'Sponsor Favorite',
    description: 'The broadcast booth can explain this bot in one sentence and sell the shirt.',
    gold: 20,
  },
]

export type StoredRoleState = {
  role: TeamRole
  claimTokenHash: string
  roleTokenHash?: string
  agentName?: string
  claimedAt?: string
  submittedAt?: string
  gold: number
  wins: number
  losses: number
  winStreak: number
  inventory: InventoryItem[]
  controls?: GeneratedControls
  submission?: RoundPlanSubmission
  submissionBaseline?: {
    gold: number
    inventory: InventoryItem[]
  }
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
  awardOptions: RefereeAwardOption[]
  awardHistory: AppliedRefereeAward[]
  replay?: ReplayPayload
  lastResult?: CombatSummary
  chatLog: SessionChatMessage[]
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

type RoleBearerAuth = {
  role: StoredRoleState
}

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

function defaultTokenFactory(owner: TokenOwner, kind: TokenKind): string {
  if (kind === 'referee') {
    return `cap_ref_${randomTokenPart()}`
  }

  const prefix = kind === 'claim' ? 'cap' : 'role'

  return `${prefix}_${owner}_${randomTokenPart()}`
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
    chat: overrides?.chat ?? DEFAULT_RATE_LIMITS.chat,
    referee_awards: overrides?.referee_awards ?? DEFAULT_RATE_LIMITS.referee_awards,
    reset_role: overrides?.reset_role ?? DEFAULT_RATE_LIMITS.reset_role,
  }
}

function rolePublicState(role: StoredRoleState): RolePublicState {
  return {
    role: role.role,
    claimed: Boolean(role.claimedAt),
    submitted: Boolean(role.submittedAt),
    wins: role.wins,
    losses: role.losses,
    winStreak: role.winStreak,
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

function nextActionForRole(state: RolePrivateState): AgentNextAction {
  if (state.phase === 'expired' || state.phase === 'session_complete') {
    return 'stop'
  }

  if (state.phase === 'waiting_for_agents') {
    return 'wait_for_opponent_claim'
  }

  if (state.phase === 'submission_phase') {
    return state.submitted ? 'wait_for_opponent_submission' : 'submit_round_plan'
  }

  if (state.phase === 'referee_awards') {
    return 'wait_for_referee'
  }

  return 'wait_for_next_round'
}

export function calculateInterest(unspentGold: number): number {
  return Math.min(
    Math.floor(Math.max(0, unspentGold) * DEFAULT_INTEREST_RATE),
    DEFAULT_INTEREST_CAP,
  )
}

export function generateRefereeAwardOptions(
  seed: string,
  round: number,
): RefereeAwardOption[] {
  const rng = createSeededRng(`${seed}:awards:${round}`)
  const cards = [...REFEREE_AWARD_CARDS]
  const options: RefereeAwardOption[] = []

  while (options.length < 3 && cards.length > 0) {
    const index = Math.floor(rng() * cards.length)
    const [card] = cards.splice(index, 1)

    options.push({
      id: `${card.id}-r${round}`,
      title: card.title,
      description: card.description,
      gold: card.gold,
    })
  }

  return options
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

  private readonly pendingRefereeToken?: string

  private constructor(
    state: StoredSessionState,
    options: {
      clock?: Clock
      tokenFactory?: TokenFactory
      tokenHasher?: TokenHasher
      rateLimits?: Partial<Record<RateLimitAction, RateLimitRule>>
      pendingClaimTokens?: Record<TeamRole, string>
      pendingRefereeToken?: string
    } = {},
  ) {
    this.state = state
    this.state.rateLimits ??= {}
    this.state.awardOptions ??= []
    this.state.awardHistory ??= []
    this.state.chatLog ??= []
    for (const role of TEAM_ROLES) {
      this.state.roles[role].wins ??= 0
      this.state.roles[role].losses ??= 0
      this.state.roles[role].winStreak ??= 0
    }
    this.clock = options.clock ?? defaultClock
    this.tokenFactory = options.tokenFactory ?? defaultTokenFactory
    this.tokenHasher = options.tokenHasher ?? defaultTokenHasher
    this.rateLimits = mergeRateLimits(options.rateLimits)
    this.pendingClaimTokens = options.pendingClaimTokens
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
    const refereeToken = tokenFactory('referee', 'referee')

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
          wins: 0,
          losses: 0,
          winStreak: 0,
          inventory: [],
        },
        blue: {
          role: 'blue',
          claimTokenHash: await tokenHasher(claimTokens.blue),
          gold: DEFAULT_STARTING_GOLD,
          wins: 0,
          losses: 0,
          winStreak: 0,
          inventory: [],
        },
      },
      refereeTokenHash: await tokenHasher(refereeToken),
      awardOptions: [],
      awardHistory: [],
      chatLog: [],
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
      pendingRefereeToken: refereeToken,
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
    if (!this.pendingClaimTokens || !this.pendingRefereeToken) {
      throw new Error('Capability tokens are only available immediately after session creation.')
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
      refereeToken: this.pendingRefereeToken,
      publicState: this.getPublicState(),
    }
  }

  getPublicState(): PublicSessionState {
    this.expireIfNeeded()

    return cloneJson({
      sessionId: this.state.id,
      stateVersion: this.stateVersion(),
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
      ...(this.state.awardOptions.length > 0 ? { awardOptions: this.state.awardOptions } : {}),
      ...(this.state.lastResult ? { lastResult: this.state.lastResult } : {}),
      chatLog: this.state.chatLog,
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

    const auth = await this.findRoleBearer(roleName, playerKey, {
      allowUnclaimedClaimKey: true,
    })

    if (!auth) {
      return role.claimedAt
        ? relayError('ROLE_ALREADY_CLAIMED', `${roleName} has already been claimed by another player key.`)
        : relayError('INVALID_TOKEN', 'Player key does not match the requested role.')
    }

    let claimedNow = false

    if (!auth.role.claimedAt) {
      auth.role.claimedAt = now
      claimedNow = true

      if (request.agentName?.trim()) {
        auth.role.agentName = request.agentName.trim().slice(0, 80)
      }

      this.touch(now)
      this.appendEvent('role_claimed', `${roleName} role claimed.`, now)
      this.advanceClaimPhase(now)
    }

    const state = this.buildRoleState(auth.role)

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

    role.submissionBaseline = {
      gold: role.gold,
      inventory: cloneJson(role.inventory),
    }
    role.gold = validation.goldRemaining
    role.inventory = validation.inventory
    role.controls = validation.controls
    role.submission = cloneJson(submission as RoundPlanSubmission)
    role.submittedAt = now

    this.touch(now)
    this.appendChatMessages(role, (submission as RoundPlanSubmission).chat ?? [], now)
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

  async submitChatMessage(
    roleToken: string,
    request: unknown,
  ): Promise<SessionResult<AgentChatMessageResponse>> {
    const now = this.clock()
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const role = await this.findRoleByToken(roleToken)
    const rateLimitError = this.takeRateLimit('chat', role?.role ?? 'invalid', now)

    if (rateLimitError) {
      return rateLimitError
    }

    if (!role) {
      return relayError('INVALID_TOKEN', 'Role bearer token is missing or invalid.')
    }

    const validation = validateAgentChatMessageRequestShape(request)

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
        state: this.buildRoleState(role),
        publicState: this.getPublicState(),
      },
    }
  }

  async submitRefereeAwards(
    refereeToken: string,
    request: unknown,
  ): Promise<SessionResult<RefereeAwardsResponse>> {
    const now = this.clock()
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const hasRefereeToken = await this.hasRefereeToken(refereeToken)
    const rateLimitError = this.takeRateLimit(
      'referee_awards',
      hasRefereeToken ? 'referee' : 'invalid',
      now,
    )

    if (rateLimitError) {
      return rateLimitError
    }

    if (!hasRefereeToken) {
      return relayError('INVALID_TOKEN', 'Referee capability token is missing or invalid.')
    }

    if (this.state.phase !== 'referee_awards') {
      return relayError(
        'PHASE_CLOSED',
        `Referee awards are only accepted during referee_awards; current phase is ${this.state.phase}.`,
      )
    }

    if (!this.state.lastResult) {
      return relayError('INVALID_REQUEST', 'Combat result is required before awards can be applied.')
    }

    const validation = validateSubmitRefereeAwardsRequestShape(
      request,
      this.state.awardOptions,
    )

    if (!validation.ok) {
      return relayError('SUBMISSION_INVALID', 'Referee awards failed validation.', validation.issues)
    }

    const selections = cloneJson((request as SubmitRefereeAwardsRequest).awards)
    const appliedAwards = this.applyAwardsAndAdvance(selections, now)

    return {
      ok: true,
      value: {
        appliedAwards,
        publicState: this.getPublicState(),
      },
    }
  }

  async resetRole(
    refereeToken: string,
    request: unknown,
  ): Promise<SessionResult<RoleResetResponse>> {
    const now = this.clock()
    const activeError = this.requireActive(now)

    if (activeError) {
      return activeError
    }

    const hasRefereeToken = await this.hasRefereeToken(refereeToken)
    const rateLimitError = this.takeRateLimit(
      'reset_role',
      hasRefereeToken ? 'referee' : 'invalid',
      now,
    )

    if (rateLimitError) {
      return rateLimitError
    }

    if (!hasRefereeToken) {
      return relayError('INVALID_TOKEN', 'Referee capability token is missing or invalid.')
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
    const role = this.state.roles[roleName]

    if (role.submittedAt) {
      if (!role.submissionBaseline) {
        return relayError(
          'INVALID_REQUEST',
          `${role.role} cannot be reset because its accepted submission cannot be rolled back.`,
        )
      }

      role.gold = role.submissionBaseline.gold
      role.inventory = cloneJson(role.submissionBaseline.inventory)
    }

    const claimToken = this.tokenFactory(roleName, 'claim')

    role.claimTokenHash = await this.tokenHasher(claimToken)
    role.roleTokenHash = undefined
    role.agentName = undefined
    role.claimedAt = undefined
    role.submittedAt = undefined
    role.controls = undefined
    role.submission = undefined
    role.submissionBaseline = undefined

    this.touch(now)
    this.appendEvent('role_reset', `${roleName} role reset by referee.`, now)

    if (this.state.phase === 'submission_phase') {
      this.changePhase('waiting_for_agents', `${roleName} role needs a fresh claim.`, now)
    }

    return {
      ok: true,
      value: {
        invite: {
          role: roleName,
          claimToken,
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

  private buildRoleState(role: StoredRoleState): RolePrivateState {
    const opponent = role.role === 'red' ? this.state.roles.blue : this.state.roles.red

    return cloneJson({
      sessionId: this.state.id,
      stateVersion: this.stateVersion(),
      role: role.role,
      phase: this.state.phase,
      round: this.state.round,
      expiresAt: this.state.expiresAt,
      gold: role.gold,
      wins: role.wins,
      losses: role.losses,
      winStreak: role.winStreak,
      inventory: role.inventory,
      ...(role.controls ? { controls: role.controls } : {}),
      submitted: Boolean(role.submittedAt),
      ...(role.submission ? { ownSubmission: role.submission } : {}),
      opponent: rolePublicState(opponent),
      replayAvailable: Boolean(this.state.replay),
      ...(this.state.awardOptions.length > 0 ? { awardOptions: this.state.awardOptions } : {}),
      ...(this.state.awardHistory.length > 0 ? { awardHistory: this.state.awardHistory } : {}),
      ...(this.state.lastResult ? { lastResult: this.state.lastResult } : {}),
      chatLog: this.state.chatLog,
      eventLog: this.state.eventLog,
    })
  }

  private async findRoleByToken(roleToken: string): Promise<StoredRoleState | undefined> {
    const auth = await this.findAnyRoleBearer(roleToken)

    return auth?.role
  }

  private async findAnyRoleBearer(roleToken: string): Promise<RoleBearerAuth | undefined> {
    if (!roleToken.trim()) {
      return undefined
    }

    const roleTokenHash = await this.tokenHasher(roleToken)

    for (const roleName of TEAM_ROLES) {
      const role = this.state.roles[roleName]
      const auth = this.matchRoleBearer(role, roleTokenHash, {
        allowUnclaimedClaimKey: false,
      })

      if (auth) {
        return auth
      }
    }

    return undefined
  }

  private async findRoleBearer(
    roleName: TeamRole,
    token: string,
    options: { allowUnclaimedClaimKey: boolean },
  ): Promise<RoleBearerAuth | undefined> {
    if (!token.trim()) {
      return undefined
    }

    const tokenHash = await this.tokenHasher(token)

    return this.matchRoleBearer(this.state.roles[roleName], tokenHash, options)
  }

  private matchRoleBearer(
    role: StoredRoleState,
    tokenHash: string,
    options: { allowUnclaimedClaimKey: boolean },
  ): RoleBearerAuth | undefined {
    if (role.roleTokenHash === tokenHash) {
      return { role }
    }

    if ((role.claimedAt || options.allowUnclaimedClaimKey) && role.claimTokenHash === tokenHash) {
      return { role }
    }

    return undefined
  }

  private async hasRefereeToken(refereeToken: string): Promise<boolean> {
    if (!refereeToken.trim() || !this.state.refereeTokenHash) {
      return false
    }

    return (await this.tokenHasher(refereeToken)) === this.state.refereeTokenHash
  }

  private applyAwardsAndAdvance(
    selections: SubmitRefereeAwardsRequest['awards'],
    now: string,
  ): AppliedRefereeAward[] {
    const optionById = new Map(this.state.awardOptions.map((option) => [option.id, option]))
    const appliedAwards = selections.map((selection) => {
      const option = optionById.get(selection.awardId)!

      return {
        awardId: selection.awardId,
        targetTeam: selection.targetTeam,
        round: this.state.round,
        title: option.title,
        gold: option.gold,
      }
    })

    this.state.awardHistory.push(...appliedAwards)
    this.appendEvent(
      'referee_awards_submitted',
      `${appliedAwards.length} referee award${appliedAwards.length === 1 ? '' : 's'} accepted.`,
      now,
    )
    this.changePhase('apply_awards', 'Referee awards accepted.', now)
    this.applyCombatResultToScore()

    if (this.shouldCompleteMatch()) {
      this.completeMatch(now)

      return appliedAwards
    }

    this.advanceToNextRound(appliedAwards, now)

    return appliedAwards
  }

  private applyCombatResultToScore(): void {
    const result = this.state.lastResult

    if (!result) {
      return
    }

    if (result.winner === 'draw') {
      for (const role of TEAM_ROLES) {
        this.state.roles[role].winStreak = 0
      }

      return
    }

    const winner = this.state.roles[result.winner]
    const loserRole = result.winner === 'red' ? 'blue' : 'red'
    const loser = this.state.roles[loserRole]

    winner.wins += 1
    winner.winStreak += 1
    loser.losses += 1
    loser.winStreak = 0
  }

  private shouldCompleteMatch(): boolean {
    return (
      TEAM_ROLES.some(
        (role) => this.state.roles[role].winStreak >= DEFAULT_WIN_STREAK_TARGET,
      ) || this.state.round >= this.state.maxRounds
    )
  }

  private completeMatch(now: string): void {
    const red = this.state.roles.red
    const blue = this.state.roles.blue
    const winner =
      red.wins === blue.wins ? 'draw' : red.wins > blue.wins ? 'red' : 'blue'
    const streakWinner = TEAM_ROLES.find(
      (role) => this.state.roles[role].winStreak >= DEFAULT_WIN_STREAK_TARGET,
    )
    const finalWinner = streakWinner ?? winner
    const reason = streakWinner
      ? `${streakWinner} reached a ${DEFAULT_WIN_STREAK_TARGET}-win streak.`
      : `Max rounds reached with score Red ${red.wins} - Blue ${blue.wins}.`

    this.state.awardOptions = []
    this.appendEvent('session_completed', reason, now)
    this.changePhase('session_complete', `Session complete: ${finalWinner}.`, now)
  }

  private advanceToNextRound(appliedAwards: AppliedRefereeAward[], now: string): void {
    const awardGold = TEAM_ROLES.reduce<Record<TeamRole, number>>(
      (totals, role) => {
        totals[role] = appliedAwards
          .filter((award) => award.targetTeam === role)
          .reduce((total, award) => total + award.gold, 0)

        return totals
      },
      { red: 0, blue: 0 },
    )

    for (const role of TEAM_ROLES) {
      const team = this.state.roles[role]
      const interest = calculateInterest(team.gold)

      team.gold += DEFAULT_BASE_INCOME + interest + awardGold[role]
      team.controls = undefined
      team.submission = undefined
      team.submittedAt = undefined
      team.submissionBaseline = undefined
    }

    this.state.round += 1
    this.state.replay = undefined
    this.state.awardOptions = []
    this.appendEvent('economy_applied', `Round ${this.state.round} economy applied.`, now)
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

    this.state.replay = {
      ...result.replay,
      botBlueprints: {
        red: cloneJson(red.submission.blueprint),
        blue: cloneJson(blue.submission.blueprint),
      },
    }
    this.state.lastResult = combatSummary(result)
    this.state.awardOptions = generateRefereeAwardOptions(
      `${this.state.id}:${this.state.seed}`,
      this.state.round,
    )
    this.appendEvent('combat_resolved', result.reason, now)
    this.changePhase('combat_resolved', 'Combat result recorded.', now)
    this.changePhase('replay_phase', 'Replay timeline is available.', now)
    this.changePhase('referee_awards', 'Referee award options are ready.', now)
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

  private appendChatMessages(
    role: StoredRoleState,
    requests: AgentChatMessagePostRequest[],
    at: string,
  ): SessionChatMessage[] {
    const messages = requests.map((request, index) => {
      const message = safeText(request.message)!

      return {
        id: `${this.state.id}:chat:${this.state.chatLog.length + index + 1}`,
        at,
        round: this.state.round,
        phase: this.state.phase,
        role: role.role,
        ...(role.agentName ? { agentName: role.agentName } : {}),
        kind: request.kind ?? 'observation',
        message,
      }
    })

    this.state.chatLog.push(...messages)

    return cloneJson(messages)
  }

  private touch(at = this.clock()): void {
    this.state.updatedAt = at
  }

  private stateVersion(): string {
    return [
      this.state.updatedAt,
      this.state.phase,
      this.state.round,
      this.state.roles.red.submittedAt ? 'red-submitted' : 'red-open',
      this.state.roles.blue.submittedAt ? 'blue-submitted' : 'blue-open',
      this.state.eventLog.length,
      this.state.chatLog.length,
    ].join('|')
  }
}
