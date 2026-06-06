import type { ValidationIssue, ValidationResult, Vector3 } from '../types.js'

export const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/
export const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/
export const MAX_BLUEPRINT_BYTES = 20_000
export const MAX_CREATE_SESSION_SEED_LENGTH = 128
export const MAX_CREATE_SESSION_ARENA_NAME_LENGTH = 80
export const MAX_CREATE_SESSION_ARENA_SIZE = 200
export const MAX_CREATE_SESSION_HAZARDS = 12
export const MAX_CREATE_SESSION_HAZARD_LENGTH = 64
export const MAX_ROLE_CLAIM_TOKEN_LENGTH = 256
export const MAX_ROLE_CLAIM_AGENT_NAME_LENGTH = 80
export const MAX_AGENT_CHAT_MESSAGE_LENGTH = 420
export const MAX_AGENT_CHAT_MESSAGES_PER_SUBMISSION = 3
export const MIN_CREATE_SESSION_TTL_SECONDS = 60
export const MAX_CREATE_SESSION_TTL_SECONDS = 24 * 60 * 60
export const MIN_CREATE_SESSION_ROUNDS = 1
export const MAX_CREATE_SESSION_ROUNDS = 25

export function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message }
}

export function result(issues: ValidationIssue[]): ValidationResult {
  return issues.length === 0 ? { ok: true } : { ok: false, issues }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isVector3(value: unknown): value is Vector3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  )
}
