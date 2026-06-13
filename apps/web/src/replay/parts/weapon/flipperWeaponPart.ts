import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh, createBoxDetail, createRampBlock } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'
import {
  attachRoleMesh,
  attachWeaponEdgeMesh,
  tagRoleMesh,
  tagWeaponEdgeMesh,
} from './weaponRenderHelpers'

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
  const frontLip = MeshBuilder.CreateBox(
    `${role}-${blockId}-flipper-hardened-front-lip`,
    {
      width: Math.max(width * 1.18, 0.68),
      height: Math.max(height * 0.08, 0.045),
      depth: Math.max(depth * 0.12, 0.07),
    },
    scene,
  )
  const hingePosition = {
    x: 0,
    y: Math.max(height * 0.26, 0.16),
    z: -Math.max(depth * 0.44, 0.24),
  }
  const paddleRoot = new TransformNode(`${role}-${blockId}-flipper-paddle-snap-root`, scene)

  paddle.position.set(0, Math.max(height * 0.18, 0.12) - hingePosition.y, Math.max(depth * 0.22, 0.14) - hingePosition.z)
  hinge.rotation.z = Math.PI / 2
  hinge.position.set(hingePosition.x, hingePosition.y, hingePosition.z)
  paddleRoot.parent = parent
  paddleRoot.position.set(hingePosition.x, hingePosition.y, hingePosition.z)
  paddleRoot.metadata = { animationProfile: 'flipper_snap', kind: 'actuate', axis: 'x', amplitude: -0.78, speed: 0.05 }
  attachMesh(paddle, paddleRoot, material)
  tagRoleMesh(paddle, 'damageable')
  frontLip.position.set(0, Math.max(height * 0.32, 0.17) - hingePosition.y, Math.max(depth * 0.86, 0.45) - hingePosition.z)
  frontLip.rotation.x = -0.08
  attachRoleMesh(hinge, parent, materials.trim, 'trim')
  attachWeaponEdgeMesh(frontLip, paddleRoot, materials.steel)

  for (let side = -1; side <= 1; side += 2) {
    tagRoleMesh(
      createBoxDetail(
        scene,
        paddleRoot,
        materials.warning,
        `${role}-${blockId}-flipper-side-link-${side}`,
        Math.max(width * 0.12, 0.08),
        Math.max(height * 0.38, 0.18),
        Math.max(depth * 0.88, 0.42),
        side * Math.max(width * 0.48, 0.3),
        Math.max(height * 0.28, 0.16) - hingePosition.y,
        -hingePosition.z,
      ),
      'trim',
    )
  }

  for (let index = 0; index < 5; index += 1) {
    const x = (index - 2) * Math.max(width * 0.21, 0.12)
    const knuckle = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-flipper-hinge-knuckle-${index}`,
      {
        height: Math.max(width * 0.12, 0.07),
        diameter: Math.max(height * 0.24, 0.12),
        tessellation: 12,
      },
      scene,
    )
    const paddleRib = MeshBuilder.CreateBox(
      `${role}-${blockId}-flipper-paddle-rib-${index}`,
      {
        width: Math.max(width * 0.06, 0.04),
        height: Math.max(height * 0.065, 0.032),
        depth: Math.max(depth * 0.74, 0.34),
      },
      scene,
    )

    knuckle.rotation.z = Math.PI / 2
    knuckle.position.set(x, hinge.position.y, hinge.position.z)
    paddleRib.position.set(x, Math.max(height * 0.34, 0.19) - hingePosition.y, Math.max(depth * 0.32, 0.17) - hingePosition.z)
    paddleRib.rotation.x = -0.08
    attachRoleMesh(knuckle, parent, index % 2 === 0 ? materials.steel : materials.trim, 'trim')
    attachRoleMesh(paddleRib, paddleRoot, materials.trim, 'damageable')
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
    const actuatorSleeve = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-flipper-hydraulic-sleeve-${side}`,
      {
        height: Math.max(depth * 0.34, 0.22),
        diameter: Math.max(width * 0.08, 0.052),
        tessellation: 10,
      },
      scene,
    )
    const rearClevis = MeshBuilder.CreateBox(
      `${role}-${blockId}-flipper-rear-clevis-${side}`,
      {
        width: Math.max(width * 0.12, 0.075),
        height: Math.max(height * 0.16, 0.075),
        depth: Math.max(depth * 0.1, 0.06),
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
    actuatorSleeve.rotation.x = Math.PI / 2
    actuatorSleeve.rotation.z = side * 0.18
    actuatorSleeve.position.set(
      side * Math.max(width * 0.28, 0.18),
      Math.max(height * 0.32, 0.18),
      -Math.max(depth * 0.22, 0.12),
    )
    rearClevis.position.set(
      side * Math.max(width * 0.28, 0.18),
      Math.max(height * 0.24, 0.15),
      -Math.max(depth * 0.44, 0.24),
    )
    attachRoleMesh(actuator, parent, materials.steel, 'trim')
    attachRoleMesh(actuatorSleeve, parent, materials.utility, 'damageable')
    attachRoleMesh(rearClevis, parent, materials.trim, 'trim')
  }

  for (let index = 0; index < 4; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const chip = createBoxDetail(
      scene,
      parent,
      materials.profile.burnt_critical_metal,
      `${role}-${blockId}-flipper-front-edge-chip-${index}`,
      Math.max(width * 0.14, 0.08),
      0.022,
      Math.max(depth * 0.05, 0.035),
      side * Math.max(width * (0.18 + Math.floor(index / 2) * 0.22), 0.12),
      Math.max(height * 0.38, 0.21),
      Math.max(depth * 0.92, 0.5),
    )

    chip.rotation.z = side * 0.12
    tagWeaponEdgeMesh(chip)
  }
}
