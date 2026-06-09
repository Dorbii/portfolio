import type {
  ArenaConfig,
  ArenaGridCell,
  MovementCommand,
  TeamRole,
  Vector3,
} from '../../schemas/src/index.js'
import {
  arenaCellCenter,
  compileArenaTopology,
  hasArenaLineOfSight,
  pathHazards,
  worldToArenaCell,
  type CompiledArenaTopology,
} from './arenaTopology.js'

export type TacticalMovementPlan = {
  command?: MovementCommand
  from: ArenaGridCell
  to: ArenaGridCell
  path: ArenaGridCell[]
  blocked: boolean
  outOfBounds: boolean
  hazardCells: ArenaGridCell[]
  lineOfSightToOpponent: boolean
  rangeToOpponent: number
}

export function combatAnchorForPosition(
  arena: ArenaConfig,
  position: Vector3,
): ArenaGridCell {
  return worldToArenaCell(compileArenaTopology(arena), position)
}

export function tacticalMovementPlan(input: {
  arena: ArenaConfig
  role: TeamRole
  from: Vector3
  opponent: Vector3
  command?: MovementCommand
}): TacticalMovementPlan {
  const topology = compileArenaTopology(input.arena)
  const from = worldToArenaCell(topology, input.from)
  const opponent = worldToArenaCell(topology, input.opponent)
  const path = pathForCommand(input.role, from, input.command)
  const to = path[path.length - 1] ?? from
  const fromWorld = arenaCellCenter(topology, from)
  const toWorld = arenaCellCenter(topology, to)
  const opponentWorld = arenaCellCenter(topology, opponent)

  return {
    command: input.command,
    from,
    to,
    path,
    blocked: path.some((cell) => isBlockedAnchorCell(topology, cell)),
    outOfBounds: path.some((cell) => !isCellInsideArena(input.arena, cell)),
    hazardCells: uniqueCells(
      pathHazards(topology, fromWorld, toWorld, 0.5).map((hazard) => hazard.cell),
    ),
    lineOfSightToOpponent: hasArenaLineOfSight(topology, toWorld, opponentWorld),
    rangeToOpponent: gridDistance(to, opponent),
  }
}

export function pathForCommand(
  role: TeamRole,
  from: ArenaGridCell,
  command?: MovementCommand,
): ArenaGridCell[] {
  const delta = movementDelta(role, command)
  const steps = Math.max(Math.abs(delta.x), Math.abs(delta.z))

  if (steps === 0) {
    return [cloneCell(from)]
  }

  const path: ArenaGridCell[] = []

  for (let step = 1; step <= steps; step += 1) {
    path.push({
      x: from.x + Math.sign(delta.x) * step,
      z: from.z + Math.sign(delta.z) * step,
    })
  }

  return path
}

export function movementDelta(
  role: TeamRole,
  command?: MovementCommand,
): ArenaGridCell {
  const forward = role === 'red' ? 1 : -1

  switch (command) {
    case 'forward':
      return { x: forward, z: 0 }
    case 'backward':
      return { x: -forward, z: 0 }
    case 'dash_forward':
      return { x: forward * 2, z: 0 }
    case 'dash_backward':
      return { x: -forward * 2, z: 0 }
    case 'strafe_left':
      return { x: 0, z: -1 }
    case 'strafe_right':
      return { x: 0, z: 1 }
    case 'circle_left':
    case 'turn_left':
      return { x: forward, z: -1 }
    case 'circle_right':
    case 'turn_right':
      return { x: forward, z: 1 }
    case 'brake':
    case undefined:
      return { x: 0, z: 0 }
  }
}

export function gridDistance(left: ArenaGridCell, right: ArenaGridCell): number {
  return Math.abs(left.x - right.x) + Math.abs(left.z - right.z)
}

export function isCellInsideArena(arena: ArenaConfig, cell: ArenaGridCell): boolean {
  return Math.abs(cell.x) <= Math.floor(arena.width / 2) &&
    Math.abs(cell.z) <= Math.floor(arena.height / 2)
}

export function isBlockedAnchorCell(
  topology: CompiledArenaTopology,
  cell: ArenaGridCell,
): boolean {
  return topology.obstacles.some((obstacle) =>
    obstacle.blocksMovement && cellInsideShape(cell, obstacle.shape),
  )
}

function cellInsideShape(
  cell: ArenaGridCell,
  shape: CompiledArenaTopology['obstacles'][number]['shape'],
): boolean {
  if (shape.kind === 'circle') {
    return Math.hypot(cell.x - shape.center[0], cell.z - shape.center[1]) <= shape.radius
  }

  return Math.abs(cell.x - shape.center[0]) <= shape.size[0] / 2 &&
    Math.abs(cell.z - shape.center[1]) <= shape.size[1] / 2
}

function uniqueCells(cells: ArenaGridCell[]): ArenaGridCell[] {
  const seen = new Set<string>()
  const unique: ArenaGridCell[] = []

  for (const cell of cells) {
    const key = `${cell.x},${cell.z}`

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(cell)
    }
  }

  return unique
}

function cloneCell(cell: ArenaGridCell): ArenaGridCell {
  return { x: cell.x, z: cell.z }
}

export function cellIdFor(cell: ArenaGridCell): string {
  return `cell:${cell.x}:${cell.z}`
}

export function parseCellId(cellId: string): ArenaGridCell | undefined {
  const trimmed = cellId.trim()
  const cellMatch = /^cell:(-?\d+):(-?\d+)$/.exec(trimmed)
  const compactMatch = cellMatch ?? /^(-?\d+)[,:](-?\d+)$/.exec(trimmed)

  if (!compactMatch) {
    return undefined
  }

  return {
    x: Number(compactMatch[1]),
    z: Number(compactMatch[2]),
  }
}

export function adjacentCells(cell: ArenaGridCell): ArenaGridCell[] {
  return [
    { x: cell.x + 1, z: cell.z },
    { x: cell.x - 1, z: cell.z },
    { x: cell.x, z: cell.z + 1 },
    { x: cell.x, z: cell.z - 1 },
  ]
}

export function sameGridCell(left: ArenaGridCell, right: ArenaGridCell): boolean {
  return left.x === right.x && left.z === right.z
}

export function stepToward(from: ArenaGridCell, to: ArenaGridCell): ArenaGridCell | undefined {
  const xDelta = to.x - from.x
  const zDelta = to.z - from.z

  if (xDelta === 0 && zDelta === 0) {
    return undefined
  }

  if (Math.abs(xDelta) >= Math.abs(zDelta) && xDelta !== 0) {
    return { x: from.x + Math.sign(xDelta), z: from.z }
  }

  return { x: from.x, z: from.z + Math.sign(zDelta) }
}

export function linePathBetweenCells(from: ArenaGridCell, to: ArenaGridCell): ArenaGridCell[] {
  const path: ArenaGridCell[] = []
  let current = cloneCell(from)

  for (let guard = 0; guard < 256; guard += 1) {
    const next = stepToward(current, to)

    if (!next) {
      break
    }

    path.push(next)
    current = next
  }

  return path
}
