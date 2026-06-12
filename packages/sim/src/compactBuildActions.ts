import type {
  ActiveActionSet,
  CanonicalGameAction,
  CompactBuildAction,
  GameMasterActionParameters,
  LoadoutBuildState,
  ValidationIssue,
} from '../../schemas/src/index.js'
import { canonicalPartIdFromCompact } from './compactPartAliases.js'

export type ResolvedCompactBuildAction = {
  canonicalAction: CanonicalGameAction
  parameters?: GameMasterActionParameters
}

export type ResolveCompactBuildActionInput = {
  actionSet: ActiveActionSet
  buildState: LoadoutBuildState
  command: CompactBuildAction
}

type CompactResolverResult =
  | { ok: true; value: ResolvedCompactBuildAction }
  | { ok: false; issues: ValidationIssue[] }

// Compact build actions never gain their own legality system: they only
// resolve into a canonical action from the active server-authored action set
// and then flow through the existing applyLoadoutAction validation path.
export function resolveCompactBuildAction(input: ResolveCompactBuildActionInput): CompactResolverResult {
  const actions = Object.values(input.actionSet.actions)
  const command = input.command
  const matches = actions.filter((action) => matchesCompactCommand(action, command))

  if (matches.length === 0) {
    return {
      ok: false,
      issues: [
        {
          code: 'COMPACT_ACTION_NOT_AVAILABLE',
          path: 'buildActionSubmission.command',
          message: `${command.kind} does not match any currently legal build action for this packet.`,
        },
      ],
    }
  }

  if (matches.length > 1) {
    return {
      ok: false,
      issues: [
        {
          code: 'AMBIGUOUS_COMPACT_ACTION',
          path: 'buildActionSubmission.command',
          message: `${command.kind} matches ${matches.length} legal build actions; the compact command must be unambiguous.`,
        },
      ],
    }
  }

  const canonicalAction = matches[0]

  if (command.kind === 'mount_part') {
    const childPartId = input.buildState.selectedPartId
    const parentInstanceId = input.buildState.selectedAttachTargetId

    if (!childPartId || !parentInstanceId) {
      return {
        ok: false,
        issues: [
          {
            code: 'INCOMPLETE_PLACEMENT',
            path: 'buildActionSubmission.command',
            message: 'mount_part requires a selected part and attachment target on the server build state.',
          },
        ],
      }
    }

    return {
      ok: true,
      value: {
        canonicalAction,
        parameters: {
          childPartId,
          parentInstanceId,
          mountSurfaceId: command.surface,
          u: command.u,
          v: command.v,
          yawDegrees: command.yaw ?? 0,
          rollDegrees: command.roll ?? 0,
        },
      },
    }
  }

  return { ok: true, value: { canonicalAction } }
}

function matchesCompactCommand(action: CanonicalGameAction, command: CompactBuildAction): boolean {
  const payload = action.payload as {
    type?: string
    partId?: string
    instanceId?: string
    rotation?: number
    targetInstanceId?: string
  }

  switch (command.kind) {
    case 'choose_part':
      return (
        payload.type === 'choose_part' &&
        payload.partId === canonicalPartIdFromCompact(command.part)
      )
    case 'remove_part':
      return payload.type === 'remove_part' && payload.instanceId === command.id
    case 'remove_subtree':
      return payload.type === 'remove_subtree' && payload.instanceId === command.id
    case 'move_part':
      return payload.type === 'move_part' && payload.instanceId === command.id
    case 'rotate_part':
      return (
        payload.type === 'rotate_part' &&
        payload.instanceId === command.id &&
        payload.rotation === command.rot
      )
    case 'cancel_build_selection':
      return payload.type === 'cancel_build_selection'
    case 'confirm_loadout':
      return payload.type === 'confirm_loadout'
    case 'choose_attach_target':
      return payload.type === 'choose_attach_target' && payload.targetInstanceId === command.target
    case 'mount_part':
      return payload.type === 'propose_mount_pose'
    default:
      return false
  }
}
