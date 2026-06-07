import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { Scene } from '@babylonjs/core/scene'

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
