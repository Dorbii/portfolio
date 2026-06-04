import type {
  MoveEvent,
  ReplayEvent,
  ReplayTimeline,
} from '../../../../packages/replay/src/index.js'
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

const MOVE_DURATION = 1
const WEAPON_WINDOW = 0.75
const CONTROL_CUE_WINDOW = 1.15
const IMPACT_WINDOW = 1.35
const DEBRIS_WINDOW = 1.9
const DAMAGE_MARKER_WINDOW = 1.4
const HAZARD_WINDOW = 0.9
const LASER_LANCE_WINDOW = 0.95

const DEFAULT_BOT_STATE: Record<TeamRole, BotFrameState> = {
  red: {
    role: 'red',
    position: [-6, 0, 0],
    rotationY: Math.PI / 2,
    status: 'active',
  },
  blue: {
    role: 'blue',
    position: [6, 0, 0],
    rotationY: -Math.PI / 2,
    status: 'active',
  },
}

export function clampReplayTime(timeline: ReplayTimeline, time: number): number {
  return Math.min(Math.max(time, 0), timeline.duration)
}

export function buildReplayFrame(
  timeline: ReplayTimeline,
  requestedTime: number,
): ReplayVisualFrame {
  const time = clampReplayTime(timeline, requestedTime)
  const events = sortedEvents(timeline.events)
  const bots = {
    red: resolveBotState(events, 'red', time),
    blue: resolveBotState(events, 'blue', time),
  }
  const parts = {
    red: resolvePartStates(events, 'red', time),
    blue: resolvePartStates(events, 'blue', time),
  }

  return {
    time,
    progress: timeline.duration > 0 ? time / timeline.duration : 0,
    bots,
    parts,
    effects: buildEffects(events, bots, time),
    endState: resolveEndState(events, time),
  }
}

function sortedEvents(events: ReplayEvent[]): ReplayEvent[] {
  return [...events].sort((left, right) => {
    if (left.t !== right.t) {
      return left.t - right.t
    }

    return left.type.localeCompare(right.type)
  })
}

function resolveBotState(
  events: ReplayEvent[],
  role: TeamRole,
  time: number,
): BotFrameState {
  let state = cloneBotState(DEFAULT_BOT_STATE[role])

  for (const event of events) {
    if (event.t > time) {
      break
    }

    if (event.type === 'spawn' && event.bot === role) {
      state = {
        ...state,
        position: event.position,
        rotationY: degreesToRadians(event.rotation[1]),
      }
    }

    if (event.type === 'move' && event.bot === role) {
      state = {
        ...state,
        position: event.to,
        rotationY: headingForMove(event.from, event.to, state.rotationY),
      }
    }

    if (event.type === 'damage' && event.bot === role) {
      state = {
        ...state,
        health: event.remainingHealth,
      }
    }

    if (event.type === 'knockout' && event.bot === role) {
      state = {
        ...state,
        status: 'knocked_out',
      }
    }
  }

  const activeMove = findActiveMove(events, role, time)

  if (activeMove) {
    const progress = (time - activeMove.t) / MOVE_DURATION
    state = {
      ...state,
      position: lerpVector(activeMove.from, activeMove.to, easeInOut(progress)),
      rotationY: headingForMove(activeMove.from, activeMove.to, state.rotationY),
    }
  }

  return state
}

function resolvePartStates(
  events: ReplayEvent[],
  role: TeamRole,
  time: number,
): Record<string, PartFrameState> {
  const parts: Record<string, PartFrameState> = {}

  for (const event of events) {
    if (event.t > time) {
      break
    }

    if (event.type === 'damage' && event.bot === role && event.blockId) {
      parts[event.blockId] = {
        ...parts[event.blockId],
        blockId: event.blockId,
        partId: event.partId ?? parts[event.blockId]?.partId,
        health: event.partRemainingHealth,
        maxHealth: event.partMaxHealth,
        status: parts[event.blockId]?.status ?? 'attached',
      }
    }

    if (event.type === 'part_detach' && event.bot === role) {
      parts[event.blockId] = {
        ...parts[event.blockId],
        blockId: event.blockId,
        partId: event.partId ?? parts[event.blockId]?.partId,
        health: 0,
        status: 'detached',
        detachTime: event.t,
        detachPosition: event.position,
      }
    }
  }

  return parts
}

