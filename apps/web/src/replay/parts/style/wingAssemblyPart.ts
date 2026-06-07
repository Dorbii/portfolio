import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import type { TeamMaterialSet } from '../../rendering/materials'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail } from '../../rendering/meshHelpers'
import { createExtrudedPlateFromOutline } from './plateGeometry'

export function createWingAssemblyPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-wing-center-keel`, 0.34, 0.14, 0.76, 0, 0.18, 0)
  createBoxDetail(scene, parent, material, `${role}-${blockId}-wing-service-cover`, 0.24, 0.055, 0.48, 0, 0.31, 0)

  for (const side of [-1, 1]) {
    const wingPlate = createExtrudedPlateFromOutline(
      scene,
      `${role}-${blockId}-swept-wing-panel-${side}`,
      [
        [side * 0.12, -0.24],
        [side * 0.74, -0.38],
        [side * 0.94, -0.07],
        [side * 0.72, 0.28],
        [side * 0.24, 0.36],
        [side * 0.04, 0.12],
      ],
      0.045,
    )
    const hinge = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-wing-root-hinge-${side}`,
      { height: 0.42, diameter: 0.06, tessellation: 12 },
      scene,
    )
    const tipMarker = MeshBuilder.CreateSphere(
      `${role}-${blockId}-wingtip-marker-light-${side}`,
      { diameter: 0.055, segments: 10 },
      scene,
    )

    wingPlate.position.y = 0.3
    hinge.position.set(side * 0.18, 0.28, 0)
    hinge.rotation.x = Math.PI / 2
    tipMarker.position.set(side * 0.9, 0.34, -0.06)
    tipMarker.metadata = { kind: 'pulse', speed: 0.012 }

    attachMesh(wingPlate, parent, material)
    attachMesh(hinge, parent, materials.steel)
    attachMesh(tipMarker, parent, materials.light)

    for (let index = 0; index < 3; index += 1) {
      const rib = MeshBuilder.CreateBox(
        `${role}-${blockId}-wing-rib-${side}-${index}`,
        { width: 0.028, height: 0.035, depth: 0.48 - index * 0.07 },
        scene,
      )

      rib.position.set(side * (0.32 + index * 0.17), 0.34, 0.02 - index * 0.04)
      rib.rotation.y = side * -0.22
      attachMesh(rib, parent, materials.steel)
    }

    for (const z of [-0.22, 0.22]) {
      const spar = MeshBuilder.CreateBox(
        `${role}-${blockId}-wing-long-spar-${side}-${z > 0 ? 'rear' : 'front'}`,
        { width: 0.58, height: 0.035, depth: 0.028 },
        scene,
      )

      spar.position.set(side * 0.48, 0.37, z)
      spar.rotation.y = side * 0.16
      attachMesh(spar, parent, materials.trim)
    }
  }

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-wing-keel-fastener-${index + 1}`, 0.055, 0.025, 0.055, 0, 0.39, index * 0.18)
  }
}
