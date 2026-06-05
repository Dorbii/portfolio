import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type {
  ReplayEffectKind,
  ReplayEffectState,
} from './replayMapping'
import type { BotVisualProfile } from './replayVisualProfile'
import {
  createSceneMaterial,
  deterministicAngle,
  easeOutCubic,
  toBabylonVector,
} from './babylonSceneUtils'
import {
  createPooledControlNetEffect,
  createPooledDroneSwarmEffect,
  createPooledLaserLanceEffect,
  updateControlNetEffect,
  updateDroneSwarmEffect,
  updateLaserLanceEffect,
} from './babylonAbilityEffects'
import type {
  EffectCreateInput,
  EffectMaterials,
  EffectUpdateInput,
  WeaponEffectPartMetadata,
} from './babylonReplayEffectTypes'

export type EffectPool = Record<ReplayEffectKind, Mesh[]>

type EffectPoolDefinition = {
  capacity: number
  create: (input: EffectCreateInput) => Mesh
  update: (input: EffectUpdateInput) => void
}

const EFFECT_POOL_DEFINITIONS: Record<ReplayEffectKind, EffectPoolDefinition> = {
  weapon_fire: {
    capacity: 6,
    create: ({ index, materials, scene }) =>
      createPooledWeaponEffect(scene, `weapon-effect-${index}`, materials.weapon, materials.net),
    update: updateWeaponFireEffect,
  },
  control_net: {
    capacity: 4,
    create: ({ index, materials, scene }) =>
      createPooledControlNetEffect(scene, `control-net-effect-${index}`, materials.controlNet),
    update: updateControlNetEffect,
  },
  laser_lance: {
    capacity: 3,
    create: ({ index, materials, scene }) =>
      createPooledLaserLanceEffect(scene, `laser-lance-effect-${index}`, materials.laser, materials.laserGlow),
    update: updateLaserLanceEffect,
  },
  drone_swarm: {
    capacity: 3,
    create: ({ index, scene }) => createPooledDroneSwarmEffect(scene, `drone-swarm-effect-${index}`),
    update: updateDroneSwarmEffect,
  },
  part_detach: {
    capacity: 6,
    create: ({ index, materials, scene }) =>
      createPooledTorus(scene, `part-detach-effect-${index}`, materials.partDetach, 0.95),
    update: updatePartDetachEffect,
  },
  impact: {
    capacity: 12,
    create: ({ index, materials, scene }) =>
      createPooledImpactBurstEffect(scene, `impact-effect-${index}`, materials.spark),
    update: updateImpactEffect,
  },
  debris: {
    capacity: 24,
    create: ({ index, materials, scene }) =>
      createPooledBox(scene, `debris-effect-${index}`, materials.debris, [0.22, 0.1, 0.16]),
    update: updateDebrisEffect,
  },
  damage_marker: {
    capacity: 16,
    create: ({ index, materials, scene }) =>
      createPooledTorus(scene, `damage-marker-effect-${index}`, materials.damage, 1.25),
    update: updateDamageMarkerEffect,
  },
  smoke: {
    capacity: 10,
    create: ({ index, materials, scene }) =>
      createPooledSphere(scene, `smoke-effect-${index}`, materials.smoke, 0.48),
    update: updateSmokeEffect,
  },
  hazard: {
    capacity: 4,
    create: ({ index, materials, scene }) =>
      createPooledTorus(scene, `hazard-effect-${index}`, materials.hazard, 1.1),
    update: updateHazardEffect,
  },
  knockout: {
    capacity: 2,
    create: ({ index, materials, scene }) =>
      createPooledTorus(scene, `knockout-effect-${index}`, materials.knockout, 1.8),
    update: updateKnockoutEffect,
  },
}

export function createEffectPool(scene: Scene): EffectPool {
  const materials = createEffectMaterials(scene)

  return Object.fromEntries(
    Object.entries(EFFECT_POOL_DEFINITIONS).map(([kind, definition]) => [
      kind,
      Array.from({ length: definition.capacity }, (_, index) =>
        definition.create({ index, materials, scene }),
      ),
    ]),
  ) as EffectPool
}

