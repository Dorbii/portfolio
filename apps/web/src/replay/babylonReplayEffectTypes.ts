import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { createBotNode } from './babylonPartRenderer'
import type { ReplayEffectState } from './replayMapping'
import type { BotVisualProfile } from './replayVisualProfile'

export type EffectMaterials = {
  controlNet: StandardMaterial
  damage: StandardMaterial
  debris: StandardMaterial
  hazard: StandardMaterial
  knockout: StandardMaterial
  laser: StandardMaterial
  laserGlow: StandardMaterial
  net: StandardMaterial
  partDetach: StandardMaterial
  smoke: StandardMaterial
  spark: StandardMaterial
  weapon: StandardMaterial
}

export type EffectCreateInput = {
  index: number
  materials: EffectMaterials
  scene: Scene
}

export type EffectUpdateInput = {
  bots?: Record<TeamRole, ReturnType<typeof createBotNode>>
  effect: ReplayEffectState
  mesh: Mesh
  profiles: Record<TeamRole, BotVisualProfile>
}

export type WeaponEffectPartMetadata = {
  weaponEffectPart?: 'muzzle' | 'net-hoop' | 'net-strand' | 'net-weight'
  baseX?: number
  baseY?: number
}

export type DroneEffectPartMetadata = {
  droneEffectPart?: 'pod' | 'rotor' | 'sensor' | 'scan' | 'trail'
  droneIndex?: number
}
