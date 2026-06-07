import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createUtilityFrame } from './utilityFrame'

export function createSmokeUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Smoke')


    const nozzleRack = MeshBuilder.CreateBox(
      `${role}-${blockId}-smoke-nozzle-rack`,
      {
        width: Math.max(width * 0.68, 0.34),
        height: Math.max(height * 0.16, 0.09),
        depth: Math.max(depth * 0.18, 0.1),
      },
      scene,
    )

    nozzleRack.position.set(0, Math.max(height * 0.52, 0.3), Math.max(depth * 0.46, 0.28))
    attachMesh(nozzleRack, parent, materials.steel)

    for (let index = -1; index <= 1; index += 1) {
      const nozzle = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-smoke-nozzle-${index + 1}`,
        {
          height: Math.max(depth * 0.2, 0.12),
          diameter: Math.max(width * 0.095, 0.055),
          tessellation: 10,
        },
        scene,
      )

      nozzle.rotation.x = Math.PI / 2
      nozzle.position.set(index * Math.max(width * 0.18, 0.1), nozzleRack.position.y, Math.max(depth * 0.58, 0.36))
      attachMesh(nozzle, parent, materials.trim)
    }

    for (let index = 0; index < 3; index += 1) {
      const puff = MeshBuilder.CreateSphere(
        `${role}-${blockId}-smoke-puff-${index}`,
        { diameter: Math.max(width * (0.34 + index * 0.08), 0.22), segments: 10 },
        scene,
      )

      puff.position.set((index - 1) * 0.12, Math.max(height * 0.38, 0.25) + index * 0.08, Math.max(depth * 0.26, 0.22))
      puff.metadata = { kind: 'smoke', speed: 0.04 + index * 0.01 }
      attachMesh(puff, parent, materials.trim)
    }

  attachMesh(box, parent, material)
}
