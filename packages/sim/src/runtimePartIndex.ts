import type { PartCategory, PartBehaviorSlot } from '../../schemas/src/index.js'
import type { PartBehaviorId } from './partBehaviors.js'

export type RuntimeIndexedPart = {
  blockId: string
  category: PartCategory
  hasUtilityControl: boolean
  hasWeaponControl: boolean
  behaviorId?: PartBehaviorId
  behaviorSlot?: PartBehaviorSlot
  health: number
}

export type BotRuntimeIndex<TPart extends RuntimeIndexedPart = RuntimeIndexedPart> = {
  aliveParts: readonly TPart[]
  behaviorPartsBySlotAndId: ReadonlyMap<string, readonly TPart[]>
  partsByBlockId: ReadonlyMap<string, TPart>
  utilityControlParts: readonly TPart[]
  weaponControlParts: readonly TPart[]
}

export function createBotRuntimeIndex<TPart extends RuntimeIndexedPart>(
  parts: readonly TPart[],
): BotRuntimeIndex<TPart> {
  const aliveParts = parts.filter((part) => part.health > 0)
  const behaviorPartsBySlotAndId = new Map<string, TPart[]>()

  for (const part of aliveParts) {
    if (part.behaviorSlot === undefined || part.behaviorId === undefined) {
      continue
    }

    const key = behaviorIndexKey(part.behaviorSlot, part.behaviorId)
    const indexedParts = behaviorPartsBySlotAndId.get(key)

    if (indexedParts) {
      indexedParts.push(part)
    } else {
      behaviorPartsBySlotAndId.set(key, [part])
    }
  }

  return {
    aliveParts,
    behaviorPartsBySlotAndId,
    partsByBlockId: new Map(parts.map((part) => [part.blockId, part])),
    utilityControlParts: aliveParts.filter((part) => part.hasUtilityControl),
    weaponControlParts: aliveParts.filter((part) => part.hasWeaponControl),
  }
}

export function getAliveBehaviorParts<TPart extends RuntimeIndexedPart>(
  index: BotRuntimeIndex<TPart>,
  slot: PartBehaviorSlot,
  ids?: readonly PartBehaviorId[],
): TPart[] {
  if (ids === undefined) {
    return index.aliveParts.filter((part) => (
      part.behaviorSlot === slot &&
      part.behaviorId !== undefined
    ))
  }

  return ids.flatMap((id) => index.behaviorPartsBySlotAndId.get(
    behaviorIndexKey(slot, id),
  ) ?? [])
}

export function hasAliveBehaviorPart(
  index: BotRuntimeIndex,
  id: PartBehaviorId,
): boolean {
  for (const part of index.aliveParts) {
    if (part.behaviorId === id) {
      return true
    }
  }

  return false
}

export function findFirstAliveBehaviorPart<TPart extends RuntimeIndexedPart>(
  index: BotRuntimeIndex<TPart>,
  ids: readonly PartBehaviorId[],
): TPart | undefined {
  return index.aliveParts.find((part) =>
    part.behaviorId !== undefined && ids.includes(part.behaviorId),
  )
}

function behaviorIndexKey(slot: PartBehaviorSlot, id: PartBehaviorId): string {
  return `${slot}:${id}`
}
