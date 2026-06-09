import type {
  BounceEvent,
  HazardTriggerEvent,
  MoveEvent,
  PlanStepRejectedEvent,
  PushEvent,
  RamEvent,
  ReplayEvent,
} from '../../replay/src/index.js'
import type { TeamRole, Vector3 } from '../../schemas/src/index.js'

export function createSubstepMoveEvent(input: {
  t: number
  substep: number
  bot: TeamRole
  from: Vector3
  to: Vector3
  forced?: boolean
  contactIntent?: boolean
}): MoveEvent {
  return {
    t: input.t,
    type: 'move',
    bot: input.bot,
    from: [...input.from],
    to: [...input.to],
    duration: 0.28,
    easing: input.forced ? 'ease_out' : 'linear',
    intent: input.forced ? 'forced' : 'advance',
    ...(input.contactIntent ? { contactIntent: true } : {}),
    substep: input.substep,
  }
}

export function createPushEvent(input: {
  t: number
  substep: number
  attacker: TeamRole
  defender: TeamRole
  from: Vector3
  to: Vector3
  reason: PushEvent['reason']
}): PushEvent {
  return {
    t: input.t,
    type: 'push',
    attacker: input.attacker,
    defender: input.defender,
    from: [...input.from],
    to: [...input.to],
    reason: input.reason,
    substep: input.substep,
  }
}

export function createRamEvent(input: {
  t: number
  substep: number
  attacker: TeamRole
  defender: TeamRole
  damage: number
  position: Vector3
  blockedBy?: RamEvent['blockedBy']
}): RamEvent {
  return {
    t: input.t,
    type: 'ram',
    attacker: input.attacker,
    defender: input.defender,
    damage: input.damage,
    position: [...input.position],
    ...(input.blockedBy ? { blockedBy: input.blockedBy } : {}),
    substep: input.substep,
  }
}

export function createBounceEvent(input: {
  t: number
  substep: number
  bot: TeamRole
  from: Vector3
  to: Vector3
  cause: BounceEvent['cause']
}): BounceEvent {
  return {
    t: input.t,
    type: 'bounce',
    bot: input.bot,
    from: [...input.from],
    to: [...input.to],
    cause: input.cause,
    substep: input.substep,
  }
}

export function createHazardTriggerEvent(input: {
  t: number
  substep: number
  hazard: string
  bot: TeamRole
  damage: number
  position: Vector3
  trigger: HazardTriggerEvent['trigger']
}): HazardTriggerEvent {
  return {
    t: input.t,
    type: 'hazard_trigger',
    hazard: input.hazard,
    bot: input.bot,
    damage: input.damage,
    position: [...input.position],
    trigger: input.trigger,
    substep: input.substep,
  }
}

export function createPlanStepRejectedEvent(input: {
  t: number
  substep: number
  bot: TeamRole
  stepIndex: number
  reason: string
}): PlanStepRejectedEvent {
  return {
    t: input.t,
    type: 'plan_step_rejected',
    bot: input.bot,
    stepIndex: input.stepIndex,
    reason: input.reason,
    substep: input.substep,
  }
}

export function appendEvent(events: ReplayEvent[], event: ReplayEvent): void {
  events.push(event)
}
