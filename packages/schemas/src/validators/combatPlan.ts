import type {
  CombatPlanStep,
  CombatRoundPlanSubmission,
  ValidationIssue,
  ValidationResult,
} from '../types.js'
import { isRecord, issue, result } from './common.js'

const COMBAT_ROUND_PLAN_SUBMISSION_KEYS = new Set([
  'action',
  'decisionVersion',
  'round',
  'steps',
  'publicMessage',
])
const MOVE_STEP_KEYS = new Set(['kind', 'cellId'])
const ATTACK_STEP_KEYS = new Set(['kind', 'weaponSlot', 'targetCellId'])
const UTILITY_STEP_KEYS = new Set(['kind', 'utilityId', 'cellId'])
const END_TURN_STEP_KEYS = new Set(['kind'])
const CELL_ID_PATTERN = /^cell:-?\d+:-?\d+$/
const COMPACT_CELL_ID_PATTERN = /^-?\d+[,:]-?\d+$/
export const MAX_COMBAT_PLAN_STEPS = 16

export function validateCombatRoundPlanSubmissionShape(
  value: unknown,
): ValidationResult {
  const issues: ValidationIssue[] = []
  const path = 'combatRoundPlanSubmission'

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_COMBAT_ROUND_PLAN', path, 'Expected combat round plan submission object.')],
    }
  }

  for (const key of Object.keys(value).sort()) {
    if (!COMBAT_ROUND_PLAN_SUBMISSION_KEYS.has(key)) {
      issues.push(
        issue(
          'UNKNOWN_FIELD',
          `${path}.${key}`,
          `${key} is not accepted on a combat round plan submission.`,
        ),
      )
    }
  }

  if (value.action !== 'submit_combat_round_plan') {
    issues.push(
      issue('INVALID_ACTION', `${path}.action`, 'Action must be submit_combat_round_plan.'),
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

  if (
    typeof value.round !== 'number' ||
    !Number.isInteger(value.round) ||
    value.round < 1
  ) {
    issues.push(
      issue('INVALID_ROUND', `${path}.round`, 'round must be a positive integer.'),
    )
  }

  if (!Array.isArray(value.steps)) {
    issues.push(issue('INVALID_STEPS', `${path}.steps`, 'steps must be an array.'))
  } else {
    if (value.steps.length === 0) {
      issues.push(issue('EMPTY_STEPS', `${path}.steps`, 'steps must contain at least one plan step.'))
    }
    if (value.steps.length > MAX_COMBAT_PLAN_STEPS) {
      issues.push(
        issue(
          'TOO_MANY_STEPS',
          `${path}.steps`,
          `steps contains ${value.steps.length} entries; max is ${MAX_COMBAT_PLAN_STEPS}.`,
        ),
      )
    }
    value.steps.slice(0, MAX_COMBAT_PLAN_STEPS).forEach((step, index) => {
      issues.push(...validateCombatPlanStepShape(step, `${path}.steps.${index}`))
    })
  }

  if ('publicMessage' in value && typeof value.publicMessage !== 'string') {
    issues.push(
      issue('INVALID_PUBLIC_MESSAGE', `${path}.publicMessage`, 'publicMessage must be text.'),
    )
  }

  return result(issues)
}

export function normalizeCombatRoundPlanSubmission(
  value: unknown,
): { ok: true; submission: CombatRoundPlanSubmission } | { ok: false; issues: ValidationIssue[] } {
  const validation = validateCombatRoundPlanSubmissionShape(value)

  if (!validation.ok) {
    return { ok: false, issues: (validation as { ok: false; issues: ValidationIssue[] }).issues }
  }

  const record = value as Record<string, unknown>
  const steps = (record.steps as unknown[])
    .slice(0, MAX_COMBAT_PLAN_STEPS)
    .map(normalizeCombatPlanStep)

  return {
    ok: true,
    submission: {
      action: 'submit_combat_round_plan',
      decisionVersion: record.decisionVersion as number,
      round: record.round as number,
      steps,
      ...(typeof record.publicMessage === 'string' ? { publicMessage: record.publicMessage } : {}),
    },
  }
}

const COMPACT_COMBAT_PLAN_SUBMISSION_KEYS = new Set([
  'action',
  'decisionVersion',
  'round',
  'steps',
  'publicMessage',
])
const COMPACT_MOVE_KEYS = new Set(['kind', 'to'])
const COMPACT_ATTACK_KEYS = new Set(['kind', 'weapon', 'weaponSlot', 'target'])
const COMPACT_UTILITY_KEYS = new Set(['kind', 'utility', 'at'])

function isCellTuple(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry) && Number.isInteger(entry))
  )
}

function cellIdFromTuple(value: [number, number]): string {
  return `cell:${value[0]}:${value[1]}`
}

