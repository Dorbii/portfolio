import type {
  MoveEvent,
  ReplayEvent,
  ReplayTimeline,
} from '../../../../packages/replay/src/index.js'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import { buildReplayEffects } from './replayEffectMapping.js'
import type {
  BotFrameState,
  PartFrameState,
  ReplayEndState,
  ReplayVisualFrame,
} from './replayMappingTypes.js'
import {
  degreesToRadians,
  easeInOut,
  headingForMove,
  lerpVector,
} from './replayVectorMath.js'

export type {
  BotFrameState,
  CameraPreset,
  PartFrameState,
  ReplayEffectKind,
  ReplayEffectState,
  ReplayEndState,
  ReplayVisualFrame,
} from './replayMappingTypes.js'

const MOVE_DURATION = 1

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
    effects: buildReplayEffects(events, bots, time, (role, eventTime) =>
      resolveBotState(events, role, eventTime),
    ),
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
