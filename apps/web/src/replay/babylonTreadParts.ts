import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from './babylonMeshHelpers'
import type { MobilityPartRenderArgs } from './babylonMobilityPartTypes'
import {
  treadVisualFor,
  type TreadVisual,
} from './babylonPartVisuals'

export function createTreadPart(args: MobilityPartRenderArgs): void {
  const { partId } = args
  const visual = treadVisualFor(partId)

  if (partId === 'Wheel_Tank') {
    createTankTrackPart(args)
    return
  }

  createStandardTreadPart(args, visual)
}

function createStandardTreadPart(
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
      tessellation: isHeavy ? 20 : 18,
      x: length * 0.45,
      y: bottomY + trackHeight * 0.4,
      z,
    })
    createTrackWheel(scene, parent, `${role}-${blockId}-standard-tread-rear-sprocket-${z > 0 ? 'front' : 'rear'}`, {
      diameter: Math.max(trackHeight * (isHeavy ? 0.44 : 0.38), 0.22),
      material: materials.rubber,
      hubMaterial: materials.steel,
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

function createTankTrackPart({
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
      tessellation: 20,
      x: length * 0.48,
      y: bottomY + trackHeight * 0.4,
      z,
    })
    createTrackWheel(scene, parent, `${role}-${blockId}-tank-rear-sprocket-${z > 0 ? 'front' : 'rear'}`, {
      diameter: Math.max(trackHeight * 0.5, 0.28),
      material: materials.steel,
      hubMaterial: materials.trim,
      tessellation: 20,
      x: -length * 0.48,
      y: bottomY + trackHeight * 0.4,
      z,
    })
  }

  for (let index = 0; index < 3; index += 1) {
    for (const z of [-wheelFaceZ, wheelFaceZ]) {
      const roller = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-tank-return-roller-${index}-${z > 0 ? 'front' : 'rear'}`,
        {
          height: Math.max(beltDepth * 0.18, 0.08),
          diameter: Math.max(trackHeight * 0.16, 0.09),
          tessellation: 12,
        },
        scene,
      )

      roller.rotation.x = Math.PI / 2
      roller.position.set(-length * 0.24 + index * length * 0.24, topY - trackHeight * 0.18, z)
      attachMesh(roller, parent, materials.trim)
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

function createTrackFrameRail(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['material'],
  name: string,
  options: {
    depth: number
    height: number
    width: number
    x: number
    y: number
    z: number
  },
): void {
  const rail = MeshBuilder.CreateBox(
    name,
    { width: options.width, height: options.height, depth: options.depth },
    scene,
  )

  rail.position.set(options.x, options.y, options.z)
  attachMesh(rail, parent, material)
}

function createTrackBelt(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['rubber'],
  name: string,
  options: {
    depth: number
    height: number
    width: number
    x: number
    y: number
    z: number
  },
): void {
  const belt = MeshBuilder.CreateBox(
    name,
    { width: options.width, height: options.height, depth: options.depth },
    scene,
  )

  belt.position.set(options.x, options.y, options.z)
  attachMesh(belt, parent, material)
}

function createTrackWheel(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  name: string,
  options: {
    diameter: number
    hubMaterial: MobilityPartRenderArgs['material']
    material: MobilityPartRenderArgs['material']
    tessellation: number
    x: number
    y: number
    z: number
  },
): void {
  const wheel = MeshBuilder.CreateCylinder(
    name,
    {
      height: 0.08,
      diameter: options.diameter,
      tessellation: options.tessellation,
    },
    scene,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${name}-hub`,
    {
      height: 0.09,
      diameter: options.diameter * 0.34,
      tessellation: 10,
    },
    scene,
  )

  wheel.rotation.x = Math.PI / 2
  hub.rotation.x = Math.PI / 2
  wheel.position.set(options.x, options.y, options.z)
  hub.position.copyFrom(wheel.position)
  wheel.metadata = { kind: 'roll', axis: 'z', speed: 0.05 }
  attachMesh(wheel, parent, options.material)
  attachMesh(hub, parent, options.hubMaterial)

  const faceOffset = options.z >= 0 ? 0.055 : -0.055

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const bolt = MeshBuilder.CreateCylinder(
      `${name}-bolt-${index}`,
      {
        height: 0.025,
        diameter: Math.max(options.diameter * 0.07, 0.018),
        tessellation: 8,
      },
      scene,
    )

    bolt.rotation.x = Math.PI / 2
    bolt.position.set(
      options.x + Math.cos(angle) * options.diameter * 0.27,
      options.y + Math.sin(angle) * options.diameter * 0.27,
      options.z + faceOffset,
    )
    attachMesh(bolt, parent, options.hubMaterial)
  }
}

function createTrackShoe(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  name: string,
  options: {
    depth: number
    height?: number
    material: MobilityPartRenderArgs['materials']['rubber']
    width?: number
    x: number
    y: number
  },
): void {
  const shoe = MeshBuilder.CreateBox(
    name,
    { width: options.width ?? 0.1, height: options.height ?? 0.045, depth: options.depth },
    scene,
  )

  shoe.position.set(options.x, options.y, 0)
  attachMesh(shoe, parent, options.material)
}
