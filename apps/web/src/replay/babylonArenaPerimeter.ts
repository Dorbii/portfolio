import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'

export function createBumperSegments(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  warningMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const segmentCount = 11
  const northZ = arenaHeight / 2 - 0.45
  const southZ = -arenaHeight / 2 + 0.45

  for (let index = 0; index < segmentCount; index += 1) {
    const x = -arenaWidth / 2 + 1.3 + index * ((arenaWidth - 2.6) / (segmentCount - 1))

    createRailSegment(scene, `north-bumper-${index}`, x, northZ, 0, warningMaterial, trimMaterial)
    createRailSegment(scene, `south-bumper-${index}`, x, southZ, 0, warningMaterial, trimMaterial)
    createBumperBaseShoe(scene, `north-bumper-shoe-${index}`, x, northZ - 0.16, 0, trimMaterial)
    createBumperBaseShoe(scene, `south-bumper-shoe-${index}`, x, southZ + 0.16, 0, trimMaterial)
  }

  const sideSegmentCount = 7

  for (let index = 0; index < sideSegmentCount; index += 1) {
    const z = -arenaHeight / 2 + 1.3 + index * ((arenaHeight - 2.6) / (sideSegmentCount - 1))

    createRailSegment(scene, `east-bumper-${index}`, arenaWidth / 2 - 0.45, z, Math.PI / 2, warningMaterial, trimMaterial)
    createRailSegment(scene, `west-bumper-${index}`, -arenaWidth / 2 + 0.45, z, Math.PI / 2, warningMaterial, trimMaterial)
    createBumperBaseShoe(scene, `east-bumper-shoe-${index}`, arenaWidth / 2 - 0.61, z, Math.PI / 2, trimMaterial)
    createBumperBaseShoe(scene, `west-bumper-shoe-${index}`, -arenaWidth / 2 + 0.61, z, Math.PI / 2, trimMaterial)
  }
}

export function createGlassPosts(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  material: StandardMaterial,
): void {
  const postsPerLongSide = 6
  const postsPerShortSide = 4

  for (let index = 0; index <= postsPerLongSide; index += 1) {
    const x = -arenaWidth / 2 + (arenaWidth / postsPerLongSide) * index

    createGlassPost(scene, `north-glass-post-${index}`, x, arenaHeight / 2 - 0.15, material)
    createGlassPost(scene, `south-glass-post-${index}`, x, -arenaHeight / 2 + 0.15, material)
    createGlassClamp(scene, `north-glass-clamp-${index}`, x, arenaHeight / 2 - 0.33, 0, material)
    createGlassClamp(scene, `south-glass-clamp-${index}`, x, -arenaHeight / 2 + 0.33, 0, material)
  }

  for (let index = 1; index < postsPerShortSide; index += 1) {
    const z = -arenaHeight / 2 + (arenaHeight / postsPerShortSide) * index

    createGlassPost(scene, `east-glass-post-${index}`, arenaWidth / 2 - 0.15, z, material)
    createGlassPost(scene, `west-glass-post-${index}`, -arenaWidth / 2 + 0.15, z, material)
    createGlassClamp(scene, `east-glass-clamp-${index}`, arenaWidth / 2 - 0.33, z, Math.PI / 2, material)
    createGlassClamp(scene, `west-glass-clamp-${index}`, -arenaWidth / 2 + 0.33, z, Math.PI / 2, material)
  }
}

export function createArenaLightBars(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  redMaterial: StandardMaterial,
  blueMaterial: StandardMaterial,
  whiteMaterial: StandardMaterial,
): void {
  createLightBar(scene, 'red-back-light', -arenaWidth * 0.34, arenaHeight / 2 - 0.28, 1.32, 0, redMaterial)
  createLightBar(scene, 'blue-back-light', arenaWidth * 0.34, -arenaHeight / 2 + 0.28, 1.32, 0, blueMaterial)
  createLightBar(scene, 'north-center-light', 0, arenaHeight / 2 - 0.28, 1.1, 0, whiteMaterial)
  createLightBar(scene, 'south-center-light', 0, -arenaHeight / 2 + 0.28, 1.1, 0, whiteMaterial)
  createLightBar(scene, 'east-side-light', arenaWidth / 2 - 0.28, 0, 1.1, Math.PI / 2, redMaterial)
  createLightBar(scene, 'west-side-light', -arenaWidth / 2 + 0.28, 0, 1.1, Math.PI / 2, blueMaterial)
}

function createRailSegment(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  rotationY: number,
  warningMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const base = MeshBuilder.CreateBox(name, { width: 1.05, height: 0.3, depth: 0.18 }, scene)
  const cap = MeshBuilder.CreateBox(`${name}-cap`, { width: 1.02, height: 0.08, depth: 0.2 }, scene)

  base.position.set(x, 0.23, z)
  base.rotation.y = rotationY
  base.material = warningMaterial
  cap.position.set(x, 0.43, z)
  cap.rotation.y = rotationY
  cap.material = trimMaterial
}

function createBumperBaseShoe(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  rotationY: number,
  material: StandardMaterial,
): void {
  const shoe = MeshBuilder.CreateBox(name, { width: 1.15, height: 0.065, depth: 0.28 }, scene)

  shoe.position.set(x, 0.075, z)
  shoe.rotation.y = rotationY
  shoe.material = material
}

function createGlassPost(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  material: StandardMaterial,
): void {
  const post = MeshBuilder.CreateBox(name, { width: 0.12, height: 1.38, depth: 0.12 }, scene)

  post.position.set(x, 1.08, z)
  post.material = material

  const foot = MeshBuilder.CreateBox(`${name}-foot`, { width: 0.34, height: 0.08, depth: 0.34 }, scene)

  foot.position.set(x, 0.38, z)
  foot.material = material
}

function createGlassClamp(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  rotationY: number,
  material: StandardMaterial,
): void {
  const clamp = MeshBuilder.CreateBox(name, { width: 0.5, height: 0.1, depth: 0.12 }, scene)
  const brace = MeshBuilder.CreateBox(`${name}-brace`, { width: 0.36, height: 0.04, depth: 0.1 }, scene)

  clamp.position.set(x, 0.62, z)
  clamp.rotation.y = rotationY
  clamp.material = material
  brace.position.set(x, 1.28, z)
  brace.rotation.y = rotationY
  brace.material = material
}

function createLightBar(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  rotationY: number,
  material: StandardMaterial,
): void {
  const bar = MeshBuilder.CreateBox(name, { width, height: 0.08, depth: 0.08 }, scene)

  bar.position.set(x, 0.84, z)
  bar.rotation.y = rotationY
  bar.material = material
}
