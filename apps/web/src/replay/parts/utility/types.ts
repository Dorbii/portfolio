import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import type { TeamMaterialSet } from '../../rendering/materials'

export interface UtilityPartRenderArgs {
  scene: Scene
  parent: TransformNode
  material: Material
  role: TeamRole
  blockId: string
  width: number
  height: number
  depth: number
  materials: TeamMaterialSet
}
