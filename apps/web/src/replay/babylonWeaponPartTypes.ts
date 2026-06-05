import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { TeamMaterialSet } from './babylonMaterials'

export type WeaponPartRenderArgs = {
  scene: Scene
  parent: TransformNode
  material: StandardMaterial
  role: TeamRole
  blockId: string
  partId: string
  width: number
  height: number
  depth: number
  materials: TeamMaterialSet
}

export type WeaponPartRenderer = (args: WeaponPartRenderArgs) => void
