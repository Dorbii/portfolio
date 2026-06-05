import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from './babylonMeshHelpers'
import type { WeaponPartRenderArgs } from './babylonWeaponPartTypes'

export function createHammerWeaponPart({
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
  const shaft = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-hammer-shaft`,
    { height: Math.max(height * 1.05, 0.8), diameter: Math.max(width * 0.18, 0.1), tessellation: 12 },
    scene,
  )
  const head = MeshBuilder.CreateBox(
    `${role}-${blockId}-hammer-head`,
    { width: Math.max(width * 1.1, 0.6), height: Math.max(height * 0.24, 0.18), depth: Math.max(depth * 1.7, 0.56) },
    scene,
  )

  shaft.rotation.z = Math.PI / 2
  shaft.position.y = Math.max(height * 0.1, 0.15)
  head.position.set(0, Math.max(height * 0.72, 0.46), 0)
  attachMesh(shaft, parent, materials.trim)
  attachMesh(head, parent, material)
}

export function createSpearWeaponPart({
  scene,
  parent,
  role,
  blockId,
  width,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const shaft = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spear-shaft`,
    { height: Math.max(depth * 1.15, 0.72), diameter: Math.max(width * 0.16, 0.1), tessellation: 10 },
    scene,
  )
  const tip = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spear-tip`,
    {
      height: Math.max(depth * 0.36, 0.24),
      diameterTop: 0,
      diameterBottom: Math.max(width * 0.28, 0.18),
      tessellation: 12,
    },
    scene,
  )

  shaft.rotation.x = Math.PI / 2
  shaft.position.z = Math.max(depth * 0.48, 0.34)
  tip.rotation.x = Math.PI / 2
  tip.position.z = Math.max(depth * 1.14, 0.74)
  attachMesh(shaft, parent, materials.trim)
  attachMesh(tip, parent, materials.warning)
}

export function createGrabberWeaponPart({
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
  const plate = MeshBuilder.CreateBox(
    `${role}-${blockId}-grabber`,
    {
      width: Math.max(width * 1.25, 0.65),
      height: Math.max(height * 0.3, 0.16),
      depth: Math.max(depth * 1.25, 0.55),
    },
    scene,
  )
  const sideL = MeshBuilder.CreateBox(
    `${role}-${blockId}-grabber-l`,
    {
      width: Math.max(width * 0.18, 0.13),
      height: Math.max(height * 1.05, 0.45),
      depth: Math.max(depth * 0.35, 0.2),
    },
    scene,
  )
  const sideR = MeshBuilder.CreateBox(
    `${role}-${blockId}-grabber-r`,
    {
      width: Math.max(width * 0.18, 0.13),
      height: Math.max(height * 1.05, 0.45),
      depth: Math.max(depth * 0.35, 0.2),
    },
    scene,
  )

  sideL.position.set(-Math.max(width * 0.35, 0.26), Math.max(height * 0.4, 0.22), 0)
  sideR.position.set(Math.max(width * 0.35, 0.26), Math.max(height * 0.4, 0.22), 0)
  attachMesh(plate, parent, material)
  attachMesh(sideL, parent, materials.trim)
  attachMesh(sideR, parent, materials.trim)

  for (let index = -1; index <= 1; index += 1) {
    const tooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-grabber-tooth-${index + 1}`,
      {
        height: Math.max(depth * 0.28, 0.2),
        diameterTop: 0,
        diameterBottom: Math.max(width * 0.14, 0.1),
        tessellation: 10,
      },
      scene,
    )

    tooth.rotation.x = Math.PI / 2
    tooth.position.set(index * Math.max(width * 0.24, 0.18), Math.max(height * 0.2, 0.14), Math.max(depth * 0.78, 0.44))
    attachMesh(tooth, parent, materials.warning)
  }
}
