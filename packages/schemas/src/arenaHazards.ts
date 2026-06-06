import type { ArenaConfig, Vector3 } from './types.js'

export type ArenaHazardKind = 'saw' | 'flipper' | 'pit' | 'oil' | 'magnet' | 'generic'
export type ArenaHazardSlot =
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

export type ArenaHazardDescriptor = {
  id: string
  raw: string
  normalized: string
  label: string
  kind: ArenaHazardKind
  slot: ArenaHazardSlot
  position: Vector3
  radius: number
}

const CORNER_SLOTS: readonly ArenaHazardSlot[] = ['northwest', 'northeast', 'southwest', 'southeast']

export function normalizeArenaHazard(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function expandArenaHazards(arena: ArenaConfig): ArenaHazardDescriptor[] {
  return arena.activeHazards.flatMap((raw, index) => expandArenaHazard(raw, index, arena))
}

export function hasCenterArenaHazard(activeHazards: readonly string[]): boolean {
  return activeHazards.some((raw) => {
    const normalized = normalizeArenaHazard(raw)

    return classifyArenaHazardKind(normalized) !== 'generic' && classifyArenaHazardSlot(normalized) === 'center'
  })
}

export function isPositionInsideArenaHazard(
  position: Vector3,
  hazard: ArenaHazardDescriptor,
): boolean {
  return (
    Math.abs(position[0] - hazard.position[0]) <= hazard.radius &&
    Math.abs(position[2] - hazard.position[2]) <= hazard.radius
  )
}

function expandArenaHazard(
  raw: string,
  index: number,
  arena: ArenaConfig,
): ArenaHazardDescriptor[] {
  const normalized = normalizeArenaHazard(raw)
  const kind = classifyArenaHazardKind(normalized)
  const slots = normalized.includes('corner') ? CORNER_SLOTS : [classifyArenaHazardSlot(normalized)]

  return slots.map((slot) => createArenaHazardDescriptor(raw, normalized, kind, slot, index, arena))
}

function createArenaHazardDescriptor(
  raw: string,
  normalized: string,
  kind: ArenaHazardKind,
  slot: ArenaHazardSlot,
  index: number,
  arena: ArenaConfig,
): ArenaHazardDescriptor {
  const safeRaw = raw.trim() || `hazard-${index}`
  const idBase = normalizeArenaHazard(safeRaw).replace(/\s+/g, '-') || 'hazard'
  const label = normalized.includes('corner') ? `${safeRaw}:${slot}` : safeRaw

  return {
    id: `${idBase}-${slot}-${index}`,
    raw: safeRaw,
    normalized,
    label,
    kind,
    slot,
    position: arenaHazardPosition(slot, arena.width, arena.height),
    radius: arenaHazardRadius(kind),
  }
}

function classifyArenaHazardKind(normalized: string): ArenaHazardKind {
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

function classifyArenaHazardSlot(normalized: string): ArenaHazardSlot {
  if (normalized.includes('northwest') || (normalized.includes('north') && normalized.includes('west'))) {
    return 'northwest'
  }

  if (normalized.includes('northeast') || (normalized.includes('north') && normalized.includes('east'))) {
    return 'northeast'
  }

  if (normalized.includes('southwest') || (normalized.includes('south') && normalized.includes('west'))) {
    return 'southwest'
  }

  if (normalized.includes('southeast') || (normalized.includes('south') && normalized.includes('east'))) {
    return 'southeast'
  }

  if (normalized.includes('north')) {
    return 'north'
  }

  if (normalized.includes('south')) {
    return 'south'
  }

  if (normalized.includes('east')) {
    return 'east'
  }

  if (normalized.includes('west')) {
    return 'west'
  }

  if (normalized.includes('red')) {
    return 'red'
  }

  if (normalized.includes('blue')) {
    return 'blue'
  }

  return 'center'
}

function arenaHazardPosition(slot: ArenaHazardSlot, arenaWidth: number, arenaHeight: number): Vector3 {
  switch (slot) {
    case 'northwest':
      return [-arenaWidth * 0.34, 0, arenaHeight * 0.28]
    case 'northeast':
      return [arenaWidth * 0.34, 0, arenaHeight * 0.28]
    case 'southwest':
      return [-arenaWidth * 0.34, 0, -arenaHeight * 0.28]
    case 'southeast':
      return [arenaWidth * 0.34, 0, -arenaHeight * 0.28]
    case 'north':
      return [0, 0, arenaHeight * 0.26]
    case 'south':
      return [0, 0, -arenaHeight * 0.26]
    case 'east':
      return [arenaWidth * 0.33, 0, 0]
    case 'west':
      return [-arenaWidth * 0.33, 0, 0]
    case 'red':
      return [-arenaWidth * 0.2, 0, 0]
    case 'blue':
      return [arenaWidth * 0.2, 0, 0]
    case 'center':
      return [0, 0, 0]
  }
}

function arenaHazardRadius(kind: ArenaHazardKind): number {
  switch (kind) {
    case 'oil':
      return 1.35
    case 'magnet':
      return 1.35
    case 'flipper':
      return 1.1
    case 'pit':
      return 1
    case 'saw':
      return 1.2
    case 'generic':
      return 0.9
  }
}
