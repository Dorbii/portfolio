import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createBoxDetail } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'
import {
  attachRoleMesh,
  attachWeaponEdgeMesh,
  tagRoleMesh,
  tagWeaponEdgeMesh,
} from './weaponRenderHelpers'

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
  const swingRoot = new TransformNode(`${role}-${blockId}-hammer-swing-root`, scene)
  const pivotPosition = {
    x: 0,
    y: Math.max(height * 0.28, 0.18),
    z: -Math.max(depth * 0.42, 0.24),
  }

  arm.rotation.x = Math.PI / 2
  arm.position.set(0, Math.max(height * 0.34, 0.2) - pivotPosition.y, Math.max(depth * 0.18, 0.12) - pivotPosition.z)
  head.rotation.z = Math.PI / 2
  head.position.set(0, Math.max(height * 0.52, 0.32) - pivotPosition.y, Math.max(depth * 0.82, 0.48) - pivotPosition.z)
  pivot.rotation.z = Math.PI / 2
  pivot.position.set(pivotPosition.x, pivotPosition.y, pivotPosition.z)
  swingRoot.parent = parent
  swingRoot.position.set(pivotPosition.x, pivotPosition.y, pivotPosition.z)
  swingRoot.metadata = { animationProfile: 'hammer_swing', kind: 'actuate', axis: 'x', amplitude: -0.95, speed: 0.06 }
  attachWeaponEdgeMesh(arm, swingRoot, materials.steel)
  attachWeaponEdgeMesh(head, swingRoot, materials.steel)
  attachRoleMesh(pivot, parent, materials.trim, 'trim')

  for (let side = -1; side <= 1; side += 2) {
    tagWeaponEdgeMesh(
      createBoxDetail(
        scene,
        swingRoot,
        material,
        `${role}-${blockId}-hammer-strike-face-${side}`,
        Math.max(width * 0.18, 0.1),
        Math.max(height * 0.42, 0.18),
        Math.max(depth * 0.18, 0.1),
        side * Math.max(width * 0.36, 0.2),
        head.position.y,
        head.position.z,
      ),
    )
    tagRoleMesh(
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
      ),
      'trim',
    )

    const retainer = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-hammer-pivot-retainer-${side}`,
      {
        height: 0.04,
        diameter: Math.max(height * 0.58, 0.25),
        tessellation: 16,
      },
      scene,
    )
    const bentStop = MeshBuilder.CreateBox(
      `${role}-${blockId}-hammer-bent-swing-stop-${side}`,
      {
        width: Math.max(width * 0.08, 0.052),
        height: Math.max(height * 0.14, 0.07),
        depth: Math.max(depth * 0.26, 0.14),
      },
      scene,
    )

    retainer.rotation.z = Math.PI / 2
    retainer.position.set(side * Math.max(width * 0.26, 0.15), pivot.position.y, pivot.position.z)
    bentStop.position.set(side * Math.max(width * 0.36, 0.22), Math.max(height * 0.52, 0.28), -Math.max(depth * 0.28, 0.16))
    bentStop.rotation.z = side * 0.16
    attachRoleMesh(retainer, parent, materials.steel, 'trim')
    attachRoleMesh(bentStop, parent, materials.warning, 'trim')
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
    attachRoleMesh(bolt, parent, materials.steel, 'trim')
  }

  for (let index = 0; index < 4; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const row = Math.floor(index / 2)
    const chip = createBoxDetail(
      scene,
      parent,
      materials.profile.burnt_critical_metal,
      `${role}-${blockId}-hammer-impact-head-wear-chip-${index}`,
      Math.max(width * 0.13, 0.07),
      Math.max(height * 0.035, 0.02),
      Math.max(depth * 0.12, 0.07),
      side * Math.max(width * 0.31, 0.18),
      head.position.y + Math.max(height * (0.08 - row * 0.16), -0.04),
      head.position.z + Math.max(depth * 0.08, 0.045),
    )

    chip.rotation.z = side * 0.18
    tagWeaponEdgeMesh(chip)
  }
}
