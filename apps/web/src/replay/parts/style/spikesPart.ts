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

export function createStyleSpikesPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  tagStyleMesh(
    createBoxDetail(scene, parent, material, `${role}-${blockId}-style-spikes-painted-mount-plate`, 0.74, 0.075, 0.62, 0, 0.09, 0),
    'trim',
  )
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-style-spikes-raised-center-rail`, 0.18, 0.075, 0.7, 0, 0.17, 0),
    'trim',
  )

  const spikeLayout = [
    { x: 0, z: -0.24, height: 0.42, base: 0.12, pitch: -0.08 },
    { x: 0, z: 0, height: 0.52, base: 0.14, pitch: 0 },
    { x: 0, z: 0.24, height: 0.42, base: 0.12, pitch: 0.08 },
    { x: -0.23, z: -0.16, height: 0.34, base: 0.1, pitch: -0.12 },
    { x: 0.23, z: -0.16, height: 0.34, base: 0.1, pitch: -0.12 },
    { x: -0.23, z: 0.18, height: 0.32, base: 0.095, pitch: 0.12 },
    { x: 0.23, z: 0.18, height: 0.32, base: 0.095, pitch: 0.12 },
  ]

  spikeLayout.forEach((spike, index) => {
    const socket = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-style-spike-bolted-socket-${index}`,
      {
        height: 0.045,
        diameter: spike.base * 1.32,
        tessellation: 10,
      },
      scene,
    )
    const tooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-style-spike-chrome-tooth-${index}`,
      {
        height: spike.height,
        diameterTop: 0,
        diameterBottom: spike.base,
        tessellation: 10,
      },
      scene,
    )

    socket.position.set(spike.x, 0.225, spike.z)
    tooth.position.set(spike.x, 0.43, spike.z)
    tooth.rotation.x = spike.pitch
    tooth.rotation.z = spike.x * -0.45
    attachStyleMesh(socket, parent, materials.trim, 'trim')
    attachStyleMesh(tooth, parent, materials.steel, 'weapon_edge')
  })

  for (const x of [-0.33, 0.33]) {
    tagStyleMesh(
      createBoxDetail(scene, parent, materials.warning, `${role}-${blockId}-style-spikes-side-warning-rail-${x > 0 ? 'right' : 'left'}`, 0.055, 0.04, 0.54, x, 0.2, 0),
      'trim',
    )
  }

  for (let index = 0; index < 4; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-style-spikes-corner-bolt-${index}`,
      {
        height: 0.026,
        diameter: 0.05,
        tessellation: 8,
      },
      scene,
    )

    bolt.position.set(index % 2 === 0 ? -0.3 : 0.3, 0.155, index < 2 ? -0.24 : 0.24)
    attachStyleMesh(bolt, parent, materials.steel, 'weapon_edge')
  }
}
