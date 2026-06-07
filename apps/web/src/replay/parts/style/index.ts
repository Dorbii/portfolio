import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import {
  attachMesh,
  createSolidBlock,
} from '../../rendering/meshHelpers'
import type { TeamMaterialSet } from '../../rendering/materials'
import { createCrownPart } from './crownPart'
import { createDragonHeadPart } from './dragonHeadPart'
import { createFlagPart } from './flagPart'
import { createNeonPart } from './neonPart'
import { createStyleSpikesPart } from './spikesPart'
import { createTrashCanPart } from './trashCanPart'
import { createWingAssemblyPart } from './wingAssemblyPart'
import {
  createAntennaPart,
  createBladeAntennaPart,
  createCowboyHatPart,
  createHornsPart,
  createTailPart,
  createTopHatPart,
} from './accessoryParts'

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
    createFlagPart(scene, parent, material, role, blockId, materials)
    return
  }

  if (partId.includes('BladeAntenna')) {
    createBladeAntennaPart({ scene, parent, material, role, blockId, materials })
    return
  }

  if (partId.includes('Antenna')) {
    createAntennaPart({ scene, parent, material, role, blockId, materials })
    return
  }

  if (partId.includes('Horns')) {
    createHornsPart({ scene, parent, material, role, blockId, materials })
    return
  }

  if (partId.includes('Tail')) {
    createTailPart({ scene, parent, material, role, blockId, materials })
    return
  }

  if (partId.includes('TopHat')) {
    createTopHatPart({ scene, parent, material, role, blockId, materials })
    return
  }

  if (partId.includes('CowboyHat')) {
    createCowboyHatPart({ scene, parent, material, role, blockId, materials })
    return
  }

  if (partId.includes('Wings')) {
    createWingAssemblyPart(scene, parent, material, role, blockId, materials)
    return
  }

  if (partId.includes('DragonHead')) {
    createDragonHeadPart(scene, parent, material, role, blockId, materials)
    return
  }

  if (partId === 'Style_Spikes') {
    createStyleSpikesPart(scene, parent, material, role, blockId, materials)
    return
  }

  if (partId === 'Style_Neon') {
    createNeonPart(scene, parent, material, role, blockId, materials)
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
    createCrownPart(scene, parent, material, role, blockId, materials)
    return
  }

  if (partId === 'Style_TrashCan') {
    createTrashCanPart(scene, parent, material, role, blockId, materials)
    return
  }

  createSolidBlock(scene, parent, material, `${role}-${blockId}-style`, 0.5, 0.3, 0.5)
}
