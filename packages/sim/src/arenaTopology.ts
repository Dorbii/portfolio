import type {
  ArenaConfig,
  ArenaGridCell,
  ArenaHazardDefinition,
  ArenaHazardThreat,
  ArenaObstacleDefinition,
  ArenaSpawnZone,
  ArenaTerrainDefinition,
  ArenaTopologyDefinition,
  ArenaZoneShape,
  Vector3,
} from '../../schemas/src/index.js'

export type CompiledArenaTopology = Readonly<{
  arena: ArenaConfig
  grid: {
    cellSize: number
  }
  hazards: readonly ArenaHazardDefinition[]
  terrain: readonly ArenaTerrainDefinition[]
  obstacles: readonly ArenaObstacleDefinition[]
  spawnZones: readonly ArenaSpawnZone[]
}>

const DEFAULT_CELL_SIZE = 1
const LEGACY_CENTER_SAW_RADIUS = 1.2
const LEGACY_CENTER_SAW_DAMAGE = 6
const WALL_PADDING = 0.85

export function compileArenaTopology(arena: ArenaConfig): CompiledArenaTopology {
  const definition = arena.topology ?? legacyTopologyForArena(arena)
  const cellSize = definition.grid.cellSize > 0 ? definition.grid.cellSize : DEFAULT_CELL_SIZE

  return {
    arena,
    grid: { cellSize },
    hazards: definition.hazards.filter((hazard) => isArenaHazardActive(arena, hazard)),
    terrain: definition.terrain,
    obstacles: definition.obstacles,
    spawnZones: definition.spawnZones,
  }
}

export function worldToArenaCell(
  topology: CompiledArenaTopology,
  position: Vector3,
): ArenaGridCell {
  return {
    x: Math.round(position[0] / topology.grid.cellSize),
    z: Math.round(position[2] / topology.grid.cellSize),
  }
}

export function arenaCellDistance(
  left: ArenaGridCell,
  right: ArenaGridCell,
): number {
  return Math.abs(left.x - right.x) + Math.abs(left.z - right.z)
}

export function arenaCellCenter(
  topology: CompiledArenaTopology,
  cell: ArenaGridCell,
): Vector3 {
  return [cell.x * topology.grid.cellSize, 0, cell.z * topology.grid.cellSize]
}

export function bearingBetweenCells(
  from: ArenaGridCell,
  to: ArenaGridCell,
): 'north' | 'south' | 'east' | 'west' | 'same_cell' {
  const xDelta = to.x - from.x
  const zDelta = to.z - from.z

  if (xDelta === 0 && zDelta === 0) {
    return 'same_cell'
  }

  if (Math.abs(xDelta) >= Math.abs(zDelta)) {
    return xDelta > 0 ? 'east' : 'west'
  }

  return zDelta > 0 ? 'south' : 'north'
}

export function hasActiveHazard(
  topology: CompiledArenaTopology,
  type?: string,
): boolean {
  if (type === undefined) {
    return topology.hazards.length > 0
  }

  return topology.hazards.some((hazard) => normalizeToken(hazard.type) === normalizeToken(type))
}

export function activeHazardTypes(topology: CompiledArenaTopology): string[] {
  return [...new Set(topology.hazards.map((hazard) => hazard.type))].sort()
}

export function hazardsAtPosition(
  topology: CompiledArenaTopology,
  position: Vector3,
  padding = 0,
): ArenaHazardThreat[] {
  return topology.hazards
    .map((hazard) => hazardThreat(topology, hazard, position))
    .filter((threat) => threat.distance <= padding)
}

export function nearestHazardThreat(
  topology: CompiledArenaTopology,
  position: Vector3,
): ArenaHazardThreat | undefined {
  return topology.hazards
    .map((hazard) => hazardThreat(topology, hazard, position))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))[0]
}

export function pathHazards(
  topology: CompiledArenaTopology,
  from: Vector3,
  to: Vector3,
  padding = 0,
): ArenaHazardThreat[] {
  return topology.hazards
    .filter((hazard) => segmentDistanceToShape(from, to, hazard.shape) <= padding)
    .map((hazard) => hazardThreat(topology, hazard, to))
}

