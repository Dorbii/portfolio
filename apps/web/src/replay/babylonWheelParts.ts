import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from './babylonMeshHelpers'
import type { MobilityPartRenderArgs } from './babylonMobilityPartTypes'
import { wheelVisualFor } from './babylonPartVisuals'

export function createWheelPart(args: MobilityPartRenderArgs): void {
  const {
    scene,
    parent,
    material,
    role,
    blockId,
    partId,
    width,
    height,
    depth,
    materials,
  } = args
  const visual = wheelVisualFor(partId)
  const diameter = Math.max(width * visual.diameterScale, 0.46)
  const wheelWidth = Math.max(depth * visual.widthScale, 0.2)
  const wheel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel`,
    {
      height: wheelWidth,
      diameter,
      tessellation: visual.tessellation,
    },
    scene,
  )
  const rim = MeshBuilder.CreateTorus(
    `${role}-${blockId}-wheel-rim`,
    {
      diameter,
      thickness: Math.max(diameter * visual.rimScale, 0.065),
      tessellation: 20,
    },
    scene,
  )

  wheel.rotation.z = Math.PI / 2
  rim.rotation.z = Math.PI / 2
  rim.position.y = 0

  wheel.metadata = { kind: 'roll', speed: visual.rollSpeed }
  wheel.parent = parent
  wheel.material = materials.rubber
  rim.parent = parent
  rim.material = material

  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel-hub`,
    {
      height: Math.max(wheelWidth * 1.14, 0.18),
      diameter: Math.max(diameter * visual.hubScale, 0.16),
      tessellation: 14,
    },
    scene,
  )
  hub.rotation.z = Math.PI / 2
  hub.parent = parent
  hub.material = materials.trim

  const axle = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel-axle`,
    { height: Math.max(wheelWidth * 1.18, 0.28), diameter: Math.max(diameter * 0.12, 0.1), tessellation: 12 },
    scene,
  )
  const motorPod = MeshBuilder.CreateBox(
    `${role}-${blockId}-wheel-motor-pod`,
    {
      width: Math.max(width * 0.48 * visual.motorScale, 0.22),
      height: Math.max(height * 0.5 * visual.motorScale, 0.2),
      depth: Math.max(depth * 0.45 * visual.motorScale, 0.18),
    },
    scene,
  )
  const linkageRail = MeshBuilder.CreateBox(
    `${role}-${blockId}-wheel-linkage-rail`,
    {
      width: Math.max(width * 0.64 * visual.motorScale, 0.3),
      height: Math.max(height * 0.14, 0.08),
      depth: Math.max(depth * 0.2, 0.1),
    },
    scene,
  )

  axle.rotation.x = Math.PI / 2
  motorPod.position.set(0, Math.max(height * 0.78, 0.36), -Math.max(depth * 0.22, 0.12))
  linkageRail.position.set(0, Math.max(height * 1.02, 0.48), Math.max(depth * 0.24, 0.12))
  axle.parent = parent
  axle.material = materials.trim
  attachMesh(motorPod, parent, material)
  attachMesh(linkageRail, parent, materials.trim)

  for (let side = -1; side <= 1; side += 2) {
    const actuator = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-wheel-actuator-${side}`,
      { height: Math.max(height * 0.74 * visual.motorScale, 0.28), diameter: 0.05, tessellation: 8 },
      scene,
    )

    actuator.position.set(
      side * Math.max(width * 0.26, 0.16),
      Math.max(height * 0.82, 0.36),
      Math.max(depth * 0.08, 0.06),
    )
    actuator.rotation.z = side * 0.18
    attachMesh(actuator, parent, materials.trim)
  }

  for (let index = 0; index < visual.treadCount; index += 1) {
    const angle = (Math.PI * 2 * index) / visual.treadCount
    const tread = MeshBuilder.CreateBox(
      `${role}-${blockId}-wheel-tread-${index}`,
      {
        width: Math.max(diameter * 0.16 * visual.treadScale, 0.06),
        height: Math.max(wheelWidth * 0.13, 0.045),
        depth: Math.max(diameter * 0.2 * visual.treadScale, 0.075),
      },
      scene,
    )

    tread.position.set(Math.cos(angle) * diameter * 0.52, 0, Math.sin(angle) * diameter * 0.52)
    tread.rotation.y = angle
    tread.parent = wheel
    tread.material = materials.rubber
  }

  if (partId === 'Wheel_Large') {
    createLargeWheelDetails(args, wheel, diameter, wheelWidth)
  }

  if (partId === 'Wheel_Omni') {
    createOmniWheelRollers(args, wheel, diameter, wheelWidth)
  }

  if (partId === 'Wheel_Spiked') {
    createSpikedWheelRim(args, wheel, diameter)
  }
}

function createLargeWheelDetails(
  { scene, material, role, blockId }: MobilityPartRenderArgs,
  wheel: Mesh,
  diameter: number,
  wheelWidth: number,
): void {
  const outerBand = MeshBuilder.CreateTorus(
    `${role}-${blockId}-large-wheel-outer-band`,
    {
      diameter: diameter * 1.08,
      thickness: Math.max(diameter * 0.065, 0.08),
      tessellation: 24,
    },
    scene,
  )

  outerBand.rotation.z = Math.PI / 2
  outerBand.parent = wheel
  outerBand.material = material

  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * index) / 4
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-large-wheel-spoke-${index}`,
      {
        width: Math.max(diameter * 0.08, 0.08),
        height: Math.max(wheelWidth * 0.08, 0.045),
        depth: diameter * 0.82,
      },
      scene,
    )

    spoke.rotation.y = angle
    spoke.parent = wheel
    spoke.material = material
  }
}

function createOmniWheelRollers(
  { scene, materials, role, blockId }: MobilityPartRenderArgs,
  wheel: Mesh,
  diameter: number,
  wheelWidth: number,
): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const roller = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-roller-${index}`,
      {
        height: Math.max(wheelWidth * 0.62, 0.13),
        diameter: Math.max(diameter * 0.11, 0.07),
        tessellation: 8,
      },
      scene,
    )

    roller.position.set(Math.cos(angle) * diameter * 0.48, 0, Math.sin(angle) * diameter * 0.48)
    roller.rotation.x = Math.PI / 2
    roller.rotation.y = angle + Math.PI / 4
    roller.metadata = { kind: 'roll', speed: 0.1 }
    roller.parent = wheel
    roller.material = materials.warning
  }
}

function createSpikedWheelRim(
  { scene, materials, role, blockId }: MobilityPartRenderArgs,
  wheel: Mesh,
  diameter: number,
): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const spike = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-wheel-spike-${index}`,
      {
        height: Math.max(diameter * 0.24, 0.12),
        diameterTop: 0,
        diameterBottom: Math.max(diameter * 0.11, 0.06),
        tessellation: 8,
      },
      scene,
    )

    spike.position.set(Math.cos(angle) * diameter * 0.62, 0, Math.sin(angle) * diameter * 0.62)
    spike.rotation.z = -angle
    spike.parent = wheel
    spike.material = materials.warning
  }
}