export function updateEffects(
  pool: EffectPool,
  effects: ReplayEffectState[],
  profiles: Record<TeamRole, BotVisualProfile>,
): void {
  const used = Object.fromEntries(
    (Object.keys(EFFECT_POOL_DEFINITIONS) as ReplayEffectKind[]).map((kind) => [kind, 0]),
  ) as Record<ReplayEffectKind, number>

  Object.values(pool).flat().forEach((mesh) => mesh.setEnabled(false))

  effects.forEach((effect) => {
    const definition = EFFECT_POOL_DEFINITIONS[effect.kind]
    const mesh = pool[effect.kind][used[effect.kind]]

    if (!mesh) {
      return
    }

    used[effect.kind] += 1
    mesh.setEnabled(true)
    mesh.position = toBabylonVector(effect.position)
    definition.update({ effect, mesh, profiles })
  })
}

function createEffectMaterials(scene: Scene): EffectMaterials {
  return {
    controlNet: createSceneMaterial(scene, 'control-net-mat', '#b8ffff', '#1cf4ff', 0.88, 0.08),
    damage: createSceneMaterial(scene, 'damage-marker-mat', '#ff8b5d', '#ff2e2e'),
    debris: createSceneMaterial(scene, 'debris-mat', '#d2d6d2', '#3a403d'),
    hazard: createSceneMaterial(scene, 'hazard-flash-mat', '#ffcc4d', '#ff751f'),
    knockout: createSceneMaterial(scene, 'ko-mat', '#f4eef2', '#b83342'),
    laser: createSceneMaterial(scene, 'laser-lance-mat', '#fff8df', '#ff34d2', 1, 0.04),
    laserGlow: createSceneMaterial(scene, 'laser-lance-glow-mat', '#ffcf5b', '#ff4dd8', 0.5, 0.03),
    net: createSceneMaterial(scene, 'net-flash-mat', '#f5d47a', '#9d6c12', 0.82, 0.2),
    partDetach: createSceneMaterial(scene, 'part-detach-mat', '#ffe4a8', '#ff6b2e', 0.68, 0.08),
    smoke: createSceneMaterial(scene, 'smoke-mat', '#aeb8b4', '#151918', 0.42),
    spark: createSceneMaterial(scene, 'spark-mat', '#ffd35f', '#ff8a24'),
    weapon: createSceneMaterial(scene, 'weapon-flash-mat', '#f7f2b4', '#f7c24b'),
  }
}

function createPooledWeaponEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  netMaterial: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: 0.14, height: 0.14, depth: 1.25 }, scene)
  const muzzle = MeshBuilder.CreateTorus(
    `${name}-muzzle`,
    { diameter: 0.44, thickness: 0.04, tessellation: 18 },
    scene,
  )
  const netHoop = MeshBuilder.CreateTorus(
    `${name}-net-hoop`,
    { diameter: 1, thickness: 0.04, tessellation: 24 },
    scene,
  )

  mesh.material = material
  muzzle.material = material
  muzzle.parent = mesh
  muzzle.rotation.x = Math.PI / 2
  muzzle.position.z = 0.2
  muzzle.metadata = { weaponEffectPart: 'muzzle' }

  netHoop.material = netMaterial
  netHoop.parent = mesh
  netHoop.rotation.x = Math.PI / 2
  netHoop.position.z = 0.34
  netHoop.metadata = { weaponEffectPart: 'net-hoop', baseX: 0, baseY: 0 }

  for (let index = -2; index <= 2; index += 1) {
    const vertical = MeshBuilder.CreateBox(
      `${name}-net-vertical-${index + 2}`,
      { width: 0.035, height: 0.82, depth: 0.025 },
      scene,
    )
    const horizontal = MeshBuilder.CreateBox(
      `${name}-net-horizontal-${index + 2}`,
      { width: 0.82, height: 0.035, depth: 0.025 },
      scene,
    )

    vertical.position.set(index * 0.16, 0, 0.34)
    horizontal.position.set(0, index * 0.14, 0.34)
    vertical.parent = mesh
    horizontal.parent = mesh
    vertical.material = netMaterial
    horizontal.material = netMaterial
    vertical.metadata = { weaponEffectPart: 'net-strand', baseX: vertical.position.x, baseY: vertical.position.y }
    horizontal.metadata = { weaponEffectPart: 'net-strand', baseX: horizontal.position.x, baseY: horizontal.position.y }
  }

  const weights: Array<[number, number]> = [
    [-0.42, -0.36],
    [0.42, -0.36],
    [-0.42, 0.36],
    [0.42, 0.36],
  ]

  weights.forEach(([x, y], index) => {
    const weight = MeshBuilder.CreateSphere(
      `${name}-net-weight-${index}`,
      { diameter: 0.11, segments: 8 },
      scene,
    )

    weight.position.set(x, y, 0.34)
    weight.parent = mesh
    weight.material = netMaterial
    weight.metadata = { weaponEffectPart: 'net-weight', baseX: x, baseY: y }
  })

  mesh.setEnabled(false)

  return mesh
}

