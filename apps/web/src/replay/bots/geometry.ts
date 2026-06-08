import { getPart } from '../../../../../packages/catalog/src/index.js'
import type {
  BlueprintBlock,
  MachineDesign,
  MachinePartSource,
  OrientationBasis,
  PartCategory,
  Vector3,
} from '../../../../../packages/schemas/src/index.js'

export const BOT_CELL_SCALE = 0.58
export const MACHINE_REPLAY_VISUAL_AUTHORITY = 'machine:v1'
export const LEGACY_REPLAY_VISUAL_AUTHORITY = 'legacy-bot-blueprint'
const CATALOG_DEFINITION_PREFIX = 'catalog:'
const MACHINE_CORE_MAX_HEALTH = 20
const IDENTITY_ORIENTATION: OrientationBasis = {
  right: [1, 0, 0],
  up: [0, 1, 0],
  forward: [0, 0, 1],
}

export type BotBounds = {
  centerX: number
  centerZ: number
  width: number
  depth: number
}

export type BotFoundationArchetype = 'compact_assault' | 'long_control' | 'modular_default'

export type MachineReplayRenderPart = {
  instanceId: string
  partId: string
  source: MachinePartSource
  position: Vector3
  orientation: OrientationBasis
  health?: number
  maxHealth: number
  detached: boolean
}

export function measureBotBounds(blocks: BlueprintBlock[]): BotBounds {
  if (blocks.length === 0) {
    return {
      centerX: 0,
      centerZ: 0,
      width: 1.8,
      depth: 2.2,
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY

  blocks.forEach((block) => {
    const part = getPart(block.partId)
    const size = part?.size ?? [1, 1, 1]
    const halfWidth = Math.max(0.22, size[0] * BOT_CELL_SCALE) / 2
    const halfDepth = Math.max(0.22, size[2] * BOT_CELL_SCALE) / 2
    const x = block.position[0] * BOT_CELL_SCALE
    const z = block.position[2] * BOT_CELL_SCALE

    minX = Math.min(minX, x - halfWidth)
    maxX = Math.max(maxX, x + halfWidth)
    minZ = Math.min(minZ, z - halfDepth)
    maxZ = Math.max(maxZ, z + halfDepth)
  })

  const width = Math.max(1.55, maxX - minX + 0.62)
  const depth = Math.max(1.8, maxZ - minZ + 0.74)

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width,
    depth,
  }
}

export function measureMachineReplayBounds(parts: MachineReplayRenderPart[]): BotBounds {
  if (parts.length === 0) {
    return measureBotBounds([])
  }

  return measureBotBounds(
    parts.map((part) => ({
      id: part.instanceId,
      partId: part.partId,
      position: part.position,
      rotation: [0, 0, 0],
    })),
  )
}

export function projectMachineDesignToReplayRenderParts(
  machine: MachineDesign,
): MachineReplayRenderPart[] {
  const detachedInstanceIds = new Set(machine.runtime?.detachedInstanceIds ?? [])

  return machine.parts.map((part) => {
    const partId = replayCatalogPartId(part.definitionId)

    return {
      instanceId: part.instanceId,
      partId,
      source: part.source,
      position: cloneVector(part.transform.position),
      orientation: cloneOrientation(
        machine.runtime?.orientationByInstanceId?.[part.instanceId] ??
          part.transform.orientation ??
          IDENTITY_ORIENTATION,
      ),
      health: machine.runtime?.healthByInstanceId[part.instanceId],
      maxHealth: replayPartMaxHealth(partId),
      detached: detachedInstanceIds.has(part.instanceId),
    }
  })
}

// CODEX_INTENT: infer visual foundations from real blueprint parts so replay bots do not share one generic hull.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export function resolveFoundationArchetype(blocks: BlueprintBlock[]): BotFoundationArchetype {
  const partIds = new Set(blocks.map((block) => block.partId))
  const hasLongBody = partIds.has('Body_Rectangle_Long') || partIds.has('Body_Light_Frame')
  const hasControlLoadout =
    partIds.has('Weapon_Net') ||
    partIds.has('Weapon_Turret') ||
    partIds.has('Utility_Magnet') ||
    partIds.has('Utility_Sensor')
  const hasHeavyDrive =
    partIds.has('Tread_Heavy') || partIds.has('Wheel_Tank') || partIds.has('Body_Heavy_Block')
  const hasContactWeapon =
    partIds.has('Weapon_Spinner_Large') ||
    partIds.has('Weapon_Spinner_Small') ||
    partIds.has('Weapon_Flipper') ||
    partIds.has('Weapon_Ram') ||
    partIds.has('Weapon_Saw') ||
    partIds.has('Body_Wedge')

  if (hasLongBody || (hasControlLoadout && partIds.has('Wheel_Omni'))) {
    return 'long_control'
  }

  if (hasHeavyDrive || hasContactWeapon) {
    return 'compact_assault'
  }

  return 'modular_default'
}

export function heightForCategory(category: PartCategory, cellHeight: number): number {
  const base = cellHeight * BOT_CELL_SCALE

  if (category === 'mobility') {
    return Math.max(0.38, base * 0.88)
  }

  if (category === 'weapon') {
    return Math.max(0.48, base * 0.98)
  }

  if (category === 'utility') {
    return Math.max(0.46, base)
  }

  if (category === 'defense') {
    return Math.max(0.36, base * 0.86)
  }

  if (category === 'style') {
    return Math.max(0.28, base * 0.72)
  }

  return Math.max(0.44, base * 0.94)
}

function replayCatalogPartId(definitionId: string): string {
  return definitionId.startsWith(CATALOG_DEFINITION_PREFIX)
    ? definitionId.slice(CATALOG_DEFINITION_PREFIX.length)
    : definitionId
}

function replayPartMaxHealth(partId: string): number {
  return Math.max(1, getPart(partId)?.durability ?? MACHINE_CORE_MAX_HEALTH)
}

function cloneVector(vector: Vector3): Vector3 {
  return [vector[0], vector[1], vector[2]]
}

function cloneOrientation(orientation: OrientationBasis): OrientationBasis {
  return {
    right: cloneVector(orientation.right),
    up: cloneVector(orientation.up),
    forward: cloneVector(orientation.forward),
  }
}
