import type {
  ArenaConfig,
  Vector3 as ReplayVector3,
} from '../../../../packages/schemas/src/index.js'
import type {
  ReplayEffectState,
  ReplayVisualFrame,
} from './replayMappingTypes.js'

export const BROADCAST_CAMERA_ALPHA = -Math.PI * 0.72
export const BROADCAST_CAMERA_BETA = 0.9
export const NO_EXCESSIVE_BROADCAST_SHAKE_LIMIT = 0.32

const DEFAULT_VIEWPORT_ASPECT = 16 / 9
const BROADCAST_VERTICAL_FOV = 0.8
const BROADCAST_BOT_VISIBILITY_PADDING = 2.2
const BROADCAST_ACTIVE_EFFECT_PADDING = 1.4
const BROADCAST_NARROW_VIEWPORT_PADDING_MULTIPLIER = 2.5
const BROADCAST_MIN_ARENA_RADIUS_MULTIPLIER = 0.48
const BROADCAST_MAX_ARENA_RADIUS_MULTIPLIER = 1.66
const BROADCAST_MIN_RADIUS = 10

type ActiveEffectRule = {
  kind: ReplayEffectState['kind']
  maxAge: number
}

export type BroadcastCameraFrame = {
  activeEffectFocusPoints: ReplayVector3[]
  focusPoints: ReplayVector3[]
  radius: number
  target: ReplayVector3
}

const ACTIVE_EFFECT_RULES: ActiveEffectRule[] = [
  { kind: 'part_detach', maxAge: 1.35 },
  { kind: 'impact', maxAge: 1.2 },
  { kind: 'hazard', maxAge: 0.9 },
  { kind: 'laser_lance', maxAge: 1.2 },
  { kind: 'control_net', maxAge: 1.2 },
  { kind: 'drone_swarm', maxAge: 1.2 },
]

export function calculateBroadcastFrameForBothBotsAndActiveEffect(
  frame: ReplayVisualFrame,
  arena: ArenaConfig,
  viewportAspect = DEFAULT_VIEWPORT_ASPECT,
): BroadcastCameraFrame {
  const activeEffect = findBroadcastFocusEffect(frame.effects)
  const activeEffectFocusPoints = activeEffect
    ? getActiveEffectFocusPoints(activeEffect)
    : []
  const focusPoints = [
    frame.bots.red.position,
    frame.bots.blue.position,
    ...activeEffectFocusPoints,
  ]
  const target = centerBounds(focusPoints)

  return {
    activeEffectFocusPoints,
    focusPoints,
    radius: calculateBroadcastRadius(focusPoints, target, arena, viewportAspect),
    target,
  }
}

export function capBroadcastShakeForNoExcessiveShake(shake: number): number {
  if (!Number.isFinite(shake) || shake <= 0) {
    return 0
  }

  return Math.min(shake, NO_EXCESSIVE_BROADCAST_SHAKE_LIMIT)
}

function findBroadcastFocusEffect(effects: ReplayEffectState[]): ReplayEffectState | undefined {
  for (const rule of ACTIVE_EFFECT_RULES) {
    const effect = findLatestReplayEffect(
      effects,
      (candidate) => candidate.kind === rule.kind && candidate.age < rule.maxAge,
    )

    if (effect) {
      return effect
    }
  }

  return findLatestReplayEffect(effects, (candidate) => candidate.kind === 'knockout')
}

function getActiveEffectFocusPoints(effect: ReplayEffectState): ReplayVector3[] {
  if (
    effect.kind === 'laser_lance' ||
    effect.kind === 'control_net' ||
    effect.kind === 'drone_swarm'
  ) {
    return effect.endPosition
      ? [effect.position, effect.endPosition]
      : [effect.position]
  }

  return [effect.position]
}

function calculateBroadcastRadius(
  focusPoints: ReplayVector3[],
  target: ReplayVector3,
  arena: ArenaConfig,
  viewportAspect: number,
): number {
  const arenaRadius = Math.max(arena.width, arena.height)
  const normalizedAspect = normalizeViewportAspect(viewportAspect)
  const horizontalFov = 2 * Math.atan(Math.tan(BROADCAST_VERTICAL_FOV / 2) * normalizedAspect)
  const extents = calculateCameraProjectedExtents(focusPoints, target)
  const padding = calculateBroadcastPadding(normalizedAspect, focusPoints.length)
  const horizontalRadius = (extents.halfRight + padding) / Math.tan(horizontalFov / 2)
  const verticalRadius = (extents.halfForward + padding) / Math.tan(BROADCAST_VERTICAL_FOV / 2)
  const minimumRadius = Math.max(
    BROADCAST_MIN_RADIUS,
    arenaRadius * BROADCAST_MIN_ARENA_RADIUS_MULTIPLIER,
  )
  const maximumRadius = arenaRadius * BROADCAST_MAX_ARENA_RADIUS_MULTIPLIER

  return clampNumber(
    Math.max(minimumRadius, horizontalRadius, verticalRadius),
    minimumRadius,
    maximumRadius,
  )
}

function calculateBroadcastPadding(normalizedAspect: number, focusPointCount: number): number {
  const activeEffectPadding = focusPointCount > 2 ? BROADCAST_ACTIVE_EFFECT_PADDING : 0
  const narrowViewportPadding =
    Math.max(0, DEFAULT_VIEWPORT_ASPECT / normalizedAspect - 1) *
    BROADCAST_NARROW_VIEWPORT_PADDING_MULTIPLIER

  return BROADCAST_BOT_VISIBILITY_PADDING + activeEffectPadding + narrowViewportPadding
}

function calculateCameraProjectedExtents(
  focusPoints: ReplayVector3[],
  target: ReplayVector3,
): { halfForward: number; halfRight: number } {
  const right = {
    x: Math.sin(BROADCAST_CAMERA_ALPHA),
    z: -Math.cos(BROADCAST_CAMERA_ALPHA),
  }
  const forward = {
    x: -Math.cos(BROADCAST_CAMERA_ALPHA),
    z: -Math.sin(BROADCAST_CAMERA_ALPHA),
  }
  let halfRight = 0
  let halfForward = 0

  for (const point of focusPoints) {
    const dx = point[0] - target[0]
    const dz = point[2] - target[2]

    halfRight = Math.max(halfRight, Math.abs(dx * right.x + dz * right.z))
    halfForward = Math.max(halfForward, Math.abs(dx * forward.x + dz * forward.z))
  }

  return { halfForward, halfRight }
}

function centerBounds(points: ReplayVector3[]): ReplayVector3 {
  const first = points[0] ?? [0, 0, 0]
  let minX = first[0]
  let maxX = first[0]
  let minY = first[1]
  let maxY = first[1]
  let minZ = first[2]
  let maxZ = first[2]

  for (const point of points.slice(1)) {
    minX = Math.min(minX, point[0])
    maxX = Math.max(maxX, point[0])
    minY = Math.min(minY, point[1])
    maxY = Math.max(maxY, point[1])
    minZ = Math.min(minZ, point[2])
    maxZ = Math.max(maxZ, point[2])
  }

  return [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  ]
}

function findLatestReplayEffect(
  effects: ReplayEffectState[],
  predicate: (effect: ReplayEffectState) => boolean,
): ReplayEffectState | undefined {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index]

    if (predicate(effect)) {
      return effect
    }
  }

  return undefined
}

function normalizeViewportAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    return DEFAULT_VIEWPORT_ASPECT
  }

  return Math.max(0.42, aspect)
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
