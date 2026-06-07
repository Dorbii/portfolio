import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import {
  createAnnularSectorMesh,
  createToothedBladeMesh,
} from '../../rendering/bladeGeometry'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'
import {
  attachRoleMesh,
  attachWeaponEdgeMesh,
  tagRoleMesh,
  tagWeaponEdgeMesh,
} from './weaponRenderHelpers'

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
    30,
    bladeDiameter * 0.12,
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
  const guard = createAnnularSectorMesh(
    scene,
    `${role}-${blockId}-saw-upper-guard`,
    bladeDiameter * 1.08,
    bladeDiameter * 0.88,
    bladeThickness * 1.18,
    Math.PI * 0.05,
    Math.PI * 0.95,
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
  const bladeRoot = new TransformNode(`${role}-${blockId}-saw-blade-motion-root`, scene)

  bladeRoot.position.set(0, bladeCenterY, bladeCenterZ)
  bladeRoot.metadata = { kind: 'spin', axis: 'x', speed: 0.18 }
  hub.rotation.z = Math.PI / 2
  guard.position.set(0, bladeCenterY, bladeCenterZ)
  motor.position.set(0, Math.max(height * 0.42, 0.28), -Math.max(depth * 0.24, 0.18))
  blade.parent = bladeRoot
  blade.material = materials.steel
  hub.parent = bladeRoot
  hub.material = materials.trim
  tagWeaponEdgeMesh(blade)
  tagRoleMesh(hub, 'trim')
  bladeRoot.parent = parent
  attachRoleMesh(guard, parent, materials.trim, 'trim')
  attachMesh(motor, parent, material)
  tagRoleMesh(motor, 'damageable')
  createBladeFaceDetails({
    scene,
    parent: bladeRoot,
    material: materials.trim,
    namePrefix: `${role}-${blockId}-saw`,
    centerY: 0,
    centerZ: 0,
    radius: bladeDiameter * 0.36,
    thickness: bladeThickness,
  })

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

    spoke.rotation.x = angle
    attachRoleMesh(spoke, bladeRoot, materials.trim, 'trim')
  }

  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * 2 * index) / 4 + 0.28
    const toothWear = MeshBuilder.CreateBox(
      `${role}-${blockId}-saw-heat-stained-tooth-${index}`,
      {
        width: Math.max(bladeThickness * 0.92, 0.06),
        height: Math.max(bladeDiameter * 0.035, 0.028),
        depth: Math.max(bladeDiameter * 0.12, 0.07),
      },
      scene,
    )

    toothWear.position.set(
      0,
      Math.sin(angle) * bladeDiameter * 0.48,
      Math.cos(angle) * bladeDiameter * 0.48,
    )
    toothWear.rotation.x = angle
    attachWeaponEdgeMesh(toothWear, bladeRoot, materials.profile.burnt_critical_metal)
  }
}

