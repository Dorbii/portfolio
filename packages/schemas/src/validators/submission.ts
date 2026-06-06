import type {
  BotBlueprint,
  RoundPlanSubmission,
  ValidationIssue,
  ValidationResult,
} from '../types.js'
import { MAX_AGENT_CHAT_MESSAGES_PER_SUBMISSION, isRecord, issue, result } from './common.js'
import { validateBlueprintShape, validatePurchaseShape } from './blueprint.js'
import { validateAgentChatMessageBatchShape } from './chat.js'
import { validateBotTacticsShape } from './tactics.js'
import { validateOpeningScriptShape } from './turnPlan.js'

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
  const schemaVersion = value.schemaVersion

  if (schemaVersion !== 2) {
    issues.push(
      issue(
        'INVALID_SCHEMA_VERSION',
        'submission.schemaVersion',
        'schemaVersion must be 2.',
      ),
    )
  }

  if (!purchaseResult.ok) {
    issues.push(...purchaseResult.issues)
  }

  if (!blueprintResult.ok) {
    issues.push(...blueprintResult.issues)
  }

  if ('turnPlan' in value) {
    issues.push(
      issue(
        'LEGACY_TURN_PLAN_REMOVED',
        'submission.turnPlan',
        'Round submissions use openingScript only; submit live turns with submit_turn_command.',
      ),
    )
  }

  const tacticsResult = validateBotTacticsShape(value.tactics)

  if (!tacticsResult.ok) {
    issues.push(...tacticsResult.issues)
  }

  if ('openingScript' in value) {
    const openingScriptResult = validateOpeningScriptShape(value.openingScript)

    if (!openingScriptResult.ok) {
      issues.push(...openingScriptResult.issues)
    }
  }

  if ('rationale' in value && typeof value.rationale !== 'string') {
    issues.push(
      issue('INVALID_RATIONALE', 'submission.rationale', 'Rationale must be text.'),
    )
  }

  if ('chat' in value) {
    const chatResult = validateAgentChatMessageBatchShape(
      value.chat,
      'submission.chat',
      MAX_AGENT_CHAT_MESSAGES_PER_SUBMISSION,
    )

    if (!chatResult.ok) {
      issues.push(...chatResult.issues)
    }
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
