import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  attachMesh,
  createBoxDetail,
  createRampBlock,
} from './babylonMeshHelpers'
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

export function createFlipperWeaponPart({
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
  const paddle = createRampBlock(
    scene,
    `${role}-${blockId}-flipper-paddle`,
    Math.max(width * 1.24, 0.72),
    Math.max(height * 0.5, 0.22),
    Math.max(depth * 1.42, 0.72),
    Math.max(height * 0.08, 0.035),
  )
  const hinge = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flipper-hinge`,
    { height: Math.max(width * 1.08, 0.62), diameter: Math.max(height * 0.18, 0.1), tessellation: 12 },
    scene,
  )

  paddle.position.set(0, Math.max(height * 0.18, 0.12), Math.max(depth * 0.22, 0.14))
  hinge.rotation.z = Math.PI / 2
  hinge.position.set(0, Math.max(height * 0.26, 0.16), -Math.max(depth * 0.44, 0.24))
  attachMesh(paddle, parent, material)
  attachMesh(hinge, parent, materials.trim)

  for (let side = -1; side <= 1; side += 2) {
    createBoxDetail(
      scene,
      parent,
      materials.warning,
      `${role}-${blockId}-flipper-side-link-${side}`,
      Math.max(width * 0.12, 0.08),
      Math.max(height * 0.38, 0.18),
      Math.max(depth * 0.88, 0.42),
      side * Math.max(width * 0.48, 0.3),
      Math.max(height * 0.28, 0.16),
      0,
    )
  }
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

export function createRamWeaponPart({
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
  const ramFace = createRampBlock(
    scene,
    `${role}-${blockId}-ram-impact-wedge`,
    Math.max(width * 1.3, 0.76),
    Math.max(height * 0.54, 0.24),
    Math.max(depth * 1.02, 0.58),
    Math.max(height * 0.18, 0.08),
  )
  const crushBar = MeshBuilder.CreateBox(
    `${role}-${blockId}-ram-crush-bar`,
    {
      width: Math.max(width * 1.22, 0.72),
      height: Math.max(height * 0.16, 0.1),
      depth: Math.max(depth * 0.16, 0.09),
    },
    scene,
  )

  ramFace.position.set(0, Math.max(height * 0.18, 0.12), Math.max(depth * 0.28, 0.16))
  crushBar.position.set(0, Math.max(height * 0.28, 0.16), Math.max(depth * 0.78, 0.42))
  attachMesh(ramFace, parent, material)
  attachMesh(crushBar, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${role}-${blockId}-ram-side-cheek-${side}`,
      Math.max(width * 0.14, 0.09),
      Math.max(height * 0.42, 0.18),
      Math.max(depth * 0.78, 0.4),
      side * Math.max(width * 0.5, 0.32),
      Math.max(height * 0.24, 0.14),
      Math.max(depth * 0.18, 0.1),
    )
  }
}
