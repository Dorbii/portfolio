import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import {
  attachMesh,
  createSolidBlock,
} from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'

export function createStylePart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  partId: string,
  materials: TeamMaterialSet,
): void {
  if (partId === 'Style_Flag') {
    createFlagPart(scene, parent, material, role, blockId)
    return
  }

  if (partId.includes('Wings')) {
    const body = MeshBuilder.CreateBox(
      `${role}-${blockId}-wings-body`,
      { width: 0.26, height: 0.16, depth: 0.96 },
      scene,
    )
    const left = MeshBuilder.CreateBox(
      `${role}-${blockId}-wing-l`,
      { width: 0.64, height: 0.14, depth: 0.56 },
      scene,
    )
    const right = MeshBuilder.CreateBox(
      `${role}-${blockId}-wing-r`,
      { width: 0.64, height: 0.14, depth: 0.56 },
      scene,
    )
    left.position.set(-0.45, 0.28, 0.01)
    right.position.set(0.45, 0.28, 0.01)
    left.rotation.z = 0.5
    right.rotation.z = -0.5
    attachMesh(body, parent, material)
    attachMesh(left, parent, materials.light)
    attachMesh(right, parent, materials.light)

    for (let side = -1; side <= 1; side += 2) {
      const spar = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-wing-spar-${side}`,
        { height: 0.78, diameter: 0.045, tessellation: 8 },
        scene,
      )

      spar.rotation.x = Math.PI / 2
      spar.rotation.z = side * 0.42
      spar.position.set(side * 0.34, 0.34, 0)
      attachMesh(spar, parent, materials.trim)
    }

    return
  }

  if (partId.includes('DragonHead')) {
    const skull = MeshBuilder.CreateBox(
      `${role}-${blockId}-dragon-head`,
      { width: 0.5, height: 0.32, depth: 0.52 },
      scene,
    )
    const jaw = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-jaw`,
      { height: 0.16, diameter: 0.42, tessellation: 12 },
      scene,
    )
    const snout = MeshBuilder.CreateBox(
      `${role}-${blockId}-dragon-snout`,
      { width: 0.32, height: 0.16, depth: 0.28 },
      scene,
    )
    const hornL = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-horn-l`,
      { height: 0.36, diameterTop: 0, diameterBottom: 0.09, tessellation: 12 },
      scene,
    )
    const hornR = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-horn-r`,
      { height: 0.36, diameterTop: 0, diameterBottom: 0.09, tessellation: 12 },
      scene,
    )
    jaw.rotation.z = Math.PI / 2
    jaw.position.set(0, -0.1, 0.16)
    snout.position.set(0, 0.02, 0.32)
    hornL.position.set(-0.18, 0.26, 0.01)
    hornR.position.set(0.18, 0.26, 0.01)
    attachMesh(skull, parent, material)
    attachMesh(snout, parent, material)
    attachMesh(jaw, parent, materials.trim)
    attachMesh(hornL, parent, materials.warning)
    attachMesh(hornR, parent, materials.warning)

    for (let side = -1; side <= 1; side += 2) {
      const eye = MeshBuilder.CreateSphere(
        `${role}-${blockId}-dragon-eye-${side}`,
        { diameter: 0.075, segments: 8 },
        scene,
      )

      eye.position.set(side * 0.16, 0.08, 0.48)
      attachMesh(eye, parent, materials.light)
    }

    return
  }

  if (partId.includes('Spikes')) {
    const plate = MeshBuilder.CreateBox(
      `${role}-${blockId}-spike-plate`,
      { width: 0.62, height: 0.08, depth: 0.62 },
      scene,
    )
    attachMesh(plate, parent, material)

    for (let index = 0; index < 4; index += 1) {
      const spike = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-spike-${index}`,
        { height: 0.3, diameterTop: 0, diameterBottom: 0.08, tessellation: 8 },
        scene,
      )
      spike.rotation.z = Math.PI / 2
      spike.position.set(
        (index % 2 === 0 ? -0.2 : 0.2) + (index > 1 ? 0 : 0),
        0.2,
        (index < 2 ? -0.2 : 0.2),
      )
      attachMesh(spike, parent, materials.warning)
    }
    return
  }

  if (partId.includes('Neon')) {
    const strip = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-strip`,
      { width: 0.68, height: 0.1, depth: 0.12 },
      scene,
    )
    const topRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-top-rail`,
      { width: 0.56, height: 0.07, depth: 0.1 },
      scene,
    )
    const leftRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-left-rail`,
      { width: 0.07, height: 0.24, depth: 0.1 },
      scene,
    )
    const rightRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-right-rail`,
      { width: 0.07, height: 0.24, depth: 0.1 },
      scene,
    )
    topRail.position.set(0, 0.33, 0)
    leftRail.position.set(-0.34, 0.22, 0)
    rightRail.position.set(0.34, 0.22, 0)
    attachMesh(strip, parent, material)
    attachMesh(topRail, parent, materials.light)
    attachMesh(leftRail, parent, materials.light)
    attachMesh(rightRail, parent, materials.light)

    return
  }

  if (partId.includes('Crown')) {
    const band = MeshBuilder.CreateTorus(
      `${role}-${blockId}-crown-band`,
      { diameter: 0.52, thickness: 0.12, tessellation: 18 },
      scene,
    )
    for (let index = 0; index < 3; index += 1) {
      const tooth = MeshBuilder.CreateBox(
        `${role}-${blockId}-crown-tooth-${index}`,
        { width: 0.09, height: 0.18, depth: 0.2 },
        scene,
      )
      tooth.position.set(-0.19 + index * 0.19, 0.14, 0)
      attachMesh(tooth, parent, materials.warning)
    }
    band.rotation.x = Math.PI / 2
    attachMesh(band, parent, material)

    return
  }

  if (partId.includes('TrashCan')) {
    const shell = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-trash-shell`,
      {
        height: 0.52,
        diameter: 0.36,
        tessellation: 12,
      },
      scene,
    )
    const lid = MeshBuilder.CreateBox(
      `${role}-${blockId}-trash-lid`,
      { width: 0.24, height: 0.08, depth: 0.46 },
      scene,
    )
    lid.position.set(0, 0.32, 0)
    shell.rotation.z = Math.PI / 2
    attachMesh(shell, parent, material)
    attachMesh(lid, parent, materials.trim)

    return
  }

  createSolidBlock(scene, parent, material, `${role}-${blockId}-style`, 0.5, 0.3, 0.5)
}

function createFlagPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
): void {
  const pole = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-pole`,
    { height: 0.9, diameter: 0.07, tessellation: 10 },
    scene,
  )
  const flag = MeshBuilder.CreatePlane(
    `${role}-${blockId}-flag`,
    { width: 0.46, height: 0.26 },
    scene,
  )

  pole.rotation.z = Math.PI / 2
  flag.rotation.z = Math.PI / 2
  pole.position.y = 0.15
  flag.position.set(0.24, 0.56, 0)

  attachMesh(pole, parent, material)
  attachMesh(flag, parent, material)
}
