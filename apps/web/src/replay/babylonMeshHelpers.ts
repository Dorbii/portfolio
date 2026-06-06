import type { Material } from '@babylonjs/core/Materials/material'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'

export function attachMesh(mesh: Mesh, parent: TransformNode, material: Material): void {
  mesh.parent = parent
  mesh.material = material
}

export function createBoxDetail(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene)

  mesh.position.set(x, y, z)
  attachMesh(mesh, parent, material)

  return mesh
}

export function createSolidBlock(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  width: number,
  height: number,
  depth: number,
): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene)

  attachMesh(mesh, parent, material)
}

export function createRampBlock(
  scene: Scene,
  name: string,
  width: number,
  height: number,
  depth: number,
  frontHeight = Math.max(height * 0.2, 0.06),
): Mesh {
  const mesh = new Mesh(name, scene)
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const bottomY = -height / 2
  const frontTopY = Math.min(height / 2, bottomY + Math.max(frontHeight, 0.035))
  const backTopY = height / 2
  const positions = [
    -halfWidth, bottomY, halfDepth,
    halfWidth, bottomY, halfDepth,
    halfWidth, bottomY, -halfDepth,
    -halfWidth, bottomY, -halfDepth,
    -halfWidth, frontTopY, halfDepth,
    halfWidth, frontTopY, halfDepth,
    halfWidth, backTopY, -halfDepth,
    -halfWidth, backTopY, -halfDepth,
  ]
  const indices = [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    3, 7, 6, 3, 6, 2,
    0, 4, 7, 0, 7, 3,
    1, 2, 6, 1, 6, 5,
  ]
  const normals: number[] = []
  const vertexData = new VertexData()

  VertexData.ComputeNormals(positions, indices, normals)
  vertexData.positions = positions
  vertexData.indices = indices
  vertexData.normals = normals
  vertexData.applyToMesh(mesh)

  return mesh
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
