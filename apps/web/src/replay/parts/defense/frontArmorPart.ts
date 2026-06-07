import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createRampBlock } from '../../rendering/meshHelpers'
import type { DefensePartRenderArgs } from './types'

export function createFrontArmorPart({
  scene,
  parent,
  material,
  role,
  blockId,
  partId,
  width,
  height,
  depth,
  materials,
}: DefensePartRenderArgs): void {

    const plate = createRampBlock(
      scene,
      `${role}-${blockId}-front-armor-ramp`,
      Math.max(width * (partId.includes('Shield') ? 1.08 : 1.16), 0.64),
      Math.max(height * 0.42, 0.18),
      Math.max(depth * (partId.includes('Shield') ? 0.82 : 1.08), 0.44),
      Math.max(height * 0.1, 0.04),
    )
    const faceBar = MeshBuilder.CreateBox(
      `${role}-${blockId}-front-impact-bar`,
      {
        width: Math.max(width * 1.12, 0.64),
        height: Math.max(height * 0.18, 0.1),
        depth: Math.max(depth * 0.16, 0.08),
      },
      scene,
    )

    plate.position.y = Math.max(height * 0.05, 0.04)
    faceBar.position.set(0, Math.max(height * 0.16, 0.1), Math.max(depth * 0.48, 0.26))
    attachMesh(plate, parent, material)
    attachMesh(faceBar, parent, materials.trim)

    if (partId.includes('Shield')) {
      const boss = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-shield-center-boss`,
        { height: Math.max(height * 0.16, 0.08), diameter: Math.max(width * 0.34, 0.2), tessellation: 14 },
        scene,
      )

      boss.position.set(0, Math.max(height * 0.34, 0.18), 0)
      attachMesh(boss, parent, materials.warning)
    }
}
