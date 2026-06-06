import type {
  ArenaConfig,
  ArenaGridCell,
  ArenaGridDefinition,
  ArenaHazardDefinition,
  ArenaHazardThreat,
  ArenaObstacleDefinition,
  ArenaSpawnZone,
  ArenaTerrainDefinition,
  ArenaTopologyDefinition,
  ArenaZoneShape,
  Vector3,
} from '../../schemas/src/index.js'

export type ArenaHazardEffectKind = 'saw' | 'flipper' | 'pit' | 'oil' | 'magnet' | 'generic'
type ActiveArenaHazardSlot =
  | 'center'
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northwest'
  | 'northeast'
  | 'southwest'
  | 'southeast'
  | 'red'
  | 'blue'

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
const ACTIVE_CENTER_SAW_RADIUS = 1.2
const ACTIVE_CENTER_SAW_DAMAGE = 6
const WALL_PADDING = 0.85
const CORNER_SLOTS: readonly ActiveArenaHazardSlot[] = ['northwest', 'northeast', 'southwest', 'southeast']

export function compileArenaTopology(arena: ArenaConfig): CompiledArenaTopology {
  const definition = isArenaTopologyDefinition(arena.topology)
    ? arena.topology
    : topologyFromActiveHazards(arena)
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

export function hasArenaLineOfSight(
  topology: CompiledArenaTopology,
  from: Vector3,
  to: Vector3,
): boolean {
  return !topology.obstacles.some((obstacle) =>
    obstacle.blocksMovement && segmentDistanceToShape(from, to, obstacle.shape) <= 0,
  )
}

export function hazardCenter(hazard: ArenaHazardDefinition): Vector3 {
  return [hazard.shape.center[0], 0, hazard.shape.center[1]]
}

export function hazardEffectKind(type: string): ArenaHazardEffectKind {
  const normalized = normalizeWords(type)

  if (normalized.includes('saw') || normalized.includes('spinner')) {
    return 'saw'
  }

  if (normalized.includes('flipper')) {
    return 'flipper'
  }

  if (normalized.includes('pit') || normalized.includes('trap')) {
    return 'pit'
  }

  if (normalized.includes('oil') || normalized.includes('slick')) {
    return 'oil'
  }

  if (normalized.includes('magnet')) {
    return 'magnet'
  }

  return 'generic'
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

function topologyFromActiveHazards(arena: ArenaConfig): ArenaTopologyDefinition {
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
    hazards: hazardsFromActiveHazards(arena),
    terrain: [],
    obstacles: [],
  }
}

function hazardsFromActiveHazards(arena: ArenaConfig): ArenaHazardDefinition[] {
  return arena.activeHazards.flatMap((raw, index) => hazardsForActiveLabel(raw, index, arena))
}

function hazardsForActiveLabel(
  raw: string,
  index: number,
  arena: ArenaConfig,
): ArenaHazardDefinition[] {
  const normalizedWords = normalizeWords(raw)
  const kind = hazardEffectKind(raw)
  const slots = normalizedWords.includes('corner')
    ? CORNER_SLOTS
    : [activeHazardSlot(normalizedWords)]

  return slots.map((slot) => {
    const type = normalizeToken(raw) || 'hazard'
    const id = `${type}_${slot}_${index}`

    return {
      id,
      type,
      shape: {
        kind: 'circle',
        center: activeHazardCenter(slot, arena.width, arena.height),
        radius: activeHazardRadius(kind),
      },
      damage: activeHazardDamage(kind),
      tags: ['active_hazard', slot, kind],
    }
  })
}

function activeHazardSlot(normalizedWords: string): ActiveArenaHazardSlot {
  if (normalizedWords.includes('northwest') || (normalizedWords.includes('north') && normalizedWords.includes('west'))) {
    return 'northwest'
  }

  if (normalizedWords.includes('northeast') || (normalizedWords.includes('north') && normalizedWords.includes('east'))) {
    return 'northeast'
  }

  if (normalizedWords.includes('southwest') || (normalizedWords.includes('south') && normalizedWords.includes('west'))) {
    return 'southwest'
  }

  if (normalizedWords.includes('southeast') || (normalizedWords.includes('south') && normalizedWords.includes('east'))) {
    return 'southeast'
  }

  if (normalizedWords.includes('north')) {
    return 'north'
  }

  if (normalizedWords.includes('south')) {
    return 'south'
  }

  if (normalizedWords.includes('east')) {
    return 'east'
  }

  if (normalizedWords.includes('west')) {
    return 'west'
  }

  if (normalizedWords.includes('red')) {
    return 'red'
  }

  if (normalizedWords.includes('blue')) {
    return 'blue'
  }

  return 'center'
}

function activeHazardCenter(
  slot: ActiveArenaHazardSlot,
  arenaWidth: number,
  arenaHeight: number,
): [number, number] {
  switch (slot) {
    case 'northwest':
      return [-arenaWidth * 0.34, arenaHeight * 0.28]
    case 'northeast':
      return [arenaWidth * 0.34, arenaHeight * 0.28]
    case 'southwest':
      return [-arenaWidth * 0.34, -arenaHeight * 0.28]
    case 'southeast':
      return [arenaWidth * 0.34, -arenaHeight * 0.28]
    case 'north':
      return [0, arenaHeight * 0.26]
    case 'south':
      return [0, -arenaHeight * 0.26]
    case 'east':
      return [arenaWidth * 0.33, 0]
    case 'west':
      return [-arenaWidth * 0.33, 0]
    case 'red':
      return [-arenaWidth * 0.2, 0]
    case 'blue':
      return [arenaWidth * 0.2, 0]
    case 'center':
      return [0, 0]
  }
}

function activeHazardRadius(kind: ArenaHazardEffectKind): number {
  switch (kind) {
    case 'oil':
    case 'magnet':
      return 1.35
    case 'flipper':
      return 1.1
    case 'pit':
      return 1
    case 'saw':
      return ACTIVE_CENTER_SAW_RADIUS
    case 'generic':
      return 0.9
  }
}

function activeHazardDamage(kind: ArenaHazardEffectKind): number {
  switch (kind) {
    case 'saw':
      return ACTIVE_CENTER_SAW_DAMAGE
    case 'pit':
      return 8
    case 'flipper':
    case 'generic':
    case 'magnet':
    case 'oil':
      return 0
  }
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
    position: hazardCenter(hazard),
    distance,
    inside: distance <= 0,
    damage: hazard.damage,
  }
}

