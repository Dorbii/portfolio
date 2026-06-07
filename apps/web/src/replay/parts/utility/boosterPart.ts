import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createUtilityFrame } from './utilityFrame'

export function createBoosterUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Booster')


    const thrustFrame = MeshBuilder.CreateBox(
      `${role}-${blockId}-booster-thrust-frame`,
      {
        width: Math.max(width * 0.74, 0.42),
        height: Math.max(height * 0.26, 0.14),
        depth: Math.max(depth * 0.22, 0.14),
      },
      scene,
    )

    thrustFrame.position.set(0, Math.max(height * 0.18, 0.12), -Math.max(depth * 0.28, 0.18))
    attachMesh(thrustFrame, parent, materials.steel)

    for (let index = -1; index <= 1; index += 2) {
      const core = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-booster-core-${index}`,
        { height: Math.max(depth * 0.42, 0.22), diameter: Math.max(width * 0.24, 0.16), tessellation: 12 },
        scene,
      )
      const flame = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-booster-flame-${index}`,
        {
          height: Math.max(depth * 0.32, 0.24),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.2, 0.12),
          tessellation: 12,
        },
        scene,
      )
      const nozzleRing = MeshBuilder.CreateTorus(
        `${role}-${blockId}-booster-nozzle-ring-${index}`,
        {
          diameter: Math.max(width * 0.26, 0.16),
          thickness: 0.035,
          tessellation: 14,
        },
        scene,
      )

      core.rotation.x = Math.PI / 2
      flame.rotation.x = -Math.PI / 2
      nozzleRing.rotation.x = Math.PI / 2
      core.position.set(index * Math.max(width * 0.22, 0.14), Math.max(height * 0.1, 0.12), Math.max(depth * 0.38, 0.24))
      flame.position.set(index * Math.max(width * 0.22, 0.14), Math.max(height * 0.1, 0.12), -Math.max(depth * 0.1, 0.12))
      nozzleRing.position.set(index * Math.max(width * 0.22, 0.14), Math.max(height * 0.1, 0.12), -Math.max(depth * 0.24, 0.18))
      flame.metadata = { kind: 'thrust', speed: 0.09 }
      attachMesh(core, parent, materials.trim)
      attachMesh(nozzleRing, parent, materials.warning)
      attachMesh(flame, parent, materials.light)
    }

  attachMesh(box, parent, material)
}
