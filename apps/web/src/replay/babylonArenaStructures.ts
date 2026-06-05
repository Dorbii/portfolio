import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { Scene } from '@babylonjs/core/scene'
import { createSceneMaterial } from './babylonSceneUtils'

export function createWall(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  material: StandardMaterial,
): void {
  const wall = MeshBuilder.CreateBox(name, { width, height: 0.64, depth }, scene)

  wall.position.set(x, 0.34, z)
  wall.material = material
}

export function createGlass(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  material: StandardMaterial,
): void {
  const glass = MeshBuilder.CreateBox(name, { width, height: 1.18, depth }, scene)

  glass.position.set(x, 1.06, z)
  glass.material = material
}

export function createBoundaryPosts(
  scene: Scene,
  material: StandardMaterial,
  arenaWidth: number,
  arenaHeight: number,
): void {
  const offsets = [
    [arenaWidth / 2 - 0.9, arenaHeight / 2 - 0.9],
    [-arenaWidth / 2 + 0.9, arenaHeight / 2 - 0.9],
    [arenaWidth / 2 - 0.9, -arenaHeight / 2 + 0.9],
    [-arenaWidth / 2 + 0.9, -arenaHeight / 2 + 0.9],
  ]

  offsets.forEach(([x, z], index) => {
    const post = MeshBuilder.CreateBox(
      `arena-post-${index}`,
      { width: 0.22, height: 1.05, depth: 0.22 },
      scene,
    )

    post.position.set(x, 0.52, z)
    post.material = material
  })
}

export function createCornerMarkers(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  material: StandardMaterial,
): void {
  const spacing = 1
  const corners = [
    [arenaWidth / 2 - spacing, arenaHeight / 2 - spacing],
    [-arenaWidth / 2 + spacing, arenaHeight / 2 - spacing],
    [arenaWidth / 2 - spacing, -arenaHeight / 2 + spacing],
    [-arenaWidth / 2 + spacing, -arenaHeight / 2 + spacing],
  ]

  corners.forEach(([x, z], index) => {
    const marker = MeshBuilder.CreateTorus(
      `corner-marker-${index}`,
      { diameter: 1.2, thickness: 0.06, tessellation: 18 },
      scene,
    )

    marker.position.set(x, 0.08, z)
    marker.material = material
    marker.rotation.x = Math.PI / 2
  })
}

export function createCenterSpinner(scene: Scene): Mesh {
  const spinner = MeshBuilder.CreateCylinder(
    'center-anim-spinner',
    { height: 0.06, diameter: 1.2, tessellation: 24 },
    scene,
  )
  const glow = MeshBuilder.CreateTorus(
    'center-anim-spinner-glow',
    { diameter: 1.28, thickness: 0.06, tessellation: 22 },
    scene,
  )
  const material = createSceneMaterial(scene, 'center-spinner-mat', '#e6b95d', '#3f2a09')
  const toothMaterial = createSceneMaterial(scene, 'center-spinner-tooth-mat', '#f2d174', '#573803')

  spinner.material = material
  glow.material = material
  glow.position.set(0, 0.06, 0)
  glow.parent = spinner
  glow.rotation.x = Math.PI / 2

  for (let index = 0; index < 8; index += 1) {
    const tooth = MeshBuilder.CreateBox(
      `center-spinner-tooth-${index}`,
      { width: 0.18, height: 0.09, depth: 0.38 },
      scene,
    )
    const angle = (Math.PI * 2 * index) / 8

    tooth.position.set(Math.cos(angle) * 0.54, 0.05, Math.sin(angle) * 0.54)
    tooth.rotation.y = angle
    tooth.parent = spinner
    tooth.material = toothMaterial
  }

  return spinner
}
