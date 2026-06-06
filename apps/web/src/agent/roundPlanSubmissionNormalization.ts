import { MOVEMENT_COMMANDS } from '../../../../packages/schemas/src/index.js'
import type {
  BotTactics,
  MovementCommand,
  OpeningScript,
  RoundPlanSubmission,
  TurnCommand,
  UtilityCommand,
  WeaponCommand,
} from '../../../../packages/schemas/src/index.js'
import { safeNumber } from './roundPlanDraftNumbers'

const DEFAULT_NORMALIZED_TACTICS: BotTactics = {
  style: 'balanced',
  targetPriority: 'closest',
  preferredRange: 'close',
  movementPolicy: 'close',
  aggression: 0.65,
  retreatAtHealthPct: 0.2,
  weaponCadence: 'opportunistic',
  hazardPreference: 'avoid',
}

export function normalizeSubmissionForDraft(submission: RoundPlanSubmission): RoundPlanSubmission {
  const value = submission as {
    purchases?: unknown
    blueprint?: unknown
    openingScript?: unknown
    tactics?: unknown
    rationale?: unknown
  }
  const blueprint = normalizeBlueprint(value.blueprint)
  const openingScript = normalizeOpeningScript(value.openingScript)

  return {
    action: 'submit_round_plan',
    schemaVersion: 2,
    purchases: normalizePurchases(value.purchases),
    blueprint,
    tactics: normalizeTactics(value.tactics),
    openingScript,
    rationale:
      typeof value.rationale === 'string' && value.rationale.trim().length > 0
        ? value.rationale.trim()
        : undefined,
  }
}

function normalizeTactics(value: unknown): BotTactics {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_NORMALIZED_TACTICS }
  }

  return {
    ...DEFAULT_NORMALIZED_TACTICS,
    ...(value as BotTactics),
  }
}

function normalizePurchases(value: unknown): RoundPlanSubmission['purchases'] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return undefined
      }

      const purchase = item as { partId?: unknown; quantity?: unknown }
      const partId = typeof purchase.partId === 'string' ? purchase.partId.trim() : ''
      const quantity = safeNumber(purchase.quantity, 0)

      if (!partId || quantity <= 0) {
        return undefined
      }

      return {
        partId,
        quantity,
      }
    })
    .filter((item): item is { partId: string; quantity: number } => item !== undefined)
}

function normalizeBlueprint(value: unknown): RoundPlanSubmission['blueprint'] {
  const raw = value && typeof value === 'object' ? (value as { name?: unknown; blocks?: unknown }) : {}
  const name =
    typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : 'Blueprint'

  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks
        .map((item, index) => {
          if (!item || typeof item !== 'object') {
            return undefined
          }

          const partValue = item as {
            id?: unknown
            partId?: unknown
            label?: unknown
            position?: unknown
            rotation?: unknown
          }
          const partId = typeof partValue.partId === 'string' ? partValue.partId.trim() : ''
          const blockId =
            typeof partValue.id === 'string' && partValue.id.trim().length > 0
              ? partValue.id.trim()
              : `block_${index + 1}`
          const label =
            typeof partValue.label === 'string' && partValue.label.trim().length > 0
              ? partValue.label.trim()
              : undefined

          if (!partId) {
            return undefined
          }

          const positionValue =
            partValue.position && typeof partValue.position === 'object' && Array.isArray(partValue.position)
              ? partValue.position
              : []
          const rotationValue =
            partValue.rotation && typeof partValue.rotation === 'object' && Array.isArray(partValue.rotation)
              ? partValue.rotation
              : []

          const block = {
            id: blockId,
            partId,
            position: asVector3(positionValue),
            rotation: asVector3(rotationValue),
            ...(label ? { label } : {}),
          }

          return block
        })
        .filter(
          (
            item,
          ): item is {
            id: string
            partId: string
            position: [number, number, number]
            rotation: [number, number, number]
            label?: string
          } => item !== undefined,
        )
    : []

  return {
    name,
    blocks,
  }
}

function asVector3(value: unknown[]): [number, number, number] {
  return [
    safeNumber(value[0], 0),
    safeNumber(value[1], 0),
    safeNumber(value[2], 0),
  ]
}

function normalizeOpeningScript(value: unknown): OpeningScript {
  if (!value || typeof value !== 'object') {
    return { commands: [] }
  }

  const raw = value as { commands?: unknown }
  if (!Array.isArray(raw.commands)) {
    return { commands: [] }
  }

  return {
    commands: raw.commands
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return undefined
        }

        const command = item as {
          tick?: unknown
          move?: unknown
          weaponA?: unknown
          weaponB?: unknown
          utility?: unknown
        }
        const next: TurnCommand = {
          tick: Math.max(1, Math.trunc(safeNumber(command.tick, index + 1))),
        }

        if (isMovementCommand(command.move)) {
          next.move = command.move
        }

        if (isWeaponCommand(command.weaponA)) {
          next.weaponA = command.weaponA
        }

        if (isWeaponCommand(command.weaponB)) {
          next.weaponB = command.weaponB
        }

        if (isUtilityCommand(command.utility)) {
          next.utility = command.utility
        }

        return next
      })
      .filter((item): item is TurnCommand => item !== undefined),
  }
}

function isMovementCommand(value: unknown): value is MovementCommand {
  return MOVEMENT_COMMANDS.includes(value as MovementCommand)
}

function isWeaponCommand(value: unknown): value is WeaponCommand {
  return value === 'fire' || value === 'hold'
}

function isUtilityCommand(value: unknown): value is UtilityCommand {
  return value === 'activate' || value === 'hold'
}
