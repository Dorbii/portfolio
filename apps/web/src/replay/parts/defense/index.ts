import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import type { TeamMaterialSet } from '../../rendering/materials'
import { createCageArmorPart } from './cageArmorPart'
import { createDefaultArmorPart } from './defaultArmorPart'
import { createFrontArmorPart } from './frontArmorPart'
import { createHeavyArmorPart } from './heavyArmorPart'
import { createLightArmorPart } from './lightArmorPart'
import { createReactiveArmorPart } from './reactiveArmorPart'
import { createSpikedArmorPart } from './spikedArmorPart'
import {
  createCornerGuardArmorPart,
  createFlexPanelArmorPart,
  createHeavyWedgeArmorPart,
  createRailArmorPart,
} from './specialArmorParts'
import type { DefensePartRenderArgs } from './types'

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
  const args: DefensePartRenderArgs = { scene, parent, material, role, blockId, partId, width, height, depth, materials }

  if (partId.includes('Cage')) {
    createCageArmorPart(args)
    return
  }

  if (partId.includes('Front') || partId.includes('Shield')) {
    createFrontArmorPart(args)
    return
  }

  if (partId.includes('Rail')) {
    createRailArmorPart(args)
    return
  }

  if (partId.includes('CornerGuard')) {
    createCornerGuardArmorPart(args)
    return
  }

  if (partId.includes('FlexPanel')) {
    createFlexPanelArmorPart(args)
    return
  }

  if (partId.includes('HeavyWedge')) {
    createHeavyWedgeArmorPart(args)
    return
  }

  if (partId.includes('Light')) {
    createLightArmorPart(args)
    return
  }

  if (partId.includes('Heavy')) {
    createHeavyArmorPart(args)
    return
  }

  if (partId.includes('Spiked')) {
    createSpikedArmorPart(args)
    return
  }

  if (partId.includes('Reactive')) {
    createReactiveArmorPart(args)
    return
  }

  createDefaultArmorPart(args)
}
