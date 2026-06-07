import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { MobilityPartRenderArgs } from './types'

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
  createSpringLegFootTread(scene, parent, materials.profile.scuffed_rubber, role, blockId, width, height, depth)
  createSpringLegPivotHardware(scene, parent, materials.steel, role, blockId, width, height, depth)

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

function createSpringLegFootTread(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['rubber'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  const footY = -Math.max(height * 0.18, 0.12)

  for (let index = -1; index <= 1; index += 1) {
    const tread = MeshBuilder.CreateBox(
      `${role}-${blockId}-spring-leg-foot-tread-${index + 1}`,
      {
        width: Math.max(width * 0.16, 0.07),
        height: 0.028,
        depth: Math.max(depth * 0.68, 0.3),
      },
      scene,
    )

    tread.position.set(index * Math.max(width * 0.19, 0.1), footY - 0.052, 0)
    attachMesh(tread, parent, material)
  }
}

function createSpringLegPivotHardware(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (const level of ['ankle', 'knee'] as const) {
    const pin = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spring-leg-${level}-pivot-pin`,
      {
        height: Math.max(width * 0.52, 0.26),
        diameter: Math.max(depth * 0.07, 0.036),
        tessellation: 12,
      },
      scene,
    )

    pin.rotation.z = Math.PI / 2
    pin.position.set(0, level === 'ankle' ? Math.max(height * 0.03, 0.07) : Math.max(height * 0.46, 0.26), 0)
    attachMesh(pin, parent, material)
  }
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
  const contactSole = MeshBuilder.CreateBox(
    `${role}-${blockId}-skid-low-friction-sole`,
    {
      width: Math.max(width * 1.02, 0.58),
      height: Math.max(height * 0.052, 0.032),
      depth: Math.max(depth * 0.62, 0.3),
    },
    scene,
  )

  plate.position.y = -Math.max(height * 0.12, 0.08)
  frontLip.position.set(0, Math.max(height * 0.02, 0.04), Math.max(depth * 0.42, 0.2))
  contactSole.position.y = plate.position.y - Math.max(height * 0.098, 0.052)
  attachMesh(plate, parent, materials.steel)
  attachMesh(frontLip, parent, materials.profile.scuffed_rubber)
  attachMesh(contactSole, parent, materials.profile.scuffed_rubber)

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
    attachMesh(wearStrip, parent, materials.profile.scuffed_rubber)
  }

  createSkidPlateFasteners(scene, parent, materials.steel, role, blockId, width, height, depth)
  createSkidPlateScuffChannels(scene, parent, materials.trim, role, blockId, width, height, depth)
}

function createSkidPlateFasteners(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = 0; index < 6; index += 1) {
    const x = (index % 3 - 1) * Math.max(width * 0.32, 0.18)
    const z = (index < 3 ? -1 : 1) * Math.max(depth * 0.26, 0.13)
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-skid-countersunk-fastener-${index}`,
      {
        height: Math.max(height * 0.024, 0.014),
        diameter: Math.max(width * 0.036, 0.024),
        tessellation: 8,
      },
      scene,
    )

    bolt.position.set(x, -Math.max(height * 0.02, 0.014), z)
    attachMesh(bolt, parent, material)
  }
}

function createSkidPlateScuffChannels(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['trim'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = -1; index <= 1; index += 1) {
    const channel = MeshBuilder.CreateBox(
      `${role}-${blockId}-skid-polished-scuff-channel-${index + 1}`,
      {
        width: Math.max(width * 0.22, 0.12),
        height: Math.max(height * 0.026, 0.016),
        depth: Math.max(depth * 0.66, 0.28),
      },
      scene,
    )

    channel.position.set(index * Math.max(width * 0.28, 0.16), -Math.max(height * 0.19, 0.1), 0)
    attachMesh(channel, parent, material)
  }
}
