import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'
import {
  attachRoleMesh,
  attachWeaponEdgeMesh,
  tagRoleMesh,
} from './weaponRenderHelpers'

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
  tagRoleMesh(plate, 'damageable')
  attachRoleMesh(sideL, parent, materials.trim, 'trim')
  attachRoleMesh(sideR, parent, materials.trim, 'trim')

  const crossPin = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-grabber-jaw-cross-pin`,
    {
      height: Math.max(width * 0.88, 0.52),
      diameter: Math.max(height * 0.13, 0.07),
      tessellation: 12,
    },
    scene,
  )
  const rearRam = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-grabber-rear-hydraulic-ram`,
    {
      height: Math.max(depth * 0.52, 0.3),
      diameter: Math.max(width * 0.075, 0.045),
      tessellation: 10,
    },
    scene,
  )

  crossPin.rotation.z = Math.PI / 2
  crossPin.position.set(0, Math.max(height * 0.76, 0.35), -Math.max(depth * 0.14, 0.08))
  rearRam.rotation.x = Math.PI / 2
  rearRam.position.set(0, Math.max(height * 0.55, 0.28), -Math.max(depth * 0.26, 0.16))
  attachRoleMesh(crossPin, parent, materials.steel, 'trim')
  attachRoleMesh(rearRam, parent, materials.utility, 'damageable')

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
    attachWeaponEdgeMesh(tooth, parent, materials.warning)
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
    const innerGripPad = MeshBuilder.CreateBox(
      `${role}-${blockId}-grabber-rubber-inner-pad-${side}`,
      {
        width: Math.max(width * 0.05, 0.035),
        height: Math.max(height * 0.18, 0.09),
        depth: Math.max(depth * 0.34, 0.18),
      },
      scene,
    )
    const jawBrace = MeshBuilder.CreateBox(
      `${role}-${blockId}-grabber-triangulated-jaw-brace-${side}`,
      {
        width: Math.max(width * 0.08, 0.055),
        height: Math.max(height * 0.13, 0.07),
        depth: Math.max(depth * 0.52, 0.26),
      },
      scene,
    )
    const pivotPosition = {
      x: side * Math.max(width * 0.38, 0.26),
      y: Math.max(height * 0.78, 0.36),
      z: -Math.max(depth * 0.14, 0.08),
    }
    const jawRoot = new TransformNode(`${role}-${blockId}-grabber-jaw-clamp-root-${side}`, scene)

    pivot.rotation.z = Math.PI / 2
    pivot.position.set(pivotPosition.x, pivotPosition.y, pivotPosition.z)
    jawRoot.parent = parent
    jawRoot.position.set(pivotPosition.x, pivotPosition.y, pivotPosition.z)
    jawRoot.metadata = {
      animationProfile: 'grabber_clamp',
      kind: 'actuate',
      axis: 'y',
      amplitude: -side * 0.34,
      speed: 0.05,
    }
    clawTip.rotation.x = Math.PI / 2
    clawTip.rotation.z = side * 0.42
    clawTip.position.set(
      side * Math.max(width * 0.42, 0.28) - pivotPosition.x,
      Math.max(height * 0.72, 0.34) - pivotPosition.y,
      Math.max(depth * 0.42, 0.28) - pivotPosition.z,
    )
    innerGripPad.position.set(
      side * Math.max(width * 0.24, 0.16) - pivotPosition.x,
      Math.max(height * 0.44, 0.24) - pivotPosition.y,
      Math.max(depth * 0.34, 0.2) - pivotPosition.z,
    )
    innerGripPad.rotation.z = side * 0.18
    jawBrace.position.set(
      side * Math.max(width * 0.34, 0.22) - pivotPosition.x,
      Math.max(height * 0.58, 0.3) - pivotPosition.y,
      Math.max(depth * 0.15, 0.1) - pivotPosition.z,
    )
    jawBrace.rotation.z = side * 0.28
    jawBrace.rotation.x = -0.1
    attachRoleMesh(pivot, parent, materials.steel, 'trim')
    attachWeaponEdgeMesh(clawTip, jawRoot, materials.warning)
    attachRoleMesh(innerGripPad, jawRoot, materials.rubber, 'rubber')
    attachRoleMesh(jawBrace, jawRoot, materials.steel, 'trim')
  }

  for (let index = 0; index < 4; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-grabber-side-arm-bolt-${index}`,
      {
        height: 0.022,
        diameter: Math.max(width * 0.045, 0.026),
        tessellation: 8,
      },
      scene,
    )

    bolt.rotation.x = Math.PI / 2
    bolt.position.set(
      side * Math.max(width * 0.36, 0.24),
      Math.max(height * (0.36 + Math.floor(index / 2) * 0.36), 0.2 + Math.floor(index / 2) * 0.14),
      Math.max(depth * 0.08, 0.05),
    )
    attachRoleMesh(bolt, parent, materials.steel, 'trim')
  }
}
