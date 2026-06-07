import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail, createRampBlock } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

export function createRamWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const ramFace = createRampBlock(
    scene,
    `${role}-${blockId}-ram-impact-wedge`,
    Math.max(width * 1.3, 0.76),
    Math.max(height * 0.54, 0.24),
    Math.max(depth * 1.02, 0.58),
    Math.max(height * 0.18, 0.08),
  )
  const crushBar = MeshBuilder.CreateBox(
    `${role}-${blockId}-ram-crush-bar`,
    {
      width: Math.max(width * 1.22, 0.72),
      height: Math.max(height * 0.16, 0.1),
      depth: Math.max(depth * 0.16, 0.09),
    },
    scene,
  )

  ramFace.position.set(0, Math.max(height * 0.18, 0.12), Math.max(depth * 0.28, 0.16))
  crushBar.position.set(0, Math.max(height * 0.28, 0.16), Math.max(depth * 0.78, 0.42))
  attachMesh(ramFace, parent, material)
  attachMesh(crushBar, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${role}-${blockId}-ram-side-cheek-${side}`,
      Math.max(width * 0.14, 0.09),
      Math.max(height * 0.42, 0.18),
      Math.max(depth * 0.78, 0.4),
      side * Math.max(width * 0.5, 0.32),
      Math.max(height * 0.24, 0.14),
      Math.max(depth * 0.18, 0.1),
    )
  }

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(
      scene,
      parent,
      materials.steel,
      `${role}-${blockId}-ram-rake-tooth-${index + 1}`,
      Math.max(width * 0.12, 0.08),
      Math.max(height * 0.16, 0.08),
      Math.max(depth * 0.24, 0.14),
      index * Math.max(width * 0.28, 0.16),
      Math.max(height * 0.34, 0.18),
      Math.max(depth * 0.92, 0.48),
    )
  }
}
