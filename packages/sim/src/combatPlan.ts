import type {
  AgentBoardView,
  CombatBudget,
  CombatPlanStep,
  CombatRoundPlanSubmission,
  ValidationIssue,
} from '../../schemas/src/index.js'
import {
  normalizeCombatRoundPlanSubmission as normalizeCombatRoundPlanSubmissionShape,
} from '../../schemas/src/index.js'
import { combatPlanStepCost } from './combatBudget.js'
import { parseCellId } from './gridMovement.js'

export type CombatRoundPlanValidationResult =
  | {
      ok: true
      submission: CombatRoundPlanSubmission
      normalizedSteps: CombatPlanStep[]
      warnings: ValidationIssue[]
    }
  | {
      ok: false
      issues: ValidationIssue[]
    }

export type CombatPlanCostContext = {
  budget: CombatBudget
  board?: AgentBoardView
}

export function normalizeCombatRoundPlanSubmission(
  value: unknown,
): CombatRoundPlanValidationResult {
  const normalized = normalizeCombatRoundPlanSubmissionShape(value)

  if (!normalized.ok) {
    return { ok: false, issues: (normalized as { ok: false; issues: ValidationIssue[] }).issues }
  }

  const truncation = truncatePlanAtEndTurn(normalized.submission.steps)

  return {
    ok: true,
    submission: {
      ...normalized.submission,
      steps: truncation.steps,
    },
    normalizedSteps: truncation.steps,
    warnings: truncation.warnings,
  }
}

export function validateCombatRoundPlanAgainstBoard(input: {
  submission: CombatRoundPlanSubmission
  budget: CombatBudget
  board?: AgentBoardView
}): CombatRoundPlanValidationResult {
  const warnings: ValidationIssue[] = []
  const issues: ValidationIssue[] = []
  const truncation = truncatePlanAtEndTurn(input.submission.steps)
  let movement = input.budget.movement
  let actionTime = input.budget.actionTime
  const reachable = new Set((input.board?.reachableCells ?? []).map((cell) => cell.cellId))
  const attackable = new Set((input.board?.attackableCells ?? []).map((cell) => `${cell.weaponSlot}:${cell.cellId}`))

  warnings.push(...truncation.warnings)

  truncation.steps.forEach((step, index) => {
    if (step.kind === 'move') {
      if (!parseCellId(step.cellId)) {
        issues.push(issue('INVALID_CELL_ID', `steps.${index}.cellId`, 'cellId could not be parsed.'))
      }
      if (reachable.size > 0 && !reachable.has(step.cellId)) {
        issues.push(issue('MOVE_NOT_REACHABLE', `steps.${index}.cellId`, `${step.cellId} is not reachable in the current combat packet.`))
      }
      const cost = combatPlanStepBudgetCost(step, { budget: input.budget, board: input.board })
      movement -= cost.movement
      if (movement < 0) {
        issues.push(issue('MOVEMENT_BUDGET_EXCEEDED', `steps.${index}`, 'Plan spends more movement than the current combat budget.'))
      }
    }

    if (step.kind === 'attack') {
      // Legacy slot submissions can be checked against the legacy attackable
      // affordance view. weaponId submissions are validated by the resolver
      // (range, line of sight, cooldown) instead of an affordance menu.
      if (
        step.weaponSlot &&
        !step.weaponId &&
        attackable.size > 0 &&
        step.targetCellId &&
        !attackable.has(`${step.weaponSlot}:${step.targetCellId}`)
      ) {
        issues.push(issue('ATTACK_NOT_AVAILABLE', `steps.${index}.targetCellId`, `${step.weaponSlot} cannot currently attack ${step.targetCellId}.`))
      }
      actionTime -= combatPlanStepCost(step).actionTime
      if (actionTime < 0) {
        issues.push(issue('ACTION_TIME_BUDGET_EXCEEDED', `steps.${index}`, 'Plan spends more action time than the current combat budget.'))
      }
    }

    if (step.kind === 'utility') {
      actionTime -= combatPlanStepCost(step).actionTime
      if (actionTime < 0) {
        issues.push(issue('ACTION_TIME_BUDGET_EXCEEDED', `steps.${index}`, 'Plan spends more action time than the current combat budget.'))
      }
    }
  })

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    submission: {
      ...input.submission,
      steps: truncation.steps,
    },
    normalizedSteps: truncation.steps,
    warnings,
  }
}

export function truncatePlanAtEndTurn(steps: CombatPlanStep[]): {
  steps: CombatPlanStep[]
  warnings: ValidationIssue[]
} {
  const endIndex = steps.findIndex((step) => step.kind === 'end_turn')

  if (endIndex < 0 || endIndex === steps.length - 1) {
    return { steps: steps.map(cloneStep), warnings: [] }
  }

  return {
    steps: steps.slice(0, endIndex + 1).map(cloneStep),
    warnings: [issue('STEPS_AFTER_END_TURN_IGNORED', `steps.${endIndex + 1}`, 'Steps after end_turn were ignored deterministically.')],
  }
}

export function combatPlanStepBudgetCost(
  step: CombatPlanStep,
  context: CombatPlanCostContext,
): ReturnType<typeof combatPlanStepCost> {
  if (step.kind !== 'move') {
    return combatPlanStepCost(step)
  }

  const reachable = context.board?.reachableCells?.find((cell) => cell.cellId === step.cellId)

  return combatPlanStepCost(step, reachable?.moveCost ?? 1)
}

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message }
}

function cloneStep(step: CombatPlanStep): CombatPlanStep {
  return { ...step } as CombatPlanStep
}
