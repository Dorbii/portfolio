import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  attachMesh,
  createBoxDetail,
} from './babylonMeshHelpers'
import type { WeaponPartRenderArgs } from './babylonWeaponPartTypes'

export function createDefaultWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const weapon = MeshBuilder.CreateBox(
    `${role}-${blockId}-weapon`,
    {
      width: Math.max(width, 0.34),
      height: Math.max(height, 0.24),
      depth: Math.max(depth, 0.68),
    },
    scene,
  )
  weapon.position.z = Math.max(depth * 0.45, 0.32)
  attachMesh(weapon, parent, material)
  createBoxDetail(
    scene,
    parent,
    materials.warning,
    `${role}-${blockId}-weapon-tip`,
    Math.max(width * 0.82, 0.24),
    0.08,
    0.12,
    0,
    Math.max(height * 0.46, 0.16),
    Math.max(depth * 0.86, 0.48),
  )
}
