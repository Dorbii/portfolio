import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail } from '../../rendering/meshHelpers'
import type { DefensePartRenderArgs } from './types'

export function createHeavyArmorPart({
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

    const base = MeshBuilder.CreateBox(
      `${role}-${blockId}-heavy-armor-base`,
      { width: Math.max(width, 0.56), height: Math.max(height * 0.28, 0.16), depth: Math.max(depth, 0.52) },
      scene,
    )
    const cap = MeshBuilder.CreateBox(
      `${role}-${blockId}-heavy-armor-cap`,
      { width: Math.max(width * 0.74, 0.4), height: Math.max(height * 0.24, 0.12), depth: Math.max(depth * 0.72, 0.36) },
      scene,
    )

    cap.position.y = Math.max(height * 0.3, 0.18)
    attachMesh(base, parent, material)
    attachMesh(cap, parent, material)

    for (let index = 0; index < 4; index += 1) {
      createBoxDetail(
        scene,
        parent,
        materials.trim,
        `${role}-${blockId}-heavy-armor-corner-block-${index}`,
        Math.max(width * 0.18, 0.09),
        Math.max(height * 0.14, 0.07),
        Math.max(depth * 0.18, 0.09),
        index % 2 === 0 ? -width * 0.38 : width * 0.38,
        Math.max(height * 0.48, 0.24),
        index < 2 ? -depth * 0.38 : depth * 0.38,
      )
    }
}
