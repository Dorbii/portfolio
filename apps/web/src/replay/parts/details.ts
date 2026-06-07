import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type {
  PartCategory,
  TeamRole,
} from '../../../../../packages/schemas/src/index.js'
import {
  attachMesh,
  createBoxDetail,
} from '../rendering/meshHelpers'
import type { TeamMaterialSet } from '../rendering/materials'

export function createPartAccents(
  scene: Scene,
  parent: TransformNode,
  role: TeamRole,
  blockId: string,
  category: PartCategory,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  if (category === 'mobility') {
    return
  }

  const topY = Math.max(height * 0.52, 0.16)

  createBoxDetail(
    scene,
    parent,
    materials.trim,
    `${role}-${blockId}-side-rail-l`,
    Math.max(width * 0.16, 0.08),
    0.08,
    Math.max(depth * 0.78, 0.2),
    -Math.max(width * 0.5, 0.18),
    topY,
    0,
  )
  createBoxDetail(
    scene,
    parent,
    materials.trim,
    `${role}-${blockId}-side-rail-r`,
    Math.max(width * 0.16, 0.08),
    0.08,
    Math.max(depth * 0.78, 0.2),
    Math.max(width * 0.5, 0.18),
    topY,
    0,
  )

  if (category === 'body' || category === 'utility') {
    createBoxDetail(
      scene,
      parent,
      materials.light,
      `${role}-${blockId}-status-light`,
      Math.max(width * 0.38, 0.16),
      0.07,
      0.08,
      0,
      Math.max(height * 0.7, 0.22),
      Math.max(depth * 0.42, 0.14),
    )
    createElectricalSurfaceDetails(scene, parent, materials, `${role}-${blockId}`, category, width, height, depth)
  }

  if (category === 'body') {
    createBodyPaintPanels(scene, parent, materials, width, height, depth)
  }

  createFastenerRow(scene, parent, materials.trim, `${role}-${blockId}-front-fasteners`, {
    count: 2,
    xStart: -width * 0.34,
    xStep: width * 0.68,
    y: Math.max(height * 0.7, 0.24),
    z: depth * 0.34,
  })
  createFastenerRow(scene, parent, materials.trim, `${role}-${blockId}-rear-fasteners`, {
    count: 2,
    xStart: -width * 0.34,
    xStep: width * 0.68,
    y: Math.max(height * 0.7, 0.24),
    z: -depth * 0.34,
  })

  if (category === 'utility') {
    createVentSlats(scene, parent, materials.trim, `${role}-${blockId}-utility-vents`, {
      count: 4,
      width: Math.max(width * 0.38, 0.18),
      y: Math.max(height * 0.54, 0.2),
      z: -Math.max(depth * 0.36, 0.12),
    })
  }

  if (category === 'defense' || category === 'body') {
    createPanelSeam(scene, parent, materials.trim, `${role}-${blockId}-service-seam`, {
      width: Math.max(width * 0.58, 0.22),
      y: Math.max(height * 0.73, 0.25),
      z: 0,
    })
  }

  if (category === 'weapon') {
    createWeaponPowerLead(scene, parent, materials, `${role}-${blockId}`, width, height, depth)
  }
}

function createElectricalSurfaceDetails(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  name: string,
  category: PartCategory,
  width: number,
  height: number,
  depth: number,
): void {
  if (Math.max(width, depth) < 0.42) {
    return
  }

  const boardWidth = Math.max(width * 0.34, 0.2)
  const boardDepth = Math.max(depth * 0.28, 0.16)
  const boardY = category === 'utility'
    ? Math.max(height * 0.88, 0.32)
    : Math.max(height * 0.96, 0.36)
  const boardX = -Math.max(width * 0.14, 0.05)
  const boardZ = -Math.max(depth * 0.12, 0.04)

  createBoxDetail(
    scene,
    parent,
    materials.circuit,
    `${name}-visible-pcb`,
    boardWidth,
    0.035,
    boardDepth,
    boardX,
    boardY,
    boardZ,
  )

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(
      scene,
      parent,
      index === 0 ? materials.light : materials.warning,
      `${name}-visible-pcb-trace-${index + 1}`,
      Math.max(boardWidth * 0.11, 0.035),
      0.018,
      boardDepth * 0.72,
      boardX + index * boardWidth * 0.24,
      boardY + 0.035,
      boardZ,
    )
  }

  createBoxDetail(
    scene,
    parent,
    materials.trim,
    `${name}-visible-controller-chip`,
    boardWidth * 0.34,
    0.07,
    boardDepth * 0.32,
    boardX - boardWidth * 0.08,
    boardY + 0.075,
    boardZ - boardDepth * 0.04,
  )

  for (let side = -1; side <= 1; side += 2) {
    const terminal = MeshBuilder.CreateCylinder(
      `${name}-visible-terminal-${side}`,
      { height: 0.055, diameter: 0.055, tessellation: 8 },
      scene,
    )

    terminal.position.set(boardX + side * boardWidth * 0.34, boardY + 0.07, boardZ + boardDepth * 0.34)
    attachMesh(terminal, parent, materials.warning)
  }

  const tube = MeshBuilder.CreateCylinder(
    `${name}-visible-status-tube`,
    { height: 0.18, diameter: 0.065, tessellation: 10 },
    scene,
  )
  const tubeCap = MeshBuilder.CreateCylinder(
    `${name}-visible-status-tube-cap`,
    { height: 0.045, diameter: 0.08, tessellation: 10 },
    scene,
  )
  const cableLoop = MeshBuilder.CreateTorus(
    `${name}-visible-service-wire`,
    {
      diameter: Math.max(Math.min(width, depth) * 0.28, 0.17),
      thickness: 0.018,
      tessellation: 14,
    },
    scene,
  )

  tube.position.set(boardX + boardWidth * 0.32, boardY + 0.13, boardZ - boardDepth * 0.26)
  tubeCap.position.set(tube.position.x, boardY + 0.045, tube.position.z)
  cableLoop.rotation.x = Math.PI / 2
  cableLoop.position.set(boardX + boardWidth * 0.2, boardY + 0.08, boardZ + boardDepth * 0.52)
  attachMesh(tube, parent, materials.light)
  attachMesh(tubeCap, parent, materials.trim)
  attachMesh(cableLoop, parent, materials.trim)
}

