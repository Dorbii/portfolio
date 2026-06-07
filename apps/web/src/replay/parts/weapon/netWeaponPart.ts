import type { Material } from '@babylonjs/core/Materials/material'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { Scene } from '@babylonjs/core/scene'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

type NetMeshOptions = {
  material: Material
  name: string
  parent: WeaponPartRenderArgs['parent']
  scene: Scene
  x: number
  y: number
  z: number
}

export function createNetWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const bodyY = Math.max(height * 0.24, 0.2)
  const receiverWidth = Math.max(width * 0.76, 0.44)
  const receiverDepth = Math.max(depth * 0.62, 0.36)
  const barrelLength = Math.max(depth * 0.96, 0.56)
  const cageLength = Math.max(depth * 0.48, 0.32)
  const muzzleZ = Math.max(depth * 0.46, 0.32)

  createBox(
    {
      scene,
      parent,
      material: materials.trim,
      name: `${role}-${blockId}-net-folded-cartridge`,
      x: 0,
      y: bodyY - Math.max(height * 0.18, 0.1),
      z: -Math.max(depth * 0.04, 0.02),
    },
    receiverWidth,
    Math.max(height * 0.18, 0.1),
    receiverDepth,
  )
  createBox(
    {
      scene,
      parent,
      material,
      name: `${role}-${blockId}-net-receiver-cover`,
      x: 0,
      y: bodyY - Math.max(height * 0.03, 0.02),
      z: -Math.max(depth * 0.1, 0.06),
    },
    Math.max(width * 0.58, 0.34),
    Math.max(height * 0.18, 0.1),
    Math.max(depth * 0.4, 0.24),
  )
  createBox(
    {
      scene,
      parent,
      material: materials.rubber,
      name: `${role}-${blockId}-net-receiver-recess`,
      x: 0,
      y: bodyY + Math.max(height * 0.08, 0.05),
      z: -Math.max(depth * 0.22, 0.13),
    },
    Math.max(width * 0.46, 0.27),
    0.026,
    Math.max(depth * 0.2, 0.12),
  )

  createZCylinder(
    {
      scene,
      parent,
      material,
      name: `${role}-${blockId}-net-launcher-barrel`,
      x: 0,
      y: bodyY + Math.max(height * 0.1, 0.06),
      z: Math.max(depth * 0.05, 0.03),
    },
    Math.max(width * 0.36, 0.24),
    barrelLength,
    24,
  )
  createZCylinder(
    {
      scene,
      parent,
      material: materials.trim,
      name: `${role}-${blockId}-net-pressure-chamber`,
      x: 0,
      y: bodyY + Math.max(height * 0.1, 0.06),
      z: -Math.max(depth * 0.34, 0.2),
    },
    Math.max(width * 0.48, 0.3),
    Math.max(depth * 0.32, 0.2),
    20,
  )
  createZCylinder(
    {
      scene,
      parent,
      material: materials.rubber,
      name: `${role}-${blockId}-net-dark-bore`,
      x: 0,
      y: bodyY + Math.max(height * 0.1, 0.06),
      z: muzzleZ + Math.max(depth * 0.1, 0.06),
    },
    Math.max(width * 0.22, 0.14),
    0.036,
    18,
  )
  createZCylinder(
    {
      scene,
      parent,
      material: materials.weapon,
      name: `${role}-${blockId}-net-muzzle-bell`,
      x: 0,
      y: bodyY + Math.max(height * 0.1, 0.06),
      z: muzzleZ,
    },
    Math.max(width * 0.56, 0.36),
    Math.max(depth * 0.18, 0.12),
    24,
  )
  createZRing(
    {
      scene,
      parent,
      material: materials.steel,
      name: `${role}-${blockId}-net-front-muzzle-ring`,
      x: 0,
      y: bodyY + Math.max(height * 0.1, 0.06),
      z: muzzleZ + Math.max(depth * 0.11, 0.07),
    },
    Math.max(width * 0.62, 0.38),
    0.035,
  )

  const cageCenterZ = muzzleZ - Math.max(depth * 0.13, 0.08)
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2
    const railX = Math.cos(angle) * Math.max(width * 0.28, 0.17)
    const railY = bodyY + Math.max(height * 0.1, 0.06) + Math.sin(angle) * Math.max(height * 0.18, 0.1)

    createZCylinder(
      {
        scene,
        parent,
        material: materials.steel,
        name: `${role}-${blockId}-net-ribbed-cage-rail-${index}`,
        x: railX,
        y: railY,
        z: cageCenterZ,
      },
      0.022,
      cageLength,
      8,
    )
  }

  for (let index = 0; index < 4; index += 1) {
    createZRing(
      {
        scene,
        parent,
        material: index === 0 ? materials.warning : materials.trim,
        name: `${role}-${blockId}-net-ribbed-cage-band-${index}`,
        x: 0,
        y: bodyY + Math.max(height * 0.1, 0.06),
        z: cageCenterZ - cageLength * 0.42 + index * cageLength * 0.28,
      },
      Math.max(width * 0.58, 0.36),
      0.026,
    )
  }

  for (let side = -1; side <= 1; side += 2) {
    createZCylinder(
      {
        scene,
        parent,
        material: materials.utility,
        name: `${role}-${blockId}-net-side-pressure-bottle-${side}`,
        x: side * Math.max(width * 0.34, 0.22),
        y: bodyY - Math.max(height * 0.02, 0.01),
        z: -Math.max(depth * 0.1, 0.06),
      },
      Math.max(width * 0.15, 0.1),
      Math.max(depth * 0.6, 0.36),
      16,
    )
    createZCylinder(
      {
        scene,
        parent,
        material: materials.rubber,
        name: `${role}-${blockId}-net-bottle-rear-cap-${side}`,
        x: side * Math.max(width * 0.34, 0.22),
        y: bodyY - Math.max(height * 0.02, 0.01),
        z: -Math.max(depth * 0.42, 0.25),
      },
      Math.max(width * 0.17, 0.11),
      0.04,
      14,
    )
    createZCylinder(
      {
        scene,
        parent,
        material: materials.steel,
        name: `${role}-${blockId}-net-feed-pipe-${side}`,
        x: side * Math.max(width * 0.2, 0.13),
        y: bodyY + Math.max(height * 0.2, 0.11),
        z: -Math.max(depth * 0.08, 0.05),
      },
      0.02,
      Math.max(depth * 0.68, 0.4),
      8,
    )
    createBox(
      {
        scene,
        parent,
        material: materials.warning,
        name: `${role}-${blockId}-net-bottle-clamp-front-${side}`,
        x: side * Math.max(width * 0.34, 0.22),
        y: bodyY + Math.max(height * 0.08, 0.05),
        z: Math.max(depth * 0.16, 0.1),
      },
      Math.max(width * 0.17, 0.1),
      0.038,
      0.05,
    )
    createBox(
      {
        scene,
        parent,
        material: materials.warning,
        name: `${role}-${blockId}-net-bottle-clamp-rear-${side}`,
        x: side * Math.max(width * 0.34, 0.22),
        y: bodyY + Math.max(height * 0.08, 0.05),
        z: -Math.max(depth * 0.28, 0.17),
      },
      Math.max(width * 0.17, 0.1),
      0.038,
      0.05,
    )
  }

  createZCylinder(
    {
      scene,
      parent,
      material: materials.steel,
      name: `${role}-${blockId}-net-top-guide-rail`,
      x: 0,
      y: bodyY + Math.max(height * 0.38, 0.2),
      z: Math.max(depth * 0.02, 0.01),
    },
    0.032,
    Math.max(depth * 1.08, 0.62),
    12,
  )

  for (let index = 0; index < 3; index += 1) {
    const z = -Math.max(depth * 0.26, 0.16) + index * Math.max(depth * 0.24, 0.14)
    createBox(
      {
        scene,
        parent,
        material: materials.steel,
        name: `${role}-${blockId}-net-guide-rail-clamp-${index}`,
        x: 0,
        y: bodyY + Math.max(height * 0.28, 0.16),
        z,
      },
      Math.max(width * 0.22, 0.14),
      Math.max(height * 0.1, 0.06),
      0.04,
    )
  }

  for (let index = 0; index < 4; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const row = Math.floor(index / 2)
    const vial = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-net-pressure-vial-${index}`,
      {
        height: Math.max(height * 0.18, 0.1),
        diameter: Math.max(width * 0.09, 0.055),
        tessellation: 12,
      },
      scene,
    )
    vial.position.set(
      side * Math.max(width * 0.18, 0.11),
      bodyY + Math.max(height * 0.36, 0.2),
      -Math.max(depth * 0.2, 0.12) + row * Math.max(depth * 0.28, 0.17),
    )
    attachMesh(vial, parent, materials.circuit)

    createCylinder(
      {
        scene,
        parent,
        material: materials.steel,
        name: `${role}-${blockId}-net-vial-cap-${index}`,
        x: vial.position.x,
        y: vial.position.y + Math.max(height * 0.1, 0.06),
        z: vial.position.z,
      },
      Math.max(width * 0.08, 0.048),
      0.026,
      10,
    )
  }

  for (let index = 0; index < 5; index += 1) {
    createXWire(
      {
        scene,
        parent,
        material: index % 2 === 0 ? materials.steel : materials.warning,
        name: `${role}-${blockId}-net-folded-payload-cable-${index}`,
        x: 0,
        y: bodyY - Math.max(height * 0.14, 0.08) + index * 0.02,
        z: Math.max(depth * 0.12, 0.07),
      },
      Math.max(width * 0.58, 0.34),
      0.014,
    )
  }

  for (let index = 0; index < 8; index += 1) {
    const side = index % 2 === 0 ? -1 : 1
    const row = Math.floor(index / 2)
    createCylinder(
      {
        scene,
        parent,
        material: materials.steel,
        name: `${role}-${blockId}-net-receiver-bolt-${index}`,
        x: side * Math.max(width * 0.34, 0.2),
        y: bodyY + Math.max(height * 0.12, 0.07),
        z: -Math.max(depth * 0.34, 0.2) + row * Math.max(depth * 0.18, 0.1),
      },
      0.034,
      0.018,
      10,
    )
  }
}

function createBox(options: NetMeshOptions, width: number, height: number, depth: number): Mesh {
  const mesh = MeshBuilder.CreateBox(options.name, { width, height, depth }, options.scene)

  mesh.position.set(options.x, options.y, options.z)
  attachMesh(mesh, options.parent, options.material)

  return mesh
}

function createCylinder(options: NetMeshOptions, diameter: number, height: number, tessellation: number): Mesh {
  const mesh = MeshBuilder.CreateCylinder(
    options.name,
    {
      height,
      diameter,
      tessellation,
    },
    options.scene,
  )

  mesh.position.set(options.x, options.y, options.z)
  attachMesh(mesh, options.parent, options.material)

  return mesh
}

function createZCylinder(options: NetMeshOptions, diameter: number, length: number, tessellation: number): Mesh {
  const mesh = createCylinder(options, diameter, length, tessellation)

  mesh.rotation.x = Math.PI / 2

  return mesh
}

function createXWire(options: NetMeshOptions, length: number, diameter: number): Mesh {
  const mesh = createCylinder(options, diameter, length, 8)

  mesh.rotation.z = Math.PI / 2

  return mesh
}

function createZRing(options: NetMeshOptions, diameter: number, thickness: number): Mesh {
  const mesh = MeshBuilder.CreateTorus(
    options.name,
    {
      diameter,
      thickness,
      tessellation: 24,
    },
    options.scene,
  )

  mesh.rotation.x = Math.PI / 2
  mesh.position.set(options.x, options.y, options.z)
  attachMesh(mesh, options.parent, options.material)

  return mesh
}
