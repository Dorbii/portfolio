import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { MobilityPartRenderArgs } from './types'
import { rotationFromYAxis } from './wheelGeometry'

export function createMecanumWheelPart(
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
