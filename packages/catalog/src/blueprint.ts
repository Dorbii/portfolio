import type {
  BotBlueprint,
  InventoryItem,
  PartDefinition,
  ValidationIssue,
  ValidationResult,
  Vector3,
} from '../../schemas/src/index.js'
import { validateBlueprintShape } from '../../schemas/src/index.js'
import { inventoryToCounts } from './inventory.js'
import { PART_CATALOG } from './parts.js'

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message }
}

function positionKey(position: Vector3): string {
  return position.join(',')
}

function distance(left: Vector3, right: Vector3): number {
  return (
    Math.abs(left[0] - right[0]) +
    Math.abs(left[1] - right[1]) +
    Math.abs(left[2] - right[2])
  )
}

function isLegacyBlueprintGridConnected(blueprint: BotBlueprint): boolean {
  if (blueprint.blocks.length <= 1) {
    return true
  }

  const visited = new Set<string>()
  const queue = [blueprint.blocks[0]]

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current) {
      continue
    }

    visited.add(current.id)

    for (const candidate of blueprint.blocks) {
      if (visited.has(candidate.id)) {
        continue
      }

      if (distance(current.position, candidate.position) === 1) {
        visited.add(candidate.id)
        queue.push(candidate)
      }
    }
  }

  return visited.size === blueprint.blocks.length
}

export function validateBlueprintAssembly(
  blueprint: BotBlueprint,
  inventory: InventoryItem[],
  catalog: PartDefinition[] = PART_CATALOG,
): ValidationResult {
  const shapeResult = validateBlueprintShape(blueprint)
  const issues: ValidationIssue[] = []

  if (!shapeResult.ok) {
    issues.push(...shapeResult.issues)
    return { ok: false, issues }
  }

  const parts = new Map(catalog.map((part) => [part.id, part]))
  const inventoryCounts = inventoryToCounts(inventory)
  const usedCounts = new Map<string, number>()
  const occupied = new Set<string>()
  let bodyCount = 0

  blueprint.blocks.forEach((block, index) => {
    const path = `blueprint.blocks.${index}`
    const definition = parts.get(block.partId)

    if (!definition) {
      issues.push(
        issue(
          'UNKNOWN_PART',
          `${path}.partId`,
          `Part ${block.partId} is not in the catalog.`,
        ),
      )
      return
    }

    if (definition.category === 'body') {
      bodyCount += 1
    }

    const key = positionKey(block.position)

    if (occupied.has(key)) {
      issues.push(
        issue('OCCUPIED_GRID_CELL', `${path}.position`, `Grid cell ${key} is occupied.`),
      )
    }

    occupied.add(key)
    usedCounts.set(block.partId, (usedCounts.get(block.partId) ?? 0) + 1)
  })

  if (bodyCount === 0) {
    issues.push(
      issue(
        'MISSING_BODY',
        'blueprint.blocks',
        'Blueprint needs at least one body/chassis part so the resolver has a core.',
      ),
    )
  }

  for (const [partId, used] of usedCounts) {
    const owned = inventoryCounts.get(partId) ?? 0

    if (used > owned) {
      issues.push(
        issue(
          'INSUFFICIENT_INVENTORY',
          'blueprint.blocks',
          `Blueprint uses ${used} ${partId}, but inventory owns ${owned}.`,
        ),
      )
    }
  }

  if (!isLegacyBlueprintGridConnected(blueprint)) {
    issues.push(
      issue(
        'DISCONNECTED_BLUEPRINT',
        'blueprint.blocks',
        'All blocks must be connected by adjacent grid cells.',
      ),
    )
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues }
}
