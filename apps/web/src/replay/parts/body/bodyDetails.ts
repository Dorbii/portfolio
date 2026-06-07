import type { Material } from '@babylonjs/core/Materials/material'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import {
  attachMesh,
  createBoxDetail,
} from '../../rendering/meshHelpers'
import {
  tagPartChildMaterialRole,
  type BotPartChildMaterialRole,
} from '../../rendering/materials'

type DetailAxis = 'x' | 'y' | 'z'

export function createTaggedBoxDetail(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  role: BotPartChildMaterialRole,
): Mesh {
  const mesh = createBoxDetail(scene, parent, material, name, width, height, depth, x, y, z)

  tagPartChildMaterialRole(mesh, role)

  return mesh
}

export function createTaggedCylinder(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    axis?: DetailAxis
    diameter: number
    height: number
    role: BotPartChildMaterialRole
    tessellation?: number
    x: number
    y: number
    z: number
  },
): Mesh {
  const mesh = MeshBuilder.CreateCylinder(
    name,
    {
      diameter: options.diameter,
      height: options.height,
      tessellation: options.tessellation ?? 8,
    },
    scene,
  )

  if (options.axis === 'x') {
    mesh.rotation.z = Math.PI / 2
  } else if (options.axis === 'z') {
    mesh.rotation.x = Math.PI / 2
  }

  mesh.position.set(options.x, options.y, options.z)
  attachMesh(mesh, parent, material)
  tagPartChildMaterialRole(mesh, options.role)

  return mesh
}

export function createTopBoltGrid(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    columns: number
    depth: number
    diameter?: number
    rows: number
    width: number
    y: number
  },
): void {
  const columns = Math.max(1, options.columns)
  const rows = Math.max(1, options.rows)
  const xStep = columns === 1 ? 0 : options.width / (columns - 1)
  const zStep = rows === 1 ? 0 : options.depth / (rows - 1)

  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      createTaggedCylinder(scene, parent, material, `${name}-${column}-${row}`, {
        diameter: options.diameter ?? 0.055,
        height: 0.028,
        role: 'trim',
        tessellation: 8,
        x: -options.width / 2 + column * xStep,
        y: options.y,
        z: -options.depth / 2 + row * zStep,
      })
    }
  }
}

export function createFaceBoltRow(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    axis: 'x' | 'z'
    count: number
    diameter?: number
    fixed: number
    length: number
    y: number
  },
): void {
  const count = Math.max(1, options.count)
  const step = count === 1 ? 0 : options.length / (count - 1)

  for (let index = 0; index < count; index += 1) {
    const offset = -options.length / 2 + index * step

    createTaggedCylinder(scene, parent, material, `${name}-${index}`, {
      axis: options.axis,
      diameter: options.diameter ?? 0.052,
      height: 0.03,
      role: 'trim',
      tessellation: 8,
      x: options.axis === 'z' ? offset : options.fixed,
      y: options.y,
      z: options.axis === 'z' ? options.fixed : offset,
    })
  }
}

export function createParallelSideRails(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  width: number,
  y: number,
  depth: number,
  railWidth: number,
  railHeight: number,
): void {
  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      material,
      `${name}-${side}`,
      railWidth,
      railHeight,
      depth,
      side * width,
      y,
      0,
      'trim',
    )
  }
}
