import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import { createCornerCaps } from '../details'
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

    const core = MeshBuilder.CreateBox(
      `${parent.name}-core`,
      { width, height: Math.max(height, 0.55), depth },
      scene,
    )
    const top = MeshBuilder.CreateBox(
      `${parent.name}-core-top`,
      { width: width * 0.88, height: Math.max(height * 0.45, 0.2), depth: depth * 0.88 },
      scene,
    )

    top.position.y = height * 0.55
    attachMesh(core, parent, material)
    attachMesh(top, parent, material)
    createCornerCaps(scene, parent, materials.trim, width, Math.max(height, 0.55), depth)
    createRaisedTechCluster(scene, parent, materials, width, Math.max(height, 0.55), depth)
}
