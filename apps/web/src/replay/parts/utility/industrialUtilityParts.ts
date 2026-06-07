import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createWireHarness } from './utilityFrame'

export function createRadarUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  createIndustrialUtilityBase(args, 'radar', Math.max(width * 0.68, 0.38), Math.max(depth * 0.56, 0.3))
  const mast = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-radar-elevation-mast`,
    {
      height: Math.max(height * 0.52, 0.3),
      diameter: Math.max(width * 0.07, 0.04),
      tessellation: 10,
    },
    scene,
  )
  const dishRoot = MeshBuilder.CreateSphere(
    `${role}-${blockId}-radar-parabolic-dish`,
    {
      diameter: Math.max(width * 0.62, 0.34),
      segments: 16,
    },
    scene,
  )
  const dishRim = MeshBuilder.CreateTorus(
    `${role}-${blockId}-radar-dish-rim`,
    {
      diameter: Math.max(width * 0.62, 0.34),
      thickness: 0.018,
      tessellation: 18,
    },
    scene,
  )
  const feedHorn = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-radar-feed-horn`,
    {
      height: Math.max(depth * 0.2, 0.11),
      diameterTop: Math.max(width * 0.045, 0.026),
      diameterBottom: Math.max(width * 0.1, 0.055),
      tessellation: 10,
    },
    scene,
  )

  mast.position.y = Math.max(height * 0.78, 0.4)
  dishRoot.position.set(0, Math.max(height * 1.1, 0.58), Math.max(depth * 0.1, 0.06))
  dishRoot.rotation.x = Math.PI / 2
  dishRoot.scaling.set(1, 0.22, 1)
  dishRim.position.copyFrom(dishRoot.position)
  dishRim.rotation.x = Math.PI / 2
  feedHorn.position.set(0, dishRoot.position.y, Math.max(depth * 0.32, 0.18))
  feedHorn.rotation.x = Math.PI / 2
  attachMesh(mast, parent, materials.steel)
  attachMesh(dishRoot, parent, materials.steel)
  attachMesh(dishRim, parent, material)
  attachMesh(feedHorn, parent, materials.light)
  createWireHarness(scene, parent, materials, role, blockId, width, height, depth)
}

export function createCoolantTankUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args

  createIndustrialUtilityBase(args, 'coolant-tank', Math.max(width * 0.76, 0.42), Math.max(depth * 0.7, 0.38))

  createTankPair({
    args,
    blockLabel: 'coolant-tank',
    tankMaterial: materials.steel,
    capMaterial: material,
    valveMaterial: materials.light,
  })
  createPipeManifold(scene, parent, role, blockId, width, height, depth, materials, 'coolant-tank')
}

export function createFuelTankUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args

  createIndustrialUtilityBase(args, 'fuel-tank', Math.max(width * 0.78, 0.43), Math.max(depth * 0.72, 0.4))

  createTankPair({
    args,
    blockLabel: 'fuel-tank',
    tankMaterial: material,
    capMaterial: materials.warning,
    valveMaterial: materials.steel,
  })
  createPipeManifold(scene, parent, role, blockId, width, height, depth, materials, 'fuel-tank')

  for (let index = -1; index <= 1; index += 2) {
    const warningStripe = MeshBuilder.CreateBox(
      `${role}-${blockId}-fuel-tank-hazard-stripe-${index}`,
      {
        width: Math.max(width * 0.1, 0.055),
        height: Math.max(height * 0.025, 0.018),
        depth: Math.max(depth * 0.54, 0.3),
      },
      scene,
    )

    warningStripe.position.set(index * Math.max(width * 0.18, 0.11), Math.max(height * 0.78, 0.42), 0)
    warningStripe.rotation.z = index * 0.34
    attachMesh(warningStripe, parent, materials.warning)
  }
}

