import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  attachArmorMesh,
  createArmorBox,
  createArmorCornerFasteners,
  createArmorEdgeCaps,
  createArmorScrapeMarks,
} from './armorDetailHelpers'
import type { DefensePartRenderArgs } from './types'

export function createHeavyArmorPart({
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
  const plateWidth = Math.max(width, 0.58)
  const plateDepth = Math.max(depth, 0.54)
  const baseHeight = Math.max(height * 0.34, 0.18)
  const deckY = Math.max(height * 0.36, 0.2)
  const capHeight = Math.max(height * 0.18, 0.1)
  const edgeThickness = Math.max(height * 0.055, 0.035)

  const base = MeshBuilder.CreateBox(
    `${role}-${blockId}-heavy-armor-thick-base`,
    { width: plateWidth, height: baseHeight, depth: plateDepth },
    scene,
  )

  base.position.y = Math.max(height * 0.07, 0.045)
  attachArmorMesh(base, parent, material)

  for (let index = -1; index <= 1; index += 1) {
    const plate = createArmorBox({
      scene,
      parent,
      material,
      name: `${role}-${blockId}-heavy-armor-overlap-plate-${index + 1}`,
      width: Math.max(plateWidth * 0.34, 0.2),
      height: capHeight,
      depth: Math.max(plateDepth * 0.82, 0.42),
      position: [index * Math.max(plateWidth * 0.27, 0.16), deckY, 0],
      materialRole: 'damageable',
    })

    plate.rotation.z = index * 0.025
  }

  createArmorEdgeCaps(
    scene,
    parent,
    materials,
    `${role}-${blockId}-heavy-armor-top`,
    plateWidth,
    plateDepth,
    deckY + capHeight * 0.58,
    edgeThickness,
  )

  for (let index = 0; index < 4; index += 1) {
    createArmorBox({
      scene,
      parent,
      material: materials.trim,
      name: `${role}-${blockId}-heavy-armor-corner-clamp-${index}`,
      width: Math.max(width * 0.18, 0.09),
      height: Math.max(height * 0.18, 0.085),
      depth: Math.max(depth * 0.18, 0.09),
      position: [
        index % 2 === 0 ? -plateWidth * 0.39 : plateWidth * 0.39,
        deckY + capHeight * 0.2,
        index < 2 ? -plateDepth * 0.39 : plateDepth * 0.39,
      ],
      materialRole: 'trim',
    })
  }

  for (let index = -1; index <= 1; index += 2) {
    createArmorBox({
      scene,
      parent,
      material: materials.steel,
      name: `${role}-${blockId}-heavy-armor-side-crush-rail-${index}`,
      width: Math.max(plateWidth * 0.12, 0.07),
      height: Math.max(height * 0.18, 0.08),
      depth: Math.max(plateDepth * 0.92, 0.48),
      position: [index * plateWidth * 0.48, Math.max(height * 0.22, 0.12), 0],
      materialRole: 'trim',
    })
  }

  createArmorCornerFasteners(
    scene,
    parent,
    materials,
    `${role}-${blockId}-heavy-armor`,
    plateWidth,
    plateDepth,
    deckY + capHeight * 0.7,
    Math.max(width * 0.045, 0.026),
  )
  createArmorScrapeMarks(
    scene,
    parent,
    materials,
    `${role}-${blockId}-heavy-armor`,
    plateWidth,
    plateDepth,
    deckY + capHeight * 0.78,
  )

  for (let index = -1; index <= 1; index += 2) {
    createArmorBox({
      scene,
      parent,
      material: materials.warning,
      name: `${role}-${blockId}-heavy-armor-service-lift-tab-${index}`,
      width: Math.max(plateWidth * 0.16, 0.09),
      height: Math.max(height * 0.035, 0.022),
      depth: Math.max(plateDepth * 0.24, 0.13),
      position: [index * plateWidth * 0.22, deckY + capHeight * 0.9, -plateDepth * 0.32],
      materialRole: 'trim',
    })
  }
}
