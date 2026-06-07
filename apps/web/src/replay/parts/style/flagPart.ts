import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import { createBoxDetail } from '../../rendering/meshHelpers'
import type { TeamMaterialSet } from '../../rendering/materials'
import {
  attachStyleMesh,
  tagStyleMesh,
} from './styleMeshTags'

export function createFlagPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-flag-bolted-socket-plate`, 0.44, 0.075, 0.36, 0, 0.09, 0),
    'trim',
  )

  const pole = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-brushed-steel-pole`,
    { height: 0.86, diameter: 0.046, tessellation: 10 },
    scene,
  )
  const base = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-clamped-base`,
    { height: 0.08, diameter: 0.2, tessellation: 12 },
    scene,
  )
  const crossbar = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-upper-crossbar`,
    { height: 0.48, diameter: 0.024, tessellation: 8 },
    scene,
  )
  const lowerCrossbar = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-lower-crossbar`,
    { height: 0.36, diameter: 0.018, tessellation: 8 },
    scene,
  )

  pole.position.y = 0.5
  base.position.y = 0.14
  crossbar.rotation.z = Math.PI / 2
  crossbar.position.set(0.24, 0.82, 0)
  lowerCrossbar.rotation.z = Math.PI / 2
  lowerCrossbar.position.set(0.2, 0.55, 0)

  attachStyleMesh(base, parent, materials.trim, 'trim')
  attachStyleMesh(pole, parent, materials.steel, 'weapon_edge')
  attachStyleMesh(crossbar, parent, materials.steel, 'weapon_edge')
  attachStyleMesh(lowerCrossbar, parent, materials.steel, 'weapon_edge')

  const flagPanels = [
    { name: 'hoist', x: 0.12, y: 0.685, width: 0.16, height: 0.29, rotation: -0.06 },
    { name: 'center-wave', x: 0.27, y: 0.675, width: 0.18, height: 0.27, rotation: 0.1 },
    { name: 'fly', x: 0.43, y: 0.66, width: 0.16, height: 0.24, rotation: -0.14 },
  ]

  flagPanels.forEach((panel) => {
    const flag = MeshBuilder.CreateBox(
      `${role}-${blockId}-flag-painted-${panel.name}-panel`,
      {
        width: panel.width,
        height: panel.height,
        depth: 0.032,
      },
      scene,
    )

    flag.position.set(panel.x, panel.y, 0.018)
    flag.rotation.z = panel.rotation
    attachStyleMesh(flag, parent, material, 'trim')
  })

  tagStyleMesh(
    createBoxDetail(scene, parent, materials.warning, `${role}-${blockId}-flag-gold-fringe-top`, 0.49, 0.028, 0.036, 0.27, 0.83, 0.04),
    'trim',
  )
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.warning, `${role}-${blockId}-flag-gold-fringe-fly-edge`, 0.032, 0.25, 0.036, 0.52, 0.67, 0.04),
    'trim',
  )
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.light, `${role}-${blockId}-flag-readable-team-emblem`, 0.15, 0.08, 0.04, 0.26, 0.68, 0.062),
    'emissive',
  )

  for (const x of [-0.14, 0.14]) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-flag-base-bolt-${x > 0 ? 'right' : 'left'}`,
      { height: 0.026, diameter: 0.045, tessellation: 8 },
      scene,
    )

    bolt.position.set(x, 0.15, 0.12)
    attachStyleMesh(bolt, parent, materials.steel, 'weapon_edge')
  }
}
