import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type { ArenaConfig } from '../../../../packages/schemas/src/index.js'
import type { ReplayVisualFrame } from './replayMapping'

export type BabylonHazardVisual = {
  kind: string
  label: string
  mesh: Mesh
  baseScale: number
  spinSpeed: number
}
export function createHazardVisuals(
  scene: Scene,
  arena: ArenaConfig,
): BabylonHazardVisual[] {
  const hazards: BabylonHazardVisual[] = []

  arena.activeHazards.forEach((rawName, index) => {
    const normalized = normalizeHazard(rawName)

    if (normalized.includes('corner')) {
      const cornerSlots = ['northwest', 'northeast', 'southwest', 'southeast'] as const

      cornerSlots.forEach((slot, slotIndex) => {
        const { x, z } = slotToPosition(slot, arena.width, arena.height)

        hazards.push({
          kind: 'flipper',
          label: normalized,
          mesh: createHazardPlate(
            scene,
            `hazard-${normalized}-${index}-${slotIndex}`,
            x,
            z,
            0.06,
            1.1,
            0.72,
            `${normalized} ${slot}`,
          ),
          baseScale: 1,
          spinSpeed: 0,
        })
      })

      return
    }

    const visual = buildHazardVisual(
      scene,
      `${normalized}-${index}`,
      normalized,
      arena.width,
      arena.height,
    )

    if (visual) {
      hazards.push(visual)
    }
  })

  if (hazards.length === 0) {
    return [
      {
        kind: 'saw',
        label: 'center',
        mesh: createHazardPlate(
          scene,
          'hazard-default',
          0,
          0,
          0,
          0.7,
          0.7,
          'center',
        ),
        baseScale: 1,
        spinSpeed: 0,
      },
    ]
  }

  return hazards
}

function buildHazardVisual(
  scene: Scene,
  id: string,
  normalized: string,
  arenaWidth: number,
  arenaHeight: number,
): BabylonHazardVisual | undefined {
  const kind = classifyHazardKind(normalized)
  const slot = classifyHazardSlot(normalized)
  const { x, z } = slotToPosition(slot, arenaWidth, arenaHeight)

  if (kind === 'saw') {
    const sawPlate = createHazardPlate(
      scene,
      `hazard-${id}`,
      x,
      z,
      0.06,
      0.84,
      1.05,
      `saw ${slot}`,
    )

    return {
      kind: 'saw',
      label: normalized,
      mesh: sawPlate,
      baseScale: 1,
      spinSpeed: 0.05,
    }
  }

  if (kind === 'pit') {
    const pit = createHazardPlate(
      scene,
      `hazard-${id}`,
      x,
      z,
      -0.07,
      0.76,
      0.8,
      `pit ${slot}`,
    )

    return {
      kind: 'pit',
      label: normalized,
      mesh: pit,
      baseScale: 1,
      spinSpeed: 0,
    }
  }

  if (kind === 'oil') {
    const oil = createHazardPlate(
      scene,
      `hazard-${id}`,
      x,
      z,
      0.03,
      1.02,
      1.08,
      `oil ${slot}`,
    )

    oil.metadata = { materialTint: true }

    return {
      kind: 'oil',
      label: normalized,
      mesh: oil,
      baseScale: 1,
      spinSpeed: 0,
    }
  }

  if (kind === 'magnet') {
    const magnet = MeshBuilder.CreateTorus(
      `hazard-${id}`,
      { diameter: 1.2, thickness: 0.12, tessellation: 28 },
      scene,
    )
    magnet.position.set(x, 0.07, z)

    return {
      kind: 'magnet',
      label: normalized,
      mesh: magnet,
      baseScale: 1,
      spinSpeed: 0.08,
    }
  }

  if (kind === 'flipper') {
    const flipper = createHazardPlate(
      scene,
      `hazard-${id}`,
      x,
      z,
      0.055,
      1.12,
      0.68,
      `flipper ${slot}`,
    )

    return {
      kind: 'flipper',
      label: normalized,
      mesh: flipper,
      baseScale: 1,
      spinSpeed: 0,
    }
  }

  const fallback = createHazardPlate(
    scene,
    `hazard-${id}`,
    x,
    z,
    0.05,
    0.9,
    0.9,
    `hazard ${slot}`,
  )

  return {
    kind: 'generic',
    label: normalized,
    mesh: fallback,
    baseScale: 1,
    spinSpeed: 0,
  }
}

