import {
  createArmorBox,
  createArmorCornerFasteners,
  createArmorCylinder,
} from './armorDetailHelpers'
import type { DefensePartRenderArgs } from './types'

export function createCageArmorPart({
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
  const cageWidth = Math.max(width * 0.96, 0.58)
  const cageDepth = Math.max(depth * 0.96, 0.58)
  const cageHeight = Math.max(height * 0.76, 0.42)
  const postDiameter = Math.max(Math.min(width, depth) * 0.055, 0.045)
  const railThickness = Math.max(postDiameter * 0.9, 0.04)
  const baseY = Math.max(height * 0.06, 0.05)
  const topY = baseY + cageHeight

  createArmorBox({
    scene,
    parent,
    material,
    name: `${role}-${blockId}-cage-bolted-belly-pan`,
    width: cageWidth,
    height: Math.max(height * 0.14, 0.09),
    depth: cageDepth,
    position: [0, baseY, 0],
    materialRole: 'damageable',
  })

  for (const x of [-cageWidth * 0.46, cageWidth * 0.46]) {
    for (const z of [-cageDepth * 0.46, cageDepth * 0.46]) {
      createArmorCylinder({
        scene,
        parent,
        material: materials.steel,
        name: `${role}-${blockId}-cage-post-${x > 0 ? 'r' : 'l'}-${z > 0 ? 'f' : 'b'}`,
        height: cageHeight,
        diameter: postDiameter,
        tessellation: 10,
        position: [x, baseY + cageHeight * 0.5, z],
        materialRole: 'trim',
      })
    }
  }

  createArmorBox({
    scene,
    parent,
    material: materials.steel,
    name: `${role}-${blockId}-cage-front-top-rail`,
    width: cageWidth,
    height: railThickness,
    depth: railThickness,
    position: [0, topY, cageDepth * 0.46],
    materialRole: 'trim',
  })
  createArmorBox({
    scene,
    parent,
    material: materials.steel,
    name: `${role}-${blockId}-cage-rear-top-rail`,
    width: cageWidth,
    height: railThickness,
    depth: railThickness,
    position: [0, topY, -cageDepth * 0.46],
    materialRole: 'trim',
  })
  createArmorBox({
    scene,
    parent,
    material: materials.steel,
    name: `${role}-${blockId}-cage-left-top-rail`,
    width: railThickness,
    height: railThickness,
    depth: cageDepth,
    position: [-cageWidth * 0.46, topY, 0],
    materialRole: 'trim',
  })
  createArmorBox({
    scene,
    parent,
    material: materials.steel,
    name: `${role}-${blockId}-cage-right-top-rail`,
    width: railThickness,
    height: railThickness,
    depth: cageDepth,
    position: [cageWidth * 0.46, topY, 0],
    materialRole: 'trim',
  })

  for (let index = -1; index <= 1; index += 1) {
    createArmorBox({
      scene,
      parent,
      material: materials.steel,
      name: `${role}-${blockId}-cage-roof-slat-${index + 1}`,
      width: cageWidth * 0.82,
      height: railThickness * 0.78,
      depth: railThickness,
      position: [0, topY + railThickness * 0.55, index * cageDepth * 0.24],
      materialRole: 'trim',
    })
  }

  for (const z of [-cageDepth * 0.46, cageDepth * 0.46]) {
    createArmorBox({
      scene,
      parent,
      material: materials.steel,
      name: `${role}-${blockId}-cage-cross-brace-a-${z > 0 ? 'front' : 'rear'}`,
      width: cageWidth * 1.1,
      height: railThickness * 0.8,
      depth: railThickness,
      position: [0, baseY + cageHeight * 0.5, z],
      rotation: [0, 0, z > 0 ? 0.58 : -0.58],
      materialRole: 'trim',
    })
    createArmorBox({
      scene,
      parent,
      material: materials.steel,
      name: `${role}-${blockId}-cage-cross-brace-b-${z > 0 ? 'front' : 'rear'}`,
      width: cageWidth * 1.1,
      height: railThickness * 0.8,
      depth: railThickness,
      position: [0, baseY + cageHeight * 0.5, z],
      rotation: [0, 0, z > 0 ? -0.58 : 0.58],
      materialRole: 'trim',
    })
  }

  for (const z of [-cageDepth * 0.24, cageDepth * 0.24]) {
    createArmorBox({
      scene,
      parent,
      material: materials.warning,
      name: `${role}-${blockId}-cage-service-tab-${z > 0 ? 'front' : 'rear'}`,
      width: cageWidth * 0.24,
      height: railThickness * 0.86,
      depth: railThickness,
      position: [0, baseY + cageHeight * 0.48, z],
      materialRole: 'trim',
    })
  }

  createArmorCornerFasteners(
    scene,
    parent,
    materials,
    `${role}-${blockId}-cage-belly`,
    cageWidth,
    cageDepth,
    baseY + Math.max(height * 0.09, 0.05),
    Math.max(width * 0.036, 0.022),
  )
}
