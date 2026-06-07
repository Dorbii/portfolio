import { attachMesh, createRampBlock } from '../../rendering/meshHelpers'
import { tagPartChildMaterialRole } from '../../rendering/materials'
import {
  createFaceBoltRow,
  createTaggedBoxDetail,
  createTopBoltGrid,
} from './bodyDetails'
import { createRaisedTechCluster } from './techDetails'
import type { BodyPartRenderArgs } from './types'

export function createWedgeBodyPart({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {
  const wedgeHeight = Math.max(height * 0.9, 0.34)
  const wedgeWidth = width * 1.28
  const wedgeDepth = depth * 1.04
  const wedge = createRampBlock(
    scene,
    `${parent.name}-low-armored-wedge`,
    wedgeWidth,
    wedgeHeight,
    wedgeDepth,
    Math.max(height * 0.14, 0.055),
  )

  wedge.position.set(0, -height * 0.04, depth * 0.08)
  attachMesh(wedge, parent, material)
  tagPartChildMaterialRole(wedge, 'damageable')
  createTaggedBoxDetail(
    scene,
    parent,
    materials.steel,
    `${parent.name}-wedge-front-skid-lip`,
    wedgeWidth * 1.02,
    0.08,
    0.13,
    0,
    height * 0.18,
    depth * 0.62,
    'trim',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.damageByRole.damageable.light,
    `${parent.name}-wedge-scraped-center-plate`,
    width * 0.62,
    0.028,
    depth * 0.42,
    0,
    Math.max(height * 0.46, 0.2),
    depth * 0.08,
    'damageable',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.trim,
    `${parent.name}-wedge-center-spine-seam`,
    0.032,
    0.025,
    depth * 0.66,
    0,
    Math.max(height * 0.5, 0.22),
    depth * 0.04,
    'trim',
  )

  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      materials.armor,
      `${parent.name}-wedge-side-cheek-${side}`,
      Math.max(width * 0.12, 0.08),
      Math.max(height * 0.34, 0.14),
      depth * 0.72,
      side * width * 0.62,
      Math.max(height * 0.2, 0.12),
      -depth * 0.02,
      'damageable',
    )
    createTaggedBoxDetail(
      scene,
      parent,
      materials.warning,
      `${parent.name}-wedge-front-caution-block-${side}`,
      width * 0.18,
      0.034,
      0.08,
      side * width * 0.28,
      Math.max(height * 0.32, 0.16),
      depth * 0.54,
      'trim',
    )
  }

  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-wedge-top-panel-bolt`, {
    columns: 2,
    depth: depth * 0.44,
    rows: 2,
    width: width * 0.58,
    y: Math.max(height * 0.58, 0.27),
  })
  createFaceBoltRow(scene, parent, materials.trim, `${parent.name}-wedge-front-lip-fastener`, {
    axis: 'z',
    count: 4,
    fixed: depth * 0.69,
    length: width * 0.82,
    y: Math.max(height * 0.22, 0.13),
  })
  createRaisedTechCluster(scene, parent, materials, width, height, depth)
}