function createHazardPlate(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  yOffset: number,
  width: number,
  depth: number,
  label: string,
): Mesh {
  const plate = MeshBuilder.CreateCylinder(
    name,
    { height: 0.08, diameter: width * 1.1, tessellation: 18 },
    scene,
  )
  plate.position.set(x, yOffset, z)
  plate.rotation.z = Math.PI / 2
  plate.scaling.z = Math.max(0.2, depth / Math.max(width, 0.1))
  plate.metadata = { label }

  return plate
}

export function updateHazards(hazards: BabylonHazardVisual[], frame: ReplayVisualFrame): void {
  hazards.forEach((hazard, index) => {
    const active = frame.effects.find(
      (effect) =>
        effect.kind === 'hazard' &&
        effect.label !== undefined &&
        hazardsMatch(normalizeHazard(effect.label), hazard.label),
    )
    const pulse = active ? 1 + (1 - active.age / 0.9) * 0.3 : 1
    const spin = hazard.spinSpeed > 0 ? hazard.spinSpeed + (frame.effects.some((effect) => effect.kind === 'impact') ? 0.08 : 0) : 0

    hazard.mesh.position.y = 0.08 + (active ? active.intensity * 0.14 : 0)
    hazard.mesh.scaling.setAll(hazard.baseScale * pulse)

    if (hazard.kind === 'flipper') {
      hazard.mesh.rotation.x = active ? -active.intensity * 0.45 : 0
      hazard.mesh.rotation.z = Math.sin(frame.time * 2 + index) * 0.015
    } else {
      hazard.mesh.rotation.y += spin
      hazard.mesh.rotation.z = Math.sin(frame.time * 2 + index) * 0.02
    }
  })
}

function hazardsMatch(left: string, right: string): boolean {
  return left.includes(right) || right.includes(left) || left === right
}

function classifyHazardKind(raw: string): string {
  if (raw.includes('saw')) {
    return 'saw'
  }

  if (raw.includes('flipper')) {
    return 'flipper'
  }

  if (raw.includes('pit')) {
    return 'pit'
  }

  if (raw.includes('oil')) {
    return 'oil'
  }

  if (raw.includes('magnet')) {
    return 'magnet'
  }

  return 'generic'
}

function classifyHazardSlot(raw: string): string {
  if (raw.includes('north')) {
    return 'north'
  }

  if (raw.includes('south')) {
    return 'south'
  }

  if (raw.includes('east')) {
    return 'east'
  }

  if (raw.includes('west')) {
    return 'west'
  }

  if (raw.includes('red')) {
    return 'red'
  }

  if (raw.includes('blue')) {
    return 'blue'
  }

  return 'center'
}

function slotToPosition(slot: string, arenaWidth: number, arenaHeight: number): { x: number; z: number } {
  if (slot === 'northwest') {
    return { x: -arenaWidth * 0.34, z: arenaHeight * 0.28 }
  }

  if (slot === 'northeast') {
    return { x: arenaWidth * 0.34, z: arenaHeight * 0.28 }
  }

  if (slot === 'southwest') {
    return { x: -arenaWidth * 0.34, z: -arenaHeight * 0.28 }
  }

  if (slot === 'southeast') {
    return { x: arenaWidth * 0.34, z: -arenaHeight * 0.28 }
  }

  if (slot === 'north') {
    return { x: 0, z: arenaHeight * 0.26 }
  }

  if (slot === 'south') {
    return { x: 0, z: -arenaHeight * 0.26 }
  }

  if (slot === 'east') {
    return { x: arenaWidth * 0.33, z: 0 }
  }

  if (slot === 'west') {
    return { x: -arenaWidth * 0.33, z: 0 }
  }

  if (slot === 'red') {
    return { x: -arenaWidth * 0.2, z: 0 }
  }

  if (slot === 'blue') {
    return { x: arenaWidth * 0.2, z: 0 }
  }

  return { x: 0, z: 0 }
}

function normalizeHazard(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
