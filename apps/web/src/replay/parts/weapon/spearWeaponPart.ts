import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

export function createSpearWeaponPart({
  scene,
  parent,
  role,
  blockId,
  width,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const shaft = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spear-shaft`,
    { height: Math.max(depth * 1.15, 0.72), diameter: Math.max(width * 0.16, 0.1), tessellation: 10 },
    scene,
  )
  const tip = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spear-tip`,
    {
      height: Math.max(depth * 0.36, 0.24),
      diameterTop: 0,
      diameterBottom: Math.max(width * 0.28, 0.18),
      tessellation: 12,
    },
    scene,
  )

  shaft.rotation.x = Math.PI / 2
  shaft.position.z = Math.max(depth * 0.48, 0.34)
  tip.rotation.x = Math.PI / 2
  tip.position.z = Math.max(depth * 1.14, 0.74)
  attachMesh(shaft, parent, materials.trim)
  attachMesh(tip, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    const fin = MeshBuilder.CreateBox(
      `${role}-${blockId}-spear-stabilizer-fin-${side}`,
      {
        width: Math.max(width * 0.08, 0.045),
        height: Math.max(width * 0.28, 0.13),
        depth: Math.max(depth * 0.24, 0.16),
      },
      scene,
    )
    const collar = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spear-collar-${side}`,
      {
        height: Math.max(width * 0.16, 0.08),
        diameter: Math.max(width * 0.24, 0.14),
        tessellation: 12,
      },
      scene,
    )

    fin.position.set(side * Math.max(width * 0.14, 0.08), 0, Math.max(depth * 0.82, 0.52))
    fin.rotation.z = side * 0.24
    collar.rotation.x = Math.PI / 2
    collar.position.set(0, 0, Math.max(depth * 0.7, 0.46))
    attachMesh(fin, parent, materials.steel)
    attachMesh(collar, parent, materials.steel)
  }
}
