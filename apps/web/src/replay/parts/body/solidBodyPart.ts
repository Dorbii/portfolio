import { createSolidBlock } from '../../rendering/meshHelpers'
import { createArmorPanel } from '../details'
import { createRaisedTechCluster } from './techDetails'
import type { BodyPartRenderArgs } from './types'

export function createSolidBodyPart({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {


  createSolidBlock(scene, parent, material, `${parent.name}-body`, width, height, depth)
  createArmorPanel(scene, parent, material, materials.trim, width, height, depth)
  createRaisedTechCluster(scene, parent, materials, width, height, depth)
}
