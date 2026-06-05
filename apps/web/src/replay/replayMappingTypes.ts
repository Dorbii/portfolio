import type { TeamRole, Vector3 } from '../../../../packages/schemas/src/index.js'

export type CameraPreset = 'wide' | 'broadcast' | 'red_follow' | 'blue_follow' | 'impact' | 'cinematic'

export type BotFrameState = {
  role: TeamRole
  position: Vector3
  rotationY: number
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
