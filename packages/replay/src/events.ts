import type { MovementCommand, TeamRole, Vector3 } from '../../schemas/src/index.js'

export type AbilityName = 'laser_lance' | 'drone_swarm'
export type WeaponFireCue = 'deploy' | 'release'
export type MoveEasing = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'brake'
export type MoveIntent = 'advance' | 'retreat' | 'strafe' | 'circle' | 'turn' | 'forced'
export type WeaponFirePhase = 'wind_up' | 'deploy' | 'release' | 'recoil'

export type SpawnEvent = {
  t: number
  type: 'spawn'
  bot: TeamRole
  position: Vector3
  rotation: Vector3
}

export type MoveEvent = {
  t: number
  type: 'move'
  bot: TeamRole
  from: Vector3
  to: Vector3
  duration?: number
  easing?: MoveEasing
  command?: MovementCommand
  intent?: MoveIntent
  facing?: Vector3
  contactIntent?: boolean
}

export type WeaponFireEvent = {
  t: number
  type: 'weapon_fire'
  bot: TeamRole
  weaponSlot: 'weaponA' | 'weaponB'
  controlCue?: WeaponFireCue
  targetPosition?: Vector3
  sourceBlockId?: string
  sourcePartId?: string
  phase?: WeaponFirePhase
  style?: string
}

export type AbilityEvent = {
  t: number
  type: 'ability'
  bot: TeamRole
  ability: AbilityName
  weaponSlot?: 'weaponA' | 'weaponB'
  target?: TeamRole
  targetPosition?: Vector3
}

export type ImpactEvent = {
  t: number
  type: 'impact'
  attacker: TeamRole
  defender: TeamRole
  damage: number
  position: Vector3
}

export type DamageEvent = {
  t: number
  type: 'damage'
  bot: TeamRole
  amount: number
  remainingHealth: number
  blockId?: string
  partId?: string
  partRemainingHealth?: number
  partMaxHealth?: number
}

export type HazardEvent = {
  t: number
  type: 'hazard'
  hazard: string
  bot: TeamRole
  damage: number
  position: Vector3
}

export type PartDetachEvent = {
  t: number
  type: 'part_detach'
  bot: TeamRole
  blockId: string
  partId?: string
  position: Vector3
  sourcePosition?: Vector3
  impactPosition?: Vector3
  impulse?: Vector3
  angularImpulse?: Vector3
  fractureSeverity?: number
  damageCause?: string
}

export type KnockoutEvent = {
  t: number
  type: 'knockout'
  bot: TeamRole
  cause: string
}

export type ReplayEvent =
  | SpawnEvent
  | MoveEvent
  | WeaponFireEvent
  | AbilityEvent
  | ImpactEvent
  | DamageEvent
  | HazardEvent
  | PartDetachEvent
  | KnockoutEvent

export function compareReplayEvents(left: ReplayEvent, right: ReplayEvent): number {
  if (left.t !== right.t) {
    return left.t - right.t
  }

  if (left.type < right.type) {
    return -1
  }

  if (left.type > right.type) {
    return 1
  }

  return 0
}

export function sortReplayEvents(events: ReplayEvent[]): ReplayEvent[] {
  return [...events].sort(compareReplayEvents)
}
