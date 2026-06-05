import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from './babylonMeshHelpers'
import type { MobilityPartRenderArgs } from './babylonMobilityPartTypes'

export function createSpringLegPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: MobilityPartRenderArgs): void {
  const foot = MeshBuilder.CreateBox(
    `${role}-${blockId}-spring-leg-foot`,
    { width: Math.max(width * 0.72, 0.36), height: 0.08, depth: Math.max(depth * 0.74, 0.34) },
    scene,
  )
  const knee = MeshBuilder.CreateBox(
    `${role}-${blockId}-spring-leg-knee`,
    {
      width: Math.max(width * 0.36, 0.18),
      height: Math.max(height * 0.22, 0.12),
      depth: Math.max(depth * 0.38, 0.18),
    },
    scene,
  )
  const spring = MeshBuilder.CreateTorus(
    `${role}-${blockId}-spring-leg-coil`,
    { diameter: Math.max(width * 0.54, 0.32), thickness: 0.035, tessellation: 18 },
    scene,
  )

  foot.position.y = -Math.max(height * 0.18, 0.12)
  knee.position.y = Math.max(height * 0.5, 0.3)
  spring.rotation.x = Math.PI / 2
  spring.position.y = Math.max(height * 0.24, 0.17)
  spring.metadata = { kind: 'pulse', speed: 0.035 }
  attachMesh(foot, parent, materials.rubber)
  attachMesh(knee, parent, material)
  attachMesh(spring, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    const strut = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spring-leg-strut-${side}`,
      { height: Math.max(height * 0.82, 0.42), diameter: 0.055, tessellation: 8 },
      scene,
    )

    strut.position.set(side * Math.max(width * 0.24, 0.14), Math.max(height * 0.22, 0.18), 0)
    strut.rotation.z = side * 0.28
    attachMesh(strut, parent, materials.trim)
  }
}

export function createSkidPlatePart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: MobilityPartRenderArgs): void {
  const plate = MeshBuilder.CreateBox(
    `${role}-${blockId}-skid-plate`,
    {
      width: Math.max(width * 1.12, 0.62),
      height: Math.max(height * 0.16, 0.08),
      depth: Math.max(depth * 0.8, 0.36),
    },
    scene,
  )
  const frontLip = MeshBuilder.CreateBox(
    `${role}-${blockId}-skid-plate-lip`,
    {
      width: Math.max(width * 1.02, 0.56),
      height: Math.max(height * 0.22, 0.1),
      depth: Math.max(depth * 0.14, 0.08),
    },
    scene,
  )

  plate.position.y = -Math.max(height * 0.12, 0.08)
  frontLip.position.set(0, Math.max(height * 0.02, 0.04), Math.max(depth * 0.42, 0.2))
  attachMesh(plate, parent, material)
  attachMesh(frontLip, parent, materials.rubber)

  for (let index = -1; index <= 1; index += 1) {
    const skidRib = MeshBuilder.CreateBox(
      `${role}-${blockId}-skid-rib-${index + 1}`,
      {
        width: Math.max(width * 0.14, 0.08),
        height: Math.max(height * 0.08, 0.045),
        depth: Math.max(depth * 0.72, 0.3),
      },
      scene,
    )

    skidRib.position.set(index * Math.max(width * 0.3, 0.18), 0.02, 0)
    attachMesh(skidRib, parent, materials.trim)
  }
}
