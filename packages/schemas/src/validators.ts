import {
  MAX_REFEREE_AWARDS_PER_ROUND,
  MAX_REFEREE_AWARDS_PER_TEAM_PER_ROUND,
  MOVEMENT_COMMANDS,
  TEAM_ROLES,
  UTILITY_COMMANDS,
  WEAPON_COMMANDS,
  type ArenaConfig,
  type RefereeAwardOption,
  type RefereeAwardSelection,
  type BotBlueprint,
  type GeneratedControls,
  type RoundPlanSubmission,
  type TurnPlan,
  type ValidationIssue,
  type ValidationResult,
  type Vector3,
} from './types.js'

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/
const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/
const MAX_BLUEPRINT_BYTES = 20_000
const MAX_CREATE_SESSION_SEED_LENGTH = 128
const MAX_CREATE_SESSION_ARENA_NAME_LENGTH = 80
const MAX_CREATE_SESSION_ARENA_SIZE = 200
const MAX_CREATE_SESSION_HAZARDS = 12
const MAX_CREATE_SESSION_HAZARD_LENGTH = 64
const MAX_ROLE_CLAIM_TOKEN_LENGTH = 256
const MAX_ROLE_CLAIM_AGENT_NAME_LENGTH = 80
const MIN_CREATE_SESSION_TTL_SECONDS = 60
const MAX_CREATE_SESSION_TTL_SECONDS = 24 * 60 * 60
const MIN_CREATE_SESSION_ROUNDS = 1
const MAX_CREATE_SESSION_ROUNDS = 25

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message }
}

function result(issues: ValidationIssue[]): ValidationResult {
  return issues.length === 0 ? { ok: true } : { ok: false, issues }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isVector3(value: unknown): value is Vector3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  )
}

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

function validateGridPosition(
  value: unknown,
  path: string,
  coordinateLimit: number,
): ValidationIssue[] {
  if (!isVector3(value)) {
    return [issue('INVALID_VECTOR', path, 'Expected [x, y, z] numeric tuple.')]
  }

  return value.flatMap((entry, index) => {
    if (!Number.isInteger(entry)) {
      return [
        issue(
          'NON_GRID_COORDINATE',
          `${path}.${index}`,
          'Blueprint positions must use integer grid coordinates.',
        ),
      ]
    }

    if (Math.abs(entry) > coordinateLimit) {
      return [
        issue(
          'COORDINATE_OUT_OF_RANGE',
          `${path}.${index}`,
          `Coordinate must stay within +/-${coordinateLimit}.`,
        ),
      ]
    }

    return []
  })
}

function validateRotation(value: unknown, path: string): ValidationIssue[] {
  if (!isVector3(value)) {
    return [issue('INVALID_VECTOR', path, 'Expected [x, y, z] numeric tuple.')]
  }

  return value.flatMap((entry, index) => {
    if (!Number.isInteger(entry) || entry % 90 !== 0) {
      return [
        issue(
          'INVALID_ROTATION',
          `${path}.${index}`,
          'Rotations must be integer 90-degree increments.',
        ),
      ]
    }

    if (Math.abs(entry) > 360) {
      return [
        issue(
          'ROTATION_OUT_OF_RANGE',
          `${path}.${index}`,
          'Rotation values must stay within +/-360 degrees.',
        ),
      ]
    }

    return []
  })
}

export function validatePurchaseShape(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!Array.isArray(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_PURCHASES', 'purchases', 'Expected purchases array.')],
    }
  }

  value.forEach((purchase, index) => {
    const path = `purchases.${index}`

    if (!isRecord(purchase)) {
      issues.push(issue('INVALID_PURCHASE', path, 'Expected purchase object.'))
      return
    }

    if (typeof purchase.partId !== 'string' || purchase.partId.length === 0) {
      issues.push(issue('INVALID_PART_ID', `${path}.partId`, 'Expected part ID.'))
    }

    const quantity = purchase.quantity

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      issues.push(
        issue(
          'INVALID_QUANTITY',
          `${path}.quantity`,
          'Quantity must be a positive integer.',
        ),
      )
    }
  })

  return result(issues)
}

