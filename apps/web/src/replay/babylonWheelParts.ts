import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  Quaternion,
  Vector3,
} from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
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

  wheel.metadata = { kind: 'roll', axis: 'x', speed: visual.rollSpeed }
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
  createWheelFaceHardware(args, diameter, wheelWidth, visual.hubScale)

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

function createOmniWheelPart(
  { scene, parent, materials, role, blockId }: MobilityPartRenderArgs,
  diameter: number,
  wheelWidth: number,
): void {
  const wheelRoot = new TransformNode(`${role}-${blockId}-omni-wheel-root`, scene)
  const core = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-omni-core`,
    {
      height: Math.max(wheelWidth * 0.58, 0.2),
      diameter: Math.max(diameter * 0.5, 0.3),
      tessellation: 24,
    },
    scene,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-omni-hub`,
    {
      height: Math.max(wheelWidth * 0.9, 0.25),
      diameter: Math.max(diameter * 0.28, 0.18),
      tessellation: 18,
    },
    scene,
  )

  wheelRoot.metadata = { kind: 'roll', axis: 'x', speed: 0.3 }
  wheelRoot.parent = parent
  core.rotation.z = Math.PI / 2
  hub.rotation.z = Math.PI / 2
  attachMesh(core, wheelRoot, materials.steel)
  attachMesh(hub, wheelRoot, materials.steel)

  const sidePlateDiameter = Math.max(diameter * 0.72, 0.4)
  const sidePlateOffset = Math.max(wheelWidth * 0.4, 0.12)

  for (let side = -1; side <= 1; side += 2) {
    const sidePlate = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-side-plate-${side}`,
      {
        height: Math.max(wheelWidth * 0.08, 0.034),
        diameter: sidePlateDiameter,
        tessellation: 24,
      },
      scene,
    )
    const faceRim = MeshBuilder.CreateTorus(
      `${role}-${blockId}-omni-face-rim-${side}`,
      {
        diameter: Math.max(diameter * 0.76, 0.42),
        thickness: Math.max(diameter * 0.028, 0.024),
        tessellation: 28,
      },
      scene,
    )
    const hubCollar = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-hub-collar-${side}`,
      {
        height: Math.max(wheelWidth * 0.06, 0.026),
        diameter: Math.max(diameter * 0.42, 0.24),
        tessellation: 20,
      },
      scene,
    )

    sidePlate.rotation.z = Math.PI / 2
    sidePlate.position.x = side * sidePlateOffset
    faceRim.rotation.z = Math.PI / 2
    faceRim.position.x = side * (sidePlateOffset + Math.max(wheelWidth * 0.045, 0.02))
    hubCollar.rotation.z = Math.PI / 2
    hubCollar.position.x = side * (sidePlateOffset + Math.max(wheelWidth * 0.078, 0.034))
    attachMesh(sidePlate, wheelRoot, materials.trim)
    attachMesh(faceRim, wheelRoot, materials.steel)
    attachMesh(hubCollar, wheelRoot, materials.steel)
    createOmniFaceCutouts(scene, wheelRoot, materials.rubber, role, blockId, side, sidePlateOffset, diameter, wheelWidth)
    createOmniBoltCircle(scene, wheelRoot, materials.steel, `${role}-${blockId}-omni-side-bolt-${side}`, {
      diameter: sidePlateDiameter,
      faceX: side * (sidePlateOffset + Math.max(wheelWidth * 0.04, 0.025)),
      side,
    })
  }

  const rollerCount = 12
  const rollerRadius = diameter * 0.44

  for (let index = 0; index < rollerCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rollerCount
    const rowSide = index % 2 === 0 ? -1 : 1
    const rollerLength = Math.max(wheelWidth * 0.4, 0.14)
    const rollerDiameter = Math.max(diameter * 0.145, 0.075)
    const roller = MeshBuilder.CreateCapsule(
      `${role}-${blockId}-omni-roller-${index}`,
      {
        height: rollerLength,
        radius: rollerDiameter * 0.5,
        subdivisions: 4,
        tessellation: 16,
      },
      scene,
    )

    roller.position.set(
      rowSide * Math.max(wheelWidth * 0.2, 0.075),
      Math.sin(angle) * rollerRadius,
      Math.cos(angle) * rollerRadius,
    )
    roller.rotation.x = -angle
    roller.rotation.y = rowSide * 0.7
    attachMesh(roller, wheelRoot, materials.rubber)
    createOmniRollerCaps(scene, wheelRoot, materials.steel, role, blockId, index, roller.position, angle, rowSide, rollerLength, rollerDiameter)
    createOmniRollerBracket(scene, wheelRoot, materials.steel, role, blockId, index, roller.position, angle, rowSide, diameter, wheelWidth)
  }

  createOmniSpokes(scene, wheelRoot, materials.steel, role, blockId, diameter, wheelWidth)
}

