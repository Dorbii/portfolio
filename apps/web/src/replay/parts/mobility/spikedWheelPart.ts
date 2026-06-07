import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { MobilityPartRenderArgs } from './types'
import { rotationFromYAxis } from './wheelGeometry'

export function createSpikedWheelPart(
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
