import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamMaterialSet } from '../../rendering/materials'
import { createCylinderBodyPart } from './cylinderBodyPart'
import { createHeavyBlockBodyPart } from './heavyBlockPart'
import { createLightFrameBodyPart } from './lightFramePart'
import { createRectangleLongBodyPart } from './rectangleLongPart'
import { createSolidBodyPart } from './solidBodyPart'
import type { BodyPartRenderArgs } from './types'
import { createWedgeBodyPart } from './wedgeBodyPart'

export function createBodyPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const args: BodyPartRenderArgs = { scene, parent, material, partId, width, height, depth, materials }

  if (partId === 'Body_Rectangle_Long') {
    createRectangleLongBodyPart(args)
    return
  }

  if (partId === 'Body_Light_Frame') {
    createLightFrameBodyPart(args)
    return
  }

  if (partId.includes('Cylinder')) {
    createCylinderBodyPart(args)
    return
  }

  if (partId.includes('Wedge')) {
    createWedgeBodyPart(args)
    return
  }

  if (partId.includes('Heavy')) {
    createHeavyBlockBodyPart(args)
    return
  }

  createSolidBodyPart(args)
}
