import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { UtilityPartRenderArgs } from './types'
import { attachUtilityMesh, createUtilityFrame } from './utilityFrame'

export function createRepairKitUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'RepairKit')
  const lidY = Math.max(height * 0.66, 0.34)
  const caseWidth = Math.max(width * 0.74, 0.42)
  const caseDepth = Math.max(depth * 0.68, 0.36)

  const lid = MeshBuilder.CreateBox(
    `${role}-${blockId}-repair-case-lid`,
    {
      width: caseWidth,
      height: Math.max(height * 0.1, 0.055),
      depth: caseDepth,
    },
    scene,
  )
  const crossBarX = MeshBuilder.CreateBox(
    `${role}-${blockId}-repair-cross-horizontal`,
    {
      width: Math.max(width * 0.34, 0.18),
      height: Math.max(height * 0.03, 0.018),
      depth: Math.max(depth * 0.1, 0.06),
    },
    scene,
  )
  const crossBarZ = MeshBuilder.CreateBox(
    `${role}-${blockId}-repair-cross-vertical`,
    {
      width: Math.max(width * 0.1, 0.06),
      height: Math.max(height * 0.032, 0.018),
      depth: Math.max(depth * 0.34, 0.18),
    },
    scene,
  )
  const handle = MeshBuilder.CreateTorus(
    `${role}-${blockId}-repair-carry-handle`,
    {
      diameter: Math.max(width * 0.34, 0.2),
      thickness: 0.028,
      tessellation: 16,
    },
    scene,
  )

  lid.position.y = lidY
  crossBarX.position.set(0, lidY + Math.max(height * 0.06, 0.035), Math.max(depth * 0.02, 0.012))
  crossBarZ.position.set(0, crossBarX.position.y + 0.002, crossBarX.position.z)
  handle.rotation.x = Math.PI / 2
  handle.position.set(0, lidY + Math.max(height * 0.22, 0.13), -Math.max(depth * 0.2, 0.12))
  attachUtilityMesh(lid, parent, materials.trim, 'trim')
  attachUtilityMesh(crossBarX, parent, material, 'damageable')
  attachUtilityMesh(crossBarZ, parent, material, 'damageable')
  attachUtilityMesh(handle, parent, materials.steel, 'weapon_edge')

  for (let side = -1; side <= 1; side += 2) {
    const latch = MeshBuilder.CreateBox(
      `${role}-${blockId}-repair-case-latch-${side}`,
      {
        width: Math.max(width * 0.12, 0.07),
        height: Math.max(height * 0.07, 0.04),
        depth: Math.max(depth * 0.14, 0.08),
      },
      scene,
    )
    const sideSocket = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-repair-charge-socket-${side}`,
      {
        height: Math.max(width * 0.12, 0.075),
        diameter: Math.max(width * 0.08, 0.05),
        tessellation: 12,
      },
      scene,
    )

    latch.position.set(side * Math.max(width * 0.32, 0.18), Math.max(height * 0.44, 0.24), Math.max(depth * 0.42, 0.24))
    sideSocket.rotation.z = Math.PI / 2
    sideSocket.position.set(side * Math.max(width * 0.42, 0.24), Math.max(height * 0.54, 0.29), -Math.max(depth * 0.12, 0.07))
    attachUtilityMesh(latch, parent, materials.steel, 'weapon_edge')
    attachUtilityMesh(sideSocket, parent, materials.light, 'emissive')
  }

  for (let toolIndex = 0; toolIndex < 3; toolIndex += 1) {
    const toolRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-repair-tool-rail-${toolIndex}`,
      {
        width: Math.max(width * 0.48, 0.26),
        height: Math.max(height * 0.035, 0.024),
        depth: Math.max(depth * 0.045, 0.028),
      },
      scene,
    )

    toolRail.position.set(0, Math.max(height * 0.36, 0.2), -Math.max(depth * 0.32, 0.18) + toolIndex * Math.max(depth * 0.12, 0.07))
    attachUtilityMesh(toolRail, parent, toolIndex === 1 ? materials.steel : materials.trim, toolIndex === 1 ? 'weapon_edge' : 'trim')
  }

  const patchPlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-repair-patch-plate-stack`,
    {
      width: Math.max(width * 0.24, 0.14),
      height: Math.max(height * 0.08, 0.05),
      depth: Math.max(depth * 0.26, 0.14),
    },
    scene,
  )

  patchPlate.position.set(Math.max(width * 0.24, 0.15), Math.max(height * 0.5, 0.27), -Math.max(depth * 0.28, 0.16))
  patchPlate.rotation.y = -0.22
  attachUtilityMesh(patchPlate, parent, materials.steel, 'weapon_edge')

  const sealantCanister = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-repair-foam-sealant-canister`,
    {
      height: Math.max(depth * 0.42, 0.24),
      diameter: Math.max(width * 0.12, 0.075),
      tessellation: 14,
    },
    scene,
  )
  const sealantNozzle = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-repair-foam-nozzle`,
    {
      height: Math.max(depth * 0.14, 0.08),
      diameterTop: Math.max(width * 0.035, 0.024),
      diameterBottom: Math.max(width * 0.065, 0.04),
      tessellation: 10,
    },
    scene,
  )
  const foldedSpanner = MeshBuilder.CreateBox(
    `${role}-${blockId}-repair-folded-spanner`,
    {
      width: Math.max(width * 0.42, 0.23),
      height: Math.max(height * 0.028, 0.018),
      depth: Math.max(depth * 0.05, 0.03),
    },
    scene,
  )
  const patchRoll = MeshBuilder.CreateTorus(
    `${role}-${blockId}-repair-bonding-tape-roll`,
    {
      diameter: Math.max(width * 0.18, 0.11),
      thickness: Math.max(width * 0.028, 0.018),
      tessellation: 14,
    },
    scene,
  )
  const diagnosticLed = MeshBuilder.CreateSphere(
    `${role}-${blockId}-repair-dim-diagnostic-led`,
    { diameter: Math.max(width * 0.075, 0.045), segments: 10 },
    scene,
  )

  sealantCanister.rotation.x = Math.PI / 2
  sealantCanister.position.set(-Math.max(width * 0.22, 0.13), Math.max(height * 0.5, 0.28), -Math.max(depth * 0.24, 0.14))
  sealantNozzle.rotation.x = Math.PI / 2
  sealantNozzle.position.set(sealantCanister.position.x, sealantCanister.position.y, Math.max(depth * 0.02, 0.014))
  foldedSpanner.position.set(0, Math.max(height * 0.74, 0.4), Math.max(depth * 0.2, 0.12))
  foldedSpanner.rotation.y = 0.34
  patchRoll.rotation.x = Math.PI / 2
  patchRoll.position.set(Math.max(width * 0.28, 0.16), Math.max(height * 0.68, 0.36), Math.max(depth * 0.18, 0.1))
  diagnosticLed.position.set(-Math.max(width * 0.3, 0.17), lidY + Math.max(height * 0.08, 0.045), -Math.max(depth * 0.28, 0.16))
  diagnosticLed.metadata = { kind: 'pulse', speed: 0.012 }
  attachUtilityMesh(sealantCanister, parent, materials.steel, 'weapon_edge')
  attachUtilityMesh(sealantNozzle, parent, materials.warning, 'trim')
  attachUtilityMesh(foldedSpanner, parent, materials.steel, 'weapon_edge')
  attachUtilityMesh(patchRoll, parent, materials.rubber, 'rubber')
  attachUtilityMesh(diagnosticLed, parent, materials.light, 'emissive')

  attachUtilityMesh(box, parent, materials.utility, 'damageable')
}
