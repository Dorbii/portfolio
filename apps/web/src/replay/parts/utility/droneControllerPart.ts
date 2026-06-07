import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createUtilityFrame } from './utilityFrame'
import { createPcbConnectorDetails } from './utilityFrame'

export function createDroneControllerUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Drone')


    const antenna = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-drone-antenna`,
      { height: Math.max(height * 0.62, 0.34), diameter: 0.045, tessellation: 8 },
      scene,
    )
    const dish = MeshBuilder.CreateTorus(
      `${role}-${blockId}-drone-dish`,
      { diameter: Math.max(width * 0.44, 0.24), thickness: 0.035, tessellation: 16 },
      scene,
    )

    antenna.position.set(-Math.max(width * 0.22, 0.14), Math.max(height * 0.86, 0.45), Math.max(depth * 0.08, 0.06))
    dish.rotation.x = Math.PI / 2
    dish.position.set(antenna.position.x, Math.max(height * 1.2, 0.62), Math.max(depth * 0.16, 0.12))
    attachMesh(antenna, parent, materials.trim)
    attachMesh(dish, parent, materials.light)

    for (let side = -1; side <= 1; side += 2) {
      const droneBay = MeshBuilder.CreateBox(
        `${role}-${blockId}-drone-bay-${side}`,
        {
          width: Math.max(width * 0.28, 0.16),
          height: Math.max(height * 0.16, 0.1),
          depth: Math.max(depth * 0.34, 0.18),
        },
        scene,
      )
      const rotor = MeshBuilder.CreateTorus(
        `${role}-${blockId}-drone-rotor-${side}`,
        { diameter: Math.max(width * 0.3, 0.18), thickness: 0.025, tessellation: 14 },
        scene,
      )

      droneBay.position.set(side * Math.max(width * 0.24, 0.15), Math.max(height * 0.56, 0.3), Math.max(depth * 0.3, 0.18))
      rotor.rotation.x = Math.PI / 2
      rotor.position.set(droneBay.position.x, Math.max(height * 0.72, 0.38), droneBay.position.z)
      rotor.metadata = { kind: 'spin', axis: 'z', speed: 0.06 }
      attachMesh(droneBay, parent, materials.utility)
      attachMesh(rotor, parent, materials.warning)
    }

    createPcbConnectorDetails(scene, parent, materials, role, blockId, width, height, depth, Math.max(height * 0.62, 0.34))

  attachMesh(box, parent, material)
}
