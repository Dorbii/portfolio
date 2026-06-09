import type { MovementCommand, TeamRole, Vector3 } from '../../schemas/src/index.js'

// CODEX_INTENT: carry combat turn identity separately from replay render time.
// CODEX_RISK: interface
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export type CombatTurnEventMetadata = {
  turn?: number
  substep?: number
}

export type AbilityName = 'laser_lance' | 'drone_swarm' | 'fire_breath'
export type BotStabilityEventType =
  | 'bot_destabilized'
  | 'bot_tipped'
  | 'bot_flipped'
  | 'bot_self_righted'
  | 'bot_immobilized'
export type WeaponFireCue = 'deploy' | 'release'
export type WeaponFireMode = 'direct' | 'arc' | 'sweep' | 'contact'
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

export type MoveEvent = CombatTurnEventMetadata & {
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

export type WeaponFireEvent = CombatTurnEventMetadata & {
  t: number
  type: 'weapon_fire'
  bot: TeamRole
  weaponSlot: 'weaponA' | 'weaponB'
  controlCue?: WeaponFireCue
  targetPosition?: Vector3
  sourceBlockId?: string
  sourcePartId?: string
  phase?: WeaponFirePhase
  fireMode?: WeaponFireMode
  style?: string
}

export type AbilityEvent = CombatTurnEventMetadata & {
  t: number
  type: 'ability'
  bot: TeamRole
  ability: AbilityName
  weaponSlot?: 'weaponA' | 'weaponB'
  target?: TeamRole
  targetPosition?: Vector3
}

export type ImpactEvent = CombatTurnEventMetadata & {
  t: number
  type: 'impact'
  attacker: TeamRole
  defender: TeamRole
  damage: number
  position: Vector3
}

export type DamageEvent = CombatTurnEventMetadata & {
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

export type HazardEvent = CombatTurnEventMetadata & {
  t: number
  type: 'hazard'
  hazard: string
  bot: TeamRole
  damage: number
  position: Vector3
}

export type PushEvent = CombatTurnEventMetadata & {
  t: number
  type: 'push'
  attacker: TeamRole
  defender: TeamRole
  from: Vector3
  to: Vector3
  reason: 'mass' | 'drive' | 'momentum' | 'tie_break'
  substep?: number
}

export type RamEvent = CombatTurnEventMetadata & {
  t: number
  type: 'ram'
  attacker: TeamRole
  defender: TeamRole
  damage: number
  position: Vector3
  blockedBy?: 'wall' | 'obstacle' | 'bot'
  substep?: number
}

export type BounceEvent = CombatTurnEventMetadata & {
  t: number
  type: 'bounce'
  bot: TeamRole
  from: Vector3
  to: Vector3
  cause: 'blocked_push' | 'wall' | 'collision'
  substep?: number
}

export type HazardTriggerEvent = CombatTurnEventMetadata & {
  t: number
  type: 'hazard_trigger'
  hazard: string
  bot: TeamRole
  damage: number
  position: Vector3
  trigger: 'voluntary_move' | 'forced_push' | 'bounce'
  substep?: number
}

export type PlanStepRejectedEvent = CombatTurnEventMetadata & {
  t: number
  type: 'plan_step_rejected'
  bot: TeamRole
  stepIndex: number
  reason: string
  substep?: number
}

export type BotStabilityEvent = CombatTurnEventMetadata & {
  t: number
  type: BotStabilityEventType
  bot: TeamRole
  cause?: string
  direction?: Vector3
  duration?: number
  severity?: number
}

export type PartDetachEvent = CombatTurnEventMetadata & {
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

export type KnockoutEvent = CombatTurnEventMetadata & {
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
  | PushEvent
  | RamEvent
  | BounceEvent
  | HazardTriggerEvent
  | PlanStepRejectedEvent
  | BotStabilityEvent
  | PartDetachEvent
  | KnockoutEvent

const REPLAY_EVENT_TYPE_RANK: Record<ReplayEvent['type'], number> = {
  spawn: 0,
  move: 10,
  weapon_fire: 20,
  ability: 30,
  impact: 40,
  ram: 42,
  push: 44,
  bounce: 46,
  damage: 50,
  hazard: 60,
  hazard_trigger: 61,
  plan_step_rejected: 63,
  bot_destabilized: 64,
  bot_tipped: 66,
  bot_flipped: 68,
  bot_self_righted: 70,
  bot_immobilized: 72,
  part_detach: 70,
  knockout: 80,
}

const REPLAY_EVENT_BOT_RANK: Record<TeamRole, number> = {
  red: 0,
  blue: 1,
}

export function compareReplayEvents(left: ReplayEvent, right: ReplayEvent): number {
  if (left.t !== right.t) {
    return left.t - right.t
  }

  const substepRank = replayEventSubstep(left) - replayEventSubstep(right)

  if (substepRank !== 0) {
    return substepRank
  }

  const typeRank = REPLAY_EVENT_TYPE_RANK[left.type] - REPLAY_EVENT_TYPE_RANK[right.type]

  if (typeRank !== 0) {
    return typeRank
  }

  return replayEventBotRank(left) - replayEventBotRank(right)
}

export function sortReplayEvents(events: ReplayEvent[]): ReplayEvent[] {
  return [...events].sort(compareReplayEvents)
}

function replayEventSubstep(event: ReplayEvent): number {
  return 'substep' in event && typeof event.substep === 'number'
    ? event.substep
    : Number.MAX_SAFE_INTEGER
}

function replayEventBotRank(event: ReplayEvent): number {
  if ('bot' in event) {
    return REPLAY_EVENT_BOT_RANK[event.bot]
  }

  if ('attacker' in event) {
    return REPLAY_EVENT_BOT_RANK[event.attacker]
  }

  return Number.MAX_SAFE_INTEGER
}
