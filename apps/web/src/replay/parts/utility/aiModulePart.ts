import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import { createPbrSceneMaterial, createSceneMaterial } from '../../rendering/sceneUtils'
import type { UtilityPartRenderArgs } from './types'

export function createAiModulePart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: UtilityPartRenderArgs): void {

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
