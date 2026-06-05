import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { ArenaConfig } from '../../../../packages/schemas/src/index.js'
import { toBabylonVector } from './babylonSceneUtils'
import type {
  CameraPreset,
  ReplayEffectState,
  ReplayVisualFrame,
} from './replayMapping'

export function updateCamera(
  camera: ArcRotateCamera,
  preset: CameraPreset,
  frame: ReplayVisualFrame,
  arena: ArenaConfig,
): void {
  const red = toBabylonVector(frame.bots.red.position)
  const blue = toBabylonVector(frame.bots.blue.position)
  const midpoint = Vector3.Center(red, blue)
  const activePartDetach = findLatestReplayEffect(frame.effects, (effect) =>
    effect.kind === 'part_detach' && effect.age < 1.35,
  )
  const activeImpact = findLatestReplayEffect(frame.effects, (effect) => effect.kind === 'impact' && effect.age < 1.2)
  const activeHazard = findLatestReplayEffect(frame.effects, (effect) => effect.kind === 'hazard' && effect.age < 0.9)
  const activeAbility = findLatestReplayEffect(
    frame.effects,
    (effect) =>
      (effect.kind === 'laser_lance' || effect.kind === 'control_net' || effect.kind === 'drone_swarm') &&
      effect.age < 1.2,
  )
  const activeKnockout = findLatestReplayEffect(frame.effects, (effect) => effect.kind === 'knockout')
  const target = activePartDetach
    ? toBabylonVector(activePartDetach.position)
    : activeImpact
    ? toBabylonVector([activeImpact.position[0], activeImpact.position[1], activeImpact.position[2]])
    : activeHazard
      ? toBabylonVector([activeHazard.position[0], activeHazard.position[1], activeHazard.position[2]])
      : activeAbility
        ? abilityCameraTarget(activeAbility)
      : midpoint

  const shake = activeImpact
    ? (1 - activeImpact.age / 1.2) * 0.5
    : activePartDetach
      ? activePartDetach.intensity * 0.24
    : activeKnockout
      ? 0.35
      : activeAbility
        ? activeAbility.intensity * 0.18
        : 0
  const knockoutPulse = activeKnockout?.kind === 'knockout' ? activeKnockout.age <= 1.6 : false
  const knockBack = knockoutPulse ? 0.24 : 0
  const arenaRadius = Math.max(arena.width, arena.height)

  if (preset === 'wide') {
    setCamera(
      camera,
      Vector3.Zero(),
      -Math.PI / 2.2,
      1.22,
      arenaRadius * 1.18,
      frame.time,
      shake + knockBack,
    )
  } else if (preset === 'broadcast') {
    setCamera(
      camera,
      Vector3.Center(midpoint, Vector3.Zero()),
      -Math.PI * 0.72,
      0.9,
      arenaRadius * 0.94,
      frame.time,
      shake + knockBack,
    )
  } else if (preset === 'impact') {
    setCamera(
      camera,
      target,
      -Math.PI * 0.62,
      0.79,
      Math.max(5.4, arenaRadius * 0.44),
      frame.time,
      shake + knockBack * 1.3 + (activePartDetach ? 0.1 : 0),
    )
  } else if (preset === 'cinematic') {
    setCamera(
      camera,
      activePartDetach ? target : activeImpact ? target : activeHazard ? target : midpoint,
      -Math.PI * 0.58,
      0.72,
      Math.max(6.2, arenaRadius * 0.52),
      frame.time,
      shake + 0.1,
    )
  } else if (preset === 'red_follow') {
    setCamera(camera, red, -Math.PI * 0.58, 1.08, 7.2, frame.time, shake * 0.7)
  } else if (preset === 'blue_follow') {
    setCamera(camera, blue, -Math.PI * 0.58, 1.08, 7.2, frame.time, shake * 0.7)
  } else {
    setCamera(camera, midpoint, -Math.PI * 0.65, 0.9, 8, frame.time, shake)
  }
}

function setCamera(
  camera: ArcRotateCamera,
  target: Vector3,
  alpha: number,
  beta: number,
  radius: number,
  time: number,
  shake: number,
): void {
  const desiredTarget = target.clone().add(
    new Vector3(
      Math.sin(time * 30) * shake,
      Math.sin(time * 23) * shake * 0.2,
      Math.cos(time * 30) * shake,
    ),
  )
  const desiredAlpha = alpha + Math.sin(time * 9) * shake * 0.05
  const desiredBeta = beta + Math.cos(time * 8) * shake * 0.03
  const desiredRadius = Math.max(4.1, radius + shake * 0.8)
  const settle = shake > 0 ? 0.36 : 0.2

  camera.setTarget(Vector3.Lerp(camera.getTarget(), desiredTarget, settle))
  camera.alpha = lerpAngle(camera.alpha, desiredAlpha, settle)
  camera.beta = lerpNumber(camera.beta, desiredBeta, settle)
  camera.radius = lerpNumber(camera.radius, desiredRadius, settle)
}

function abilityCameraTarget(effect: ReplayEffectState): Vector3 {
  if (!effect.endPosition) {
    return toBabylonVector(effect.position)
  }

  return Vector3.Center(toBabylonVector(effect.position), toBabylonVector(effect.endPosition))
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

function lerpNumber(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function lerpAngle(from: number, to: number, amount: number): number {
  let delta = to - from

  while (delta > Math.PI) {
    delta -= Math.PI * 2
  }

  while (delta < -Math.PI) {
    delta += Math.PI * 2
  }

  return from + delta * amount
}
