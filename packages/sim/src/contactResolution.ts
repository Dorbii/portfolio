import type {
  ArenaConfig,
  BotCombatStats,
  GridCoord,
  TeamRole,
} from '../../schemas/src/index.js'
import { compileArenaTopology, type CompiledArenaTopology } from './arenaTopology.js'
import {
  adjacentCells,
  isBlockedAnchorCell,
  isCellInsideArena,
  sameGridCell,
} from './gridMovement.js'

export type PushReason = 'mass' | 'drive' | 'momentum' | 'tie_break'

export type PushContestInput = {
  attacker: TeamRole
  defender: TeamRole
  stats: Record<TeamRole, BotCombatStats>
  momentum?: Partial<Record<TeamRole, number>>
}

export type ForcedPushInput = {
  arena: ArenaConfig
  topology?: CompiledArenaTopology
  defenderCell: GridCoord
  attackerFrom: GridCoord
  attackerTo: GridCoord
  occupiedCells?: GridCoord[]
}

export type BounceInput = {
  arena: ArenaConfig
  topology?: CompiledArenaTopology
  from: GridCoord
  preferred: GridCoord
}

export type CellContactInput = {
  arena: ArenaConfig
  topology?: CompiledArenaTopology
  attacker: TeamRole
  defender: TeamRole
  attackerFrom: GridCoord
  attackerTo: GridCoord
  defenderCell: GridCoord
  stats: Record<TeamRole, BotCombatStats>
  occupiedCells?: GridCoord[]
}

export type CellContactResult =
  | {
      kind: 'push'
      winner: TeamRole
      loser: TeamRole
      loserFrom: GridCoord
      loserTo: GridCoord
      reason: PushReason
    }
  | {
      kind: 'blocked_push'
      winner: TeamRole
      loser: TeamRole
      damage: number
      bounceTo: GridCoord
      blockedBy: 'wall' | 'obstacle' | 'bot'
      reason: PushReason
    }
  | {
      kind: 'tie'
      damage: number
    }

export function resolveCellContact(input: CellContactInput): CellContactResult {
  const contest = choosePushWinner({
    attacker: input.attacker,
    defender: input.defender,
    stats: input.stats,
    momentum: { [input.attacker]: 1 },
  })

  if (contest.winner === 'tie') {
    return { kind: 'tie', damage: contactDamage(input.stats[input.attacker], input.stats[input.defender]) }
  }

  const loser = contest.winner === input.attacker ? input.defender : input.attacker
  const loserFrom = loser === input.defender ? input.defenderCell : input.attackerTo
  const pushTo = forcedPushDestination({
    arena: input.arena,
    topology: input.topology,
    defenderCell: loserFrom,
    attackerFrom: input.attackerFrom,
    attackerTo: input.attackerTo,
    occupiedCells: input.occupiedCells,
  })

  if (pushTo) {
    return {
      kind: 'push',
      winner: contest.winner,
      loser,
      loserFrom: cloneCell(loserFrom),
      loserTo: pushTo,
      reason: contest.reason,
    }
  }

  return {
    kind: 'blocked_push',
    winner: contest.winner,
    loser,
    damage: blockedPushDamage(input.stats[contest.winner], input.stats[loser]),
    bounceTo: bounceDestination({
      arena: input.arena,
      topology: input.topology,
      from: input.attackerTo,
      preferred: input.attackerFrom,
    }) ?? cloneCell(input.attackerFrom),
    blockedBy: blockedByForPush(input),
    reason: contest.reason,
  }
}

