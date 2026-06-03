import {
  MOVEMENT_COMMANDS,
  UTILITY_COMMANDS,
  WEAPON_COMMANDS,
  type BotBlueprint,
  type GeneratedControls,
  type RoundPlanSubmission,
  type TurnPlan,
  type ValidationIssue,
  type ValidationResult,
  type Vector3,
} from './types.js'

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/
const MAX_BLUEPRINT_BYTES = 20_000

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
