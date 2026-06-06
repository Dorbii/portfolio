import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import {
  attachMesh,
  createBoxDetail,
  createRampBlock,
} from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'

export function createDefensePart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  if (partId.includes('Cage')) {
    const belly = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-belly-armor`,
      { width, height: Math.max(height * 0.28, 0.18), depth },
      scene,
    )
    const leftTruss = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-left-truss`,
      { width: Math.max(width * 0.16, 0.09), height: Math.max(height * 0.46, 0.24), depth: Math.max(depth * 1.08, 0.62) },
      scene,
    )
    const rightTruss = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-right-truss`,
      { width: Math.max(width * 0.16, 0.09), height: Math.max(height * 0.46, 0.24), depth: Math.max(depth * 1.08, 0.62) },
      scene,
    )
    const topShroud = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-top-shroud`,
      { width: Math.max(width * 0.86, 0.6), height: Math.max(height * 0.16, 0.1), depth: Math.max(depth * 0.72, 0.46) },
      scene,
    )
    const leftBrace = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-left-brace`,
      { width: Math.max(width * 0.14, 0.08), height: Math.max(height * 0.18, 0.1), depth: Math.max(depth * 1.12, 0.66) },
      scene,
    )
    const rightBrace = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-right-brace`,
      { width: Math.max(width * 0.14, 0.08), height: Math.max(height * 0.18, 0.1), depth: Math.max(depth * 1.12, 0.66) },
      scene,
    )

    belly.position.y = Math.max(height * 0.08, 0.08)
    leftTruss.position.set(-width * 0.5, Math.max(height * 0.34, 0.2), 0)
    rightTruss.position.set(width * 0.5, Math.max(height * 0.34, 0.2), 0)
    topShroud.position.y = Math.max(height * 0.58, 0.32)
    leftBrace.position.set(-width * 0.23, Math.max(height * 0.44, 0.26), 0)
    rightBrace.position.set(width * 0.23, Math.max(height * 0.44, 0.26), 0)
    leftBrace.rotation.z = 0.34
    rightBrace.rotation.z = -0.34

    attachMesh(belly, parent, material)
    attachMesh(leftTruss, parent, materials.trim)
    attachMesh(rightTruss, parent, materials.trim)
    attachMesh(topShroud, parent, material)
    attachMesh(leftBrace, parent, materials.warning)
    attachMesh(rightBrace, parent, materials.warning)

    return
  }

  if (partId.includes('Front') || partId.includes('Shield')) {
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

    return
  }

  if (partId.includes('Light')) {
    const plate = MeshBuilder.CreateBox(
      `${role}-${blockId}-light-armor-skin`,
      { width: Math.max(width * 0.94, 0.52), height: Math.max(height * 0.18, 0.1), depth: Math.max(depth * 0.92, 0.48) },
      scene,
    )

    attachMesh(plate, parent, material)

    for (let index = -1; index <= 1; index += 1) {
      createBoxDetail(
        scene,
        parent,
        materials.trim,
        `${role}-${blockId}-light-armor-rib-${index + 1}`,
        Math.max(width * 0.14, 0.07),
        Math.max(height * 0.08, 0.04),
        Math.max(depth * 0.84, 0.38),
        index * Math.max(width * 0.24, 0.13),
        Math.max(height * 0.16, 0.08),
        0,
      )
    }

    return
  }

  if (partId.includes('Heavy')) {
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

    return
  }

  if (partId.includes('Spiked')) {
    const plate = MeshBuilder.CreateBox(
      `${role}-${blockId}-spiked-armor-plate`,
      { width: Math.max(width * 0.94, 0.54), height: Math.max(height * 0.2, 0.12), depth: Math.max(depth * 0.94, 0.5) },
      scene,
    )

    attachMesh(plate, parent, material)

    for (let index = 0; index < 3; index += 1) {
      const spike = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-spiked-armor-tooth-${index}`,
        {
          height: Math.max(height * 0.46, 0.22),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.16, 0.09),
          tessellation: 10,
        },
        scene,
      )

      spike.rotation.x = Math.PI / 2
      spike.position.set((index - 1) * Math.max(width * 0.22, 0.13), Math.max(height * 0.26, 0.16), Math.max(depth * 0.38, 0.22))
      attachMesh(spike, parent, materials.warning)
    }

    return
  }

  if (partId.includes('Reactive')) {
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

    return
  }

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
