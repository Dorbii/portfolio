import type {
  ArenaConfig,
  MachineMovementCapability,
  MovementCommand,
  TeamRole,
  Vector3,
} from '../../schemas/src/index.js'
import { clampPositionToArena } from './arenaTopology.js'
import { movementDelta } from './gridMovement.js'
import { normalizeVector } from './transforms.js'

type ResolveMachineMovementInput = {
  role: TeamRole
  position: Vector3
  command?: MovementCommand
  arena: ArenaConfig
  capabilities: readonly MachineMovementCapability[]
  movementMultiplier?: number
}

export type ResolvedMachineMovement = {
  supported: boolean
  from: Vector3
  to: Vector3
}

// CODEX_INTENT: make machine action generation and resolution share the same movement capability axis predicate.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export function resolveMachineMovement(input: ResolveMachineMovementInput): ResolvedMachineMovement {
  const command = input.command
  const from = input.position

  if (!command || command === 'brake') {
    return { supported: true, from, to: from }
  }

  const matchingCapabilities = input.capabilities.filter((capability) =>
    machineMovementCommandSupported(input.role, capability, command),
  )

  if (matchingCapabilities.length === 0) {
    return { supported: false, from, to: from }
  }

  const commandVector = commandPlanarVector(input.role, command)

  if (!commandVector) {
    return { supported: false, from, to: from }
  }

  const bestCapability = matchingCapabilities
    .slice()
    .sort((left, right) =>
      right.moveBudget - left.moveBudget ||
      right.traction - left.traction ||
      left.partInstanceId.localeCompare(right.partInstanceId),
    )[0]
  const dashMultiplier = command === 'dash_forward' || command === 'dash_backward' ? 1.55 : 1
  const speed = Math.max(
    0.35,
    Math.min(1.85, 0.35 + bestCapability.moveBudget / 9 + bestCapability.traction / 24),
  ) * dashMultiplier * (input.movementMultiplier ?? 1)
  const to = clampPositionToArena(input.arena, [
    from[0] + commandVector[0] * speed,
    0,
    from[2] + commandVector[2] * speed,
  ])

  return { supported: true, from, to }
}

export function machineMovementCommandSupported(
  role: TeamRole,
  capability: MachineMovementCapability,
  command: MovementCommand,
): boolean {
  if (command === 'brake') {
    return true
  }
  if (isDashCommand(command) && capability.moveBudget < 2) {
    return false
  }

  const commandVector = commandPlanarVector(role, command)

  if (!commandVector) {
    return false
  }

  const axes = movementAxes(capability)

  if (axes.some((axis) => planarAxesMatch(axis, commandVector))) {
    return true
  }

  return canComposeMovementAxes(capability) && vectorComponentsSupported(axes, commandVector)
}

function isDashCommand(command: MovementCommand): boolean {
  return command === 'dash_forward' || command === 'dash_backward'
}

function movementAxes(capability: MachineMovementCapability): Vector3[] {
  return [
    capability.driveAxis,
    ...(capability.lateralAxis ? [capability.lateralAxis] : []),
    ...(capability.diagonalAxes ?? []),
  ]
}

function canComposeMovementAxes(capability: MachineMovementCapability): boolean {
  return capability.kind === 'omni_wheel' ||
    capability.kind === 'mecanum_wheel' ||
    capability.kind === 'articulated_leg'
}

function commandPlanarVector(role: TeamRole, command: MovementCommand): Vector3 | undefined {
  const delta = movementDelta(role, command)

  return normalizePlanarVector([delta.x, 0, delta.z])
}

function planarAxesMatch(axis: Vector3, commandVector: Vector3): boolean {
  const normalized = normalizePlanarVector(axis)

  if (!normalized) {
    return false
  }

  return dotPlanar(normalized, commandVector) >= 0.98 ||
    Math.abs(dotPlanar(normalized, commandVector)) >= 0.98
}

function vectorComponentsSupported(axes: readonly Vector3[], commandVector: Vector3): boolean {
  return (!hasPlanarComponent(commandVector[0]) || axes.some(axisSupportsX)) &&
    (!hasPlanarComponent(commandVector[2]) || axes.some(axisSupportsZ))
}

function axisSupportsX(axis: Vector3): boolean {
  const normalized = normalizePlanarVector(axis)

  return normalized ? Math.abs(normalized[0]) >= 0.65 : false
}

function axisSupportsZ(axis: Vector3): boolean {
  const normalized = normalizePlanarVector(axis)

  return normalized ? Math.abs(normalized[2]) >= 0.65 : false
}

function hasPlanarComponent(value: number): boolean {
  return Math.abs(value) > 0.1
}

function normalizePlanarVector(vector: Vector3): Vector3 | undefined {
  const normalized = normalizeVector([vector[0], 0, vector[2]], [0, 0, 0])

  return normalized[0] === 0 && normalized[2] === 0 ? undefined : normalized
}

function dotPlanar(left: Vector3, right: Vector3): number {
  return left[0] * right[0] + left[2] * right[2]
}