function createIndustrialUtilityBase(
  {
    scene,
    parent,
    role,
    blockId,
    height,
    materials,
  }: UtilityPartRenderArgs,
  label: string,
  baseWidth: number,
  baseDepth: number,
): void {
  const deck = MeshBuilder.CreateBox(
    `${role}-${blockId}-${label}-bolted-service-deck`,
    {
      width: baseWidth,
      height: Math.max(height * 0.08, 0.045),
      depth: baseDepth,
    },
    scene,
  )
  const leftRail = MeshBuilder.CreateBox(
    `${role}-${blockId}-${label}-left-saddle-rail`,
    {
      width: Math.max(baseWidth * 0.12, 0.06),
      height: Math.max(height * 0.14, 0.07),
      depth: baseDepth,
    },
    scene,
  )
  const rightRail = MeshBuilder.CreateBox(
    `${role}-${blockId}-${label}-right-saddle-rail`,
    {
      width: Math.max(baseWidth * 0.12, 0.06),
      height: Math.max(height * 0.14, 0.07),
      depth: baseDepth,
    },
    scene,
  )

  deck.position.y = Math.max(height * 0.18, 0.09)
  leftRail.position.set(-baseWidth * 0.42, Math.max(height * 0.28, 0.14), 0)
  rightRail.position.set(baseWidth * 0.42, Math.max(height * 0.28, 0.14), 0)
  attachMesh(deck, parent, materials.utility)
  attachMesh(leftRail, parent, materials.trim)
  attachMesh(rightRail, parent, materials.trim)

  for (let index = 0; index < 4; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-${label}-deck-fastener-${index}`,
      {
        height: 0.022,
        diameter: 0.032,
        tessellation: 8,
      },
      scene,
    )
    const sideX = index % 2 === 0 ? -1 : 1
    const sideZ = index < 2 ? -1 : 1

    bolt.position.set(sideX * baseWidth * 0.34, deck.position.y + 0.035, sideZ * baseDepth * 0.34)
    attachMesh(bolt, parent, materials.steel)
  }
}

type TankPairArgs = {
  args: UtilityPartRenderArgs
  blockLabel: string
  tankMaterial: UtilityPartRenderArgs['material']
  capMaterial: UtilityPartRenderArgs['material']
  valveMaterial: UtilityPartRenderArgs['material']
}

function createTankPair({
  args,
  blockLabel,
  tankMaterial,
  capMaterial,
  valveMaterial,
}: TankPairArgs): void {
  const { scene, parent, role, blockId, width, height, depth, materials } = args

  for (const side of [-1, 1]) {
    const tank = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-${blockLabel}-pressure-cylinder-${side}`,
      {
        height: Math.max(depth * 0.68, 0.38),
        diameter: Math.max(width * 0.24, 0.14),
        tessellation: 16,
      },
      scene,
    )
    const capFront = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-${blockLabel}-front-cap-${side}`,
      {
        height: 0.045,
        diameter: Math.max(width * 0.25, 0.145),
        tessellation: 16,
      },
      scene,
    )
    const capBack = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-${blockLabel}-rear-cap-${side}`,
      {
        height: 0.045,
        diameter: Math.max(width * 0.25, 0.145),
        tessellation: 16,
      },
      scene,
    )
    const valve = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-${blockLabel}-service-valve-${side}`,
      {
        height: Math.max(height * 0.14, 0.075),
        diameter: Math.max(width * 0.065, 0.036),
        tessellation: 10,
      },
      scene,
    )
    const strap = MeshBuilder.CreateBox(
      `${role}-${blockId}-${blockLabel}-rubber-retention-strap-${side}`,
      {
        width: Math.max(width * 0.08, 0.05),
        height: Math.max(height * 0.09, 0.05),
        depth: Math.max(depth * 0.72, 0.4),
      },
      scene,
    )

    tank.rotation.x = Math.PI / 2
    capFront.rotation.x = Math.PI / 2
    capBack.rotation.x = Math.PI / 2
    tank.position.set(side * Math.max(width * 0.22, 0.13), Math.max(height * 0.7, 0.36), 0)
    capFront.position.set(tank.position.x, tank.position.y, Math.max(depth * 0.36, 0.2))
    capBack.position.set(tank.position.x, tank.position.y, -Math.max(depth * 0.36, 0.2))
    valve.position.set(tank.position.x, Math.max(height * 0.93, 0.5), Math.max(depth * 0.18, 0.1))
    strap.position.set(tank.position.x, Math.max(height * 0.7, 0.36), 0)
    attachMesh(tank, parent, tankMaterial)
    attachMesh(capFront, parent, capMaterial)
    attachMesh(capBack, parent, capMaterial)
    attachMesh(valve, parent, valveMaterial)
    attachMesh(strap, parent, materials.rubber)
  }
}

function createPipeManifold(
  scene: UtilityPartRenderArgs['scene'],
  parent: UtilityPartRenderArgs['parent'],
  role: UtilityPartRenderArgs['role'],
  blockId: UtilityPartRenderArgs['blockId'],
  width: number,
  height: number,
  depth: number,
  materials: UtilityPartRenderArgs['materials'],
  blockLabel: string,
): void {
  const manifold = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-${blockLabel}-pipe-manifold`,
    {
      height: Math.max(width * 0.54, 0.3),
      diameter: Math.max(height * 0.055, 0.032),
      tessellation: 8,
    },
    scene,
  )

  manifold.rotation.z = Math.PI / 2
  manifold.position.set(0, Math.max(height * 0.92, 0.48), Math.max(depth * 0.18, 0.1))
  attachMesh(manifold, parent, materials.steel)
}
