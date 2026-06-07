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

export function createTrashCanPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.rubber, `${role}-${blockId}-trash-can-rubber-isolation-pad`, 0.58, 0.045, 0.48, 0, 0.08, 0),
    'rubber',
  )
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-trash-can-bolted-sled-frame`, 0.66, 0.065, 0.54, 0, 0.13, 0),
    'trim',
  )

  const shell = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-trash-can-corrugated-shell`,
    {
      height: 0.54,
      diameterTop: 0.34,
      diameterBottom: 0.42,
      tessellation: 16,
    },
    scene,
  )
  const rim = MeshBuilder.CreateTorus(
    `${role}-${blockId}-trash-can-thick-top-rim`,
    {
      diameter: 0.39,
      thickness: 0.025,
      tessellation: 18,
    },
    scene,
  )
  const lid = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-trash-can-lopsided-lid`,
    {
      height: 0.055,
      diameter: 0.46,
      tessellation: 18,
    },
    scene,
  )
  const handle = MeshBuilder.CreateTorus(
    `${role}-${blockId}-trash-can-lid-handle`,
    {
      diameter: 0.16,
      thickness: 0.022,
      tessellation: 14,
    },
    scene,
  )

  shell.position.y = 0.41
  rim.position.y = 0.69
  rim.rotation.x = Math.PI / 2
  lid.position.set(0.025, 0.76, 0.015)
  lid.rotation.z = -0.12
  handle.position.set(0.03, 0.815, 0.02)
  handle.rotation.x = Math.PI / 2
  attachStyleMesh(shell, parent, material, 'trim')
  attachStyleMesh(rim, parent, materials.steel, 'weapon_edge')
  attachStyleMesh(lid, parent, materials.trim, 'trim')
  attachStyleMesh(handle, parent, materials.steel, 'weapon_edge')

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const rib = MeshBuilder.CreateBox(
      `${role}-${blockId}-trash-can-corrugation-rib-${index}`,
      {
        width: 0.024,
        height: 0.42,
        depth: 0.032,
      },
      scene,
    )

    rib.position.set(Math.sin(angle) * 0.2, 0.42, Math.cos(angle) * 0.2)
    rib.rotation.y = angle
    attachStyleMesh(rib, parent, materials.trim, 'trim')
  }

  for (const side of [-1, 1]) {
    const strap = MeshBuilder.CreateBox(
      `${role}-${blockId}-trash-can-ratchet-strap-${side}`,
      {
        width: 0.055,
        height: 0.6,
        depth: 0.065,
      },
      scene,
    )
    const sideHandle = MeshBuilder.CreateTorus(
      `${role}-${blockId}-trash-can-side-handle-${side}`,
      {
        diameter: 0.16,
        thickness: 0.018,
        tessellation: 12,
      },
      scene,
    )
    const clampFoot = MeshBuilder.CreateBox(
      `${role}-${blockId}-trash-can-clamp-foot-${side}`,
      {
        width: 0.16,
        height: 0.08,
        depth: 0.14,
      },
      scene,
    )

    strap.position.set(side * 0.22, 0.43, -0.02)
    strap.rotation.z = side * 0.08
    sideHandle.position.set(side * 0.25, 0.48, 0)
    sideHandle.rotation.y = Math.PI / 2
    clampFoot.position.set(side * 0.3, 0.19, -0.18)
    attachStyleMesh(strap, parent, materials.warning, 'trim')
    attachStyleMesh(sideHandle, parent, materials.steel, 'weapon_edge')
    attachStyleMesh(clampFoot, parent, materials.steel, 'weapon_edge')
  }

  tagStyleMesh(
    createBoxDetail(scene, parent, materials.light, `${role}-${blockId}-trash-can-ridiculous-status-sticker`, 0.16, 0.028, 0.035, 0, 0.47, 0.225),
    'emissive',
  )
  tagStyleMesh(
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-trash-can-dented-patch-plate`, 0.18, 0.035, 0.03, -0.06, 0.34, 0.23),
    'weapon_edge',
  )
}
