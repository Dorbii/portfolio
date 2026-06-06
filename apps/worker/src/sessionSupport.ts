import {
  TEAM_ROLES,
  type AgentNextAction,
  type ArenaConfig,
  type CombatSummary,
  type RelayErrorResponse,
  type RolePrivateState,
  type RolePublicState,
} from '../../../packages/schemas/src/index.js'
import type { CombatResult } from '../../../packages/sim/src/index.js'
import type {
  RateLimitAction,
  RateLimitRule,
  StoredRoleState,
  TokenKind,
  TokenOwner,
} from './sessionTypes.js'

export const DEFAULT_ARENA: ArenaConfig = {
  name: 'Compact Box',
  width: 24,
  height: 16,
  activeHazards: ['floor_saw'],
}

export const DEFAULT_MAX_ROUNDS = 7
export const DEFAULT_STARTING_GOLD = 100
export const DEFAULT_BASE_INCOME = 50
export const DEFAULT_WIN_STREAK_TARGET = 3

const MAX_ROUNDS_LIMIT = 25
const DEFAULT_SESSION_TTL_MS = 6 * 60 * 60 * 1000
const MIN_SESSION_TTL_MS = 60 * 1000
const MAX_SESSION_TTL_MS = 24 * 60 * 60 * 1000

const DEFAULT_RATE_LIMITS: Record<RateLimitAction, RateLimitRule> = {
  claim: { windowMs: 60 * 1000, max: 20 },
  state: { windowMs: 60 * 1000, max: 120 },
  submit: { windowMs: 60 * 1000, max: 20 },
  turn: { windowMs: 60 * 1000, max: 120 },
  chat: { windowMs: 60 * 1000, max: 30 },
  private_chat: { windowMs: 60 * 1000, max: 30 },
  advance_round: { windowMs: 60 * 1000, max: 20 },
  reset_role: { windowMs: 60 * 1000, max: 20 },
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function defaultClock(): string {
  return new Date().toISOString()
}

export async function defaultTokenHasher(token: string): Promise<string> {
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

export function defaultTokenFactory(owner: TokenOwner, kind: TokenKind): string {
  if (kind === 'referee') {
    return `cap_ref_${randomTokenPart()}`
  }

  const prefix = kind === 'claim' ? 'cap' : 'role'

  return `${prefix}_${owner}_${randomTokenPart()}`
}

export function createSessionId(): string {
  return `s_${randomTokenPart().slice(0, 12)}`
}

export function relayError(
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

export function isTeamRole(value: unknown): value is (typeof TEAM_ROLES)[number] {
  return typeof value === 'string' && TEAM_ROLES.includes(value as (typeof TEAM_ROLES)[number])
}

export function isArenaConfig(value: unknown): value is ArenaConfig {
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

export function safeText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function safeMaxRounds(value: unknown): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_ROUNDS_LIMIT
    ? value
    : DEFAULT_MAX_ROUNDS
}

export function safeTtlMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SESSION_TTL_MS
  }

  const ttlMs = Math.floor(value * 1000)

  if (ttlMs < MIN_SESSION_TTL_MS || ttlMs > MAX_SESSION_TTL_MS) {
    return DEFAULT_SESSION_TTL_MS
  }

  return ttlMs
}

export function addMilliseconds(value: string, ms: number): string {
  return new Date(Date.parse(value) + ms).toISOString()
}

export function mergeRateLimits(
  overrides?: Partial<Record<RateLimitAction, RateLimitRule>>,
): Record<RateLimitAction, RateLimitRule> {
  return {
    claim: overrides?.claim ?? DEFAULT_RATE_LIMITS.claim,
    state: overrides?.state ?? DEFAULT_RATE_LIMITS.state,
    submit: overrides?.submit ?? DEFAULT_RATE_LIMITS.submit,
    turn: overrides?.turn ?? DEFAULT_RATE_LIMITS.turn,
    chat: overrides?.chat ?? DEFAULT_RATE_LIMITS.chat,
    private_chat: overrides?.private_chat ?? DEFAULT_RATE_LIMITS.private_chat,
    advance_round: overrides?.advance_round ?? DEFAULT_RATE_LIMITS.advance_round,
    reset_role: overrides?.reset_role ?? DEFAULT_RATE_LIMITS.reset_role,
  }
}

export function rolePublicState(role: StoredRoleState): RolePublicState {
  return {
    role: role.role,
    claimed: Boolean(role.claimedAt),
    submitted: Boolean(role.submittedAt),
    wins: role.wins,
    losses: role.losses,
    winStreak: role.winStreak,
  }
}

export function combatSummary(result: CombatResult): CombatSummary {
  return {
    winner: result.winner,
    reason: result.reason,
    damage: result.damage,
    remainingHealth: result.remainingHealth,
  }
}

export function nextActionForRole(state: RolePrivateState): AgentNextAction {
  if (state.phase === 'expired' || state.phase === 'session_complete') {
    return 'stop'
  }

  if (state.phase === 'waiting_for_agents') {
    return 'wait_for_opponent_claim'
  }

  if (state.phase === 'submission_phase') {
    return state.submitted ? 'wait_for_opponent_submission' : 'submit_round_plan'
  }

  if (state.phase === 'combat_turn') {
    return state.combat?.submitted[state.role] ? 'wait_for_opponent_turn' : 'submit_turn_command'
  }

  if (state.phase === 'round_review') {
    return 'wait_for_referee'
  }

  return 'wait_for_next_round'
}
