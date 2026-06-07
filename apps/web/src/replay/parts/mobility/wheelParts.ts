import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { MobilityPartRenderArgs } from './types'
import { wheelVisualFor } from './partVisuals'
import { createMecanumWheelPart } from './mecanumWheelPart'
import { createOmniWheelPart } from './omniWheelPart'
import { createSpikedWheelPart } from './spikedWheelPart'

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

  if (partId === 'Wheel_Omni') {
    createOmniWheelPart(args, diameter, wheelWidth)
    return
  }

  if (partId === 'Wheel_Mecanum') {
    createMecanumWheelPart(args, diameter, wheelWidth)
    return
  }

  if (partId === 'Wheel_Spiked') {
    createSpikedWheelPart(args, diameter, wheelWidth)
    return
  }

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

  wheel.metadata = { animationProfile: 'wheel_spin', kind: 'roll', axis: 'x', speed: visual.rollSpeed }
  rim.metadata = { animationProfile: 'wheel_spin', kind: 'roll', axis: 'x', speed: visual.rollSpeed }
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
  hub.metadata = { animationProfile: 'wheel_spin', kind: 'roll', axis: 'x', speed: visual.rollSpeed }
  hub.parent = parent
  hub.material = materials.trim
  createWheelFaceHardware(args, diameter, wheelWidth, visual.hubScale)
  createWheelRubberWear(args, wheel, diameter, wheelWidth, visual.treadCount)
  createWheelValveStem(args, wheel, diameter, wheelWidth)

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

}

function createWheelRubberWear(
  { scene, materials, role, blockId }: MobilityPartRenderArgs,
  wheel: Mesh,
  diameter: number,
  wheelWidth: number,
  treadCount: number,
): void {
  const scuffCount = Math.min(8, Math.max(4, Math.floor(treadCount * 0.65)))
  const faceOffset = Math.max(wheelWidth * 0.53, 0.11)

  for (let index = 0; index < scuffCount; index += 1) {
    const angle = (Math.PI * 2 * index) / scuffCount + (index % 2 === 0 ? 0.16 : -0.12)
    const side = index % 2 === 0 ? -1 : 1
    const scuff = MeshBuilder.CreateBox(
      `${role}-${blockId}-wheel-rubber-scuff-${index}`,
      {
        width: Math.max(wheelWidth * 0.028, 0.014),
        height: Math.max(diameter * 0.032, 0.018),
        depth: Math.max(diameter * 0.18, 0.07),
      },
      scene,
    )

    scuff.position.set(
      side * faceOffset,
      Math.sin(angle) * diameter * 0.34,
      Math.cos(angle) * diameter * 0.34,
    )
    scuff.rotation.x = angle + Math.PI * 0.5
    scuff.rotation.z = Math.PI / 2
    scuff.parent = wheel
    scuff.material = materials.profile.scuffed_rubber
  }
}

function createWheelValveStem(
  { scene, materials, role, blockId }: MobilityPartRenderArgs,
  wheel: Mesh,
  diameter: number,
  wheelWidth: number,
): void {
  const stem = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel-valve-stem`,
    {
      height: Math.max(wheelWidth * 0.12, 0.04),
      diameter: Math.max(diameter * 0.028, 0.018),
      tessellation: 8,
    },
    scene,
  )

  stem.rotation.z = Math.PI / 2
  stem.position.set(
    Math.max(wheelWidth * 0.56, 0.12),
    diameter * 0.22,
    diameter * 0.23,
  )
  stem.parent = wheel
  stem.material = materials.trim
}

function createLargeWheelDetails(
  { scene, material, materials, role, blockId }: MobilityPartRenderArgs,
  wheel: Mesh,
  diameter: number,
  wheelWidth: number,
): void {
  const sideOffset = Math.max(wheelWidth * 0.5, 0.1)
  const sidewallRadius = diameter * 0.36

  for (const side of [-1, 1]) {
    const beadPlate = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-large-wheel-bead-plate-${side}`,
      {
        height: Math.max(wheelWidth * 0.055, 0.026),
        diameter: Math.max(diameter * 0.88, 0.4),
        tessellation: 28,
      },
      scene,
    )

    beadPlate.rotation.z = Math.PI / 2
    beadPlate.position.x = side * sideOffset
    beadPlate.parent = wheel
    beadPlate.material = materials.rubber

    const clampPlate = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-large-wheel-clamp-plate-${side}`,
      {
        height: Math.max(wheelWidth * 0.07, 0.03),
        diameter: Math.max(diameter * 0.48, 0.22),
        tessellation: 18,
      },
      scene,
    )

    clampPlate.rotation.z = Math.PI / 2
    clampPlate.position.x = side * (sideOffset + Math.max(wheelWidth * 0.035, 0.016))
    clampPlate.parent = wheel
    clampPlate.material = material

    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8
      const lug = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-large-wheel-sidewall-lug-${side}-${index}`,
        {
          height: Math.max(wheelWidth * 0.04, 0.018),
          diameter: Math.max(diameter * 0.045, 0.025),
          tessellation: 8,
        },
        scene,
      )

      lug.rotation.z = Math.PI / 2
      lug.position.set(
        side * (sideOffset + Math.max(wheelWidth * 0.085, 0.034)),
        Math.sin(angle) * sidewallRadius,
        Math.cos(angle) * sidewallRadius,
      )
      lug.parent = wheel
      lug.material = materials.trim
    }
  }

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * index) / 6
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-large-wheel-spoke-${index}`,
      {
        width: Math.max(diameter * 0.07, 0.06),
        height: Math.max(wheelWidth * 0.09, 0.045),
        depth: diameter * 0.64,
      },
      scene,
    )

    spoke.rotation.y = angle
    spoke.parent = wheel
    spoke.material = material
  }
}

function createWheelFaceHardware(
  { scene, parent, materials, role, blockId }: MobilityPartRenderArgs,
  diameter: number,
  wheelWidth: number,
  hubScale: number,
): void {
  const faceOffset = Math.max(wheelWidth * 0.54, 0.12)
  const boltRadius = Math.max(diameter * hubScale * 0.48, 0.09)

  for (const side of [-1, 1]) {
    const cheekRing = MeshBuilder.CreateTorus(
      `${role}-${blockId}-wheel-cheek-ring-${side}`,
      {
        diameter: Math.max(diameter * 0.72, 0.34),
        thickness: Math.max(diameter * 0.025, 0.022),
        tessellation: 22,
      },
      scene,
    )

    cheekRing.rotation.z = Math.PI / 2
    cheekRing.position.x = side * faceOffset
    attachMesh(cheekRing, parent, materials.steel)

    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6
      const bolt = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-wheel-lug-${side}-${index}`,
        {
          height: Math.max(wheelWidth * 0.04, 0.018),
          diameter: Math.max(diameter * 0.055, 0.022),
          tessellation: 8,
        },
        scene,
      )

      bolt.rotation.z = Math.PI / 2
      bolt.position.set(
        side * (faceOffset + Math.max(wheelWidth * 0.025, 0.012)),
        Math.sin(angle) * boltRadius,
        Math.cos(angle) * boltRadius,
      )
      attachMesh(bolt, parent, materials.trim)
    }
  }

  for (let index = 0; index < 5; index += 1) {
    const angle = (Math.PI * index) / 5
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-wheel-face-spoke-${index}`,
      {
        width: Math.max(wheelWidth * 0.08, 0.04),
        height: Math.max(diameter * 0.045, 0.03),
        depth: Math.max(diameter * 0.44, 0.18),
      },
      scene,
    )

    spoke.rotation.x = angle
    attachMesh(spoke, parent, materials.steel)
  }
}
