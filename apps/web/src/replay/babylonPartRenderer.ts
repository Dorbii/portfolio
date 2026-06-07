import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { getPart } from '../../../../packages/catalog/src/index.js'
import type {
  BotBlueprint,
  BlueprintBlock,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { createBodyPart } from './babylonBodyParts'
import { createBotFoundation } from './babylonBotFoundation'
import {
  BOT_CELL_SCALE,
  heightForCategory,
  measureBotBounds,
  resolveFoundationArchetype,
} from './babylonBotGeometry'
import { createDefensePart } from './babylonDefenseParts'
import {
  createSolidBlock,
  degreesToRadians,
} from './babylonMeshHelpers'
import { createMobilityPart } from './babylonMobilityParts'
import { materialForCategory } from './babylonMaterials'
import type {
  DamageMaterialSet,
  TeamMaterialSet,
} from './babylonMaterials'
import { createPartAccents } from './babylonPartDetails'
import { createStylePart } from './babylonStyleParts'
import { createUtilityPart } from './babylonUtilityParts'
import { createWeaponPart } from './babylonWeaponParts'

export { createTeamMaterials, type TeamMaterialSet } from './babylonMaterials'

const MAX_RENDERED_BLOCKS = 48

export type BotPartNodeMetadata = {
  kind: 'bot_part'
  blockId: string
  partId: string
  primaryMaterialName: string
  damageMaterials: DamageMaterialSet
  basePosition: [number, number, number]
  baseRotation: [number, number, number]
}

export function createBotNode(
  scene: Scene,
  blueprint: BotBlueprint,
  role: TeamRole,
  materials: TeamMaterialSet,
): TransformNode {
  const root = new TransformNode(`${role}-bot-root`, scene)
  const blocks = blueprint.blocks.slice(0, MAX_RENDERED_BLOCKS)
  const bounds = measureBotBounds(blocks)
  const archetype = resolveFoundationArchetype(blocks)

  createBotFoundation(scene, root, role, materials, bounds, archetype)

  blocks.forEach((block) => {
    const partNode = createPartNode(scene, block, role, materials)
    partNode.parent = root
  })

  return root
}

export function createCatalogPartNode(
  scene: Scene,
  partId: string,
  role: TeamRole,
  materials: TeamMaterialSet,
): TransformNode {
  return createPartNode(
    scene,
    {
      id: 'catalog-part',
      partId,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
    role,
    materials,
  )
}

function createPartNode(
  scene: Scene,
  block: BlueprintBlock,
  role: TeamRole,
  materials: TeamMaterialSet,
): TransformNode {
  const part = getPart(block.partId)
  const category = part?.category ?? 'body'
  const size = part?.size ?? [1, 1, 1]
  const visualFamily = part?.visual.visualFamily
  const partNode = new TransformNode(`${role}-${block.id}`, scene)
  const width = Math.max(0.22, size[0] * BOT_CELL_SCALE)
  const height = heightForCategory(category, size[1])
  const depth = Math.max(0.22, size[2] * BOT_CELL_SCALE)

  partNode.position = new Vector3(
    block.position[0] * BOT_CELL_SCALE,
    0.24 + block.position[1] * BOT_CELL_SCALE,
    block.position[2] * BOT_CELL_SCALE,
  )
  partNode.rotation = new Vector3(
    degreesToRadians(block.rotation[0]),
    degreesToRadians(block.rotation[1]),
    degreesToRadians(block.rotation[2]),
  )
  const material = materialForCategory(materials, category)

  partNode.metadata = {
    kind: 'bot_part',
    blockId: block.id,
    partId: block.partId,
    primaryMaterialName: material.name,
    damageMaterials: materials.damage,
    basePosition: [partNode.position.x, partNode.position.y, partNode.position.z],
    baseRotation: [partNode.rotation.x, partNode.rotation.y, partNode.rotation.z],
  } satisfies BotPartNodeMetadata

  if (category === 'body') {
    createBodyPart(scene, partNode, material, block.partId, width, height, depth, materials)
  } else if (category === 'mobility') {
    createMobilityPart(scene, partNode, material, role, block.id, block.partId, width, height, depth, materials)
  } else if (category === 'weapon') {
    createWeaponPart(scene, partNode, material, role, block.id, block.partId, width, height, depth, materials)
  } else if (category === 'defense') {
    createDefensePart(scene, partNode, material, role, block.id, block.partId, width, height, depth, materials)
  } else if (category === 'utility') {
    createUtilityPart(scene, partNode, material, role, block.id, block.partId, width, height, depth, materials)
  } else if (category === 'style') {
    createStylePart(scene, partNode, material, role, block.id, block.partId, materials)
  } else {
    createSolidBlock(scene, partNode, material, `${role}-${block.id}-box`, width, height, depth)
  }

  if (
    category !== 'style' &&
    visualFamily !== 'energy_core' &&
    visualFamily !== 'gyro' &&
    visualFamily !== 'turret' &&
    visualFamily !== 'net'
  ) {
    createPartAccents(scene, partNode, role, block.id, category, width, height, depth, materials)
  }

  return partNode
}
