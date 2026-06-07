import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import {
  attachArmorMesh,
  createArmorBox,
  createArmorCornerFasteners,
  createArmorScrapeMarks,
} from './armorDetailHelpers'
import type { DefensePartRenderArgs } from './types'

export function createReactiveArmorPart({
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
  const backerWidth = Math.max(width * 0.98, 0.54)
  const backerDepth = Math.max(depth * 0.98, 0.52)
  const backerHeight = Math.max(height * 0.14, 0.09)
  const tileWidth = Math.max(width * 0.26, 0.15)
  const tileDepth = Math.max(depth * 0.3, 0.16)
  const tileHeight = Math.max(height * 0.12, 0.065)
  const tileY = Math.max(height * 0.26, 0.15)

  const backer = MeshBuilder.CreateBox(
    `${role}-${blockId}-reactive-armor-bolted-backer`,
    { width: backerWidth, height: backerHeight, depth: backerDepth },
    scene,
  )

  backer.position.y = Math.max(height * 0.06, 0.04)
  attachArmorMesh(backer, parent, material)

  for (let column = -1; column <= 1; column += 1) {
    for (let row = -1; row <= 1; row += 2) {
      const isReplacementBlank = column === 1 && row === -1

      createArmorBox({
        scene,
        parent,
        material: isReplacementBlank ? materials.trim : material,
        name: `${role}-${blockId}-reactive-sacrificial-tile-${column + 1}-${row > 0 ? 'front' : 'rear'}`,
        width: isReplacementBlank ? tileWidth * 0.82 : tileWidth,
        height: isReplacementBlank ? tileHeight * 0.58 : tileHeight,
        depth: tileDepth,
        position: [
          column * Math.max(width * 0.24, 0.13),
          tileY + (isReplacementBlank ? -tileHeight * 0.12 : 0),
          row * Math.max(depth * 0.22, 0.12),
        ],
        materialRole: isReplacementBlank ? 'trim' : 'damageable',
      })
    }
  }

  for (let column = -1; column <= 1; column += 1) {
    createArmorBox({
      scene,
      parent,
      material: materials.warning,
      name: `${role}-${blockId}-reactive-arming-stripe-${column + 1}`,
      width: Math.max(tileWidth * 0.5, 0.08),
      height: Math.max(height * 0.025, 0.016),
      depth: Math.max(backerDepth * 0.76, 0.34),
      position: [column * Math.max(width * 0.24, 0.13), tileY + tileHeight * 0.7, 0],
      materialRole: 'trim',
    })
  }

  createArmorBox({
    scene,
    parent,
    material: materials.steel,
    name: `${role}-${blockId}-reactive-exposed-mount-plate`,
    width: Math.max(tileWidth * 0.9, 0.12),
    height: Math.max(height * 0.035, 0.022),
    depth: Math.max(tileDepth * 0.76, 0.12),
    position: [
      Math.max(width * 0.24, 0.13),
      tileY - tileHeight * 0.52,
      -Math.max(depth * 0.22, 0.12),
    ],
    materialRole: 'trim',
  })

  createArmorBox({
    scene,
    parent,
    material: materials.warning,
    name: `${role}-${blockId}-reactive-warning-tab`,
    width: Math.max(width * 0.16, 0.09),
    height: Math.max(height * 0.08, 0.04),
    depth: Math.max(depth * 0.82, 0.38),
    position: [Math.max(width * 0.49, 0.25), Math.max(height * 0.28, 0.16), 0],
    materialRole: 'trim',
  })

  createArmorCornerFasteners(
    scene,
    parent,
    materials,
    `${role}-${blockId}-reactive-armor`,
    backerWidth,
    backerDepth,
    tileY + tileHeight * 0.55,
    Math.max(width * 0.032, 0.022),
  )
  createArmorScrapeMarks(
    scene,
    parent,
    materials,
    `${role}-${blockId}-reactive-armor`,
    backerWidth,
    backerDepth,
    tileY + tileHeight * 0.78,
  )
}