function createOmniFaceCutouts(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['rubber'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  side: number,
  sidePlateOffset: number,
  diameter: number,
  wheelWidth: number,
): void {
  for (let index = 0; index < 5; index += 1) {
    const angle = (Math.PI * 2 * index) / 5 + Math.PI / 5
    const slot = MeshBuilder.CreateBox(
      `${role}-${blockId}-omni-face-window-${side}-${index}`,
      {
        width: Math.max(wheelWidth * 0.024, 0.014),
        height: Math.max(diameter * 0.045, 0.026),
        depth: Math.max(diameter * 0.16, 0.08),
      },
      scene,
    )

    slot.position.set(
      side * (sidePlateOffset + Math.max(wheelWidth * 0.072, 0.03)),
      Math.sin(angle) * diameter * 0.24,
      Math.cos(angle) * diameter * 0.24,
    )
    slot.rotation.x = angle
    slot.rotation.z = Math.PI / 2
    attachMesh(slot, parent, material)
  }
}

function createOmniRollerCaps(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  index: number,
  position: { x: number; y: number; z: number },
  angle: number,
  rowSide: number,
  rollerLength: number,
  rollerDiameter: number,
): void {
  for (const capSide of [-1, 1]) {
    const cap = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-roller-cap-${index}-${capSide}`,
      {
        height: Math.max(rollerLength * 0.06, 0.018),
        diameter: rollerDiameter * 0.92,
        tessellation: 12,
      },
      scene,
    )

    cap.position.set(
      position.x + capSide * rowSide * rollerLength * 0.48,
      position.y,
      position.z,
    )
    cap.rotation.x = -angle
    cap.rotation.y = rowSide * 0.7
    attachMesh(cap, parent, material)
  }
}

function createOmniRollerBracket(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  index: number,
  position: { x: number; y: number; z: number },
  angle: number,
  rowSide: number,
  diameter: number,
  wheelWidth: number,
): void {
  for (const bracketSide of [-1, 1]) {
    const mount = MeshBuilder.CreateBox(
      `${role}-${blockId}-omni-roller-cheek-${index}-${bracketSide}`,
      {
        width: Math.max(wheelWidth * 0.055, 0.026),
        height: Math.max(diameter * 0.052, 0.032),
        depth: Math.max(diameter * 0.12, 0.068),
      },
      scene,
    )

    mount.position.set(
      position.x + bracketSide * rowSide * Math.max(wheelWidth * 0.22, 0.078),
      position.y * 0.98,
      position.z * 0.98,
    )
    mount.rotation.x = -angle
    mount.rotation.y = rowSide * 0.3
    attachMesh(mount, parent, material)
  }
}

function createOmniBoltCircle(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  name: string,
  options: {
    diameter: number
    faceX: number
    side: number
  },
): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const bolt = MeshBuilder.CreateCylinder(
      `${name}-${index}`,
      {
        height: 0.024,
        diameter: Math.max(options.diameter * 0.065, 0.018),
        tessellation: 8,
      },
      scene,
    )

    bolt.rotation.z = Math.PI / 2
    bolt.position.set(
      options.faceX,
      Math.sin(angle) * options.diameter * 0.32,
      Math.cos(angle) * options.diameter * 0.32,
    )
    bolt.scaling.x = options.side
    attachMesh(bolt, parent, material)
  }
}

function createOmniSpokes(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['trim'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  diameter: number,
  wheelWidth: number,
): void {
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * index) / 3
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-omni-spoke-${index}`,
      {
        width: Math.max(wheelWidth * 0.08, 0.045),
        height: Math.max(diameter * 0.06, 0.04),
        depth: Math.max(diameter * 0.56, 0.28),
      },
      scene,
    )

    spoke.rotation.x = angle
    attachMesh(spoke, parent, material)
  }
}