export function hazardCenter(hazard: ArenaHazardDefinition): Vector3 {
  return [hazard.shape.center[0], 0, hazard.shape.center[1]]
}

export function distanceToNearestArenaWall(
  arena: ArenaConfig,
  position: Vector3,
): number {
  const [x, , z] = position
  const halfWidth = arena.width / 2
  const halfHeight = arena.height / 2

  return round(Math.min(halfWidth - Math.abs(x), halfHeight - Math.abs(z)))
}

export function clampPositionToArena(
  arena: ArenaConfig,
  position: Vector3,
  padding = WALL_PADDING,
): Vector3 {
  const xLimit = Math.max(1, arena.width / 2 - padding)
  const zLimit = Math.max(1, arena.height / 2 - padding)

  return [
    round(Math.min(Math.max(position[0], -xLimit), xLimit)),
    0,
    round(Math.min(Math.max(position[2], -zLimit), zLimit)),
  ]
}

function legacyTopologyForArena(arena: ArenaConfig): ArenaTopologyDefinition {
  return {
    grid: { cellSize: DEFAULT_CELL_SIZE },
    spawnZones: [
      {
        role: 'red',
        shape: { kind: 'rect', center: [-arena.width / 4, 0], size: [3, 3] },
      },
      {
        role: 'blue',
        shape: { kind: 'rect', center: [arena.width / 4, 0], size: [3, 3] },
      },
    ],
    hazards: legacyHazardsForArena(arena),
    terrain: [],
    obstacles: [],
  }
}

function legacyHazardsForArena(arena: ArenaConfig): ArenaHazardDefinition[] {
  if (!arena.activeHazards.some((hazard) => normalizeToken(hazard).includes('saw'))) {
    return []
  }

  return [
    {
      id: 'floor_saw_center',
      type: 'floor_saw',
      shape: { kind: 'circle', center: [0, 0], radius: LEGACY_CENTER_SAW_RADIUS },
      damage: LEGACY_CENTER_SAW_DAMAGE,
      tags: ['legacy', 'center', 'contact_damage'],
    },
  ]
}

function isArenaHazardActive(
  arena: ArenaConfig,
  hazard: ArenaHazardDefinition,
): boolean {
  const hazardId = normalizeToken(hazard.id)
  const hazardType = normalizeToken(hazard.type)

  return arena.activeHazards.some((activeHazard) => {
    const active = normalizeToken(activeHazard)

    return active === hazardId ||
      active === hazardType ||
      active.includes(hazardType) ||
      hazardType.includes(active)
  })
}

function hazardThreat(
  topology: CompiledArenaTopology,
  hazard: ArenaHazardDefinition,
  position: Vector3,
): ArenaHazardThreat {
  const distance = round(Math.max(0, distanceToShape(position, hazard.shape)))

  return {
    id: hazard.id,
    type: hazard.type,
    cell: worldToArenaCell(topology, hazardCenter(hazard)),
    distance,
    inside: distance <= 0,
    damage: hazard.damage,
  }
}

function distanceToShape(position: Vector3, shape: ArenaZoneShape): number {
  if (shape.kind === 'circle') {
    return Math.hypot(position[0] - shape.center[0], position[2] - shape.center[1]) - shape.radius
  }

  const halfWidth = shape.size[0] / 2
  const halfHeight = shape.size[1] / 2
  const xDelta = Math.abs(position[0] - shape.center[0]) - halfWidth
  const zDelta = Math.abs(position[2] - shape.center[1]) - halfHeight
  const outsideX = Math.max(0, xDelta)
  const outsideZ = Math.max(0, zDelta)

  if (outsideX === 0 && outsideZ === 0) {
    return Math.max(xDelta, zDelta)
  }

  return Math.hypot(outsideX, outsideZ)
}

function segmentDistanceToShape(
  from: Vector3,
  to: Vector3,
  shape: ArenaZoneShape,
): number {
  const samples = 8
  let minDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    const position: Vector3 = [
      from[0] + (to[0] - from[0]) * t,
      0,
      from[2] + (to[2] - from[2]) * t,
    ]

    minDistance = Math.min(minDistance, distanceToShape(position, shape))
  }

  return minDistance
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_').replaceAll(/^_+|_+$/g, '')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
