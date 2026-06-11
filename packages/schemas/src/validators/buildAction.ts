import type {
  CompactBuildAction,
  CompactBuildActionSubmission,
  CompactBuildStep,
  ValidationIssue,
  ValidationResult,
} from '../types.js'
import { isRecord, issue, result } from './common.js'

const SUBMISSION_KEYS = new Set([
  'action',
  'decisionVersion',
  'buildDigest',
  'step',
  'command',
  'publicMessage',
])

const COMPACT_BUILD_STEPS = new Set<CompactBuildStep>([
  'choose_part',
  'choose_attach_target',
  'mount_part',
])

const COMMAND_KEYS: Record<string, Set<string>> = {
  choose_part: new Set(['kind', 'part']),
  remove_part: new Set(['kind', 'id']),
  remove_subtree: new Set(['kind', 'id']),
  move_part: new Set(['kind', 'id']),
  rotate_part: new Set(['kind', 'id', 'rot']),
  confirm_loadout: new Set(['kind']),
  choose_attach_target: new Set(['kind', 'target']),
  mount_part: new Set(['kind', 'surface', 'u', 'v', 'yaw', 'roll']),
}

export function validateCompactBuildActionSubmissionShape(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []
  const path = 'buildActionSubmission'

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue('INVALID_BUILD_ACTION', path, 'Expected compact build action submission object.')],
    }
  }

  for (const key of Object.keys(value).sort()) {
    if (!SUBMISSION_KEYS.has(key)) {
      issues.push(
        issue('UNKNOWN_FIELD', `${path}.${key}`, `${key} is not accepted on a compact build action submission.`),
      )
    }
  }

  if (value.action !== 'submit_build_action') {
    issues.push(issue('INVALID_ACTION', `${path}.action`, 'Action must be submit_build_action.'))
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

  if ('buildDigest' in value && value.buildDigest !== undefined && typeof value.buildDigest !== 'string') {
    issues.push(issue('INVALID_BUILD_DIGEST', `${path}.buildDigest`, 'buildDigest must be text.'))
  }

  if (
    'step' in value &&
    value.step !== undefined &&
    !COMPACT_BUILD_STEPS.has(value.step as CompactBuildStep)
  ) {
    issues.push(
      issue('INVALID_STEP', `${path}.step`, 'step must be choose_part, choose_attach_target, or mount_part.'),
    )
  }

  if ('publicMessage' in value && value.publicMessage !== undefined && typeof value.publicMessage !== 'string') {
    issues.push(issue('INVALID_PUBLIC_MESSAGE', `${path}.publicMessage`, 'publicMessage must be text.'))
  }

  issues.push(...validateCompactBuildCommandShape(value.command, `${path}.command`))

  return result(issues)
}

export function validateCompactBuildCommandShape(value: unknown, path = 'command'): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isRecord(value)) {
    return [issue('INVALID_COMMAND', path, 'command must be an object with a compact build action kind.')]
  }

  const kind = typeof value.kind === 'string' ? value.kind : undefined
  const allowedKeys = kind ? COMMAND_KEYS[kind] : undefined

  if (!kind || !allowedKeys) {
    return [
      issue(
        'INVALID_COMMAND_KIND',
        `${path}.kind`,
        'kind must be one of choose_part, remove_part, remove_subtree, move_part, rotate_part, confirm_loadout, choose_attach_target, mount_part.',
      ),
    ]
  }

  for (const key of Object.keys(value).sort()) {
    if (!allowedKeys.has(key)) {
      issues.push(issue('UNKNOWN_FIELD', `${path}.${key}`, `${key} is not accepted on a ${kind} command.`))
    }
  }

  const requireText = (field: string, code: string) => {
    const entry = value[field]

    if (typeof entry !== 'string' || entry.trim().length === 0) {
      issues.push(issue(code, `${path}.${field}`, `${kind} requires a non-empty ${field}.`))
    }
  }

  switch (kind) {
    case 'choose_part':
      requireText('part', 'INVALID_PART')
      break
    case 'remove_part':
    case 'remove_subtree':
    case 'move_part':
      requireText('id', 'INVALID_PART_INSTANCE')
      break
    case 'rotate_part':
      requireText('id', 'INVALID_PART_INSTANCE')
      if (typeof value.rot !== 'number' || !Number.isFinite(value.rot)) {
        issues.push(issue('INVALID_ROTATION', `${path}.rot`, 'rotate_part requires a finite rot number.'))
      }
      break
    case 'choose_attach_target':
      requireText('target', 'INVALID_ATTACH_TARGET')
      break
    case 'mount_part': {
      requireText('surface', 'INVALID_MOUNT_SURFACE')

      for (const field of ['u', 'v'] as const) {
        const entry = value[field]

        if (typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0 || entry > 1) {
          issues.push(
            issue('INVALID_MOUNT_COORDINATE', `${path}.${field}`, `mount_part requires ${field} in [0, 1].`),
          )
        }
      }

      for (const field of ['yaw', 'roll'] as const) {
        const entry = value[field]

        if (entry !== undefined && (typeof entry !== 'number' || !Number.isFinite(entry))) {
          issues.push(
            issue('INVALID_MOUNT_ANGLE', `${path}.${field}`, `mount_part ${field} must be a finite number when present.`),
          )
        }
      }
      break
    }
    case 'confirm_loadout':
    default:
      break
  }

  return issues
}

export function normalizeCompactBuildActionSubmission(
  value: unknown,
): { ok: true; submission: CompactBuildActionSubmission } | { ok: false; issues: ValidationIssue[] } {
  const validation = validateCompactBuildActionSubmissionShape(value)

  if (!validation.ok) {
    return { ok: false, issues: (validation as { ok: false; issues: ValidationIssue[] }).issues }
  }

  const record = value as Record<string, unknown>
  const command = normalizeCompactBuildCommand(record.command as Record<string, unknown>)

  return {
    ok: true,
    submission: {
      action: 'submit_build_action',
      decisionVersion: record.decisionVersion as number,
      ...(typeof record.buildDigest === 'string' ? { buildDigest: record.buildDigest } : {}),
      ...(typeof record.step === 'string' ? { step: record.step as CompactBuildStep } : {}),
      command,
      ...(typeof record.publicMessage === 'string' ? { publicMessage: record.publicMessage } : {}),
    },
  }
}

function normalizeCompactBuildCommand(record: Record<string, unknown>): CompactBuildAction {
  switch (record.kind) {
    case 'choose_part':
      return { kind: 'choose_part', part: (record.part as string).trim() }
    case 'remove_part':
      return { kind: 'remove_part', id: (record.id as string).trim() }
    case 'remove_subtree':
      return { kind: 'remove_subtree', id: (record.id as string).trim() }
    case 'move_part':
      return { kind: 'move_part', id: (record.id as string).trim() }
    case 'rotate_part':
      return { kind: 'rotate_part', id: (record.id as string).trim(), rot: record.rot as number }
    case 'choose_attach_target':
      return { kind: 'choose_attach_target', target: (record.target as string).trim() }
    case 'mount_part':
      return {
        kind: 'mount_part',
        surface: (record.surface as string).trim(),
        u: record.u as number,
        v: record.v as number,
        yaw: typeof record.yaw === 'number' ? record.yaw : 0,
        roll: typeof record.roll === 'number' ? record.roll : 0,
      }
    case 'confirm_loadout':
    default:
      return { kind: 'confirm_loadout' }
  }
}
