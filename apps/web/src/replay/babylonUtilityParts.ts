import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import { attachMesh } from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'
import {
  createPbrSceneMaterial,
  createSceneMaterial,
} from './babylonSceneUtils'

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

  if (partId.includes('EnergyCore')) {
    createEnergyCorePart(scene, parent, material, role, blockId, width, height, depth, materials)
    return
  }

  if (partId.includes('Magnet')) {
    createMagnetPart(scene, parent, material, role, blockId, width, height, depth, materials)
    return
  }

  if (partId.includes('AIModule')) {
    createAiModulePart(scene, parent, material, role, blockId, width, height, depth, materials)
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

function createAiModulePart(
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
  const boardWidth = Math.max(width * 0.86, 0.48)
  const boardDepth = Math.max(depth * 0.76, 0.42)
  const boardHeight = Math.max(height * 0.1, 0.06)
  const boardY = Math.max(height * 0.18, 0.1)
  const chipWidth = Math.max(width * 0.32, 0.18)
  const chipDepth = Math.max(depth * 0.32, 0.18)
  const chipY = boardY + Math.max(height * 0.11, 0.07)
  const traceY = boardY + Math.max(height * 0.08, 0.05)
  const cornerX = boardWidth * 0.36
  const cornerZ = boardDepth * 0.34

  const boardMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-ai-module-matte-pcb-mat`,
    '#101917',
    '#020504',
    0.28,
    0.74,
    'utility',
  )
  const blackCeramicMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-ai-module-black-ceramic-mat`,
    '#080909',
    '#010101',
    0.18,
    0.62,
    'utility',
  )
  const goldTraceMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-ai-module-gold-trace-mat`,
    '#d6a642',
    '#2a1704',
    0.82,
    0.38,
  )
  const glassMaterial = createSceneMaterial(
    scene,
    `${role}-${blockId}-ai-module-glass-cryo-cap-mat`,
    '#8ff4ff',
    '#0d5f6b',
    0.34,
    0.5,
  )

  const cardFrame = MeshBuilder.CreateBox(
    `${role}-${blockId}-ai-module-bolted-card-frame`,
    {
      width: boardWidth,
      height: boardHeight,
      depth: boardDepth,
    },
    scene,
  )
  const insetBoard = MeshBuilder.CreateBox(
    `${role}-${blockId}-ai-module-inset-pcb-deck`,
    {
      width: Math.max(boardWidth * 0.78, 0.38),
      height: Math.max(boardHeight * 0.48, 0.028),
      depth: Math.max(boardDepth * 0.72, 0.34),
    },
    scene,
  )
  const chipPackage = MeshBuilder.CreateBox(
    `${role}-${blockId}-ai-module-quantum-chip-package`,
    {
      width: chipWidth,
      height: Math.max(height * 0.11, 0.065),
      depth: chipDepth,
    },
    scene,
  )
  const chipDie = MeshBuilder.CreateBox(
    `${role}-${blockId}-ai-module-accent-compute-die`,
    {
      width: Math.max(chipWidth * 0.5, 0.09),
      height: Math.max(height * 0.025, 0.016),
      depth: Math.max(chipDepth * 0.5, 0.09),
    },
    scene,
  )
  const glassCap = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-ai-module-glass-cryo-cap`,
    {
      height: Math.max(height * 0.18, 0.1),
      diameter: Math.max(Math.min(width, depth) * 0.28, 0.16),
      tessellation: 24,
    },
    scene,
  )
  const centerColumn = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-ai-module-cryo-center-column`,
    {
      height: Math.max(height * 0.26, 0.14),
      diameter: Math.max(width * 0.045, 0.028),
      tessellation: 14,
    },
    scene,
  )

  cardFrame.position.y = boardY
  insetBoard.position.y = boardY + boardHeight * 0.62
  chipPackage.position.y = chipY
  chipDie.position.y = chipY + Math.max(height * 0.07, 0.04)
  glassCap.position.y = chipDie.position.y + Math.max(height * 0.12, 0.07)
  centerColumn.position.y = glassCap.position.y
  glassCap.metadata = { kind: 'pulse', speed: 0.012 }
  attachMesh(cardFrame, parent, blackCeramicMaterial)
  attachMesh(insetBoard, parent, boardMaterial)
  attachMesh(chipPackage, parent, blackCeramicMaterial)
  attachMesh(chipDie, parent, material)
  attachMesh(glassCap, parent, glassMaterial)
  attachMesh(centerColumn, parent, materials.steel)

  for (const z of [-cornerZ, cornerZ]) {
    const rail = MeshBuilder.CreateBox(
      `${role}-${blockId}-ai-module-gold-edge-rail-${z}`,
      {
        width: Math.max(boardWidth * 0.82, 0.38),
        height: Math.max(height * 0.018, 0.012),
        depth: Math.max(depth * 0.028, 0.018),
      },
      scene,
    )

    rail.position.set(0, traceY, z)
    attachMesh(rail, parent, goldTraceMaterial)
  }

  for (const x of [-cornerX, cornerX]) {
    const rail = MeshBuilder.CreateBox(
      `${role}-${blockId}-ai-module-gold-side-rail-${x}`,
      {
        width: Math.max(width * 0.028, 0.018),
        height: Math.max(height * 0.018, 0.012),
        depth: Math.max(boardDepth * 0.7, 0.3),
      },
      scene,
    )

    rail.position.set(x, traceY, 0)
    attachMesh(rail, parent, goldTraceMaterial)
  }

  for (let index = 0; index < 8; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const lane = Math.floor(index / 2) - 1.5
    const trace = MeshBuilder.CreateBox(
      `${role}-${blockId}-ai-module-gold-trace-fanout-${index}`,
      {
        width: Math.max(width * 0.24, 0.13),
        height: Math.max(height * 0.014, 0.01),
        depth: Math.max(depth * 0.016, 0.01),
      },
      scene,
    )

    trace.position.set(side * Math.max(width * 0.2, 0.11), traceY + 0.004, lane * Math.max(depth * 0.085, 0.045))
    trace.rotation.y = side * (0.18 + lane * 0.035)
    attachMesh(trace, parent, goldTraceMaterial)
  }

  for (let index = 0; index < 6; index += 1) {
    const via = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-ai-module-trace-via-${index}`,
      {
        height: Math.max(height * 0.018, 0.012),
        diameter: Math.max(width * 0.04, 0.024),
        tessellation: 10,
      },
      scene,
    )
    const side = index % 2 === 0 ? -1 : 1
    const lane = Math.floor(index / 2) - 1

    via.position.set(side * Math.max(width * 0.34, 0.2), traceY + 0.014, lane * Math.max(depth * 0.15, 0.08))
    attachMesh(via, parent, materials.steel)
  }

  for (const x of [-cornerX, cornerX]) {
    for (const z of [-cornerZ, cornerZ]) {
      const standoff = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-ai-module-cryo-standoff-${x}-${z}`,
        {
          height: Math.max(height * 0.24, 0.13),
          diameter: Math.max(width * 0.045, 0.026),
          tessellation: 12,
        },
        scene,
      )
      const cap = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-ai-module-standoff-cap-${x}-${z}`,
        {
          height: Math.max(height * 0.03, 0.018),
          diameter: Math.max(width * 0.07, 0.04),
          tessellation: 12,
        },
        scene,
      )

      standoff.position.set(x, chipY + Math.max(height * 0.08, 0.045), z)
      cap.position.set(x, standoff.position.y + Math.max(height * 0.13, 0.075), z)
      attachMesh(standoff, parent, goldTraceMaterial)
      attachMesh(cap, parent, materials.steel)
    }
  }

  for (const side of [-1, 1]) {
    const serviceCable = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-ai-module-service-cable-${side}`,
      {
        height: Math.max(depth * 0.44, 0.24),
        diameter: Math.max(width * 0.026, 0.018),
        tessellation: 8,
      },
      scene,
    )

    serviceCable.rotation.x = Math.PI / 2
    serviceCable.position.set(side * Math.max(width * 0.3, 0.17), chipY + Math.max(height * 0.06, 0.035), 0)
    attachMesh(serviceCable, parent, materials.trim)
  }

  const teamStatusStrip = MeshBuilder.CreateBox(
    `${role}-${blockId}-ai-module-team-status-strip`,
    {
      width: Math.max(width * 0.32, 0.18),
      height: Math.max(height * 0.022, 0.014),
      depth: Math.max(depth * 0.05, 0.028),
    },
    scene,
  )

  teamStatusStrip.position.set(0, boardY + boardHeight * 0.72, -boardDepth * 0.54)
  attachMesh(teamStatusStrip, parent, material)
}

function createMagnetPart(
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
  const baseWidth = Math.max(width * 0.84, 0.48)
  const baseDepth = Math.max(depth * 0.78, 0.44)
  const baseHeight = Math.max(height * 0.16, 0.08)
  const coilDiameter = Math.max(Math.min(width, depth) * 0.42, 0.28)
  const coilHeight = Math.max(height * 0.68, 0.38)
  const coilY = Math.max(height * 0.48, 0.28)
  const flangeDiameter = Math.max(coilDiameter * 1.34, 0.38)
  const yokeX = Math.max(width * 0.36, 0.22)
  const terminalX = Math.max(width * 0.3, 0.18)
  const terminalZ = Math.max(depth * 0.28, 0.16)
  const lowerY = coilY - coilHeight * 0.5
  const upperY = coilY + coilHeight * 0.5

  const copperMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-copper-winding-mat`,
    '#b96b2f',
    '#2a1004',
    0.82,
    0.32,
  )
  const brassMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-bolted-brass-mat`,
    '#bd8232',
    '#261207',
    0.76,
    0.36,
  )
  const ceramicMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-ceramic-core-mat`,
    '#d8d1bb',
    '#15120b',
    0.05,
    0.54,
    'utility',
  )
  const darkInsulatorMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-dark-insulator-mat`,
    '#151716',
    '#030303',
    0.16,
    0.82,
    'rubber',
  )
  const steelYokeMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-laminated-yoke-mat`,
    '#59605d',
    '#080a0a',
    0.86,
    0.43,
    'utility',
  )

  const base = MeshBuilder.CreateBox(
    `${role}-${blockId}-magnet-bolted-plinth`,
    {
      width: baseWidth,
      height: baseHeight,
      depth: baseDepth,
    },
    scene,
  )
  const isolationPad = MeshBuilder.CreateBox(
    `${role}-${blockId}-magnet-rubber-isolation-pad`,
    {
      width: Math.max(baseWidth * 0.72, 0.36),
      height: Math.max(height * 0.045, 0.026),
      depth: Math.max(baseDepth * 0.68, 0.34),
    },
    scene,
  )
  const core = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-magnet-ceramic-solenoid-core`,
    {
      height: coilHeight,
      diameter: coilDiameter,
      tessellation: 32,
    },
    scene,
  )
  const lowerFlange = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-magnet-lower-bolted-flange`,
    {
      height: Math.max(height * 0.085, 0.048),
      diameter: flangeDiameter,
      tessellation: 32,
    },
    scene,
  )
  const upperFlange = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-magnet-upper-bolted-flange`,
    {
      height: Math.max(height * 0.085, 0.048),
      diameter: flangeDiameter,
      tessellation: 32,
    },
    scene,
  )
  const topTerminalCap = MeshBuilder.CreateSphere(
    `${role}-${blockId}-magnet-domed-top-terminal`,
    { diameter: Math.max(coilDiameter * 0.45, 0.14), segments: 16 },
    scene,
  )

  base.position.y = Math.max(height * 0.08, 0.045)
  isolationPad.position.y = base.position.y + baseHeight * 0.62
  core.position.y = coilY
  lowerFlange.position.y = lowerY
  upperFlange.position.y = upperY
  topTerminalCap.position.y = upperY + Math.max(height * 0.12, 0.07)
  topTerminalCap.scaling.y = 0.42
  attachMesh(base, parent, darkInsulatorMaterial)
  attachMesh(isolationPad, parent, darkInsulatorMaterial)
  attachMesh(core, parent, ceramicMaterial)
  attachMesh(lowerFlange, parent, brassMaterial)
  attachMesh(upperFlange, parent, brassMaterial)
  attachMesh(topTerminalCap, parent, materials.steel)

  for (let index = 0; index < 10; index += 1) {
    const winding = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-copper-winding-ring-${index}`,
      {
        diameter: Math.max(coilDiameter * 1.16, 0.34),
        thickness: Math.max(width * 0.022, 0.014),
        tessellation: 32,
      },
      scene,
    )

    winding.position.y = lowerY + Math.max(height * 0.08, 0.045) + index * ((coilHeight - Math.max(height * 0.16, 0.09)) / 9)
    attachMesh(winding, parent, copperMaterial)
  }

  for (let index = 0; index < 4; index += 1) {
    const separator = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-silver-lamination-band-${index}`,
      {
        diameter: Math.max(coilDiameter * 1.22, 0.36),
        thickness: Math.max(width * 0.014, 0.01),
        tessellation: 28,
      },
      scene,
    )

    separator.position.y = lowerY + Math.max(height * 0.15, 0.08) + index * Math.max(height * 0.14, 0.075)
    attachMesh(separator, parent, materials.steel)
  }

  for (const side of [-1, 1]) {
    const yoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-laminated-side-yoke-${side}`,
      {
        width: Math.max(width * 0.11, 0.065),
        height: Math.max(coilHeight * 0.92, 0.34),
        depth: Math.max(depth * 0.56, 0.3),
      },
      scene,
    )
    const poleShoe = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-soft-iron-pole-shoe-${side}`,
      {
        width: Math.max(width * 0.16, 0.09),
        height: Math.max(height * 0.13, 0.075),
        depth: Math.max(depth * 0.34, 0.18),
      },
      scene,
    )
    const bridgeConductor = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-magnet-copper-bridge-conductor-${side}`,
      {
        height: Math.max(depth * 0.58, 0.32),
        diameter: Math.max(width * 0.035, 0.022),
        tessellation: 12,
      },
      scene,
    )

    yoke.position.set(side * yokeX, coilY, 0)
    poleShoe.position.set(side * yokeX, lowerY + Math.max(height * 0.12, 0.07), Math.max(depth * 0.28, 0.16))
    bridgeConductor.rotation.x = Math.PI / 2
    bridgeConductor.position.set(side * Math.max(width * 0.22, 0.14), upperY + Math.max(height * 0.08, 0.05), 0)
    attachMesh(yoke, parent, steelYokeMaterial)
    attachMesh(poleShoe, parent, steelYokeMaterial)
    attachMesh(bridgeConductor, parent, copperMaterial)
  }

  for (const x of [-terminalX, terminalX]) {
    for (const z of [-terminalZ, terminalZ]) {
      const post = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-magnet-insulated-terminal-post-${x}-${z}`,
        {
          height: Math.max(height * 0.28, 0.16),
          diameter: Math.max(width * 0.04, 0.026),
          tessellation: 12,
        },
        scene,
      )
      const cap = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-magnet-terminal-nut-${x}-${z}`,
        {
          height: Math.max(height * 0.035, 0.022),
          diameter: Math.max(width * 0.08, 0.045),
          tessellation: 12,
        },
        scene,
      )

      post.position.set(x, upperY + Math.max(height * 0.08, 0.045), z)
      cap.position.set(x, post.position.y + Math.max(height * 0.15, 0.085), z)
      attachMesh(post, parent, darkInsulatorMaterial)
      attachMesh(cap, parent, brassMaterial)
    }
  }

  for (let index = 0; index < 6; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-magnet-plinth-bolt-${index}`,
      {
        height: Math.max(height * 0.025, 0.016),
        diameter: Math.max(width * 0.045, 0.028),
        tessellation: 10,
      },
      scene,
    )
    const angle = (index / 6) * Math.PI * 2

    bolt.position.set(
      Math.cos(angle) * baseWidth * 0.34,
      base.position.y + baseHeight * 0.58,
      Math.sin(angle) * baseDepth * 0.32,
    )
    attachMesh(bolt, parent, materials.steel)
  }

  for (let index = 0; index < 8; index += 1) {
    const flangeBolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-magnet-upper-flange-bolt-${index}`,
      {
        height: Math.max(height * 0.022, 0.014),
        diameter: Math.max(width * 0.04, 0.024),
        tessellation: 10,
      },
      scene,
    )
    const angle = (index / 8) * Math.PI * 2

    flangeBolt.position.set(
      Math.cos(angle) * flangeDiameter * 0.38,
      upperY + Math.max(height * 0.05, 0.03),
      Math.sin(angle) * flangeDiameter * 0.38,
    )
    attachMesh(flangeBolt, parent, materials.steel)
  }

  const fieldRoot = new TransformNode(`${role}-${blockId}-magnet-field-pulse-root`, scene)

  fieldRoot.parent = parent
  fieldRoot.metadata = { kind: 'pulse', speed: 0.018 }

  for (let index = 0; index < 3; index += 1) {
    const fieldRing = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-team-field-ring-${index}`,
      {
        diameter: Math.max(coilDiameter * (1.55 + index * 0.2), 0.44),
        thickness: Math.max(width * 0.014, 0.01),
        tessellation: 32,
      },
      scene,
    )

    fieldRing.position.y = coilY - Math.max(height * 0.18, 0.1) + index * Math.max(height * 0.18, 0.1)
    attachMesh(fieldRing, fieldRoot, material)
  }

  const teamStatusStrip = MeshBuilder.CreateBox(
    `${role}-${blockId}-magnet-team-status-strip`,
    {
      width: Math.max(width * 0.36, 0.2),
      height: Math.max(height * 0.025, 0.016),
      depth: Math.max(depth * 0.055, 0.032),
    },
    scene,
  )

  teamStatusStrip.position.set(0, base.position.y + baseHeight * 0.72, -baseDepth * 0.54)
  attachMesh(teamStatusStrip, parent, material)
}

function createEnergyCorePart(
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
  const baseWidth = Math.max(width * 0.86, 0.48)
  const baseDepth = Math.max(depth * 0.86, 0.48)
  const baseHeight = Math.max(height * 0.16, 0.08)
  const vesselSize = Math.max(Math.min(width, depth) * 0.48, 0.28)
  const vesselY = Math.max(height * 0.48, 0.28)
  const topRailY = vesselY + Math.max(height * 0.38, 0.21)
  const bottomRailY = vesselY - Math.max(height * 0.34, 0.18)
  const cornerX = Math.max(width * 0.36, 0.2)
  const cornerZ = Math.max(depth * 0.36, 0.2)
  const glassMaterial = createSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-containment-glass-mat`,
    '#8ff4ff',
    '#134f5a',
    0.34,
    0.52,
  )
  const brassMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-machined-brass-mat`,
    '#b7822f',
    '#171006',
    0.78,
    0.34,
  )
  const copperMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-wound-copper-mat`,
    '#a8642e',
    '#241006',
    0.76,
    0.38,
  )
  const darkInsulatorMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-dark-insulator-mat`,
    '#171819',
    '#030303',
    0.12,
    0.82,
  )
  const amberMaterial = createSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-amber-charge-mat`,
    '#f3b35c',
    '#ff6a12',
    0.66,
    0.28,
  )

  const base = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-bolted-plinth`,
    {
      width: baseWidth,
      height: baseHeight,
      depth: baseDepth,
    },
    scene,
  )
  const lowerInsulator = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-rubber-isolation-pad`,
    {
      width: Math.max(baseWidth * 0.72, 0.36),
      height: Math.max(height * 0.055, 0.032),
      depth: Math.max(baseDepth * 0.72, 0.36),
    },
    scene,
  )
  const glassCube = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-containment-vessel`,
    {
      width: vesselSize,
      height: Math.max(height * 0.62, 0.34),
      depth: vesselSize,
    },
    scene,
  )
  const chargeColumn = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-energy-core-pulse-column`,
    {
      height: Math.max(height * 0.38, 0.22),
      diameter: Math.max(width * 0.13, 0.075),
      tessellation: 18,
    },
    scene,
  )
  const chargeSleeve = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-energy-core-amber-charge-sleeve`,
    {
      height: Math.max(height * 0.28, 0.16),
      diameter: Math.max(width * 0.22, 0.125),
      tessellation: 18,
    },
    scene,
  )
  const topLens = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-energy-core-top-energy-lens`,
    {
      height: Math.max(height * 0.055, 0.032),
      diameter: Math.max(width * 0.13, 0.075),
      tessellation: 20,
    },
    scene,
  )
  const topPlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-bolted-top-plate`,
    {
      width: Math.max(vesselSize * 0.58, 0.18),
      height: Math.max(height * 0.055, 0.032),
      depth: Math.max(vesselSize * 0.58, 0.18),
    },
    scene,
  )
  const bottomPlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-bolted-bottom-plate`,
    {
      width: Math.max(vesselSize * 1.18, 0.34),
      height: Math.max(height * 0.07, 0.04),
      depth: Math.max(vesselSize * 1.18, 0.34),
    },
    scene,
  )

  base.position.y = Math.max(height * 0.1, 0.06)
  lowerInsulator.position.y = base.position.y + baseHeight * 0.68
  glassCube.position.y = vesselY
  chargeColumn.position.y = vesselY
  chargeColumn.metadata = { kind: 'pulse', speed: 0.032 }
  chargeSleeve.position.y = vesselY
  chargeSleeve.metadata = { kind: 'pulse', speed: 0.024 }
  topPlate.position.y = topRailY
  bottomPlate.position.y = bottomRailY
  topLens.position.y = topRailY + Math.max(height * 0.05, 0.03)
  attachMesh(base, parent, darkInsulatorMaterial)
  attachMesh(lowerInsulator, parent, darkInsulatorMaterial)
  attachMesh(glassCube, parent, glassMaterial)
  attachMesh(chargeColumn, parent, materials.light)
  attachMesh(chargeSleeve, parent, amberMaterial)
  attachMesh(topPlate, parent, brassMaterial)
  attachMesh(bottomPlate, parent, brassMaterial)
  attachMesh(topLens, parent, amberMaterial)

  for (let index = 0; index < 3; index += 1) {
    const coil = MeshBuilder.CreateTorus(
      `${role}-${blockId}-energy-core-induction-coil-ring-${index}`,
      {
        diameter: Math.max(vesselSize * (1.04 + index * 0.08), 0.3),
        thickness: 0.018,
        tessellation: 28,
      },
      scene,
    )

    coil.position.y = vesselY - Math.max(height * 0.2, 0.1) + index * Math.max(height * 0.2, 0.1)
    attachMesh(coil, parent, index === 1 ? materials.steel : copperMaterial)
  }

  for (const x of [-cornerX, cornerX]) {
    for (const z of [-cornerZ, cornerZ]) {
      const pillar = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-energy-core-cage-corner-pillar-${x}-${z}`,
        {
          height: Math.max(height * 0.74, 0.42),
          diameter: 0.032,
          tessellation: 10,
        },
        scene,
      )
      const foot = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-energy-core-cage-foot-${x}-${z}`,
        {
          height: 0.035,
          diameter: 0.07,
          tessellation: 12,
        },
        scene,
      )
      const cap = MeshBuilder.CreateSphere(
        `${role}-${blockId}-energy-core-cage-cap-node-${x}-${z}`,
        { diameter: 0.07, segments: 10 },
        scene,
      )

      pillar.position.set(x, vesselY, z)
      foot.position.set(x, bottomRailY - Math.max(height * 0.06, 0.035), z)
      cap.position.set(x, topRailY + Math.max(height * 0.06, 0.035), z)
      attachMesh(pillar, parent, brassMaterial)
      attachMesh(foot, parent, darkInsulatorMaterial)
      attachMesh(cap, parent, brassMaterial)
    }
  }

  for (const railY of [bottomRailY, topRailY]) {
    for (const z of [-cornerZ, cornerZ]) {
      const rail = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-energy-core-cage-x-rail-${railY}-${z}`,
        {
          height: cornerX * 2,
          diameter: 0.026,
          tessellation: 8,
        },
        scene,
      )

      rail.rotation.z = Math.PI / 2
      rail.position.set(0, railY, z)
      attachMesh(rail, parent, brassMaterial)
    }

    for (const x of [-cornerX, cornerX]) {
      const rail = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-energy-core-cage-z-rail-${railY}-${x}`,
        {
          height: cornerZ * 2,
          diameter: 0.026,
          tessellation: 8,
        },
        scene,
      )

      rail.rotation.x = Math.PI / 2
      rail.position.set(x, railY, 0)
      attachMesh(rail, parent, brassMaterial)
    }
  }

  for (const side of [-1, 1]) {
    const conduit = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-service-conduit-${side}`,
      {
        height: Math.max(depth * 0.74, 0.4),
        diameter: 0.026,
        tessellation: 8,
      },
      scene,
    )
    const sideGear = MeshBuilder.CreateTorus(
      `${role}-${blockId}-energy-core-side-gear-ring-${side}`,
      {
        diameter: Math.max(width * 0.22, 0.13),
        thickness: 0.018,
        tessellation: 18,
      },
      scene,
    )
    const sideHub = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-side-gear-hub-${side}`,
      {
        height: 0.035,
        diameter: Math.max(width * 0.09, 0.055),
        tessellation: 12,
      },
      scene,
    )

    conduit.rotation.x = Math.PI / 2
    conduit.position.set(side * Math.max(width * 0.45, 0.25), Math.max(height * 0.22, 0.13), 0)
    sideGear.rotation.y = Math.PI / 2
    sideGear.position.set(side * Math.max(width * 0.48, 0.28), vesselY - Math.max(height * 0.03, 0.018), 0)
    sideHub.rotation.z = Math.PI / 2
    sideHub.position.copyFrom(sideGear.position)
    attachMesh(conduit, parent, materials.steel)
    attachMesh(sideGear, parent, brassMaterial)
    attachMesh(sideHub, parent, materials.steel)

    for (let toothIndex = 0; toothIndex < 8; toothIndex += 1) {
      const angle = (toothIndex / 8) * Math.PI * 2
      const tooth = MeshBuilder.CreateBox(
        `${role}-${blockId}-energy-core-side-gear-tooth-${side}-${toothIndex}`,
        {
          width: 0.026,
          height: 0.04,
          depth: 0.018,
        },
        scene,
      )

      tooth.position.set(
        side * Math.max(width * 0.49, 0.29),
        sideGear.position.y + Math.sin(angle) * Math.max(width * 0.12, 0.07),
        Math.cos(angle) * Math.max(width * 0.12, 0.07),
      )
      tooth.rotation.x = angle
      attachMesh(tooth, parent, brassMaterial)
    }
  }

  for (let index = 0; index < 4; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-plinth-bolt-${index}`,
      { height: 0.022, diameter: 0.04, tessellation: 10 },
      scene,
    )
    const x = index % 2 === 0 ? -baseWidth * 0.34 : baseWidth * 0.34
    const z = index < 2 ? -baseDepth * 0.34 : baseDepth * 0.34

    bolt.position.set(x, base.position.y + baseHeight * 0.62, z)
    attachMesh(bolt, parent, materials.steel)
  }

  const teamStatusStrip = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-team-status-strip`,
    {
      width: Math.max(width * 0.34, 0.18),
      height: 0.02,
      depth: Math.max(depth * 0.04, 0.026),
    },
    scene,
  )

  teamStatusStrip.position.set(0, base.position.y + baseHeight * 0.7, -baseDepth * 0.54)
  attachMesh(teamStatusStrip, parent, material)
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
  const baseWidth = Math.max(width * 0.72, 0.48)
  const baseDepth = Math.max(depth * 0.56, 0.36)
  const baseY = -Math.max(height * 0.14, 0.07)
  const cageY = Math.max(height * 0.34, 0.28)
  const ringDiameter = Math.max(Math.min(width, depth) * 0.7, 0.46)
  const flywheelDiameter = Math.max(ringDiameter * 0.44, 0.24)
  const axleLength = Math.max(width * 0.56, 0.36)
  const pivotHeight = Math.max(ringDiameter * 1.12, 0.52)

  const basePlate = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-round-base`,
    {
      height: Math.max(height * 0.08, 0.045),
      diameter: Math.max(baseWidth, baseDepth),
      tessellation: 32,
    },
    scene,
  )
  const baseFoot = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-low-socket-foot`,
    {
      height: Math.max(height * 0.05, 0.03),
      diameter: Math.max(baseWidth * 0.56, 0.28),
      tessellation: 24,
    },
    scene,
  )
  const pedestal = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-pedestal-column`,
    {
      height: Math.max(height * 0.3, 0.18),
      diameter: Math.max(width * 0.08, 0.05),
      tessellation: 18,
    },
    scene,
  )
  const pivotAxis = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-vertical-pivot-axis`,
    {
      height: pivotHeight,
      diameter: Math.max(width * 0.032, 0.02),
      tessellation: 12,
    },
    scene,
  )
  const lowerPivot = MeshBuilder.CreateSphere(
    `${role}-${blockId}-gyro-lower-pivot-ball`,
    { diameter: Math.max(width * 0.08, 0.045), segments: 10 },
    scene,
  )
  const upperPivot = MeshBuilder.CreateSphere(
    `${role}-${blockId}-gyro-upper-pivot-ball`,
    { diameter: Math.max(width * 0.07, 0.04), segments: 10 },
    scene,
  )

  basePlate.position.y = baseY
  baseFoot.position.y = baseY + Math.max(height * 0.065, 0.038)
  pedestal.position.y = baseY + Math.max(height * 0.21, 0.13)
  pivotAxis.position.y = cageY
  lowerPivot.position.y = cageY - pivotHeight * 0.5
  upperPivot.position.y = cageY + pivotHeight * 0.5
  attachMesh(basePlate, parent, materials.trim)
  attachMesh(baseFoot, parent, materials.steel)
  attachMesh(pedestal, parent, materials.steel)
  attachMesh(pivotAxis, parent, materials.steel)
  attachMesh(lowerPivot, parent, materials.steel)
  attachMesh(upperPivot, parent, materials.steel)

  const outerGimbal = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-outer-gimbal-ring`,
    {
      diameter: ringDiameter,
      thickness: Math.max(width * 0.045, 0.028),
      tessellation: 32,
    },
    scene,
  )
  const equatorGimbal = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-equator-gimbal-ring`,
    {
      diameter: Math.max(ringDiameter * 0.92, 0.4),
      thickness: Math.max(width * 0.034, 0.022),
      tessellation: 32,
    },
    scene,
  )
  const innerGimbal = MeshBuilder.CreateTorus(
    `${role}-${blockId}-gyro-inner-gimbal-ring`,
    {
      diameter: Math.max(ringDiameter * 0.68, 0.32),
      thickness: Math.max(width * 0.024, 0.016),
      tessellation: 28,
    },
    scene,
  )

  outerGimbal.position.y = cageY
  outerGimbal.rotation.x = Math.PI / 2
  equatorGimbal.position.y = cageY
  innerGimbal.position.y = cageY
  innerGimbal.rotation.z = Math.PI / 2
  attachMesh(outerGimbal, parent, materials.steel)
  attachMesh(equatorGimbal, parent, materials.steel)
  attachMesh(innerGimbal, parent, materials.trim)

  const rotorRoot = new TransformNode(`${role}-${blockId}-gyro-flywheel-motion-root`, scene)

  rotorRoot.position.set(0, cageY, 0)
  rotorRoot.metadata = { kind: 'spin', axis: 'x', speed: 0.11 }
  rotorRoot.parent = parent

  const flywheel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-flywheel-disc`,
    {
      height: Math.max(width * 0.11, 0.07),
      diameter: flywheelDiameter,
      tessellation: 48,
    },
    scene,
  )
  const flywheelHub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-flywheel-hub`,
    {
      height: Math.max(width * 0.15, 0.09),
      diameter: Math.max(flywheelDiameter * 0.32, 0.11),
      tessellation: 24,
    },
    scene,
  )
  const axle = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-gyro-horizontal-axle`,
    {
      height: axleLength,
      diameter: Math.max(width * 0.04, 0.026),
      tessellation: 14,
    },
    scene,
  )

  flywheel.rotation.z = Math.PI / 2
  flywheelHub.rotation.z = Math.PI / 2
  axle.rotation.z = Math.PI / 2
  attachMesh(flywheel, rotorRoot, materials.steel)
  attachMesh(flywheelHub, rotorRoot, materials.warning)
  attachMesh(axle, rotorRoot, materials.steel)

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-gyro-flywheel-spoke-${index}`,
      {
        width: Math.max(width * 0.026, 0.016),
        height: Math.max(width * 0.026, 0.016),
        depth: Math.max(flywheelDiameter * 0.44, 0.12),
      },
      scene,
    )

    spoke.rotation.x = angle
    attachMesh(spoke, rotorRoot, materials.trim)
  }

  for (const side of [-1, 1]) {
    const pivotSaddle = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-gyro-pivot-saddle-${side}`,
      {
        height: Math.max(width * 0.09, 0.052),
        diameter: Math.max(width * 0.09, 0.052),
        tessellation: 16,
      },
      scene,
    )

    pivotSaddle.position.set(side * axleLength * 0.5, cageY, 0)
    pivotSaddle.rotation.z = Math.PI / 2
    attachMesh(pivotSaddle, parent, materials.steel)
  }

  const teamIndex = MeshBuilder.CreateBox(
    `${role}-${blockId}-gyro-team-index-tab`,
    {
      width: Math.max(width * 0.16, 0.09),
      height: Math.max(height * 0.025, 0.016),
      depth: Math.max(depth * 0.18, 0.1),
    },
    scene,
  )

  teamIndex.position.set(0, baseY + Math.max(height * 0.12, 0.07), baseDepth * 0.22)
  attachMesh(teamIndex, parent, material)

  for (const side of [-1, 1]) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-gyro-base-bolt-${side}`,
      { height: 0.025, diameter: Math.max(width * 0.055, 0.032), tessellation: 10 },
      scene,
    )

    bolt.position.set(side * baseWidth * 0.28, baseY + Math.max(height * 0.08, 0.05), -baseDepth * 0.28)
    attachMesh(bolt, parent, materials.steel)
  }
}

function isElectronicsPart(partId: string): boolean {
  return [
    'Battery',
    'Drone',
    'EnergyCore',
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
