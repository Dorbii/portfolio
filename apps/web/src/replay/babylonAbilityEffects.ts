import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import {
  createSceneMaterial,
  easeOutCubic,
  toBabylonVector,
} from './babylonSceneUtils'
import type {
  DroneEffectPartMetadata,
  EffectUpdateInput,
} from './babylonReplayEffectTypes'
import type { ReplayEffectState } from './replayMapping'

export function createPooledControlNetEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateTorus(
    name,
    { diameter: 1.8, thickness: 0.075, tessellation: 36 },
    scene,
  )

  mesh.material = material
  mesh.rotation.x = Math.PI / 2

  for (let index = -2; index <= 2; index += 1) {
    const vertical = MeshBuilder.CreateBox(
      `${name}-vertical-${index + 2}`,
      { width: 0.035, height: 1.54, depth: 0.035 },
      scene,
    )
    const horizontal = MeshBuilder.CreateBox(
      `${name}-horizontal-${index + 2}`,
      { width: 1.54, height: 0.035, depth: 0.035 },
      scene,
    )

    vertical.position.set(index * 0.28, 0, 0)
    horizontal.position.set(0, index * 0.28, 0)
    vertical.parent = mesh
    horizontal.parent = mesh
    vertical.material = material
    horizontal.material = material
  }

  const cornerOffsets: Array<[number, number]> = [
    [-0.82, -0.82],
    [0.82, -0.82],
    [-0.82, 0.82],
    [0.82, 0.82],
  ]

  cornerOffsets.forEach(([x, z], index) => {
    const anchor = MeshBuilder.CreateSphere(
      `${name}-anchor-${index}`,
      { diameter: 0.16, segments: 10 },
      scene,
    )

    anchor.position.set(x, 0, z)
    anchor.parent = mesh
    anchor.material = material
  })

  mesh.setEnabled(false)

  return mesh
}

export function createPooledLaserLanceEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  glowMaterial: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(
    name,
    { width: 0.26, height: 0.18, depth: 1 },
    scene,
  )
  const glow = MeshBuilder.CreateBox(
    `${name}-glow`,
    { width: 1.05, height: 0.44, depth: 1.04 },
    scene,
  )
  const startNode = MeshBuilder.CreateSphere(
    `${name}-start-node`,
    { diameter: 0.36, segments: 12 },
    scene,
  )
  const endNode = MeshBuilder.CreateSphere(
    `${name}-end-node`,
    { diameter: 0.42, segments: 12 },
    scene,
  )
  const hotCore = MeshBuilder.CreateBox(
    `${name}-hot-core`,
    { width: 0.08, height: 0.52, depth: 1.08 },
    scene,
  )

  mesh.material = material
  glow.material = glowMaterial
  glow.parent = mesh
  startNode.position.z = -0.5
  endNode.position.z = 0.5
  startNode.parent = mesh
  endNode.parent = mesh
  startNode.material = material
  endNode.material = material
  hotCore.parent = mesh
  hotCore.material = material
  mesh.setEnabled(false)

  return mesh
}

export function createPooledDroneSwarmEffect(scene: Scene, name: string): Mesh {
  const bodyMaterial = createSceneMaterial(scene, `${name}-body-mat`, '#263238', '#071113')
  const accentMaterial = createSceneMaterial(scene, `${name}-accent-mat`, '#dfff75', '#8cff2a', 1, 0.04)
  const scanMaterial = createSceneMaterial(scene, `${name}-scan-mat`, '#e8ffb0', '#75ff47', 0.44, 0.03)
  const trailMaterial = createSceneMaterial(scene, `${name}-trail-mat`, '#b8fff0', '#4dffc3', 0.5, 0.03)
  const mesh = MeshBuilder.CreateBox(name, { width: 0.24, height: 0.16, depth: 0.24 }, scene)

  mesh.material = bodyMaterial

  for (let index = 0; index < 3; index += 1) {
    const angle = (Math.PI * 2 * index) / 3
    const x = Math.cos(angle) * 0.72
    const z = Math.sin(angle) * 0.72
    const tangent = angle + Math.PI / 2
    const pod = MeshBuilder.CreateBox(
      `${name}-pod-${index}`,
      { width: 0.54, height: 0.22, depth: 0.42 },
      scene,
    )
    const rotor = MeshBuilder.CreateTorus(
      `${name}-rotor-${index}`,
      { diameter: 0.5, thickness: 0.045, tessellation: 20 },
      scene,
    )
    const sensor = MeshBuilder.CreateSphere(
      `${name}-sensor-${index}`,
      { diameter: 0.14, segments: 8 },
      scene,
    )
    const trail = MeshBuilder.CreateBox(
      `${name}-trail-${index}`,
      { width: 0.08, height: 0.055, depth: 0.78 },
      scene,
    )

    pod.position.set(x, 0, z)
    pod.rotation.y = tangent
    pod.parent = mesh
    pod.material = bodyMaterial
    pod.metadata = { droneEffectPart: 'pod', droneIndex: index }

    rotor.position.set(x, 0.18, z)
    rotor.rotation.x = Math.PI / 2
    rotor.parent = mesh
    rotor.material = accentMaterial
    rotor.metadata = { droneEffectPart: 'rotor', droneIndex: index }

    sensor.position.set(x + Math.cos(angle) * 0.18, -0.02, z + Math.sin(angle) * 0.18)
    sensor.parent = mesh
    sensor.material = accentMaterial
    sensor.metadata = { droneEffectPart: 'sensor', droneIndex: index }

    trail.position.set(x - Math.cos(angle) * 0.32, -0.02, z - Math.sin(angle) * 0.32)
    trail.rotation.y = tangent
    trail.parent = mesh
    trail.material = trailMaterial
    trail.metadata = { droneEffectPart: 'trail', droneIndex: index }
  }

  const scanCone = MeshBuilder.CreateCylinder(
    `${name}-scan-cone`,
    { height: 1.45, diameterTop: 0.18, diameterBottom: 1.15, tessellation: 18 },
    scene,
  )
  const scanRing = MeshBuilder.CreateTorus(
    `${name}-scan-ring`,
    { diameter: 1.42, thickness: 0.055, tessellation: 30 },
    scene,
  )

  scanCone.position.y = -0.68
  scanCone.parent = mesh
  scanCone.material = scanMaterial
  scanCone.metadata = { droneEffectPart: 'scan' }
  scanRing.position.y = -1.25
  scanRing.rotation.x = Math.PI / 2
  scanRing.parent = mesh
  scanRing.material = scanMaterial
  scanRing.metadata = { droneEffectPart: 'scan' }
  mesh.setEnabled(false)

  return mesh
}