// Compact combat plans are schema-normalized into the legacy
// CombatRoundPlanSubmission shape; game legality (movement, LoS, range,
// cooldowns, action time) stays with the existing server validators.
export function normalizeCompactCombatPlanSubmission(
  value: unknown,
): { ok: true; submission: CombatRoundPlanSubmission } | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const path = 'compactCombatPlanSubmission'

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_COMBAT_PLAN', path, 'Expected compact combat plan submission object.')],
    }
  }

  for (const key of Object.keys(value).sort()) {
    if (!COMPACT_COMBAT_PLAN_SUBMISSION_KEYS.has(key)) {
      issues.push(issue('UNKNOWN_FIELD', `${path}.${key}`, `${key} is not accepted on a compact combat plan submission.`))
    }
  }

  if (value.action !== 'submit_combat_plan') {
    issues.push(issue('INVALID_ACTION', `${path}.action`, 'Action must be submit_combat_plan.'))
  }

  if (
    typeof value.decisionVersion !== 'number' ||
    !Number.isInteger(value.decisionVersion) ||
    value.decisionVersion < 0
  ) {
    issues.push(issue('INVALID_DECISION_VERSION', `${path}.decisionVersion`, 'decisionVersion must be a non-negative integer.'))
  }

  if (typeof value.round !== 'number' || !Number.isInteger(value.round) || value.round < 1) {
    issues.push(issue('INVALID_ROUND', `${path}.round`, 'round must be a positive integer.'))
  }

  if ('publicMessage' in value && value.publicMessage !== undefined && typeof value.publicMessage !== 'string') {
    issues.push(issue('INVALID_PUBLIC_MESSAGE', `${path}.publicMessage`, 'publicMessage must be text.'))
  }

  const steps: CombatPlanStep[] = []

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    issues.push(issue('INVALID_STEPS', `${path}.steps`, 'steps must be a non-empty array.'))
  } else if (value.steps.length > MAX_COMBAT_PLAN_STEPS) {
    issues.push(issue('TOO_MANY_STEPS', `${path}.steps`, `steps contains ${value.steps.length} entries; max is ${MAX_COMBAT_PLAN_STEPS}.`))
  } else {
    value.steps.forEach((step, index) => {
      const stepPath = `${path}.steps.${index}`

      if (!isRecord(step)) {
        issues.push(issue('INVALID_COMBAT_PLAN_STEP', stepPath, 'Expected compact combat plan step object.'))
        return
      }

      switch (step.kind) {
        case 'move': {
          for (const key of Object.keys(step).sort()) {
            if (!COMPACT_MOVE_KEYS.has(key)) {
              issues.push(issue('UNKNOWN_FIELD', `${stepPath}.${key}`, `${key} is not accepted on a compact move step.`))
            }
          }
          if (!isCellTuple(step.to)) {
            issues.push(issue('INVALID_CELL', `${stepPath}.to`, 'move steps require to: [x, z] integer tuple.'))
            return
          }
          steps.push({ kind: 'move', cellId: cellIdFromTuple(step.to) })
          return
        }
        case 'attack': {
          for (const key of Object.keys(step).sort()) {
            if (!COMPACT_ATTACK_KEYS.has(key)) {
              issues.push(issue('UNKNOWN_FIELD', `${stepPath}.${key}`, `${key} is not accepted on a compact attack step.`))
            }
          }
          if ('weapon' in step && step.weapon !== undefined && typeof step.weapon !== 'string') {
            issues.push(issue('INVALID_WEAPON', `${stepPath}.weapon`, 'attack weapon must be a mounted weapon id string.'))
          }
          const weaponSlot = step.weaponSlot ?? (typeof step.weapon === 'string' ? undefined : 'weaponA')
          if (
            weaponSlot !== undefined &&
            weaponSlot !== 'weaponA' &&
            weaponSlot !== 'weaponB'
          ) {
            issues.push(issue('INVALID_WEAPON_SLOT', `${stepPath}.weaponSlot`, 'attack weaponSlot must be weaponA or weaponB during compatibility.'))
          }
          if (!isCellTuple(step.target)) {
            issues.push(issue('INVALID_CELL', `${stepPath}.target`, 'attack steps require target: [x, z] integer tuple.'))
            return
          }
          steps.push({
            kind: 'attack',
            weaponSlot: (weaponSlot === 'weaponB' ? 'weaponB' : 'weaponA'),
            targetCellId: cellIdFromTuple(step.target),
          })
          return
        }
        case 'utility': {
          for (const key of Object.keys(step).sort()) {
            if (!COMPACT_UTILITY_KEYS.has(key)) {
              issues.push(issue('UNKNOWN_FIELD', `${stepPath}.${key}`, `${key} is not accepted on a compact utility step.`))
            }
          }
          if ('utility' in step && step.utility !== undefined && typeof step.utility !== 'string') {
            issues.push(issue('INVALID_UTILITY_ID', `${stepPath}.utility`, 'utility must be text.'))
          }
          if ('at' in step && step.at !== undefined && !isCellTuple(step.at)) {
            issues.push(issue('INVALID_CELL', `${stepPath}.at`, 'utility at must be an [x, z] integer tuple.'))
          }
          if (step.utility === undefined && step.at === undefined) {
            issues.push(issue('INVALID_UTILITY_STEP', stepPath, 'utility steps require utility, at, or both.'))
            return
          }
          steps.push({
            kind: 'utility',
            ...(typeof step.utility === 'string' ? { utilityId: step.utility.trim() } : {}),
            ...(isCellTuple(step.at) ? { cellId: cellIdFromTuple(step.at) } : {}),
          })
          return
        }
        case 'end_turn': {
          for (const key of Object.keys(step).sort()) {
            if (key !== 'kind') {
              issues.push(issue('UNKNOWN_FIELD', `${stepPath}.${key}`, `${key} is not accepted on a compact end_turn step.`))
            }
          }
          steps.push({ kind: 'end_turn' })
          return
        }
        default:
          issues.push(issue('INVALID_STEP_KIND', `${stepPath}.kind`, 'kind must be move, attack, utility, or end_turn.'))
      }
    })
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  const record = value as Record<string, unknown>

  return {
    ok: true,
    submission: {
      action: 'submit_combat_round_plan',
      decisionVersion: record.decisionVersion as number,
      round: record.round as number,
      steps,
      ...(typeof record.publicMessage === 'string' ? { publicMessage: record.publicMessage } : {}),
    },
  }
}

