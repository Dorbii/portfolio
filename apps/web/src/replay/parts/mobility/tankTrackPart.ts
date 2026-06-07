import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { MobilityPartRenderArgs } from './types'
import {
  createTrackBelt,
  createTrackFrameRail,
  createTrackReturnRoller,
  createTrackShoe,
  createTrackWheel,
} from './trackGeometry'

const TANK_TRACK_ROLL_SPEED = 0.052

export function createTankTrackPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: MobilityPartRenderArgs): void {
  const length = Math.max(width * 1.55, 1.72)
  const beltDepth = Math.max(depth * 0.82, 0.42)
  const beltThickness = Math.max(height * 0.12, 0.07)
  const trackHeight = Math.max(height * 0.88, 0.56)
  const bottomY = -Math.max(height * 0.12, 0.08)
  const topY = bottomY + trackHeight
  const wheelFaceZ = Math.max(beltDepth * 0.62, 0.28)

  createTrackBelt(scene, parent, materials.rubber, `${role}-${blockId}-tank-belt-bottom`, {
    depth: beltDepth,
    height: beltThickness,
    width: length,
    x: 0,
    y: bottomY,
    z: 0,
  })
  createTrackBelt(scene, parent, materials.rubber, `${role}-${blockId}-tank-belt-top`, {
    depth: beltDepth,
    height: beltThickness,
    width: length * 0.9,
    x: -length * 0.02,
    y: topY,
    z: 0,
  })

  for (let side = -1; side <= 1; side += 2) {
    const ramp = MeshBuilder.CreateBox(
      `${role}-${blockId}-tank-belt-ramp-${side}`,
      {
        width: Math.max(length * 0.24, 0.34),
        height: beltThickness,
        depth: beltDepth,
      },
      scene,
    )

    ramp.position.set(side * length * 0.45, bottomY + trackHeight * 0.5, 0)
    ramp.rotation.z = side * -0.54
    attachMesh(ramp, parent, materials.rubber)
  }

  const railDepth = Math.max(beltDepth * 0.09, 0.045)
  const upperRailY = bottomY + trackHeight * 0.73
  const lowerRailY = bottomY + trackHeight * 0.2

  for (const z of [-wheelFaceZ, wheelFaceZ]) {
    createTrackFrameRail(scene, parent, material, `${role}-${blockId}-tank-upper-side-rail-${z > 0 ? 'front' : 'rear'}`, {
      depth: railDepth,
      height: Math.max(height * 0.16, 0.09),
      width: Math.max(length * 0.76, 0.96),
      x: 0,
      y: upperRailY,
      z,
    })
    createTrackFrameRail(scene, parent, materials.trim, `${role}-${blockId}-tank-lower-side-rail-${z > 0 ? 'front' : 'rear'}`, {
      depth: railDepth,
      height: Math.max(height * 0.1, 0.06),
      width: Math.max(length * 0.66, 0.82),
      x: 0,
      y: lowerRailY,
      z,
    })

    for (const x of [-length * 0.5, length * 0.5]) {
      createTrackFrameRail(scene, parent, material, `${role}-${blockId}-tank-end-plate-${x > 0 ? 'front' : 'rear'}-${z > 0 ? 'outer' : 'inner'}`, {
        depth: railDepth,
        height: Math.max(trackHeight * 0.62, 0.32),
        width: Math.max(length * 0.08, 0.1),
        x,
        y: bottomY + trackHeight * 0.45,
        z,
      })
    }
  }

  createTrackFrameRail(scene, parent, materials.utility, `${role}-${blockId}-tank-service-hatch`, {
    depth: Math.max(beltDepth * 0.42, 0.18),
    height: Math.max(height * 0.07, 0.045),
    width: Math.max(length * 0.38, 0.46),
    x: 0,
    y: topY + Math.max(height * 0.16, 0.1),
    z: 0,
  })

  const roadWheelCount = 5
  for (let index = 0; index < roadWheelCount; index += 1) {
    const x = -length * 0.32 + index * ((length * 0.64) / (roadWheelCount - 1))

    for (const z of [-wheelFaceZ, wheelFaceZ]) {
      createTrackWheel(scene, parent, `${role}-${blockId}-tank-road-wheel-${index}-${z > 0 ? 'front' : 'rear'}`, {
        diameter: Math.max(trackHeight * 0.34, 0.18),
        material: materials.steel,
        hubMaterial: materials.trim,
        rollSpeed: TANK_TRACK_ROLL_SPEED,
        tessellation: 18,
        x,
        y: bottomY + trackHeight * 0.28,
        z,
      })
    }
  }

  for (const z of [-wheelFaceZ, wheelFaceZ]) {
    createTrackWheel(scene, parent, `${role}-${blockId}-tank-front-idler-${z > 0 ? 'front' : 'rear'}`, {
      diameter: Math.max(trackHeight * 0.44, 0.24),
      material: materials.steel,
      hubMaterial: materials.trim,
      rollSpeed: TANK_TRACK_ROLL_SPEED,
      tessellation: 20,
      x: length * 0.48,
      y: bottomY + trackHeight * 0.4,
      z,
    })
    createTrackWheel(scene, parent, `${role}-${blockId}-tank-rear-sprocket-${z > 0 ? 'front' : 'rear'}`, {
      diameter: Math.max(trackHeight * 0.5, 0.28),
      material: materials.steel,
      hubMaterial: materials.trim,
      rollSpeed: TANK_TRACK_ROLL_SPEED,
      tessellation: 20,
      x: -length * 0.48,
      y: bottomY + trackHeight * 0.4,
      z,
    })
  }

  for (let index = 0; index < 3; index += 1) {
    for (const z of [-wheelFaceZ, wheelFaceZ]) {
      createTrackReturnRoller(
        scene,
        parent,
        materials.trim,
        `${role}-${blockId}-tank-return-roller-${index}-${z > 0 ? 'front' : 'rear'}`,
        {
          depth: Math.max(beltDepth * 0.18, 0.08),
          diameter: Math.max(trackHeight * 0.16, 0.09),
          rollSpeed: TANK_TRACK_ROLL_SPEED * 1.2,
          tessellation: 12,
          x: -length * 0.24 + index * length * 0.24,
          y: topY - trackHeight * 0.18,
          z,
        },
      )
    }
  }

  const shoeCount = 9
  for (let index = 0; index < shoeCount; index += 1) {
    const x = -length * 0.42 + index * ((length * 0.84) / (shoeCount - 1))

    createTrackShoe(scene, parent, `${role}-${blockId}-tank-bottom-shoe-${index}`, {
      depth: beltDepth * 1.06,
      material: materials.rubber,
      x,
      y: bottomY - beltThickness * 0.72,
    })
    createTrackShoe(scene, parent, `${role}-${blockId}-tank-top-shoe-${index}`, {
      depth: beltDepth * 0.96,
      material: materials.rubber,
      x,
      y: topY + beltThickness * 0.72,
    })
  }

  for (let side = -1; side <= 1; side += 2) {
    for (let index = 0; index < 4; index += 1) {
      const t = (index + 1) / 5
      const rampShoe = MeshBuilder.CreateBox(
        `${role}-${blockId}-tank-ramp-shoe-${side}-${index}`,
        {
          width: 0.1,
          height: 0.045,
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
