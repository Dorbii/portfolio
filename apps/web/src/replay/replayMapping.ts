import type {
  MoveEasing,
  MoveEvent,
  ReplayEvent,
  ReplayTimeline,
} from '../../../../packages/replay/src/index.js'
import type { TeamRole, Vector3 } from '../../../../packages/schemas/src/index.js'
import {
  activeEffectEventsAt,
  compileReplayTimeline,
  isCompiledReplayTimeline,
  replayEventsAtOrBefore,
  type CompiledReplayTimeline,
} from './replayCompiledTimeline.js'
import { buildReplayEffects } from './replayEffectMapping.js'
import type {
  BotFrameState,
  IndexedReplayEvent,
  PartDetachMotionFrameState,
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
export { compileReplayTimeline }
export type { CompiledReplayTimeline }

const DEFAULT_MOVE_DURATION = 1
const MIN_MOVE_DURATION = 0.08
const MAX_MOVE_DURATION = 1.2
const DETACH_FLOOR_Y = 0.08
const DETACH_GRAVITY = 3.8
const DETACH_MAX_HORIZONTAL_IMPULSE = 3.2
const DETACH_MAX_VERTICAL_IMPULSE = 2.4
const DETACH_MAX_ANGULAR_IMPULSE = 3.8
const DETACH_MAX_SETTLE_TIME = 1.55
const DETACH_FADE_START = 4.2
const DETACH_FADE_DURATION = 1.4

const DEFAULT_BOT_STATE: Record<TeamRole, BotFrameState> = {
  red: {
    role: 'red',
    position: [-6, 0, 0],
    motion: createIdleMotion(),
    rotationY: Math.PI / 2,
    status: 'active',
  },
  blue: {
    role: 'blue',
    position: [6, 0, 0],
    motion: createIdleMotion(),
    rotationY: -Math.PI / 2,
    status: 'active',
  },
}

export function clampReplayTime(timeline: Pick<ReplayTimeline, 'duration'>, time: number): number {
  return Math.min(Math.max(time, 0), timeline.duration)
}

export function buildReplayFrame(
  timeline: ReplayTimeline | CompiledReplayTimeline,
  requestedTime: number,
): ReplayVisualFrame {
  const compiled = isCompiledReplayTimeline(timeline)
    ? timeline
    : compileReplayTimeline(timeline)
  const time = clampReplayTime(compiled, requestedTime)
  const bots = {
    red: resolveBotState(compiled.roleEvents.red, 'red', time),
    blue: resolveBotState(compiled.roleEvents.blue, 'blue', time),
  }
  const parts = {
    red: resolvePartStates(compiled.roleEvents.red, 'red', time),
    blue: resolvePartStates(compiled.roleEvents.blue, 'blue', time),
  }

  return {
    time,
    progress: compiled.duration > 0 ? time / compiled.duration : 0,
    bots,
    parts,
    effects: buildReplayEffects(
      activeEffectEventsAt(compiled, time),
      bots,
      time,
      (role, eventTime) => resolveBotState(compiled.roleEvents[role], role, eventTime),
    ),
    endState: resolveEndState(compiled.knockoutEvents, time),
  }
}

function resolveBotState(
  events: IndexedReplayEvent[],
  role: TeamRole,
  time: number,
): BotFrameState {
  let state = cloneBotState(DEFAULT_BOT_STATE[role])

  for (const { event } of replayEventsAtOrBefore(events, time)) {
    if (event.t > time) {
      break
    }

    if (event.type === 'spawn' && event.bot === role) {
      state = {
        ...state,
        motion: createIdleMotion(),
        position: event.position,
        rotationY: degreesToRadians(event.rotation[1]),
      }
    }

    if (event.type === 'move' && event.bot === role) {
      state = resolveMoveFrameState(state, event, time)
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

  return state
}

function resolveMoveFrameState(
  previousState: BotFrameState,
  event: MoveEvent,
  time: number,
): BotFrameState {
  const duration = resolveMoveDuration(event)
  const targetRotationY = headingForMoveFacing(event, previousState.rotationY)
  const rawProgress = clamp01((time - event.t) / duration)

  if (rawProgress >= 1) {
    return {
      ...previousState,
      motion: createIdleMotion(),
      position: event.to,
      rotationY: targetRotationY,
    }
  }

  const easedProgress = easeMoveProgress(event.easing, rawProgress)
  const turnProgress = easeInOut(Math.min(1, rawProgress * 1.15))
  const turnDelta = shortestAngleDelta(previousState.rotationY, targetRotationY)
  const movementHeading = headingForMove(event.from, event.to, targetRotationY)
  const speed = flatDistance(event.from, event.to) / duration

  return {
    ...previousState,
    motion: {
      contactIntensity: event.contactIntent ? easeInOut(rawProgress) : 0,
      drift: resolveMoveDrift(event, movementHeading, targetRotationY, rawProgress),
      easedProgress,
      lean: resolveMoveLean(event, speed, rawProgress),
      progress: rawProgress,
      speed: round(Math.min(8, speed)),
      turn: round(clamp(turnDelta / Math.PI, -1, 1) * (1 - rawProgress * 0.35)),
    },
    position: lerpVector(event.from, event.to, easedProgress),
    rotationY: lerpAngle(previousState.rotationY, targetRotationY, turnProgress),
  }
}

function resolveMoveDuration(event: MoveEvent): number {
  if (typeof event.duration !== 'number' || !Number.isFinite(event.duration)) {
    return DEFAULT_MOVE_DURATION
  }

  return clamp(event.duration, MIN_MOVE_DURATION, MAX_MOVE_DURATION)
}

function easeMoveProgress(easing: MoveEasing | undefined, progress: number): number {
  const clamped = clamp01(progress)

  switch (easing) {
    case 'ease_in':
      return round(clamped * clamped)
    case 'ease_out':
      return round(1 - (1 - clamped) * (1 - clamped))
    case 'ease_in_out':
      return easeInOut(clamped)
    case 'brake':
      return round(1 - Math.pow(1 - clamped, 3))
    case 'linear':
      return round(clamped)
    case undefined:
      return easeInOut(clamped)
  }
}

function headingForMoveFacing(event: MoveEvent, fallback: number): number {
  const facingHeading = headingForVector(event.facing)

  return facingHeading ?? headingForMove(event.from, event.to, fallback)
}

function headingForVector(vector: Vector3 | undefined): number | undefined {
  if (!vector) {
    return undefined
  }

  const [x, , z] = vector

  if (Math.abs(x) + Math.abs(z) < 0.001) {
    return undefined
  }

  return Math.atan2(x, z)
}

function resolveMoveDrift(
  event: MoveEvent,
  movementHeading: number,
  facingHeading: number,
  progress: number,
): number {
  const intentScale = event.intent === 'circle' ? 1 : event.intent === 'strafe' ? 0.85 : 0.35
  const lateral = clamp(shortestAngleDelta(facingHeading, movementHeading) / (Math.PI / 2), -1, 1)
  const peak = Math.sin(Math.PI * clamp01(progress))

  return round(lateral * intentScale * peak)
}

function resolveMoveLean(event: MoveEvent, speed: number, progress: number): number {
  const direction = event.intent === 'retreat' ? -1 : 1
  const peak = 0.55 + Math.sin(Math.PI * clamp01(progress)) * 0.45
  const contactBoost = event.contactIntent ? 1.25 : 1

  return round(clamp(speed * 0.025 * direction * peak * contactBoost, -0.18, 0.18))
}

function flatDistance(from: Vector3, to: Vector3): number {
  return Math.hypot(to[0] - from[0], to[2] - from[2])
}

function lerpAngle(from: number, to: number, progress: number): number {
  return from + shortestAngleDelta(from, to) * clamp01(progress)
}

function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

function resolvePartStates(
  events: IndexedReplayEvent[],
  role: TeamRole,
  time: number,
): Record<string, PartFrameState> {
  const parts: Record<string, PartFrameState> = {}

  for (const { event } of replayEventsAtOrBefore(events, time)) {
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
        detachPosition: cloneVector(event.position),
        sourcePosition: cloneOptionalVector(event.sourcePosition),
        impactPosition: cloneOptionalVector(event.impactPosition),
        impulse: cloneOptionalVector(event.impulse),
        angularImpulse: cloneOptionalVector(event.angularImpulse),
        fractureSeverity: normalizeSeverity(event.fractureSeverity),
        damageCause: event.damageCause,
        detachMotion: resolveDetachMotion(event, time),
      }
    }
  }

  return parts
}

function resolveDetachMotion(
  event: Extract<ReplayEvent, { type: 'part_detach' }>,
  time: number,
): PartDetachMotionFrameState {
  const age = round(Math.max(0, time - event.t))
  const originPosition = cloneVector(event.position)
  const fractureSeverity = normalizeSeverity(event.fractureSeverity)
  const impulse = resolveDetachImpulse(event, fractureSeverity)
  const angularImpulse = resolveAngularImpulse(event, fractureSeverity)
  const settleTime = resolveDetachSettleTime(originPosition, impulse)
  const activeAge = Math.min(age, settleTime)
  const settled = age >= settleTime
  const horizontalDamping = 1 - Math.min(0.42, activeAge * 0.18)
  const rawPosition: Vector3 = [
    originPosition[0] + impulse[0] * activeAge * horizontalDamping,
    originPosition[1] + impulse[1] * activeAge - 0.5 * DETACH_GRAVITY * activeAge * activeAge,
    originPosition[2] + impulse[2] * activeAge * horizontalDamping,
  ]
  const position: Vector3 = [
    round(rawPosition[0]),
    round(Math.max(DETACH_FLOOR_Y, rawPosition[1])),
    round(rawPosition[2]),
  ]
  const spinAge = Math.min(age, settleTime + 0.35)
  const settleDrag = settled ? Math.max(0.15, 1 - (age - settleTime) * 1.9) : 1
  const rotation: Vector3 = [
    round(angularImpulse[0] * spinAge * settleDrag),
    round(angularImpulse[1] * spinAge * settleDrag),
    round(angularImpulse[2] * spinAge * settleDrag),
  ]
  const fade = round(clamp01(1 - Math.max(0, age - DETACH_FADE_START) / DETACH_FADE_DURATION))

  return {
    age,
    originPosition,
    position,
    rotation,
    impulse,
    angularImpulse,
    fractureSeverity,
    settled,
    fade,
  }
}

function resolveDetachImpulse(
  event: Extract<ReplayEvent, { type: 'part_detach' }>,
  fractureSeverity: number,
): Vector3 {
  const fallbackDirection = detachFallbackDirection(event)
  const supplied = sanitizeVector(event.impulse)

  if (supplied) {
    return [
      round(clamp(supplied[0], -DETACH_MAX_HORIZONTAL_IMPULSE, DETACH_MAX_HORIZONTAL_IMPULSE)),
      round(clamp(supplied[1], 0.18, DETACH_MAX_VERTICAL_IMPULSE)),
      round(clamp(supplied[2], -DETACH_MAX_HORIZONTAL_IMPULSE, DETACH_MAX_HORIZONTAL_IMPULSE)),
    ]
  }

  const fallbackScale = 0.85 + fractureSeverity * 1.2

  return [
    round(fallbackDirection[0] * fallbackScale),
    round(0.42 + fractureSeverity * 0.52),
    round(fallbackDirection[2] * fallbackScale),
  ]
}

function resolveAngularImpulse(
  event: Extract<ReplayEvent, { type: 'part_detach' }>,
  fractureSeverity: number,
): Vector3 {
  const supplied = sanitizeVector(event.angularImpulse)

  if (supplied) {
    return supplied.map((value) =>
      round(clamp(value, -DETACH_MAX_ANGULAR_IMPULSE, DETACH_MAX_ANGULAR_IMPULSE)),
    ) as Vector3
  }

  const angle = deterministicUnit(`${event.bot}-${event.blockId}-spin`) * Math.PI * 2
  const spinScale = 1.2 + fractureSeverity * 1.8

  return [
    round(Math.sin(angle) * spinScale),
    round((event.bot === 'red' ? 1 : -1) * (0.85 + fractureSeverity)),
    round(Math.cos(angle) * spinScale),
  ]
}

function resolveDetachSettleTime(originPosition: Vector3, impulse: Vector3): number {
  const yFromFloor = Math.max(0, originPosition[1] - DETACH_FLOOR_Y)
  const discriminant = impulse[1] * impulse[1] + 2 * DETACH_GRAVITY * yFromFloor
  const fallTime = (impulse[1] + Math.sqrt(Math.max(0, discriminant))) / DETACH_GRAVITY

  return round(clamp(fallTime, 0.38, DETACH_MAX_SETTLE_TIME))
}

function detachFallbackDirection(event: Extract<ReplayEvent, { type: 'part_detach' }>): Vector3 {
  const source = sanitizeVector(event.sourcePosition)
  const impact = sanitizeVector(event.impactPosition) ?? sanitizeVector(event.position)

  if (source && impact) {
    const dx = impact[0] - source[0]
    const dz = impact[2] - source[2]
    const length = Math.hypot(dx, dz)

    if (length > 0.001) {
      return [round(dx / length), 0, round(dz / length)]
    }
  }

  const angle = deterministicUnit(`${event.bot}-${event.blockId}-detach`) * Math.PI * 2
  const roleBias = event.bot === 'red' ? 0.35 : -0.35
  const x = Math.cos(angle) + roleBias
  const z = Math.sin(angle)
  const length = Math.max(0.001, Math.hypot(x, z))

  return [round(x / length), 0, round(z / length)]
}

function normalizeSeverity(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0.55
  }

  return round(clamp(value, 0, 1))
}

