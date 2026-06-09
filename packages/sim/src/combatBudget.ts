import type {
  CombatBudget,
  CombatPlanStep,
  CombatTurnSnapshot,
  MachineCapabilities,
  TeamRole,
} from '../../schemas/src/index.js'

export type DeriveCombatBudgetInput = {
  role: TeamRole
  snapshot: CombatTurnSnapshot
  machineCapabilities?: MachineCapabilities
}

export type CombatPlanStepCost = {
  movement: number
  actionTime: number
  weaponSlot?: 'weaponA' | 'weaponB'
}

export type BudgetConsumptionResult =
  | {
      ok: true
      budget: CombatBudget
      cost: CombatPlanStepCost
    }
  | {
      ok: false
      reason: string
      cost: CombatPlanStepCost
    }

export function deriveCombatBudget(input: DeriveCombatBudgetInput): CombatBudget {
  const self = input.role === 'red' ? input.snapshot.red : input.snapshot.blue
  const machineMovement = input.machineCapabilities
    ? Math.max(0, ...input.machineCapabilities.movement.map((movement) => Math.floor(movement.moveBudget)))
    : undefined
  const movement = clampInteger(
    machineMovement ?? Math.round(self.stats.mobility || self.stats.traction || 1),
    1,
    12,
  )
  const actionTime = clampInteger(
    Math.round(2 + Math.max(self.stats.control, self.stats.weaponThreat) / 4),
    1,
    12,
  )

  return {
    movement,
    actionTime,
    weaponCooldowns: { ...self.cooldowns },
  }
}

export function combatPlanStepCost(
  step: CombatPlanStep,
  movementCost = 1,
): CombatPlanStepCost {
  switch (step.kind) {
    case 'move':
      return { movement: Math.max(1, movementCost), actionTime: 0 }
    case 'attack':
      return { movement: 0, actionTime: 1, weaponSlot: step.weaponSlot }
    case 'utility':
      return { movement: 0, actionTime: 1 }
    case 'end_turn':
      return { movement: 0, actionTime: 0 }
  }
}

export function consumeCombatBudget(input: {
  budget: CombatBudget
  step: CombatPlanStep
  movementCost?: number
}): BudgetConsumptionResult {
  const cost = combatPlanStepCost(input.step, input.movementCost)

  if (cost.movement > input.budget.movement) {
    return { ok: false, reason: 'movement budget exhausted', cost }
  }
  if (cost.actionTime > input.budget.actionTime) {
    return { ok: false, reason: 'action time budget exhausted', cost }
  }
  if (cost.weaponSlot && (input.budget.weaponCooldowns[cost.weaponSlot] ?? 0) > 0) {
    return { ok: false, reason: `${cost.weaponSlot} is on cooldown`, cost }
  }

  return {
    ok: true,
    budget: {
      movement: input.budget.movement - cost.movement,
      actionTime: input.budget.actionTime - cost.actionTime,
      weaponCooldowns: cost.weaponSlot
        ? { ...input.budget.weaponCooldowns, [cost.weaponSlot]: 1 }
        : { ...input.budget.weaponCooldowns },
    },
    cost,
  }
}

export function advanceCombatCooldowns(budget: CombatBudget): CombatBudget {
  return {
    ...budget,
    weaponCooldowns: Object.fromEntries(
      Object.entries(budget.weaponCooldowns).map(([slot, turns]) => [slot, Math.max(0, turns - 1)]),
    ),
  }
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, Math.round(value)))
}
