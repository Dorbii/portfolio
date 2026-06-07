import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

export function createTurretWeaponPart({
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
  const receiverY = Math.max(height * 0.54, 0.34)
  const receiverZ = Math.max(depth * 0.06, 0.06)
  const barrelRootY = Math.max(height * 0.58, 0.36)
  const barrelRootZ = Math.max(depth * 0.28, 0.28)
  const barrelLength = Math.max(depth * 0.86, 0.78)
  const barrelRadius = Math.max(width * 0.17, 0.095)

  createTurntableBase({ scene, parent, role, blockId, width, height, depth, materials })

  const receiver = MeshBuilder.CreateBox(
    `${role}-${blockId}-turret-receiver-core`,
    {
      width: Math.max(width * 0.72, 0.44),
      height: Math.max(height * 0.34, 0.22),
      depth: Math.max(depth * 0.42, 0.36),
    },
    scene,
  )
  const topArmor = MeshBuilder.CreateBox(
    `${role}-${blockId}-turret-sloped-top-armor`,
    {
      width: Math.max(width * 0.62, 0.36),
      height: Math.max(height * 0.11, 0.07),
      depth: Math.max(depth * 0.38, 0.28),
    },
    scene,
  )
  const rearCounterweight = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-rear-counterweight`,
    {
      height: Math.max(width * 0.32, 0.2),
      diameter: Math.max(width * 0.42, 0.26),
      tessellation: 18,
    },
    scene,
  )
  const frontCollar = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-front-barrel-collar`,
    {
      height: Math.max(depth * 0.08, 0.07),
      diameter: Math.max(width * 0.5, 0.34),
      tessellation: 24,
    },
    scene,
  )

  receiver.position.set(0, receiverY, receiverZ)
  topArmor.position.set(0, receiverY + Math.max(height * 0.22, 0.13), receiverZ - Math.max(depth * 0.04, 0.03))
  topArmor.rotation.x = -0.18
  rearCounterweight.position.set(0, receiverY, -Math.max(depth * 0.34, 0.24))
  rearCounterweight.rotation.z = Math.PI / 2
  frontCollar.position.set(0, barrelRootY, barrelRootZ)
  frontCollar.rotation.x = Math.PI / 2
  attachMesh(receiver, parent, materials.trim)
  attachMesh(topArmor, parent, material)
  attachMesh(rearCounterweight, parent, materials.steel)
  attachMesh(frontCollar, parent, materials.steel)

  createSideYokes({ scene, parent, role, blockId, width, height, depth, receiverY, receiverZ, materials })
  createCoolingAndServiceDetails({ scene, parent, role, blockId, width, height, depth, receiverY, receiverZ, materials })
  createRotaryBarrelCluster({
    scene,
    parent,
    role,
    blockId,
    barrelRootY,
    barrelRootZ,
    barrelLength,
    barrelRadius,
    width,
    depth,
    materials,
  })
}

type TurretBaseArgs = Pick<WeaponPartRenderArgs, 'scene' | 'parent' | 'role' | 'blockId' | 'width' | 'height' | 'depth' | 'materials'>

