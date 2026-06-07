import type {
  GameMasterActionSubmission,
  ValidationIssue,
  ValidationResult,
} from '../types.js'
import { isRecord, issue, result } from './common.js'

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

  return result(issues)
}

export function asGameMasterActionSubmission(
  value: unknown,
): GameMasterActionSubmission | null {
  return validateGameMasterActionSubmissionShape(value).ok
    ? (value as GameMasterActionSubmission)
    : null
}
