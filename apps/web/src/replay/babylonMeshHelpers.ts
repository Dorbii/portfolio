import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'

export function attachMesh(mesh: Mesh, parent: TransformNode, material: StandardMaterial): void {
  mesh.parent = parent
  mesh.material = material
}

export function createBoxDetail(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
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
  material: StandardMaterial,
  name: string,
  width: number,
  height: number,
  depth: number,
): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene)

  attachMesh(mesh, parent, material)
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
