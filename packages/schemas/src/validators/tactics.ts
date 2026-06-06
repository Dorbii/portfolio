import {
  HAZARD_PREFERENCES,
  MOVEMENT_POLICIES,
  PREFERRED_RANGES,
  TACTIC_STYLES,
  TARGET_PRIORITIES,
  WEAPON_CADENCES,
  type BotTactics,
  type ValidationIssue,
  type ValidationResult,
} from '../types.js'
import { isRecord, issue, result } from './common.js'

export function validateBotTacticsShape(
  value: unknown,
  path = 'submission.tactics',
): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_TACTICS', path, 'Expected tactics object.')],
    }
  }

  validateOptionalEnum(
    issues,
    value,
    'style',
    TACTIC_STYLES,
    path,
    'INVALID_TACTIC_STYLE',
  )
  validateOptionalEnum(
    issues,
    value,
    'targetPriority',
    TARGET_PRIORITIES,
    path,
    'INVALID_TARGET_PRIORITY',
  )
  validateOptionalEnum(
    issues,
    value,
    'preferredRange',
    PREFERRED_RANGES,
    path,
    'INVALID_PREFERRED_RANGE',
  )
  validateOptionalEnum(
    issues,
    value,
    'movementPolicy',
    MOVEMENT_POLICIES,
    path,
    'INVALID_MOVEMENT_POLICY',
  )
  validateOptionalUnitNumber(issues, value, 'aggression', path, 'INVALID_AGGRESSION')
  validateOptionalUnitNumber(
    issues,
    value,
    'retreatAtHealthPct',
    path,
    'INVALID_RETREAT_THRESHOLD',
  )
  validateOptionalEnum(
    issues,
    value,
    'weaponCadence',
    WEAPON_CADENCES,
    path,
    'INVALID_WEAPON_CADENCE',
  )
  validateOptionalEnum(
    issues,
    value,
    'hazardPreference',
    HAZARD_PREFERENCES,
    path,
    'INVALID_HAZARD_PREFERENCE',
  )

  return result(issues)
}

function validateOptionalEnum<T extends string>(
  issues: ValidationIssue[],
  value: Record<string, unknown>,
  key: keyof BotTactics & string,
  allowed: readonly T[],
  path: string,
  code: string,
): void {
  if (key in value && !allowed.includes(value[key] as T)) {
    issues.push(
      issue(
        code,
        `${path}.${key}`,
        `${key} must be one of ${allowed.join(', ')}.`,
      ),
    )
  }
}

function validateOptionalUnitNumber(
  issues: ValidationIssue[],
  value: Record<string, unknown>,
  key: keyof BotTactics & string,
  path: string,
  code: string,
): void {
  if (key in value) {
    const candidate = value[key]

    if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate < 0 || candidate > 1) {
      issues.push(issue(code, `${path}.${key}`, `${key} must be a number from 0 through 1.`))
    }
  }
}
