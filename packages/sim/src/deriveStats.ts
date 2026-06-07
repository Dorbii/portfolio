import { PART_CATALOG } from '../../catalog/src/index.js'
import type { BotBlueprint, PartDefinition } from '../../schemas/src/index.js'

export type BotStats = {
  armor: number
  chaos: number
  control: number
  durability: number
  footprint: number
  mass: number
  mobility: number
  stability: number
  style: number
  traction: number
  weaponThreat: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function partWeaponDamage(part: PartDefinition): number {
  return part.spec.kind === 'weapon'
    ? part.spec.damage
    : part.stats.weapon ?? 0
}

export function partWeaponRange(part: PartDefinition): number {
  return part.spec.kind === 'weapon'
    ? part.spec.range
    : 0
}

export function partMobilityMoveBudget(part: PartDefinition): number {
  return part.spec.kind === 'mobility'
    ? part.spec.moveBudget
    : part.stats.drive ?? 0
}

export function deriveBotStats(
  blueprint: BotBlueprint,
  catalog: PartDefinition[] = PART_CATALOG,
): BotStats {
  const parts = new Map(catalog.map((part) => [part.id, part]))
  const totals: BotStats = {
    armor: 0,
    chaos: 0,
    control: 0,
    durability: 0,
    footprint: 0,
    mass: 0,
    mobility: 0,
    stability: 0,
    style: 0,
    traction: 0,
    weaponThreat: 0,
  }
  const xs = new Set<number>()
  const zs = new Set<number>()

  for (const block of blueprint.blocks) {
    const part = parts.get(block.partId)

    if (!part) {
      continue
    }

    totals.mass += part.mass
    totals.durability += part.durability
    totals.armor += part.spec.kind === 'armor' ? part.spec.armor : part.stats.armor ?? 0
    totals.chaos += part.stats.chaos ?? 0
    totals.control += part.stats.control ?? 0
    totals.mobility += partMobilityMoveBudget(part)
    totals.stability += part.spec.kind === 'mobility' ? part.spec.stability : part.stats.stability ?? 0
    totals.style += part.stats.style ?? 0
    totals.traction += part.spec.kind === 'mobility' ? part.spec.traction : part.stats.traction ?? 0
    totals.weaponThreat += partWeaponDamage(part)
    xs.add(block.position[0])
    zs.add(block.position[2])
  }

  totals.footprint = Math.max(1, xs.size * zs.size)
  totals.mobility = clamp(totals.mobility - totals.mass / 18, 0, 40)
  totals.stability = clamp(
    totals.stability + totals.traction / 3 - totals.chaos / 2 - totals.footprint / 6,
    0,
    40,
  )
  totals.weaponThreat = clamp(totals.weaponThreat + totals.chaos / 3, 0, 45)
  totals.armor = clamp(totals.armor, 0, 45)
  totals.control = clamp(totals.control, 0, 40)
  totals.durability = Math.max(1, totals.durability + totals.armor * 3)

  return totals
}
