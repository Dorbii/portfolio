import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

export function createHammerWeaponPart({
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
  const armLength = Math.max(depth * 1.28, 0.82)
  const arm = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-hammer-arm`,
    {
      height: armLength,
      diameter: Math.max(width * 0.13, 0.075),
      tessellation: 12,
    },
    scene,
  )
  const head = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-hammer-impact-head`,
    {
      height: Math.max(width * 0.62, 0.34),
      diameter: Math.max(height * 0.54, 0.24),
      tessellation: 12,
    },
    scene,
  )
  const pivot = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-hammer-pivot`,
    {
      height: Math.max(width * 0.46, 0.26),
      diameter: Math.max(height * 0.42, 0.2),
      tessellation: 14,
    },
    scene,
  )

  arm.rotation.x = Math.PI / 2
  arm.position.set(0, Math.max(height * 0.34, 0.2), Math.max(depth * 0.18, 0.12))
  head.rotation.z = Math.PI / 2
  head.position.set(0, Math.max(height * 0.52, 0.32), Math.max(depth * 0.82, 0.48))
  pivot.rotation.z = Math.PI / 2
  pivot.position.set(0, Math.max(height * 0.28, 0.18), -Math.max(depth * 0.42, 0.24))
  attachMesh(arm, parent, materials.steel)
  attachMesh(head, parent, materials.steel)
  attachMesh(pivot, parent, materials.trim)

  for (let side = -1; side <= 1; side += 2) {
    createBoxDetail(
      scene,
      parent,
      material,
      `${role}-${blockId}-hammer-strike-face-${side}`,
      Math.max(width * 0.18, 0.1),
      Math.max(height * 0.42, 0.18),
      Math.max(depth * 0.18, 0.1),
      side * Math.max(width * 0.36, 0.2),
      head.position.y,
      head.position.z,
    )
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${role}-${blockId}-hammer-side-bracket-${side}`,
      Math.max(width * 0.12, 0.07),
      Math.max(height * 0.5, 0.2),
      Math.max(depth * 0.18, 0.12),
      side * Math.max(width * 0.3, 0.18),
      Math.max(height * 0.32, 0.2),
      pivot.position.z,
    )
  }

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-hammer-pivot-bolt-${index}`,
      {
        height: 0.028,
        diameter: Math.max(width * 0.055, 0.026),
        tessellation: 8,
      },
      scene,
    )

    bolt.rotation.z = Math.PI / 2
    bolt.position.set(
      -Math.max(width * 0.25, 0.14),
      pivot.position.y + Math.sin(angle) * Math.max(height * 0.17, 0.08),
      pivot.position.z + Math.cos(angle) * Math.max(height * 0.17, 0.08),
    )
    attachMesh(bolt, parent, materials.steel)
  }
}
