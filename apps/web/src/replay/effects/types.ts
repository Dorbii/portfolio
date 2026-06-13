import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../packages/schemas/src/index.js'
import type { createBotNode } from '../parts'
import type { ReplayEffectState } from '../replayMapping'
import type { BotVisualProfile } from '../replayVisualProfile'

export type EffectMaterials = {
  controlNet: StandardMaterial
  damage: StandardMaterial
  debris: StandardMaterial
  fire: StandardMaterial
  fireGlow: StandardMaterial
  hazard: StandardMaterial
  knockout: StandardMaterial
  laser: StandardMaterial
  laserGlow: StandardMaterial
  net: StandardMaterial
  partDetach: StandardMaterial
  smoke: StandardMaterial
  spark: StandardMaterial
  stability: StandardMaterial
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
  weaponEffectPart?: 'muzzle' | 'net-strand' | 'net-weight' | 'tracer-core' | 'tracer-glow' | 'tracer-tip'
  baseX?: number
  baseY?: number
}

export type ImpactEffectPartMetadata = {
  impactEffectPart?: 'core' | 'damage-core' | 'damage-spark' | 'spark' | 'status-bar'
  baseAngle?: number
  baseDistance?: number
  baseLift?: number
  spin?: number
}

export type DroneEffectPartMetadata = {
  droneEffectPart?: 'pod' | 'rotor' | 'sensor' | 'scan' | 'trail'
  droneIndex?: number
}
