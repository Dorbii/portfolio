import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  attachMesh,
  createRampBlock,
} from '../../rendering/meshHelpers'
import type { DefensePartRenderArgs } from './types'

export function createRailArmorPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: DefensePartRenderArgs): void {
  const backPlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-rail-armor-bolted-backplate`,
    {
      width: Math.max(width * 1.08, 0.7),
      height: Math.max(height * 0.18, 0.1),
      depth: Math.max(depth * 0.44, 0.24),
    },
    scene,
  )

  backPlate.position.y = Math.max(height * 0.12, 0.08)
  attachMesh(backPlate, parent, material)

  for (let rail = 0; rail < 4; rail += 1) {
    const tube = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-rail-armor-horizontal-tube-${rail}`,
      {
        height: Math.max(width * 1.1, 0.72),
        diameter: Math.max(height * 0.09, 0.045),
        tessellation: 12,
      },
      scene,
    )
    const endCapLeft = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-rail-armor-end-cap-left-${rail}`,
      {
        height: Math.max(width * 0.08, 0.05),
        diameter: Math.max(height * 0.12, 0.06),
        tessellation: 10,
      },
      scene,
    )
    const endCapRight = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-rail-armor-end-cap-right-${rail}`,
      {
        height: Math.max(width * 0.08, 0.05),
        diameter: Math.max(height * 0.12, 0.06),
        tessellation: 10,
      },
      scene,
    )
    const y = Math.max(height * (0.2 + rail * 0.12), 0.12 + rail * 0.055)
    const z = Math.max(depth * (0.28 - rail * 0.02), 0.16 - rail * 0.01)

    tube.rotation.z = Math.PI / 2
    tube.position.set(0, y, z)
    endCapLeft.rotation.z = Math.PI / 2
    endCapRight.rotation.z = Math.PI / 2
    endCapLeft.position.set(-Math.max(width * 0.58, 0.38), y, z)
    endCapRight.position.set(Math.max(width * 0.58, 0.38), y, z)
    attachMesh(tube, parent, materials.steel)
    attachMesh(endCapLeft, parent, materials.trim)
    attachMesh(endCapRight, parent, materials.trim)
  }

  createArmorFasteners(scene, parent, role, blockId, width, height, depth, materials, 'rail')
}

export function createCornerGuardArmorPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: DefensePartRenderArgs): void {
  const bumper = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-corner-guard-octagonal-bumper`,
    {
      height: Math.max(height * 0.28, 0.16),
      diameter: Math.max(Math.min(width, depth) * 0.92, 0.5),
      tessellation: 8,
    },
    scene,
  )
  const innerRubber = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-corner-guard-inner-rubber-pad`,
    {
      height: Math.max(height * 0.31, 0.17),
      diameter: Math.max(Math.min(width, depth) * 0.56, 0.31),
      tessellation: 8,
    },
    scene,
  )

  bumper.position.y = Math.max(height * 0.2, 0.12)
  innerRubber.position.y = bumper.position.y + 0.005
  attachMesh(bumper, parent, material)
  attachMesh(innerRubber, parent, materials.rubber)

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-corner-guard-face-bolt-${index}`,
      {
        height: 0.026,
        diameter: Math.max(width * 0.05, 0.026),
        tessellation: 8,
      },
      scene,
    )

    bolt.position.set(
      Math.sin(angle) * Math.max(width * 0.34, 0.2),
      bumper.position.y + Math.max(height * 0.16, 0.08),
      Math.cos(angle) * Math.max(depth * 0.34, 0.2),
    )
    attachMesh(bolt, parent, materials.steel)
  }
}

export function createFlexPanelArmorPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: DefensePartRenderArgs): void {
  const hingeRail = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flex-panel-hinge-spine`,
    {
      height: Math.max(width * 1.08, 0.74),
      diameter: Math.max(height * 0.07, 0.04),
      tessellation: 10,
    },
    scene,
  )

  hingeRail.rotation.z = Math.PI / 2
  hingeRail.position.set(0, Math.max(height * 0.36, 0.18), -Math.max(depth * 0.34, 0.18))
  attachMesh(hingeRail, parent, materials.steel)

  for (let index = 0; index < 7; index += 1) {
    const segment = MeshBuilder.CreateBox(
      `${role}-${blockId}-flex-panel-rubberized-segment-${index}`,
      {
        width: Math.max(width * 0.13, 0.08),
        height: Math.max(height * 0.18, 0.1),
        depth: Math.max(depth * 0.92, 0.5),
      },
      scene,
    )
    const wearPlate = MeshBuilder.CreateBox(
      `${role}-${blockId}-flex-panel-overlap-lip-${index}`,
      {
        width: Math.max(width * 0.1, 0.06),
        height: Math.max(height * 0.035, 0.022),
        depth: Math.max(depth * 0.68, 0.34),
      },
      scene,
    )
    const x = (index - 3) * Math.max(width * 0.15, 0.085)

    segment.position.set(x, Math.max(height * 0.18, 0.1), Math.max(depth * 0.03, 0.02))
    segment.rotation.z = (index - 3) * 0.035
    wearPlate.position.set(x, Math.max(height * 0.31, 0.17), Math.max(depth * 0.08, 0.04))
    attachMesh(segment, parent, index % 2 === 0 ? material : materials.trim)
    attachMesh(wearPlate, parent, materials.rubber)
  }
}

export function createHeavyWedgeArmorPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: DefensePartRenderArgs): void {
  const wedge = createRampBlock(
    scene,
    `${role}-${blockId}-heavy-wedge-sloped-armor`,
    Math.max(width * 1.18, 0.76),
    Math.max(height * 0.54, 0.25),
    Math.max(depth * 1.12, 0.64),
    Math.max(height * 0.08, 0.035),
  )
  const lowerSkid = MeshBuilder.CreateBox(
    `${role}-${blockId}-heavy-wedge-hardened-skid`,
    {
      width: Math.max(width * 1.12, 0.72),
      height: Math.max(height * 0.08, 0.045),
      depth: Math.max(depth * 0.18, 0.1),
    },
    scene,
  )

  wedge.position.y = Math.max(height * 0.06, 0.04)
  lowerSkid.position.set(0, Math.max(height * 0.08, 0.055), Math.max(depth * 0.5, 0.3))
  attachMesh(wedge, parent, material)
  attachMesh(lowerSkid, parent, materials.steel)

  for (let index = -2; index <= 2; index += 1) {
    const stripe = MeshBuilder.CreateBox(
      `${role}-${blockId}-heavy-wedge-warning-stripe-${index + 2}`,
      {
        width: Math.max(width * 0.09, 0.055),
        height: Math.max(height * 0.028, 0.018),
        depth: Math.max(depth * 0.72, 0.4),
      },
      scene,
    )

    stripe.position.set(index * Math.max(width * 0.18, 0.11), Math.max(height * 0.34, 0.17), 0)
    stripe.rotation.z = -0.34
    attachMesh(stripe, parent, index % 2 === 0 ? materials.warning : materials.trim)
  }

  createArmorFasteners(scene, parent, role, blockId, width, height, depth, materials, 'heavy-wedge')
}

function createArmorFasteners(
  scene: DefensePartRenderArgs['scene'],
  parent: DefensePartRenderArgs['parent'],
  role: DefensePartRenderArgs['role'],
  blockId: DefensePartRenderArgs['blockId'],
  width: number,
  height: number,
  depth: number,
  materials: DefensePartRenderArgs['materials'],
  label: string,
): void {
  for (let index = 0; index < 6; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const row = Math.floor(index / 2)
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-${label}-recessed-fastener-${index}`,
      {
        height: 0.025,
        diameter: Math.max(width * 0.046, 0.026),
        tessellation: 8,
      },
      scene,
    )

    bolt.position.set(
      side * Math.max(width * 0.44, 0.27),
      Math.max(height * (0.2 + row * 0.1), 0.1 + row * 0.05),
      Math.max(depth * (0.28 - row * 0.12), 0.1),
    )
    attachMesh(bolt, parent, materials.steel)
  }
}