function createPooledImpactBurstEffect(scene: Scene, name: string, material: StandardMaterial): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter: 0.38, segments: 12 }, scene)

  mesh.material = material

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const spark = MeshBuilder.CreateBox(
      `${name}-spark-${index}`,
      { width: 0.07, height: 0.07, depth: 0.58 },
      scene,
    )

    spark.position.set(Math.sin(angle) * 0.26, 0, Math.cos(angle) * 0.26)
    spark.rotation.y = angle
    spark.parent = mesh
    spark.material = material
  }

  mesh.setEnabled(false)

  return mesh
}

function createPooledBox(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  size: [number, number, number],
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene)

  mesh.material = material
  mesh.setEnabled(false)

  return mesh
}

function createPooledSphere(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  diameter: number,
): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 12 }, scene)

  mesh.material = material
  mesh.setEnabled(false)

  return mesh
}

function createPooledTorus(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  diameter: number,
): Mesh {
  const mesh = MeshBuilder.CreateTorus(name, { diameter, thickness: 0.055, tessellation: 30 }, scene)

  mesh.material = material
  mesh.setEnabled(false)

  return mesh
}

function updateWeaponFireEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const profile = effect.team ? profiles[effect.team] : undefined
  const weaponStyle = profile?.primaryWeapon ?? 'generic'
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
  const heading = effect.rotationY ?? (effect.team === 'blue' ? -Math.PI / 2 : Math.PI / 2)

  mesh.visibility = 1
  mesh.position.y += 0.25
  mesh.rotation.x = 0
  mesh.rotation.y = heading
  mesh.rotation.z = 0
  setWeaponEffectMode(mesh, weaponStyle, progress)

  if (weaponStyle === 'net') {
    const travel = 0.55 + easeOutCubic(progress) * 2.55
    const lift = Math.sin(progress * Math.PI) * 0.58

    mesh.position.x += Math.sin(heading) * travel
    mesh.position.z += Math.cos(heading) * travel
    mesh.position.y += 0.42 + lift
    mesh.scaling.set(1.1 + progress * 0.54, 1.1 + progress * 0.54, 0.46 + progress * 0.55)
    mesh.rotation.z = Math.sin(effect.age * 11) * 0.18
    mesh.visibility = 0.7

    return
  }

  if (weaponStyle === 'turret') {
    mesh.scaling.set(0.42, 0.42, 0.88 + effect.intensity * 1.8)
    mesh.position.y += 0.12
    mesh.rotation.y = heading + (effect.team === 'blue' ? -1 : 1) * effect.intensity * 0.18

    return
  }

  if (weaponStyle === 'spinner') {
    mesh.scaling.set(0.34 + effect.intensity * 0.8, 0.34 + effect.intensity * 0.8, 0.62)
    mesh.rotation.z = effect.age * 14

    return
  }

  mesh.scaling.setAll(0.2 + effect.intensity * 1.1)
}