function createMecanumWheelPart(
  { scene, parent, materials, role, blockId }: MobilityPartRenderArgs,
  diameter: number,
  wheelWidth: number,
): void {
  const wheelRoot = new TransformNode(`${role}-${blockId}-mecanum-wheel-root`, scene)
  const core = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-mecanum-core`,
    {
      height: Math.max(wheelWidth * 0.58, 0.22),
      diameter: Math.max(diameter * 0.48, 0.3),
      tessellation: 24,
    },
    scene,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-mecanum-hub`,
    {
      height: Math.max(wheelWidth * 0.88, 0.24),
      diameter: Math.max(diameter * 0.3, 0.18),
      tessellation: 18,
    },
    scene,
  )

  wheelRoot.metadata = { kind: 'roll', axis: 'x', speed: 0.28 }
  wheelRoot.parent = parent
  core.rotation.z = Math.PI / 2
  hub.rotation.z = Math.PI / 2
  attachMesh(core, wheelRoot, materials.steel)
  attachMesh(hub, wheelRoot, materials.trim)

  createMecanumSideHardware(scene, wheelRoot, materials, role, blockId, diameter, wheelWidth)

  const rollerCount = 8
  const rollerRadius = diameter * 0.36
  const rollerLength = Math.max(wheelWidth * 0.5, 0.16)
  const rollerDiameter = Math.max(diameter * 0.17, 0.09)
  const handedness = 1

  for (let index = 0; index < rollerCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rollerCount
    const rollerAxis = createMecanumRollerAxis(angle, handedness)
    const rollerPosition = new Vector3(
      0,
      Math.sin(angle) * rollerRadius,
      Math.cos(angle) * rollerRadius,
    )
    const roller = MeshBuilder.CreateCapsule(
      `${role}-${blockId}-mecanum-roller-${index}`,
      {
        height: rollerLength,
        radius: rollerDiameter * 0.5,
        subdivisions: 5,
        tessellation: 18,
      },
      scene,
    )

    roller.position.copyFrom(rollerPosition)
    roller.rotationQuaternion = rotationFromYAxis(rollerAxis)
    attachMesh(roller, wheelRoot, materials.rubber)
    createMecanumRollerCaps(scene, wheelRoot, materials.steel, role, blockId, index, rollerPosition, rollerAxis, rollerLength, rollerDiameter)
    createMecanumRollerBearings(scene, wheelRoot, materials.steel, role, blockId, index, rollerPosition, rollerAxis, diameter, wheelWidth)
  }
}

function createMecanumSideHardware(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  materials: MobilityPartRenderArgs['materials'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  diameter: number,
  wheelWidth: number,
): void {
  const sideOffset = Math.max(wheelWidth * 0.38, 0.13)

  for (const side of [-1, 1]) {
    const sidePlate = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-mecanum-side-plate-${side}`,
      {
        height: Math.max(wheelWidth * 0.055, 0.024),
        diameter: Math.max(diameter * 0.66, 0.34),
        tessellation: 28,
      },
      scene,
    )
    const sideRim = MeshBuilder.CreateTorus(
      `${role}-${blockId}-mecanum-side-rim-${side}`,
      {
        diameter: Math.max(diameter * 0.72, 0.38),
        thickness: Math.max(diameter * 0.022, 0.016),
        tessellation: 28,
      },
      scene,
    )
    const hubCollar = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-mecanum-hub-collar-${side}`,
      {
        height: Math.max(wheelWidth * 0.07, 0.028),
        diameter: Math.max(diameter * 0.36, 0.2),
        tessellation: 20,
      },
      scene,
    )

    sidePlate.rotation.z = Math.PI / 2
    sideRim.rotation.z = Math.PI / 2
    hubCollar.rotation.z = Math.PI / 2
    sidePlate.position.x = side * sideOffset
    sideRim.position.x = side * (sideOffset + Math.max(wheelWidth * 0.03, 0.014))
    hubCollar.position.x = side * (sideOffset + Math.max(wheelWidth * 0.06, 0.026))
    attachMesh(sidePlate, parent, materials.trim)
    attachMesh(sideRim, parent, materials.steel)
    attachMesh(hubCollar, parent, materials.steel)
    createMecanumFaceFasteners(scene, parent, materials.steel, `${role}-${blockId}-mecanum-face-fastener-${side}`, {
      diameter: diameter * 0.5,
      faceX: side * (sideOffset + Math.max(wheelWidth * 0.065, 0.028)),
    })
  }
}

