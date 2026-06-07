import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createUtilityFrame } from './utilityFrame'

export function createBoosterUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Booster')
  const tankY = Math.max(height * 0.56, 0.3)
  const nozzleZ = -Math.max(depth * 0.46, 0.28)
  const outletZ = -Math.max(depth * 0.68, 0.42)

  const thrustFrame = MeshBuilder.CreateBox(
    `${role}-${blockId}-booster-thrust-frame`,
    {
      width: Math.max(width * 0.74, 0.42),
      height: Math.max(height * 0.18, 0.1),
      depth: Math.max(depth * 0.18, 0.1),
    },
    scene,
  )
  const pressureTank = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-booster-pressure-tank`,
    {
      height: Math.max(depth * 0.7, 0.38),
      diameter: Math.max(width * 0.42, 0.24),
      tessellation: 18,
    },
    scene,
  )
  const topCap = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-booster-top-valve-cap`,
    {
      height: Math.max(height * 0.1, 0.055),
      diameter: Math.max(width * 0.18, 0.1),
      tessellation: 14,
    },
    scene,
  )

  thrustFrame.position.set(0, Math.max(height * 0.22, 0.13), nozzleZ)
  pressureTank.rotation.x = Math.PI / 2
  pressureTank.position.set(0, tankY, -Math.max(depth * 0.06, 0.04))
  topCap.position.set(0, tankY + Math.max(height * 0.26, 0.16), -Math.max(depth * 0.06, 0.04))
  attachMesh(thrustFrame, parent, materials.steel)
  attachMesh(pressureTank, parent, materials.trim)
  attachMesh(topCap, parent, materials.warning)

  for (let ringIndex = -1; ringIndex <= 1; ringIndex += 1) {
    const band = MeshBuilder.CreateTorus(
      `${role}-${blockId}-booster-tank-band-${ringIndex}`,
      {
        diameter: Math.max(width * 0.44, 0.25),
        thickness: 0.018,
        tessellation: 18,
      },
      scene,
    )

    band.rotation.x = Math.PI / 2
    band.position.set(0, tankY, ringIndex * Math.max(depth * 0.24, 0.13) - Math.max(depth * 0.06, 0.04))
    attachMesh(band, parent, ringIndex === 0 ? material : materials.steel)
  }

  for (let index = -1; index <= 1; index += 2) {
    const core = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-booster-nozzle-core-${index}`,
      { height: Math.max(depth * 0.28, 0.18), diameter: Math.max(width * 0.2, 0.13), tessellation: 14 },
      scene,
    )
    const flame = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-booster-flame-${index}`,
      {
        height: Math.max(depth * 0.28, 0.2),
        diameterTop: 0,
        diameterBottom: Math.max(width * 0.18, 0.1),
        tessellation: 12,
      },
      scene,
    )
    const nozzleRing = MeshBuilder.CreateTorus(
      `${role}-${blockId}-booster-nozzle-ring-${index}`,
      {
        diameter: Math.max(width * 0.24, 0.15),
        thickness: 0.03,
        tessellation: 14,
      },
      scene,
    )
    const feedLine = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-booster-feed-line-${index}`,
      {
        height: Math.max(depth * 0.38, 0.22),
        diameter: Math.max(width * 0.035, 0.024),
        tessellation: 8,
      },
      scene,
    )

    core.rotation.x = Math.PI / 2
    flame.rotation.x = -Math.PI / 2
    nozzleRing.rotation.x = Math.PI / 2
    feedLine.rotation.x = Math.PI / 2
    core.position.set(index * Math.max(width * 0.23, 0.14), Math.max(height * 0.24, 0.14), nozzleZ)
    flame.position.set(core.position.x, core.position.y, outletZ)
    nozzleRing.position.set(core.position.x, core.position.y, nozzleZ - Math.max(depth * 0.16, 0.1))
    feedLine.position.set(index * Math.max(width * 0.28, 0.16), Math.max(height * 0.44, 0.24), -Math.max(depth * 0.18, 0.11))
    flame.metadata = { kind: 'thrust', speed: 0.09 }
    attachMesh(core, parent, materials.trim)
    attachMesh(nozzleRing, parent, materials.warning)
    attachMesh(flame, parent, materials.light)
    attachMesh(feedLine, parent, materials.steel)
  }

  for (let side = -1; side <= 1; side += 2) {
    const fin = MeshBuilder.CreateBox(
      `${role}-${blockId}-booster-stabilizer-fin-${side}`,
      {
        width: Math.max(width * 0.12, 0.07),
        height: Math.max(height * 0.32, 0.18),
        depth: Math.max(depth * 0.18, 0.1),
      },
      scene,
    )

    fin.position.set(side * Math.max(width * 0.44, 0.24), Math.max(height * 0.34, 0.2), -Math.max(depth * 0.3, 0.18))
    fin.rotation.z = side * 0.16
    attachMesh(fin, parent, material)
  }

  attachMesh(box, parent, materials.utility)
}
