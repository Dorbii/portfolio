import type {
  BotBlueprint,
  GeneratedControls,
  PartDefinition,
} from '../../schemas/src/index.js'
import { PART_CATALOG } from './parts.js'

export function deriveControls(
  blueprint: BotBlueprint,
  catalog: PartDefinition[] = PART_CATALOG,
): GeneratedControls {
  const parts = new Map(catalog.map((part) => [part.id, part]))
  const blockParts = blueprint.blocks
    .map((block) => parts.get(block.partId))
    .filter((part): part is PartDefinition => Boolean(part))

  const hasMovement = blockParts.some((part) => part.controls?.movement)
  const weaponCount = blockParts.filter((part) => part.controls?.weapon).length
  const hasUtility = blockParts.some((part) => part.controls?.utility)

  return {
    movement: hasMovement
      ? ['forward', 'backward', 'turn_left', 'turn_right', 'brake']
      : ['brake'],
    ...(weaponCount >= 1 ? { weaponA: ['fire', 'hold'] } : {}),
    ...(weaponCount >= 2 ? { weaponB: ['fire', 'hold'] } : {}),
    ...(hasUtility ? { utility: ['activate', 'hold'] } : {}),
  }
}
