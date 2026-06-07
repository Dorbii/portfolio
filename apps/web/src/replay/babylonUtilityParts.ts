import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import { attachMesh } from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'

export function createUtilityPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  if (partId.includes('Gyro')) {
    createGyroStabilizerPart(scene, parent, material, role, blockId, width, height, depth, materials)
    return
  }

  const box = MeshBuilder.CreateBox(
    `${role}-${blockId}-utility`,
    {
      width: Math.max(width * 0.85, 0.45),
      height: Math.max(height * 0.85, 0.45),
      depth: Math.max(depth * 0.85, 0.45),
    },
    scene,
  )
  const topBackplane = MeshBuilder.CreateBox(
    `${role}-${blockId}-utility-top-backplane`,
    {
      width: Math.max(width * 0.62, 0.32),
      height: 0.09,
      depth: Math.max(depth * 0.5, 0.24),
    },
    scene,
  )
  const sideCable = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-utility-side-cable`,
    {
      height: Math.max(depth * 0.72, 0.34),
      diameter: 0.03,
      tessellation: 8,
    },
    scene,
  )

  topBackplane.position.set(-width * 0.08, Math.max(height * 0.58, 0.28), -depth * 0.06)
  sideCable.rotation.x = Math.PI / 2
  sideCable.position.set(width * 0.36, Math.max(height * 0.46, 0.24), 0)
  attachMesh(topBackplane, parent, materials.trim)
  attachMesh(sideCable, parent, materials.trim)

  if (isElectronicsPart(partId)) {
    createWireHarness(scene, parent, materials, role, blockId, width, height, depth)
  }

  if (partId.includes('Booster')) {
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
  }

  if (partId.includes('EnergyCore')) {
    const chamber = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-chamber`,
      {
        height: Math.max(height * 0.82, 0.42),
        diameter: Math.max(width * 0.44, 0.26),
        tessellation: 18,
      },
      scene,
    )
    const topCap = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-top-cap`,
      {
        height: Math.max(height * 0.12, 0.06),
        diameter: Math.max(width * 0.52, 0.3),
        tessellation: 18,
      },
      scene,
    )
    const bottomCap = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-bottom-cap`,
      {
        height: Math.max(height * 0.12, 0.06),
        diameter: Math.max(width * 0.52, 0.3),
        tessellation: 18,
      },
      scene,
    )

    chamber.position.y = Math.max(height * 0.46, 0.28)
    chamber.metadata = { kind: 'pulse', speed: 0.035 }
    topCap.position.y = chamber.position.y + Math.max(height * 0.44, 0.23)
    bottomCap.position.y = chamber.position.y - Math.max(height * 0.44, 0.23)
    attachMesh(chamber, parent, materials.light)
    attachMesh(topCap, parent, materials.steel)
    attachMesh(bottomCap, parent, materials.steel)
    createVacuumTubePair(scene, parent, materials, role, blockId, width, height, depth)
  }

  if (partId.includes('Battery')) {
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
  }

  if (partId.includes('AIModule')) {
    const board = MeshBuilder.CreateBox(
      `${role}-${blockId}-ai-module-board`,
      {
        width: Math.max(width * 0.78, 0.42),
        height: Math.max(height * 0.12, 0.07),
        depth: Math.max(depth * 0.78, 0.42),
      },
      scene,
    )
    const chip = MeshBuilder.CreateBox(
      `${role}-${blockId}-ai-module-chip`,
      {
        width: Math.max(width * 0.38, 0.22),
        height: Math.max(height * 0.18, 0.1),
        depth: Math.max(depth * 0.38, 0.22),
      },
      scene,
    )

    board.position.y = Math.max(height * 0.58, 0.32)
    chip.position.y = board.position.y + Math.max(height * 0.12, 0.07)
    attachMesh(board, parent, materials.trim)
    attachMesh(chip, parent, materials.light)

    for (let index = -2; index <= 2; index += 1) {
      const trace = MeshBuilder.CreateBox(
        `${role}-${blockId}-ai-module-trace-${index + 2}`,
        {
          width: Math.max(width * 0.08, 0.04),
          height: Math.max(height * 0.04, 0.025),
          depth: Math.max(depth * 0.62, 0.32),
        },
        scene,
      )

      trace.position.set(index * Math.max(width * 0.12, 0.07), chip.position.y + Math.max(height * 0.08, 0.04), 0)
      attachMesh(trace, parent, materials.warning)
    }

    createPcbConnectorDetails(scene, parent, materials, role, blockId, width, height, depth, chip.position.y)
  }

  if (partId.includes('Magnet')) {
    const ring = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-ring`,
      {
        diameter: Math.max(Math.max(width, depth), 0.52),
        thickness: Math.max(width * 0.15, 0.08),
        tessellation: 20,
      },
      scene,
    )
    const leftPole = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-left-pole`,
      { width: 0.12, height: Math.max(height * 0.86, 0.46), depth: 0.18 },
      scene,
    )
    const rightPole = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-right-pole`,
      { width: 0.12, height: Math.max(height * 0.86, 0.46), depth: 0.18 },
      scene,
    )

    ring.rotation.x = Math.PI / 2
    ring.metadata = { kind: 'pulse', speed: 0.04 }
    leftPole.position.set(-Math.max(width * 0.34, 0.2), 0.04, Math.max(depth * 0.2, 0.12))
    rightPole.position.set(Math.max(width * 0.34, 0.2), 0.04, Math.max(depth * 0.2, 0.12))
    attachMesh(ring, parent, materials.light)
    attachMesh(leftPole, parent, materials.warning)
    attachMesh(rightPole, parent, materials.warning)

    const hazardBand = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-hazard-band`,
      {
        diameter: Math.max(Math.max(width, depth) * 1.08, 0.62),
        thickness: Math.max(width * 0.045, 0.025),
        tessellation: 22,
      },
      scene,
    )

    hazardBand.rotation.x = Math.PI / 2
    hazardBand.position.y = -Math.max(height * 0.22, 0.12)
    attachMesh(hazardBand, parent, materials.warning)

    for (let index = 0; index < 2; index += 1) {
      const field = MeshBuilder.CreateTorus(
        `${role}-${blockId}-magnet-field-${index}`,
        {
          diameter: Math.max(Math.max(width, depth) * (1.16 + index * 0.28), 0.7),
          thickness: 0.025,
          tessellation: 22,
        },
        scene,
      )

      field.rotation.x = Math.PI / 2
      field.position.y = 0.02 + index * 0.05
      field.metadata = { kind: 'pulse', speed: 0.035 + index * 0.01 }
      attachMesh(field, parent, materials.light)
    }
  }

  if (partId.includes('Anchor')) {
    const ballast = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-anchor-ballast`,
      {
        height: Math.max(height * 0.26, 0.16),
        diameter: Math.max(Math.max(width, depth) * 0.62, 0.36),
        tessellation: 14,
      },
      scene,
    )

    ballast.rotation.x = Math.PI / 2
    ballast.position.y = -Math.max(height * 0.18, 0.12)
    attachMesh(ballast, parent, materials.steel)

    for (let side = -1; side <= 1; side += 2) {
      const claw = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-anchor-claw-${side}`,
        {
          height: Math.max(depth * 0.42, 0.28),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.2, 0.14),
          tessellation: 10,
        },
        scene,
      )

      claw.rotation.x = Math.PI / 2
      claw.rotation.z = side * 0.42
      claw.position.set(side * Math.max(width * 0.28, 0.2), Math.max(height * 0.1, 0.12), Math.max(depth * 0.28, 0.2))
      attachMesh(claw, parent, materials.warning)
    }
  }

  if (partId.includes('Drone')) {
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
  }

  if (partId.includes('Smoke')) {
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
  }

  if (partId.includes('Sensor') || partId.includes('RepairKit')) {
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
  }

  if (partId.includes('Sensor')) {
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
  }

  if (partId.includes('RepairKit')) {
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
  }

  attachMesh(box, parent, material)
}

function createGyroStabilizerPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const baseWidth = Math.max(width * 0.86, 0.52)
  const baseDepth = Math.max(depth * 0.72, 0.42)
  const baseY = -Math.max(height * 0.22, 0.1)
  const cageY = Math.max(height * 0.22, 0.18)
  const ringDiameter = Math.max(Math.min(width, depth) * 0.68, 0.42)
  const flywheelDiameter = Math.max(ringDiameter * 0.58, 0.26)
  const axleLength = Math.max(width * 0.82, 0.5)

  const basePlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-gyro-machined-base`,
    {
      width: baseWidth,
      height: Math.max(height * 0.12, 0.07),
      depth: baseDepth,
    },
    scene,
  )
  const frontRail = MeshBuilder.CreateBox(
    `${role}-${blockId}-gyro-front-rail`,
    { width: baseWidth, height: Math.max(height * 0.08, 0.045), depth: 0.045 },
    scene,
  )
  const rearRail = MeshBuilder.CreateBox(
    `${role}-${blockId}-gyro-rear-rail`,
    { width: baseWidth, height: Math.max(height * 0.08, 0.045), depth: 0.045 },
    scene,
  )

  basePlate.position.y = baseY
  frontRail.position.set(0, baseY + Math.max(height * 0.09, 0.055), baseDepth * 0.42)
  rearRail.position.set(0, frontRail.position.y, -baseDepth * 0.42)
  attachMesh(basePlate, parent, materials.utility)
  attachMesh(frontRail, parent, materials.trim)
  attachMesh(rearRail, parent, materials.trim)

  for (const side of [-1, 1]) {
    const tower = MeshBuilder.CreateBox(
      `${role}-${blockId}-gyro-bearing-tower-${side}`,
      {
        width: Math.max(width * 0.12, 0.07),
        height: Math.max(height * 0.56, 0.34),
        depth: Math.max(depth * 0.18, 0.1),
      },
      scene,
    )
    const bearing = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-gyro-bearing-cap-${side}`,
      {
        height: Math.max(width * 0.09, 0.055),
        diameter: Math.max(width * 0.17, 0.09),
        tessellation: 16,
      },
      scene,
    )
    const foot = MeshBuilder.CreateBox(
      `${role}-${blockId}-gyro-bearing-foot-${side}`,
      {
        width: Math.max(width * 0.22, 0.12),
        height: Math.max(height * 0.08, 0.045),
        depth: Math.max(depth * 0.3, 0.16),
      },
      scene,
    )

    tower.position.set(side * axleLength * 0.5, cageY, 0)
    bearing.position.set(side * axleLength * 0.5, cageY, 0)
    bearing.rotation.z = Math.PI / 2
    foot.position.set(side * axleLength * 0.5, baseY + Math.max(height * 0.13, 0.075), 0)
    attachMesh(tower, parent, materials.trim)
    attachMesh(bearing, parent, materials.steel)
    attachMesh(foot, parent, materials.utility)
  }

  const outerGimbal = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-outer-gimbal-ring`,
    {
      diameter: ringDiameter,
      thickness: Math.max(width * 0.045, 0.028),
      tessellation: 32,
    },
    scene,
  )
  const innerGimbal = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-inner-gimbal-ring`,
    {
      diameter: Math.max(ringDiameter * 0.78, 0.32),
      thickness: Math.max(width * 0.036, 0.022),
      tessellation: 28,
    },
    scene,
  )

  outerGimbal.position.y = cageY
  outerGimbal.rotation.x = Math.PI / 2
  innerGimbal.position.y = cageY
  innerGimbal.rotation.x = Math.PI / 2
  innerGimbal.rotation.y = Math.PI / 2
  attachMesh(outerGimbal, parent, materials.steel)
  attachMesh(innerGimbal, parent, materials.trim)

  const rotorRoot = new TransformNode(`${role}-${blockId}-gyro-flywheel-motion-root`, scene)

  rotorRoot.position.set(0, cageY, 0)
  rotorRoot.metadata = { kind: 'spin', axis: 'x', speed: 0.11 }
  rotorRoot.parent = parent

  const flywheel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-flywheel-disc`,
    {
      height: Math.max(width * 0.16, 0.09),
      diameter: flywheelDiameter,
      tessellation: 36,
    },
    scene,
  )
  const flywheelHub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-flywheel-hub`,
    {
      height: Math.max(width * 0.19, 0.1),
      diameter: Math.max(flywheelDiameter * 0.32, 0.11),
      tessellation: 18,
    },
    scene,
  )
  const axle = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-horizontal-axle`,
    {
      height: axleLength,
      diameter: Math.max(width * 0.055, 0.034),
      tessellation: 14,
    },
    scene,
  )

  flywheel.rotation.z = Math.PI / 2
  flywheelHub.rotation.z = Math.PI / 2
  axle.rotation.z = Math.PI / 2
  attachMesh(flywheel, rotorRoot, materials.steel)
  attachMesh(flywheelHub, rotorRoot, material)
  attachMesh(axle, rotorRoot, materials.steel)

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-gyro-flywheel-spoke-${index}`,
      {
        width: Math.max(width * 0.035, 0.02),
        height: Math.max(width * 0.035, 0.02),
        depth: Math.max(flywheelDiameter * 0.48, 0.13),
      },
      scene,
    )

    spoke.rotation.x = angle
    attachMesh(spoke, rotorRoot, materials.trim)
  }

  const controlBoard = MeshBuilder.CreateBox(
    `${role}-${blockId}-gyro-control-board`,
    {
      width: Math.max(width * 0.36, 0.2),
      height: Math.max(height * 0.06, 0.035),
      depth: Math.max(depth * 0.22, 0.12),
    },
    scene,
  )

  controlBoard.position.set(-baseWidth * 0.22, baseY + Math.max(height * 0.17, 0.1), baseDepth * 0.18)
  attachMesh(controlBoard, parent, materials.circuit)

  for (let index = 0; index < 3; index += 1) {
    const chip = MeshBuilder.CreateBox(
      `${role}-${blockId}-gyro-control-chip-${index}`,
      {
        width: Math.max(width * 0.06, 0.035),
        height: Math.max(height * 0.035, 0.022),
        depth: Math.max(depth * 0.05, 0.03),
      },
      scene,
    )

    chip.position.set(
      controlBoard.position.x + (index - 1) * Math.max(width * 0.09, 0.05),
      controlBoard.position.y + Math.max(height * 0.045, 0.026),
      controlBoard.position.z,
    )
    attachMesh(chip, parent, materials.trim)
  }

  const cableLoop = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-control-cable-loop`,
    {
      diameter: Math.max(width * 0.34, 0.19),
      thickness: 0.015,
      tessellation: 14,
    },
    scene,
  )

  cableLoop.position.set(baseWidth * 0.28, cageY, baseDepth * 0.2)
  cableLoop.rotation.x = Math.PI / 2
  attachMesh(cableLoop, parent, materials.trim)

  for (const side of [-1, 1]) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-gyro-base-bolt-${side}`,
      { height: 0.025, diameter: Math.max(width * 0.055, 0.032), tessellation: 10 },
      scene,
    )

    bolt.position.set(side * baseWidth * 0.34, baseY + Math.max(height * 0.08, 0.05), -baseDepth * 0.3)
    attachMesh(bolt, parent, materials.steel)
  }
}

