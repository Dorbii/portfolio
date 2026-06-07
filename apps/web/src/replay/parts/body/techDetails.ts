import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import {
  attachMesh,
  createBoxDetail,
} from '../../rendering/meshHelpers'
import type { TeamMaterialSet } from '../../rendering/materials'

export function createRaisedTechCluster(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  width: number,
  height: number,
  depth: number,
): void {
  if (Math.max(width, depth) < 0.7) {
    createCompactControlDeck(scene, parent, materials, width, height, depth)
    return
  }

  const deck = MeshBuilder.CreateBox(
    `${parent.name}-raised-electronics-deck`,
    {
      width: Math.max(width * 0.46, 0.28),
      height: Math.max(height * 0.24, 0.16),
      depth: Math.max(depth * 0.34, 0.24),
    },
    scene,
  )
  const equipmentStack = MeshBuilder.CreateBox(
    `${parent.name}-equipment-stack`,
    {
      width: Math.max(width * 0.28, 0.18),
      height: Math.max(height * 0.48, 0.24),
      depth: Math.max(depth * 0.22, 0.16),
    },
    scene,
  )
  const sensor = MeshBuilder.CreateCylinder(
    `${parent.name}-modular-sensor-pod`,
    {
      height: Math.max(height * 0.22, 0.16),
      diameter: Math.max(Math.min(width, depth) * 0.22, 0.14),
      tessellation: 10,
    },
    scene,
  )
  const electronicsBay = MeshBuilder.CreateBox(
    `${parent.name}-offset-electronics-bay`,
    {
      width: Math.max(width * 0.22, 0.16),
      height: Math.max(height * 0.36, 0.18),
      depth: Math.max(depth * 0.36, 0.18),
    },
    scene,
  )
  const cableRun = MeshBuilder.CreateCylinder(
    `${parent.name}-exposed-cable-run`,
    {
      height: Math.max(depth * 0.72, 0.34),
      diameter: 0.032,
      tessellation: 8,
    },
    scene,
  )

  deck.position.set(-width * 0.08, Math.max(height * 0.9, 0.4), -depth * 0.07)
  equipmentStack.position.set(width * 0.12, Math.max(height * 1.12, 0.54), -depth * 0.08)
  sensor.position.set(width * 0.12, Math.max(height * 1.42, 0.72), depth * 0.12)
  electronicsBay.position.set(width * 0.42, Math.max(height * 0.66, 0.32), -depth * 0.2)
  cableRun.rotation.x = Math.PI / 2
  cableRun.position.set(-width * 0.36, Math.max(height * 0.78, 0.34), 0)
  attachMesh(deck, parent, materials.trim)
  attachMesh(equipmentStack, parent, materials.utility)
  attachMesh(sensor, parent, materials.light)
  attachMesh(electronicsBay, parent, materials.utility)
  attachMesh(cableRun, parent, materials.trim)
  createCableLoop(scene, parent, materials.trim, `${parent.name}-raised-control-wire`, {
    diameter: Math.max(Math.min(width, depth) * 0.42, 0.24),
    thickness: 0.022,
    x: -width * 0.08,
    y: Math.max(height * 1.05, 0.5),
    z: depth * 0.2,
  })

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-electronics-fin-${index + 1}`,
      0.035,
      Math.max(height * 0.38, 0.18),
      Math.max(depth * 0.2, 0.12),
      width * 0.2 + index * Math.max(width * 0.075, 0.06),
      Math.max(height * 1.22, 0.58),
      -depth * 0.12,
    )
  }
}

export function createCompactControlDeck(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  width: number,
  height: number,
  depth: number,
): void {
  const board = MeshBuilder.CreateBox(
    `${parent.name}-compact-pcb-deck`,
    {
      width: Math.max(width * 0.58, 0.3),
      height: 0.045,
      depth: Math.max(depth * 0.52, 0.26),
    },
    scene,
  )
  const chip = MeshBuilder.CreateBox(
    `${parent.name}-compact-controller-chip`,
    {
      width: Math.max(width * 0.24, 0.14),
      height: 0.08,
      depth: Math.max(depth * 0.2, 0.12),
    },
    scene,
  )

  board.position.set(0, Math.max(height * 0.72, 0.25), -depth * 0.02)
  chip.position.set(-width * 0.06, board.position.y + 0.065, 0)
  attachMesh(board, parent, materials.utility)
  attachMesh(chip, parent, materials.trim)

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(
      scene,
      parent,
      materials.warning,
      `${parent.name}-compact-pcb-trace-${index + 1}`,
      Math.max(width * 0.06, 0.035),
      0.025,
      Math.max(depth * 0.38, 0.18),
      index * Math.max(width * 0.14, 0.07),
      board.position.y + 0.04,
      0,
    )
  }

  createCableLoop(scene, parent, materials.trim, `${parent.name}-compact-control-wire`, {
    diameter: Math.max(Math.min(width, depth) * 0.42, 0.22),
    thickness: 0.018,
    x: width * 0.2,
    y: board.position.y + 0.08,
    z: depth * 0.18,
  })
}

export function createCableLoop(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  name: string,
  options: {
    diameter: number
    thickness: number
    x: number
    y: number
    z: number
  },
): void {
  const cable = MeshBuilder.CreateTorus(
    name,
    {
      diameter: options.diameter,
      thickness: options.thickness,
      tessellation: 14,
    },
    scene,
  )

  cable.rotation.x = Math.PI / 2
  cable.position.set(options.x, options.y, options.z)
  attachMesh(cable, parent, material)
}