export function updateControlNetEffect({ effect, mesh }: EffectUpdateInput): void {
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
  const target = effect.endPosition ? toBabylonVector(effect.endPosition) : toBabylonVector(effect.position)

  mesh.position = target
  mesh.position.y = 0.22 + Math.sin(progress * Math.PI) * 0.16
  mesh.rotation.x = Math.PI / 2
  mesh.rotation.y = (effect.rotationY ?? 0) + effect.age * 2.8
  mesh.rotation.z = 0
  mesh.scaling.setAll(1.1 + easeOutCubic(progress) * 1.45 + effect.intensity * 0.28)
  mesh.visibility = 0.72 + effect.intensity * 0.28
}

export function updateLaserLanceEffect({ effect, mesh }: EffectUpdateInput): void {
  const start = toBabylonVector(effect.position)
  const end = effect.endPosition ? toBabylonVector(effect.endPosition) : start
  const midpoint = Vector3.Center(start, end)
  const length = Math.max(0.2, Vector3.Distance(start, end))
  const dx = end.x - start.x
  const dz = end.z - start.z
  const heading = Math.abs(dx) + Math.abs(dz) < 0.001
    ? effect.rotationY ?? 0
    : Math.atan2(dx, dz)
  const pulse = 0.24 + effect.intensity * 0.32

  mesh.position.set(midpoint.x, 0.9 + Math.sin(effect.age * 18) * 0.04, midpoint.z)
  mesh.rotation.x = 0
  mesh.rotation.y = heading
  mesh.rotation.z = Math.sin(effect.age * 22) * 0.035
  mesh.scaling.set(pulse, 0.88 + effect.intensity * 0.34, length)
  mesh.visibility = 0.76 + effect.intensity * 0.24
}

export function updateDroneSwarmEffect({ effect, mesh }: EffectUpdateInput): void {
  const start = toBabylonVector(effect.position)
  const end = effect.endPosition ? toBabylonVector(effect.endPosition) : start
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
  const travel = easeOutCubic(Math.min(progress / 0.62, 1))
  const position = Vector3.Lerp(start, end, travel)
  const orbit = effect.age * 4.2 + progress * Math.PI
  const pulse = 1.1 + Math.sin(effect.age * 16) * 0.06 + effect.intensity * 0.16

  mesh.position.set(position.x, 1.26 + Math.sin(progress * Math.PI) * 0.56, position.z)
  mesh.rotation.x = Math.sin(effect.age * 7) * 0.04
  mesh.rotation.y = orbit
  mesh.rotation.z = Math.cos(effect.age * 6) * 0.04
  mesh.scaling.setAll(pulse)
  mesh.visibility = 0.86 + effect.intensity * 0.14
  updateDroneSwarmParts(mesh, effect, progress)
}

function updateDroneSwarmParts(mesh: Mesh, effect: ReplayEffectState, progress: number): void {
  const teamColor = effect.team === 'red'
    ? Color3.FromHexString('#ff4f5f')
    : Color3.FromHexString('#58b7ff')
  const teamGlow = effect.team === 'red'
    ? Color3.FromHexString('#ff2c42')
    : Color3.FromHexString('#1f8fff')

  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as DroneEffectPartMetadata | undefined

    if (!metadata?.droneEffectPart) {
      return
    }

    if (child.material instanceof StandardMaterial) {
      if (metadata.droneEffectPart === 'rotor' || metadata.droneEffectPart === 'sensor') {
        child.material.diffuseColor = teamColor
        child.material.emissiveColor = teamGlow
      }

      if (metadata.droneEffectPart === 'scan') {
        child.material.diffuseColor = Color3.FromHexString('#d5ff8a')
        child.material.emissiveColor = Color3.FromHexString('#6dff40')
      }
    }

    if (metadata.droneEffectPart === 'rotor') {
      child.rotation.y = effect.age * 26 + (metadata.droneIndex ?? 0) * 0.8
      child.scaling.setAll(0.86 + effect.intensity * 0.26)
    }

    if (metadata.droneEffectPart === 'pod') {
      const bob = Math.sin(effect.age * 12 + (metadata.droneIndex ?? 0) * 1.8) * 0.05

      child.position.y = bob
    }

    if (metadata.droneEffectPart === 'trail') {
      child.visibility = Math.max(0.16, effect.intensity * 0.48)
      child.scaling.set(0.82, 0.82, 0.68 + progress * 0.7)
    }

    if (metadata.droneEffectPart === 'scan') {
      const scanPulse = 0.76 + Math.sin(effect.age * 10) * 0.12 + progress * 0.36

      child.visibility = 0.2 + effect.intensity * 0.32
      child.scaling.set(scanPulse, 0.82 + effect.intensity * 0.22, scanPulse)
    }
  })
}
