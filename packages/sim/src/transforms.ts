import type { OrientationBasis, Vector3 } from '../../schemas/src/index.js'

const EPSILON = 1e-12
const WORLD_RIGHT: Vector3 = [1, 0, 0]
const WORLD_UP: Vector3 = [0, 1, 0]
const WORLD_FORWARD: Vector3 = [0, 0, 1]

export function canonicalNumber(value: number): number {
  const rounded = Math.abs(value) < EPSILON ? 0 : Number(value.toFixed(12))

  return Object.is(rounded, -0) ? 0 : rounded
}

export function canonicalDegrees(value: number): number {
  const normalized = value % 360

  return canonicalNumber(normalized < 0 ? normalized + 360 : normalized)
}

export function canonicalUnit(value: number, wraps: boolean): number {
  if (wraps && value === 1) {
    return 0
  }

  return canonicalNumber(value)
}

export function addVectors(left: Vector3, right: Vector3): Vector3 {
  return canonicalVector([
    left[0] + right[0],
    left[1] + right[1],
    left[2] + right[2],
  ])
}

export function scaleVector(vector: Vector3, scalar: number): Vector3 {
  return canonicalVector([
    vector[0] * scalar,
    vector[1] * scalar,
    vector[2] * scalar,
  ])
}

export function dotVectors(left: Vector3, right: Vector3): number {
  return canonicalNumber(left[0] * right[0] + left[1] * right[1] + left[2] * right[2])
}

export function crossVectors(left: Vector3, right: Vector3): Vector3 {
  return canonicalVector([
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ])
}

export function vectorMagnitude(vector: Vector3): number {
  return Math.hypot(vector[0], vector[1], vector[2])
}

export function normalizeVector(vector: Vector3, fallback: Vector3 = WORLD_UP): Vector3 {
  const magnitude = vectorMagnitude(vector)

  if (magnitude <= EPSILON) {
    return canonicalVector(fallback)
  }

  return canonicalVector([
    vector[0] / magnitude,
    vector[1] / magnitude,
    vector[2] / magnitude,
  ])
}

export function rotateVectorAroundAxis(vector: Vector3, axis: Vector3, degrees: number): Vector3 {
  const normalizedAxis = normalizeVector(axis)
  const radians = degrees * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const axisDotVector = dotVectors(normalizedAxis, vector)
  const cross = crossVectors(normalizedAxis, vector)

  return canonicalVector([
    vector[0] * cos + cross[0] * sin + normalizedAxis[0] * axisDotVector * (1 - cos),
    vector[1] * cos + cross[1] * sin + normalizedAxis[1] * axisDotVector * (1 - cos),
    vector[2] * cos + cross[2] * sin + normalizedAxis[2] * axisDotVector * (1 - cos),
  ])
}

export function surfaceBasis(normal: Vector3, rightHint: Vector3, forwardHint: Vector3): OrientationBasis {
  const up = normalizeVector(normal, WORLD_UP)
  let right = rejectAxisComponent(rightHint, up)

  if (vectorMagnitude(right) <= EPSILON) {
    right = fallbackRightForNormal(up)
  }

  right = normalizeVector(right, WORLD_RIGHT)

  let forward = normalizeVector(crossVectors(right, up), WORLD_FORWARD)
  const requestedForward = normalizeVector(rejectAxisComponent(forwardHint, up), forward)

  if (dotVectors(forward, requestedForward) < 0) {
    right = scaleVector(right, -1)
    forward = scaleVector(forward, -1)
  }

  return canonicalBasis({ right, up, forward })
}

export function applyYawRollToBasis(
  basis: OrientationBasis,
  yawDegrees: number,
  rollDegrees: number,
): OrientationBasis {
  const yaw = canonicalDegrees(yawDegrees)
  const roll = canonicalDegrees(rollDegrees)
  const yawedRight = rotateVectorAroundAxis(basis.right, basis.up, yaw)
  const yawedForward = rotateVectorAroundAxis(basis.forward, basis.up, yaw)

  return canonicalBasis({
    right: rotateVectorAroundAxis(yawedRight, yawedForward, roll),
    up: rotateVectorAroundAxis(basis.up, yawedForward, roll),
    forward: yawedForward,
  })
}

export function canonicalVector(vector: Vector3): Vector3 {
  return [
    canonicalNumber(vector[0]),
    canonicalNumber(vector[1]),
    canonicalNumber(vector[2]),
  ]
}

export function canonicalBasis(basis: OrientationBasis): OrientationBasis {
  return {
    right: canonicalVector(basis.right),
    up: canonicalVector(basis.up),
    forward: canonicalVector(basis.forward),
  }
}

function rejectAxisComponent(vector: Vector3, axis: Vector3): Vector3 {
  return addVectors(vector, scaleVector(axis, -dotVectors(vector, axis)))
}

function fallbackRightForNormal(normal: Vector3): Vector3 {
  const crossWithForward = crossVectors(WORLD_FORWARD, normal)

  if (vectorMagnitude(crossWithForward) > EPSILON) {
    return crossWithForward
  }

  return crossVectors(WORLD_RIGHT, normal)
}
