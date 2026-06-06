import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type {
  ReplayEffectKind,
  ReplayEffectState,
} from './replayMapping'
import type { BotPartNodeMetadata } from './babylonPartRenderer'
import type { BotVisualProfile } from './replayVisualProfile'
import {
  createSceneMaterial,
  easeOutCubic,
  toBabylonVector,
} from './babylonSceneUtils'
import {
  cloneStandardMaterial,
  resolveReplayEffectPalette,
  tintStandardMaterial,
} from './babylonEffectPalette'
import {
  createPooledControlNetEffect,
  createPooledDroneSwarmEffect,
  createPooledLaserLanceEffect,
  updateControlNetEffect,
  updateDroneSwarmEffect,
  updateLaserLanceEffect,
} from './babylonAbilityEffects'
import {
  createPooledBox,
  createPooledImpactBurstEffect,
  createPooledSphere,
  createPooledTorus,
  updateDamageMarkerEffect,
  updateDebrisEffect,
  updateHazardEffect,
  updateImpactEffect,
  updateKnockoutEffect,
  updatePartDetachEffect,
  updateSmokeEffect,
} from './babylonGenericReplayEffects'
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
      createPooledTorus(scene, `part-detach-effect-${index}`, materials.partDetach, 1.12),
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
  bots?: Record<TeamRole, TransformNode>,
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
    definition.update({ bots, effect, mesh, profiles })
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
    partDetach: createSceneMaterial(scene, 'part-detach-mat', '#fff0b8', '#ff7f2a', 0.82, 0.08),
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
  const mesh = MeshBuilder.CreateBox(name, { width: 0.04, height: 0.04, depth: 0.04 }, scene)
  const tracerCore = MeshBuilder.CreateBox(
    `${name}-tracer-core`,
    { width: 0.08, height: 0.06, depth: 1.22 },
    scene,
  )
  const tracerGlow = MeshBuilder.CreateBox(
    `${name}-tracer-glow`,
    { width: 0.24, height: 0.16, depth: 1.38 },
    scene,
  )
  const tracerTip = MeshBuilder.CreateSphere(
    `${name}-tracer-tip`,
    { diameter: 0.18, segments: 10 },
    scene,
  )
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

  const carrierMaterial = cloneStandardMaterial(material, `${name}-carrier-mat`, 0)
  const tracerMaterial = cloneStandardMaterial(material, `${name}-tracer-mat`)
  const tracerGlowMaterial = cloneStandardMaterial(material, `${name}-tracer-glow-mat`, 0.42)
  const netEffectMaterial = cloneStandardMaterial(netMaterial, `${name}-net-mat`, 0.76)

  mesh.material = carrierMaterial
  tracerCore.parent = mesh
  tracerCore.material = tracerMaterial
  tracerCore.metadata = { weaponEffectPart: 'tracer-core' }

  tracerGlow.parent = mesh
  tracerGlow.material = tracerGlowMaterial
  tracerGlow.metadata = { weaponEffectPart: 'tracer-glow' }

  tracerTip.position.z = 0.66
  tracerTip.parent = mesh
  tracerTip.material = tracerMaterial
  tracerTip.metadata = { weaponEffectPart: 'tracer-tip' }

  muzzle.material = tracerMaterial
  muzzle.parent = mesh
  muzzle.rotation.x = Math.PI / 2
  muzzle.position.z = -0.5
  muzzle.metadata = { weaponEffectPart: 'muzzle' }

  netHoop.material = netEffectMaterial
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
    vertical.material = netEffectMaterial
    horizontal.material = netEffectMaterial
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
    weight.material = netEffectMaterial
    weight.metadata = { weaponEffectPart: 'net-weight', baseX: x, baseY: y }
  })

  mesh.setEnabled(false)

  return mesh
}

