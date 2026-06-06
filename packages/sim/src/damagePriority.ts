import type { PartCategory } from '../../schemas/src/index.js'

export type DamagePriorityPart = {
  blockId: string
  category: PartCategory
  health: number
}

const DEFAULT_DAMAGE_CATEGORY_PRIORITY: readonly PartCategory[] = [
  'defense',
  'weapon',
  'mobility',
  'utility',
  'style',
  'body',
]

const DAMAGE_CATEGORY_PRIORITIES: Partial<Record<string, readonly PartCategory[]>> = {
  drone: ['utility', 'weapon', 'mobility', 'defense', 'style', 'body'],
  hazard: ['mobility', 'defense', 'utility', 'weapon', 'style', 'body'],
  ram: ['defense', 'mobility', 'weapon', 'utility', 'style', 'body'],
}

const DEFAULT_DAMAGE_CATEGORY_RANK = createCategoryRank(DEFAULT_DAMAGE_CATEGORY_PRIORITY)
const DAMAGE_CATEGORY_RANKS: Partial<Record<string, ReadonlyMap<PartCategory, number>>> = {
  drone: createCategoryRank(DAMAGE_CATEGORY_PRIORITIES.drone ?? DEFAULT_DAMAGE_CATEGORY_PRIORITY),
  hazard: createCategoryRank(DAMAGE_CATEGORY_PRIORITIES.hazard ?? DEFAULT_DAMAGE_CATEGORY_PRIORITY),
  ram: createCategoryRank(DAMAGE_CATEGORY_PRIORITIES.ram ?? DEFAULT_DAMAGE_CATEGORY_PRIORITY),
}

export function damageCategoryPriorityFor(cause: string): readonly PartCategory[] {
  return DAMAGE_CATEGORY_PRIORITIES[cause] ?? DEFAULT_DAMAGE_CATEGORY_PRIORITY
}

export function compareDamageTargets(
  left: DamagePriorityPart,
  right: DamagePriorityPart,
  cause: string,
  tick: number,
): number {
  const categoryRank = DAMAGE_CATEGORY_RANKS[cause] ?? DEFAULT_DAMAGE_CATEGORY_RANK
  const rankDelta =
    (categoryRank.get(left.category) ?? 99) -
    (categoryRank.get(right.category) ?? 99)

  if (rankDelta !== 0) {
    return rankDelta
  }

  if (left.health !== right.health) {
    return left.health - right.health
  }

  return stablePartOrder(left.blockId, tick) - stablePartOrder(right.blockId, tick)
}

export function stablePartOrder(blockId: string, tick: number): number {
  let hash = tick

  for (let index = 0; index < blockId.length; index += 1) {
    hash = (hash * 33 + blockId.charCodeAt(index)) >>> 0
  }

  return hash
}

function createCategoryRank(
  priority: readonly PartCategory[],
): ReadonlyMap<PartCategory, number> {
  return new Map(priority.map((category, index) => [category, index]))
}
