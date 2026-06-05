import { getPart } from '../../../../packages/catalog/src/index.js'
import { MOVEMENT_COMMANDS } from '../../../../packages/schemas/src/index.js'
import type {
  MovementCommand,
  PartDefinition,
  RoundPlanSubmission,
  RoundPlanSubmissionV1,
  TurnCommand,
  TurnPlan,
  UtilityCommand,
  WeaponCommand,
} from '../../../../packages/schemas/src/index.js'

export type PurchaseDraft = {
  partId: string
  quantity: string
}

export type BlueprintBlockDraft = {
  id: string
  partId: string
  positionX: string
  positionY: string
  positionZ: string
  rotationX: string
  rotationY: string
  rotationZ: string
  label: string
}

export type TurnCommandDraft = {
  tick: string
  move: '' | MovementCommand
  weaponA: '' | WeaponCommand
  weaponB: '' | WeaponCommand
  utility: '' | UtilityCommand
}

export type RoundPlanDraft = {
  purchases: PurchaseDraft[]
  blueprintName: string
  blueprintBlocks: BlueprintBlockDraft[]
  turnCommands: TurnCommandDraft[]
  rationale: string
}

export type DraftSummary = {
  blockCount: number
  commandCount: number
  mobilityParts: number
  purchaseCost: number
  remainingGold?: number
  weaponParts: number
}

export function createSampleSubmission(): RoundPlanSubmission {
  return {
    action: 'submit_round_plan',
    purchases: [
      { partId: 'Body_Square_Medium', quantity: 1 },
      { partId: 'Wheel_Large', quantity: 2 },
      { partId: 'Weapon_Spinner_Small', quantity: 1 },
    ],
    blueprint: {
      name: 'Baseline Spinner',
      blocks: [
        { id: 'core', partId: 'Body_Square_Medium', position: [0, 0, 0], rotation: [0, 0, 0] },
        { id: 'leftWheel', partId: 'Wheel_Large', position: [-1, 0, 0], rotation: [0, 0, 90] },
        { id: 'rightWheel', partId: 'Wheel_Large', position: [1, 0, 0], rotation: [0, 0, 90] },
        { id: 'spinner', partId: 'Weapon_Spinner_Small', position: [0, 0, 1], rotation: [0, 0, 0] },
      ],
    },
    turnPlan: {
      commands: [
        { tick: 1, move: 'dash_forward', weaponA: 'hold' },
        { tick: 2, move: 'circle_left', weaponA: 'fire' },
        { tick: 3, move: 'strafe_right', weaponA: 'hold' },
        { tick: 4, move: 'dash_backward', weaponA: 'fire' },
        { tick: 5, move: 'circle_right', weaponA: 'hold' },
      ],
    },
    rationale: 'A compact baseline that keeps budget clear and produces repeatable timing.',
  }
}

export function createDraftFromSubmission(submission: RoundPlanSubmission): RoundPlanDraft {
  const turnPlan = 'turnPlan' in submission
    ? submission.turnPlan
    : submission.openingScript ?? { commands: [] }

  return {
    purchases: submission.purchases.map((purchase) => ({
      partId: purchase.partId,
      quantity: String(purchase.quantity),
    })),
    blueprintName: submission.blueprint.name,
    blueprintBlocks: submission.blueprint.blocks.map((block) => ({
      id: block.id,
      partId: block.partId,
      positionX: String(block.position[0]),
      positionY: String(block.position[1]),
      positionZ: String(block.position[2]),
      rotationX: String(block.rotation[0]),
      rotationY: String(block.rotation[1]),
      rotationZ: String(block.rotation[2]),
      label: block.label ?? '',
    })),
    turnCommands: turnPlan.commands.map((command) => ({
      tick: String(command.tick),
      move: command.move ?? '',
      weaponA: command.weaponA ?? '',
      weaponB: command.weaponB ?? '',
      utility: command.utility ?? '',
    })),
    rationale: submission.rationale ?? '',
  }
}

export function parseSubmissionText(input: string): RoundPlanSubmission {
  const value = JSON.parse(input) as unknown

  if (!value || typeof value !== 'object') {
    throw new Error('Submission must be a JSON object.')
  }

  return value as RoundPlanSubmission
}

