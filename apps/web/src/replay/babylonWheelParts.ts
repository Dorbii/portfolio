import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
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
      height: Math.max(wheelWidth * 0.44, 0.16),
      diameter: Math.max(diameter * 0.44, 0.28),
      tessellation: 18,
    },
    scene,
  )
  const outerRing = MeshBuilder.CreateTorus(
    `${role}-${blockId}-omni-outer-ring`,
    {
      diameter: Math.max(diameter * 0.94, 0.52),
      thickness: Math.max(diameter * 0.05, 0.04),
      tessellation: 26,
    },
    scene,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-omni-hub`,
    {
      height: Math.max(wheelWidth * 0.78, 0.22),
      diameter: Math.max(diameter * 0.24, 0.16),
      tessellation: 14,
    },
    scene,
  )

  wheelRoot.metadata = { kind: 'roll', speed: 0.3 }
  wheelRoot.parent = parent
  core.rotation.z = Math.PI / 2
  outerRing.rotation.z = Math.PI / 2
  hub.rotation.z = Math.PI / 2
  attachMesh(core, wheelRoot, materials.steel)
  attachMesh(outerRing, wheelRoot, materials.steel)
  attachMesh(hub, wheelRoot, materials.steel)

  const sidePlateDiameter = Math.max(diameter * 0.62, 0.36)
  const sidePlateOffset = Math.max(wheelWidth * 0.34, 0.1)

  for (let side = -1; side <= 1; side += 2) {
    const sidePlate = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-side-plate-${side}`,
      {
        height: Math.max(wheelWidth * 0.06, 0.03),
        diameter: sidePlateDiameter,
        tessellation: 18,
      },
      scene,
    )

    sidePlate.rotation.z = Math.PI / 2
    sidePlate.position.x = side * sidePlateOffset
    attachMesh(sidePlate, wheelRoot, materials.trim)
    createOmniBoltCircle(scene, wheelRoot, materials.steel, `${role}-${blockId}-omni-side-bolt-${side}`, {
      diameter: sidePlateDiameter,
      faceX: side * (sidePlateOffset + Math.max(wheelWidth * 0.04, 0.025)),
      side,
    })
  }

  const rollerCount = 12
  const rollerRadius = diameter * 0.47

  for (let index = 0; index < rollerCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rollerCount
    const rowSide = index % 2 === 0 ? -1 : 1
    const roller = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-roller-${index}`,
      {
        height: Math.max(wheelWidth * 0.5, 0.14),
        diameter: Math.max(diameter * 0.15, 0.085),
        tessellation: 14,
      },
      scene,
    )
    const mount = MeshBuilder.CreateBox(
      `${role}-${blockId}-omni-roller-mount-${index}`,
      {
        width: Math.max(wheelWidth * 0.1, 0.045),
        height: Math.max(diameter * 0.1, 0.055),
        depth: Math.max(diameter * 0.2, 0.11),
      },
      scene,
    )

    roller.position.set(
      rowSide * Math.max(wheelWidth * 0.2, 0.07),
      Math.sin(angle) * rollerRadius,
      Math.cos(angle) * rollerRadius,
    )
    roller.rotation.x = -angle
    roller.rotation.y = rowSide * 0.78
    mount.position.copyFrom(roller.position)
    mount.rotation.x = -angle
    mount.rotation.y = rowSide * 0.34
    attachMesh(roller, wheelRoot, materials.rubber)
    attachMesh(mount, wheelRoot, materials.steel)
  }

  createOmniSpokes(scene, wheelRoot, materials.steel, role, blockId, diameter, wheelWidth)
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
      height: Math.max(wheelWidth * 0.7, 0.22),
      diameter: Math.max(diameter * 0.56, 0.32),
      tessellation: 18,
    },
    scene,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-mecanum-hub`,
    {
      height: Math.max(wheelWidth * 0.86, 0.24),
      diameter: Math.max(diameter * 0.28, 0.18),
      tessellation: 14,
    },
    scene,
  )

  wheelRoot.metadata = { kind: 'roll', speed: 0.28 }
  wheelRoot.parent = parent
  core.rotation.z = Math.PI / 2
  hub.rotation.z = Math.PI / 2
  attachMesh(core, wheelRoot, materials.steel)
  attachMesh(hub, wheelRoot, materials.trim)

  const rollerCount = 12
  const rollerRadius = diameter * 0.48

  for (let index = 0; index < rollerCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rollerCount
    const roller = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-mecanum-roller-${index}`,
      {
        height: Math.max(wheelWidth * 0.62, 0.16),
        diameter: Math.max(diameter * 0.13, 0.08),
        tessellation: 12,
      },
      scene,
    )
    const cheek = MeshBuilder.CreateBox(
      `${role}-${blockId}-mecanum-roller-cheek-${index}`,
      {
        width: Math.max(wheelWidth * 0.08, 0.04),
        height: Math.max(diameter * 0.07, 0.04),
        depth: Math.max(diameter * 0.2, 0.1),
      },
      scene,
    )

    roller.position.set(
      Math.sin(angle) * diameter * 0.08,
      Math.sin(angle) * rollerRadius,
      Math.cos(angle) * rollerRadius,
    )
    roller.rotation.x = -angle
    roller.rotation.y = 0.82
    cheek.position.copyFrom(roller.position)
    cheek.rotation.x = -angle
    cheek.rotation.y = 0.35
    attachMesh(roller, wheelRoot, materials.rubber)
    attachMesh(cheek, wheelRoot, materials.steel)
  }

  createWheelFaceHardware(
    { scene, parent: wheelRoot, materials, role, blockId, partId: 'Wheel_Mecanum', material: materials.mobility, width: diameter, height: diameter, depth: wheelWidth },
    diameter,
    wheelWidth,
    0.34,
  )
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
