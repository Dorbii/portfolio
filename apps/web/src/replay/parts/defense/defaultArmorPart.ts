import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { DefensePartRenderArgs } from './types'

export function createDefaultArmorPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
}: DefensePartRenderArgs): void {
  const plate = MeshBuilder.CreateBox(
    `${role}-${blockId}-plate`,
    { width: Math.max(width * 0.95, 0.55), height: Math.max(height * 0.2, 0.14), depth: Math.max(depth, 0.5) },
    scene,
  )
  const upperShroud = MeshBuilder.CreateBox(
    `${role}-${blockId}-upper-armor-shroud`,
    {
      width: Math.max(width * 0.62, 0.34),
      height: Math.max(height * 0.14, 0.08),
      depth: Math.max(depth * 0.58, 0.28),
    },
    scene,
  )

  upperShroud.position.set(0, Math.max(height * 0.34, 0.2), -Math.max(depth * 0.08, 0.06))

  attachMesh(plate, parent, material)
  attachMesh(upperShroud, parent, material)
}
