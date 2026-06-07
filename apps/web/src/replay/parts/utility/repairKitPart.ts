import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createUtilityFrame } from './utilityFrame'

export function createRepairKitUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'RepairKit')


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


    const terminalBase = MeshBuilder.CreateBox(
      `${role}-${blockId}-repair-terminal-base`,
      {
        width: Math.max(width * 0.58, 0.28),
        height: Math.max(height * 0.08, 0.045),
        depth: Math.max(depth * 0.22, 0.12),
      },
      scene,
    )

    terminalBase.position.set(0, Math.max(height * 0.68, 0.35), -Math.max(depth * 0.28, 0.16))
    attachMesh(terminalBase, parent, materials.trim)

    for (let side = -1; side <= 1; side += 2) {
      const terminal = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-repair-terminal-${side}`,
        {
          height: Math.max(height * 0.08, 0.045),
          diameter: Math.max(width * 0.11, 0.06),
          tessellation: 12,
        },
        scene,
      )
      const socketGlow = MeshBuilder.CreateBox(
        `${role}-${blockId}-repair-terminal-indicator-${side}`,
        {
          width: Math.max(width * 0.08, 0.045),
          height: Math.max(height * 0.03, 0.018),
          depth: Math.max(depth * 0.11, 0.055),
        },
        scene,
      )
      const latch = MeshBuilder.CreateBox(
        `${role}-${blockId}-repair-case-latch-${side}`,
        {
          width: Math.max(width * 0.12, 0.07),
          height: Math.max(height * 0.08, 0.045),
          depth: Math.max(depth * 0.16, 0.08),
        },
        scene,
      )

      terminal.rotation.y = Math.PI / 2
      terminal.position.set(side * Math.max(width * 0.2, 0.11), terminalBase.position.y + Math.max(height * 0.065, 0.04), terminalBase.position.z)
      socketGlow.position.set(terminal.position.x, terminal.position.y + Math.max(height * 0.045, 0.025), terminal.position.z)
      latch.position.set(side * Math.max(width * 0.32, 0.18), Math.max(height * 0.42, 0.24), Math.max(depth * 0.44, 0.26))
      attachMesh(terminal, parent, materials.steel)
      attachMesh(socketGlow, parent, materials.light)
      attachMesh(latch, parent, materials.steel)
    }

    const bridgeCable = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-repair-terminal-bridge`,
      {
        height: Math.max(width * 0.38, 0.2),
        diameter: Math.max(width * 0.045, 0.026),
        tessellation: 8,
      },
      scene,
    )

    bridgeCable.rotation.z = Math.PI / 2
    bridgeCable.position.set(0, terminalBase.position.y + Math.max(height * 0.09, 0.055), terminalBase.position.z - Math.max(depth * 0.1, 0.06))
    attachMesh(bridgeCable, parent, materials.trim)

    const serviceArm = MeshBuilder.CreateBox(
      `${role}-${blockId}-repair-service-arm`,
      {
        width: Math.max(width * 0.14, 0.08),
        height: Math.max(height * 0.7, 0.34),
        depth: Math.max(depth * 0.18, 0.1),
      },
      scene,
    )
    const toolNode = MeshBuilder.CreateBox(
      `${role}-${blockId}-repair-tool-node`,
      {
        width: Math.max(width * 0.28, 0.16),
        height: Math.max(height * 0.16, 0.1),
        depth: Math.max(depth * 0.28, 0.16),
      },
      scene,
    )

    serviceArm.position.set(Math.max(width * 0.28, 0.18), Math.max(height * 0.78, 0.4), Math.max(depth * 0.16, 0.1))
    serviceArm.rotation.z = -0.28
    toolNode.position.set(Math.max(width * 0.36, 0.22), Math.max(height * 1.06, 0.58), Math.max(depth * 0.24, 0.16))
    attachMesh(serviceArm, parent, materials.warning)
    attachMesh(toolNode, parent, materials.trim)

  attachMesh(box, parent, material)
}
