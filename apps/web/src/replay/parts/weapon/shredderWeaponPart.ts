import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

export function createShredderWeaponPart({
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
  const drumRoot = new TransformNode(`${role}-${blockId}-shredder-drum-motion-root`, scene)
  const drumLength = Math.max(depth * 1.1, 0.86)
  const drumRadius = Math.max(width * 0.28, 0.18)
  const drumY = Math.max(height * 0.58, 0.34)
  const drumZ = Math.max(depth * 0.25, 0.2)

  drumRoot.position.set(0, drumY, drumZ)
  drumRoot.metadata = { kind: 'spin', axis: 'z', speed: 0.14 }
  drumRoot.parent = parent

  const driveShaft = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-shredder-center-drive-shaft`,
    {
      height: drumLength * 1.16,
      diameter: Math.max(width * 0.1, 0.065),
      tessellation: 14,
    },
    scene,
  )
  driveShaft.rotation.x = Math.PI / 2
  attachMesh(driveShaft, drumRoot, materials.steel)

  for (let disc = 0; disc < 6; disc += 1) {
    const discZ = -drumLength * 0.42 + disc * drumLength * 0.168
    const blade = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-shredder-toothed-disc-${disc}`,
      {
        height: Math.max(depth * 0.055, 0.045),
        diameter: drumRadius * 2,
        tessellation: 18,
      },
      scene,
    )
    const hub = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-shredder-bolted-hub-${disc}`,
      {
        height: Math.max(depth * 0.068, 0.052),
        diameter: drumRadius * 0.78,
        tessellation: 14,
      },
      scene,
    )

    blade.rotation.x = Math.PI / 2
    hub.rotation.x = Math.PI / 2
    blade.position.z = discZ
    hub.position.z = discZ
    attachMesh(blade, drumRoot, disc % 2 === 0 ? material : materials.steel)
    attachMesh(hub, drumRoot, materials.trim)

    for (let tooth = 0; tooth < 8; tooth += 1) {
      const angle = (Math.PI * 2 * tooth) / 8 + disc * 0.22
      const bite = MeshBuilder.CreateBox(
        `${role}-${blockId}-shredder-offset-bite-tooth-${disc}-${tooth}`,
        {
          width: Math.max(width * 0.1, 0.06),
          height: Math.max(height * 0.11, 0.055),
          depth: Math.max(depth * 0.09, 0.06),
        },
        scene,
      )

      bite.position.set(
        Math.cos(angle) * drumRadius,
        Math.sin(angle) * drumRadius,
        discZ,
      )
      bite.rotation.z = angle
      bite.rotation.y = disc % 2 === 0 ? 0.24 : -0.24
      attachMesh(bite, drumRoot, materials.steel)
    }
  }

  createShredderSupportFrame({
    scene,
    parent,
    material,
    role,
    blockId,
    width,
    height,
    depth,
    materials,
    drumY,
    drumZ,
    drumLength,
  })
}

type ShredderFrameArgs = Omit<WeaponPartRenderArgs, 'partId'> & {
  drumY: number
  drumZ: number
  drumLength: number
}

function createShredderSupportFrame({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
  drumY,
  drumZ,
  drumLength,
}: ShredderFrameArgs): void {
  const gearbox = MeshBuilder.CreateBox(
    `${role}-${blockId}-shredder-armored-gearbox`,
    {
      width: Math.max(width * 0.78, 0.52),
      height: Math.max(height * 0.34, 0.22),
      depth: Math.max(depth * 0.34, 0.26),
    },
    scene,
  )
  const rearBearing = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-shredder-rear-bearing-collar`,
    {
      height: Math.max(depth * 0.08, 0.06),
      diameter: Math.max(width * 0.56, 0.34),
      tessellation: 18,
    },
    scene,
  )

  gearbox.position.set(0, Math.max(height * 0.38, 0.24), -Math.max(depth * 0.24, 0.18))
  rearBearing.position.set(0, drumY, drumZ - drumLength * 0.52)
  rearBearing.rotation.x = Math.PI / 2
  attachMesh(gearbox, parent, material)
  attachMesh(rearBearing, parent, materials.trim)

  for (const side of [-1, 1]) {
    const cheek = MeshBuilder.CreateBox(
      `${role}-${blockId}-shredder-side-cheek-plate-${side}`,
      {
        width: Math.max(width * 0.1, 0.07),
        height: Math.max(height * 0.52, 0.28),
        depth: Math.max(depth * 1.1, 0.78),
      },
      scene,
    )
    const noseSkid = MeshBuilder.CreateBox(
      `${role}-${blockId}-shredder-nose-skid-${side}`,
      {
        width: Math.max(width * 0.14, 0.08),
        height: Math.max(height * 0.08, 0.045),
        depth: Math.max(depth * 0.42, 0.26),
      },
      scene,
    )

    cheek.position.set(side * Math.max(width * 0.44, 0.28), Math.max(height * 0.36, 0.22), drumZ)
    noseSkid.position.set(side * Math.max(width * 0.32, 0.2), Math.max(height * 0.12, 0.08), drumZ + drumLength * 0.38)
    attachMesh(cheek, parent, materials.trim)
    attachMesh(noseSkid, parent, materials.steel)
  }

  for (let index = 0; index < 6; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-shredder-frame-bolt-${index}`,
      {
        height: 0.025,
        diameter: Math.max(width * 0.045, 0.026),
        tessellation: 8,
      },
      scene,
    )

    bolt.position.set(
      (index % 2 === 0 ? -1 : 1) * Math.max(width * 0.36, 0.22),
      Math.max(height * (0.22 + Math.floor(index / 2) * 0.16), 0.13),
      drumZ - Math.max(depth * 0.22, 0.14),
    )
    bolt.rotation.x = Math.PI / 2
    attachMesh(bolt, parent, materials.steel)
  }
}
