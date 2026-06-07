import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

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

  for (let side = -1; side <= 1; side += 2) {
    const pivot = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-grabber-claw-pivot-${side}`,
      {
        height: Math.max(width * 0.2, 0.1),
        diameter: Math.max(height * 0.2, 0.1),
        tessellation: 12,
      },
      scene,
    )
    const clawTip = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-grabber-hook-tip-${side}`,
      {
        height: Math.max(depth * 0.3, 0.18),
        diameterTop: 0,
        diameterBottom: Math.max(width * 0.12, 0.08),
        tessellation: 10,
      },
      scene,
    )

    pivot.rotation.z = Math.PI / 2
    pivot.position.set(side * Math.max(width * 0.38, 0.26), Math.max(height * 0.78, 0.36), -Math.max(depth * 0.14, 0.08))
    clawTip.rotation.x = Math.PI / 2
    clawTip.rotation.z = side * 0.42
    clawTip.position.set(side * Math.max(width * 0.42, 0.28), Math.max(height * 0.72, 0.34), Math.max(depth * 0.42, 0.28))
    attachMesh(pivot, parent, materials.steel)
    attachMesh(clawTip, parent, materials.warning)
  }
}