function createTurntableBase({
  scene,
  parent,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: TurretBaseArgs): void {
  const baseY = Math.max(height * 0.16, 0.1)
  const pedestalY = Math.max(height * 0.3, 0.18)
  const baseDiameter = Math.max(Math.max(width, depth) * 0.64, 0.48)
  const turntable = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-bolted-turntable`,
    {
      height: Math.max(height * 0.14, 0.08),
      diameter: baseDiameter,
      tessellation: 28,
    },
    scene,
  )
  const pedestal = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-armored-pedestal`,
    {
      height: Math.max(height * 0.32, 0.18),
      diameter: Math.max(width * 0.36, 0.24),
      tessellation: 18,
    },
    scene,
  )
  const gearRing = MeshBuilder.CreateTorus(
    `${role}-${blockId}-turret-traverse-gear-ring`,
    {
      diameter: Math.max(baseDiameter * 0.92, 0.42),
      thickness: Math.max(width * 0.04, 0.024),
      tessellation: 28,
    },
    scene,
  )

  turntable.position.y = baseY
  pedestal.position.y = pedestalY
  gearRing.position.y = baseY + Math.max(height * 0.09, 0.05)
  attachMesh(turntable, parent, materials.trim)
  attachMesh(pedestal, parent, materials.steel)
  attachMesh(gearRing, parent, materials.steel)

  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10
    const foot = MeshBuilder.CreateBox(
      `${role}-${blockId}-turret-base-foot-${index}`,
      {
        width: Math.max(width * 0.11, 0.07),
        height: Math.max(height * 0.06, 0.035),
        depth: Math.max(depth * 0.2, 0.12),
      },
      scene,
    )
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-turret-base-bolt-${index}`,
      {
        height: 0.026,
        diameter: Math.max(width * 0.052, 0.03),
        tessellation: 8,
      },
      scene,
    )

    foot.position.set(Math.sin(angle) * baseDiameter * 0.48, Math.max(height * 0.08, 0.05), Math.cos(angle) * baseDiameter * 0.48)
    foot.rotation.y = angle
    bolt.position.set(Math.sin(angle) * baseDiameter * 0.34, baseY + Math.max(height * 0.08, 0.045), Math.cos(angle) * baseDiameter * 0.34)
    attachMesh(foot, parent, materials.steel)
    attachMesh(bolt, parent, materials.steel)
  }
}

type SideYokeArgs = TurretBaseArgs & {
  receiverY: number
  receiverZ: number
}

function createSideYokes({
  scene,
  parent,
  role,
  blockId,
  width,
  height,
  depth,
  receiverY,
  receiverZ,
  materials,
}: SideYokeArgs): void {
  for (const side of [-1, 1]) {
    const sidePlate = MeshBuilder.CreateBox(
      `${role}-${blockId}-turret-side-yoke-${side}`,
      {
        width: Math.max(width * 0.12, 0.07),
        height: Math.max(height * 0.42, 0.24),
        depth: Math.max(depth * 0.52, 0.34),
      },
      scene,
    )
    const pivotCap = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-turret-elevation-pivot-${side}`,
      {
        height: Math.max(width * 0.1, 0.06),
        diameter: Math.max(width * 0.18, 0.11),
        tessellation: 16,
      },
      scene,
    )
    const brace = MeshBuilder.CreateBox(
      `${role}-${blockId}-turret-triangle-brace-${side}`,
      {
        width: Math.max(width * 0.09, 0.055),
        height: Math.max(height * 0.12, 0.07),
        depth: Math.max(depth * 0.56, 0.32),
      },
      scene,
    )

    sidePlate.position.set(side * Math.max(width * 0.44, 0.27), receiverY - Math.max(height * 0.01, 0.01), receiverZ)
    pivotCap.position.set(side * Math.max(width * 0.51, 0.31), receiverY, receiverZ + Math.max(depth * 0.02, 0.02))
    pivotCap.rotation.z = Math.PI / 2
    brace.position.set(side * Math.max(width * 0.34, 0.22), Math.max(height * 0.32, 0.2), receiverZ - Math.max(depth * 0.2, 0.14))
    brace.rotation.x = side * 0.18
    attachMesh(sidePlate, parent, materials.trim)
    attachMesh(pivotCap, parent, materials.steel)
    attachMesh(brace, parent, materials.steel)
  }
}

type BarrelClusterArgs = Pick<WeaponPartRenderArgs, 'scene' | 'parent' | 'role' | 'blockId' | 'width' | 'depth' | 'materials'> & {
  barrelLength: number
  barrelRadius: number
  barrelRootY: number
  barrelRootZ: number
}

