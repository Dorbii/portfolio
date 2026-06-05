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
