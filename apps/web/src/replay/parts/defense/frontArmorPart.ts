import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { createRampBlock } from '../../rendering/meshHelpers'
import {
  attachArmorMesh,
  createArmorBox,
  createArmorCornerFasteners,
  createArmorCylinder,
  createArmorScrapeMarks,
} from './armorDetailHelpers'
import type { DefensePartRenderArgs } from './types'

export function createFrontArmorPart({
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
}: DefensePartRenderArgs): void {
  const isShield = partId.includes('Shield')
  const plateWidth = Math.max(width * (isShield ? 1.08 : 1.16), 0.64)
  const plateHeight = Math.max(height * (isShield ? 0.36 : 0.42), 0.18)
  const plateDepth = Math.max(depth * (isShield ? 0.82 : 1.08), 0.44)
  const topY = Math.max(height * 0.28, 0.14)

  const plate = createRampBlock(
    scene,
    `${role}-${blockId}-${isShield ? 'shield-sloped-face' : 'front-armor-ramp'}`,
    plateWidth,
    plateHeight,
    plateDepth,
    Math.max(height * (isShield ? 0.16 : 0.1), 0.04),
  )
  const faceBar = MeshBuilder.CreateBox(
    `${role}-${blockId}-${isShield ? 'shield-lower-impact-bar' : 'front-impact-bar'}`,
    {
      width: Math.max(width * 1.12, 0.64),
      height: Math.max(height * 0.16, 0.09),
      depth: Math.max(depth * 0.16, 0.08),
    },
    scene,
  )

  plate.position.y = Math.max(height * 0.05, 0.04)
  faceBar.position.set(0, Math.max(height * 0.16, 0.1), plateDepth * 0.46)
  attachArmorMesh(plate, parent, material)
  attachArmorMesh(faceBar, parent, materials.trim, 'trim')

  for (let index = -1; index <= 1; index += 1) {
    createArmorBox({
      scene,
      parent,
      material: index === 0 ? material : materials.trim,
      name: `${role}-${blockId}-${isShield ? 'shield' : 'front'}-face-strap-${index + 1}`,
      width: Math.max(width * (isShield ? 0.16 : 0.12), 0.075),
      height: Math.max(height * 0.055, 0.032),
      depth: Math.max(plateDepth * 0.74, 0.34),
      position: [index * Math.max(width * 0.3, 0.17), topY, 0],
      rotation: [0, isShield ? index * 0.1 : index * 0.16, 0],
      materialRole: index === 0 ? 'damageable' : 'trim',
    })
  }

  createArmorBox({
    scene,
    parent,
    material: materials.steel,
    name: `${role}-${blockId}-${isShield ? 'shield' : 'front'}-hardened-leading-lip`,
    width: Math.max(plateWidth * 0.96, 0.58),
    height: Math.max(height * 0.055, 0.032),
    depth: Math.max(depth * 0.1, 0.055),
    position: [0, Math.max(height * 0.08, 0.05), plateDepth * 0.55],
    materialRole: 'trim',
  })

  createArmorCornerFasteners(
    scene,
    parent,
    materials,
    `${role}-${blockId}-${isShield ? 'shield' : 'front'}-armor`,
    plateWidth,
    plateDepth,
    topY + Math.max(height * 0.05, 0.026),
    Math.max(width * 0.04, 0.024),
  )
  createArmorScrapeMarks(
    scene,
    parent,
    materials,
    `${role}-${blockId}-${isShield ? 'shield' : 'front'}-armor`,
    plateWidth,
    plateDepth,
    topY + Math.max(height * 0.08, 0.04),
  )

  if (isShield) {
    const boss = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-shield-center-boss`,
      { height: Math.max(height * 0.16, 0.08), diameter: Math.max(width * 0.34, 0.2), tessellation: 14 },
      scene,
    )

    boss.position.set(0, Math.max(height * 0.34, 0.18), 0)
    attachArmorMesh(boss, parent, materials.warning, 'trim')

    for (let index = 0; index < 4; index += 1) {
      createArmorCylinder({
        scene,
        parent,
        material: materials.steel,
        name: `${role}-${blockId}-shield-boss-bolt-${index}`,
        height: Math.max(height * 0.035, 0.018),
        diameter: Math.max(width * 0.042, 0.024),
        tessellation: 8,
        position: [
          Math.sin((Math.PI * 2 * index) / 4) * Math.max(width * 0.18, 0.1),
          Math.max(height * 0.43, 0.22),
          Math.cos((Math.PI * 2 * index) / 4) * Math.max(depth * 0.18, 0.1),
        ],
        materialRole: 'trim',
      })
    }
  }
}
