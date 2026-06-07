import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import { attachMesh } from '../../rendering/meshHelpers'

export function createFlagPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
): void {
  const pole = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-pole`,
    { height: 0.9, diameter: 0.07, tessellation: 10 },
    scene,
  )
  const flag = MeshBuilder.CreatePlane(
    `${role}-${blockId}-flag`,
    { width: 0.46, height: 0.26 },
    scene,
  )
  const base = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-base`,
    { height: 0.08, diameter: 0.22, tessellation: 12 },
    scene,
  )
  const crossbar = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-crossbar`,
    { height: 0.48, diameter: 0.025, tessellation: 8 },
    scene,
  )
  const emblem = MeshBuilder.CreateBox(
    `${role}-${blockId}-flag-emblem`,
    { width: 0.16, height: 0.045, depth: 0.035 },
    scene,
  )

  pole.rotation.z = Math.PI / 2
  flag.rotation.z = Math.PI / 2
  base.rotation.z = Math.PI / 2
  crossbar.rotation.z = Math.PI / 2
  pole.position.y = 0.15
  flag.position.set(0.24, 0.56, 0)
  crossbar.position.set(0.24, 0.66, 0)
  emblem.position.set(0.24, 0.56, 0.02)

  attachMesh(base, parent, material)
  attachMesh(pole, parent, material)
  attachMesh(flag, parent, material)
  attachMesh(crossbar, parent, material)
  attachMesh(emblem, parent, material)
}
