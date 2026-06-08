import type {
  GameMasterActionParameterSchema,
  GameMasterActionParameterValue,
  GameMasterActionSubmission,
  ValidationIssue,
  ValidationResult,
} from '../types.js'
import { isRecord, issue, result } from './common.js'

export type NormalizedGameMasterActionParameters = Record<string, GameMasterActionParameterValue>

const GAME_MASTER_ACTION_SUBMISSION_KEYS = new Set([
  'action',
  'actionSetId',
  'decisionVersion',
  'actionId',
  'parameters',
  'publicMessage',
])

export function validateGameMasterActionSubmissionShape(
  value: unknown,
): ValidationResult {
  const issues: ValidationIssue[] = []
  const path = 'actionSubmission'

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_ACTION_SUBMISSION', path, 'Expected game action submission object.')],
    }
  }

  for (const key of Object.keys(value).sort()) {
    if (!GAME_MASTER_ACTION_SUBMISSION_KEYS.has(key)) {
      issues.push(
        issue(
          'UNKNOWN_FIELD',
          `${path}.${key}`,
          `${key} is not accepted on a GameMaster action submission.`,
        ),
      )
    }
  }

  if (value.action !== 'submit_game_action') {
    issues.push(
      issue('INVALID_ACTION', `${path}.action`, 'Action must be submit_game_action.'),
    )
  }

  if (typeof value.actionSetId !== 'string' || value.actionSetId.trim() === '') {
    issues.push(
      issue('INVALID_ACTION_SET_ID', `${path}.actionSetId`, 'actionSetId is required.'),
    )
  }

  if (
    typeof value.decisionVersion !== 'number' ||
    !Number.isInteger(value.decisionVersion) ||
    value.decisionVersion < 0
  ) {
    issues.push(
      issue(
        'INVALID_DECISION_VERSION',
        `${path}.decisionVersion`,
        'decisionVersion must be a non-negative integer.',
      ),
    )
  }

  if (typeof value.actionId !== 'string' || value.actionId.trim() === '') {
    issues.push(issue('INVALID_ACTION_ID', `${path}.actionId`, 'actionId is required.'))
  }

  if ('publicMessage' in value && typeof value.publicMessage !== 'string') {
    issues.push(
      issue('INVALID_PUBLIC_MESSAGE', `${path}.publicMessage`, 'publicMessage must be text.'),
    )
  }

  if ('parameters' in value && !isRecord(value.parameters)) {
    issues.push(
      issue('INVALID_PARAMETERS', `${path}.parameters`, 'parameters must be an object.'),
    )
  }

  return result(issues)
}

export function validateGameMasterActionParameters(
  value: unknown,
  schema: GameMasterActionParameterSchema,
  path = 'actionSubmission.parameters',
): { ok: true; parameters: NormalizedGameMasterActionParameters } | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_PARAMETERS', path, 'parameters must be an object.')],
    }
  }

  const properties = schema.properties
  const required = new Set(schema.required ?? [])

  for (const key of Object.keys(value)) {
    if (!(key in properties)) {
      issues.push(
        issue(
          'UNKNOWN_PARAMETER',
          `${path}.${key}`,
          `${key} is not accepted by this action.`,
        ),
      )
    }
  }

  for (const key of required) {
    if (!(key in value)) {
      issues.push(
        issue(
          'MISSING_REQUIRED_PARAMETER',
          `${path}.${key}`,
          `${key} is required by this action.`,
        ),
      )
    }
  }

  const normalized: NormalizedGameMasterActionParameters = {}

  for (const key of Object.keys(value).sort()) {
    const definition = properties[key]

    if (!definition) {
      continue
    }

    const parameterValue = value[key]
    const parameterPath = `${path}.${key}`

    if (!validateParameterType(parameterValue, definition.type)) {
      issues.push(
        issue(
          'INVALID_PARAMETER_TYPE',
          parameterPath,
          `${key} must be ${definition.type}.`,
        ),
      )
      continue
    }

    if (
      typeof parameterValue === 'number' &&
      ((typeof definition.minimum === 'number' && parameterValue < definition.minimum) ||
        (typeof definition.maximum === 'number' && parameterValue > definition.maximum))
    ) {
      issues.push(
        issue(
          'PARAMETER_OUT_OF_RANGE',
          parameterPath,
          `${key} ${numberRangeMessage(definition)}.`,
        ),
      )
    }

    if (
      typeof parameterValue === 'string' &&
      ((typeof definition.minLength === 'number' && parameterValue.length < definition.minLength) ||
        (typeof definition.maxLength === 'number' && parameterValue.length > definition.maxLength))
    ) {
      issues.push(
        issue(
          'PARAMETER_OUT_OF_RANGE',
          parameterPath,
          `${key} length ${lengthRangeMessage(definition)}.`,
        ),
      )
    }

    if (definition.enum && !definition.enum.includes(parameterValue)) {
      issues.push(
        issue(
          'PARAMETER_NOT_ALLOWED',
          parameterPath,
          `${key} must be one of: ${definition.enum.map(String).join(', ')}.`,
        ),
      )
    }

    normalized[key] = normalizeParameterValue(parameterValue, definition.normalization)
  }

  return issues.length === 0
    ? { ok: true, parameters: normalized }
    : { ok: false, issues }
}

function numberRangeMessage(
  definition: GameMasterActionParameterSchema['properties'][string],
): string {
  if (typeof definition.minimum === 'number' && typeof definition.maximum === 'number') {
    return `must be between ${definition.minimum} and ${definition.maximum}`
  }

  if (typeof definition.minimum === 'number') {
    return `must be greater than or equal to ${definition.minimum}`
  }

  if (typeof definition.maximum === 'number') {
    return `must be less than or equal to ${definition.maximum}`
  }

  return 'is outside the allowed range'
}

function lengthRangeMessage(
  definition: GameMasterActionParameterSchema['properties'][string],
): string {
  if (typeof definition.minLength === 'number' && typeof definition.maxLength === 'number') {
    return `must be between ${definition.minLength} and ${definition.maxLength}`
  }

  if (typeof definition.minLength === 'number') {
    return `must be at least ${definition.minLength}`
  }

  if (typeof definition.maxLength === 'number') {
    return `must be at most ${definition.maxLength}`
  }

  return 'is outside the allowed range'
}

function normalizeParameterValue(
  value: GameMasterActionParameterValue,
  normalization: GameMasterActionParameterSchema['properties'][string]['normalization'],
): GameMasterActionParameterValue {
  if (typeof value !== 'number') {
    return value
  }

  switch (normalization) {
    case 'degrees':
      return canonicalDegrees(value)
    default:
      return value
  }
}

function canonicalDegrees(value: number): number {
  const normalized = value % 360

  return canonicalNumber(normalized < 0 ? normalized + 360 : normalized)
}

function canonicalNumber(value: number): number {
  const rounded = Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(12))

  return Object.is(rounded, -0) ? 0 : rounded
}

function validateParameterType(
  value: unknown,
  type: GameMasterActionParameterSchema['properties'][string]['type'],
): value is GameMasterActionParameterValue {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'boolean':
      return typeof value === 'boolean'
  }
}

export function asGameMasterActionSubmission(
  value: unknown,
): GameMasterActionSubmission | null {
  return validateGameMasterActionSubmissionShape(value).ok
    ? (value as GameMasterActionSubmission)
    : null
}