function cloneOptionalVector(vector: Vector3 | undefined): Vector3 | undefined {
  return vector ? cloneVector(vector) : undefined
}

function cloneVector(vector: Vector3): Vector3 {
  return [
    round(finiteOr(vector[0], 0)),
    round(finiteOr(vector[1], 0)),
    round(finiteOr(vector[2], 0)),
  ]
}

function sanitizeVector(vector: Vector3 | undefined): Vector3 | undefined {
  if (!vector || vector.length !== 3 || vector.some((value) => !Number.isFinite(value))) {
    return undefined
  }

  return cloneVector(vector)
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function deterministicUnit(value: string): number {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return (hash % 10000) / 10000
}

function resolveEndState(events: IndexedReplayEvent[], time: number): ReplayEndState | undefined {
  const knockout = findLastEvent(
    replayEventsAtOrBefore(events, time),
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

function findLastEvent(
  events: IndexedReplayEvent[],
  predicate: (event: ReplayEvent) => boolean,
): ReplayEvent | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const { event } = events[index]

    if (predicate(event)) {
      return event
    }
  }

  return undefined
}

function cloneBotState(state: BotFrameState): BotFrameState {
  return {
    ...state,
    motion: { ...state.motion },
    position: [...state.position],
  }
}

function createIdleMotion(): BotFrameState['motion'] {
  return {
    contactIntensity: 0,
    drift: 0,
    easedProgress: 1,
    lean: 0,
    progress: 1,
    speed: 0,
    turn: 0,
  }
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
