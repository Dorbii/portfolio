import type {
  InventoryItem,
  PartDefinition,
  Purchase,
  ValidationIssue,
} from '../../schemas/src/index.js'
import { validatePurchaseShape } from '../../schemas/src/index.js'
import { PART_CATALOG } from './parts.js'

export type PurchaseResult =
  | {
      ok: true
      cost: number
      goldRemaining: number
      inventory: InventoryItem[]
    }
  | {
      ok: false
      issues: ValidationIssue[]
    }

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message }
}

export function inventoryToCounts(inventory: InventoryItem[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const item of inventory) {
    counts.set(item.partId, (counts.get(item.partId) ?? 0) + item.quantity)
  }

  return counts
}

export function countsToInventory(counts: Map<string, number>): InventoryItem[] {
  return [...counts.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([partId, quantity]) => ({ partId, quantity }))
    .sort((left, right) => left.partId.localeCompare(right.partId))
}

export function applyPurchases(
  gold: number,
  inventory: InventoryItem[],
  purchases: Purchase[],
  catalog: PartDefinition[] = PART_CATALOG,
): PurchaseResult {
  const shapeResult = validatePurchaseShape(purchases)
  const issues: ValidationIssue[] = []

  if (!shapeResult.ok) {
    issues.push(...shapeResult.issues)
  }

  const parts = new Map(catalog.map((part) => [part.id, part]))
  let cost = 0

  purchases.forEach((purchase, index) => {
    const definition = parts.get(purchase.partId)

    if (!definition) {
      issues.push(
        issue(
          'UNKNOWN_PART',
          `purchases.${index}.partId`,
          `Part ${purchase.partId} is not in the catalog.`,
        ),
      )
      return
    }

    if (Number.isInteger(purchase.quantity) && purchase.quantity > 0) {
      cost += definition.cost * purchase.quantity
    }
  })

  if (cost > gold) {
    issues.push(
      issue(
        'INSUFFICIENT_GOLD',
        'purchases',
        `Purchases cost ${cost}, but only ${gold} gold is available.`,
      ),
    )
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  const counts = inventoryToCounts(inventory)

  for (const purchase of purchases) {
    counts.set(purchase.partId, (counts.get(purchase.partId) ?? 0) + purchase.quantity)
  }

  return {
    ok: true,
    cost,
    goldRemaining: gold - cost,
    inventory: countsToInventory(counts),
  }
}
