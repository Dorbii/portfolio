import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { getPart } from '../../../../packages/catalog/src/index.js'
import type {
  BotBlueprint,
  BlueprintBlock,
  PartCategory,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'

export type TeamMaterialSet = {
  chassis: StandardMaterial
  armor: StandardMaterial
  mobility: StandardMaterial
  weapon: StandardMaterial
  utility: StandardMaterial
  style: StandardMaterial
}

const CELL_SCALE = 0.58
const MAX_RENDERED_BLOCKS = 48

export function createTeamMaterials(
  scene: Scene,
): Record<TeamRole, TeamMaterialSet> {
  return {
    red: {
      chassis: createMaterial(scene, 'red-chassis', '#b83342', '#2a080d'),
      armor: createMaterial(scene, 'red-armor', '#f06471', '#26070b'),
      mobility: createMaterial(scene, 'red-mobility', '#2a2426', '#080707'),
      weapon: createMaterial(scene, 'red-weapon', '#f7c24b', '#302004'),
      utility: createMaterial(scene, 'red-utility', '#e46f4d', '#2b0d05'),
      style: createMaterial(scene, 'red-style', '#ff86a1', '#3a0d18'),
    },
    blue: {
      chassis: createMaterial(scene, 'blue-chassis', '#2469b2', '#061626'),
      armor: createMaterial(scene, 'blue-armor', '#5aa9ff', '#06172b'),
      mobility: createMaterial(scene, 'blue-mobility', '#222a31', '#070a0d'),
      weapon: createMaterial(scene, 'blue-weapon', '#f7c24b', '#302004'),
      utility: createMaterial(scene, 'blue-utility', '#50c2c8', '#082426'),
      style: createMaterial(scene, 'blue-style', '#92d8ff', '#0a2638'),
    },
  }
}

export function createBotNode(
  scene: Scene,
  blueprint: BotBlueprint,
  role: TeamRole,
  materials: TeamMaterialSet,
): TransformNode {
  const root = new TransformNode(`${role}-bot-root`, scene)

  blueprint.blocks.slice(0, MAX_RENDERED_BLOCKS).forEach((block) => {
    const partNode = createPartNode(scene, block, role, materials)
    partNode.parent = root
  })

  return root
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
  const partNode = new TransformNode(`${role}-${block.id}`, scene)
  const width = Math.max(0.22, size[0] * CELL_SCALE)
  const height = Math.max(0.2, size[1] * CELL_SCALE * 0.72)
  const depth = Math.max(0.22, size[2] * CELL_SCALE)

  partNode.position = new Vector3(
    block.position[0] * CELL_SCALE,
    0.24 + block.position[1] * CELL_SCALE,
    block.position[2] * CELL_SCALE,
  )
  partNode.rotation = new Vector3(
    degreesToRadians(block.rotation[0]),
    degreesToRadians(block.rotation[1]),
    degreesToRadians(block.rotation[2]),
  )

  const material = materialForCategory(materials, category)

  if (block.partId.includes('Cylinder')) {
    const cylinder = MeshBuilder.CreateCylinder(
      `${role}-${block.id}-cylinder`,
      { height, diameter: Math.max(width, depth), tessellation: 18 },
      scene,
    )
    attachMesh(cylinder, partNode, material)
  } else if (category === 'mobility') {
    createMobilityPart(
      scene,
      partNode,
      material,
      role,
      block.id,
      block.partId,
      width,
      height,
      depth,
    )
  } else if (category === 'weapon') {
    createWeaponPart(scene, partNode, material, role, block.id, block.partId, width, height, depth)
  } else if (category === 'style' && block.partId === 'Style_Flag') {
    createFlagPart(scene, partNode, material, role, block.id)
  } else {
    const box = MeshBuilder.CreateBox(
      `${role}-${block.id}-box`,
      { width, height, depth },
      scene,
    )
    attachMesh(box, partNode, material)
  }

  return partNode
}

function createMobilityPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
): void {
  if (partId.includes('Tread') || partId.includes('Tank')) {
    const tread = MeshBuilder.CreateBox(
      `${role}-${blockId}-tread`,
      { width: Math.max(width, 0.7), height: Math.max(height * 0.7, 0.18), depth },
      scene,
    )
    attachMesh(tread, parent, material)

    return
  }

  const wheel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel`,
    { height: Math.max(depth, 0.26), diameter: Math.max(width, 0.44), tessellation: 18 },
    scene,
  )
  wheel.rotation.z = Math.PI / 2
  attachMesh(wheel, parent, material)
}

function createWeaponPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
): void {
  if (partId.includes('Spinner') || partId.includes('Saw')) {
    const disc = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-disc`,
      { height: Math.max(height * 0.34, 0.12), diameter: Math.max(width, depth, 0.72), tessellation: 28 },
      scene,
    )
    attachMesh(disc, parent, material)

    return
  }

  if (partId.includes('Hammer')) {
    const handle = MeshBuilder.CreateBox(
      `${role}-${blockId}-handle`,
      { width: 0.18, height: Math.max(height, 0.8), depth: 0.18 },
      scene,
    )
    const head = MeshBuilder.CreateBox(
      `${role}-${blockId}-head`,
      { width: Math.max(width, 0.72), height: 0.22, depth: Math.max(depth, 0.34) },
      scene,
    )
    head.position.y = Math.max(height, 0.8) * 0.42
    attachMesh(handle, parent, material)
    attachMesh(head, parent, material)

    return
  }

  const barrel = MeshBuilder.CreateBox(
    `${role}-${blockId}-weapon`,
    { width: Math.max(width, 0.34), height: Math.max(height, 0.24), depth: Math.max(depth, 0.78) },
    scene,
  )
  attachMesh(barrel, parent, material)
}

function createFlagPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
): void {
  const pole = MeshBuilder.CreateBox(
    `${role}-${blockId}-pole`,
    { width: 0.08, height: 0.86, depth: 0.08 },
    scene,
  )
  const flag = MeshBuilder.CreateBox(
    `${role}-${blockId}-flag`,
    { width: 0.46, height: 0.26, depth: 0.04 },
    scene,
  )

  pole.position.y = 0.2
  flag.position.set(0.24, 0.5, 0)
  attachMesh(pole, parent, material)
  attachMesh(flag, parent, material)
}

function attachMesh(
  mesh: Mesh,
  parent: TransformNode,
  material: StandardMaterial,
): void {
  mesh.parent = parent
  mesh.material = material
}

function materialForCategory(
  materials: TeamMaterialSet,
  category: PartCategory,
): StandardMaterial {
  if (category === 'defense') {
    return materials.armor
  }

  if (category === 'mobility') {
    return materials.mobility
  }

  if (category === 'weapon') {
    return materials.weapon
  }

  if (category === 'utility') {
    return materials.utility
  }

  if (category === 'style') {
    return materials.style
  }

  return materials.chassis
}

function createMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.specularColor = new Color3(0.25, 0.25, 0.22)
  material.emissiveColor = Color3.FromHexString(emissive)

  return material
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
