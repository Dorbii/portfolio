import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import { tagPartChildMaterialRole } from '../../rendering/materials'
import {
  createFaceBoltRow,
  createParallelSideRails,
  createTaggedBoxDetail,
  createTopBoltGrid,
} from './bodyDetails'
import { createRaisedTechCluster } from './techDetails'
import type { BodyPartRenderArgs } from './types'

export function createHeavyBlockBodyPart({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {
  const blockHeight = Math.max(height, 0.58)
  const topY = blockHeight * 0.54
  const core = MeshBuilder.CreateBox(
    `${parent.name}-armored-core`,
    { width, height: blockHeight, depth },
    scene,
  )
  const topSlab = MeshBuilder.CreateBox(
    `${parent.name}-raised-service-slab`,
    { width: width * 0.9, height: Math.max(blockHeight * 0.26, 0.18), depth: depth * 0.88 },
    scene,
  )

  topSlab.position.y = topY
  attachMesh(core, parent, material)
  attachMesh(topSlab, parent, material)
  tagPartChildMaterialRole(core, 'damageable')
  tagPartChildMaterialRole(topSlab, 'damageable')

  createParallelSideRails(
    scene,
    parent,
    materials.trim,
    `${parent.name}-armored-side-rail`,
    width * 0.53,
    Math.max(blockHeight * 0.16, 0.14),
    depth * 0.9,
    Math.max(width * 0.08, 0.08),
    Math.max(blockHeight * 0.42, 0.18),
  )

  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      materials.armor,
      `${parent.name}-thick-end-plate-${side}`,
      width * 0.78,
      Math.max(blockHeight * 0.3, 0.18),
      Math.max(depth * 0.08, 0.08),
      0,
      Math.max(blockHeight * 0.18, 0.14),
      side * depth * 0.53,
      'damageable',
    )
  }

  createTaggedBoxDetail(
    scene,
    parent,
    materials.damageByRole.damageable.light,
    `${parent.name}-scarred-top-access-panel`,
    width * 0.46,
    0.026,
    depth * 0.34,
    -width * 0.09,
    topY + Math.max(blockHeight * 0.14, 0.1),
    depth * 0.04,
    'damageable',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.trim,
    `${parent.name}-center-service-seam`,
    width * 0.72,
    0.018,
    0.032,
    0,
    topY + Math.max(blockHeight * 0.16, 0.11),
    0,
    'trim',
  )
  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-top-slab-bolt`, {
    columns: 3,
    depth: depth * 0.58,
    rows: 2,
    width: width * 0.58,
    y: topY + Math.max(blockHeight * 0.16, 0.11),
  })
  createFaceBoltRow(scene, parent, materials.trim, `${parent.name}-front-end-plate-bolt`, {
    axis: 'z',
    count: 3,
    fixed: depth * 0.58,
    length: width * 0.52,
    y: Math.max(blockHeight * 0.24, 0.16),
  })
  createFaceBoltRow(scene, parent, materials.trim, `${parent.name}-rear-end-plate-bolt`, {
    axis: 'z',
    count: 3,
    fixed: -depth * 0.58,
    length: width * 0.52,
    y: Math.max(blockHeight * 0.24, 0.16),
  })
  createRaisedTechCluster(scene, parent, materials, width, blockHeight, depth)
}
