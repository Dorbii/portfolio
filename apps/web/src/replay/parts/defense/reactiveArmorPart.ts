import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail } from '../../rendering/meshHelpers'
import type { DefensePartRenderArgs } from './types'

export function createReactiveArmorPart({
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

    const backer = MeshBuilder.CreateBox(
      `${role}-${blockId}-reactive-armor-backer`,
      { width: Math.max(width * 0.96, 0.54), height: Math.max(height * 0.16, 0.1), depth: Math.max(depth * 0.96, 0.52) },
      scene,
    )

    attachMesh(backer, parent, material)

    for (let column = -1; column <= 1; column += 2) {
      for (let row = -1; row <= 1; row += 2) {
        createBoxDetail(
          scene,
          parent,
          material,
          `${role}-${blockId}-reactive-tile-${column}-${row}`,
          Math.max(width * 0.34, 0.18),
          Math.max(height * 0.12, 0.07),
          Math.max(depth * 0.34, 0.18),
          column * Math.max(width * 0.2, 0.12),
          Math.max(height * 0.26, 0.15),
          row * Math.max(depth * 0.2, 0.12),
        )
      }
    }
    createBoxDetail(
      scene,
      parent,
      materials.warning,
      `${role}-${blockId}-reactive-warning-tab`,
      Math.max(width * 0.22, 0.12),
      Math.max(height * 0.08, 0.04),
      Math.max(depth * 0.82, 0.38),
      Math.max(width * 0.45, 0.24),
      Math.max(height * 0.28, 0.16),
      0,
    )
}
