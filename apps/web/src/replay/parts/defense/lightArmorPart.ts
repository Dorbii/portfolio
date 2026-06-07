import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  attachArmorMesh,
  createArmorBox,
  createArmorCornerFasteners,
  createArmorEdgeCaps,
  createArmorScrapeMarks,
} from './armorDetailHelpers'
import type { DefensePartRenderArgs } from './types'

export function createLightArmorPart({
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
  const plateWidth = Math.max(width * 0.96, 0.54)
  const plateDepth = Math.max(depth * 0.92, 0.48)
  const skinHeight = Math.max(height * 0.14, 0.08)
  const topY = Math.max(height * 0.16, 0.085)
  const ribHeight = Math.max(height * 0.07, 0.038)

  const plate = MeshBuilder.CreateBox(
    `${role}-${blockId}-light-armor-thin-skin`,
    { width: plateWidth, height: skinHeight, depth: plateDepth },
    scene,
  )

  plate.position.y = Math.max(height * 0.05, 0.035)
  attachArmorMesh(plate, parent, material)

  createArmorEdgeCaps(
    scene,
    parent,
    materials,
    `${role}-${blockId}-light-armor`,
    plateWidth,
    plateDepth,
    topY + ribHeight * 0.45,
    Math.max(height * 0.028, 0.018),
  )

  for (let index = -1; index <= 1; index += 1) {
    const rib = createArmorBox({
      scene,
      parent,
      material: materials.trim,
      name: `${role}-${blockId}-light-armor-speed-rib-${index + 1}`,
      width: Math.max(width * 0.1, 0.055),
      height: ribHeight,
      depth: Math.max(depth * 0.86, 0.38),
      position: [index * Math.max(width * 0.25, 0.14), topY, 0],
      materialRole: 'trim',
    })

    rib.rotation.z = index * 0.05
  }

  for (let index = -1; index <= 1; index += 2) {
    createArmorBox({
      scene,
      parent,
      material: materials.warning,
      name: `${role}-${blockId}-light-armor-chevron-${index}`,
      width: Math.max(width * 0.22, 0.12),
      height: Math.max(height * 0.026, 0.016),
      depth: Math.max(depth * 0.05, 0.032),
      position: [index * Math.max(width * 0.18, 0.1), topY + ribHeight * 0.82, plateDepth * 0.28],
      rotation: [0, index * 0.42, 0],
      materialRole: 'trim',
    })
  }

  createArmorCornerFasteners(
    scene,
    parent,
    materials,
    `${role}-${blockId}-light-armor`,
    plateWidth,
    plateDepth,
    topY + ribHeight * 0.8,
    Math.max(width * 0.028, 0.02),
  )
  createArmorScrapeMarks(
    scene,
    parent,
    materials,
    `${role}-${blockId}-light-armor`,
    plateWidth,
    plateDepth,
    topY + ribHeight * 0.95,
  )
}
