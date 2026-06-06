import { getPart } from '../../../../packages/catalog/src/index.js'
import type {
  PartDefinition,
  RoundPlanSubmission,
  RoundPlanSubmissionV1,
  TurnCommand,
} from '../../../../packages/schemas/src/index.js'
import { createBaselineRoundPlan } from '../../../../packages/schemas/src/index.js'
import { safeNumber } from './roundPlanDraftNumbers'
import type {
  DraftSummary,
  PurchaseDraft,
  RoundPlanDraft,
} from './roundPlanDraftTypes'

export { normalizeSubmissionForDraft } from './roundPlanSubmissionNormalization'
export type {
  BlueprintBlockDraft,
  DraftSummary,
  PurchaseDraft,
  RoundPlanDraft,
  TurnCommandDraft,
} from './roundPlanDraftTypes'

export function createEmptySubmission(): RoundPlanSubmission {
  return {
    action: 'submit_round_plan',
    purchases: [],
    blueprint: {
      name: '',
      blocks: [],
    },
    turnPlan: {
      commands: [],
    },
  }
}

export function createSampleSubmission(): RoundPlanSubmission {
  return createBaselineRoundPlan()
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
