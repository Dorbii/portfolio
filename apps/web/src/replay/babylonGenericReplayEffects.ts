import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import { deterministicAngle } from './babylonSceneUtils'
import type { EffectUpdateInput } from './babylonReplayEffectTypes'

export function createPooledImpactBurstEffect(scene: Scene, name: string, material: StandardMaterial): Mesh {
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

export function createPooledTorus(
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

export function updatePartDetachEffect({ effect, mesh }: EffectUpdateInput): void {
  mesh.position.y += 0.46
  mesh.rotation.x = Math.PI / 2
  mesh.rotation.y = effect.age * 3.8
  mesh.rotation.z = Math.sin(effect.age * 12) * 0.12
  mesh.scaling.setAll(1.02 + effect.intensity * 1.28)
  mesh.visibility = 0.42 + effect.intensity * 0.46
}

export function updateImpactEffect({ effect, mesh }: EffectUpdateInput): void {
  mesh.position.y += 0.58
  mesh.scaling.setAll(0.44 + effect.intensity * 1.35)
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

export function updateDamageMarkerEffect({ effect, mesh }: EffectUpdateInput): void {
  const pulse = 0.45 + effect.intensity * (0.72 + Math.min(effect.damage ?? 0, 18) / 36)

  mesh.position.y += 0.78 + effect.age * 0.35
  mesh.scaling.setAll(pulse)
  mesh.rotation.x = Math.PI / 2
  mesh.rotation.y = effect.age * 6
}

export function updateSmokeEffect({ effect, mesh }: EffectUpdateInput): void {
  const scale = 0.55 + effect.intensity * 0.72

  mesh.position.y += effect.age * 0.62
  mesh.scaling.setAll(scale)
  mesh.position.z += Math.sin(effect.age * 12) * 0.1
}

export function updateHazardEffect({ effect, mesh }: EffectUpdateInput): void {
  const pulse = 0.9 + effect.intensity * 0.9

  mesh.position.y = 0.12
  mesh.scaling.setAll(pulse)
  mesh.rotation.y = effect.age * 2.2
}

export function updateKnockoutEffect({ effect, mesh }: EffectUpdateInput): void {
  const pulse = 1 + Math.min(effect.age, 3) * 0.15

  mesh.position.y = 0.18
  mesh.scaling.setAll(pulse)
  mesh.rotation.x = effect.age * 1.8
}