export function normalizeSubmissionForDraft(submission: RoundPlanSubmission): RoundPlanSubmission {
  const value = submission as {
    purchases?: unknown
    blueprint?: unknown
    turnPlan?: unknown
    openingScript?: unknown
    rationale?: unknown
  }
  const blueprint = normalizeBlueprint(value.blueprint)
  const turnPlan = normalizeTurnPlan(value.turnPlan ?? value.openingScript)

  return {
    action: 'submit_round_plan',
    purchases: normalizePurchases(value.purchases),
    blueprint,
    turnPlan,
    rationale:
      typeof value.rationale === 'string' && value.rationale.trim().length > 0
        ? value.rationale.trim()
        : undefined,
  }
}

export function buildSubmissionFromDraft(draft: RoundPlanDraft): RoundPlanSubmissionV1 {
  return {
    action: 'submit_round_plan',
    purchases: draft.purchases
      .map((purchase) => ({
        partId: purchase.partId.trim(),
        quantity: Math.max(0, Math.trunc(safeNumber(purchase.quantity, 0))),
      }))
      .filter((purchase) => purchase.partId && purchase.quantity > 0),
    blueprint: {
      name: draft.blueprintName.trim() || 'Blueprint',
      blocks: draft.blueprintBlocks
        .filter((block) => block.partId.trim())
        .map((block, index) => ({
          id: block.id.trim() || `block_${index + 1}`,
          partId: block.partId.trim(),
          position: [
            safeNumber(block.positionX, 0),
            safeNumber(block.positionY, 0),
            safeNumber(block.positionZ, 0),
          ],
          rotation: [
            safeNumber(block.rotationX, 0),
            safeNumber(block.rotationY, 0),
            safeNumber(block.rotationZ, 0),
          ],
          ...(block.label.trim() ? { label: block.label.trim() } : {}),
        })),
    },
    turnPlan: {
      commands: draft.turnCommands
        .map((command, index) => {
          const next: TurnCommand = {
            tick: Math.max(1, Math.trunc(safeNumber(command.tick, index + 1))),
          }

          if (command.move) {
            next.move = command.move
          }

          if (command.weaponA) {
            next.weaponA = command.weaponA
          }

          if (command.weaponB) {
            next.weaponB = command.weaponB
          }

          if (command.utility) {
            next.utility = command.utility
          }

          return next
        }),
    },
    ...(draft.rationale.trim() ? { rationale: draft.rationale.trim() } : {}),
  }
}

export function summarizeDraft(draft: RoundPlanDraft, availableGold: number | undefined): DraftSummary {
  const purchaseCost = draft.purchases.reduce((total, purchase) => {
    const part = getPart(purchase.partId)
    const quantity = Math.max(0, Math.trunc(safeNumber(purchase.quantity, 0)))

    return total + (part?.cost ?? 0) * quantity
  }, 0)
  const blueprintParts = draft.blueprintBlocks
    .map((block) => getPart(block.partId))
    .filter((part): part is PartDefinition => Boolean(part))

  return {
    blockCount: draft.blueprintBlocks.filter((block) => block.partId.trim()).length,
    commandCount: draft.turnCommands.length,
    mobilityParts: blueprintParts.filter((part) => Boolean(part.controls?.movement)).length,
    purchaseCost,
    remainingGold: availableGold === undefined ? undefined : availableGold - purchaseCost,
    weaponParts: blueprintParts.filter((part) => Boolean(part.controls?.weapon)).length,
  }
}

export function purchaseCostLabel(purchase: PurchaseDraft): string {
  const part = getPart(purchase.partId)
  const quantity = Math.max(0, Math.trunc(safeNumber(purchase.quantity, 0)))

  if (!part || quantity <= 0) {
    return '-'
  }

  return `${part.cost * quantity}g`
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

          const partValue = item as { id?: unknown; partId?: unknown; label?: unknown; position?: unknown; rotation?: unknown }
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

function normalizeTurnPlan(value: unknown): TurnPlan {
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

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}