function updateWeaponFireEffect({ bots, effect, mesh, profiles }: EffectUpdateInput): void {
  const profile = effect.team ? profiles[effect.team] : undefined
  const palette = resolveReplayEffectPalette(effect.team, profiles)
  const weaponStyle = resolveWeaponStyle(effect.weaponStyle, profile)
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
  const heading = effect.rotationY ?? (effect.team === 'blue' ? -Math.PI / 2 : Math.PI / 2)
  const phase = effect.weaponPhase ?? 'release'
  const sourceAnchor = resolveSourceAnchor(effect, bots)

  mesh.visibility = 1
  if (sourceAnchor) {
    mesh.position.copyFrom(sourceAnchor)
  }
  mesh.position.y += 0.25
  mesh.rotation.x = 0
  mesh.rotation.y = heading
  mesh.rotation.z = 0
  applyWeaponEffectPalette(mesh, palette)
  setWeaponEffectMode(mesh, weaponStyle, progress, effect.intensity)

  if (weaponStyle === 'net') {
    const travel = 0.55 + easeOutCubic(progress) * 2.55
    const lift = Math.sin(progress * Math.PI) * 0.58

    mesh.position.x += Math.sin(heading) * travel
    mesh.position.z += Math.cos(heading) * travel
    mesh.position.y += 0.42 + lift
    mesh.scaling.set(1.22 + progress * 0.64, 1.22 + progress * 0.64, 0.54 + progress * 0.64)
    mesh.rotation.z = Math.sin(effect.age * 11) * 0.18
    mesh.visibility = 0.82

    return
  }

  if (weaponStyle === 'ram') {
    const lunge = phase === 'wind_up' ? 0.18 : 0.45 + easeOutCubic(progress) * 0.85

    mesh.position.x += Math.sin(heading) * lunge
    mesh.position.z += Math.cos(heading) * lunge
    mesh.position.y += 0.04
    mesh.scaling.set(0.66 + effect.intensity * 0.28, 0.3 + effect.intensity * 0.12, 1.12 + effect.intensity * 1.4)

    return
  }

  if (weaponStyle === 'flipper') {
    const lift = Math.sin(Math.min(1, progress * 1.15) * Math.PI) * 0.48

    mesh.position.x += Math.sin(heading) * (0.34 + progress * 0.74)
    mesh.position.z += Math.cos(heading) * (0.34 + progress * 0.74)
    mesh.position.y += lift
    mesh.rotation.x = -0.65 - lift * 0.55
    mesh.scaling.set(0.82, 0.24 + effect.intensity * 0.24, 1.22 + effect.intensity * 0.92)

    return
  }

  if (weaponStyle === 'turret') {
    const start = mesh.position.clone()
    const end = effect.endPosition ? toBabylonVector(effect.endPosition) : null
    const tracerReach = end ? Math.min(5.2, Vector3.Distance(start, end)) : 2.6

    if (end) {
      const midpoint = Vector3.Center(start, end)

      mesh.position.set(midpoint.x, start.y + 0.08, midpoint.z)
      mesh.rotation.y = Math.atan2(end.x - start.x, end.z - start.z)
    }

    mesh.scaling.set(0.58, 0.58, 0.7 + tracerReach * 0.7)
    mesh.position.y += 0.12
    mesh.rotation.z = Math.sin(effect.age * 20) * 0.02

    return
  }

  if (weaponStyle === 'spinner' || weaponStyle === 'saw') {
    const bladeScale = weaponStyle === 'saw' ? 1.15 : 0.94

    mesh.scaling.set(0.38 + effect.intensity * bladeScale, 0.38 + effect.intensity * bladeScale, 0.42)
    mesh.rotation.x = weaponStyle === 'saw' ? Math.PI / 2 : 0
    mesh.rotation.z = effect.age * (weaponStyle === 'saw' ? 24 : 16)

    return
  }

  mesh.position.x += Math.sin(heading) * (0.2 + progress * 0.32)
  mesh.position.z += Math.cos(heading) * (0.2 + progress * 0.32)
  mesh.scaling.setAll(0.34 + effect.intensity * 1.32)
}

function resolveWeaponStyle(
  effectStyle: string | undefined,
  profile: BotVisualProfile | undefined,
): string {
  if (effectStyle) {
    return effectStyle
  }

  return profile?.primaryWeapon ?? 'generic'
}

function resolveSourceAnchor(
  effect: ReplayEffectState,
  bots: Record<TeamRole, TransformNode> | undefined,
): Vector3 | undefined {
  if (!effect.team || !effect.sourceBlockId) {
    return undefined
  }

  const bot = bots?.[effect.team]

  if (!bot) {
    return undefined
  }

  const node = bot.getChildren((candidate) => {
    const metadata = candidate.metadata as BotPartNodeMetadata | undefined

    return metadata?.kind === 'bot_part' && metadata.blockId === effect.sourceBlockId
  }, true)[0] as TransformNode | undefined

  return node?.getAbsolutePosition().clone()
}

function applyWeaponEffectPalette(
  mesh: Mesh,
  palette: ReturnType<typeof resolveReplayEffectPalette>,
): void {
  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as WeaponEffectPartMetadata | undefined

    if (!metadata?.weaponEffectPart) {
      return
    }

    if (metadata.weaponEffectPart === 'tracer-glow') {
      tintStandardMaterial(child.material, palette.soft, palette.glow, 0.38)
      return
    }

    if (metadata.weaponEffectPart.startsWith('net-')) {
      tintStandardMaterial(child.material, palette.soft, palette.accent, 0.72)
      return
    }

    tintStandardMaterial(child.material, palette.hot, palette.glow)
  })
}

function setWeaponEffectMode(mesh: Mesh, mode: string, progress: number, intensity: number): void {
  const showNet = mode === 'net'
  const showTracer = !showNet
  const spread = 0.78 + easeOutCubic(progress) * 0.72
  const bow = Math.sin(progress * Math.PI) * 0.14

  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as WeaponEffectPartMetadata | undefined
    const part = metadata?.weaponEffectPart

    if (!part) {
      return
    }

    if (part === 'muzzle' || part === 'tracer-core' || part === 'tracer-glow' || part === 'tracer-tip') {
      child.setEnabled(showTracer)

      if (showTracer) {
        if (part === 'muzzle') {
          child.scaling.setAll(0.78 + intensity * 0.42)
          child.visibility = 0.35 + intensity * 0.45
        } else if (part === 'tracer-glow') {
          child.scaling.set(1, 0.92, 0.78 + intensity * 0.28)
          child.visibility = 0.36 + intensity * 0.28
        } else if (part === 'tracer-tip') {
          child.scaling.setAll(0.78 + intensity * 0.3)
          child.visibility = 0.74 + intensity * 0.26
        } else {
          child.scaling.set(1, 1, 0.82 + intensity * 0.42)
          child.visibility = 0.86
        }
      }

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
