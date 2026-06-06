import type { Material } from '@babylonjs/core/Materials/material'
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

  createFastenerRow(scene, parent, materials.trim, `${role}-${blockId}-front-fasteners`, {
    count: 2,
    xStart: -width * 0.34,
    xStep: width * 0.68,
    y: Math.max(height * 0.7, 0.24),
    z: depth * 0.34,
  })
  createFastenerRow(scene, parent, materials.trim, `${role}-${blockId}-rear-fasteners`, {
    count: 2,
    xStart: -width * 0.34,
    xStep: width * 0.68,
    y: Math.max(height * 0.7, 0.24),
    z: -depth * 0.34,
  })

  if (category === 'utility') {
    createVentSlats(scene, parent, materials.trim, `${role}-${blockId}-utility-vents`, {
      count: 4,
      width: Math.max(width * 0.38, 0.18),
      y: Math.max(height * 0.54, 0.2),
      z: -Math.max(depth * 0.36, 0.12),
    })
  }

  if (category === 'defense' || category === 'body') {
    createPanelSeam(scene, parent, materials.trim, `${role}-${blockId}-service-seam`, {
      width: Math.max(width * 0.58, 0.22),
      y: Math.max(height * 0.73, 0.25),
      z: 0,
    })
  }
}

function createFastenerRow(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    count: number
    xStart: number
    xStep: number
    y: number
    z: number
  },
): void {
  for (let index = 0; index < options.count; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${name}-${index}`,
      { height: 0.045, diameter: 0.075, tessellation: 8 },
      scene,
    )

    bolt.position.set(options.xStart + options.xStep * index, options.y, options.z)
    bolt.rotation.x = Math.PI / 2
    attachMesh(bolt, parent, material)
  }
}

function createVentSlats(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    count: number
    width: number
    y: number
    z: number
  },
): void {
  for (let index = 0; index < options.count; index += 1) {
    createBoxDetail(
      scene,
      parent,
      material,
      `${name}-${index}`,
      options.width,
      0.025,
      0.035,
      0,
      options.y,
      options.z + (index - (options.count - 1) / 2) * 0.09,
    )
  }
}

function createPanelSeam(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    width: number
    y: number
    z: number
  },
): void {
  createBoxDetail(
    scene,
    parent,
    material,
    name,
    options.width,
    0.018,
    0.032,
    0,
    options.y,
    options.z,
  )
}

export function createArmorPanel(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  trim: Material,
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
  material: Material,
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
  material: Material,
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
