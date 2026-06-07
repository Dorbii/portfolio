import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail, createRampBlock } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'
import {
  attachRoleMesh,
  attachWeaponEdgeMesh,
  tagRoleMesh,
  tagWeaponEdgeMesh,
} from './weaponRenderHelpers'

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
  tagRoleMesh(ramFace, 'damageable')
  attachWeaponEdgeMesh(crushBar, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    tagRoleMesh(
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
      ),
      'trim',
    )
    tagRoleMesh(
      createBoxDetail(
        scene,
        parent,
        materials.steel,
        `${role}-${blockId}-ram-diagonal-impact-rib-${side}`,
        Math.max(width * 0.08, 0.05),
        Math.max(height * 0.1, 0.055),
        Math.max(depth * 0.88, 0.45),
        side * Math.max(width * 0.32, 0.2),
        Math.max(height * 0.34, 0.18),
        Math.max(depth * 0.34, 0.2),
      ),
      'damageable',
    )
  }

  for (let index = -1; index <= 1; index += 1) {
    tagWeaponEdgeMesh(
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
      ),
    )
  }

  for (let index = 0; index < 5; index += 1) {
    const x = (index - 2) * Math.max(width * 0.22, 0.13)
    const scuff = createBoxDetail(
      scene,
      parent,
      materials.profile.burnt_critical_metal,
      `${role}-${blockId}-ram-front-scrape-${index}`,
      Math.max(width * 0.11, 0.065),
      0.026,
      Math.max(depth * 0.05, 0.035),
      x,
      Math.max(height * (0.23 + (index % 2) * 0.12), 0.14),
      Math.max(depth * 0.98, 0.52),
    )

    scuff.rotation.z = (index - 2) * 0.05
    tagWeaponEdgeMesh(scuff)
  }

  for (let index = 0; index < 6; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const row = Math.floor(index / 2)
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-ram-cheek-bolt-${index}`,
      {
        height: 0.022,
        diameter: Math.max(width * 0.04, 0.025),
        tessellation: 8,
      },
      scene,
    )

    bolt.rotation.x = Math.PI / 2
    bolt.position.set(
      side * Math.max(width * 0.5, 0.31),
      Math.max(height * (0.14 + row * 0.12), 0.08 + row * 0.06),
      Math.max(depth * 0.06, 0.04),
    )
    attachRoleMesh(bolt, parent, materials.steel, 'trim')
  }
}
