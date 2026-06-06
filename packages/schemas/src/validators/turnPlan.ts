import {
  MOVEMENT_COMMANDS,
  UTILITY_COMMANDS,
  WEAPON_COMMANDS,
  type GeneratedControls,
  type TurnCommand,
  type TurnCommandSubmission,
  type TurnPlan,
  type ValidationIssue,
  type ValidationResult,
} from '../types.js'
import { isRecord, issue, result } from './common.js'

const MAX_COMBAT_TURN_TICKS = 600

type TurnPlanShapeOptions = {
  exactCommandCount?: boolean
  path?: string
}

export function validateTurnPlanShape(value: unknown, maxTicks = 5): ValidationResult {
  return validateTurnPlanShapeWithOptions(value, maxTicks)
}

export function validateOpeningScriptShape(
  value: unknown,
  path = 'submission.openingScript',
): ValidationResult {
  return validateTurnPlanShapeWithOptions(value, 5, {
    exactCommandCount: false,
    path,
  })
}

export function validateTurnPlanAgainstControls(
  plan: TurnPlan,
  controls: GeneratedControls,
  path = 'turnPlan',
): ValidationResult {
  const issues: ValidationIssue[] = []

  plan.commands.forEach((command, index) => {
    const commandPath = `${path}.commands.${index}`

    if (command.move !== undefined && !controls.movement.includes(command.move)) {
      issues.push(
        issue('MOVE_NOT_AVAILABLE', `${commandPath}.move`, `${command.move} is unavailable.`),
      )
    }

    if (command.weaponA !== undefined && !controls.weaponA?.includes(command.weaponA)) {
      issues.push(
        issue(
          'WEAPON_A_NOT_AVAILABLE',
          `${commandPath}.weaponA`,
          'weaponA is unavailable for this blueprint.',
        ),
      )
    }

    if (command.weaponB !== undefined && !controls.weaponB?.includes(command.weaponB)) {
      issues.push(
        issue(
          'WEAPON_B_NOT_AVAILABLE',
          `${commandPath}.weaponB`,
          'weaponB is unavailable for this blueprint.',
        ),
      )
    }

    if (command.utility !== undefined && !controls.utility?.includes(command.utility)) {
      issues.push(
        issue(
          'UTILITY_NOT_AVAILABLE',
          `${commandPath}.utility`,
          'utility controls are unavailable for this blueprint.',
        ),
      )
    }
  })

  return result(issues)
}

export function validateTurnCommandSubmissionShape(
  value: unknown,
  expectedTick?: number,
): ValidationResult {
  const issues: ValidationIssue[] = []
  const path = 'turnCommand'

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_TURN_COMMAND', path, 'Expected turn command object.')],
    }
  }

  if (value.action !== 'submit_turn_command') {
    issues.push(
      issue(
        'INVALID_ACTION',
        `${path}.action`,
        'Action must be submit_turn_command.',
      ),
    )
  }

  validateTurnCommandFields(value, path, issues, {
    expectedTick,
    maxTick: MAX_COMBAT_TURN_TICKS,
  })

  return result(issues)
}

export function validateTurnCommandAgainstControls(
  command: TurnCommand,
  controls: GeneratedControls,
  path = 'turnCommand',
): ValidationResult {
  return validateTurnPlanAgainstControls({ commands: [command] }, controls, path)
}

export function asTurnCommandSubmission(
  value: unknown,
  expectedTick?: number,
): TurnCommandSubmission | null {
  return validateTurnCommandSubmissionShape(value, expectedTick).ok
    ? (value as TurnCommandSubmission)
    : null
}

function validateTurnPlanShapeWithOptions(
  value: unknown,
  maxTicks = 5,
  options: TurnPlanShapeOptions = {},
): ValidationResult {
  const issues: ValidationIssue[] = []
  const path = options.path ?? 'turnPlan'
  const exactCommandCount = options.exactCommandCount ?? true

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_TURN_PLAN', path, 'Expected turn plan object.')],
    }
  }

  if (!Array.isArray(value.commands)) {
    return {
      ok: false,
      issues: [
        issue('INVALID_COMMANDS', `${path}.commands`, 'Expected commands array.'),
      ],
    }
  }

  if (exactCommandCount && value.commands.length !== maxTicks) {
    issues.push(
      issue(
        'INVALID_TICK_COUNT',
        `${path}.commands`,
        `Turn plan must include exactly ${maxTicks} command ticks.`,
      ),
    )
  } else if (!exactCommandCount && value.commands.length > maxTicks) {
    issues.push(
      issue(
        'TOO_MANY_COMMANDS',
        `${path}.commands`,
        `Opening script can include at most ${maxTicks} command ticks.`,
      ),
    )
  }

  const ticks = new Set<number>()

  value.commands.forEach((command, index) => {
    const commandPath = `${path}.commands.${index}`

    if (!isRecord(command)) {
      issues.push(issue('INVALID_COMMAND', commandPath, 'Expected command object.'))
      return
    }

    const tick = validateTurnCommandFields(command, commandPath, issues, {
      maxTick: maxTicks,
    })

    if (tick !== undefined && ticks.has(tick)) {
      issues.push(
        issue('DUPLICATE_TICK', `${commandPath}.tick`, `Duplicate tick ${tick}.`),
      )
    } else if (tick !== undefined) {
      ticks.add(tick)
    }
  })

  return result(issues)
}

function validateTurnCommandFields(
  command: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
  options: {
    expectedTick?: number
    maxTick: number
  },
): number | undefined {
  const tick = command.tick

  if (typeof tick !== 'number' || !Number.isInteger(tick) || tick < 1 || tick > options.maxTick) {
    issues.push(
      issue(
        'INVALID_TICK',
        `${path}.tick`,
        `Tick must be an integer from 1 through ${options.maxTick}.`,
      ),
    )
  } else if (options.expectedTick !== undefined && tick !== options.expectedTick) {
    issues.push(
      issue(
        'OUT_OF_SEQUENCE_TICK',
        `${path}.tick`,
        `Expected combat tick ${options.expectedTick}.`,
      ),
    )
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

  return typeof tick === 'number' && Number.isInteger(tick) ? tick : undefined
}
