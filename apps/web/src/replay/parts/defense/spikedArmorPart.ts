import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  attachArmorMesh,
  createArmorBox,
  createArmorCornerFasteners,
  createArmorCylinder,
  createArmorEdgeCaps,
  createArmorScrapeMarks,
} from './armorDetailHelpers'
import type { DefensePartRenderArgs } from './types'

export function createSpikedArmorPart({
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
  const plateWidth = Math.max(width * 0.96, 0.56)
  const plateDepth = Math.max(depth * 0.96, 0.52)
  const plateHeight = Math.max(height * 0.19, 0.11)
  const plateY = Math.max(height * 0.08, 0.05)
  const spikeHeight = Math.max(height * 0.44, 0.22)
  const spikeBase = Math.max(width * 0.14, 0.08)

  const plate = MeshBuilder.CreateBox(
    `${role}-${blockId}-spiked-armor-reinforced-plate`,
    { width: plateWidth, height: plateHeight, depth: plateDepth },
    scene,
  )

  plate.position.y = plateY
  attachArmorMesh(plate, parent, material)

  createArmorEdgeCaps(
    scene,
    parent,
    materials,
    `${role}-${blockId}-spiked-armor`,
    plateWidth,
    plateDepth,
    plateY + plateHeight * 0.55,
    Math.max(height * 0.04, 0.026),
  )

  for (let index = 0; index < 3; index += 1) {
    const x = (index - 1) * Math.max(width * 0.22, 0.13)

    createArmorBox({
      scene,
      parent,
      material: materials.trim,
      name: `${role}-${blockId}-spiked-armor-tooth-saddle-${index}`,
      width: Math.max(spikeBase * 1.2, 0.1),
      height: Math.max(height * 0.07, 0.04),
      depth: Math.max(depth * 0.18, 0.095),
      position: [x, plateY + plateHeight * 0.72, plateDepth * 0.31],
      materialRole: 'trim',
    })

    const spike = createArmorCylinder({
      scene,
      parent,
      material: materials.warning,
      name: `${role}-${blockId}-spiked-armor-deflection-tooth-${index}`,
      height: spikeHeight,
      diameterTop: 0,
      diameterBottom: spikeBase,
      tessellation: 10,
      position: [x, Math.max(height * 0.28, 0.16), plateDepth * 0.38],
      rotation: [Math.PI / 2, 0, 0],
      materialRole: 'trim',
    })

    spike.rotation.z = (index - 1) * 0.08
  }

  for (let index = -1; index <= 1; index += 2) {
    createArmorBox({
      scene,
      parent,
      material: materials.steel,
      name: `${role}-${blockId}-spiked-armor-side-standoff-${index}`,
      width: Math.max(width * 0.12, 0.07),
      height: Math.max(height * 0.11, 0.06),
      depth: Math.max(depth * 0.62, 0.3),
      position: [index * plateWidth * 0.42, plateY + plateHeight * 0.52, 0],
      materialRole: 'trim',
    })
  }

  createArmorCornerFasteners(
    scene,
    parent,
    materials,
    `${role}-${blockId}-spiked-armor`,
    plateWidth,
    plateDepth,
    plateY + plateHeight * 0.72,
    Math.max(width * 0.036, 0.023),
  )
  createArmorScrapeMarks(
    scene,
    parent,
    materials,
    `${role}-${blockId}-spiked-armor`,
    plateWidth,
    plateDepth,
    plateY + plateHeight * 0.84,
  )
}