function createWeaponPowerLead(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  name: string,
  width: number,
  height: number,
  depth: number,
): void {
  const lead = MeshBuilder.CreateCylinder(
    `${name}-weapon-power-lead`,
    {
      height: Math.max(width * 0.52, 0.22),
      diameter: 0.026,
      tessellation: 8,
    },
    scene,
  )

  lead.rotation.z = Math.PI / 2
  lead.position.set(0, Math.max(height * 0.68, 0.25), -Math.max(depth * 0.34, 0.1))
  attachMesh(lead, parent, materials.trim)

  createBoxDetail(
    scene,
    parent,
    materials.circuit,
    `${name}-weapon-service-junction`,
    Math.max(width * 0.2, 0.12),
    0.06,
    Math.max(depth * 0.16, 0.08),
    -Math.max(width * 0.18, 0.06),
    lead.position.y + 0.04,
    lead.position.z,
  )
}

function createBodyPaintPanels(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  width: number,
  height: number,
  depth: number,
): void {
  const topY = Math.max(height * 0.82, 0.28)

  createBoxDetail(
    scene,
    parent,
    materials.armor,
    `${parent.name}-painted-top-armor`,
    Math.max(width * 0.56, 0.22),
    0.05,
    Math.max(depth * 0.42, 0.18),
    -Math.max(width * 0.06, 0.02),
    topY,
    Math.max(depth * 0.08, 0.04),
  )
  createBoxDetail(
    scene,
    parent,
    materials.armor,
    `${parent.name}-painted-front-strike-panel`,
    Math.max(width * 0.72, 0.26),
    0.08,
    0.055,
    0,
    Math.max(height * 0.32, 0.14),
    Math.max(depth * 0.5, 0.18),
  )

  for (let side = -1; side <= 1; side += 2) {
    createBoxDetail(
      scene,
      parent,
      materials.armor,
      `${parent.name}-painted-side-flank-${side}`,
      0.05,
      Math.max(height * 0.3, 0.12),
      Math.max(depth * 0.52, 0.2),
      side * Math.max(width * 0.46, 0.17),
      Math.max(height * 0.42, 0.18),
      -Math.max(depth * 0.04, 0.02),
    )
  }
}

function createFastenerRow(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    count: number
    xStart: number
    xStep: number
    y: number
    z: number
  },
): void {
  for (let index = 0; index < options.count; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${name}-${index}`,
      { height: 0.045, diameter: 0.075, tessellation: 8 },
      scene,
    )

    bolt.position.set(options.xStart + options.xStep * index, options.y, options.z)
    bolt.rotation.x = Math.PI / 2
    attachMesh(bolt, parent, material)
  }
}

function createVentSlats(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    count: number
    width: number
    y: number
    z: number
  },
): void {
  for (let index = 0; index < options.count; index += 1) {
    createBoxDetail(
      scene,
      parent,
      material,
      `${name}-${index}`,
      options.width,
      0.025,
      0.035,
      0,
      options.y,
      options.z + (index - (options.count - 1) / 2) * 0.09,
    )
  }
}

function createPanelSeam(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    width: number
    y: number
    z: number
  },
): void {
  createBoxDetail(
    scene,
    parent,
    material,
    name,
    options.width,
    0.018,
    0.032,
    0,
    options.y,
    options.z,
  )
}

export function createArmorPanel(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  trim: Material,
  width: number,
  height: number,
  depth: number,
): void {
  createBoxDetail(
    scene,
    parent,
    material,
    `${parent.name}-top-plate`,
    width * 0.72,
    0.06,
    depth * 0.72,
    0,
    Math.max(height * 0.66, 0.23),
    0,
  )
  createBoxDetail(
    scene,
    parent,
    trim,
    `${parent.name}-front-guard`,
    width * 0.88,
    0.12,
    0.12,
    0,
    Math.max(height * 0.22, 0.12),
    Math.max(depth * 0.52, 0.18),
  )
}

export function createCornerCaps(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = 0; index < 4; index += 1) {
    createBoxDetail(
      scene,
      parent,
      material,
      `${parent.name}-corner-cap-${index}`,
      Math.max(width * 0.22, 0.1),
      0.12,
      Math.max(depth * 0.22, 0.1),
      index % 2 === 0 ? -width * 0.42 : width * 0.42,
      Math.max(height * 0.56, 0.26),
      index < 2 ? -depth * 0.42 : depth * 0.42,
    )
  }
}

export function createTopLamp(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  radius: number,
  y: number,
): void {
  const lamp = MeshBuilder.CreateBox(
    `${parent.name}-top-lamp`,
    { width: Math.max(radius * 0.55, 0.14), height: 0.07, depth: 0.11 },
    scene,
  )

  lamp.position.set(0, Math.max(y, 0.24), Math.max(radius * 0.3, 0.12))
  attachMesh(lamp, parent, material)
}