export function choosePushWinner(input: PushContestInput): {
  winner: TeamRole | 'tie'
  reason: PushReason
  scores: Record<TeamRole, number>
} {
  const scores = {
    [input.attacker]: pushScore(input.stats[input.attacker], input.momentum?.[input.attacker] ?? 0),
    [input.defender]: pushScore(input.stats[input.defender], input.momentum?.[input.defender] ?? 0),
  } as Record<TeamRole, number>
  const delta = scores[input.attacker] - scores[input.defender]

  if (Math.abs(delta) < 0.75) {
    return { winner: 'tie', reason: 'tie_break', scores }
  }

  const winner = delta > 0 ? input.attacker : input.defender
  const winnerStats = input.stats[winner]
  const loserStats = input.stats[winner === 'red' ? 'blue' : 'red']
  const reason = winnerStats.mass - loserStats.mass >= 2
    ? 'mass'
    : winnerStats.mobility - loserStats.mobility >= 2
      ? 'drive'
      : 'momentum'

  return { winner, reason, scores }
}

export function forcedPushDestination(input: ForcedPushInput): GridCoord | undefined {
  const topology = input.topology ?? compileArenaTopology(input.arena)
  const delta = pushDelta(input.attackerFrom, input.attackerTo)
  const preferred = {
    x: input.defenderCell.x + delta.x,
    z: input.defenderCell.z + delta.z,
  }
  const occupiedCells = input.occupiedCells ?? []

  if (isCellAvailable(input.arena, topology, preferred, occupiedCells)) {
    return preferred
  }

  return adjacentCells(input.defenderCell)
    .sort((left, right) => distance(left, preferred) - distance(right, preferred))
    .find((cell) => isCellAvailable(input.arena, topology, cell, occupiedCells))
}

export function bounceDestination(input: BounceInput): GridCoord | undefined {
  const topology = input.topology ?? compileArenaTopology(input.arena)

  return isCellAvailable(input.arena, topology, input.preferred, [])
    ? cloneCell(input.preferred)
    : adjacentCells(input.from).find((cell) => isCellAvailable(input.arena, topology, cell, []))
}

export function pushScore(stats: BotCombatStats, momentum = 0): number {
  return round(
    stats.mass * 0.55 +
    stats.mobility * 0.35 +
    stats.stability * 0.10 +
    momentum * 1.5,
  )
}

export function contactDamage(left: BotCombatStats, right: BotCombatStats): number {
  return Math.max(1, Math.round((left.mass + right.mass) / 16))
}

export function blockedPushDamage(attacker: BotCombatStats, defender: BotCombatStats): number {
  return Math.max(2, Math.round((attacker.mass * 0.12) + (attacker.mobility * 0.2) - defender.armor * 0.05))
}

function blockedByForPush(input: CellContactInput): 'wall' | 'obstacle' | 'bot' {
  const topology = input.topology ?? compileArenaTopology(input.arena)
  const delta = pushDelta(input.attackerFrom, input.attackerTo)
  const blockedCell = {
    x: input.defenderCell.x + delta.x,
    z: input.defenderCell.z + delta.z,
  }

  if (!isCellInsideArena(input.arena, blockedCell)) {
    return 'wall'
  }
  if (isBlockedAnchorCell(topology, blockedCell)) {
    return 'obstacle'
  }

  return 'bot'
}

function pushDelta(from: GridCoord, to: GridCoord): GridCoord {
  const x = Math.sign(to.x - from.x)
  const z = Math.sign(to.z - from.z)

  if (x === 0 && z === 0) {
    return { x: 1, z: 0 }
  }

  return Math.abs(x) >= Math.abs(z) ? { x, z: 0 } : { x: 0, z }
}

function isCellAvailable(
  arena: ArenaConfig,
  topology: CompiledArenaTopology,
  cell: GridCoord,
  occupiedCells: readonly GridCoord[],
): boolean {
  return isCellInsideArena(arena, cell) &&
    !isBlockedAnchorCell(topology, cell) &&
    !occupiedCells.some((occupied) => sameGridCell(occupied, cell))
}

function distance(left: GridCoord, right: GridCoord): number {
  return Math.abs(left.x - right.x) + Math.abs(left.z - right.z)
}

function cloneCell(cell: GridCoord): GridCoord {
  return { x: cell.x, z: cell.z }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
