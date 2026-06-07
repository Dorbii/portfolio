import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail, createRampBlock } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

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

  for (let side = -1; side <= 1; side += 2) {
    const actuator = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-flipper-actuator-${side}`,
      {
        height: Math.max(depth * 0.72, 0.38),
        diameter: Math.max(width * 0.055, 0.04),
        tessellation: 10,
      },
      scene,
    )

    actuator.rotation.x = Math.PI / 2
    actuator.rotation.z = side * 0.18
    actuator.position.set(
      side * Math.max(width * 0.28, 0.18),
      Math.max(height * 0.36, 0.2),
      -Math.max(depth * 0.02, 0.02),
    )
    attachMesh(actuator, parent, materials.steel)
  }
}
