import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { MobilityPartRenderArgs } from './types'

export function createTrackFrameRail(
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

export function createTrackBelt(
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

export function createTrackWheel(
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

export function createTrackShoe(
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
