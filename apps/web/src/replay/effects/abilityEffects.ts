import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import {
  createSceneMaterial,
  easeOutCubic,
  toBabylonVector,
} from '../rendering/sceneUtils'
import {
  cloneStandardMaterial,
  resolveReplayEffectPalette,
  tintStandardMaterial,
} from './effectPalette'
import type {
  DroneEffectPartMetadata,
  EffectUpdateInput,
} from './types'
import type { ReplayEffectState } from '../replayMapping'

export function createPooledControlNetEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: 0.04, height: 0.04, depth: 0.04 }, scene)
  const carrierMaterial = cloneStandardMaterial(material, `${name}-carrier-mat`, 0)
  const netMaterial = cloneStandardMaterial(material, `${name}-mat`, 0.72)

  mesh.material = carrierMaterial
  mesh.rotation.x = Math.PI / 2

  const centerKnot = MeshBuilder.CreateSphere(
    `${name}-center-knot`,
    { diameter: 0.16, segments: 10 },
    scene,
  )

  centerKnot.parent = mesh
  centerKnot.material = netMaterial

  const frameSegments: Array<[string, [number, number, number], [number, number, number]]> = [
    ['top', [0, 0.84, 0], [1.72, 0.045, 0.035]],
    ['bottom', [0, -0.84, 0], [1.72, 0.045, 0.035]],
    ['left', [-0.84, 0, 0], [0.045, 1.72, 0.035]],
    ['right', [0.84, 0, 0], [0.045, 1.72, 0.035]],
  ]

  frameSegments.forEach(([slot, position, size]) => {
    const segment = MeshBuilder.CreateBox(
      `${name}-frame-${slot}`,
      { width: size[0], height: size[1], depth: size[2] },
      scene,
    )

    segment.position.set(position[0], position[1], position[2])
    segment.parent = mesh
    segment.material = netMaterial
  })

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const tether = MeshBuilder.CreateBox(
      `${name}-tether-${index}`,
      { width: 0.62, height: 0.038, depth: 0.03 },
      scene,
    )
    const clamp = MeshBuilder.CreateBox(
      `${name}-clamp-${index}`,
      { width: 0.18, height: 0.07, depth: 0.045 },
      scene,
    )

    tether.position.set(Math.cos(angle) * 0.34, Math.sin(angle) * 0.34, 0)
    tether.rotation.z = angle
    tether.parent = mesh
    tether.material = netMaterial
    clamp.position.set(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0)
    clamp.rotation.z = angle + Math.PI / 2
    clamp.parent = mesh
    clamp.material = netMaterial
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
    anchor.material = netMaterial
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

  const beamMaterial = cloneStandardMaterial(material, `${name}-mat`)
  const clonedGlowMaterial = cloneStandardMaterial(glowMaterial, `${name}-glow-mat`, 0.38)

  mesh.material = beamMaterial
  glow.material = clonedGlowMaterial
  glow.parent = mesh
  startNode.position.z = -0.5
  endNode.position.z = 0.5
  startNode.parent = mesh
  endNode.parent = mesh
  startNode.material = beamMaterial
  endNode.material = beamMaterial
  hotCore.parent = mesh
  hotCore.material = beamMaterial
  mesh.setEnabled(false)

  return mesh
}

export function createPooledFireBreathEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  glowMaterial: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateCylinder(
    name,
    { height: 1, diameterTop: 0.82, diameterBottom: 0.22, tessellation: 18 },
    scene,
  )
  const core = MeshBuilder.CreateCylinder(
    `${name}-core`,
    { height: 1.05, diameterTop: 0.48, diameterBottom: 0.1, tessellation: 14 },
    scene,
  )
  const emberA = MeshBuilder.CreateSphere(`${name}-ember-a`, { diameter: 0.16, segments: 8 }, scene)
  const emberB = MeshBuilder.CreateSphere(`${name}-ember-b`, { diameter: 0.12, segments: 8 }, scene)
  const coneMaterial = cloneStandardMaterial(material, `${name}-mat`, 0.62)
  const coreMaterial = cloneStandardMaterial(glowMaterial, `${name}-core-mat`, 0.38)

  mesh.material = coneMaterial
  core.material = coreMaterial
  core.parent = mesh
  emberA.material = coreMaterial
  emberB.material = coreMaterial
  emberA.parent = mesh
  emberB.parent = mesh
  mesh.rotation.x = Math.PI / 2
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
    const rotor = MeshBuilder.CreateBox(
      `${name}-rotor-${index}`,
      { width: 0.58, height: 0.035, depth: 0.035 },
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
    rotor.rotation.y = tangent
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
  const scanBarA = MeshBuilder.CreateBox(
    `${name}-scan-bar-a`,
    { width: 1.16, height: 0.05, depth: 0.055 },
    scene,
  )
  const scanBarB = MeshBuilder.CreateBox(
    `${name}-scan-bar-b`,
    { width: 0.05, height: 0.05, depth: 1.16 },
    scene,
  )

  scanCone.position.y = -0.68
  scanCone.parent = mesh
  scanCone.material = scanMaterial
  scanCone.metadata = { droneEffectPart: 'scan' }
  scanBarA.position.y = -1.25
  scanBarB.position.y = -1.25
  scanBarA.parent = mesh
  scanBarB.parent = mesh
  scanBarA.material = scanMaterial
  scanBarB.material = scanMaterial
  scanBarA.metadata = { droneEffectPart: 'scan' }
  scanBarB.metadata = { droneEffectPart: 'scan' }
  mesh.setEnabled(false)

  return mesh
}

