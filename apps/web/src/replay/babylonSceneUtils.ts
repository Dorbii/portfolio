import { PBRMetallicRoughnessMaterial } from '@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'
import type { Vector3 as ReplayVector3 } from '../../../../packages/schemas/src/index.js'

export function createSceneMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
  alpha = 1,
  specular = 0.16,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.specularColor = new Color3(specular, specular, Math.max(0.12, specular * 0.82))
  material.alpha = alpha
  material.backFaceCulling = alpha >= 1

  return material
}

export function createPbrSceneMaterial(
  scene: Scene,
  name: string,
  baseColor: string,
  emissive: string,
  metallic: number,
  roughness: number,
): PBRMetallicRoughnessMaterial {
  const material = new PBRMetallicRoughnessMaterial(name, scene)

  material.baseColor = Color3.FromHexString(baseColor)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.metallic = metallic
  material.roughness = roughness

  return material
}

export function toBabylonVector(vector: ReplayVector3): Vector3 {
  return new Vector3(vector[0], vector[1], vector[2])
}

export function deterministicAngle(value: string): number {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return (hash % 6283) / 1000
}

export function easeOutCubic(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1)

  return 1 - (1 - clamped) ** 3
}
