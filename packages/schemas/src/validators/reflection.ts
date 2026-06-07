import {
  TEAM_ROLES,
  type PostFightAgentReflection,
  type ValidationIssue,
  type ValidationResult,
} from '../types.js'
import { isRecord, issue, result } from './common.js'

const REFLECTION_LIST_FIELDS = [
  'ownWeaknesses',
  'opponentThreats',
  'suggestedDesignChanges',
  'suggestedTacticalChanges',
] as const

export function validatePostFightAgentReflectionShape(
  value: unknown,
): ValidationResult {
  const issues: ValidationIssue[] = []
  const path = 'reflection'

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_REFLECTION', path, 'Expected reflection object.')],
    }
  }

  if (value.action !== 'submit_post_fight_reflection') {
    issues.push(
      issue(
        'INVALID_ACTION',
        `${path}.action`,
        'Action must be submit_post_fight_reflection.',
      ),
    )
  }

  if (typeof value.fightId !== 'string' || value.fightId.trim() === '') {
    issues.push(issue('INVALID_FIGHT_ID', `${path}.fightId`, 'fightId is required.'))
  }

  if (!TEAM_ROLES.includes(value.role as never)) {
    issues.push(issue('INVALID_ROLE', `${path}.role`, 'role must be red or blue.'))
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

  validateClaims(value.claims, issues)

  if (!['low', 'medium', 'high'].includes(value.confidence as string)) {
    issues.push(
      issue('INVALID_CONFIDENCE', `${path}.confidence`, 'confidence must be low, medium, or high.'),
    )
  }

  return result(issues)
}

export function asPostFightAgentReflection(
  value: unknown,
): PostFightAgentReflection | null {
  return validatePostFightAgentReflectionShape(value).ok
    ? (value as PostFightAgentReflection)
    : null
}

function validateClaims(value: unknown, issues: ValidationIssue[]): void {
  const path = 'reflection.claims'

  if (!isRecord(value)) {
    issues.push(issue('INVALID_CLAIMS', path, 'claims must be an object.'))
    return
  }

  for (const key of ['perceivedWinReason', 'perceivedLossReason'] as const) {
    if (key in value && value[key] !== undefined && typeof value[key] !== 'string') {
      issues.push(issue('INVALID_CLAIM_TEXT', `${path}.${key}`, `${key} must be text.`))
    }
  }

  for (const key of REFLECTION_LIST_FIELDS) {
    const candidate = value[key]

    if (!Array.isArray(candidate) || !candidate.every((entry) => typeof entry === 'string')) {
      issues.push(issue('INVALID_CLAIM_LIST', `${path}.${key}`, `${key} must be a string array.`))
    }
  }
}
