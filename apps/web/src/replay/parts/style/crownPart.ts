import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import type { TeamMaterialSet } from '../../rendering/materials'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { createBoxDetail } from '../../rendering/meshHelpers'
import {
  attachStyleMesh,
  tagStyleMesh,
} from './styleMeshTags'

export function createCrownPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  const basePlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-crown-bolted-base-plate`,
    { width: 0.74, height: 0.08, depth: 0.58 },
    scene,
  )
  const outerBand = MeshBuilder.CreateTorus(
    `${role}-${blockId}-crown-machined-band`,
    { diameter: 0.58, thickness: 0.05, tessellation: 32 },
    scene,
  )
  const innerRim = MeshBuilder.CreateTorus(
    `${role}-${blockId}-crown-inner-rim`,
    { diameter: 0.44, thickness: 0.022, tessellation: 28 },
    scene,
  )

  basePlate.position.y = 0.1
  outerBand.position.y = 0.24
  outerBand.rotation.x = Math.PI / 2
  outerBand.scaling.z = 0.72
  innerRim.position.y = 0.27
  innerRim.rotation.x = Math.PI / 2
  innerRim.scaling.z = 0.62
  attachStyleMesh(basePlate, parent, materials.trim, 'trim')
  attachStyleMesh(outerBand, parent, materials.warning, 'trim')
  attachStyleMesh(innerRim, parent, materials.steel, 'weapon_edge')

  for (let index = 0; index < 7; index += 1) {
    const angle = (Math.PI * 2 * index) / 7
    const radiusX = 0.29
    const radiusZ = 0.2
    const toothHeight = index % 2 === 0 ? 0.25 : 0.18
    const tooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-crown-seated-tooth-${index}`,
      {
        height: toothHeight,
        diameterTop: 0.03,
        diameterBottom: 0.082,
        tessellation: 6,
      },
      scene,
    )
    const socket = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-crown-tooth-socket-${index}`,
      { height: 0.04, diameter: 0.1, tessellation: 10 },
      scene,
    )
    const jewel = MeshBuilder.CreateSphere(
      `${role}-${blockId}-crown-inset-jewel-${index}`,
      { diameter: 0.036, segments: 8 },
      scene,
    )

    tooth.position.set(Math.sin(angle) * radiusX, 0.36 + toothHeight * 0.18, Math.cos(angle) * radiusZ)
    tooth.rotation.z = -Math.sin(angle) * 0.16
    socket.position.set(Math.sin(angle) * radiusX, 0.27, Math.cos(angle) * radiusZ)
    jewel.position.set(Math.sin(angle) * (radiusX + 0.018), 0.36, Math.cos(angle) * (radiusZ + 0.012))
    jewel.metadata = { kind: 'pulse', speed: 0.008 + index * 0.001 }
    attachStyleMesh(tooth, parent, materials.warning, 'trim')
    attachStyleMesh(socket, parent, materials.steel, 'weapon_edge')
    attachStyleMesh(jewel, parent, materials.light, 'emissive')
  }

  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.2, 0.2]) {
      const bolt = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-crown-base-bolt-${x}-${z}`,
        { height: 0.025, diameter: 0.045, tessellation: 10 },
        scene,
      )

      bolt.position.set(x, 0.155, z)
      attachStyleMesh(bolt, parent, materials.steel, 'weapon_edge')
    }
  }

  tagStyleMesh(
    createBoxDetail(scene, parent, material, `${role}-${blockId}-crown-front-team-plate`, 0.22, 0.035, 0.04, 0, 0.18, 0.31),
    'trim',
  )
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.rubber, `${role}-${blockId}-crown-vibration-pad`, 0.48, 0.026, 0.34, 0, 0.145, 0),
    'rubber',
  )

  const frontGem = MeshBuilder.CreateSphere(
    `${role}-${blockId}-crown-large-command-jewel`,
    { diameter: 0.09, segments: 12 },
    scene,
  )
  const rearBrace = MeshBuilder.CreateBox(
    `${role}-${blockId}-crown-rear-anti-shear-brace`,
    { width: 0.34, height: 0.055, depth: 0.05 },
    scene,
  )

  frontGem.position.set(0, 0.42, 0.31)
  frontGem.metadata = { kind: 'pulse', speed: 0.012, phase: Math.PI * 0.5 }
  rearBrace.position.set(0, 0.19, -0.32)
  attachStyleMesh(frontGem, parent, materials.light, 'emissive')
  attachStyleMesh(rearBrace, parent, materials.steel, 'weapon_edge')
}
