import {
  TEAM_LOGO_MARKS,
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

const MAX_TEAM_IDENTITY_NAME_LENGTH = 40
const TEAM_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const TEAM_LOGO_INITIALS_PATTERN = /^[A-Za-z0-9]{1,4}$/

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

  if ('teamIdentity' in value) {
    issues.push(...validateTeamIdentityShape(value.teamIdentity, 'claim.teamIdentity'))
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

  if ('teamIdentity' in value) {
    issues.push(...validateTeamIdentityShape(value.teamIdentity, 'bootstrap.teamIdentity'))
  }

  return result(issues)
}

function validateTeamIdentityShape(value: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return [issue('INVALID_TEAM_IDENTITY', path, 'Expected teamIdentity object.')]
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    issues.push(issue('INVALID_TEAM_NAME', `${path}.name`, 'Team name is required.'))
  } else if (value.name.length > MAX_TEAM_IDENTITY_NAME_LENGTH) {
    issues.push(
      issue(
        'TEAM_NAME_TOO_LONG',
        `${path}.name`,
        `Team name max length is ${MAX_TEAM_IDENTITY_NAME_LENGTH}.`,
      ),
    )
  }

  if (typeof value.primaryColor !== 'string' || !TEAM_COLOR_PATTERN.test(value.primaryColor.trim())) {
    issues.push(
      issue(
        'INVALID_TEAM_COLOR',
        `${path}.primaryColor`,
        'Team primaryColor must be a #RRGGBB hex color.',
      ),
    )
  }

  if ('logo' in value) {
    if (!isRecord(value.logo)) {
      issues.push(issue('INVALID_TEAM_LOGO', `${path}.logo`, 'Logo must be an object.'))
    } else {
      const logo = value.logo

      if (!TEAM_LOGO_MARKS.includes(logo.mark as never)) {
        issues.push(
          issue(
            'INVALID_TEAM_LOGO_MARK',
            `${path}.logo.mark`,
            `Logo mark must be one of ${TEAM_LOGO_MARKS.join(', ')}.`,
          ),
        )
      }

      if (
        'initials' in logo &&
        (typeof logo.initials !== 'string' || !TEAM_LOGO_INITIALS_PATTERN.test(logo.initials.trim()))
      ) {
        issues.push(
          issue(
            'INVALID_TEAM_LOGO_INITIALS',
            `${path}.logo.initials`,
            'Logo initials must be 1-4 letters or numbers.',
          ),
        )
      }
    }
  }

  return issues
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

  if ('topology' in value && value.topology !== undefined) {
    issues.push(...validateArenaTopologyShape(value.topology, `${path}.topology`))
  }

  return issues
}