export function updateControlNetEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const palette = resolveReplayEffectPalette(effect.team, profiles)
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
  const target = effect.endPosition ? toBabylonVector(effect.endPosition) : toBabylonVector(effect.position)
  const alpha = 0.34 + effect.intensity * 0.2

  tintStandardMaterial(mesh.material, palette.soft, palette.glow, alpha)
  mesh.getChildMeshes().forEach((child) => {
    const isAnchor = child.name.includes('anchor')
    const isKnot = child.name.includes('knot')

    tintStandardMaterial(
      child.material,
      isAnchor || isKnot ? palette.hot : palette.soft,
      palette.glow,
      isAnchor || isKnot ? 0.62 : alpha,
    )
  })
  mesh.position = target
  mesh.position.y = 0.14 + Math.sin(progress * Math.PI) * 0.1
  mesh.rotation.x = Math.PI / 2
  mesh.rotation.y = (effect.rotationY ?? 0) + effect.age * 2.8
  mesh.rotation.z = 0
  mesh.scaling.setAll(0.84 + easeOutCubic(progress) * 0.82 + effect.intensity * 0.14)
  mesh.visibility = 0.5 + effect.intensity * 0.28
}

export function updateLaserLanceEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const palette = resolveReplayEffectPalette(effect.team, profiles)
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

  tintStandardMaterial(mesh.material, palette.hot, palette.glow)
  mesh.getChildMeshes().forEach((child) => {
    const isGlow = child.name.includes('glow')

    tintStandardMaterial(child.material, isGlow ? palette.soft : palette.hot, palette.glow, isGlow ? 0.38 : undefined)
  })
  mesh.position.set(midpoint.x, 0.9 + Math.sin(effect.age * 18) * 0.04, midpoint.z)
  mesh.rotation.x = 0
  mesh.rotation.y = heading
  mesh.rotation.z = Math.sin(effect.age * 22) * 0.035
  mesh.scaling.set(pulse, 0.88 + effect.intensity * 0.34, length)
  mesh.visibility = 0.76 + effect.intensity * 0.24
}

export function updateFireBreathEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
  const palette = resolveReplayEffectPalette(effect.team, profiles)
  const start = toBabylonVector(effect.position)
  const end = effect.endPosition ? toBabylonVector(effect.endPosition) : start
  const midpoint = Vector3.Center(start, end)
  const length = Math.max(0.8, Vector3.Distance(start, end))
  const dx = end.x - start.x
  const dz = end.z - start.z
  const heading = Math.abs(dx) + Math.abs(dz) < 0.001
    ? effect.rotationY ?? 0
    : Math.atan2(dx, dz)
  const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
  const flare = Math.sin(progress * Math.PI)

  tintStandardMaterial(mesh.material, '#ff9a35', '#ff4d12', 0.52 + effect.intensity * 0.26)
  mesh.getChildMeshes().forEach((child, index) => {
    tintStandardMaterial(child.material, index === 0 ? '#fff0a8' : palette.hot, '#ff6b1a', 0.42)
    child.visibility = 0.48 + effect.intensity * 0.42
    child.position.x = Math.sin(effect.age * 9 + index * 1.7) * 0.09
    child.position.y = -0.3 + progress * (0.45 + index * 0.28)
    child.position.z = -0.08 + Math.cos(effect.age * 7 + index) * 0.05
    child.scaling.setAll(0.74 + flare * 0.42 + index * 0.16)
  })
  mesh.position.set(midpoint.x, 0.58 + flare * 0.18, midpoint.z)
  mesh.rotation.x = Math.PI / 2
  mesh.rotation.y = heading
  mesh.rotation.z = Math.sin(effect.age * 18) * 0.08
  mesh.scaling.set(0.62 + flare * 0.28, length, 0.7 + effect.intensity * 0.24)
  mesh.visibility = 0.62 + effect.intensity * 0.28
}

export function updateDroneSwarmEffect({ effect, mesh, profiles }: EffectUpdateInput): void {
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
  updateDroneSwarmParts(mesh, effect, progress, resolveReplayEffectPalette(effect.team, profiles))
}

function updateDroneSwarmParts(
  mesh: Mesh,
  effect: ReplayEffectState,
  progress: number,
  palette: ReturnType<typeof resolveReplayEffectPalette>,
): void {
  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as DroneEffectPartMetadata | undefined

    if (!metadata?.droneEffectPart) {
      return
    }

    if (child.material instanceof StandardMaterial) {
      if (metadata.droneEffectPart === 'rotor' || metadata.droneEffectPart === 'sensor') {
        tintStandardMaterial(child.material, palette.hot, palette.glow)
      }

      if (metadata.droneEffectPart === 'scan') {
        tintStandardMaterial(child.material, palette.soft, palette.glow, 0.36)
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
