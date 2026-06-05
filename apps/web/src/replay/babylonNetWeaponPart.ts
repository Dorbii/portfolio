import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from './babylonMeshHelpers'
import type { WeaponPartRenderArgs } from './babylonWeaponPartTypes'

export function createNetWeaponPart({
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
  const barrel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-net-barrel`,
    {
      height: Math.max(depth * 0.9, 0.62),
      diameter: Math.max(width * 0.62, 0.36),
      tessellation: 18,
    },
    scene,
  )
  const muzzle = MeshBuilder.CreateTorus(
    `${role}-${blockId}-net-muzzle`,
    {
      diameter: Math.max(width * 0.76, 0.42),
      thickness: 0.055,
      tessellation: 18,
    },
    scene,
  )
  const hoop = MeshBuilder.CreateTorus(
    `${role}-${blockId}-net-hoop`,
    {
      diameter: Math.max(width * 1.22, 0.82),
      thickness: 0.045,
      tessellation: 24,
    },
    scene,
  )

  barrel.rotation.x = Math.PI / 2
  muzzle.rotation.x = Math.PI / 2
  hoop.rotation.x = Math.PI / 2
  barrel.position.set(0, Math.max(height * 0.2, 0.18), Math.max(depth * 0.18, 0.2))
  muzzle.position.set(0, Math.max(height * 0.2, 0.18), Math.max(depth * 0.62, 0.45))
  hoop.position.set(0, Math.max(height * 0.34, 0.32), Math.max(depth * 0.88, 0.68))
  attachMesh(barrel, parent, material)
  attachMesh(muzzle, parent, materials.trim)
  attachMesh(hoop, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    const canister = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-net-canister-${side}`,
      { height: Math.max(depth * 0.62, 0.42), diameter: Math.max(width * 0.22, 0.14), tessellation: 12 },
      scene,
    )

    canister.rotation.x = Math.PI / 2
    canister.position.set(side * Math.max(width * 0.34, 0.24), Math.max(height * 0.2, 0.18), Math.max(depth * 0.18, 0.2))
    attachMesh(canister, parent, materials.trim)
  }

  for (let index = -2; index <= 2; index += 1) {
    const vertical = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-net-vertical-${index + 2}`,
      { height: Math.max(width * 1.05, 0.64), diameter: 0.026, tessellation: 8 },
      scene,
    )
    const horizontal = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-net-horizontal-${index + 2}`,
      { height: Math.max(width * 1.05, 0.64), diameter: 0.026, tessellation: 8 },
      scene,
    )

    vertical.rotation.z = Math.PI / 2
    horizontal.rotation.x = Math.PI / 2
    vertical.position.set(index * Math.max(width * 0.1, 0.055), Math.max(height * 0.34, 0.32), Math.max(depth * 0.88, 0.68))
    horizontal.position.set(0, Math.max(height * 0.34, 0.32) + index * 0.055, Math.max(depth * 0.88, 0.68))
    attachMesh(vertical, parent, materials.warning)
    attachMesh(horizontal, parent, materials.warning)
  }

  for (let index = 0; index < 4; index += 1) {
    const node = MeshBuilder.CreateSphere(
      `${role}-${blockId}-net-corner-node-${index}`,
      { diameter: 0.1, segments: 8 },
      scene,
    )
    const x = index % 2 === 0 ? -Math.max(width * 0.48, 0.32) : Math.max(width * 0.48, 0.32)
    const y = Math.max(height * 0.34, 0.32) + (index < 2 ? -0.28 : 0.28)

    node.position.set(x, y, Math.max(depth * 0.88, 0.68))
    attachMesh(node, parent, materials.light)
  }
}
