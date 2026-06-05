import type { TeamRole, Vector3 } from '../../schemas/src/index.js'

export type AbilityName = 'laser_lance' | 'drone_swarm'
export type WeaponFireCue = 'deploy' | 'release'

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
}

export type WeaponFireEvent = {
  t: number
  type: 'weapon_fire'
  bot: TeamRole
  weaponSlot: 'weaponA' | 'weaponB'
  controlCue?: WeaponFireCue
  targetPosition?: Vector3
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
}

export type KnockoutEvent = {
  t: number
  type: 'knockout'
  bot: TeamRole
  cause: string
}

export type AwardEvent = {
  t: number
  type: 'award'
  team: TeamRole
  awardId: string
  gold: number
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
  | AwardEvent

export function sortReplayEvents(events: ReplayEvent[]): ReplayEvent[] {
  return [...events].sort((left, right) => {
    if (left.t !== right.t) {
      return left.t - right.t
    }

    return left.type.localeCompare(right.type)
  })
}
