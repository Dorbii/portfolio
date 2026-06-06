import {
  TEAM_ROLES,
  type ArenaConfig,
  type ValidationIssue,
  type ValidationResult,
} from '../types.js'
import {
  MAX_CREATE_SESSION_ARENA_NAME_LENGTH,
  MAX_CREATE_SESSION_ARENA_SIZE,
  MAX_CREATE_SESSION_HAZARDS,
  MAX_CREATE_SESSION_HAZARD_LENGTH,
  MAX_CREATE_SESSION_ROUNDS,
  MAX_CREATE_SESSION_SEED_LENGTH,
  MAX_CREATE_SESSION_TTL_SECONDS,
  MAX_ROLE_CLAIM_AGENT_NAME_LENGTH,
  MAX_ROLE_CLAIM_TOKEN_LENGTH,
  MIN_CREATE_SESSION_ROUNDS,
  MIN_CREATE_SESSION_TTL_SECONDS,
  SESSION_ID_PATTERN,
  isRecord,
  issue,
  result,
} from './common.js'

export function validateCreateSessionRequestShape(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_CREATE_SESSION', 'session', 'Expected create session object.')],
    }
  }

  if ('sessionId' in value) {
    if (typeof value.sessionId !== 'string' || value.sessionId.trim().length === 0) {
      issues.push(issue('INVALID_SESSION_ID', 'sessionId', 'Session id must be text.'))
    } else if (!SESSION_ID_PATTERN.test(value.sessionId.trim())) {
      issues.push(
        issue(
          'INVALID_SESSION_ID',
          'sessionId',
          'Session id must start with s_ and use letters, numbers, underscores, or hyphens.',
        ),
      )
    }
  }

  if ('seed' in value) {
    if (typeof value.seed !== 'string' || value.seed.trim().length === 0) {
      issues.push(issue('INVALID_SEED', 'seed', 'Seed must be non-empty text.'))
    } else if (value.seed.length > MAX_CREATE_SESSION_SEED_LENGTH) {
      issues.push(
        issue(
          'SEED_TOO_LONG',
          'seed',
          `Seed max length is ${MAX_CREATE_SESSION_SEED_LENGTH}.`,
        ),
      )
    }
  }

  if ('maxRounds' in value) {
    const maxRounds = value.maxRounds

    if (
      typeof maxRounds !== 'number' ||
      !Number.isInteger(maxRounds) ||
      maxRounds < MIN_CREATE_SESSION_ROUNDS ||
      maxRounds > MAX_CREATE_SESSION_ROUNDS
    ) {
      issues.push(
        issue(
          'INVALID_MAX_ROUNDS',
          'maxRounds',
          `Max rounds must be an integer from ${MIN_CREATE_SESSION_ROUNDS} through ${MAX_CREATE_SESSION_ROUNDS}.`,
        ),
      )
    }
  }

  if ('ttlSeconds' in value) {
    const ttlSeconds = value.ttlSeconds

    if (
      typeof ttlSeconds !== 'number' ||
      !Number.isFinite(ttlSeconds) ||
      ttlSeconds < MIN_CREATE_SESSION_TTL_SECONDS ||
      ttlSeconds > MAX_CREATE_SESSION_TTL_SECONDS
    ) {
      issues.push(
        issue(
          'INVALID_TTL',
          'ttlSeconds',
          `TTL must be between ${MIN_CREATE_SESSION_TTL_SECONDS} and ${MAX_CREATE_SESSION_TTL_SECONDS} seconds.`,
        ),
      )
    }
  }

  if ('arena' in value) {
    issues.push(...validateArenaConfigShape(value.arena, 'arena'))
  }

  return result(issues)
}

