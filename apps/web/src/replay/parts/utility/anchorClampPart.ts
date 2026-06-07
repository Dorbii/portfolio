import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import { createPbrSceneMaterial } from '../../rendering/sceneUtils'
import type { UtilityPartRenderArgs } from './types'

export function createAnchorClampPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: UtilityPartRenderArgs): void {

  const baseWidth = Math.max(width * 0.86, 0.5)
  const baseDepth = Math.max(depth * 0.78, 0.44)
  const baseHeight = Math.max(height * 0.18, 0.1)
  const baseY = Math.max(height * 0.1, 0.06)
  const skidY = baseY - Math.max(height * 0.11, 0.065)
  const railX = Math.max(width * 0.36, 0.22)
  const railZ = Math.max(depth * 0.08, 0.05)

  const darkSteelMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-anchor-worn-steel-mat`,
    '#424641',
    '#080908',
    0.86,
    0.46,
    'utility',
  )
  const ballastMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-anchor-dark-ballast-mat`,
    '#2d302d',
    '#040504',
    0.62,
    0.54,
    'utility',
  )
  const rubberMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-anchor-rubber-foot-mat`,
    '#0b0c0b',
    '#010101',
    0.06,
    0.86,
    'rubber',
  )

  const ballastSlab = MeshBuilder.CreateBox(
    `${role}-${blockId}-anchor-bolted-ballast-slab`,
    {
      width: baseWidth,
      height: baseHeight,
      depth: baseDepth,
    },
    scene,
  )
  const armorCap = MeshBuilder.CreateBox(
    `${role}-${blockId}-anchor-chamfered-top-plate`,
    {
      width: Math.max(baseWidth * 0.78, 0.42),
      height: Math.max(height * 0.08, 0.045),
      depth: Math.max(baseDepth * 0.62, 0.32),
    },
    scene,
  )
  const rubberPad = MeshBuilder.CreateBox(
    `${role}-${blockId}-anchor-rubber-isolation-pad`,
    {
      width: Math.max(baseWidth * 0.7, 0.36),
      height: Math.max(height * 0.045, 0.026),
      depth: Math.max(baseDepth * 0.54, 0.28),
    },
    scene,
  )

  ballastSlab.position.y = baseY
  armorCap.position.y = baseY + baseHeight * 0.62
  rubberPad.position.y = skidY
  attachMesh(ballastSlab, parent, ballastMaterial)
  attachMesh(armorCap, parent, darkSteelMaterial)
  attachMesh(rubberPad, parent, rubberMaterial)

  for (const side of [-1, 1]) {
    const weightPlate = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-anchor-removable-weight-plate-${side}`,
      {
        height: Math.max(height * 0.05, 0.03),
        diameter: Math.max(width * 0.24, 0.14),
        tessellation: 18,
      },
      scene,
    )
    const weightBoss = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-anchor-weight-plate-center-boss-${side}`,
      {
        height: Math.max(height * 0.026, 0.016),
        diameter: Math.max(width * 0.09, 0.055),
        tessellation: 12,
      },
      scene,
    )

    weightPlate.position.set(side * baseWidth * 0.22, armorCap.position.y + Math.max(height * 0.07, 0.04), -baseDepth * 0.12)
    weightBoss.position.set(weightPlate.position.x, weightPlate.position.y + Math.max(height * 0.035, 0.02), weightPlate.position.z)
    attachMesh(weightPlate, parent, materials.steel)
    attachMesh(weightBoss, parent, ballastMaterial)
  }

  for (const side of [-1, 1]) {
    const skidRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-anchor-deployable-skid-rail-${side}`,
      {
        width: Math.max(width * 0.11, 0.07),
        height: Math.max(height * 0.075, 0.044),
        depth: Math.max(depth * 0.88, 0.5),
      },
      scene,
    )
    const outriggerArm = MeshBuilder.CreateBox(
      `${role}-${blockId}-anchor-outrigger-arm-${side}`,
      {
        width: Math.max(width * 0.36, 0.22),
        height: Math.max(height * 0.055, 0.032),
        depth: Math.max(depth * 0.1, 0.06),
      },
      scene,
    )
    const lockingPin = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-anchor-locking-pin-${side}`,
      {
        height: Math.max(height * 0.26, 0.15),
        diameter: Math.max(width * 0.075, 0.045),
        tessellation: 12,
      },
      scene,
    )
    const floorFoot = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-anchor-bite-foot-${side}`,
      {
        height: Math.max(height * 0.04, 0.026),
        diameter: Math.max(width * 0.2, 0.12),
        tessellation: 14,
      },
      scene,
    )
    const sideWeight = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-anchor-side-ballast-weight-${side}`,
      {
        height: Math.max(width * 0.16, 0.09),
        diameter: Math.max(depth * 0.28, 0.16),
        tessellation: 16,
      },
      scene,
    )

    skidRail.position.set(side * railX, skidY + Math.max(height * 0.018, 0.012), 0)
    outriggerArm.position.set(side * Math.max(width * 0.26, 0.16), baseY + Math.max(height * 0.07, 0.04), railZ)
    lockingPin.position.set(side * railX, baseY + Math.max(height * 0.2, 0.12), Math.max(depth * 0.24, 0.14))
    floorFoot.position.set(side * railX, skidY - Math.max(height * 0.04, 0.026), Math.max(depth * 0.24, 0.14))
    sideWeight.rotation.z = Math.PI / 2
    sideWeight.position.set(side * Math.max(width * 0.48, 0.28), baseY + Math.max(height * 0.04, 0.026), -Math.max(depth * 0.22, 0.13))
    attachMesh(skidRail, parent, darkSteelMaterial)
    attachMesh(outriggerArm, parent, materials.steel)
    attachMesh(lockingPin, parent, materials.steel)
    attachMesh(floorFoot, parent, rubberMaterial)
    attachMesh(sideWeight, parent, darkSteelMaterial)
  }

  for (let index = 0; index < 4; index += 1) {
    const tooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-anchor-floor-bite-tooth-${index}`,
      {
        height: Math.max(height * 0.13, 0.075),
        diameterTop: 0,
        diameterBottom: Math.max(width * 0.11, 0.065),
        tessellation: 8,
      },
      scene,
    )
    const side = index % 2 === 0 ? -1 : 1
    const end = index < 2 ? -1 : 1

    tooth.rotation.x = Math.PI
    tooth.position.set(
      side * Math.max(width * 0.2, 0.12),
      skidY - Math.max(height * 0.08, 0.045),
      end * Math.max(depth * 0.34, 0.2),
    )
    attachMesh(tooth, parent, materials.warning)
  }

  for (let index = 0; index < 4; index += 1) {
    const stripe = MeshBuilder.CreateBox(
      `${role}-${blockId}-anchor-warning-stripe-${index}`,
      {
        width: Math.max(width * 0.12, 0.07),
        height: Math.max(height * 0.018, 0.012),
        depth: Math.max(depth * 0.05, 0.028),
      },
      scene,
    )

    stripe.position.set((index - 1.5) * Math.max(width * 0.14, 0.08), armorCap.position.y + Math.max(height * 0.045, 0.024), -baseDepth * 0.36)
    stripe.rotation.y = -0.46
    attachMesh(stripe, parent, materials.warning)
  }

  for (let index = 0; index < 8; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-anchor-ballast-bolt-${index}`,
      {
        height: Math.max(height * 0.024, 0.016),
        diameter: Math.max(width * 0.045, 0.028),
        tessellation: 10,
      },
      scene,
    )
    const sideX = index % 2 === 0 ? -1 : 1
    const laneZ = Math.floor(index / 2) - 1.5

    bolt.position.set(sideX * baseWidth * 0.38, armorCap.position.y + Math.max(height * 0.05, 0.03), laneZ * baseDepth * 0.18)
    attachMesh(bolt, parent, materials.steel)
  }

  const loadIndicator = MeshBuilder.CreateBox(
    `${role}-${blockId}-anchor-team-load-indicator`,
    {
      width: Math.max(width * 0.3, 0.18),
      height: Math.max(height * 0.024, 0.016),
      depth: Math.max(depth * 0.055, 0.032),
    },
    scene,
  )

  loadIndicator.position.set(0, armorCap.position.y + Math.max(height * 0.06, 0.035), baseDepth * 0.36)
  attachMesh(loadIndicator, parent, material)
}
