import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'

export type PartMotionAxis = 'x' | 'y' | 'z'
export type PartMotionKind = 'pulse' | 'roll' | 'smoke' | 'spin' | 'thrust'

type PartMotionBaseMetadata = {
  motionBasePosition?: [number, number, number]
  motionBaseRotation?: [number, number, number]
  motionBaseScaling?: [number, number, number]
  phase?: number
  speed?: number
}

type RotaryPartMotionMetadata = PartMotionBaseMetadata & {
  axis: PartMotionAxis
  kind: 'roll' | 'spin'
}

type ScalarPartMotionMetadata = PartMotionBaseMetadata & {
  axis?: PartMotionAxis
  kind?: Exclude<PartMotionKind, 'roll' | 'spin'>
}

export type PartMotionMetadata = RotaryPartMotionMetadata | ScalarPartMotionMetadata

const MOTION_SPEED_SCALE = 28

export function isPartMotionNode(node: unknown): node is TransformNode {
  if (!(node instanceof TransformNode)) {
    return false
  }

  const metadata = node.metadata as PartMotionMetadata | undefined

  return metadata?.kind === 'pulse'
    || metadata?.kind === 'roll'
    || metadata?.kind === 'smoke'
    || metadata?.kind === 'spin'
    || metadata?.kind === 'thrust'
}

export function applyPartMotion(
  node: TransformNode,
  elapsedSeconds: number,
  speedScale = 1,
): void {
  const metadata = node.metadata as PartMotionMetadata | undefined

  if (!metadata?.kind) {
    return
  }

  ensureMotionBase(node, metadata)

  if (isRotaryMotionMetadata(metadata)) {
    applyRotaryMotion(node, metadata, elapsedSeconds, speedScale)
    return
  }

  if (metadata.kind === 'smoke') {
    const basePosition = vectorFromTuple(metadata.motionBasePosition)
    const speed = metadata.speed ?? 0.04

    node.position.copyFrom(basePosition)
    node.position.y += Math.sin(elapsedSeconds * 9 + speed * 40 + (metadata.phase ?? 0)) * 0.08
    return
  }

  if (metadata.kind === 'thrust') {
    const pulse = 0.82 + Math.sin(elapsedSeconds * 18 + (metadata.phase ?? 0)) * 0.18
    const baseScaling = vectorFromTuple(metadata.motionBaseScaling)

    node.scaling.set(baseScaling.x, baseScaling.y * pulse, baseScaling.z)
    return
  }

  if (metadata.kind === 'pulse') {
    const speed = metadata.speed ?? 0.04
    const pulse = 1 + Math.sin(elapsedSeconds * 5 + (metadata.phase ?? 0)) * speed
    const baseScaling = vectorFromTuple(metadata.motionBaseScaling)

    node.scaling.set(baseScaling.x * pulse, baseScaling.y * pulse, baseScaling.z * pulse)
  }
}

function applyRotaryMotion(
  node: TransformNode,
  metadata: RotaryPartMotionMetadata,
  elapsedSeconds: number,
  speedScale: number,
): void {
  const baseRotation = vectorFromTuple(metadata.motionBaseRotation)
  const speed = metadata.speed ?? (metadata.kind === 'roll' ? 0.05 : 0.06)
  const rotation = elapsedSeconds * speed * speedScale * MOTION_SPEED_SCALE + (metadata.phase ?? 0)

  node.rotation.copyFrom(baseRotation)

  if (metadata.axis === 'x') {
    node.rotation.x += rotation
  } else if (metadata.axis === 'y') {
    node.rotation.y += rotation
  } else {
    node.rotation.z += rotation
  }
}

function isRotaryMotionMetadata(metadata: PartMotionMetadata): metadata is RotaryPartMotionMetadata {
  return (metadata.kind === 'spin' || metadata.kind === 'roll')
    && (metadata.axis === 'x' || metadata.axis === 'y' || metadata.axis === 'z')
}

function ensureMotionBase(node: TransformNode, metadata: PartMotionMetadata): void {
  if (!metadata.motionBaseRotation) {
    metadata.motionBaseRotation = [node.rotation.x, node.rotation.y, node.rotation.z]
  }

  if (!metadata.motionBasePosition) {
    metadata.motionBasePosition = [node.position.x, node.position.y, node.position.z]
  }

  if (!metadata.motionBaseScaling) {
    metadata.motionBaseScaling = [node.scaling.x, node.scaling.y, node.scaling.z]
  }
}

function vectorFromTuple(tuple: [number, number, number] | undefined): Vector3 {
  if (!tuple) {
    return Vector3.Zero()
  }

  return new Vector3(tuple[0], tuple[1], tuple[2])
}
