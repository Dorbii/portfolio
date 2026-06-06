import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from './babylonMeshHelpers'
import type { MobilityPartRenderArgs } from './babylonMobilityPartTypes'
import {
  treadVisualFor,
  type TreadVisual,
} from './babylonPartVisuals'

export function createTreadPart(args: MobilityPartRenderArgs): void {
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
  const visual = treadVisualFor(partId)

  if (partId === 'Wheel_Tank') {
    createTankTrackPart(args)
    return
  }

  const base = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-base`,
    {
      width: Math.max(width * visual.baseWidthScale, 0.68),
      height: Math.max(height * visual.baseHeightScale, 0.15),
      depth: Math.max(depth * visual.baseDepthScale, 0.7),
    },
    scene,
  )
  const top = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-top`,
    {
      width: Math.max(width * visual.topWidthScale, 0.56),
      height: Math.max(height * visual.topHeightScale, 0.08),
      depth: Math.max(depth * visual.topDepthScale, 0.5),
    },
    scene,
  )

  top.position.y = Math.max(height * (0.26 + visual.topHeightScale), 0.11)
  attachMesh(base, parent, materials.rubber)
  attachMesh(top, parent, material)

  const topStripe = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-top-stripe`,
    {
      width: Math.max(width * visual.topWidthScale * 0.58, 0.34),
      height: Math.max(height * 0.06, 0.04),
      depth: Math.max(depth * 0.16, 0.08),
    },
    scene,
  )

  topStripe.position.set(0, top.position.y + Math.max(height * 0.22, 0.1), Math.max(depth * 0.22, 0.12))
  attachMesh(topStripe, parent, partId === 'Tread_Light' ? materials.utility : materials.warning)

  const linkLeft = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-link-l`,
    {
      width: Math.max(width * 0.18, 0.1),
      height: Math.max(height * 0.32, 0.08),
      depth: Math.max(depth * visual.topDepthScale, 0.5),
    },
    scene,
  )
  const linkRight = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-link-r`,
    {
      width: Math.max(width * 0.18, 0.1),
      height: Math.max(height * 0.32, 0.08),
      depth: Math.max(depth * visual.topDepthScale, 0.5),
    },
    scene,
  )

  linkLeft.position.x = -Math.max(width * 0.54, 0.22)
  linkRight.position.x = Math.max(width * 0.54, 0.22)
  attachMesh(linkLeft, parent, materials.trim)
  attachMesh(linkRight, parent, materials.trim)

  const driveModule = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-drive-module`,
    {
      width: Math.max(width * 0.54 * visual.suspensionScale, 0.32),
      height: Math.max(height * 0.48 * visual.suspensionScale, 0.22),
      depth: Math.max(depth * 0.5 * visual.suspensionScale, 0.28),
    },
    scene,
  )

  driveModule.position.set(0, Math.max(height * 0.68, 0.3), -Math.max(depth * 0.18, 0.12))
  attachMesh(driveModule, parent, partId === 'Tread_Heavy' ? materials.warning : materials.utility)

  for (let side = -1; side <= 1; side += 2) {
    createTreadSideDetails(args, visual, side)
  }
  createExposedTreadWheels(args, visual)

  for (let index = 0; index < visual.padCount; index += 1) {
    const offset = index - (visual.padCount - 1) / 2
    const treadPad = MeshBuilder.CreateBox(
      `${role}-${blockId}-tread-pad-${index}`,
      {
        width: Math.max(width * visual.topWidthScale * 0.94, 0.48),
        height: Math.max(height * 0.1, 0.05),
        depth: Math.max(depth * 0.12, 0.065),
      },
      scene,
    )

    treadPad.position.set(0, Math.max(height * 0.02, 0.04), offset * Math.max(depth * 0.24, 0.13))
    attachMesh(treadPad, parent, materials.rubber)
  }

  for (let index = 0; index < visual.rollerCount; index += 1) {
    const offset = index - (visual.rollerCount - 1) / 2
    const rollerMesh = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-roller-${index}`,
      {
        height: Math.max(depth * 0.42, 0.16),
        diameter: Math.max(width * visual.rollerScale * (index === 1 ? 0.82 : 1), 0.2),
        tessellation: 16,
      },
      scene,
    )

    rollerMesh.rotation.x = Math.PI / 2
    rollerMesh.position.z = offset * Math.max(depth * 0.5, 0.24)
    rollerMesh.metadata = { kind: 'roll', speed: visual.rollSpeed }
    attachMesh(rollerMesh, parent, materials.rubber)
  }
}

function createExposedTreadWheels(
  {
    scene,
    parent,
    role,
    blockId,
    width,
    height,
    depth,
    materials,
  }: MobilityPartRenderArgs,
  visual: TreadVisual,
): void {
  const sideZ = Math.max(depth * visual.baseDepthScale * 0.54, 0.32)
  const lowerY = Math.max(height * 0.08, 0.08)
  const wheelY = Math.max(height * 0.25, 0.14)
  const wheelX = Math.max(width * visual.baseWidthScale * 0.4, 0.34)
  const wheelDiameter = Math.max(width * visual.rollerScale, 0.22)

  for (const z of [-sideZ, sideZ]) {
    for (const x of [-wheelX, 0, wheelX]) {
      const wheel = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-exposed-road-wheel-${x.toFixed(2)}-${z > 0 ? 'front' : 'rear'}`,
        {
          height: Math.max(depth * 0.08, 0.045),
          diameter: wheelDiameter,
          tessellation: 16,
        },
        scene,
      )
      const hub = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-exposed-road-wheel-hub-${x.toFixed(2)}-${z > 0 ? 'front' : 'rear'}`,
        {
          height: Math.max(depth * 0.09, 0.05),
          diameter: wheelDiameter * 0.38,
          tessellation: 10,
        },
        scene,
      )

      wheel.rotation.x = Math.PI / 2
      hub.rotation.x = Math.PI / 2
      wheel.position.set(x, wheelY, z)
      hub.position.copyFrom(wheel.position)
      attachMesh(wheel, parent, materials.steel)
      attachMesh(hub, parent, materials.trim)
    }

    for (const x of [-wheelX * 1.22, wheelX * 1.22]) {
      const sprocket = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-exposed-sprocket-${x > 0 ? 'front' : 'rear'}-${z > 0 ? 'outer' : 'inner'}`,
        {
          height: Math.max(depth * 0.08, 0.045),
          diameter: Math.max(wheelDiameter * 1.18, 0.28),
          tessellation: 14,
        },
        scene,
      )

      sprocket.rotation.x = Math.PI / 2
      sprocket.position.set(x, lowerY + wheelDiameter * 0.35, z)
      attachMesh(sprocket, parent, materials.steel)
    }
  }
}

