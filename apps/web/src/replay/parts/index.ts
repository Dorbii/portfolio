import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { getPart } from '../../../../../packages/catalog/src/index.js'
import type {
  BotBlueprint,
  BlueprintBlock,
  MachineDesign,
  OrientationBasis,
  TeamRole,
} from '../../../../../packages/schemas/src/index.js'
import { createBodyPart } from './body'
import { createBotFoundation } from '../bots/foundation'
import {
  BOT_CELL_SCALE,
  LEGACY_REPLAY_VISUAL_AUTHORITY,
  MACHINE_REPLAY_VISUAL_AUTHORITY,
  type MachineReplayRenderPart,
  heightForCategory,
  measureBotBounds,
  measureMachineReplayBounds,
  projectMachineDesignToReplayRenderParts,
  resolveFoundationArchetype,
} from '../bots/geometry'
import { createDefensePart } from './defense'
import {
  createBoxDetail,
  createSolidBlock,
  degreesToRadians,
} from '../rendering/meshHelpers'
import { createMobilityPart } from './mobility'
import {
  materialForTextureProfile,
} from '../rendering/materials'
import type {
  BotPartChildMaterialRole,
  DamageMaterialByRole,
  TeamMaterialSet,
} from '../rendering/materials'
import { createPartAccents } from './details'
import { createStylePart } from './style'
import { createUtilityPart } from './utility'
import { createWeaponPart } from './weapon'
import {
  resolvePartVisualProfile,
  type ResolvedPartVisualProfile,
} from './visualProfiles'

export { createTeamMaterials, type TeamMaterialSet } from '../rendering/materials'
export {
  resolvePartAnimationProfile,
  resolvePartDamageProfile,
  resolvePartRenderProfile,
  resolvePartTextureProfile,
  resolvePartVisualProfile,
} from './visualProfiles'

const MAX_RENDERED_BLOCKS = 48

type BotPartRoleMaterialNames = Record<BotPartChildMaterialRole, string[]>

export type BotPartNodeMetadata = {
  kind: 'bot_part'
  blockId: string
  partId: string
  visualAuthority: typeof MACHINE_REPLAY_VISUAL_AUTHORITY | typeof LEGACY_REPLAY_VISUAL_AUTHORITY
  primaryMaterialName: string
  damageMaterials: DamageMaterialByRole
  visualProfile: ResolvedPartVisualProfile
  roleMaterialNames: BotPartRoleMaterialNames
  basePosition: [number, number, number]
  baseRotation: [number, number, number]
  baseRotationQuaternion?: [number, number, number, number]
  machineOrientation?: OrientationBasis
  machineDetached?: boolean
}

export function createBotNode(
  scene: Scene,
  blueprint: BotBlueprint,
  role: TeamRole,
  materials: TeamMaterialSet,
  machineDesign?: MachineDesign,
): TransformNode {
  if (machineDesign) {
    return createMachineReplayBotNode(scene, machineDesign, role, materials)
  }

  return createLegacyReplayBotBlueprintAdapterNode(scene, blueprint, role, materials)
}

