import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { UtilityPartRenderArgs } from './types'
import { attachUtilityMesh, createPcbConnectorDetails, createUtilityFrame } from './utilityFrame'

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
  const cameraBrow = MeshBuilder.CreateBox(
    `${role}-${blockId}-sensor-armored-camera-brow`,
    {
      width: Math.max(width * 0.54, 0.3),
      height: Math.max(height * 0.055, 0.032),
      depth: Math.max(depth * 0.1, 0.06),
    },
    scene,
  )
  const rangeWindow = MeshBuilder.CreateBox(
    `${role}-${blockId}-sensor-glass-range-window`,
    {
      width: Math.max(width * 0.32, 0.18),
      height: Math.max(height * 0.05, 0.03),
      depth: Math.max(depth * 0.032, 0.022),
    },
    scene,
  )
  const lidarGlassCore = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-sensor-lidar-glass-core`,
    {
      height: Math.max(depth * 0.08, 0.05),
      diameter: Math.max(width * 0.22, 0.13),
      tessellation: 18,
    },
    scene,
  )

  sensorBoard.position.set(0, boardY, 0)
  cameraBlock.position.set(0, boardY + Math.max(height * 0.16, 0.09), Math.max(depth * 0.2, 0.12))
  cameraBrow.position.set(0, cameraBlock.position.y + Math.max(height * 0.14, 0.08), Math.max(depth * 0.33, 0.19))
  rangeWindow.position.set(0, cameraBlock.position.y, Math.max(depth * 0.35, 0.21))
  lidarRing.rotation.y = Math.PI / 2
  lidarRing.position.set(-Math.max(width * 0.28, 0.16), boardY + Math.max(height * 0.2, 0.11), -Math.max(depth * 0.18, 0.1))
  lidarGlassCore.rotation.x = Math.PI / 2
  lidarGlassCore.position.copyFrom(lidarRing.position)
  antenna.position.set(Math.max(width * 0.3, 0.18), boardY + Math.max(height * 0.3, 0.18), -Math.max(depth * 0.18, 0.1))
  antennaTip.position.set(antenna.position.x, antenna.position.y + Math.max(height * 0.32, 0.18), antenna.position.z)
  rangeWindow.metadata = { kind: 'pulse', speed: 0.01 }
  attachUtilityMesh(sensorBoard, parent, materials.circuit, 'damageable')
  attachUtilityMesh(cameraBlock, parent, materials.trim, 'trim')
  attachUtilityMesh(cameraBrow, parent, materials.steel, 'weapon_edge')
  attachUtilityMesh(rangeWindow, parent, materials.profile.emissive_led_glass, 'glass')
  attachUtilityMesh(lidarRing, parent, material, 'damageable')
  attachUtilityMesh(lidarGlassCore, parent, materials.profile.emissive_led_glass, 'glass')
  attachUtilityMesh(antenna, parent, materials.steel, 'weapon_edge')
  attachUtilityMesh(antennaTip, parent, materials.light, 'emissive')

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
    const lensRetainer = MeshBuilder.CreateTorus(
      `${role}-${blockId}-sensor-lens-retainer-${index}`,
      {
        diameter: Math.max(width * 0.12, 0.07),
        thickness: Math.max(width * 0.012, 0.008),
        tessellation: 14,
      },
      scene,
    )
    const lensCrack = MeshBuilder.CreateBox(
      `${role}-${blockId}-sensor-hairline-glass-crack-${index}`,
      {
        width: Math.max(width * 0.06, 0.036),
        height: Math.max(height * 0.01, 0.008),
        depth: Math.max(depth * 0.012, 0.008),
      },
      scene,
    )

    lensHousing.rotation.x = Math.PI / 2
    lensHousing.position.set(index * Math.max(width * 0.12, 0.07), cameraBlock.position.y, Math.max(depth * 0.38, 0.22))
    lensRetainer.rotation.x = Math.PI / 2
    lensRetainer.position.copyFrom(lensHousing.position)
    lensRetainer.position.z += Math.max(depth * 0.02, 0.012)
    lensGlass.position.set(lensHousing.position.x, lensHousing.position.y, Math.max(depth * 0.45, 0.26))
    lensCrack.position.copyFrom(lensGlass.position)
    lensCrack.position.z += Math.max(depth * 0.018, 0.01)
    lensCrack.rotation.z = index * 0.45
    lensGlass.metadata = { kind: 'pulse', speed: 0.018 }
    attachUtilityMesh(lensHousing, parent, materials.rubber, 'rubber')
    attachUtilityMesh(lensRetainer, parent, materials.steel, 'weapon_edge')
    attachUtilityMesh(lensGlass, parent, materials.profile.emissive_led_glass, 'glass')
    attachUtilityMesh(lensCrack, parent, materials.trim, 'trim')
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
    attachUtilityMesh(trace, parent, material, 'damageable')
  }

  createPcbConnectorDetails(scene, parent, materials, role, blockId, width, height, depth, boardY)

  attachUtilityMesh(box, parent, materials.utility, 'damageable')
}
