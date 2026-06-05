import type { Vector3 } from '../../../../packages/schemas/src/index.js'

export function lerpVector(from: Vector3, to: Vector3, progress: number): Vector3 {
  const clamped = Math.min(Math.max(progress, 0), 1)

  return [
    round(from[0] + (to[0] - from[0]) * clamped),
    round(from[1] + (to[1] - from[1]) * clamped),
    round(from[2] + (to[2] - from[2]) * clamped),
  ]
}

export function headingForMove(from: Vector3, to: Vector3, fallback: number): number {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]

  if (Math.abs(dx) + Math.abs(dz) < 0.001) {
    return fallback
  }

  return Math.atan2(dx, dz)
}

export function forwardPoint(position: Vector3, rotationY: number, distance: number): Vector3 {
  return [
    round(position[0] + Math.sin(rotationY) * distance),
    position[1],
    round(position[2] + Math.cos(rotationY) * distance),
  ]
}

export function easeInOut(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1)

  return clamped * clamped * (3 - 2 * clamped)
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