function isArenaTopologyDefinition(
  value: ArenaTopologyDefinition | undefined,
): value is ArenaTopologyDefinition {
  return (
    value !== undefined &&
    isArenaGridDefinition(value.grid) &&
    Array.isArray(value.spawnZones) &&
    value.spawnZones.every(isArenaSpawnZone) &&
    Array.isArray(value.hazards) &&
    value.hazards.every(isArenaHazardDefinition) &&
    Array.isArray(value.terrain) &&
    value.terrain.every(isArenaTerrainDefinition) &&
    Array.isArray(value.obstacles) &&
    value.obstacles.every(isArenaObstacleDefinition)
  )
}

function isArenaGridDefinition(value: unknown): value is ArenaGridDefinition {
  return isRecord(value) && isFinitePositiveNumber(value.cellSize)
}

function isArenaSpawnZone(value: unknown): value is ArenaSpawnZone {
  return isRecord(value) &&
    (value.role === 'red' || value.role === 'blue') &&
    isArenaZoneShape(value.shape)
}

function isArenaHazardDefinition(value: unknown): value is ArenaHazardDefinition {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    isArenaZoneShape(value.shape) &&
    typeof value.damage === 'number' &&
    Number.isFinite(value.damage) &&
    (value.tags === undefined || stringArray(value.tags))
}

function isArenaTerrainDefinition(value: unknown): value is ArenaTerrainDefinition {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    isArenaZoneShape(value.shape) &&
    (value.tags === undefined || stringArray(value.tags))
}

function isArenaObstacleDefinition(value: unknown): value is ArenaObstacleDefinition {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    isArenaZoneShape(value.shape) &&
    typeof value.blocksMovement === 'boolean' &&
    (value.tags === undefined || stringArray(value.tags))
}

function isArenaZoneShape(value: unknown): value is ArenaZoneShape {
  if (!isRecord(value) || !isVector2(value.center)) {
    return false
  }

  if (value.kind === 'circle') {
    return isFinitePositiveNumber(value.radius)
  }

  return value.kind === 'rect' && isVector2(value.size) && value.size.every((entry) => entry > 0)
}

function isVector2(value: unknown): value is [number, number] {
  return Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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

function normalizeWords(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, ' ').trim()
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
