import type { WeaponFirePhase } from '../../../../packages/replay/src/index.js'
import type { ReplayEvent } from '../../../../packages/replay/src/index.js'
import type { TeamRole, Vector3 } from '../../../../packages/schemas/src/index.js'

export type IndexedReplayEvent = {
  event: ReplayEvent
  sequence: number
}

export type { CameraPreset } from './camera/presets.js'

export type BotFrameState = {
  role: TeamRole
  position: Vector3
  rotationY: number
  motion: {
    contactIntensity: number
    drift: number
    easedProgress: number
    lean: number
    progress: number
    speed: number
    turn: number
  }
  health?: number
  status: 'active' | 'knocked_out'
}

export type PartFrameState = {
  blockId: string
  partId?: string
  health?: number
  maxHealth?: number
  status: 'attached' | 'detached'
  detachTime?: number
  detachPosition?: Vector3
  sourcePosition?: Vector3
  impactPosition?: Vector3
  impulse?: Vector3
  angularImpulse?: Vector3
  fractureSeverity?: number
  damageCause?: string
  detachMotion?: PartDetachMotionFrameState
}

export type PartDetachMotionFrameState = {
  age: number
  originPosition: Vector3
  position: Vector3
  rotation: Vector3
  impulse: Vector3
  angularImpulse: Vector3
  fractureSeverity: number
  settled: boolean
  fade: number
}

export type ReplayEffectKind =
  | 'weapon_fire'
  | 'control_net'
  | 'laser_lance'
  | 'drone_swarm'
  | 'part_detach'
  | 'impact'
  | 'debris'
  | 'damage_marker'
  | 'smoke'
  | 'hazard'
  | 'knockout'

export type ReplayEffectState = {
  id: string
  kind: ReplayEffectKind
  position: Vector3
  rotationY?: number
  age: number
  intensity: number
  team?: TeamRole
  damage?: number
  endPosition?: Vector3
  label?: string
  sourceBlockId?: string
  sourcePartId?: string
  weaponPhase?: WeaponFirePhase
  weaponStyle?: string
}

export type ReplayEndState = {
  knockedOut?: TeamRole
  winner?: TeamRole
  cause?: string
}

export type ReplayVisualFrame = {
  time: number
  progress: number
  bots: Record<TeamRole, BotFrameState>
  parts: Record<TeamRole, Record<string, PartFrameState>>
  effects: ReplayEffectState[]
  endState?: ReplayEndState
}
