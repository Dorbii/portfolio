import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { TeamMaterialSet } from './babylonMaterials'
import type {
  MobilityPartRenderArgs,
  MobilityPartRenderer,
} from './babylonMobilityPartTypes'
import {
  createSkidPlatePart,
  createSpringLegPart,
} from './babylonSpecialMobilityParts'
import { createTreadPart } from './babylonTreadParts'
import { createWheelPart } from './babylonWheelParts'

const SPECIAL_MOBILITY_RENDERERS: Record<string, MobilityPartRenderer | undefined> = {
  Leg_Spring: createSpringLegPart,
  Skid_Plate: createSkidPlatePart,
}

export function createMobilityPart(
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
  const args: MobilityPartRenderArgs = {
    scene,
    parent,
    material,
    role,
    blockId,
    partId,
    width,
    height,
    depth,
    materials,
  }
  const specialRenderer = SPECIAL_MOBILITY_RENDERERS[partId]

  if (specialRenderer) {
    specialRenderer(args)
    return
  }

  if (isTreadPart(partId)) {
    createTreadPart(args)
    return
  }

  createWheelPart(args)
}

function isTreadPart(partId: string): boolean {
  return partId.includes('Tread') || partId.includes('Tank')
}
