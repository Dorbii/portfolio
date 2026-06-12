import type {
  ArenaConfig,
  CombatBotSnapshot,
  CombatBudget,
  CombatTurnSnapshot,
  CompactCombatBot,
  CompactCombatPacket,
  CompactCombatWeapon,
  MachineCapabilities,
  TeamRole,
  Vector3,
} from '../../schemas/src/index.js'
import { buildAgentBoardView } from './agentBoardView.js'

export type BuildCompactCombatViewInput = {
  role: TeamRole
  round: number
  decisionVersion: number
  fightStartedAt?: string
  fightDeadlineAt?: string
  fightSeconds?: number
  cutoffReason?: 'fight_wall_clock_expired'
  snapshot: CombatTurnSnapshot
  budget: CombatBudget
  arena: ArenaConfig
  selfCapabilities?: MachineCapabilities
  opponentCapabilities?: MachineCapabilities
}

// Compact combat protocol: expose state, not affordance menus. The server
// stays authoritative for movement, pathing, line of sight, range, cooldowns,
// and action time when the compact plan is submitted.
export function buildCompactCombatView(input: BuildCompactCombatViewInput): CompactCombatPacket {
  const self = input.role === 'red' ? input.snapshot.red : input.snapshot.blue
  const opponent = input.role === 'red' ? input.snapshot.blue : input.snapshot.red
  const board = buildAgentBoardView({
    arena: input.arena,
    role: input.role,
    self,
    opponent,
    actions: [],
  })
  const grid: [number, number, number, number] = [
    board.grid?.xMin ?? 0,
    board.grid?.xMax ?? 0,
    board.grid?.zMin ?? 0,
    board.grid?.zMax ?? 0,
  ]
  const wall = (board.blockedCells ?? []).map((cell): [number, number] => [cell.x, cell.z])
  const hazard = (board.hazardCells ?? []).map((cell): [number, number] => [cell.x, cell.z])

  return {
    v: 1,
    combat: {
      round: input.round,
      decisionVersion: input.decisionVersion,
      ...(input.fightStartedAt ? { fightStartedAt: input.fightStartedAt } : {}),
      ...(input.fightDeadlineAt ? { fightDeadlineAt: input.fightDeadlineAt } : {}),
      ...(input.fightSeconds ? { fightSeconds: input.fightSeconds } : {}),
      ...(input.cutoffReason ? { cutoffReason: input.cutoffReason } : {}),
      budget: {
        actionTime: input.budget.actionTime,
      },
      self: compactCombatBot(self, board.self?.anchor, input.budget, input.selfCapabilities),
      opponent: compactCombatBot(opponent, board.opponent?.anchor, undefined, input.opponentCapabilities),
    },
    board: {
      grid,
      terrain: {
        ...(hazard.length > 0 ? { hazard } : {}),
        ...(wall.length > 0 ? { wall } : {}),
      },
    },
  }
}

function compactCombatBot(
  snapshot: CombatBotSnapshot,
  anchor: { x: number; z: number } | undefined,
  budget: CombatBudget | undefined,
  capabilities: MachineCapabilities | undefined,
): CompactCombatBot {
  return {
    cell: [anchor?.x ?? 0, anchor?.z ?? 0],
    hp: snapshot.health,
    maxHp: snapshot.maxHealth,
    mass: snapshot.stats.mass,
    armor: snapshot.stats.armor,
    stability: snapshot.stats.stability,
    movement: compactMovement(capabilities, snapshot),
    weapons: compactWeapons(capabilities, snapshot, budget),
  }
}

// Movement aggregation is approximate until compact combat movement
// derivation is finalized; server validation remains authoritative.
function compactMovement(
  capabilities: MachineCapabilities | undefined,
  snapshot: CombatBotSnapshot,
): CompactCombatBot['movement'] {
  if (!capabilities || capabilities.movement.length === 0) {
    return snapshot.stats.mobility > 0 ? { xz: snapshot.stats.mobility } : {}
  }

  const movement: CompactCombatBot['movement'] = {}

  for (const capability of capabilities.movement) {
    const omni =
      capability.kind === 'omni_wheel' ||
      capability.kind === 'mecanum_wheel' ||
      capability.kind === 'articulated_leg' ||
      (capability.diagonalAxes?.length ?? 0) > 0
    const axis: 'x' | 'z' | 'xz' = omni
      ? 'xz'
      : Math.abs(capability.driveAxis[0]) >= Math.abs(capability.driveAxis[2])
        ? 'x'
        : 'z'

    movement[axis] = Math.max(movement[axis] ?? 0, capability.moveBudget)
  }

  return movement
}

// Mounted weapon IDs are the canonical combat identity. All active weapons
// are exposed; the first two also carry legacy weaponA/weaponB slots during
// migration so older agents keep working.
function compactWeapons(
  capabilities: MachineCapabilities | undefined,
  snapshot: CombatBotSnapshot,
  budget: CombatBudget | undefined,
): CompactCombatWeapon[] {
  const slots: Array<'weaponA' | 'weaponB'> = ['weaponA', 'weaponB']
  const weapons = capabilities?.weapons ?? []

  return weapons.map((weapon, index) => {
    const slot = index < slots.length ? slots[index] : undefined
    const cooldown = budget?.weaponCooldowns[weapon.partInstanceId] ??
      (slot ? budget?.weaponCooldowns[slot] ?? snapshot.cooldowns[slot] : undefined) ??
      snapshot.cooldowns[weapon.partInstanceId] ??
      0

    return {
      id: weapon.partInstanceId,
      ...(slot ? { slot } : {}),
      part: weapon.partId,
      fireMode: weapon.fireMode,
      range: weapon.range,
      cooldown,
      actionTime: 1,
      facing: facingFromEmitterAxis(weapon.emitterAxis),
      ...(weapon.kind === 'turret_emitter' ? { dynamicFacing: true } : {}),
    }
  })
}

function facingFromEmitterAxis(axis: Vector3): [number, number] {
  const x = Math.abs(axis[0]) >= Math.abs(axis[2]) ? Math.sign(axis[0]) : 0
  const z = x === 0 ? Math.sign(axis[2]) : 0

  return [x, z]
}