function buildEffects(
  events: ReplayEvent[],
  bots: Record<TeamRole, BotFrameState>,
  time: number,
): ReplayEffectState[] {
  const effects: ReplayEffectState[] = []

  events.forEach((event, index) => {
    if (event.type === 'weapon_fire') {
      const age = time - event.t
      const isControlDeploy = event.controlCue === 'deploy'
      const duration = isControlDeploy ? CONTROL_CUE_WINDOW : WEAPON_WINDOW

      if (age >= 0 && age <= duration) {
        const firingBot = resolveBotState(events, event.bot, event.t)
        const intensity = Math.max(0, 1 - age / duration)

        effects.push({
          id: `${index}-weapon-${event.bot}`,
          kind: 'weapon_fire',
          position: firingBot.position,
          rotationY: firingBot.rotationY,
          age,
          intensity,
          team: event.bot,
          label: isControlDeploy ? `${event.weaponSlot}-deploy` : event.weaponSlot,
        })

        if (isControlDeploy) {
          effects.push({
            id: `${index}-weapon-control-${event.bot}`,
            kind: 'control_net',
            position: firingBot.position,
            rotationY: firingBot.rotationY,
            age,
            intensity,
            team: event.bot,
            endPosition:
              event.targetPosition ?? forwardPoint(firingBot.position, firingBot.rotationY, 3.4),
            label: 'control_net',
          })
        }
      }
    }

    if (event.type === 'ability' && event.ability === 'laser_lance') {
      const age = time - event.t
      const firingBot = resolveBotState(events, event.bot, event.t)
      const endPosition = event.targetPosition ?? forwardPoint(firingBot.position, firingBot.rotationY, 5.6)
      const rotationY = headingForMove(firingBot.position, endPosition, firingBot.rotationY)

      if (age >= 0 && age <= LASER_LANCE_WINDOW) {
        effects.push({
          id: `${index}-laser-${event.bot}`,
          kind: 'laser_lance',
          position: firingBot.position,
          rotationY,
          age,
          intensity: Math.max(0, 1 - age / LASER_LANCE_WINDOW),
          team: event.bot,
          endPosition,
          label: event.ability,
        })
      }
    }

    if (event.type === 'impact') {
      const age = time - event.t

      if (age >= 0 && age <= IMPACT_WINDOW) {
        effects.push({
          id: `${index}-impact`,
          kind: 'impact',
          position: event.position,
          age,
          intensity: 1 - age / IMPACT_WINDOW,
          team: event.attacker,
          damage: event.damage,
        })
        effects.push({
          id: `${index}-smoke`,
          kind: 'smoke',
          position: [event.position[0], event.position[1] + 0.35, event.position[2]],
          age,
          intensity: Math.max(0, 1 - age / IMPACT_WINDOW),
          team: event.defender,
        })
      }

      if (age >= 0 && age <= DEBRIS_WINDOW) {
        for (let debrisIndex = 0; debrisIndex < 3; debrisIndex += 1) {
          effects.push({
            id: `${index}-debris-${debrisIndex}`,
            kind: 'debris',
            position: event.position,
            age,
            intensity: Math.max(0, 1 - age / DEBRIS_WINDOW),
            team: event.defender,
            damage: event.damage,
          })
        }
      }
    }

    if (event.type === 'damage') {
      const age = time - event.t

      if (age >= 0 && age <= DAMAGE_MARKER_WINDOW) {
        effects.push({
          id: `${index}-damage-${event.bot}`,
          kind: 'damage_marker',
          position: bots[event.bot].position,
          age,
          intensity: Math.max(0, 1 - age / DAMAGE_MARKER_WINDOW),
          team: event.bot,
          damage: event.amount,
        })
      }
    }

    if (event.type === 'hazard') {
      const age = time - event.t

      if (age >= 0 && age <= HAZARD_WINDOW) {
        effects.push({
          id: `${index}-hazard-${event.hazard}`,
          kind: 'hazard',
          position: event.position,
          age,
          intensity: 1 - age / HAZARD_WINDOW,
          team: event.bot,
          damage: event.damage,
          label: event.hazard,
        })
        effects.push({
          id: `${index}-hazard-damage-${event.bot}`,
          kind: 'damage_marker',
          position: event.position,
          age,
          intensity: 1 - age / HAZARD_WINDOW,
          team: event.bot,
          damage: event.damage,
          label: event.hazard,
        })
      }
    }

    if (event.type === 'knockout' && event.t <= time) {
      effects.push({
        id: `${index}-knockout-${event.bot}`,
        kind: 'knockout',
        position: bots[event.bot].position,
        age: time - event.t,
        intensity: 1,
        team: event.bot,
        label: event.cause,
      })
    }

    if (event.type === 'part_detach') {
      const age = time - event.t

      if (age >= 0 && age <= DEBRIS_WINDOW) {
        effects.push({
          id: `${index}-part-detach-${event.blockId}`,
          kind: 'debris',
          position: event.position,
          age,
          intensity: Math.max(0, 1 - age / DEBRIS_WINDOW),
          team: event.bot,
          damage: 18,
          label: event.blockId,
        })
      }
    }
  })

  return effects
}

function resolveEndState(events: ReplayEvent[], time: number): ReplayEndState | undefined {
  const knockout = findLastEvent(
    events,
    (event) => event.type === 'knockout' && event.t <= time,
  )

  if (!knockout || knockout.type !== 'knockout') {
    return undefined
  }

  return {
    knockedOut: knockout.bot,
    winner: knockout.bot === 'red' ? 'blue' : 'red',
    cause: knockout.cause,
  }
}

function findActiveMove(
  events: ReplayEvent[],
  role: TeamRole,
  time: number,
): MoveEvent | undefined {
  const event = findLastEvent(
    events,
    (event) =>
      event.type === 'move' &&
      event.bot === role &&
      event.t <= time &&
      time <= event.t + MOVE_DURATION,
  )

  return event?.type === 'move' ? event : undefined
}

function findLastEvent(
  events: ReplayEvent[],
  predicate: (event: ReplayEvent) => boolean,
): ReplayEvent | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]

    if (predicate(event)) {
      return event
    }
  }

  return undefined
}

function cloneBotState(state: BotFrameState): BotFrameState {
  return {
    ...state,
    position: [...state.position],
  }
}

function lerpVector(from: Vector3, to: Vector3, progress: number): Vector3 {
  const clamped = Math.min(Math.max(progress, 0), 1)

  return [
    round(from[0] + (to[0] - from[0]) * clamped),
    round(from[1] + (to[1] - from[1]) * clamped),
    round(from[2] + (to[2] - from[2]) * clamped),
  ]
}

function headingForMove(from: Vector3, to: Vector3, fallback: number): number {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]

  if (Math.abs(dx) + Math.abs(dz) < 0.001) {
    return fallback
  }

  return Math.atan2(dx, dz)
}

function forwardPoint(position: Vector3, rotationY: number, distance: number): Vector3 {
  return [
    round(position[0] + Math.sin(rotationY) * distance),
    position[1],
    round(position[2] + Math.cos(rotationY) * distance),
  ]
}

function easeInOut(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1)

  return clamped * clamped * (3 - 2 * clamped)
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