export function validateBlueprintShape(
  value: unknown,
  options: { coordinateLimit?: number; maxBlocks?: number } = {},
): ValidationResult {
  const coordinateLimit = options.coordinateLimit ?? 8
  const maxBlocks = options.maxBlocks ?? 48
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_BLUEPRINT', 'blueprint', 'Expected blueprint object.')],
    }
  }

  const payloadBytes = JSON.stringify(value).length

  if (payloadBytes > MAX_BLUEPRINT_BYTES) {
    issues.push(
      issue(
        'BLUEPRINT_TOO_LARGE',
        'blueprint',
        `Blueprint payload is ${payloadBytes} bytes; max is ${MAX_BLUEPRINT_BYTES}.`,
      ),
    )
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    issues.push(issue('INVALID_NAME', 'blueprint.name', 'Blueprint needs a name.'))
  } else if (value.name.length > 80) {
    issues.push(
      issue('NAME_TOO_LONG', 'blueprint.name', 'Blueprint name max length is 80.'),
    )
  }

  if (!Array.isArray(value.blocks)) {
    issues.push(
      issue('INVALID_BLOCKS', 'blueprint.blocks', 'Expected blocks array.'),
    )
    return result(issues)
  }

  if (value.blocks.length === 0) {
    issues.push(
      issue('EMPTY_BLUEPRINT', 'blueprint.blocks', 'Blueprint needs at least one block.'),
    )
  }

  if (value.blocks.length > maxBlocks) {
    issues.push(
      issue(
        'TOO_MANY_BLOCKS',
        'blueprint.blocks',
        `Blueprint has ${value.blocks.length} blocks; max is ${maxBlocks}.`,
      ),
    )
  }

  const blockIds = new Set<string>()

  value.blocks.forEach((block, index) => {
    const path = `blueprint.blocks.${index}`

    if (!isRecord(block)) {
      issues.push(issue('INVALID_BLOCK', path, 'Expected block object.'))
      return
    }

    if (typeof block.id !== 'string' || !ID_PATTERN.test(block.id)) {
      issues.push(
        issue(
          'INVALID_BLOCK_ID',
          `${path}.id`,
          'Block ID must be stable and identifier-like.',
        ),
      )
    } else if (blockIds.has(block.id)) {
      issues.push(
        issue('DUPLICATE_BLOCK_ID', `${path}.id`, `Duplicate block ID ${block.id}.`),
      )
    } else {
      blockIds.add(block.id)
    }

    if (typeof block.partId !== 'string' || block.partId.length === 0) {
      issues.push(issue('INVALID_PART_ID', `${path}.partId`, 'Expected part ID.'))
    }

    issues.push(
      ...validateGridPosition(block.position, `${path}.position`, coordinateLimit),
    )
    issues.push(...validateRotation(block.rotation, `${path}.rotation`))

    if ('label' in block && typeof block.label !== 'string') {
      issues.push(issue('INVALID_LABEL', `${path}.label`, 'Label must be a string.'))
    }
  })

  return result(issues)
}

export function validateTurnPlanShape(value: unknown, maxTicks = 5): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_TURN_PLAN', 'turnPlan', 'Expected turn plan object.')],
    }
  }

  if (!Array.isArray(value.commands)) {
    return {
      ok: false,
      issues: [
        issue('INVALID_COMMANDS', 'turnPlan.commands', 'Expected commands array.'),
      ],
    }
  }

  if (value.commands.length !== maxTicks) {
    issues.push(
      issue(
        'INVALID_TICK_COUNT',
        'turnPlan.commands',
        `Turn plan must include exactly ${maxTicks} command ticks.`,
      ),
    )
  }

  const ticks = new Set<number>()

  value.commands.forEach((command, index) => {
    const path = `turnPlan.commands.${index}`

    if (!isRecord(command)) {
      issues.push(issue('INVALID_COMMAND', path, 'Expected command object.'))
      return
    }

    const tick = command.tick

    if (typeof tick !== 'number' || !Number.isInteger(tick) || tick < 1 || tick > maxTicks) {
      issues.push(
        issue(
          'INVALID_TICK',
          `${path}.tick`,
          `Tick must be an integer from 1 through ${maxTicks}.`,
        ),
      )
    } else if (ticks.has(tick)) {
      issues.push(
        issue('DUPLICATE_TICK', `${path}.tick`, `Duplicate tick ${tick}.`),
      )
    } else {
      ticks.add(tick)
    }

    if (
      command.move !== undefined &&
      !MOVEMENT_COMMANDS.includes(command.move as never)
    ) {
      issues.push(issue('INVALID_MOVE', `${path}.move`, 'Unknown move command.'))
    }

    if (
      command.weaponA !== undefined &&
      !WEAPON_COMMANDS.includes(command.weaponA as never)
    ) {
      issues.push(
        issue('INVALID_WEAPON_A', `${path}.weaponA`, 'Unknown weaponA command.'),
      )
    }

    if (
      command.weaponB !== undefined &&
      !WEAPON_COMMANDS.includes(command.weaponB as never)
    ) {
      issues.push(
        issue('INVALID_WEAPON_B', `${path}.weaponB`, 'Unknown weaponB command.'),
      )
    }

    if (
      command.utility !== undefined &&
      !UTILITY_COMMANDS.includes(command.utility as never)
    ) {
      issues.push(
        issue('INVALID_UTILITY', `${path}.utility`, 'Unknown utility command.'),
      )
    }
  })

  return result(issues)
}

