import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import type { TeamMaterialSet } from '../../rendering/materials'
import { createAiModulePart } from './aiModulePart'
import { createAnchorClampPart } from './anchorClampPart'
import { createEnergyCorePart } from './energyCorePart'
import { createGenericUtilityPart } from './genericUtilityPart'
import { createGyroStabilizerPart } from './gyroStabilizerPart'
import { createMagnetPart } from './magnetPart'

export function createUtilityPart(
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
  const args = { scene, parent, material, role, blockId, width, height, depth, materials }

  if (partId.includes('Gyro')) {
    createGyroStabilizerPart(args)
    return
  }

  if (partId.includes('EnergyCore')) {
    createEnergyCorePart(args)
    return
  }

  if (partId.includes('Magnet')) {
    createMagnetPart(args)
    return
  }

  if (partId.includes('AIModule')) {
    createAiModulePart(args)
    return
  }

  if (partId.includes('Anchor')) {
    createAnchorClampPart(args)
    return
  }

  createGenericUtilityPart(args, partId)
}
