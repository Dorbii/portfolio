import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { Scene } from '@babylonjs/core/scene'

export function createExtrudedPlateFromOutline(
  scene: Scene,
  name: string,
  outline: [number, number][],
  thickness: number,
): Mesh {
  const mesh = new Mesh(name, scene)
  const halfThickness = thickness / 2
  const positions: number[] = []
  const indices: number[] = []

  outline.forEach(([x, z]) => positions.push(x, halfThickness, z))
  outline.forEach(([x, z]) => positions.push(x, -halfThickness, z))

  for (let index = 1; index < outline.length - 1; index += 1) {
    indices.push(0, index, index + 1)
    indices.push(outline.length, outline.length + index + 1, outline.length + index)
  }

  for (let index = 0; index < outline.length; index += 1) {
    const next = (index + 1) % outline.length

    indices.push(index, next, outline.length + next)
    indices.push(index, outline.length + next, outline.length + index)
  }

  const normals: number[] = []
  const vertexData = new VertexData()

  VertexData.ComputeNormals(positions, indices, normals)
  vertexData.positions = positions
  vertexData.indices = indices
  vertexData.normals = normals
  vertexData.applyToMesh(mesh)

  return mesh
}

export function createExtrudedVerticalPlateFromOutline(
  scene: Scene,
  name: string,
  outline: [number, number][],
  thickness: number,
): Mesh {
  const mesh = new Mesh(name, scene)
  const halfThickness = thickness / 2
  const positions: number[] = []
  const indices: number[] = []

  outline.forEach(([z, y]) => positions.push(halfThickness, y, z))
  outline.forEach(([z, y]) => positions.push(-halfThickness, y, z))

  for (let index = 1; index < outline.length - 1; index += 1) {
    indices.push(0, index, index + 1)
    indices.push(outline.length, outline.length + index + 1, outline.length + index)
  }

  for (let index = 0; index < outline.length; index += 1) {
    const next = (index + 1) % outline.length

    indices.push(index, outline.length + next, next)
    indices.push(index, outline.length + index, outline.length + next)
  }

  const normals: number[] = []
  const vertexData = new VertexData()

  VertexData.ComputeNormals(positions, indices, normals)
  vertexData.positions = positions
  vertexData.indices = indices
  vertexData.normals = normals
  vertexData.applyToMesh(mesh)

  return mesh
}
