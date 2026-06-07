import type { Material } from '@babylonjs/core/Materials/material'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import { attachMesh } from '../../rendering/meshHelpers'
import {
  tagPartChildMaterialRole,
  type BotPartChildMaterialRole,
  type TeamMaterialSet,
} from '../../rendering/materials'

type ArmorMeshOptions = {
  scene: Scene
  parent: TransformNode
  material: Material
  name: string
  materialRole?: BotPartChildMaterialRole
  position?: [number, number, number]
  rotation?: [number, number, number]
}

type ArmorBoxOptions = ArmorMeshOptions & {
  width: number
  height: number
  depth: number
}

type ArmorCylinderOptions = ArmorMeshOptions & {
  height: number
  diameter?: number
  diameterBottom?: number
  diameterTop?: number
  tessellation?: number
}

export function attachArmorMesh(
  mesh: Mesh,
  parent: TransformNode,
  material: Material,
  materialRole: BotPartChildMaterialRole = 'damageable',
): Mesh {
  attachMesh(mesh, parent, material)
  tagPartChildMaterialRole(mesh, materialRole)

  return mesh
}

export function createArmorBox({
  scene,
  parent,
  material,
  name,
  width,
  height,
  depth,
  materialRole = 'damageable',
  position,
  rotation,
}: ArmorBoxOptions): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene)

  if (position) {
    mesh.position.set(position[0], position[1], position[2])
  }

  if (rotation) {
    mesh.rotation.set(rotation[0], rotation[1], rotation[2])
  }

  return attachArmorMesh(mesh, parent, material, materialRole)
}

export function createArmorCylinder({
  scene,
  parent,
  material,
  name,
  height,
  diameter,
  diameterBottom,
  diameterTop,
  tessellation = 10,
  materialRole = 'trim',
  position,
  rotation,
}: ArmorCylinderOptions): Mesh {
  const cylinderOptions: {
    height: number
    diameter?: number
    diameterBottom?: number
    diameterTop?: number
    tessellation: number
  } = { height, tessellation }

  if (diameter !== undefined) {
    cylinderOptions.diameter = diameter
  }

  if (diameterBottom !== undefined) {
    cylinderOptions.diameterBottom = diameterBottom
  }

  if (diameterTop !== undefined) {
    cylinderOptions.diameterTop = diameterTop
  }

  const mesh = MeshBuilder.CreateCylinder(
    name,
    cylinderOptions,
    scene,
  )

  if (position) {
    mesh.position.set(position[0], position[1], position[2])
  }

  if (rotation) {
    mesh.rotation.set(rotation[0], rotation[1], rotation[2])
  }

  return attachArmorMesh(mesh, parent, material, materialRole)
}

export function createArmorEdgeCaps(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  namePrefix: string,
  width: number,
  depth: number,
  y: number,
  thickness: number,
): void {
  createArmorBox({
    scene,
    parent,
    material: materials.trim,
    name: `${namePrefix}-front-edge-cap`,
    width,
    height: thickness,
    depth: thickness,
    position: [0, y, depth * 0.5],
    materialRole: 'trim',
  })
  createArmorBox({
    scene,
    parent,
    material: materials.trim,
    name: `${namePrefix}-rear-edge-cap`,
    width,
    height: thickness,
    depth: thickness,
    position: [0, y, -depth * 0.5],
    materialRole: 'trim',
  })
  createArmorBox({
    scene,
    parent,
    material: materials.trim,
    name: `${namePrefix}-left-edge-cap`,
    width: thickness,
    height: thickness,
    depth,
    position: [-width * 0.5, y, 0],
    materialRole: 'trim',
  })
  createArmorBox({
    scene,
    parent,
    material: materials.trim,
    name: `${namePrefix}-right-edge-cap`,
    width: thickness,
    height: thickness,
    depth,
    position: [width * 0.5, y, 0],
    materialRole: 'trim',
  })
}

export function createArmorCornerFasteners(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  namePrefix: string,
  width: number,
  depth: number,
  y: number,
  diameter: number,
): void {
  let index = 0

  for (const x of [-width * 0.38, width * 0.38]) {
    for (const z of [-depth * 0.38, depth * 0.38]) {
      createArmorCylinder({
        scene,
        parent,
        material: materials.steel,
        name: `${namePrefix}-recessed-bolt-${index}`,
        height: Math.max(diameter * 0.38, 0.014),
        diameter,
        tessellation: 8,
        position: [x, y, z],
        materialRole: 'trim',
      })
      index += 1
    }
  }
}

export function createArmorScrapeMarks(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  namePrefix: string,
  width: number,
  depth: number,
  y: number,
): void {
  const scrapeDepth = Math.max(depth * 0.028, 0.018)
  const scrapeHeight = 0.012
  const scrapes: Array<[number, number, number, number]> = [
    [-0.22, 0.18, -0.22, -0.22],
    [0.16, -0.08, 0.18, 0.16],
    [0.02, 0.32, -0.08, 0.34],
  ]

  scrapes.forEach(([xScale, zScale, rotation, lengthScale], index) => {
    createArmorBox({
      scene,
      parent,
      material: materials.steel,
      name: `${namePrefix}-bare-metal-scrape-${index}`,
      width: Math.max(width * Math.abs(lengthScale), 0.1),
      height: scrapeHeight,
      depth: scrapeDepth,
      position: [xScale * width, y, zScale * depth],
      rotation: [0, rotation, 0],
      materialRole: 'trim',
    })
  })
}
