import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import type { TeamMaterialSet } from '../../rendering/materials'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail, createRampBlock } from '../../rendering/meshHelpers'
import { createExtrudedPlateFromOutline, createExtrudedVerticalPlateFromOutline } from './plateGeometry'

export function createDragonHeadPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  const neckMount = createRampBlock(scene, `${role}-${blockId}-dragon-neck-armor-base`, 0.5, 0.18, 0.44, 0.06)
  const skullTop = createExtrudedPlateFromOutline(
    scene,
    `${role}-${blockId}-dragon-armored-skull`,
    [
      [-0.22, -0.26],
      [0.22, -0.22],
      [0.28, 0.08],
      [0.2, 0.42],
      [0.08, 0.68],
      [-0.08, 0.68],
      [-0.2, 0.42],
      [-0.28, 0.08],
    ],
    0.055,
  )
  const snoutTop = createExtrudedPlateFromOutline(
    scene,
    `${role}-${blockId}-dragon-tapered-snout`,
    [
      [-0.14, 0.3],
      [0.14, 0.3],
      [0.1, 0.76],
      [0.02, 0.88],
      [-0.02, 0.88],
      [-0.1, 0.76],
    ],
    0.048,
  )

  neckMount.position.set(0, 0.12, -0.15)
  skullTop.position.y = 0.48
  snoutTop.position.y = 0.39
  attachMesh(neckMount, parent, materials.trim)
  attachMesh(skullTop, parent, materials.trim)
  attachMesh(snoutTop, parent, material)

  createBoxDetail(scene, parent, material, `${role}-${blockId}-dragon-team-scale-top`, 0.2, 0.035, 0.2, 0, 0.56, 0.08)
  createBoxDetail(scene, parent, material, `${role}-${blockId}-dragon-team-scale-snout`, 0.16, 0.03, 0.2, 0, 0.45, 0.5)
  createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-dragon-upper-jaw-rail`, 0.28, 0.045, 0.42, 0, 0.25, 0.6)
  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-dragon-lower-jaw-guard`, 0.24, 0.045, 0.44, 0, 0.12, 0.56)
  createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-dragon-brow-armored`, 0.34, 0.045, 0.055, 0, 0.43, 0.43)
  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-dragon-top-service-plate`, 0.22, 0.032, 0.22, 0, 0.61, -0.05)

  for (const side of [-1, 1]) {
    const sidePlate = createExtrudedVerticalPlateFromOutline(
      scene,
      `${role}-${blockId}-dragon-cyber-side-profile-${side}`,
      [
        [-0.3, 0.12],
        [-0.18, 0.38],
        [0.02, 0.52],
        [0.36, 0.5],
        [0.78, 0.34],
        [0.88, 0.23],
        [0.58, 0.2],
        [0.34, 0.08],
        [0.02, 0.08],
      ],
      0.035,
    )
    const lowerJawPlate = createExtrudedVerticalPlateFromOutline(
      scene,
      `${role}-${blockId}-dragon-open-lower-jaw-plate-${side}`,
      [
        [0.24, 0.08],
        [0.72, 0.11],
        [0.86, 0.18],
        [0.52, 0.03],
        [0.18, 0.03],
      ],
      0.028,
    )
    const eye = MeshBuilder.CreateBox(
      `${role}-${blockId}-dragon-glowing-eye-slit-${side}`,
      { width: 0.028, height: 0.036, depth: 0.15 },
      scene,
    )
    const horn = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-swept-horn-${side}`,
      { height: 0.48, diameterTop: 0.012, diameterBottom: 0.078, tessellation: 10 },
      scene,
    )
    const sideFin = createExtrudedVerticalPlateFromOutline(
      scene,
      `${role}-${blockId}-dragon-rear-swept-fin-${side}`,
      [
        [-0.22, 0.4],
        [0.0, 0.72],
        [0.2, 0.48],
      ],
      0.026,
    )
    const hornSocket = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-horn-socket-${side}`,
      { height: 0.045, diameter: 0.1, tessellation: 12 },
      scene,
    )
    const sideGear = MeshBuilder.CreateTorus(
      `${role}-${blockId}-dragon-side-gear-ring-${side}`,
      { diameter: 0.16, thickness: 0.018, tessellation: 16 },
      scene,
    )
    const nostril = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-nostril-port-${side}`,
      { height: 0.085, diameter: 0.026, tessellation: 8 },
      scene,
    )

    sidePlate.position.x = side * 0.2
    lowerJawPlate.position.x = side * 0.17
    eye.position.set(side * 0.22, 0.36, 0.42)
    eye.rotation.y = side * 0.18
    horn.position.set(side * 0.16, 0.67, -0.08)
    horn.rotation.x = -0.72
    horn.rotation.z = side * 0.2
    sideFin.position.x = side * 0.27
    sideFin.position.z = -0.14
    hornSocket.position.set(side * 0.16, 0.51, -0.02)
    sideGear.position.set(side * 0.25, 0.28, -0.08)
    sideGear.rotation.y = Math.PI / 2
    nostril.position.set(side * 0.09, 0.25, 0.78)
    nostril.rotation.x = Math.PI / 2

    attachMesh(sidePlate, parent, materials.trim)
    attachMesh(lowerJawPlate, parent, materials.trim)
    attachMesh(eye, parent, materials.light)
    attachMesh(horn, parent, materials.steel)
    attachMesh(sideFin, parent, material)
    attachMesh(hornSocket, parent, material)
    attachMesh(sideGear, parent, materials.steel)
    attachMesh(nostril, parent, materials.steel)
  }

  for (let index = -3; index <= 3; index += 1) {
    const tooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-jaw-tooth-${index + 3}`,
      { height: 0.085, diameterTop: 0, diameterBottom: 0.026, tessellation: 7 },
      scene,
    )
    const lowerTooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-lower-jaw-tooth-${index + 3}`,
      { height: 0.07, diameterTop: 0, diameterBottom: 0.022, tessellation: 7 },
      scene,
    )

    tooth.position.set(index * 0.035, 0.18, 0.72 - Math.abs(index) * 0.018)
    tooth.rotation.x = Math.PI
    lowerTooth.position.set(index * 0.032, 0.11, 0.58 - Math.abs(index) * 0.014)
    attachMesh(tooth, parent, materials.steel)
    attachMesh(lowerTooth, parent, materials.steel)
  }

  for (let index = 0; index < 4; index += 1) {
    const crest = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-spine-crest-${index}`,
      { height: 0.14 - index * 0.02, diameterTop: 0, diameterBottom: 0.046, tessellation: 7 },
      scene,
    )

    crest.position.set(0, 0.66 - index * 0.045, -0.24 + index * 0.12)
    crest.rotation.x = -0.36
    attachMesh(crest, parent, materials.steel)
  }

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-dragon-neck-fastener-${index + 1}`, 0.045, 0.025, 0.045, index * 0.13, 0.23, -0.18)
  }
}