function validateArenaTopologyShape(value: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return [issue('INVALID_ARENA_TOPOLOGY', path, 'Expected arena topology object.')]
  }

  if (!isRecord(value.grid) || !isPositiveFiniteNumber(value.grid.cellSize)) {
    issues.push(issue('INVALID_ARENA_GRID', `${path}.grid.cellSize`, 'Grid cellSize must be a positive number.'))
  }

  for (const key of ['spawnZones', 'hazards', 'terrain', 'obstacles'] as const) {
    if (!Array.isArray(value[key])) {
      issues.push(issue('INVALID_ARENA_TOPOLOGY', `${path}.${key}`, 'Expected array.'))
    }
  }

  if (Array.isArray(value.spawnZones)) {
    value.spawnZones.forEach((spawnZone, index) => {
      const entryPath = `${path}.spawnZones.${index}`

      if (!isRecord(spawnZone)) {
        issues.push(issue('INVALID_ARENA_SPAWN_ZONE', entryPath, 'Expected spawn zone object.'))
        return
      }

      if (!TEAM_ROLES.includes(spawnZone.role as never)) {
        issues.push(issue('INVALID_ARENA_SPAWN_ZONE', `${entryPath}.role`, 'Spawn zone role must be red or blue.'))
      }
      issues.push(...validateArenaZoneShape(spawnZone.shape, `${entryPath}.shape`))
    })
  }

  if (Array.isArray(value.hazards)) {
    value.hazards.forEach((hazard, index) => {
      const entryPath = `${path}.hazards.${index}`

      if (!isRecord(hazard)) {
        issues.push(issue('INVALID_ARENA_HAZARD', entryPath, 'Expected hazard object.'))
        return
      }

      validateTopologyText(issues, hazard.id, `${entryPath}.id`, 'Hazard id')
      validateTopologyText(issues, hazard.type, `${entryPath}.type`, 'Hazard type')
      if (typeof hazard.damage !== 'number' || !Number.isFinite(hazard.damage) || hazard.damage < 0) {
        issues.push(issue('INVALID_ARENA_HAZARD_DAMAGE', `${entryPath}.damage`, 'Hazard damage must be a non-negative number.'))
      }
      issues.push(...validateArenaZoneShape(hazard.shape, `${entryPath}.shape`))
    })
  }

  if (Array.isArray(value.terrain)) {
    value.terrain.forEach((terrain, index) => {
      const entryPath = `${path}.terrain.${index}`

      if (!isRecord(terrain)) {
        issues.push(issue('INVALID_ARENA_TERRAIN', entryPath, 'Expected terrain object.'))
        return
      }

      validateTopologyText(issues, terrain.id, `${entryPath}.id`, 'Terrain id')
      validateTopologyText(issues, terrain.type, `${entryPath}.type`, 'Terrain type')
      issues.push(...validateArenaZoneShape(terrain.shape, `${entryPath}.shape`))
    })
  }

  if (Array.isArray(value.obstacles)) {
    value.obstacles.forEach((obstacle, index) => {
      const entryPath = `${path}.obstacles.${index}`

      if (!isRecord(obstacle)) {
        issues.push(issue('INVALID_ARENA_OBSTACLE', entryPath, 'Expected obstacle object.'))
        return
      }

      validateTopologyText(issues, obstacle.id, `${entryPath}.id`, 'Obstacle id')
      validateTopologyText(issues, obstacle.type, `${entryPath}.type`, 'Obstacle type')
      if (typeof obstacle.blocksMovement !== 'boolean') {
        issues.push(issue('INVALID_ARENA_OBSTACLE', `${entryPath}.blocksMovement`, 'blocksMovement must be boolean.'))
      }
      issues.push(...validateArenaZoneShape(obstacle.shape, `${entryPath}.shape`))
    })
  }

  return issues
}

function validateArenaZoneShape(value: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return [issue('INVALID_ARENA_SHAPE', path, 'Expected shape object.')]
  }

  if (!isVector2(value.center)) {
    issues.push(issue('INVALID_ARENA_SHAPE', `${path}.center`, 'Shape center must be [x, z].'))
  }

  if (value.kind === 'circle') {
    if (!isPositiveFiniteNumber(value.radius)) {
      issues.push(issue('INVALID_ARENA_SHAPE', `${path}.radius`, 'Circle radius must be a positive number.'))
    }
    return issues
  }

  if (value.kind === 'rect') {
    if (!isVector2(value.size) || value.size.some((entry) => entry <= 0)) {
      issues.push(issue('INVALID_ARENA_SHAPE', `${path}.size`, 'Rect size must be [width, height] with positive numbers.'))
    }
    return issues
  }

  issues.push(issue('INVALID_ARENA_SHAPE', `${path}.kind`, 'Shape kind must be circle or rect.'))
  return issues
}

function validateTopologyText(
  issues: ValidationIssue[],
  value: unknown,
  path: string,
  label: string,
): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(issue('INVALID_ARENA_TOPOLOGY_TEXT', path, `${label} must be non-empty text.`))
  }
}

function isVector2(value: unknown): value is [number, number] {
  return Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