function updatePartDetachEffect({ effect, mesh }: EffectUpdateInput): void {
  mesh.position.y += 0.34
  mesh.rotation.x = Math.PI / 2
  mesh.rotation.y = effect.age * 3.2
  mesh.rotation.z = Math.sin(effect.age * 12) * 0.08
  mesh.scaling.setAll(0.82 + effect.intensity * 1.05)
  mesh.visibility = 0.28 + effect.intensity * 0.38
}

function updateImpactEffect({ effect, mesh }: EffectUpdateInput): void {
  mesh.position.y += 0.58
  mesh.scaling.setAll(0.44 + effect.intensity * 1.35)
  mesh.rotation.y = effect.age * 7
}

function updateDebrisEffect({ effect, mesh }: EffectUpdateInput): void {
  const angle = deterministicAngle(effect.id)
  const distance = effect.age * (1.5 + (effect.damage ?? 0) / 18)

  mesh.position.x += Math.cos(angle) * distance
  mesh.position.z += Math.sin(angle) * distance
  mesh.position.y += 0.38 + effect.age * 1.2 - effect.age * effect.age * 0.28
  mesh.scaling.setAll(0.72 + effect.intensity * 0.45)
  mesh.rotation.x = effect.age * 5 + angle
  mesh.rotation.y = effect.age * 7
  mesh.rotation.z = effect.age * 3.5 + angle / 2
}

function updateDamageMarkerEffect({ effect, mesh }: EffectUpdateInput): void {
  const pulse = 0.45 + effect.intensity * (0.72 + Math.min(effect.damage ?? 0, 18) / 36)

  mesh.position.y += 0.78 + effect.age * 0.35
  mesh.scaling.setAll(pulse)
  mesh.rotation.x = Math.PI / 2
  mesh.rotation.y = effect.age * 6
}

function updateSmokeEffect({ effect, mesh }: EffectUpdateInput): void {
  const scale = 0.55 + effect.intensity * 0.72

  mesh.position.y += effect.age * 0.62
  mesh.scaling.setAll(scale)
  mesh.position.z += Math.sin(effect.age * 12) * 0.1
}

function updateHazardEffect({ effect, mesh }: EffectUpdateInput): void {
  const pulse = 0.9 + effect.intensity * 0.9

  mesh.position.y = 0.12
  mesh.scaling.setAll(pulse)
  mesh.rotation.y = effect.age * 2.2
}

function updateKnockoutEffect({ effect, mesh }: EffectUpdateInput): void {
  const pulse = 1 + Math.min(effect.age, 3) * 0.15

  mesh.position.y = 0.18
  mesh.scaling.setAll(pulse)
  mesh.rotation.x = effect.age * 1.8
}

function setWeaponEffectMode(mesh: Mesh, mode: BotVisualProfile['primaryWeapon'], progress: number): void {
  const showNet = mode === 'net'
  const showMuzzle = mode === 'turret' || mode === 'spinner' || mode === 'generic'
  const spread = 0.78 + easeOutCubic(progress) * 0.72
  const bow = Math.sin(progress * Math.PI) * 0.14

  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as WeaponEffectPartMetadata | undefined
    const part = metadata?.weaponEffectPart

    if (!part) {
      return
    }

    if (part === 'muzzle') {
      child.setEnabled(showMuzzle)
      return
    }

    child.setEnabled(showNet)

    if (!showNet) {
      return
    }

    child.position.x = (metadata.baseX ?? child.position.x) * spread
    child.position.y = (metadata.baseY ?? child.position.y) * spread
    child.position.z = 0.34 + bow

    if (part === 'net-hoop') {
      child.scaling.setAll(0.85 + progress * 0.28)
    } else if (part === 'net-weight') {
      child.scaling.setAll(1 + progress * 0.35)
    } else {
      child.scaling.setAll(0.92 + progress * 0.18)
    }
  })
}
