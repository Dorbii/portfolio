import { attachMesh, createBoxDetail, createRampBlock } from '../../rendering/meshHelpers'
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

    const wedge = createRampBlock(
      scene,
      `${parent.name}-wedge`,
      width * 1.28,
      Math.max(height * 0.9, 0.34),
      depth * 1.04,
      Math.max(height * 0.16, 0.06),
    )
    wedge.position.set(0, -height * 0.04, depth * 0.08)
    attachMesh(wedge, parent, material)
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-wedge-lip`,
      width * 1.32,
      0.09,
      0.14,
      0,
      height * 0.24,
      depth * 0.66,
    )
    createRaisedTechCluster(scene, parent, materials, width, height, depth)
}