function isElectronicsPart(partId: string): boolean {
  return [
    'AIModule',
    'Battery',
    'Drone',
    'EnergyCore',
    'Magnet',
    'RepairKit',
    'Sensor',
    'Smoke',
  ].some((token) => partId.includes(token))
}

function createWireHarness(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = -1; index <= 1; index += 2) {
    const cable = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-utility-wire-harness-${index}`,
      {
        height: Math.max(depth * 0.56, 0.28),
        diameter: 0.024,
        tessellation: 8,
      },
      scene,
    )
    const plug = MeshBuilder.CreateBox(
      `${role}-${blockId}-utility-wire-plug-${index}`,
      {
        width: Math.max(width * 0.12, 0.07),
        height: 0.055,
        depth: Math.max(depth * 0.08, 0.045),
      },
      scene,
    )

    cable.rotation.x = Math.PI / 2
    cable.position.set(index * Math.max(width * 0.22, 0.12), Math.max(height * 0.72, 0.36), Math.max(depth * 0.05, 0.03))
    plug.position.set(index * Math.max(width * 0.22, 0.12), cable.position.y, Math.max(depth * 0.36, 0.18))
    attachMesh(cable, parent, index > 0 ? materials.warning : materials.trim)
    attachMesh(plug, parent, materials.steel)
  }

  const loop = MeshBuilder.CreateTorus(
    `${role}-${blockId}-utility-service-loop`,
    {
      diameter: Math.max(Math.min(width, depth) * 0.42, 0.22),
      thickness: 0.018,
      tessellation: 14,
    },
    scene,
  )

  loop.rotation.x = Math.PI / 2
  loop.position.set(-Math.max(width * 0.32, 0.18), Math.max(height * 0.7, 0.34), Math.max(depth * 0.2, 0.1))
  attachMesh(loop, parent, materials.trim)
}

function createBatteryBusBars(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = -1; index <= 1; index += 1) {
    const busBar = MeshBuilder.CreateBox(
      `${role}-${blockId}-battery-bus-bar-${index + 1}`,
      {
        width: Math.max(width * 0.18, 0.1),
        height: 0.045,
        depth: Math.max(depth * 0.64, 0.32),
      },
      scene,
    )

    busBar.position.set(index * Math.max(width * 0.22, 0.12), Math.max(height * 0.76, 0.4), 0)
    attachMesh(busBar, parent, materials.warning)
  }
}

function createPcbConnectorDetails(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
  boardY: number,
): void {
  for (let index = 0; index < 6; index += 1) {
    const pin = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-pcb-header-pin-${index}`,
      {
        height: 0.055,
        diameter: 0.024,
        tessellation: 6,
      },
      scene,
    )

    pin.position.set(
      -Math.max(width * 0.3, 0.16) + index * Math.max(width * 0.12, 0.055),
      boardY + Math.max(height * 0.1, 0.045),
      -Math.max(depth * 0.32, 0.16),
    )
    attachMesh(pin, parent, materials.steel)
  }

  for (let index = -1; index <= 1; index += 1) {
    const capacitor = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-pcb-capacitor-${index + 1}`,
      {
        height: Math.max(height * 0.16, 0.08),
        diameter: Math.max(width * 0.07, 0.04),
        tessellation: 10,
      },
      scene,
    )

    capacitor.position.set(
      index * Math.max(width * 0.16, 0.08),
      boardY + Math.max(height * 0.14, 0.07),
      Math.max(depth * 0.28, 0.14),
    )
    attachMesh(capacitor, parent, index === 0 ? materials.light : materials.steel)
  }
}

function createVacuumTubePair(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = -1; index <= 1; index += 2) {
    const glass = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-vacuum-tube-glow-${index}`,
      {
        height: Math.max(height * 0.34, 0.16),
        diameter: Math.max(width * 0.13, 0.075),
        tessellation: 12,
      },
      scene,
    )
    const cap = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-vacuum-tube-cap-${index}`,
      {
        height: 0.045,
        diameter: Math.max(width * 0.15, 0.085),
        tessellation: 12,
      },
      scene,
    )

    glass.position.set(index * Math.max(width * 0.28, 0.15), Math.max(height * 0.82, 0.42), -Math.max(depth * 0.24, 0.12))
    glass.metadata = { kind: 'pulse', speed: 0.026 }
    cap.position.set(glass.position.x, glass.position.y + Math.max(height * 0.2, 0.09), glass.position.z)
    attachMesh(glass, parent, materials.light)
    attachMesh(cap, parent, materials.steel)
  }
}
