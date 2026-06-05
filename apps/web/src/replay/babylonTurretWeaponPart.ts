import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  attachMesh,
  createBoxDetail,
} from './babylonMeshHelpers'
import type { WeaponPartRenderArgs } from './babylonWeaponPartTypes'

export function createTurretWeaponPart({
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
  const base = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-base`,
    {
      height: Math.max(height * 0.48, 0.22),
      diameter: Math.max(Math.max(width, depth), 0.5),
      tessellation: 14,
    },
    scene,
  )
  const barrel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-barrel`,
    {
      height: Math.max(depth * 0.84, 0.72),
      diameter: Math.max(width * 0.22, 0.14),
      tessellation: 16,
    },
    scene,
  )
  const muzzle = MeshBuilder.CreateTorus(
    `${role}-${blockId}-turret-muzzle`,
    {
      diameter: Math.max(width * 0.34, 0.22),
      thickness: 0.045,
      tessellation: 16,
    },
    scene,
  )
  const shoulder = MeshBuilder.CreateBox(
    `${role}-${blockId}-turret-shoulder`,
    {
      width: Math.max(width * 0.82, 0.5),
      height: Math.max(height * 0.36, 0.22),
      depth: Math.max(depth * 0.46, 0.34),
    },
    scene,
  )

  base.rotation.x = Math.PI / 2
  barrel.rotation.x = Math.PI / 2
  muzzle.rotation.x = Math.PI / 2
  barrel.position.z = Math.max(depth * 0.68, 0.52)
  barrel.position.y = Math.max(height * 0.18, 0.18)
  muzzle.position.set(0, barrel.position.y, Math.max(depth * 1.12, 0.9))
  shoulder.position.y = Math.max(height * 0.42, 0.28)
  attachMesh(base, parent, material)
  attachMesh(shoulder, parent, material)
  attachMesh(barrel, parent, materials.trim)
  attachMesh(muzzle, parent, materials.light)

  for (let side = -1; side <= 1; side += 2) {
    const pod = MeshBuilder.CreateBox(
      `${role}-${blockId}-turret-side-pod-${side}`,
      {
        width: Math.max(width * 0.22, 0.16),
        height: Math.max(height * 0.32, 0.18),
        depth: Math.max(depth * 0.52, 0.3),
      },
      scene,
    )

    pod.position.set(side * Math.max(width * 0.48, 0.3), Math.max(height * 0.36, 0.24), Math.max(depth * 0.24, 0.16))
    attachMesh(pod, parent, material)
  }
  createBoxDetail(
    scene,
    parent,
    materials.light,
    `${role}-${blockId}-turret-eye`,
    Math.max(width * 0.34, 0.18),
    0.08,
    0.08,
    0,
    Math.max(height * 0.48, 0.3),
    Math.max(depth * 0.34, 0.2),
  )
}
