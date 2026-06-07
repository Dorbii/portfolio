import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { createBoxDetail } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'
import {
  attachRoleMesh,
  attachWeaponEdgeMesh,
  tagRoleMesh,
} from './weaponRenderHelpers'

export function createSpearWeaponPart({
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
  const mountBlock = MeshBuilder.CreateBox(
    `${role}-${blockId}-spear-reinforced-mount-block`,
    {
      width: Math.max(width * 0.44, 0.28),
      height: Math.max(height * 0.28, 0.16),
      depth: Math.max(depth * 0.32, 0.22),
    },
    scene,
  )
  const rearSocket = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spear-rear-socket`,
    {
      height: Math.max(depth * 0.2, 0.14),
      diameter: Math.max(width * 0.28, 0.16),
      tessellation: 12,
    },
    scene,
  )
  const shaftY = Math.max(height * 0.32, 0.18)

  shaft.rotation.x = Math.PI / 2
  shaft.position.y = shaftY
  shaft.position.z = Math.max(depth * 0.48, 0.34)
  tip.rotation.x = Math.PI / 2
  tip.position.y = shaftY
  tip.position.z = Math.max(depth * 1.14, 0.74)
  mountBlock.position.set(0, Math.max(height * 0.2, 0.13), -Math.max(depth * 0.06, 0.04))
  rearSocket.rotation.x = Math.PI / 2
  rearSocket.position.set(0, shaftY, Math.max(depth * 0.16, 0.12))
  attachRoleMesh(mountBlock, parent, material, 'damageable')
  attachRoleMesh(rearSocket, parent, materials.trim, 'trim')
  attachWeaponEdgeMesh(shaft, parent, materials.trim)
  attachWeaponEdgeMesh(tip, parent, materials.warning)

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
    const guideRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-spear-guide-rail-${side}`,
      {
        width: Math.max(width * 0.06, 0.04),
        height: Math.max(height * 0.08, 0.045),
        depth: Math.max(depth * 0.66, 0.36),
      },
      scene,
    )
    const tipBarb = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spear-tip-barb-${side}`,
      {
        height: Math.max(width * 0.18, 0.1),
        diameterTop: 0,
        diameterBottom: Math.max(width * 0.08, 0.045),
        tessellation: 8,
      },
      scene,
    )

    fin.position.set(side * Math.max(width * 0.14, 0.08), shaftY, Math.max(depth * 0.82, 0.52))
    fin.rotation.z = side * 0.24
    collar.rotation.x = Math.PI / 2
    collar.position.set(0, shaftY, Math.max(depth * 0.7, 0.46))
    guideRail.position.set(side * Math.max(width * 0.19, 0.12), Math.max(height * 0.22, 0.14), Math.max(depth * 0.34, 0.22))
    tipBarb.rotation.x = Math.PI / 2
    tipBarb.rotation.z = side * 0.68
    tipBarb.position.set(side * Math.max(width * 0.12, 0.07), shaftY, Math.max(depth * 1.02, 0.68))
    attachWeaponEdgeMesh(fin, parent, materials.steel)
    attachRoleMesh(collar, parent, materials.steel, 'trim')
    attachRoleMesh(guideRail, parent, materials.trim, 'trim')
    attachWeaponEdgeMesh(tipBarb, parent, materials.warning)
  }

  for (let index = 0; index < 3; index += 1) {
    tagRoleMesh(
      createBoxDetail(
        scene,
        parent,
        index === 1 ? materials.warning : materials.steel,
        `${role}-${blockId}-spear-socket-band-${index}`,
        Math.max(width * 0.36, 0.22),
        Math.max(height * 0.04, 0.025),
        Math.max(depth * 0.055, 0.035),
        0,
        shaftY,
        Math.max(depth * (0.28 + index * 0.16), 0.18 + index * 0.09),
      ),
      index === 1 ? 'trim' : 'weapon_edge',
    )
  }
}
