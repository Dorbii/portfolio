import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createUtilityFrame } from './utilityFrame'
import { createVacuumTubePair } from './utilityFrame'

export function createSensorUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Sensor')


    const detail = MeshBuilder.CreateBox(
      `${role}-${blockId}-utility-detail`,
      {
        width: Math.max(width * 0.3, 0.12),
        height: Math.max(height * 0.3, 0.12),
        depth: Math.max(depth * 0.7, 0.28),
      },
      scene,
    )
    detail.position.z = Math.max(depth * 0.28, 0.22)
    attachMesh(detail, parent, materials.trim)


    const mast = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-sensor-mast`,
      { height: Math.max(height * 0.58, 0.32), diameter: 0.055, tessellation: 8 },
      scene,
    )
    const sensorHead = MeshBuilder.CreateBox(
      `${role}-${blockId}-sensor-head`,
      {
        width: Math.max(width * 0.42, 0.2),
        height: Math.max(height * 0.16, 0.1),
        depth: Math.max(depth * 0.24, 0.14),
      },
      scene,
    )
    const optic = MeshBuilder.CreateSphere(
      `${role}-${blockId}-sensor-optic`,
      { diameter: Math.max(width * 0.18, 0.1), segments: 8 },
      scene,
    )

    mast.position.set(-Math.max(width * 0.22, 0.14), Math.max(height * 0.74, 0.42), 0)
    sensorHead.position.set(mast.position.x, Math.max(height * 1.05, 0.58), Math.max(depth * 0.08, 0.08))
    optic.position.set(mast.position.x, sensorHead.position.y, Math.max(depth * 0.24, 0.16))
    attachMesh(mast, parent, materials.trim)
    attachMesh(sensorHead, parent, material)
    attachMesh(optic, parent, materials.light)
    createVacuumTubePair(scene, parent, materials, role, blockId, width, height, depth)

  attachMesh(box, parent, material)
}