export function validateCombatPlanStepShape(
  value: unknown,
  path = 'combatPlanStep',
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return [issue('INVALID_COMBAT_PLAN_STEP', path, 'Expected combat plan step object.')]
  }

  switch (value.kind) {
    case 'move':
      validateKnownStepKeys(value, MOVE_STEP_KEYS, path, issues)
      if (!isValidCellId(value.cellId)) {
        issues.push(issue('INVALID_CELL_ID', `${path}.cellId`, 'move steps require cellId like cell:3:0.'))
      }
      return issues
    case 'attack':
      validateKnownStepKeys(value, ATTACK_STEP_KEYS, path, issues)
      if (value.weaponSlot !== 'weaponA' && value.weaponSlot !== 'weaponB') {
        issues.push(issue('INVALID_WEAPON_SLOT', `${path}.weaponSlot`, 'attack steps require weaponSlot weaponA or weaponB.'))
      }
      if ('targetCellId' in value && value.targetCellId !== undefined && !isValidCellId(value.targetCellId)) {
        issues.push(issue('INVALID_TARGET_CELL_ID', `${path}.targetCellId`, 'targetCellId must look like cell:3:0.'))
      }
      return issues
    case 'utility':
      validateKnownStepKeys(value, UTILITY_STEP_KEYS, path, issues)
      if ('utilityId' in value && value.utilityId !== undefined && typeof value.utilityId !== 'string') {
        issues.push(issue('INVALID_UTILITY_ID', `${path}.utilityId`, 'utilityId must be text.'))
      }
      if ('cellId' in value && value.cellId !== undefined && !isValidCellId(value.cellId)) {
        issues.push(issue('INVALID_CELL_ID', `${path}.cellId`, 'cellId must look like cell:3:0.'))
      }
      if (!value.utilityId && !value.cellId) {
        issues.push(issue('INVALID_UTILITY_STEP', path, 'utility steps require utilityId, cellId, or both.'))
      }
      return issues
    case 'end_turn':
      validateKnownStepKeys(value, END_TURN_STEP_KEYS, path, issues)
      return issues
    default:
      issues.push(issue('INVALID_STEP_KIND', `${path}.kind`, 'kind must be move, attack, utility, or end_turn.'))
      return issues
  }
}

function normalizeCombatPlanStep(value: unknown): CombatPlanStep {
  const record = value as Record<string, unknown>

  switch (record.kind) {
    case 'move':
      return { kind: 'move', cellId: normalizeCellId(record.cellId as string) }
    case 'attack':
      return {
        kind: 'attack',
        weaponSlot: record.weaponSlot as 'weaponA' | 'weaponB',
        ...(typeof record.targetCellId === 'string' ? { targetCellId: normalizeCellId(record.targetCellId) } : {}),
      }
    case 'utility':
      return {
        kind: 'utility',
        ...(typeof record.utilityId === 'string' ? { utilityId: record.utilityId.trim() } : {}),
        ...(typeof record.cellId === 'string' ? { cellId: normalizeCellId(record.cellId) } : {}),
      }
    case 'end_turn':
    default:
      return { kind: 'end_turn' }
  }
}

function validateKnownStepKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  issues: ValidationIssue[],
): void {
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) {
      issues.push(
        issue('UNKNOWN_FIELD', `${path}.${key}`, `${key} is not accepted on this combat plan step.`),
      )
    }
  }
}

function isValidCellId(value: unknown): value is string {
  return typeof value === 'string' && (
    CELL_ID_PATTERN.test(value.trim()) ||
    COMPACT_CELL_ID_PATTERN.test(value.trim())
  )
}

function normalizeCellId(value: string): string {
  const trimmed = value.trim()
  const cellMatch = /^cell:(-?\d+):(-?\d+)$/.exec(trimmed)

  if (cellMatch) {
    return `cell:${Number(cellMatch[1])}:${Number(cellMatch[2])}`
  }

  const compactMatch = /^(-?\d+)[,:](-?\d+)$/.exec(trimmed)

  return compactMatch
    ? `cell:${Number(compactMatch[1])}:${Number(compactMatch[2])}`
    : trimmed
}
