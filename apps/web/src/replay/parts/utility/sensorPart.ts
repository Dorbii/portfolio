import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createPcbConnectorDetails, createUtilityFrame } from './utilityFrame'

export function createSensorUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Sensor')
  const boardY = Math.max(height * 0.62, 0.34)

  const sensorBoard = MeshBuilder.CreateBox(
    `${role}-${blockId}-sensor-pcb-board`,
    {
      width: Math.max(width * 0.64, 0.36),
      height: Math.max(height * 0.07, 0.04),
      depth: Math.max(depth * 0.52, 0.28),
    },
    scene,
  )
  const cameraBlock = MeshBuilder.CreateBox(
    `${role}-${blockId}-sensor-camera-block`,
    {
      width: Math.max(width * 0.48, 0.26),
      height: Math.max(height * 0.22, 0.12),
      depth: Math.max(depth * 0.28, 0.16),
    },
    scene,
  )
  const lidarRing = MeshBuilder.CreateTorus(
    `${role}-${blockId}-sensor-lidar-ring`,
    {
      diameter: Math.max(width * 0.34, 0.2),
      thickness: 0.024,
      tessellation: 20,
    },
    scene,
  )
  const antenna = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-sensor-radio-antenna`,
    {
      height: Math.max(height * 0.58, 0.32),
      diameter: 0.032,
      tessellation: 8,
    },
    scene,
  )
  const antennaTip = MeshBuilder.CreateSphere(
    `${role}-${blockId}-sensor-antenna-tip`,
    { diameter: Math.max(width * 0.09, 0.055), segments: 10 },
    scene,
  )

  sensorBoard.position.set(0, boardY, 0)
  cameraBlock.position.set(0, boardY + Math.max(height * 0.16, 0.09), Math.max(depth * 0.2, 0.12))
  lidarRing.rotation.y = Math.PI / 2
  lidarRing.position.set(-Math.max(width * 0.28, 0.16), boardY + Math.max(height * 0.2, 0.11), -Math.max(depth * 0.18, 0.1))
  antenna.position.set(Math.max(width * 0.3, 0.18), boardY + Math.max(height * 0.3, 0.18), -Math.max(depth * 0.18, 0.1))
  antennaTip.position.set(antenna.position.x, antenna.position.y + Math.max(height * 0.32, 0.18), antenna.position.z)
  attachMesh(sensorBoard, parent, materials.circuit)
  attachMesh(cameraBlock, parent, materials.trim)
  attachMesh(lidarRing, parent, material)
  attachMesh(antenna, parent, materials.steel)
  attachMesh(antennaTip, parent, materials.light)

  for (let index = -1; index <= 1; index += 2) {
    const lensHousing = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-sensor-lens-housing-${index}`,
      {
        height: Math.max(depth * 0.12, 0.075),
        diameter: Math.max(width * 0.13, 0.075),
        tessellation: 14,
      },
      scene,
    )
    const lensGlass = MeshBuilder.CreateSphere(
      `${role}-${blockId}-sensor-lens-glass-${index}`,
      { diameter: Math.max(width * 0.085, 0.052), segments: 10 },
      scene,
    )

    lensHousing.rotation.x = Math.PI / 2
    lensHousing.position.set(index * Math.max(width * 0.12, 0.07), cameraBlock.position.y, Math.max(depth * 0.38, 0.22))
    lensGlass.position.set(lensHousing.position.x, lensHousing.position.y, Math.max(depth * 0.45, 0.26))
    lensGlass.metadata = { kind: 'pulse', speed: 0.018 }
    attachMesh(lensHousing, parent, materials.rubber)
    attachMesh(lensGlass, parent, materials.light)
  }

  for (let index = -1; index <= 1; index += 1) {
    const trace = MeshBuilder.CreateBox(
      `${role}-${blockId}-sensor-circuit-trace-${index}`,
      {
        width: Math.max(width * 0.18, 0.1),
        height: 0.012,
        depth: Math.max(depth * 0.035, 0.022),
      },
      scene,
    )

    trace.position.set(index * Math.max(width * 0.18, 0.1), boardY + Math.max(height * 0.045, 0.026), -Math.max(depth * 0.08, 0.05))
    trace.rotation.y = index * 0.22
    attachMesh(trace, parent, material)
  }

  createPcbConnectorDetails(scene, parent, materials, role, blockId, width, height, depth, boardY)

  attachMesh(box, parent, materials.utility)
}
