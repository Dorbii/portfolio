import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createUtilityFrame } from './utilityFrame'
import { createBatteryBusBars } from './utilityFrame'

export function createBatteryUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Battery')


    for (let index = -1; index <= 1; index += 1) {
      const cell = MeshBuilder.CreateBox(
        `${role}-${blockId}-battery-cell-${index + 1}`,
        {
          width: Math.max(width * 0.22, 0.12),
          height: Math.max(height * 0.62, 0.32),
          depth: Math.max(depth * 0.54, 0.26),
        },
        scene,
      )

      cell.position.set(index * Math.max(width * 0.22, 0.12), Math.max(height * 0.42, 0.24), 0)
      attachMesh(cell, parent, materials.steel)
    }

    for (let side = -1; side <= 1; side += 2) {
      const terminal = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-battery-terminal-${side}`,
        {
          height: Math.max(height * 0.14, 0.07),
          diameter: Math.max(width * 0.12, 0.07),
          tessellation: 10,
        },
        scene,
      )

      terminal.position.set(side * Math.max(width * 0.28, 0.16), Math.max(height * 0.86, 0.46), Math.max(depth * 0.24, 0.14))
      attachMesh(terminal, parent, side > 0 ? materials.warning : materials.light)
    }

    createBatteryBusBars(scene, parent, materials, role, blockId, width, height, depth)

  attachMesh(box, parent, material)
}