export function validateRoleClaimRequestShape(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_CLAIM_REQUEST', 'claim', 'Expected role claim object.')],
    }
  }

  if (!TEAM_ROLES.includes(value.role as never)) {
    issues.push(issue('INVALID_ROLE', 'claim.role', 'Claim role must be red or blue.'))
  }

  if (typeof value.claimToken !== 'string' || value.claimToken.trim().length === 0) {
    issues.push(issue('INVALID_CLAIM_TOKEN', 'claim.claimToken', 'Claim token is required.'))
  } else if (value.claimToken.length > MAX_ROLE_CLAIM_TOKEN_LENGTH) {
    issues.push(
      issue(
        'CLAIM_TOKEN_TOO_LONG',
        'claim.claimToken',
        `Claim token max length is ${MAX_ROLE_CLAIM_TOKEN_LENGTH}.`,
      ),
    )
  }

  if ('agentName' in value && typeof value.agentName !== 'string') {
    issues.push(issue('INVALID_AGENT_NAME', 'claim.agentName', 'Agent name must be text.'))
  } else if (
    typeof value.agentName === 'string' &&
    value.agentName.length > MAX_ROLE_CLAIM_AGENT_NAME_LENGTH
  ) {
    issues.push(
      issue(
        'AGENT_NAME_TOO_LONG',
        'claim.agentName',
        `Agent name max length is ${MAX_ROLE_CLAIM_AGENT_NAME_LENGTH}.`,
      ),
    )
  }

  return result(issues)
}

export function validateAgentBootstrapRequestShape(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_BOOTSTRAP_REQUEST', 'bootstrap', 'Expected bootstrap object.')],
    }
  }

  if ('agentName' in value && typeof value.agentName !== 'string') {
    issues.push(issue('INVALID_AGENT_NAME', 'bootstrap.agentName', 'Agent name must be text.'))
  } else if (
    typeof value.agentName === 'string' &&
    value.agentName.length > MAX_ROLE_CLAIM_AGENT_NAME_LENGTH
  ) {
    issues.push(
      issue(
        'AGENT_NAME_TOO_LONG',
        'bootstrap.agentName',
        `Agent name max length is ${MAX_ROLE_CLAIM_AGENT_NAME_LENGTH}.`,
      ),
    )
  }

  return result(issues)
}

export function validateRoleResetRequestShape(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_RESET_REQUEST', 'reset', 'Expected role reset object.')],
    }
  }

  if (!TEAM_ROLES.includes(value.role as never)) {
    issues.push(issue('INVALID_ROLE', 'reset.role', 'Reset role must be red or blue.'))
  }

  return result(issues)
}

function validateArenaConfigShape(value: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return [issue('INVALID_ARENA', path, 'Expected arena object.')]
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    issues.push(issue('INVALID_ARENA_NAME', `${path}.name`, 'Arena name is required.'))
  } else if (value.name.length > MAX_CREATE_SESSION_ARENA_NAME_LENGTH) {
    issues.push(
      issue(
        'ARENA_NAME_TOO_LONG',
        `${path}.name`,
        `Arena name max length is ${MAX_CREATE_SESSION_ARENA_NAME_LENGTH}.`,
      ),
    )
  }

  for (const dimension of ['width', 'height'] satisfies Array<keyof ArenaConfig>) {
    const dimensionPath = `${path}.${dimension}`
    const dimensionValue = value[dimension]

    if (
      typeof dimensionValue !== 'number' ||
      !Number.isInteger(dimensionValue) ||
      dimensionValue < 1 ||
      dimensionValue > MAX_CREATE_SESSION_ARENA_SIZE
    ) {
      issues.push(
        issue(
          'INVALID_ARENA_SIZE',
          dimensionPath,
          `Arena ${dimension} must be an integer from 1 through ${MAX_CREATE_SESSION_ARENA_SIZE}.`,
        ),
      )
    }
  }

  if (!Array.isArray(value.activeHazards)) {
    issues.push(issue('INVALID_ARENA_HAZARDS', `${path}.activeHazards`, 'Expected hazard array.'))
  } else {
    if (value.activeHazards.length > MAX_CREATE_SESSION_HAZARDS) {
      issues.push(
        issue(
          'TOO_MANY_ARENA_HAZARDS',
          `${path}.activeHazards`,
          `Arena supports at most ${MAX_CREATE_SESSION_HAZARDS} active hazards.`,
        ),
      )
    }

    value.activeHazards.forEach((hazard, index) => {
      if (typeof hazard !== 'string' || hazard.trim().length === 0) {
        issues.push(
          issue('INVALID_ARENA_HAZARD', `${path}.activeHazards.${index}`, 'Hazard must be text.'),
        )
      } else if (hazard.length > MAX_CREATE_SESSION_HAZARD_LENGTH) {
        issues.push(
          issue(
            'ARENA_HAZARD_TOO_LONG',
            `${path}.activeHazards.${index}`,
            `Hazard max length is ${MAX_CREATE_SESSION_HAZARD_LENGTH}.`,
          ),
        )
      }
    })
  }

  return issues
}
