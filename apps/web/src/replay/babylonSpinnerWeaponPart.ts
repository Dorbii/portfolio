import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from './babylonMeshHelpers'
import type { WeaponPartRenderArgs } from './babylonWeaponPartTypes'

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
  disc.material = materials.trim
  hub.material = material
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