function createRotaryBarrelCluster({
  scene,
  parent,
  role,
  blockId,
  width,
  depth,
  materials,
  barrelLength,
  barrelRadius,
  barrelRootY,
  barrelRootZ,
}: BarrelClusterArgs): void {
  const barrelRoot = new TransformNode(`${role}-${blockId}-turret-barrel-cluster-motion-root`, scene)
  const rearPlate = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-rotary-rear-plate`,
    {
      height: Math.max(depth * 0.055, 0.05),
      diameter: Math.max(width * 0.48, 0.31),
      tessellation: 24,
    },
    scene,
  )
  const frontPlate = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-rotary-front-plate`,
    {
      height: Math.max(depth * 0.055, 0.05),
      diameter: Math.max(width * 0.4, 0.28),
      tessellation: 24,
    },
    scene,
  )
  const centerShaft = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-center-drive-shaft`,
    {
      height: barrelLength * 0.92,
      diameter: Math.max(width * 0.06, 0.04),
      tessellation: 12,
    },
    scene,
  )

  barrelRoot.position.set(0, barrelRootY, barrelRootZ)
  barrelRoot.metadata = { kind: 'spin', axis: 'z', speed: 0.16 }
  barrelRoot.parent = parent
  rearPlate.rotation.x = Math.PI / 2
  frontPlate.rotation.x = Math.PI / 2
  centerShaft.rotation.x = Math.PI / 2
  frontPlate.position.z = barrelLength * 0.78
  centerShaft.position.z = barrelLength * 0.42
  attachMesh(rearPlate, barrelRoot, materials.steel)
  attachMesh(frontPlate, barrelRoot, materials.steel)
  attachMesh(centerShaft, barrelRoot, materials.trim)

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const x = Math.cos(angle) * barrelRadius
    const y = Math.sin(angle) * barrelRadius
    const barrel = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-turret-rotary-barrel-${index}`,
      {
        height: barrelLength,
        diameter: Math.max(width * 0.052, 0.035),
        tessellation: 12,
      },
      scene,
    )
    const muzzle = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-turret-muzzle-brake-${index}`,
      {
        height: Math.max(depth * 0.1, 0.075),
        diameter: Math.max(width * 0.078, 0.048),
        tessellation: 12,
      },
      scene,
    )
    const heatSleeve = MeshBuilder.CreateBox(
      `${role}-${blockId}-turret-barrel-heat-sleeve-${index}`,
      {
        width: Math.max(width * 0.045, 0.028),
        height: Math.max(width * 0.03, 0.02),
        depth: Math.max(depth * 0.22, 0.16),
      },
      scene,
    )

    barrel.rotation.x = Math.PI / 2
    muzzle.rotation.x = Math.PI / 2
    barrel.position.set(x, y, barrelLength * 0.42)
    muzzle.position.set(x, y, barrelLength * 0.92)
    heatSleeve.position.set(x * 0.96, y * 0.96, barrelLength * 0.36)
    heatSleeve.rotation.z = angle
    attachMesh(barrel, barrelRoot, materials.steel)
    attachMesh(muzzle, barrelRoot, materials.trim)
    attachMesh(heatSleeve, barrelRoot, materials.warning)
  }
}

type ServiceDetailArgs = SideYokeArgs

function createCoolingAndServiceDetails({
  scene,
  parent,
  role,
  blockId,
  width,
  height,
  depth,
  receiverY,
  receiverZ,
  materials,
}: ServiceDetailArgs): void {
  const topSight = MeshBuilder.CreateBox(
    `${role}-${blockId}-turret-team-sight-block`,
    {
      width: Math.max(width * 0.16, 0.1),
      height: Math.max(height * 0.045, 0.028),
      depth: Math.max(depth * 0.2, 0.12),
    },
    scene,
  )
  const sensorLens = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-turret-rangefinder-lens`,
    {
      height: 0.026,
      diameter: Math.max(width * 0.065, 0.038),
      tessellation: 12,
    },
    scene,
  )
  const statusLed = MeshBuilder.CreateSphere(
    `${role}-${blockId}-turret-status-led`,
    {
      diameter: Math.max(width * 0.045, 0.028),
      segments: 8,
    },
    scene,
  )

  topSight.position.set(0, receiverY + Math.max(height * 0.29, 0.17), receiverZ + Math.max(depth * 0.12, 0.09))
  sensorLens.position.set(0, receiverY + Math.max(height * 0.2, 0.12), receiverZ + Math.max(depth * 0.28, 0.22))
  statusLed.position.set(Math.max(width * 0.22, 0.13), receiverY + Math.max(height * 0.24, 0.15), receiverZ + Math.max(depth * 0.16, 0.1))
  sensorLens.rotation.x = Math.PI / 2
  attachMesh(topSight, parent, materials.trim)
  attachMesh(sensorLens, parent, materials.light)
  attachMesh(statusLed, parent, materials.light)

  for (let index = 0; index < 5; index += 1) {
    const vent = MeshBuilder.CreateBox(
      `${role}-${blockId}-turret-receiver-vent-${index}`,
      {
        width: Math.max(width * 0.08, 0.045),
        height: Math.max(height * 0.035, 0.022),
        depth: Math.max(depth * 0.18, 0.1),
      },
      scene,
    )

    vent.position.set(
      (index - 2) * Math.max(width * 0.105, 0.062),
      receiverY + Math.max(height * 0.12, 0.075),
      receiverZ - Math.max(depth * 0.17, 0.12),
    )
    attachMesh(vent, parent, materials.steel)
  }

  for (let index = 0; index < 8; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const row = Math.floor(index / 2)
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-turret-receiver-bolt-${index}`,
      {
        height: 0.022,
        diameter: Math.max(width * 0.042, 0.025),
        tessellation: 8,
      },
      scene,
    )

    bolt.position.set(
      side * Math.max(width * 0.32, 0.19),
      receiverY + Math.max(height * (0.09 + row * 0.08), 0.055 + row * 0.045),
      receiverZ + Math.max(depth * 0.22, 0.14),
    )
    bolt.rotation.x = Math.PI / 2
    attachMesh(bolt, parent, materials.steel)
  }
}