export function createLegacyReplayBotBlueprintAdapterNode(
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

export function createMachineReplayBotNode(
  scene: Scene,
  machineDesign: MachineDesign,
  role: TeamRole,
  materials: TeamMaterialSet,
): TransformNode {
  const root = new TransformNode(`${role}-bot-root`, scene)
  const machineParts = projectMachineDesignToReplayRenderParts(machineDesign)
    .slice(0, MAX_RENDERED_BLOCKS)
  const bounds = measureMachineReplayBounds(machineParts)
  const boundsMarker = createBoxDetail(
    scene,
    root,
    materials.trim,
    `${role}-machine-bounds-marker`,
    Math.max(0.04, bounds.width * 0.04),
    0.035,
    Math.max(0.04, bounds.depth * 0.04),
    bounds.centerX,
    0.08,
    bounds.centerZ,
  )

  boundsMarker.visibility = 0.28
  boundsMarker.isPickable = false

  machineParts.forEach((part) => {
    const partNode = createMachinePartNode(scene, part, role, materials)
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
  return createVisualPartNode(scene, {
    id: block.id,
    partId: block.partId,
    position: block.position,
    role,
    materials,
    visualAuthority: LEGACY_REPLAY_VISUAL_AUTHORITY,
    rotation: [
      degreesToRadians(block.rotation[0]),
      degreesToRadians(block.rotation[1]),
      degreesToRadians(block.rotation[2]),
    ],
  })
}

function createMachinePartNode(
  scene: Scene,
  part: MachineReplayRenderPart,
  role: TeamRole,
  materials: TeamMaterialSet,
): TransformNode {
  return createVisualPartNode(scene, {
    id: part.instanceId,
    partId: part.partId,
    position: part.position,
    role,
    materials,
    visualAuthority: MACHINE_REPLAY_VISUAL_AUTHORITY,
    rotationQuaternion: quaternionForOrientation(part.orientation),
    machineOrientation: part.orientation,
    machineDetached: part.detached,
  })
}

function createVisualPartNode(
  scene: Scene,
  input: {
    id: string
    partId: string
    position: [number, number, number]
    role: TeamRole
    materials: TeamMaterialSet
    visualAuthority: typeof MACHINE_REPLAY_VISUAL_AUTHORITY | typeof LEGACY_REPLAY_VISUAL_AUTHORITY
    rotation?: [number, number, number]
    rotationQuaternion?: Quaternion
    machineOrientation?: OrientationBasis
    machineDetached?: boolean
  },
): TransformNode {
  const {
    id,
    partId,
    position,
    role,
    materials,
    visualAuthority,
    rotation = [0, 0, 0],
    rotationQuaternion,
    machineOrientation,
    machineDetached,
  } = input
  const part = getPart(partId)
  const category = part?.category ?? 'body'
  const size = part?.size ?? [1, 1, 1]
  const visualFamily = part?.visual.visualFamily
  const visualProfile = resolvePartVisualProfile(part)
  const partNode = new TransformNode(`${role}-${id}`, scene)
  const width = Math.max(0.22, size[0] * BOT_CELL_SCALE)
  const height = heightForCategory(category, size[1])
  const depth = Math.max(0.22, size[2] * BOT_CELL_SCALE)

  partNode.position = new Vector3(
    position[0] * BOT_CELL_SCALE,
    0.24 + position[1] * BOT_CELL_SCALE,
    position[2] * BOT_CELL_SCALE,
  )
  if (rotationQuaternion) {
    partNode.rotationQuaternion = rotationQuaternion.clone()
  } else {
    partNode.rotation = new Vector3(rotation[0], rotation[1], rotation[2])
  }
  const material = materialForTextureProfile(materials, visualProfile.textureProfile, category)

  partNode.metadata = {
    kind: 'bot_part',
    blockId: id,
    partId,
    visualAuthority,
    primaryMaterialName: material.name,
    damageMaterials: materials.damageByRole,
    visualProfile,
    roleMaterialNames: createRoleMaterialNames(material.name, materials),
    basePosition: [partNode.position.x, partNode.position.y, partNode.position.z],
    baseRotation: rotation,
    ...(rotationQuaternion ? { baseRotationQuaternion: quaternionTuple(rotationQuaternion) } : {}),
    ...(machineOrientation ? { machineOrientation } : {}),
    ...(machineDetached !== undefined ? { machineDetached } : {}),
  } satisfies BotPartNodeMetadata

  if (category === 'body') {
    createBodyPart(scene, partNode, material, partId, width, height, depth, materials)
  } else if (category === 'mobility') {
    createMobilityPart(scene, partNode, material, role, id, partId, width, height, depth, materials)
  } else if (category === 'weapon') {
    createWeaponPart(scene, partNode, material, role, id, partId, width, height, depth, materials)
  } else if (category === 'defense') {
    createDefensePart(scene, partNode, material, role, id, partId, width, height, depth, materials)
  } else if (category === 'utility') {
    createUtilityPart(scene, partNode, material, role, id, partId, width, height, depth, materials)
  } else if (category === 'style') {
    createStylePart(scene, partNode, material, role, id, partId, materials)
  } else {
    createSolidBlock(scene, partNode, material, `${role}-${id}-box`, width, height, depth)
  }

  if (
    category !== 'style' &&
    visualFamily !== 'ai_module' &&
    visualFamily !== 'anchor' &&
    visualFamily !== 'coolant_tank' &&
    visualFamily !== 'energy_core' &&
    visualFamily !== 'fuel_tank' &&
    visualFamily !== 'gyro' &&
    visualFamily !== 'magnet' &&
    visualFamily !== 'turret' &&
    visualFamily !== 'net' &&
    visualFamily !== 'radar'
  ) {
    createPartAccents(scene, partNode, role, id, category, width, height, depth, materials)
  }

  return partNode
}

function quaternionForOrientation(orientation: OrientationBasis): Quaternion {
  return Quaternion.FromLookDirectionLH(
    toVector3(orientation.forward),
    toVector3(orientation.up),
  )
}

function toVector3(vector: [number, number, number]): Vector3 {
  return new Vector3(vector[0], vector[1], vector[2])
}

function quaternionTuple(quaternion: Quaternion): [number, number, number, number] {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
}

function createRoleMaterialNames(
  primaryMaterialName: string,
  materials: TeamMaterialSet,
): BotPartRoleMaterialNames {
  return {
    damageable: [
      primaryMaterialName,
      materials.chassis.name,
      materials.armor.name,
      materials.utility.name,
      materials.profile.painted_chipped_armor.name,
      materials.profile.dirty_electrical_casing.name,
      materials.profile.burnt_critical_metal.name,
    ],
    rubber: [
      materials.rubber.name,
      materials.mobility.name,
      materials.profile.scuffed_rubber.name,
    ],
    glass: [
      materials.profile.emissive_led_glass.name,
    ],
    emissive: [
      materials.light.name,
    ],
    trim: [
      materials.trim.name,
      materials.warning.name,
      materials.profile.scraped_style_shell.name,
    ],
    weapon_edge: [
      materials.steel.name,
      materials.weapon.name,
      materials.profile.brushed_weapon_steel.name,
    ],
  }
}
