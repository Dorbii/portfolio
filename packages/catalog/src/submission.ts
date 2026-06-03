import type {
  GeneratedControls,
  InventoryItem,
  RoundPlanSubmission,
  ValidationIssue,
} from '../../schemas/src/index.js'
import {
  validateRoundPlanSubmissionShape,
  validateTurnPlanAgainstControls,
} from '../../schemas/src/index.js'
import { validateBlueprintAssembly } from './blueprint.js'
import { deriveControls } from './controls.js'
import { applyPurchases } from './inventory.js'

export type RoundSubmissionValidation =
  | {
      ok: true
      controls: GeneratedControls
      goldRemaining: number
      inventory: InventoryItem[]
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
  const turnPlanResult = validateTurnPlanAgainstControls(
    input.submission.turnPlan,
    controls,
  )

  if (!turnPlanResult.ok) {
    return { ok: false, issues: turnPlanResult.issues }
  }

  return {
    ok: true,
    controls,
    goldRemaining: purchaseResult.goldRemaining,
    inventory: purchaseResult.inventory,
  }
}