export function createSpinnerWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  partId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const isLargeSpinner = partId === 'Weapon_Spinner_Large'
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
  const cutterRing = MeshBuilder.CreateTorus(
    `${role}-${blockId}-spinner-hardened-cutter-ring`,
    {
      diameter: spinnerDiameter * 0.96,
      thickness: Math.max(height * 0.055, 0.035),
      tessellation: 28,
    },
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
  const spinnerRoot = new TransformNode(`${role}-${blockId}-spinner-motion-root`, scene)

  disc.rotation.z = Math.PI / 2
  hub.rotation.z = Math.PI / 2
  cutterRing.rotation.z = Math.PI / 2
  spinnerRoot.position.set(0, spinnerCenterY, spinnerCenterZ)
  spinnerRoot.metadata = { kind: 'spin', axis: 'x', speed: 0.15 }
  gearbox.position.set(0, Math.max(height * 0.52, 0.3), -Math.max(depth * 0.24, 0.18))
  upperCowl.position.set(0, Math.max(height * 1.04, 0.58), -Math.max(depth * 0.04, 0.04))
  disc.parent = spinnerRoot
  hub.parent = spinnerRoot
  spinnerRoot.parent = parent
  attachWeaponEdgeMesh(disc, spinnerRoot, material)
  attachRoleMesh(hub, spinnerRoot, materials.trim, 'trim')
  attachWeaponEdgeMesh(cutterRing, spinnerRoot, materials.steel)
  attachMesh(gearbox, parent, material)
  tagRoleMesh(gearbox, 'damageable')
  attachRoleMesh(upperCowl, parent, materials.trim, 'trim')
  createBladeFaceDetails({
    scene,
    parent: spinnerRoot,
    material: materials.steel,
    namePrefix: `${role}-${blockId}-spinner`,
    centerY: 0,
    centerZ: 0,
    radius: spinnerDiameter * 0.34,
    thickness: Math.max(height * 0.2, 0.12),
  })

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
  tagRoleMesh(forkLeft, 'damageable')
  tagRoleMesh(forkRight, 'damageable')

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const bar = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-blade-${index}`,
      { width: Math.max(depth * 0.1, 0.08), height: Math.max(width * 0.18, 0.12), depth: spinnerDiameter * 0.86 },
      scene,
    )

    bar.rotation.x = angle
    attachWeaponEdgeMesh(bar, spinnerRoot, materials.steel)
  }

  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10
    const bite = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-rim-bite-${index}`,
      {
        width: Math.max(height * 0.18, 0.08),
        height: Math.max(spinnerDiameter * 0.08, 0.06),
        depth: Math.max(spinnerDiameter * 0.14, 0.1),
      },
      scene,
    )

    bite.position.set(0, Math.sin(angle) * spinnerDiameter * 0.5, Math.cos(angle) * spinnerDiameter * 0.5)
    bite.rotation.x = angle
    attachWeaponEdgeMesh(bite, spinnerRoot, materials.steel)
  }

  const strikerCount = isLargeSpinner ? 4 : 3
  for (let index = 0; index < strikerCount; index += 1) {
    const angle = (Math.PI * 2 * index) / strikerCount + (isLargeSpinner ? 0.18 : 0.34)
    const striker = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-asymmetric-striker-${index}`,
      {
        width: Math.max(height * 0.18, 0.08),
        height: Math.max(spinnerDiameter * (isLargeSpinner ? 0.12 : 0.095), 0.075),
        depth: Math.max(spinnerDiameter * (isLargeSpinner ? 0.2 : 0.16), 0.11),
      },
      scene,
    )

    striker.position.set(0, Math.sin(angle) * spinnerDiameter * 0.43, Math.cos(angle) * spinnerDiameter * 0.43)
    striker.rotation.x = angle + 0.24
    attachWeaponEdgeMesh(striker, spinnerRoot, materials.warning)
  }

  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * 2 * index) / 4 + 0.4
    const heatStain = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-heat-stained-edge-${index}`,
      {
        width: Math.max(height * 0.06, 0.035),
        height: Math.max(spinnerDiameter * 0.045, 0.035),
        depth: Math.max(spinnerDiameter * 0.16, 0.09),
      },
      scene,
    )

    heatStain.position.set(0, Math.sin(angle) * spinnerDiameter * 0.5, Math.cos(angle) * spinnerDiameter * 0.5)
    heatStain.rotation.x = angle
    attachWeaponEdgeMesh(heatStain, spinnerRoot, materials.profile.burnt_critical_metal)
  }
}

function createBladeFaceDetails({
  scene,
  parent,
  material,
  namePrefix,
  centerY,
  centerZ,
  radius,
  thickness,
}: {
  scene: WeaponPartRenderArgs['scene']
  parent: WeaponPartRenderArgs['parent']
  material: WeaponPartRenderArgs['materials']['trim']
  namePrefix: string
  centerY: number
  centerZ: number
  radius: number
  thickness: number
}): void {
  for (const faceX of [-thickness * 0.66, thickness * 0.66]) {
    const ring = MeshBuilder.CreateTorus(
      `${namePrefix}-machined-ring-${faceX > 0 ? 'right' : 'left'}`,
      {
        diameter: radius * 1.18,
        thickness: Math.max(radius * 0.035, 0.018),
        tessellation: 26,
      },
      scene,
    )

    ring.rotation.z = Math.PI / 2
    ring.position.set(faceX, centerY, centerZ)
    attachMesh(ring, parent, material)

    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6
      const balanceHole = MeshBuilder.CreateCylinder(
        `${namePrefix}-balance-hole-${faceX > 0 ? 'right' : 'left'}-${index}`,
        {
          height: Math.max(thickness * 0.16, 0.018),
          diameter: Math.max(radius * 0.18, 0.05),
          tessellation: 10,
        },
        scene,
      )

      balanceHole.rotation.z = Math.PI / 2
      balanceHole.position.set(
        faceX,
        centerY + Math.sin(angle) * radius * 0.72,
        centerZ + Math.cos(angle) * radius * 0.72,
      )
      attachMesh(balanceHole, parent, material)
    }
  }
}
