import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamMaterialSet } from '../../rendering/materials'

export type BodyPartRenderArgs = {
  scene: Scene
  parent: TransformNode
  material: Material
  partId: string
  width: number
  height: number
  depth: number
  materials: TeamMaterialSet
}
