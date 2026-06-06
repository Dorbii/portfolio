import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import { attachMesh } from './babylonMeshHelpers'
import type { WeaponPartRenderArgs } from './babylonWeaponPartTypes'

export function createSawWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const bladeDiameter = Math.max(Math.max(width, depth) * 1.2, 0.98)
  const bladeThickness = Math.max(height * 0.14, 0.08)
  const bladeCenterY = Math.max(height * 0.7, 0.42)
  const bladeCenterZ = Math.max(depth * 0.22, 0.16)
  const blade = createToothedBladeMesh(
    scene,
    `${role}-${blockId}-saw-toothed-blade`,
    bladeDiameter,
    bladeThickness,
    24,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-saw-arbor-hub`,
    {
      height: bladeThickness * 1.45,
      diameter: Math.max(bladeDiameter * 0.28, 0.22),
      tessellation: 16,
    },
    scene,
  )
  const guard = MeshBuilder.CreateTorus(
    `${role}-${blockId}-saw-upper-guard`,
    {
      diameter: bladeDiameter * 1.04,
      thickness: Math.max(bladeDiameter * 0.055, 0.055),
      tessellation: 28,
    },
    scene,
  )
  const motor = MeshBuilder.CreateBox(
    `${role}-${blockId}-saw-motor-housing`,
    {
      width: Math.max(width * 0.52, 0.34),
      height: Math.max(height * 0.46, 0.24),
      depth: Math.max(depth * 0.34, 0.24),
    },
    scene,
  )

  blade.position.set(0, bladeCenterY, bladeCenterZ)
  hub.rotation.z = Math.PI / 2
  hub.position.copyFrom(blade.position)
  guard.rotation.z = Math.PI / 2
  guard.position.copyFrom(blade.position)
  guard.scaling.y = 0.76
  motor.position.set(0, Math.max(height * 0.42, 0.28), -Math.max(depth * 0.24, 0.18))
  blade.metadata = { kind: 'spin', speed: 0.18 }
  hub.metadata = { kind: 'spin', speed: 0.18 }
  attachMesh(blade, parent, materials.steel)
  attachMesh(hub, parent, materials.trim)
  attachMesh(guard, parent, materials.trim)
  attachMesh(motor, parent, material)

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-saw-radial-spoke-${index}`,
      {
        width: bladeThickness * 1.08,
        height: Math.max(bladeDiameter * 0.045, 0.035),
        depth: bladeDiameter * 0.58,
      },
      scene,
    )

    spoke.position.copyFrom(blade.position)
    spoke.rotation.x = angle
    attachMesh(spoke, parent, materials.trim)
  }
}

export function createSpinnerWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const spinnerDiameter = Math.max(Math.max(width, depth) * 1.18, 0.98)
  const spinnerCenterY = Math.max(height * 0.72, 0.42)
  const spinnerCenterZ = Math.max(depth * 0.2, 0.16)
  const disc = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spinner-disc`,
    {
      height: Math.max(height * 0.2, 0.12),
      diameter: spinnerDiameter,
      tessellation: 26,
    },
    scene,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spinner-hub`,
    { height: Math.max(height * 0.3, 0.16), diameter: Math.max(spinnerDiameter * 0.38, 0.26) },
    scene,
  )
  const gearbox = MeshBuilder.CreateBox(
    `${role}-${blockId}-spinner-gearbox`,
    {
      width: Math.max(width * 0.62, 0.42),
      height: Math.max(height * 0.7, 0.34),
      depth: Math.max(depth * 0.38, 0.3),
    },
    scene,
  )
  const upperCowl = MeshBuilder.CreateBox(
    `${role}-${blockId}-spinner-upper-cowl`,
    {
      width: Math.max(width * 0.82, 0.56),
      height: Math.max(height * 0.22, 0.13),
      depth: Math.max(depth * 0.28, 0.2),
    },
    scene,
  )

  disc.rotation.z = Math.PI / 2
  hub.rotation.z = Math.PI / 2
  disc.position.set(0, spinnerCenterY, spinnerCenterZ)
  hub.position.set(0, spinnerCenterY, spinnerCenterZ)
  gearbox.position.set(0, Math.max(height * 0.52, 0.3), -Math.max(depth * 0.24, 0.18))
  upperCowl.position.set(0, Math.max(height * 1.04, 0.58), -Math.max(depth * 0.04, 0.04))
  disc.metadata = { kind: 'spin', speed: 0.15 }
  hub.metadata = { kind: 'spin', speed: 0.15 }
  disc.parent = parent
  hub.parent = parent
  disc.material = material
  hub.material = materials.trim
  attachMesh(gearbox, parent, material)
  attachMesh(upperCowl, parent, materials.trim)

  const forkLeft = MeshBuilder.CreateBox(
    `${role}-${blockId}-spinner-fork-l`,
    { width: Math.max(width * 0.12, 0.08), height: Math.max(height * 0.42, 0.16), depth: Math.max(depth * 1.04, 0.66) },
    scene,
  )
  const forkRight = MeshBuilder.CreateBox(
    `${role}-${blockId}-spinner-fork-r`,
    { width: Math.max(width * 0.12, 0.08), height: Math.max(height * 0.42, 0.16), depth: Math.max(depth * 1.04, 0.66) },
    scene,
  )

  forkLeft.position.set(-Math.max(width * 0.36, 0.24), Math.max(height * 0.18, 0.12), 0.08)
  forkRight.position.set(Math.max(width * 0.36, 0.24), Math.max(height * 0.18, 0.12), 0.08)
  attachMesh(forkLeft, parent, material)
  attachMesh(forkRight, parent, material)

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const bar = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-blade-${index}`,
      { width: Math.max(depth * 0.1, 0.08), height: Math.max(width * 0.18, 0.12), depth: spinnerDiameter * 0.86 },
      scene,
    )

    bar.position.set(0, spinnerCenterY, spinnerCenterZ)
    bar.rotation.x = angle
    attachMesh(bar, parent, materials.warning)
  }
}

function createToothedBladeMesh(
  scene: WeaponPartRenderArgs['scene'],
  name: string,
  diameter: number,
  thickness: number,
  toothCount: number,
): Mesh {
  const mesh = new Mesh(name, scene)
  const outerRadius = diameter / 2
  const innerRadius = outerRadius * 0.86
  const segmentCount = toothCount * 2
  const halfThickness = thickness / 2
  const positions: number[] = []
  const indices: number[] = []

  for (const x of [-halfThickness, halfThickness]) {
    for (let index = 0; index < segmentCount; index += 1) {
      const angle = (Math.PI * 2 * index) / segmentCount
      const radius = index % 2 === 0 ? outerRadius : innerRadius

      positions.push(x, Math.sin(angle) * radius, Math.cos(angle) * radius)
    }
  }

  const frontCenterIndex = positions.length / 3
  positions.push(-halfThickness, 0, 0)
  const backCenterIndex = positions.length / 3
  positions.push(halfThickness, 0, 0)

  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % segmentCount
    const frontCurrent = index
    const frontNext = next
    const backCurrent = segmentCount + index
    const backNext = segmentCount + next

    indices.push(frontCenterIndex, frontNext, frontCurrent)
    indices.push(backCenterIndex, backCurrent, backNext)
    indices.push(frontCurrent, frontNext, backNext)
    indices.push(frontCurrent, backNext, backCurrent)
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
