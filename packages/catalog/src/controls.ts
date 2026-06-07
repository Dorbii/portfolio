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
    .map((block) => ({ block, part: parts.get(block.partId) }))
    .filter((entry): entry is { block: BotBlueprint['blocks'][number], part: PartDefinition } => Boolean(entry.part))

  const hasMovement = blockParts.some(({ part }) => part.controls?.movement)
  const weaponCount = blockParts.filter(({ part }) => part.controls?.weapon).length
  const hasUtility = blockParts.some(({ block, part }) => (
    part.controls?.utility ||
    (block.signatureEffectActive && part.signatureEffect?.trigger === 'activated')
  ))

  return {
    movement: hasMovement
      ? [
          'forward',
          'backward',
          'dash_forward',
          'dash_backward',
          'strafe_left',
          'strafe_right',
          'circle_left',
          'circle_right',
          'turn_left',
          'turn_right',
          'brake',
        ]
      : ['brake'],
    ...(weaponCount >= 1 ? { weaponA: ['fire', 'hold'] } : {}),
    ...(weaponCount >= 2 ? { weaponB: ['fire', 'hold'] } : {}),
    ...(hasUtility ? { utility: ['activate', 'hold'] } : {}),
  }
}
