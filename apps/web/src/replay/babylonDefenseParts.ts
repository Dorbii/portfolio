import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import { attachMesh } from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'

export function createDefensePart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
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

  if (partId.includes('Front') || partId.includes('Shield')) {
    const brace = MeshBuilder.CreateBox(
      `${role}-${blockId}-front-brace`,
      { width: Math.max(width * 1.05, 0.55), height: Math.max(height * 0.2, 0.16), depth: Math.max(depth * 0.6, 0.3) },
      scene,
    )

    brace.position.z = Math.max(depth * 0.25, 0.2)
    attachMesh(plate, parent, material)
    attachMesh(upperShroud, parent, material)
    attachMesh(brace, parent, materials.trim)

    return
  }

  if (partId.includes('Light') || partId.includes('Reactive')) {
    for (let index = 0; index < 3; index += 1) {
      const spike = MeshBuilder.CreateBox(
        `${role}-${blockId}-def-spike-${index}`,
        {
          width: Math.max(width * 0.2, 0.11),
          height: Math.max(height * 0.9, 0.35),
          depth: Math.max(depth * 0.2, 0.11),
        },
        scene,
      )

      spike.position.set(Math.cos((Math.PI * 2 * index) / 3) * 0.16, Math.max(height * 0.42, 0.25), Math.sin((Math.PI * 2 * index) / 3) * 0.16)
      attachMesh(spike, parent, materials.warning)
    }
  }

  attachMesh(plate, parent, material)
  attachMesh(upperShroud, parent, material)
}
