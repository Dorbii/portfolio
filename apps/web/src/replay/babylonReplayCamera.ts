import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { ArenaConfig } from '../../../../packages/schemas/src/index.js'
import { toBabylonVector } from './babylonSceneUtils'
import {
  BROADCAST_CAMERA_ALPHA,
  BROADCAST_CAMERA_BETA,
  calculateBroadcastFrameForBothBotsAndActiveEffect,
  calculateTeamFollowFrame,
  capBroadcastShakeForNoExcessiveShake,
} from './replayCameraFraming.js'
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
  const activePartDetach = findLatestReplayEffect(frame.effects, (effect) =>
    effect.kind === 'part_detach' && effect.age < 1.35,
  )
  const activeImpact = findLatestReplayEffect(frame.effects, (effect) => effect.kind === 'impact' && effect.age < 1.2)
  const activeAbility = findLatestReplayEffect(
    frame.effects,
    (effect) =>
      (effect.kind === 'laser_lance' || effect.kind === 'control_net' || effect.kind === 'drone_swarm') &&
      effect.age < 1.2,
  )
  const activeKnockout = findLatestReplayEffect(frame.effects, (effect) => effect.kind === 'knockout')

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

  if (preset === 'broadcast') {
    const broadcastFrame = calculateBroadcastFrameForBothBotsAndActiveEffect(
      frame,
      arena,
      getCameraAspectRatio(camera),
    )

    setCamera(
      camera,
      toBabylonVector(broadcastFrame.target),
      BROADCAST_CAMERA_ALPHA,
      BROADCAST_CAMERA_BETA,
      broadcastFrame.radius,
      frame.time,
      capBroadcastShakeForNoExcessiveShake(shake + knockBack),
    )

    return
  }

  const followFrame = calculateTeamFollowFrame(frame, arena, preset)
  setCamera(
    camera,
    toBabylonVector(followFrame.target),
    followFrame.alpha,
    followFrame.beta,
    followFrame.radius,
    frame.time,
    0,
  )
}

function getCameraAspectRatio(camera: ArcRotateCamera): number {
  const engine = camera.getScene().getEngine()
  const height = engine.getRenderHeight()

  if (height <= 0) {
    return 16 / 9
  }

  return engine.getRenderWidth() / height
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
  const desiredBeta = clampNumber(beta + Math.cos(time * 8) * shake * 0.03, 0.56, 1.26)
  const desiredRadius = Math.max(4.1, radius + shake * 0.8)
  const settle = shake > 0 ? 0.36 : 0.2

  camera.setTarget(Vector3.Lerp(camera.getTarget(), desiredTarget, settle))
  camera.alpha = lerpAngle(camera.alpha, desiredAlpha, settle)
  camera.beta = lerpNumber(camera.beta, desiredBeta, settle)
  camera.radius = lerpNumber(camera.radius, desiredRadius, settle)
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

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
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
