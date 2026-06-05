import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type {
  PartCategory,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import {
  attachMesh,
  createBoxDetail,
} from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'

export function createPartAccents(
  scene: Scene,
  parent: TransformNode,
  role: TeamRole,
  blockId: string,
  category: PartCategory,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  if (category === 'mobility') {
    return
  }

  const topY = Math.max(height * 0.52, 0.16)

  createBoxDetail(
    scene,
    parent,
    materials.trim,
    `${role}-${blockId}-side-rail-l`,
    Math.max(width * 0.16, 0.08),
    0.08,
    Math.max(depth * 0.78, 0.2),
    -Math.max(width * 0.5, 0.18),
    topY,
    0,
  )
  createBoxDetail(
    scene,
    parent,
    materials.trim,
    `${role}-${blockId}-side-rail-r`,
    Math.max(width * 0.16, 0.08),
    0.08,
    Math.max(depth * 0.78, 0.2),
    Math.max(width * 0.5, 0.18),
    topY,
    0,
  )

  if (category === 'body' || category === 'utility') {
    createBoxDetail(
      scene,
      parent,
      materials.light,
      `${role}-${blockId}-status-light`,
      Math.max(width * 0.38, 0.16),
      0.07,
      0.08,
      0,
      Math.max(height * 0.7, 0.22),
      Math.max(depth * 0.42, 0.14),
    )
  }

  for (let index = 0; index < 4; index += 1) {
    const x = index % 2 === 0 ? -width * 0.34 : width * 0.34
    const z = index < 2 ? -depth * 0.34 : depth * 0.34
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-bolt-${index}`,
      { height: 0.045, diameter: 0.075, tessellation: 8 },
      scene,
    )

    bolt.position.set(x, Math.max(height * 0.7, 0.24), z)
    bolt.rotation.x = Math.PI / 2
    attachMesh(bolt, parent, materials.trim)
  }
}

export function createArmorPanel(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  trim: StandardMaterial,
  width: number,
  height: number,
  depth: number,
): void {
  createBoxDetail(
    scene,
    parent,
    material,
    `${parent.name}-top-plate`,
    width * 0.72,
    0.06,
    depth * 0.72,
    0,
    Math.max(height * 0.66, 0.23),
    0,
  )
  createBoxDetail(
    scene,
    parent,
    trim,
    `${parent.name}-front-guard`,
    width * 0.88,
    0.12,
    0.12,
    0,
    Math.max(height * 0.22, 0.12),
    Math.max(depth * 0.52, 0.18),
  )
}

export function createCornerCaps(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = 0; index < 4; index += 1) {
    createBoxDetail(
      scene,
      parent,
      material,
      `${parent.name}-corner-cap-${index}`,
      Math.max(width * 0.22, 0.1),
      0.12,
      Math.max(depth * 0.22, 0.1),
      index % 2 === 0 ? -width * 0.42 : width * 0.42,
      Math.max(height * 0.56, 0.26),
      index < 2 ? -depth * 0.42 : depth * 0.42,
    )
  }
}

export function createTopLamp(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  radius: number,
  y: number,
): void {
  const lamp = MeshBuilder.CreateBox(
    `${parent.name}-top-lamp`,
    { width: Math.max(radius * 0.55, 0.14), height: 0.07, depth: 0.11 },
    scene,
  )

  lamp.position.set(0, Math.max(y, 0.24), Math.max(radius * 0.3, 0.12))
  attachMesh(lamp, parent, material)
}
