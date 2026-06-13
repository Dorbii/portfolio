import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import { deterministicAngle } from '../rendering/sceneUtils'
import {
  cloneStandardMaterial,
  resolveReplayEffectPalette,
  tintStandardMaterial,
} from './effectPalette'
import type {
  EffectUpdateInput,
  ImpactEffectPartMetadata,
} from './types'

export function createPooledImpactBurstEffect(scene: Scene, name: string, material: StandardMaterial): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter: 0.38, segments: 12 }, scene)
  const sparkMaterial = cloneStandardMaterial(material, `${name}-spark-mat`, 0.88)

  mesh.material = sparkMaterial
  mesh.metadata = { impactEffectPart: 'core' }

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const spark = MeshBuilder.CreateBox(
      `${name}-spark-${index}`,
      { width: 0.06, height: 0.055, depth: 0.62 },
      scene,
    )

    spark.position.set(Math.sin(angle) * 0.22, 0, Math.cos(angle) * 0.22)
    spark.rotation.y = angle
    spark.parent = mesh
    spark.material = sparkMaterial
    spark.metadata = {
      impactEffectPart: 'spark',
      baseAngle: angle,
      baseDistance: 0.18 + (index % 3) * 0.04,
      baseLift: 0.18 + (index % 4) * 0.035,
      spin: 5.5 + (index % 5) * 0.8,
    }
  }

  mesh.setEnabled(false)

  return mesh
}

export function createPooledSparkBurstEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  sparkCount = 12,
): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter: 0.16, segments: 8 }, scene)
  const sparkMaterial = cloneStandardMaterial(material, `${name}-spark-mat`, 0.82)

  mesh.material = sparkMaterial
  mesh.metadata = { impactEffectPart: 'damage-core' }

  for (let index = 0; index < sparkCount; index += 1) {
    const angle = (Math.PI * 2 * index) / sparkCount
    const spark = MeshBuilder.CreateBox(
      `${name}-damage-spark-${index}`,
      { width: 0.045, height: 0.04, depth: 0.42 },
      scene,
    )

    spark.position.set(Math.sin(angle) * 0.14, 0, Math.cos(angle) * 0.14)
    spark.rotation.y = angle
    spark.parent = mesh
    spark.material = sparkMaterial
    spark.metadata = {
      impactEffectPart: 'damage-spark',
      baseAngle: angle,
      baseDistance: 0.18 + (index % 4) * 0.045,
      baseLift: 0.2 + (index % 5) * 0.04,
      spin: 6 + (index % 6) * 0.85,
    }
  }

  mesh.setEnabled(false)

  return mesh
}

export function createPooledStatusFlashEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: 0.42, height: 0.055, depth: 0.42 }, scene)
  const flashMaterial = cloneStandardMaterial(material, `${name}-flash-mat`, 0.58)

  mesh.material = flashMaterial
  mesh.metadata = { impactEffectPart: 'core' }

  for (let index = 0; index < 2; index += 1) {
    const bar = MeshBuilder.CreateBox(
      `${name}-bar-${index}`,
      { width: 0.82 - index * 0.14, height: 0.05, depth: 0.12 },
      scene,
    )

    bar.position.z = (index - 0.5) * 0.22
    bar.parent = mesh
    bar.material = flashMaterial
    bar.metadata = { impactEffectPart: 'status-bar', baseDistance: index }
  }

  mesh.setEnabled(false)

  return mesh
}

export function createPooledBox(
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

export function createPooledSphere(
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

export function updatePartDetachEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const palette = resolveReplayEffectPalette(effect.team, profiles)
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)

  tintStandardMaterial(mesh.material, palette.hot, palette.glow, 0.18 + effect.intensity * 0.2)
  mesh.position.y += 0.42 + progress * 0.32
  mesh.rotation.x = Math.sin(effect.age * 10) * 0.06
  mesh.rotation.y = effect.age * 1.4
  mesh.rotation.z = Math.sin(effect.age * 12) * 0.12
  mesh.scaling.setAll(0.9 + effect.intensity * 0.48)
  mesh.visibility = 0.36 + effect.intensity * 0.34
  updateSparkBurstParts(mesh, effect, palette, 0.82 + Math.min(effect.damage ?? 0, 18) / 42)
}

export function updateImpactEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const palette = resolveReplayEffectPalette(effect.team, profiles)
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)

  tintStandardMaterial(mesh.material, palette.hot, palette.glow)
  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as ImpactEffectPartMetadata | undefined

    if (metadata?.impactEffectPart === 'spark') {
      tintStandardMaterial(child.material, palette.hot, palette.glow)
      positionSparkChild(child, metadata, effect, progress, 0.82 + Math.min(effect.damage ?? 0, 18) / 44)
      child.scaling.set(0.66 + effect.intensity * 0.28, 0.66, 0.72 + progress * 1.05)
      child.visibility = 0.42 + effect.intensity * 0.5
    }
  })
  mesh.position.y += 0.42
  mesh.scaling.setAll(0.48 + effect.intensity * 1.18)
  mesh.rotation.y = effect.age * 7
}

