import type {
  GeneratedControls,
  InventoryItem,
  MovementPolicy,
  NormalizedRoundPlanSubmission,
  RoundPlanSubmission,
  TurnCommand,
  ValidationIssue,
} from '../../schemas/src/index.js'
import {
  validateRoundPlanSubmissionShape,
  validateTurnCommandAgainstControls,
  validateCommandSequenceAgainstControls,
} from '../../schemas/src/index.js'
import { validateBlueprintAssembly } from './blueprint.js'
import { deriveControls } from './controls.js'
import { applyPurchases } from './inventory.js'
import { normalizeRoundSubmission } from './normalizeSubmission.js'

export type RoundSubmissionValidation =
  | {
      ok: true
      controls: GeneratedControls
      goldRemaining: number
      inventory: InventoryItem[]
      normalizedSubmission: NormalizedRoundPlanSubmission
    }
  | {
      ok: false
      issues: ValidationIssue[]
    }

export function validateRoundSubmission(input: {
  gold: number
  inventory: InventoryItem[]
  submission: RoundPlanSubmission
}): RoundSubmissionValidation {
  const shape = validateRoundPlanSubmissionShape(input.submission)

  if (!shape.ok) {
    return { ok: false, issues: shape.issues }
  }

  const purchaseResult = applyPurchases(
    input.gold,
    input.inventory,
    input.submission.purchases,
  )

  if (!purchaseResult.ok) {
    return { ok: false, issues: purchaseResult.issues }
  }

  const blueprintResult = validateBlueprintAssembly(
    input.submission.blueprint,
    purchaseResult.inventory,
  )

  if (!blueprintResult.ok) {
    return { ok: false, issues: blueprintResult.issues }
  }

  const controls = deriveControls(input.submission.blueprint)
  const normalizedSubmission = normalizeRoundSubmission(input.submission)
  const openingScriptResult = validateCommandSequenceAgainstControls(
    normalizedSubmission.openingScript,
    controls,
    getOpeningScriptPath(),
  )

  if (!openingScriptResult.ok) {
    return { ok: false, issues: openingScriptResult.issues }
  }

  const movementPolicyResult = validateMovementPolicyAgainstControls(
    normalizedSubmission.tactics.movementPolicy,
    controls,
  )

  if (!movementPolicyResult.ok) {
    return { ok: false, issues: movementPolicyResult.issues }
  }

  return {
    ok: true,
    controls,
    goldRemaining: purchaseResult.goldRemaining,
    inventory: purchaseResult.inventory,
    normalizedSubmission,
  }
}

export function validateSubmittedTurnCommand(input: {
  controls: GeneratedControls
  command: TurnCommand
}): { ok: true } | { ok: false; issues: ValidationIssue[] } {
  const validation = validateTurnCommandAgainstControls(
    input.command,
    input.controls,
    'turnCommand',
  )

  return validation.ok ? { ok: true } : { ok: false, issues: validation.issues }
}

function getOpeningScriptPath(): string {
  return 'submission.openingScript'
}

function validateMovementPolicyAgainstControls(
  movementPolicy: MovementPolicy,
  controls: GeneratedControls,
): { ok: true } | { ok: false; issues: ValidationIssue[] } {
  const requiresMovement = movementPolicy !== 'hold_ground'
  const hasMovementModule = controls.movement.some((command) => command !== 'brake')

  if (requiresMovement && !hasMovementModule) {
    return {
      ok: false,
      issues: [
        {
          code: 'MOVEMENT_POLICY_NOT_AVAILABLE',
          path: 'submission.tactics.movementPolicy',
          message: `${movementPolicy} requires movement controls.`,
        },
      ],
    }
  }

  return { ok: true }
}
