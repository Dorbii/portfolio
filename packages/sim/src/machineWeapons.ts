import type {
  ArenaConfig,
  MachineWeaponCapability,
  TeamRole,
  TurnCommand,
  Vector3,
} from '../../schemas/src/index.js'
import {
  compileArenaTopology,
  hasArenaLineOfSight,
} from './arenaTopology.js'
import {
  weaponFireModeRequiresEmitterBearing,
  weaponFireModeRequiresLineOfSight,
} from './combatLegality.js'
import type { CompiledArenaTopology } from './arenaTopology.js'
import { normalizeVector } from './transforms.js'

export type MachineWeaponSlot = 'weaponA' | 'weaponB'

export type MachineWeaponFire = {
  slot: MachineWeaponSlot
  weapon: MachineWeaponCapability
}

const MACHINE_WEAPON_SLOTS: readonly MachineWeaponSlot[] = ['weaponA', 'weaponB']

// CODEX_INTENT: resolve native machine weapon fire from current emitter axes, range, and line-of-sight facts.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export function resolveMachineWeaponFires(input: {
  arena: ArenaConfig
  attackerRole: TeamRole
  attackerPosition: Vector3
  defenderPosition: Vector3
  command: TurnCommand
  weapons: readonly MachineWeaponCapability[]
}): MachineWeaponFire[] {
  const topology = compileArenaTopology(input.arena)

  return MACHINE_WEAPON_SLOTS.flatMap((slot, index) => {
    const weapon = input.weapons[index]

    if (!weapon || input.command[slot] !== 'fire') {
      return []
    }

    return machineWeaponCanHit({
      topology,
      attackerPosition: input.attackerPosition,
      defenderPosition: input.defenderPosition,
      weapon,
    })
      ? [{ slot, weapon }]
      : []
  })
}

export function machineWeaponCanHit(input: {
  topology: CompiledArenaTopology
  attackerPosition: Vector3
  defenderPosition: Vector3
  weapon: MachineWeaponCapability
}): boolean {
  const inRange = flatDistance(input.attackerPosition, input.defenderPosition) <= input.weapon.range
  const hasLineOfSight = !weaponFireModeRequiresLineOfSight(input.weapon.fireMode) ||
    hasArenaLineOfSight(input.topology, input.attackerPosition, input.defenderPosition)
  const hasEmitterBearing = !weaponFireModeRequiresEmitterBearing(input.weapon.fireMode) ||
    emitterAxisTargetsOpponent(input.attackerPosition, input.defenderPosition, input.weapon.emitterAxis)

  return inRange &&
    hasLineOfSight &&
    hasEmitterBearing
}

function emitterAxisTargetsOpponent(
  attackerPosition: Vector3,
  defenderPosition: Vector3,
  emitterAxis: Vector3,
): boolean {
  const target = normalizePlanarVector([
    defenderPosition[0] - attackerPosition[0],
    0,
    defenderPosition[2] - attackerPosition[2],
  ])

  if (!target) {
    return true
  }

  const emitter = normalizePlanarVector(emitterAxis)

  if (!emitter) {
    return false
  }

  return emitter[0] * target[0] + emitter[2] * target[2] >= 0.65
}

function normalizePlanarVector(vector: Vector3): Vector3 | undefined {
  const normalized = normalizeVector([vector[0], 0, vector[2]], [0, 0, 0])

  return normalized[0] === 0 && normalized[2] === 0 ? undefined : normalized
}

function flatDistance(left: Vector3, right: Vector3): number {
  return Math.hypot(left[0] - right[0], left[2] - right[2])
}
