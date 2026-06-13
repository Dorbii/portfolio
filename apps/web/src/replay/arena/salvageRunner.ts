import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { ArenaConfig } from '../../../../../packages/schemas/src/index.js'
import type { ReplayVisualFrame } from '../replayMapping'
import { easeOutCubic, toBabylonVector } from '../rendering/sceneUtils'

export type ReplaySalvageRunner = {
  body: Mesh
  crate: Mesh
  head: Mesh
  leftArm: Mesh
  leftLeg: Mesh
  rightArm: Mesh
  rightLeg: Mesh
  root: TransformNode
}

export function createReplaySalvageRunner(scene: Scene): ReplaySalvageRunner {
  const root = new TransformNode('replay-salvage-runner-root', scene)
  const suitMaterial = createRunnerMaterial(scene, 'replay-salvage-runner-suit-mat', '#d2a33c', '#211803')
  const skinMaterial = createRunnerMaterial(scene, 'replay-salvage-runner-skin-mat', '#edc18d', '#1e1208')
  const bootMaterial = createRunnerMaterial(scene, 'replay-salvage-runner-boot-mat', '#262b2b', '#040505')
  const crateMaterial = createRunnerMaterial(scene, 'replay-salvage-runner-crate-mat', '#8c9697', '#161b1c')

  const body = MeshBuilder.CreateBox('replay-salvage-runner-body', { width: 0.24, height: 0.42, depth: 0.14 }, scene)
  const head = MeshBuilder.CreateSphere('replay-salvage-runner-head', { diameter: 0.16, segments: 10 }, scene)
  const leftLeg = MeshBuilder.CreateBox('replay-salvage-runner-leg-l', { width: 0.055, height: 0.34, depth: 0.07 }, scene)
  const rightLeg = MeshBuilder.CreateBox('replay-salvage-runner-leg-r', { width: 0.055, height: 0.34, depth: 0.07 }, scene)
  const leftArm = MeshBuilder.CreateBox('replay-salvage-runner-arm-l', { width: 0.05, height: 0.3, depth: 0.055 }, scene)
  const rightArm = MeshBuilder.CreateBox('replay-salvage-runner-arm-r', { width: 0.05, height: 0.3, depth: 0.055 }, scene)
  const crate = MeshBuilder.CreateBox('replay-salvage-runner-parts-crate', { width: 0.2, height: 0.12, depth: 0.18 }, scene)

  body.parent = root
  head.parent = root
  leftLeg.parent = root
  rightLeg.parent = root
  leftArm.parent = root
  rightArm.parent = root
  crate.parent = root

  body.position.y = 0.55
  head.position.y = 0.84
  leftLeg.position.set(-0.065, 0.24, 0)
  rightLeg.position.set(0.065, 0.24, 0)
  leftArm.position.set(-0.17, 0.54, 0.02)
  rightArm.position.set(0.17, 0.54, 0.02)
  crate.position.set(0.22, 0.46, -0.04)

  body.material = suitMaterial
  head.material = skinMaterial
  leftLeg.material = bootMaterial
  rightLeg.material = bootMaterial
  leftArm.material = suitMaterial
  rightArm.material = suitMaterial
  crate.material = crateMaterial

  const runnerMeshes = [body, head, leftLeg, rightLeg, leftArm, rightArm, crate]

  runnerMeshes.forEach((mesh) => {
    mesh.isPickable = false
  })

  root.scaling.setAll(0.52)
  root.setEnabled(false)

  return {
    body,
    crate,
    head,
    leftArm,
    leftLeg,
    rightArm,
    rightLeg,
    root,
  }
}

export function updateReplaySalvageRunner(
  runner: ReplaySalvageRunner,
  frame: ReplayVisualFrame,
  arena: ArenaConfig,
): void {
  const detachEffect = frame.effects
    .filter((effect) => effect.kind === 'part_detach')
    .sort((left, right) => left.age - right.age)[0]

  if (!detachEffect) {
    runner.root.setEnabled(false)
    return
  }

  const progress = clamp(detachEffect.age / 1.9, 0, 1)
  const target = toBabylonVector(detachEffect.position)
  const pickup = new Vector3(
    clamp(target.x, -arena.width / 2 + 0.85, arena.width / 2 - 0.85),
    0.04,
    clamp(target.z, -arena.height / 2 + 0.85, arena.height / 2 - 0.85),
  )
  const home = new Vector3(
    pickup.x < 0 ? -arena.width / 2 + 0.55 : arena.width / 2 - 0.55,
    0.04,
    clamp(pickup.z + (pickup.z > 0 ? 0.45 : -0.45), -arena.height / 2 + 0.55, arena.height / 2 - 0.55),
  )
  const crouching = progress >= 0.48 && progress <= 0.68
  const returning = progress > 0.68
  const position = positionForRunnerProgress(home, pickup, progress)
  const faceTarget = returning ? home : pickup
  const dx = faceTarget.x - runner.root.position.x
  const dz = faceTarget.z - runner.root.position.z
  const stride = crouching ? 0 : Math.sin(frame.time * 18) * 0.62

  runner.root.setEnabled(true)
  runner.root.position.copyFrom(position)
  runner.root.rotation.x = crouching ? 0.28 : 0
  runner.root.rotation.y = Math.abs(dx) + Math.abs(dz) > 0.001
    ? Math.atan2(dx, dz)
    : runner.root.rotation.y
  runner.root.rotation.z = Math.sin(frame.time * 12) * (crouching ? 0.02 : 0.05)

  runner.leftLeg.rotation.x = stride
  runner.rightLeg.rotation.x = -stride
  runner.leftArm.rotation.x = crouching ? -0.95 : -stride * 0.8
  runner.rightArm.rotation.x = crouching ? -1.12 : stride * 0.8
  runner.body.scaling.y = crouching ? 0.86 : 1
  runner.head.position.y = crouching ? 0.75 : 0.84
  runner.crate.visibility = returning ? 1 : 0.28
}

function positionForRunnerProgress(home: Vector3, pickup: Vector3, progress: number): Vector3 {
  if (progress < 0.48) {
    return Vector3.Lerp(home, pickup, easeOutCubic(progress / 0.48))
  }

  if (progress <= 0.68) {
    return pickup.clone()
  }

  return Vector3.Lerp(pickup, home, easeOutCubic((progress - 0.68) / 0.32))
}

function createRunnerMaterial(scene: Scene, name: string, diffuse: string, emissive: string): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.specularColor = Color3.Black()

  return material
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
