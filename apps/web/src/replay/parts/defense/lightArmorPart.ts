import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail } from '../../rendering/meshHelpers'
import type { DefensePartRenderArgs } from './types'

export function createLightArmorPart({
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
      `${role}-${blockId}-light-armor-skin`,
      { width: Math.max(width * 0.94, 0.52), height: Math.max(height * 0.18, 0.1), depth: Math.max(depth * 0.92, 0.48) },
      scene,
    )

    attachMesh(plate, parent, material)

    for (let index = -1; index <= 1; index += 1) {
      createBoxDetail(
        scene,
        parent,
        materials.trim,
        `${role}-${blockId}-light-armor-rib-${index + 1}`,
        Math.max(width * 0.14, 0.07),
        Math.max(height * 0.08, 0.04),
        Math.max(depth * 0.84, 0.38),
        index * Math.max(width * 0.24, 0.13),
        Math.max(height * 0.16, 0.08),
        0,
      )
    }
}
