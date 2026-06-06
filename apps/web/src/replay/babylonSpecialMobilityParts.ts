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
  foot.position.y = -Math.max(height * 0.18, 0.12)
  knee.position.y = Math.max(height * 0.5, 0.3)
  attachMesh(foot, parent, materials.rubber)
  attachMesh(knee, parent, material)

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

  const coilCount = 5
  for (let index = 0; index < coilCount; index += 1) {
    const coil = MeshBuilder.CreateTorus(
      `${role}-${blockId}-spring-leg-coil-${index}`,
      {
        diameter: Math.max(width * (0.46 - index * 0.018), 0.28),
        thickness: 0.032,
        tessellation: 18,
      },
      scene,
    )

    coil.rotation.x = Math.PI / 2
    coil.position.y = Math.max(height * 0.05, 0.08) + index * Math.max(height * 0.1, 0.052)
    coil.metadata = { kind: 'pulse', speed: 0.035 + index * 0.002 }
    attachMesh(coil, parent, materials.steel)
  }

  const piston = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-spring-leg-center-piston`,
    { height: Math.max(height * 0.64, 0.34), diameter: 0.04, tessellation: 10 },
    scene,
  )

  piston.position.y = Math.max(height * 0.22, 0.16)
  attachMesh(piston, parent, materials.warning)
}

export function createSkidPlatePart({
  scene,
  parent,
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
  attachMesh(plate, parent, materials.steel)
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

  for (let side = -1; side <= 1; side += 2) {
    const wearStrip = MeshBuilder.CreateBox(
      `${role}-${blockId}-skid-wear-strip-${side}`,
      {
        width: Math.max(width * 0.08, 0.045),
        height: Math.max(height * 0.08, 0.045),
        depth: Math.max(depth * 0.72, 0.3),
      },
      scene,
    )

    wearStrip.position.set(side * Math.max(width * 0.44, 0.24), 0.04, 0)
    attachMesh(wearStrip, parent, materials.warning)
  }
}