function createMecanumFaceFasteners(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  name: string,
  options: {
    diameter: number
    faceX: number
  },
): void {
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const fastener = MeshBuilder.CreateCylinder(
      `${name}-${index}`,
      {
        height: 0.014,
        diameter: Math.max(options.diameter * 0.048, 0.016),
        tessellation: 8,
      },
      scene,
    )

    fastener.rotation.z = Math.PI / 2
    fastener.position.set(
      options.faceX,
      Math.sin(angle) * options.diameter * 0.32,
      Math.cos(angle) * options.diameter * 0.32,
    )
    attachMesh(fastener, parent, material)
  }
}

function createMecanumRollerCaps(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  index: number,
  position: Vector3,
  axis: Vector3,
  rollerLength: number,
  rollerDiameter: number,
): void {
  for (const capSide of [-1, 1]) {
    const cap = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-mecanum-roller-cap-${index}-${capSide}`,
      {
        height: Math.max(rollerLength * 0.045, 0.014),
        diameter: rollerDiameter * 0.78,
        tessellation: 12,
      },
      scene,
    )

    cap.position.copyFrom(position.add(axis.scale(capSide * rollerLength * 0.46)))
    cap.rotationQuaternion = rotationFromYAxis(axis)
    attachMesh(cap, parent, material)
  }
}

function createMecanumRollerBearings(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  index: number,
  position: Vector3,
  axis: Vector3,
  diameter: number,
  wheelWidth: number,
): void {
  const sideOffset = Math.max(wheelWidth * 0.43, 0.14)

  for (const bearingSide of [-1, 1]) {
    const bearing = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-mecanum-roller-bearing-${index}-${bearingSide}`,
      {
        height: Math.max(wheelWidth * 0.045, 0.018),
        diameter: Math.max(diameter * 0.04, 0.024),
        tessellation: 10,
      },
      scene,
    )
    const tangentAnchor = axis.scale(bearingSide * wheelWidth * 0.09)
    const anchor = new Vector3(
      bearingSide * sideOffset,
      position.y * 0.86 + tangentAnchor.y,
      position.z * 0.86 + tangentAnchor.z,
    )

    bearing.position.copyFrom(anchor)
    bearing.rotation.z = Math.PI / 2
    attachMesh(bearing, parent, material)
  }
}

function createMecanumRollerAxis(angle: number, handedness: number): Vector3 {
  const tangent = new Vector3(0, Math.cos(angle), -Math.sin(angle))
  const wheelAxis = new Vector3(handedness * 0.62, 0, 0)

  return wheelAxis.add(tangent).normalize()
}

function rotationFromYAxis(axis: Vector3): Quaternion {
  const up = Vector3.Up()
  const normalized = axis.normalize()
  const dot = Vector3.Dot(up, normalized)

  if (dot < -0.999) {
    return Quaternion.RotationAxis(Vector3.Right(), Math.PI)
  }

  const cross = Vector3.Cross(up, normalized)

  return new Quaternion(cross.x, cross.y, cross.z, 1 + dot).normalize()
}