export function validateTurnPlanAgainstControls(
  plan: TurnPlan,
  controls: GeneratedControls,
): ValidationResult {
  const issues: ValidationIssue[] = []

  plan.commands.forEach((command, index) => {
    const path = `turnPlan.commands.${index}`

    if (command.move !== undefined && !controls.movement.includes(command.move)) {
      issues.push(
        issue('MOVE_NOT_AVAILABLE', `${path}.move`, `${command.move} is unavailable.`),
      )
    }

    if (command.weaponA !== undefined && !controls.weaponA?.includes(command.weaponA)) {
      issues.push(
        issue(
          'WEAPON_A_NOT_AVAILABLE',
          `${path}.weaponA`,
          'weaponA is unavailable for this blueprint.',
        ),
      )
    }

    if (command.weaponB !== undefined && !controls.weaponB?.includes(command.weaponB)) {
      issues.push(
        issue(
          'WEAPON_B_NOT_AVAILABLE',
          `${path}.weaponB`,
          'weaponB is unavailable for this blueprint.',
        ),
      )
    }

    if (command.utility !== undefined && !controls.utility?.includes(command.utility)) {
      issues.push(
        issue(
          'UTILITY_NOT_AVAILABLE',
          `${path}.utility`,
          'utility controls are unavailable for this blueprint.',
        ),
      )
    }
  })

  return result(issues)
}

export function validateRoundPlanSubmissionShape(
  value: unknown,
): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        issue('INVALID_SUBMISSION', 'submission', 'Expected round submission object.'),
      ],
    }
  }

  if (value.action !== 'submit_round_plan') {
    issues.push(
      issue(
        'INVALID_ACTION',
        'submission.action',
        'Action must be submit_round_plan.',
      ),
    )
  }

  const purchaseResult = validatePurchaseShape(value.purchases)
  const blueprintResult = validateBlueprintShape(value.blueprint)
  const turnPlanResult = validateTurnPlanShape(value.turnPlan)

  if (!purchaseResult.ok) {
    issues.push(...purchaseResult.issues)
  }

  if (!blueprintResult.ok) {
    issues.push(...blueprintResult.issues)
  }

  if (!turnPlanResult.ok) {
    issues.push(...turnPlanResult.issues)
  }

  if ('rationale' in value && typeof value.rationale !== 'string') {
    issues.push(
      issue('INVALID_RATIONALE', 'submission.rationale', 'Rationale must be text.'),
    )
  }

  return result(issues)
}

export function asRoundPlanSubmission(value: unknown): RoundPlanSubmission | null {
  return validateRoundPlanSubmissionShape(value).ok
    ? (value as RoundPlanSubmission)
    : null
}

export function asBotBlueprint(value: unknown): BotBlueprint | null {
  return validateBlueprintShape(value).ok ? (value as BotBlueprint) : null
}

export function validateSubmitRefereeAwardsRequestShape(
  value: unknown,
  awardOptions: readonly RefereeAwardOption[],
): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        issue('INVALID_AWARD_REQUEST', 'awards', 'Expected referee awards request object.'),
      ],
    }
  }

  if (!Array.isArray(value.awards)) {
    return {
      ok: false,
      issues: [issue('INVALID_AWARDS', 'awards', 'Expected awards array.')],
    }
  }

  if (value.awards.length > MAX_REFEREE_AWARDS_PER_ROUND) {
    issues.push(
      issue(
        'TOO_MANY_AWARDS',
        'awards',
        `Select at most ${MAX_REFEREE_AWARDS_PER_ROUND} awards.`,
      ),
    )
  }

  const validAwardIds = new Set(awardOptions.map((option) => option.id))
  const selectedAwardIds = new Set<string>()
  const selectedTeams = new Set<string>()

  value.awards.forEach((selection, index) => {
    const path = `awards.${index}`

    if (!isRecord(selection)) {
      issues.push(issue('INVALID_AWARD_SELECTION', path, 'Expected award selection object.'))
      return
    }

    const awardId = selection.awardId

    if (typeof awardId !== 'string' || awardId.length === 0) {
      issues.push(issue('INVALID_AWARD_ID', `${path}.awardId`, 'Expected award ID.'))
    } else if (!validAwardIds.has(awardId)) {
      issues.push(issue('UNKNOWN_AWARD_ID', `${path}.awardId`, 'Award ID is not available.'))
    } else if (selectedAwardIds.has(awardId)) {
      issues.push(issue('DUPLICATE_AWARD_ID', `${path}.awardId`, 'Award ID was selected more than once.'))
    } else {
      selectedAwardIds.add(awardId)
    }

    const targetTeam = selection.targetTeam

    if (!TEAM_ROLES.includes(targetTeam as never)) {
      issues.push(issue('INVALID_TARGET_TEAM', `${path}.targetTeam`, 'Target team must be red or blue.'))
    } else if (selectedTeams.has(targetTeam as string)) {
      issues.push(
        issue(
          'TOO_MANY_AWARDS_FOR_TEAM',
          `${path}.targetTeam`,
          `Select at most ${MAX_REFEREE_AWARDS_PER_TEAM_PER_ROUND} award per team.`,
        ),
      )
    } else {
      selectedTeams.add(targetTeam as string)
    }
  })

  return result(issues)
}

export function asRefereeAwardSelections(
  value: unknown,
  awardOptions: readonly RefereeAwardOption[],
): RefereeAwardSelection[] | null {
  return validateSubmitRefereeAwardsRequestShape(value, awardOptions).ok
    ? ((value as { awards: RefereeAwardSelection[] }).awards)
    : null
}
