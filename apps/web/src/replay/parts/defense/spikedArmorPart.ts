import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { DefensePartRenderArgs } from './types'

export function createSpikedArmorPart({
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

    const plate = MeshBuilder.CreateBox(
      `${role}-${blockId}-spiked-armor-plate`,
      { width: Math.max(width * 0.94, 0.54), height: Math.max(height * 0.2, 0.12), depth: Math.max(depth * 0.94, 0.5) },
      scene,
    )

    attachMesh(plate, parent, material)

    for (let index = 0; index < 3; index += 1) {
      const spike = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-spiked-armor-tooth-${index}`,
        {
          height: Math.max(height * 0.46, 0.22),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.16, 0.09),
          tessellation: 10,
        },
        scene,
      )

      spike.rotation.x = Math.PI / 2
      spike.position.set((index - 1) * Math.max(width * 0.22, 0.13), Math.max(height * 0.26, 0.16), Math.max(depth * 0.38, 0.22))
      attachMesh(spike, parent, materials.warning)
    }
}
