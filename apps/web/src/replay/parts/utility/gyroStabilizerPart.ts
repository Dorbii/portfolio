import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'

export function createGyroStabilizerPart({
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

  const baseWidth = Math.max(width * 0.72, 0.48)
  const baseDepth = Math.max(depth * 0.56, 0.36)
  const baseY = -Math.max(height * 0.14, 0.07)
  const cageY = Math.max(height * 0.34, 0.28)
  const ringDiameter = Math.max(Math.min(width, depth) * 0.7, 0.46)
  const flywheelDiameter = Math.max(ringDiameter * 0.44, 0.24)
  const axleLength = Math.max(width * 0.56, 0.36)
  const pivotHeight = Math.max(ringDiameter * 1.12, 0.52)

  const basePlate = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-round-base`,
    {
      height: Math.max(height * 0.08, 0.045),
      diameter: Math.max(baseWidth, baseDepth),
      tessellation: 32,
    },
    scene,
  )
  const baseFoot = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-low-socket-foot`,
    {
      height: Math.max(height * 0.05, 0.03),
      diameter: Math.max(baseWidth * 0.56, 0.28),
      tessellation: 24,
    },
    scene,
  )
  const pedestal = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-pedestal-column`,
    {
      height: Math.max(height * 0.3, 0.18),
      diameter: Math.max(width * 0.08, 0.05),
      tessellation: 18,
    },
    scene,
  )
  const pivotAxis = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-vertical-pivot-axis`,
    {
      height: pivotHeight,
      diameter: Math.max(width * 0.032, 0.02),
      tessellation: 12,
    },
    scene,
  )
  const lowerPivot = MeshBuilder.CreateSphere(
    `${role}-${blockId}-gyro-lower-pivot-ball`,
    { diameter: Math.max(width * 0.08, 0.045), segments: 10 },
    scene,
  )
  const upperPivot = MeshBuilder.CreateSphere(
    `${role}-${blockId}-gyro-upper-pivot-ball`,
    { diameter: Math.max(width * 0.07, 0.04), segments: 10 },
    scene,
  )

  basePlate.position.y = baseY
  baseFoot.position.y = baseY + Math.max(height * 0.065, 0.038)
  pedestal.position.y = baseY + Math.max(height * 0.21, 0.13)
  pivotAxis.position.y = cageY
  lowerPivot.position.y = cageY - pivotHeight * 0.5
  upperPivot.position.y = cageY + pivotHeight * 0.5
  attachMesh(basePlate, parent, materials.trim)
  attachMesh(baseFoot, parent, materials.steel)
  attachMesh(pedestal, parent, materials.steel)
  attachMesh(pivotAxis, parent, materials.steel)
  attachMesh(lowerPivot, parent, materials.steel)
  attachMesh(upperPivot, parent, materials.steel)

  const outerGimbal = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-outer-gimbal-ring`,
    {
      diameter: ringDiameter,
      thickness: Math.max(width * 0.045, 0.028),
      tessellation: 32,
    },
    scene,
  )
  const equatorGimbal = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-equator-gimbal-ring`,
    {
      diameter: Math.max(ringDiameter * 0.92, 0.4),
      thickness: Math.max(width * 0.034, 0.022),
      tessellation: 32,
    },
    scene,
  )
  const innerGimbal = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-inner-gimbal-ring`,
    {
      diameter: Math.max(ringDiameter * 0.68, 0.32),
      thickness: Math.max(width * 0.024, 0.016),
      tessellation: 28,
    },
    scene,
  )

  outerGimbal.position.y = cageY
  outerGimbal.rotation.x = Math.PI / 2
  equatorGimbal.position.y = cageY
  innerGimbal.position.y = cageY
  innerGimbal.rotation.z = Math.PI / 2
  attachMesh(outerGimbal, parent, materials.steel)
  attachMesh(equatorGimbal, parent, materials.steel)
  attachMesh(innerGimbal, parent, materials.trim)

  const rotorRoot = new TransformNode(`${role}-${blockId}-gyro-flywheel-motion-root`, scene)

  rotorRoot.position.set(0, cageY, 0)
  rotorRoot.metadata = { kind: 'spin', axis: 'x', speed: 0.11 }
  rotorRoot.parent = parent

  const flywheel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-flywheel-disc`,
    {
      height: Math.max(width * 0.11, 0.07),
      diameter: flywheelDiameter,
      tessellation: 48,
    },
    scene,
  )
  const flywheelHub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-flywheel-hub`,
    {
      height: Math.max(width * 0.15, 0.09),
      diameter: Math.max(flywheelDiameter * 0.32, 0.11),
      tessellation: 24,
    },
    scene,
  )
  const axle = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-horizontal-axle`,
    {
      height: axleLength,
      diameter: Math.max(width * 0.04, 0.026),
      tessellation: 14,
    },
    scene,
  )

  flywheel.rotation.z = Math.PI / 2
  flywheelHub.rotation.z = Math.PI / 2
  axle.rotation.z = Math.PI / 2
  attachMesh(flywheel, rotorRoot, materials.steel)
  attachMesh(flywheelHub, rotorRoot, materials.warning)
  attachMesh(axle, rotorRoot, materials.steel)

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-gyro-flywheel-spoke-${index}`,
      {
        width: Math.max(width * 0.026, 0.016),
        height: Math.max(width * 0.026, 0.016),
        depth: Math.max(flywheelDiameter * 0.44, 0.12),
      },
      scene,
    )

    spoke.rotation.x = angle
    attachMesh(spoke, rotorRoot, materials.trim)
  }

  for (const side of [-1, 1]) {
    const pivotSaddle = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-gyro-pivot-saddle-${side}`,
      {
        height: Math.max(width * 0.09, 0.052),
        diameter: Math.max(width * 0.09, 0.052),
        tessellation: 16,
      },
      scene,
    )

    pivotSaddle.position.set(side * axleLength * 0.5, cageY, 0)
    pivotSaddle.rotation.z = Math.PI / 2
    attachMesh(pivotSaddle, parent, materials.steel)
  }

  const teamIndex = MeshBuilder.CreateBox(
    `${role}-${blockId}-gyro-team-index-tab`,
    {
      width: Math.max(width * 0.16, 0.09),
      height: Math.max(height * 0.025, 0.016),
      depth: Math.max(depth * 0.18, 0.1),
    },
    scene,
  )

  teamIndex.position.set(0, baseY + Math.max(height * 0.12, 0.07), baseDepth * 0.22)
  attachMesh(teamIndex, parent, material)

  for (const side of [-1, 1]) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-gyro-base-bolt-${side}`,
      { height: 0.025, diameter: Math.max(width * 0.055, 0.032), tessellation: 10 },
      scene,
    )

    bolt.position.set(side * baseWidth * 0.28, baseY + Math.max(height * 0.08, 0.05), -baseDepth * 0.28)
    attachMesh(bolt, parent, materials.steel)
  }
}