function createSpikedWheelPart(
  { scene, parent, material, materials, role, blockId }: MobilityPartRenderArgs,
  diameter: number,
  wheelWidth: number,
): void {
  const wheelRoot = new TransformNode(`${role}-${blockId}-spiked-wheel-root`, scene)
  const tireDiameter = Math.max(diameter * 0.92, 0.42)
  const tireRadius = tireDiameter * 0.5
  const tire = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spiked-wheel-tire`,
    {
      height: Math.max(wheelWidth * 0.9, 0.22),
      diameter: tireDiameter,
      tessellation: 30,
    },
    scene,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spiked-wheel-hub`,
    {
      height: Math.max(wheelWidth * 1.12, 0.26),
      diameter: Math.max(diameter * 0.34, 0.18),
      tessellation: 18,
    },
    scene,
  )
  const sideOffset = Math.max(wheelWidth * 0.43, 0.12)

  wheelRoot.metadata = { kind: 'roll', axis: 'x', speed: 0.19 }
  wheelRoot.parent = parent
  tire.rotation.z = Math.PI / 2
  hub.rotation.z = Math.PI / 2
  attachMesh(tire, wheelRoot, materials.rubber)
  attachMesh(hub, wheelRoot, materials.trim)

  for (const side of [-1, 1]) {
    const sidePlate = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spiked-wheel-side-plate-${side}`,
      {
        height: Math.max(wheelWidth * 0.065, 0.026),
        diameter: Math.max(diameter * 0.64, 0.32),
        tessellation: 24,
      },
      scene,
    )
    const biteRing = MeshBuilder.CreateTorus(
      `${role}-${blockId}-spiked-wheel-bite-ring-${side}`,
      {
        diameter: Math.max(diameter * 0.72, 0.36),
        thickness: Math.max(diameter * 0.035, 0.024),
        tessellation: 24,
      },
      scene,
    )

    sidePlate.rotation.z = Math.PI / 2
    biteRing.rotation.z = Math.PI / 2
    sidePlate.position.x = side * sideOffset
    biteRing.position.x = side * (sideOffset + Math.max(wheelWidth * 0.055, 0.022))
    attachMesh(sidePlate, wheelRoot, material)
    attachMesh(biteRing, wheelRoot, materials.steel)
    createSpikedWheelFaceFasteners(scene, wheelRoot, materials.steel, `${role}-${blockId}-spiked-wheel-face-fastener-${side}`, {
      diameter: diameter * 0.48,
      faceX: side * (sideOffset + Math.max(wheelWidth * 0.084, 0.034)),
    })
  }

  const spikeCount = 10
  const spikeLength = Math.max(diameter * 0.34, 0.16)
  const spikeBase = Math.max(diameter * 0.15, 0.076)

  for (let index = 0; index < spikeCount; index += 1) {
    const angle = (Math.PI * 2 * index) / spikeCount
    const radialAxis = new Vector3(0, Math.sin(angle), Math.cos(angle))
    const spikeCenter = radialAxis.scale(tireRadius + spikeLength * 0.38)
    const spike = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spiked-wheel-tooth-${index}`,
      {
        height: spikeLength,
        diameterTop: 0,
        diameterBottom: spikeBase,
        tessellation: 10,
      },
      scene,
    )
    const saddle = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spiked-wheel-tooth-saddle-${index}`,
      {
        height: Math.max(spikeLength * 0.18, 0.04),
        diameter: spikeBase * 1.22,
        tessellation: 10,
      },
      scene,
    )

    spike.position.copyFrom(spikeCenter)
    saddle.position.copyFrom(radialAxis.scale(tireRadius + spikeLength * 0.02))
    spike.rotationQuaternion = rotationFromYAxis(radialAxis)
    saddle.rotationQuaternion = rotationFromYAxis(radialAxis)
    spike.material = materials.warning
    saddle.material = materials.steel
    spike.parent = wheelRoot
    saddle.parent = wheelRoot
  }
}

function createSpikedWheelFaceFasteners(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  name: string,
  options: {
    diameter: number
    faceX: number
  },
): void {
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const fastener = MeshBuilder.CreateCylinder(
      `${name}-${index}`,
      {
        height: 0.018,
        diameter: Math.max(options.diameter * 0.062, 0.018),
        tessellation: 8,
      },
      scene,
    )

    fastener.rotation.z = Math.PI / 2
    fastener.position.set(
      options.faceX,
      Math.sin(angle) * options.diameter * 0.34,
      Math.cos(angle) * options.diameter * 0.34,
    )
    attachMesh(fastener, parent, material)
  }
}