function createTreadSideDetails(
  {
    scene,
    parent,
    material,
    role,
    blockId,
    width,
    height,
    depth,
    materials,
  }: MobilityPartRenderArgs,
  visual: TreadVisual,
  side: number,
): void {
  const treadArmorShroud = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-armor-shroud-${side}`,
    {
      width: Math.max(width * 0.16 * visual.suspensionScale, 0.1),
      height: Math.max(height * visual.shroudHeightScale, 0.18),
      depth: Math.max(depth * visual.shroudDepthScale, 0.72),
    },
    scene,
  )
  const cableRail = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-tread-cable-rail-${side}`,
    { height: Math.max(depth * visual.shroudDepthScale * 0.7, 0.5), diameter: 0.032, tessellation: 8 },
    scene,
  )
  const suspensionPod = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-suspension-pod-${side}`,
    {
      width: Math.max(width * 0.2 * visual.suspensionScale, 0.14),
      height: Math.max(height * 0.72 * visual.suspensionScale, 0.3),
      depth: Math.max(depth * 0.36 * visual.suspensionScale, 0.22),
    },
    scene,
  )
  const shockTower = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-tread-shock-tower-${side}`,
    {
      height: Math.max(height * 0.72 * visual.suspensionScale, 0.34),
      diameter: Math.max(width * 0.09, 0.07),
      tessellation: 8,
    },
    scene,
  )

  treadArmorShroud.position.set(side * Math.max(width * 0.76, 0.34), Math.max(height * 0.22, 0.08), 0)
  cableRail.rotation.x = Math.PI / 2
  cableRail.position.set(side * Math.max(width * 0.4, 0.22), Math.max(height * 0.64, 0.22), 0)
  suspensionPod.position.set(
    side * Math.max(width * 0.46, 0.28),
    Math.max(height * 0.68, 0.3),
    -Math.max(depth * 0.34, 0.18),
  )
  shockTower.position.set(
    side * Math.max(width * 0.3, 0.22),
    Math.max(height * 0.74, 0.34),
    Math.max(depth * 0.24, 0.14),
  )
  shockTower.rotation.z = side * 0.18
  attachMesh(treadArmorShroud, parent, material)
  attachMesh(cableRail, parent, materials.trim)
  attachMesh(suspensionPod, parent, material)
  attachMesh(shockTower, parent, materials.trim)
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
    hubMaterial: MobilityPartRenderArgs['materials']['trim']
    material: MobilityPartRenderArgs['materials']['steel']
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
  wheel.metadata = { kind: 'roll', speed: 0.05 }
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
    material: MobilityPartRenderArgs['materials']['rubber']
    x: number
    y: number
  },
): void {
  const shoe = MeshBuilder.CreateBox(
    name,
    { width: 0.1, height: 0.045, depth: options.depth },
    scene,
  )

  shoe.position.set(options.x, options.y, 0)
  attachMesh(shoe, parent, options.material)
}
