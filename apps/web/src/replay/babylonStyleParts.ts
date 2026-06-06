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

    for (let side = -1; side <= 1; side += 2) {
      for (let index = 0; index < 3; index += 1) {
        const tooth = MeshBuilder.CreateCylinder(
          `${role}-${blockId}-dragon-tooth-${side}-${index}`,
          { height: 0.12, diameterTop: 0, diameterBottom: 0.035, tessellation: 8 },
          scene,
        )

        tooth.rotation.x = Math.PI / 2
        tooth.position.set(side * (0.08 + index * 0.055), -0.18, 0.39)
        attachMesh(tooth, parent, materials.steel)
      }
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

  if (partId.includes('LightBar')) {
    const housing = MeshBuilder.CreateBox(
      `${role}-${blockId}-lightbar-housing`,
      { width: 0.78, height: 0.12, depth: 0.2 },
      scene,
    )
    const backRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-lightbar-back-rail`,
      { width: 0.82, height: 0.08, depth: 0.22 },
      scene,
    )
    const frontGlow = MeshBuilder.CreateBox(
      `${role}-${blockId}-lightbar-front-glow`,
      { width: 0.68, height: 0.055, depth: 0.035 },
      scene,
    )

    housing.position.y = 0.2
    backRail.position.y = 0.12
    frontGlow.position.set(0, 0.22, 0.12)
    attachMesh(housing, parent, materials.trim)
    attachMesh(backRail, parent, material)
    attachMesh(frontGlow, parent, materials.light)

    for (let index = 0; index < 6; index += 1) {
      const lens = MeshBuilder.CreateBox(
        `${role}-${blockId}-lightbar-lens-${index}`,
        { width: 0.085, height: 0.085, depth: 0.04 },
        scene,
      )
      const divider = MeshBuilder.CreateBox(
        `${role}-${blockId}-lightbar-divider-${index}`,
        { width: 0.018, height: 0.11, depth: 0.055 },
        scene,
      )

      lens.position.set(-0.29 + index * 0.116, 0.25, 0.105)
      divider.position.set(-0.345 + index * 0.116, 0.24, 0.105)
      attachMesh(lens, parent, materials.light)
      attachMesh(divider, parent, materials.steel)
    }

    for (let side = -1; side <= 1; side += 2) {
      const bracket = MeshBuilder.CreateBox(
        `${role}-${blockId}-lightbar-mount-bracket-${side}`,
        { width: 0.08, height: 0.18, depth: 0.16 },
        scene,
      )

      bracket.position.set(side * 0.46, 0.14, 0)
      attachMesh(bracket, parent, materials.steel)
    }

    return
  }

  if (partId.includes('Crown')) {
    const band = MeshBuilder.CreateTorus(
      `${role}-${blockId}-crown-band`,
      { diameter: 0.52, thickness: 0.12, tessellation: 18 },
      scene,
    )
    for (let index = 0; index < 7; index += 1) {
      const angle = (Math.PI * 2 * index) / 7
      const tooth = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-crown-tooth-${index}`,
        {
          height: index % 2 === 0 ? 0.28 : 0.2,
          diameterTop: 0.035,
          diameterBottom: 0.09,
          tessellation: 8,
        },
        scene,
      )
      const jewel = MeshBuilder.CreateSphere(
        `${role}-${blockId}-crown-jewel-${index}`,
        { diameter: 0.055, segments: 8 },
        scene,
      )

      tooth.position.set(Math.sin(angle) * 0.27, 0.22, Math.cos(angle) * 0.27)
      tooth.rotation.z = -Math.sin(angle) * 0.22
      jewel.position.set(Math.sin(angle) * 0.29, 0.38 + (index % 2 === 0 ? 0.08 : 0), Math.cos(angle) * 0.29)
      attachMesh(tooth, parent, materials.warning)
      attachMesh(jewel, parent, materials.light)
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
    const handle = MeshBuilder.CreateTorus(
      `${role}-${blockId}-trash-handle`,
      { diameter: 0.18, thickness: 0.025, tessellation: 12 },
      scene,
    )
    lid.position.set(0, 0.32, 0)
    handle.position.set(0, 0.42, 0)
    handle.rotation.x = Math.PI / 2
    shell.rotation.z = Math.PI / 2
    attachMesh(shell, parent, material)
    attachMesh(lid, parent, materials.trim)
    attachMesh(handle, parent, materials.steel)

    for (let index = -2; index <= 2; index += 1) {
      const rib = MeshBuilder.CreateBox(
        `${role}-${blockId}-trash-rib-${index + 2}`,
        { width: 0.025, height: 0.54, depth: 0.035 },
        scene,
      )

      rib.position.set(index * 0.07, 0.02, 0.19)
      attachMesh(rib, parent, materials.trim)
    }

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
  const base = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-base`,
    { height: 0.08, diameter: 0.22, tessellation: 12 },
    scene,
  )
  const crossbar = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-crossbar`,
    { height: 0.48, diameter: 0.025, tessellation: 8 },
    scene,
  )
  const emblem = MeshBuilder.CreateBox(
    `${role}-${blockId}-flag-emblem`,
    { width: 0.16, height: 0.045, depth: 0.035 },
    scene,
  )

  pole.rotation.z = Math.PI / 2
  flag.rotation.z = Math.PI / 2
  base.rotation.z = Math.PI / 2
  crossbar.rotation.z = Math.PI / 2
  pole.position.y = 0.15
  flag.position.set(0.24, 0.56, 0)
  crossbar.position.set(0.24, 0.66, 0)
  emblem.position.set(0.24, 0.56, 0.02)

  attachMesh(base, parent, material)
  attachMesh(pole, parent, material)
  attachMesh(flag, parent, material)
  attachMesh(crossbar, parent, material)
  attachMesh(emblem, parent, material)
}