export function updateDebrisEffect({ effect, mesh }: EffectUpdateInput): void {
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

export function updateDamageMarkerEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const palette = resolveReplayEffectPalette(effect.team, profiles)
  const severity = Math.min(effect.damage ?? 0, 28)
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)

  tintStandardMaterial(mesh.material, palette.hot, palette.glow, 0.18 + effect.intensity * 0.26)
  mesh.position.y += 0.56 + progress * 0.42
  mesh.scaling.setAll(0.78 + effect.intensity * (0.45 + severity / 50))
  mesh.rotation.x = Math.sin(effect.age * 10) * 0.04
  mesh.rotation.y = effect.age * 2.1
  mesh.visibility = 0.34 + effect.intensity * 0.38
  updateSparkBurstParts(mesh, effect, palette, 0.72 + severity / 34)
}

export function updateSmokeEffect({ effect, mesh }: EffectUpdateInput): void {
  const scale = 0.55 + effect.intensity * 0.72

  mesh.position.y += effect.age * 0.62
  mesh.scaling.setAll(scale)
  mesh.position.z += Math.sin(effect.age * 12) * 0.1
}

export function updateHazardEffect({ effect, mesh }: EffectUpdateInput): void {
  const pulse = 0.72 + effect.intensity * 0.52

  mesh.position.y = 0.14
  mesh.scaling.set(pulse, 0.8, pulse)
  mesh.rotation.x = 0
  mesh.rotation.y = effect.age * 0.7
  mesh.rotation.z = 0
  mesh.visibility = 0.34 + effect.intensity * 0.34
  updateStatusFlashParts(mesh, effect)
}

export function updateStabilityEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const palette = resolveReplayEffectPalette(effect.team, profiles)
  const pulse = 0.72 + effect.intensity * 0.5

  tintStandardMaterial(mesh.material, palette.soft, palette.glow, 0.28 + effect.intensity * 0.28)
  mesh.position.y = 0.22 + Math.sin(effect.age * 12) * 0.035
  mesh.scaling.set(pulse, 0.74 + effect.intensity * 0.18, pulse)
  mesh.rotation.x = 0
  mesh.rotation.y = Math.sin(effect.age * 8) * 0.12
  mesh.rotation.z = 0
  mesh.visibility = 0.36 + effect.intensity * 0.42
  mesh.getChildMeshes().forEach((child) => {
    tintStandardMaterial(child.material, palette.soft, palette.glow, 0.42 + effect.intensity * 0.24)
  })
  updateStatusFlashParts(mesh, effect)
}

export function updateKnockoutEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const palette = resolveReplayEffectPalette(effect.team, profiles)
  const pulse = 0.9 + Math.min(effect.age, 3) * 0.12

  tintStandardMaterial(mesh.material, palette.hot, palette.glow, 0.2 + effect.intensity * 0.18)
  mesh.position.y = 0.32 + Math.min(effect.age, 1.2) * 0.28
  mesh.scaling.setAll(pulse)
  mesh.rotation.x = Math.sin(effect.age * 8) * 0.08
  mesh.rotation.y = effect.age * 1.1
  mesh.visibility = 0.38 + effect.intensity * 0.32
  updateSparkBurstParts(mesh, effect, palette, 1.35)
}

function updateSparkBurstParts(
  mesh: Mesh,
  effect: EffectUpdateInput['effect'],
  palette: ReturnType<typeof resolveReplayEffectPalette>,
  spreadScale: number,
): void {
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)

  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as ImpactEffectPartMetadata | undefined

    if (!metadata?.impactEffectPart) {
      return
    }

    if (metadata.impactEffectPart === 'damage-spark') {
      tintStandardMaterial(child.material, palette.hot, palette.glow)
      positionSparkChild(child, metadata, effect, progress, spreadScale)
      child.scaling.set(0.62 + effect.intensity * 0.32, 0.62, 0.72 + progress * 1.18)
      child.visibility = 0.34 + effect.intensity * 0.54
      return
    }

  })
}

function positionSparkChild(
  child: AbstractMesh,
  metadata: ImpactEffectPartMetadata,
  effect: EffectUpdateInput['effect'],
  progress: number,
  spreadScale: number,
): void {
  const angle = metadata.baseAngle ?? deterministicAngle(child.name)
  const baseDistance = metadata.baseDistance ?? 0.18
  const distance = (baseDistance + progress * (0.48 + (effect.damage ?? 0) / 55)) * spreadScale
  const lift = (metadata.baseLift ?? 0.22) + progress * (0.42 + (effect.damage ?? 0) / 70)

  child.position.set(Math.sin(angle) * distance, lift, Math.cos(angle) * distance)
  child.rotation.x = effect.age * (metadata.spin ?? 6)
  child.rotation.y = angle
  child.rotation.z = Math.sin(effect.age * 10 + angle) * 0.35
}

function updateStatusFlashParts(mesh: Mesh, effect: EffectUpdateInput['effect']): void {
  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as ImpactEffectPartMetadata | undefined
    const offset = metadata?.baseDistance ?? 0

    if (metadata?.impactEffectPart !== 'status-bar') {
      return
    }

    child.position.y = 0.01 + Math.sin(effect.age * 9 + offset) * 0.018
    child.scaling.set(0.82 + effect.intensity * 0.34 + offset * 0.06, 1, 0.86 + effect.intensity * 0.12)
    child.visibility = 0.28 + effect.intensity * 0.46
  })
}
