import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { Scene } from '@babylonjs/core/scene'

export function createToothedBladeMesh(
  scene: Scene,
  name: string,
  diameter: number,
  thickness: number,
  toothCount: number,
  boreDiameter: number,
): Mesh {
  const mesh = new Mesh(name, scene)
  const outerRadius = diameter / 2
  const gulletRadius = outerRadius * 0.84
  const boreRadius = Math.max(boreDiameter / 2, outerRadius * 0.1)
  const segmentCount = toothCount * 2
  const halfThickness = thickness / 2
  const positions: number[] = []
  const indices: number[] = []

  for (const x of [-halfThickness, halfThickness]) {
    for (let index = 0; index < segmentCount; index += 1) {
      const angle = (Math.PI * 2 * index) / segmentCount
      const radius = index % 2 === 0 ? outerRadius : gulletRadius

      positions.push(x, Math.sin(angle) * radius, Math.cos(angle) * radius)
    }

    for (let index = 0; index < segmentCount; index += 1) {
      const angle = (Math.PI * 2 * index) / segmentCount

      positions.push(x, Math.sin(angle) * boreRadius, Math.cos(angle) * boreRadius)
    }
  }

  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % segmentCount
    const frontOuter = index
    const frontOuterNext = next
    const frontInner = segmentCount + index
    const frontInnerNext = segmentCount + next
    const backOuter = segmentCount * 2 + index
    const backOuterNext = segmentCount * 2 + next
    const backInner = segmentCount * 3 + index
    const backInnerNext = segmentCount * 3 + next

    indices.push(frontOuter, frontOuterNext, frontInnerNext)
    indices.push(frontOuter, frontInnerNext, frontInner)
    indices.push(backOuter, backInnerNext, backOuterNext)
    indices.push(backOuter, backInner, backInnerNext)
    indices.push(frontOuter, backOuter, backOuterNext)
    indices.push(frontOuter, backOuterNext, frontOuterNext)
    indices.push(frontInner, frontInnerNext, backInnerNext)
    indices.push(frontInner, backInnerNext, backInner)
  }

  applyMeshVertexData(mesh, positions, indices)

  return mesh
}

export function createAnnularSectorMesh(
  scene: Scene,
  name: string,
  outerDiameter: number,
  innerDiameter: number,
  thickness: number,
  startAngle: number,
  endAngle: number,
): Mesh {
  const mesh = new Mesh(name, scene)
  const outerRadius = outerDiameter / 2
  const innerRadius = innerDiameter / 2
  const halfThickness = thickness / 2
  const segmentCount = 22
  const positions: number[] = []
  const indices: number[] = []

  for (const x of [-halfThickness, halfThickness]) {
    for (let index = 0; index <= segmentCount; index += 1) {
      const angle = startAngle + ((endAngle - startAngle) * index) / segmentCount

      positions.push(x, Math.sin(angle) * outerRadius, Math.cos(angle) * outerRadius)
    }

    for (let index = 0; index <= segmentCount; index += 1) {
      const angle = startAngle + ((endAngle - startAngle) * index) / segmentCount

      positions.push(x, Math.sin(angle) * innerRadius, Math.cos(angle) * innerRadius)
    }
  }

  const ringCount = segmentCount + 1

  for (let index = 0; index < segmentCount; index += 1) {
    const next = index + 1
    const frontOuter = index
    const frontOuterNext = next
    const frontInner = ringCount + index
    const frontInnerNext = ringCount + next
    const backOuter = ringCount * 2 + index
    const backOuterNext = ringCount * 2 + next
    const backInner = ringCount * 3 + index
    const backInnerNext = ringCount * 3 + next

    indices.push(frontOuter, frontOuterNext, frontInnerNext)
    indices.push(frontOuter, frontInnerNext, frontInner)
    indices.push(backOuter, backInnerNext, backOuterNext)
    indices.push(backOuter, backInner, backInnerNext)
    indices.push(frontOuter, backOuter, backOuterNext)
    indices.push(frontOuter, backOuterNext, frontOuterNext)
    indices.push(frontInner, frontInnerNext, backInnerNext)
    indices.push(frontInner, backInnerNext, backInner)
  }

  for (const index of [0, segmentCount]) {
    const frontOuter = index
    const frontInner = ringCount + index
    const backOuter = ringCount * 2 + index
    const backInner = ringCount * 3 + index

    indices.push(frontOuter, frontInner, backInner)
    indices.push(frontOuter, backInner, backOuter)
  }

  applyMeshVertexData(mesh, positions, indices)

  return mesh
}

function applyMeshVertexData(mesh: Mesh, positions: number[], indices: number[]): void {
  const normals: number[] = []
  const vertexData = new VertexData()

  VertexData.ComputeNormals(positions, indices, normals)
  vertexData.positions = positions
  vertexData.indices = indices
  vertexData.normals = normals
  vertexData.applyToMesh(mesh)
}
