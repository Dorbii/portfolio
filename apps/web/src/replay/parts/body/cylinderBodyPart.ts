import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import { createTopLamp } from '../details'
import { createRaisedTechCluster } from './techDetails'
import type { BodyPartRenderArgs } from './types'

export function createCylinderBodyPart({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {

    const cylinder = MeshBuilder.CreateCylinder(
      `${parent.name}-chassis-cyl`,
      { height: Math.max(height * 0.95, 0.32), diameter: Math.max(width, depth), tessellation: 18 },
      scene,
    )
    cylinder.rotation.z = Math.PI / 2
    attachMesh(cylinder, parent, material)
    createTopLamp(scene, parent, materials.light, Math.max(width, depth) * 0.52, height * 0.58)
    createRaisedTechCluster(scene, parent, materials, width, height, depth)
}
