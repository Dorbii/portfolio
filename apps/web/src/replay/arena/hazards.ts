import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import {
  type ArenaConfig,
  type ArenaHazardDefinition,
} from '../../../../../packages/schemas/src/index.js'
import {
  compileArenaTopology,
  hazardCenter,
  hazardEffectKind,
} from '../../../../../packages/sim/src/arenaTopology.js'
import {
  createAnnularSectorMesh,
  createToothedBladeMesh,
} from '../rendering/bladeGeometry'
import type {
  ReplayEffectState,
  ReplayVisualFrame,
} from '../replayMapping'

export type BabylonHazardVisual = {
  blade?: TransformNode
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
        ...createSawHazard(
          scene,
          'hazard-default',
          0,
          0,
          'center',
        ),
        baseScale: 1,
        baseScaleZ: 1,
        spinSpeed: 24,
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
    const sawHazard = createSawHazard(
      scene,
      `hazard-${hazard.id}`,
      x,
      z,
      hazard.type,
    )

    return {
      kind: 'saw',
      label,
      ...sawHazard,
      baseScale: 1,
      baseScaleZ: sawHazard.mesh.scaling.z,
      spinSpeed: 26,
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
      spinSpeed: 3.2,
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
  updateHazardsAtTime(hazards, frame.time, frame.effects)
}

export function updateHazardsAtTime(
  hazards: BabylonHazardVisual[],
  time: number,
  effects: ReplayEffectState[] = [],
): void {
  hazards.forEach((hazard, index) => {
    const active = effects.find(
      (effect) =>
        effect.kind === 'hazard' &&
        effect.label !== undefined &&
        hazardsMatch(normalizeHazardLabel(effect.label), hazard.label),
    )
    const pulse = active ? 1 + (1 - active.age / 0.9) * 0.3 : 1
    const impactSpinBoost = effects.some((effect) => effect.kind === 'impact') ? 5.5 : 0

    hazard.mesh.position.y = 0.08 + (active ? active.intensity * 0.14 : 0)
    hazard.mesh.scaling.set(
      hazard.baseScale * pulse,
      hazard.baseScale * pulse,
      hazard.baseScaleZ * pulse,
    )

    if (hazard.kind === 'flipper') {
      hazard.mesh.rotation.x = active ? -active.intensity * 0.45 : 0
      hazard.mesh.rotation.z = Math.sin(time * 2 + index) * 0.015
    } else if (hazard.kind === 'saw') {
      hazard.mesh.rotation.set(0, 0, 0)
      if (hazard.blade) {
        hazard.blade.rotation.y = time * (hazard.spinSpeed + impactSpinBoost)
      }
    } else {
      hazard.mesh.rotation.y = hazard.spinSpeed > 0 ? time * hazard.spinSpeed : 0
      hazard.mesh.rotation.z = Math.sin(time * 2 + index) * 0.02
    }
  })
}

function hazardsMatch(left: string, right: string): boolean {
  return left.includes(right) || right.includes(left) || left === right
}

function normalizeHazardLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function createSawHazard(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  label: string,
): Pick<BabylonHazardVisual, 'blade' | 'mesh'> {
  const deck = MeshBuilder.CreateBox(
    name,
    { width: 1.62, height: 0.08, depth: 1.2 },
    scene,
  )
  const blade = new TransformNode(`${name}-blade-root`, scene)

  deck.position.set(x, 0.06, z)
  deck.metadata = { label, hazardMaterialSlot: 'base' }
  blade.parent = deck
  blade.position.set(0, 0.13, 0)
  createSawBlade(scene, `${name}-blade`, blade)
  createSawGuard(scene, `${name}-guard`, deck)
  createSawDeckDetails(scene, `${name}-deck`, deck)

  return { blade, mesh: deck }
}

function createSawBlade(scene: Scene, name: string, parent: TransformNode): void {
  const blade = markHazardMaterial(
    createToothedBladeMesh(scene, `${name}-toothed-disc`, 1.02, 0.08, 30, 0.24),
    'blade',
  )
  const hub = markHazardMaterial(
    MeshBuilder.CreateCylinder(`${name}-arbor-hub`, { height: 0.13, diameter: 0.28, tessellation: 18 }, scene),
    'hub',
  )
  const arbor = markHazardMaterial(
    MeshBuilder.CreateTorus(`${name}-arbor-ring`, { diameter: 0.38, thickness: 0.035, tessellation: 20 }, scene),
    'hub',
  )

  blade.parent = parent
  blade.rotation.z = Math.PI / 2
  hub.parent = parent
  hub.position.y = 0.035
  arbor.parent = parent
  arbor.position.y = 0.078
  arbor.rotation.x = Math.PI / 2

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const balanceSlot = markHazardMaterial(
      MeshBuilder.CreateBox(
        `${name}-balance-slot-${index}`,
        { width: 0.05, height: 0.02, depth: 0.42 },
        scene,
      ),
      'hub',
    )

    balanceSlot.parent = parent
    balanceSlot.position.y = 0.084
    balanceSlot.rotation.y = angle
  }
}

function createSawGuard(scene: Scene, name: string, parent: Mesh): void {
  const guard = markHazardMaterial(
    createAnnularSectorMesh(scene, `${name}-upper-cowl`, 1.4, 1.06, 0.11, Math.PI * 0.05, Math.PI * 0.95),
    'guard',
  )

  guard.parent = parent
  guard.position.set(0, 0.18, -0.04)
  guard.rotation.z = Math.PI / 2

  for (const side of [-1, 1]) {
    const mount = markHazardMaterial(
      MeshBuilder.CreateBox(
        `${name}-side-mount-${side}`,
        { width: 0.18, height: 0.15, depth: 0.44 },
        scene,
      ),
      'warning',
    )

    mount.parent = parent
    mount.position.set(side * 0.62, 0.14, -0.08)
    mount.rotation.z = side * 0.08
  }
}

function createSawDeckDetails(scene: Scene, name: string, parent: Mesh): void {
  for (const z of [-0.48, 0.48]) {
    const rail = markHazardMaterial(
      MeshBuilder.CreateBox(
        `${name}-recess-rail-${z > 0 ? 'front' : 'rear'}`,
        { width: 1.32, height: 0.025, depth: 0.045 },
        scene,
      ),
      'trim',
    )

    rail.parent = parent
    rail.position.set(0, 0.065, z)
  }

  for (let index = 0; index < 8; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const row = Math.floor(index / 2)
    const bolt = markHazardMaterial(
      MeshBuilder.CreateCylinder(
        `${name}-mount-bolt-${index}`,
        { height: 0.025, diameter: 0.055, tessellation: 10 },
        scene,
      ),
      'hub',
    )

    bolt.parent = parent
    bolt.position.set(side * 0.68, 0.075, -0.42 + row * 0.28)
  }

  for (const x of [-0.38, 0.38]) {
    const caution = markHazardMaterial(
      MeshBuilder.CreateBox(
        `${name}-caution-bar-${x > 0 ? 'right' : 'left'}`,
        { width: 0.32, height: 0.028, depth: 0.075 },
        scene,
      ),
      'warning',
    )

    caution.parent = parent
    caution.position.set(x, 0.078, 0.58)
  }
}

function markHazardMaterial<T extends Mesh>(mesh: T, slot: string): T {
  mesh.metadata = {
    ...(isObjectMetadata(mesh.metadata) ? mesh.metadata : {}),
    hazardMaterialSlot: slot,
  }

  return mesh
}

function isObjectMetadata(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
