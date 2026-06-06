import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import {
  type ArenaConfig,
  type ArenaHazardDefinition,
} from '../../../../packages/schemas/src/index.js'
import {
  compileArenaTopology,
  hazardCenter,
  hazardEffectKind,
} from '../../../../packages/sim/src/arenaTopology.js'
import type { ReplayVisualFrame } from './replayMapping'

export type BabylonHazardVisual = {
  kind: string
  label: string
  mesh: Mesh
  baseScale: number
  baseScaleZ: number
  spinSpeed: number
}
export function createHazardVisuals(
  scene: Scene,
  arena: ArenaConfig,
): BabylonHazardVisual[] {
  const hazards = compileArenaTopology(arena).hazards
    .map((hazard) => buildHazardVisual(scene, hazard))
    .filter((hazard): hazard is BabylonHazardVisual => hazard !== undefined)

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
        baseScaleZ: 1,
        spinSpeed: 0,
      },
    ]
  }

  return hazards
}

function buildHazardVisual(
  scene: Scene,
  hazard: ArenaHazardDefinition,
): BabylonHazardVisual | undefined {
  const kind = hazardEffectKind(hazard.type)
  const [x, , z] = hazardCenter(hazard)
  const label = normalizeHazardLabel(hazard.type)

  if (kind === 'saw') {
    const sawPlate = createHazardPlate(
      scene,
      `hazard-${hazard.id}`,
      x,
      z,
      0.06,
      0.84,
      1.05,
      hazard.type,
    )
    createSawTeeth(scene, `hazard-${hazard.id}-tooth`, sawPlate)
    createHazardHub(scene, `hazard-${hazard.id}-hub`, sawPlate)

    return {
      kind: 'saw',
      label,
      mesh: sawPlate,
      baseScale: 1,
      baseScaleZ: sawPlate.scaling.z,
      spinSpeed: 0.05,
    }
  }

  if (kind === 'pit') {
    const pit = createHazardPlate(
      scene,
      `hazard-${hazard.id}`,
      x,
      z,
      -0.07,
      0.76,
      0.8,
      hazard.type,
    )
    createPitDetails(scene, `hazard-${hazard.id}-pit`, pit)

    return {
      kind: 'pit',
      label,
      mesh: pit,
      baseScale: 1,
      baseScaleZ: pit.scaling.z,
      spinSpeed: 0,
    }
  }

  if (kind === 'oil') {
    const oil = createHazardPlate(
      scene,
      `hazard-${hazard.id}`,
      x,
      z,
      0.03,
      1.02,
      1.08,
      hazard.type,
    )

    oil.metadata = { materialTint: true }
    createOilSlickDetails(scene, `hazard-${hazard.id}-oil`, oil)

    return {
      kind: 'oil',
      label,
      mesh: oil,
      baseScale: 1,
      baseScaleZ: oil.scaling.z,
      spinSpeed: 0,
    }
  }

  if (kind === 'magnet') {
    const magnet = MeshBuilder.CreateTorus(
      `hazard-${hazard.id}`,
      { diameter: 1.2, thickness: 0.12, tessellation: 28 },
      scene,
    )
    magnet.position.set(x, 0.07, z)
    createMagnetDetails(scene, `hazard-${hazard.id}-magnet`, magnet)

    return {
      kind: 'magnet',
      label,
      mesh: magnet,
      baseScale: 1,
      baseScaleZ: magnet.scaling.z,
      spinSpeed: 0.08,
    }
  }

  if (kind === 'flipper') {
    const flipper = MeshBuilder.CreateBox(
      `hazard-${hazard.id}`,
      { width: 1.35, height: 0.08, depth: 0.88 },
      scene,
    )

    flipper.position.set(x, 0.055, z)
    flipper.metadata = { label: hazard.type }
    createFlipperDetails(scene, `hazard-${hazard.id}-flipper`, flipper)

    return {
      kind: 'flipper',
      label,
      mesh: flipper,
      baseScale: 1,
      baseScaleZ: flipper.scaling.z,
      spinSpeed: 0,
    }
  }

  const genericHazard = createHazardPlate(
    scene,
    `hazard-${hazard.id}`,
    x,
    z,
    0.05,
    0.9,
    0.9,
    hazard.type,
  )

  return {
    kind: 'generic',
    label,
    mesh: genericHazard,
    baseScale: 1,
    baseScaleZ: genericHazard.scaling.z,
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
        hazardsMatch(normalizeHazardLabel(effect.label), hazard.label),
    )
    const pulse = active ? 1 + (1 - active.age / 0.9) * 0.3 : 1
    const spin = hazard.spinSpeed > 0 ? hazard.spinSpeed + (frame.effects.some((effect) => effect.kind === 'impact') ? 0.08 : 0) : 0

    hazard.mesh.position.y = 0.08 + (active ? active.intensity * 0.14 : 0)
    hazard.mesh.scaling.set(
      hazard.baseScale * pulse,
      hazard.baseScale * pulse,
      hazard.baseScaleZ * pulse,
    )

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

function normalizeHazardLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function createSawTeeth(scene: Scene, name: string, parent: Mesh): void {
  for (let index = 0; index < 12; index += 1) {
    const tooth = MeshBuilder.CreateBox(
      `${name}-${index}`,
      { width: 0.14, height: 0.085, depth: 0.34 },
      scene,
    )
    const angle = (Math.PI * 2 * index) / 12

    tooth.parent = parent
    tooth.position.set(Math.cos(angle) * 0.46, 0.07, Math.sin(angle) * 0.46)
    tooth.rotation.y = angle
  }
}

function createHazardHub(scene: Scene, name: string, parent: Mesh): void {
  const hub = MeshBuilder.CreateCylinder(name, { height: 0.1, diameter: 0.28, tessellation: 18 }, scene)
  const arbor = MeshBuilder.CreateTorus(`${name}-arbor`, { diameter: 0.34, thickness: 0.035, tessellation: 18 }, scene)

  hub.parent = parent
  hub.position.set(0, 0.085, 0)
  arbor.parent = parent
  arbor.position.set(0, 0.14, 0)
  arbor.rotation.x = Math.PI / 2
}

function createPitDetails(scene: Scene, name: string, parent: Mesh): void {
  const inner = MeshBuilder.CreateBox(`${name}-shadow`, { width: 0.88, height: 0.035, depth: 0.52 }, scene)
  const hinge = MeshBuilder.CreateCylinder(`${name}-hinge`, { height: 0.78, diameter: 0.05, tessellation: 8 }, scene)

  inner.parent = parent
  inner.position.set(0, 0.07, 0)
  hinge.parent = parent
  hinge.position.set(0, 0.12, 0.34)
  hinge.rotation.z = Math.PI / 2
}

function createOilSlickDetails(scene: Scene, name: string, parent: Mesh): void {
  for (let index = 0; index < 3; index += 1) {
    const ripple = MeshBuilder.CreateTorus(
      `${name}-ripple-${index}`,
      { diameter: 0.45 + index * 0.28, thickness: 0.025, tessellation: 22 },
      scene,
    )

    ripple.parent = parent
    ripple.position.set(index * 0.06 - 0.08, 0.085, index * -0.05 + 0.04)
    ripple.rotation.x = Math.PI / 2
  }
}

function createMagnetDetails(scene: Scene, name: string, parent: Mesh): void {
  for (const side of [-1, 1]) {
    const pole = MeshBuilder.CreateBox(
      `${name}-pole-${side}`,
      { width: 0.24, height: 0.18, depth: 0.46 },
      scene,
    )

    pole.parent = parent
    pole.position.set(side * 0.36, 0.04, 0)
  }
}

function createFlipperDetails(scene: Scene, name: string, parent: Mesh): void {
  const hinge = MeshBuilder.CreateCylinder(`${name}-hinge`, { height: 1.1, diameter: 0.08, tessellation: 10 }, scene)
  const ram = MeshBuilder.CreateBox(`${name}-ram`, { width: 0.18, height: 0.08, depth: 0.55 }, scene)
  const lip = MeshBuilder.CreateBox(`${name}-lip`, { width: 1.22, height: 0.075, depth: 0.12 }, scene)

  hinge.parent = parent
  hinge.position.set(0, 0.05, -0.38)
  hinge.rotation.z = Math.PI / 2
  ram.parent = parent
  ram.position.set(0, 0.06, 0.12)
  ram.rotation.x = -0.24
  lip.parent = parent
  lip.position.set(0, 0.06, 0.44)
}
