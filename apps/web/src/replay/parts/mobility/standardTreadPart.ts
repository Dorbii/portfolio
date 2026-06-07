import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { MobilityPartRenderArgs } from './types'
import { type TreadVisual } from './partVisuals'
import { createTrackBelt, createTrackFrameRail, createTrackShoe, createTrackWheel } from './trackGeometry'

export function createStandardTreadPart(
  {
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
  }: MobilityPartRenderArgs,
  visual: TreadVisual,
): void {
  const isHeavy = partId === 'Tread_Heavy'
  const length = Math.max(width * (isHeavy ? 1.3 : 1.18), isHeavy ? 1.56 : 1.3)
  const beltDepth = Math.max(depth * (isHeavy ? 0.98 : 0.86), isHeavy ? 0.52 : 0.42)
  const beltThickness = Math.max(height * (isHeavy ? 0.11 : 0.09), 0.058)
  const trackHeight = Math.max(height * (isHeavy ? 0.76 : 0.68), isHeavy ? 0.56 : 0.46)
  const bottomY = -Math.max(height * 0.12, 0.07)
  const topY = bottomY + trackHeight
  const wheelFaceZ = Math.max(beltDepth * 0.55, 0.24)
  const padCount = isHeavy ? Math.max(visual.padCount + 9, 16) : Math.max(visual.padCount + 9, 14)

  createTrackBelt(scene, parent, materials.rubber, `${role}-${blockId}-standard-tread-belt-bottom`, {
    depth: beltDepth,
    height: beltThickness,
    width: length,
    x: 0,
    y: bottomY,
    z: 0,
  })
  createTrackBelt(scene, parent, materials.rubber, `${role}-${blockId}-standard-tread-belt-top`, {
    depth: beltDepth * 0.96,
    height: beltThickness,
    width: length * 0.88,
    x: -length * 0.02,
    y: topY,
    z: 0,
  })

  for (let side = -1; side <= 1; side += 2) {
    const ramp = MeshBuilder.CreateBox(
      `${role}-${blockId}-standard-tread-belt-ramp-${side}`,
      {
        width: Math.max(length * 0.23, 0.28),
        height: beltThickness,
        depth: beltDepth,
      },
      scene,
    )

    ramp.position.set(side * length * 0.45, bottomY + trackHeight * 0.5, 0)
    ramp.rotation.z = side * -0.54
    attachMesh(ramp, parent, materials.rubber)
  }

  const railDepth = Math.max(beltDepth * 0.085, 0.04)
  const upperRailY = bottomY + trackHeight * 0.68
  const lowerRailY = bottomY + trackHeight * 0.2

  for (const z of [-wheelFaceZ, wheelFaceZ]) {
    createTrackFrameRail(scene, parent, material, `${role}-${blockId}-standard-tread-upper-side-rail-${z > 0 ? 'front' : 'rear'}`, {
      depth: railDepth,
      height: Math.max(height * (isHeavy ? 0.16 : 0.12), 0.07),
      width: Math.max(length * 0.74, 0.86),
      x: 0,
      y: upperRailY,
      z,
    })
    createTrackFrameRail(scene, parent, materials.trim, `${role}-${blockId}-standard-tread-lower-side-rail-${z > 0 ? 'front' : 'rear'}`, {
      depth: railDepth,
      height: Math.max(height * 0.09, 0.052),
      width: Math.max(length * 0.66, 0.78),
      x: 0,
      y: lowerRailY,
      z,
    })

    for (const x of [-length * 0.5, length * 0.5]) {
      createTrackFrameRail(scene, parent, material, `${role}-${blockId}-standard-tread-end-plate-${x > 0 ? 'front' : 'rear'}-${z > 0 ? 'outer' : 'inner'}`, {
        depth: railDepth,
        height: Math.max(trackHeight * 0.52, 0.28),
        width: Math.max(length * 0.06, 0.08),
        x,
        y: bottomY + trackHeight * 0.43,
        z,
      })
    }
  }

  const roadWheelCount = isHeavy ? 4 : 3
  for (let index = 0; index < roadWheelCount; index += 1) {
    const x = -length * 0.28 + index * ((length * 0.56) / Math.max(roadWheelCount - 1, 1))

    for (const z of [-wheelFaceZ, wheelFaceZ]) {
      createTrackWheel(scene, parent, `${role}-${blockId}-standard-tread-road-wheel-${index}-${z > 0 ? 'front' : 'rear'}`, {
        diameter: Math.max(trackHeight * (isHeavy ? 0.32 : 0.3), isHeavy ? 0.18 : 0.15),
        material: materials.rubber,
        hubMaterial: materials.steel,
        rollSpeed: visual.rollSpeed,
        tessellation: isHeavy ? 18 : 16,
        x,
        y: bottomY + trackHeight * 0.3,
        z,
      })
    }
  }

  for (const z of [-wheelFaceZ, wheelFaceZ]) {
    createTrackWheel(scene, parent, `${role}-${blockId}-standard-tread-front-idler-${z > 0 ? 'front' : 'rear'}`, {
      diameter: Math.max(trackHeight * (isHeavy ? 0.4 : 0.36), 0.2),
      material: materials.rubber,
      hubMaterial: materials.steel,
      rollSpeed: visual.rollSpeed,
      tessellation: isHeavy ? 20 : 18,
      x: length * 0.45,
      y: bottomY + trackHeight * 0.4,
      z,
    })
    createTrackWheel(scene, parent, `${role}-${blockId}-standard-tread-rear-sprocket-${z > 0 ? 'front' : 'rear'}`, {
      diameter: Math.max(trackHeight * (isHeavy ? 0.44 : 0.38), 0.22),
      material: materials.rubber,
      hubMaterial: materials.steel,
      rollSpeed: visual.rollSpeed,
      tessellation: isHeavy ? 20 : 18,
      x: -length * 0.45,
      y: bottomY + trackHeight * 0.4,
      z,
    })
  }

  for (let index = 0; index < padCount; index += 1) {
    const x = -length * 0.42 + index * ((length * 0.84) / Math.max(padCount - 1, 1))

    createTrackShoe(scene, parent, `${role}-${blockId}-standard-tread-bottom-shoe-${index}`, {
      depth: beltDepth * 1.06,
      height: Math.max(beltThickness * 0.5, 0.026),
      material: materials.rubber,
      width: Math.max(length * 0.04, 0.05),
      x,
      y: bottomY - beltThickness * 0.74,
    })
    createTrackShoe(scene, parent, `${role}-${blockId}-standard-tread-top-shoe-${index}`, {
      depth: beltDepth,
      height: Math.max(beltThickness * 0.46, 0.024),
      material: materials.rubber,
      width: Math.max(length * 0.038, 0.048),
      x,
      y: topY + beltThickness * 0.74,
    })
  }

  for (let side = -1; side <= 1; side += 2) {
    for (let index = 0; index < 4; index += 1) {
      const t = (index + 1) / 5
      const rampShoe = MeshBuilder.CreateBox(
        `${role}-${blockId}-standard-tread-ramp-shoe-${side}-${index}`,
        {
          width: Math.max(length * 0.038, 0.048),
          height: Math.max(beltThickness * 0.46, 0.024),
          depth: beltDepth,
        },
        scene,
      )

      rampShoe.position.set(
        side * length * (0.34 + t * 0.13),
        bottomY + trackHeight * (0.12 + t * 0.72),
        0,
      )
      rampShoe.rotation.z = side * -0.54
      attachMesh(rampShoe, parent, materials.rubber)
    }
  }
}
