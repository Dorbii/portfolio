import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createBatteryBusBars, createUtilityFrame } from './utilityFrame'

export function createBatteryUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Battery')
  const lidY = Math.max(height * 0.66, 0.34)
  const lidWidth = Math.max(width * 0.74, 0.42)
  const lidDepth = Math.max(depth * 0.72, 0.38)

  const hardcaseLid = MeshBuilder.CreateBox(
    `${role}-${blockId}-battery-hardcase-lid`,
    {
      width: lidWidth,
      height: Math.max(height * 0.1, 0.055),
      depth: lidDepth,
    },
    scene,
  )
  const fuseBlock = MeshBuilder.CreateBox(
    `${role}-${blockId}-battery-service-fuse-block`,
    {
      width: Math.max(width * 0.2, 0.12),
      height: Math.max(height * 0.08, 0.045),
      depth: Math.max(depth * 0.22, 0.12),
    },
    scene,
  )
  const warningPlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-battery-warning-plate`,
    {
      width: Math.max(width * 0.2, 0.12),
      height: 0.018,
      depth: Math.max(depth * 0.32, 0.18),
    },
    scene,
  )

  hardcaseLid.position.y = lidY
  fuseBlock.position.set(-Math.max(width * 0.28, 0.16), lidY + Math.max(height * 0.09, 0.052), Math.max(depth * 0.18, 0.1))
  warningPlate.position.set(Math.max(width * 0.28, 0.16), lidY + Math.max(height * 0.065, 0.036), -Math.max(depth * 0.12, 0.07))
  attachMesh(hardcaseLid, parent, materials.trim)
  attachMesh(fuseBlock, parent, materials.steel)
  attachMesh(warningPlate, parent, material)

  for (let index = 0; index < 4; index += 1) {
    const offset = (index - 1.5) * Math.max(width * 0.17, 0.09)
    const cell = MeshBuilder.CreateBox(
      `${role}-${blockId}-battery-lipo-cell-${index}`,
      {
        width: Math.max(width * 0.13, 0.075),
        height: Math.max(height * 0.42, 0.24),
        depth: Math.max(depth * 0.6, 0.32),
      },
      scene,
    )
    const cap = MeshBuilder.CreateBox(
      `${role}-${blockId}-battery-cell-end-cap-${index}`,
      {
        width: Math.max(width * 0.13, 0.075),
        height: Math.max(height * 0.08, 0.045),
        depth: Math.max(depth * 0.62, 0.34),
      },
      scene,
    )

    cell.position.set(offset, Math.max(height * 0.42, 0.24), 0)
    cap.position.set(offset, Math.max(height * 0.66, 0.34), 0)
    attachMesh(cell, parent, materials.steel)
    attachMesh(cap, parent, index % 2 === 0 ? materials.rubber : materials.utility)
  }

  for (let strapIndex = -1; strapIndex <= 1; strapIndex += 2) {
    const strap = MeshBuilder.CreateBox(
      `${role}-${blockId}-battery-rubber-strap-${strapIndex}`,
      {
        width: Math.max(width * 0.72, 0.4),
        height: Math.max(height * 0.045, 0.028),
        depth: Math.max(depth * 0.09, 0.055),
      },
      scene,
    )

    strap.position.set(0, Math.max(height * 0.73, 0.39), strapIndex * Math.max(depth * 0.28, 0.16))
    attachMesh(strap, parent, materials.rubber)
  }

  createBatteryBusBars(scene, parent, materials, role, blockId, width, height, depth)

  for (let side = -1; side <= 1; side += 2) {
    const terminal = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-battery-terminal-post-${side}`,
      {
        height: Math.max(height * 0.16, 0.08),
        diameter: Math.max(width * 0.11, 0.065),
        tessellation: 14,
      },
      scene,
    )
    const cable = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-battery-lead-cable-${side}`,
      {
        height: Math.max(depth * 0.62, 0.34),
        diameter: Math.max(width * 0.035, 0.024),
        tessellation: 8,
      },
      scene,
    )
    const plug = MeshBuilder.CreateBox(
      `${role}-${blockId}-battery-plug-${side}`,
      {
        width: Math.max(width * 0.12, 0.07),
        height: Math.max(height * 0.06, 0.035),
        depth: Math.max(depth * 0.16, 0.09),
      },
      scene,
    )

    terminal.position.set(side * Math.max(width * 0.3, 0.17), Math.max(height * 0.86, 0.46), Math.max(depth * 0.28, 0.16))
    cable.rotation.x = Math.PI / 2
    cable.position.set(side * Math.max(width * 0.36, 0.2), Math.max(height * 0.76, 0.4), -Math.max(depth * 0.04, 0.03))
    plug.position.set(side * Math.max(width * 0.36, 0.2), Math.max(height * 0.76, 0.4), -Math.max(depth * 0.42, 0.24))
    attachMesh(terminal, parent, side > 0 ? material : materials.steel)
    attachMesh(cable, parent, side > 0 ? material : materials.rubber)
    attachMesh(plug, parent, materials.trim)
  }

  for (let index = 0; index < 6; index += 1) {
    const latch = MeshBuilder.CreateBox(
      `${role}-${blockId}-battery-case-latch-${index}`,
      {
        width: Math.max(width * 0.075, 0.045),
        height: Math.max(height * 0.055, 0.032),
        depth: Math.max(depth * 0.11, 0.06),
      },
      scene,
    )
    const x = index % 3 - 1
    const z = index < 3 ? -1 : 1

    latch.position.set(x * Math.max(width * 0.24, 0.13), Math.max(height * 0.52, 0.28), z * Math.max(depth * 0.44, 0.24))
    attachMesh(latch, parent, materials.steel)
  }

  attachMesh(box, parent, materials.utility)
}
