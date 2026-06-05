import type {
  MovementCommand,
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
