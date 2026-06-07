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

export function createNeonPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-neon-bolted-plinth`, 0.78, 0.08, 0.46, 0, 0.09, 0),
    'trim',
  )
  tagStyleMesh(
    createBoxDetail(scene, parent, material, `${role}-${blockId}-neon-painted-control-box`, 0.36, 0.13, 0.28, 0, 0.2, -0.12),
    'trim',
  )
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-neon-front-crash-guard`, 0.82, 0.045, 0.035, 0, 0.28, 0.25),
    'weapon_edge',
  )

  const halo = MeshBuilder.CreateTorus(
    `${role}-${blockId}-neon-pulsing-halo`,
    {
      diameter: 0.54,
      thickness: 0.026,
      tessellation: 32,
    },
    scene,
  )
  const lowerTube = MeshBuilder.CreateBox(
    `${role}-${blockId}-neon-lower-tube`,
    { width: 0.58, height: 0.04, depth: 0.045 },
    scene,
  )
  const leftTube = MeshBuilder.CreateBox(
    `${role}-${blockId}-neon-left-vertical-tube`,
    { width: 0.04, height: 0.32, depth: 0.045 },
    scene,
  )
  const rightTube = MeshBuilder.CreateBox(
    `${role}-${blockId}-neon-right-vertical-tube`,
    { width: 0.04, height: 0.32, depth: 0.045 },
    scene,
  )
  const underglow = MeshBuilder.CreateBox(
    `${role}-${blockId}-neon-underglow-diffuser`,
    { width: 0.68, height: 0.025, depth: 0.1 },
    scene,
  )

  halo.position.set(0, 0.43, 0.03)
  halo.rotation.x = Math.PI / 2
  halo.scaling.z = 0.62
  halo.metadata = { kind: 'pulse', speed: 0.035 }
  lowerTube.position.set(0, 0.27, 0.22)
  lowerTube.metadata = { kind: 'pulse', speed: 0.024, phase: Math.PI * 0.4 }
  leftTube.position.set(-0.34, 0.32, 0.12)
  leftTube.metadata = { kind: 'pulse', speed: 0.022, phase: Math.PI * 0.8 }
  rightTube.position.set(0.34, 0.32, 0.12)
  rightTube.metadata = { kind: 'pulse', speed: 0.022, phase: Math.PI * 1.2 }
  underglow.position.set(0, 0.145, -0.28)
  underglow.metadata = { kind: 'pulse', speed: 0.018, phase: Math.PI * 1.4 }

  attachStyleMesh(halo, parent, materials.light, 'emissive')
  attachStyleMesh(lowerTube, parent, materials.light, 'emissive')
  attachStyleMesh(leftTube, parent, materials.light, 'emissive')
  attachStyleMesh(rightTube, parent, materials.light, 'emissive')
  attachStyleMesh(underglow, parent, materials.light, 'emissive')

  for (const x of [-0.32, 0.32]) {
    const conduit = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-neon-armored-power-conduit-${x > 0 ? 'right' : 'left'}`,
      {
        height: 0.34,
        diameter: 0.024,
        tessellation: 8,
      },
      scene,
    )
    const bracket = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-neon-tube-bracket-${x > 0 ? 'right' : 'left'}`,
      {
        height: 0.052,
        diameter: 0.072,
        tessellation: 10,
      },
      scene,
    )

    conduit.rotation.x = Math.PI / 2
    conduit.position.set(x, 0.21, -0.03)
    bracket.position.set(x, 0.27, 0.2)
    attachStyleMesh(conduit, parent, materials.steel, 'weapon_edge')
    attachStyleMesh(bracket, parent, materials.trim, 'trim')
  }

  for (let index = 0; index < 3; index += 1) {
    tagStyleMesh(
      createBoxDetail(scene, parent, materials.warning, `${role}-${blockId}-neon-service-stripe-${index}`, 0.08, 0.018, 0.035, -0.11 + index * 0.11, 0.28, -0.275),
      'trim',
    )
  }
}
