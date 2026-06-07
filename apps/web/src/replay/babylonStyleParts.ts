import type { Material } from '@babylonjs/core/Materials/material'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import {
  attachMesh,
  createBoxDetail,
  createRampBlock,
  createSolidBlock,
} from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'

export function createStylePart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  partId: string,
  materials: TeamMaterialSet,
): void {
  if (partId === 'Style_Flag') {
    createFlagPart(scene, parent, material, role, blockId)
    return
  }

  if (partId.includes('Wings')) {
    createWingAssemblyPart(scene, parent, material, role, blockId, materials)
    return
  }

  if (partId.includes('DragonHead')) {
    createDragonHeadPart(scene, parent, material, role, blockId, materials)
    return
  }

  if (partId.includes('Spikes')) {
    const plate = MeshBuilder.CreateBox(
      `${role}-${blockId}-spike-plate`,
      { width: 0.62, height: 0.08, depth: 0.62 },
      scene,
    )
    attachMesh(plate, parent, material)

    for (let index = 0; index < 4; index += 1) {
      const spike = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-spike-${index}`,
        { height: 0.3, diameterTop: 0, diameterBottom: 0.08, tessellation: 8 },
        scene,
      )
      spike.rotation.z = Math.PI / 2
      spike.position.set(
        (index % 2 === 0 ? -0.2 : 0.2) + (index > 1 ? 0 : 0),
        0.2,
        (index < 2 ? -0.2 : 0.2),
      )
      attachMesh(spike, parent, materials.warning)
    }
    return
  }

  if (partId.includes('Neon')) {
    const strip = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-strip`,
      { width: 0.68, height: 0.1, depth: 0.12 },
      scene,
    )
    const topRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-top-rail`,
      { width: 0.56, height: 0.07, depth: 0.1 },
      scene,
    )
    const leftRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-left-rail`,
      { width: 0.07, height: 0.24, depth: 0.1 },
      scene,
    )
    const rightRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-right-rail`,
      { width: 0.07, height: 0.24, depth: 0.1 },
      scene,
    )
    topRail.position.set(0, 0.33, 0)
    leftRail.position.set(-0.34, 0.22, 0)
    rightRail.position.set(0.34, 0.22, 0)
    attachMesh(strip, parent, material)
    attachMesh(topRail, parent, materials.light)
    attachMesh(leftRail, parent, materials.light)
    attachMesh(rightRail, parent, materials.light)

    return
  }

  if (partId.includes('LightBar')) {
    const housing = MeshBuilder.CreateBox(
      `${role}-${blockId}-lightbar-housing`,
      { width: 0.78, height: 0.12, depth: 0.2 },
      scene,
    )
    const backRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-lightbar-back-rail`,
      { width: 0.82, height: 0.08, depth: 0.22 },
      scene,
    )
    const frontGlow = MeshBuilder.CreateBox(
      `${role}-${blockId}-lightbar-front-glow`,
      { width: 0.68, height: 0.055, depth: 0.035 },
      scene,
    )

    housing.position.y = 0.2
    backRail.position.y = 0.12
    frontGlow.position.set(0, 0.22, 0.12)
    attachMesh(housing, parent, materials.trim)
    attachMesh(backRail, parent, material)
    attachMesh(frontGlow, parent, materials.light)

    for (let index = 0; index < 6; index += 1) {
      const lens = MeshBuilder.CreateBox(
        `${role}-${blockId}-lightbar-lens-${index}`,
        { width: 0.085, height: 0.085, depth: 0.04 },
        scene,
      )
      const divider = MeshBuilder.CreateBox(
        `${role}-${blockId}-lightbar-divider-${index}`,
        { width: 0.018, height: 0.11, depth: 0.055 },
        scene,
      )

      lens.position.set(-0.29 + index * 0.116, 0.25, 0.105)
      divider.position.set(-0.345 + index * 0.116, 0.24, 0.105)
      attachMesh(lens, parent, materials.light)
      attachMesh(divider, parent, materials.steel)
    }

    for (let side = -1; side <= 1; side += 2) {
      const bracket = MeshBuilder.CreateBox(
        `${role}-${blockId}-lightbar-mount-bracket-${side}`,
        { width: 0.08, height: 0.18, depth: 0.16 },
        scene,
      )

      bracket.position.set(side * 0.46, 0.14, 0)
      attachMesh(bracket, parent, materials.steel)
    }

    return
  }

  if (partId.includes('Crown')) {
    createCrownPart(scene, parent, material, role, blockId, materials)
    return
  }

  if (partId.includes('TrashCan')) {
    const shell = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-trash-shell`,
      {
        height: 0.52,
        diameter: 0.36,
        tessellation: 12,
      },
      scene,
    )
    const lid = MeshBuilder.CreateBox(
      `${role}-${blockId}-trash-lid`,
      { width: 0.24, height: 0.08, depth: 0.46 },
      scene,
    )
    const handle = MeshBuilder.CreateTorus(
      `${role}-${blockId}-trash-handle`,
      { diameter: 0.18, thickness: 0.025, tessellation: 12 },
      scene,
    )
    lid.position.set(0, 0.32, 0)
    handle.position.set(0, 0.42, 0)
    handle.rotation.x = Math.PI / 2
    shell.rotation.z = Math.PI / 2
    attachMesh(shell, parent, material)
    attachMesh(lid, parent, materials.trim)
    attachMesh(handle, parent, materials.steel)

    for (let index = -2; index <= 2; index += 1) {
      const rib = MeshBuilder.CreateBox(
        `${role}-${blockId}-trash-rib-${index + 2}`,
        { width: 0.025, height: 0.54, depth: 0.035 },
        scene,
      )

      rib.position.set(index * 0.07, 0.02, 0.19)
      attachMesh(rib, parent, materials.trim)
    }

    return
  }

  createSolidBlock(scene, parent, material, `${role}-${blockId}-style`, 0.5, 0.3, 0.5)
}

function createDragonHeadPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  const neckMount = createRampBlock(scene, `${role}-${blockId}-dragon-neck-armor-base`, 0.5, 0.18, 0.44, 0.06)
  const skullTop = createExtrudedPlateFromOutline(
    scene,
    `${role}-${blockId}-dragon-armored-skull`,
    [
      [-0.22, -0.26],
      [0.22, -0.22],
      [0.28, 0.08],
      [0.2, 0.42],
      [0.08, 0.68],
      [-0.08, 0.68],
      [-0.2, 0.42],
      [-0.28, 0.08],
    ],
    0.055,
  )
  const snoutTop = createExtrudedPlateFromOutline(
    scene,
    `${role}-${blockId}-dragon-tapered-snout`,
    [
      [-0.14, 0.3],
      [0.14, 0.3],
      [0.1, 0.76],
      [0.02, 0.88],
      [-0.02, 0.88],
      [-0.1, 0.76],
    ],
    0.048,
  )

  neckMount.position.set(0, 0.12, -0.15)
  skullTop.position.y = 0.48
  snoutTop.position.y = 0.39
  attachMesh(neckMount, parent, materials.trim)
  attachMesh(skullTop, parent, materials.trim)
  attachMesh(snoutTop, parent, material)

  createBoxDetail(scene, parent, material, `${role}-${blockId}-dragon-team-scale-top`, 0.2, 0.035, 0.2, 0, 0.56, 0.08)
  createBoxDetail(scene, parent, material, `${role}-${blockId}-dragon-team-scale-snout`, 0.16, 0.03, 0.2, 0, 0.45, 0.5)
  createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-dragon-upper-jaw-rail`, 0.28, 0.045, 0.42, 0, 0.25, 0.6)
  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-dragon-lower-jaw-guard`, 0.24, 0.045, 0.44, 0, 0.12, 0.56)
  createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-dragon-brow-armored`, 0.34, 0.045, 0.055, 0, 0.43, 0.43)
  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-dragon-top-service-plate`, 0.22, 0.032, 0.22, 0, 0.61, -0.05)

  for (const side of [-1, 1]) {
    const sidePlate = createExtrudedVerticalPlateFromOutline(
      scene,
      `${role}-${blockId}-dragon-cyber-side-profile-${side}`,
      [
        [-0.3, 0.12],
        [-0.18, 0.38],
        [0.02, 0.52],
        [0.36, 0.5],
        [0.78, 0.34],
        [0.88, 0.23],
        [0.58, 0.2],
        [0.34, 0.08],
        [0.02, 0.08],
      ],
      0.035,
    )
    const lowerJawPlate = createExtrudedVerticalPlateFromOutline(
      scene,
      `${role}-${blockId}-dragon-open-lower-jaw-plate-${side}`,
      [
        [0.24, 0.08],
        [0.72, 0.11],
        [0.86, 0.18],
        [0.52, 0.03],
        [0.18, 0.03],
      ],
      0.028,
    )
    const eye = MeshBuilder.CreateBox(
      `${role}-${blockId}-dragon-glowing-eye-slit-${side}`,
      { width: 0.028, height: 0.036, depth: 0.15 },
      scene,
    )
    const horn = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-swept-horn-${side}`,
      { height: 0.48, diameterTop: 0.012, diameterBottom: 0.078, tessellation: 10 },
      scene,
    )
    const sideFin = createExtrudedVerticalPlateFromOutline(
      scene,
      `${role}-${blockId}-dragon-rear-swept-fin-${side}`,
      [
        [-0.22, 0.4],
        [0.0, 0.72],
        [0.2, 0.48],
      ],
      0.026,
    )
    const hornSocket = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-horn-socket-${side}`,
      { height: 0.045, diameter: 0.1, tessellation: 12 },
      scene,
    )
    const sideGear = MeshBuilder.CreateTorus(
      `${role}-${blockId}-dragon-side-gear-ring-${side}`,
      { diameter: 0.16, thickness: 0.018, tessellation: 16 },
      scene,
    )
    const nostril = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-nostril-port-${side}`,
      { height: 0.085, diameter: 0.026, tessellation: 8 },
      scene,
    )

    sidePlate.position.x = side * 0.2
    lowerJawPlate.position.x = side * 0.17
    eye.position.set(side * 0.22, 0.36, 0.42)
    eye.rotation.y = side * 0.18
    horn.position.set(side * 0.16, 0.67, -0.08)
    horn.rotation.x = -0.72
    horn.rotation.z = side * 0.2
    sideFin.position.x = side * 0.27
    sideFin.position.z = -0.14
    hornSocket.position.set(side * 0.16, 0.51, -0.02)
    sideGear.position.set(side * 0.25, 0.28, -0.08)
    sideGear.rotation.y = Math.PI / 2
    nostril.position.set(side * 0.09, 0.25, 0.78)
    nostril.rotation.x = Math.PI / 2

    attachMesh(sidePlate, parent, materials.trim)
    attachMesh(lowerJawPlate, parent, materials.trim)
    attachMesh(eye, parent, materials.light)
    attachMesh(horn, parent, materials.steel)
    attachMesh(sideFin, parent, material)
    attachMesh(hornSocket, parent, material)
    attachMesh(sideGear, parent, materials.steel)
    attachMesh(nostril, parent, materials.steel)
  }

  for (let index = -3; index <= 3; index += 1) {
    const tooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-jaw-tooth-${index + 3}`,
      { height: 0.085, diameterTop: 0, diameterBottom: 0.026, tessellation: 7 },
      scene,
    )
    const lowerTooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-lower-jaw-tooth-${index + 3}`,
      { height: 0.07, diameterTop: 0, diameterBottom: 0.022, tessellation: 7 },
      scene,
    )

    tooth.position.set(index * 0.035, 0.18, 0.72 - Math.abs(index) * 0.018)
    tooth.rotation.x = Math.PI
    lowerTooth.position.set(index * 0.032, 0.11, 0.58 - Math.abs(index) * 0.014)
    attachMesh(tooth, parent, materials.steel)
    attachMesh(lowerTooth, parent, materials.steel)
  }

  for (let index = 0; index < 4; index += 1) {
    const crest = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-spine-crest-${index}`,
      { height: 0.14 - index * 0.02, diameterTop: 0, diameterBottom: 0.046, tessellation: 7 },
      scene,
    )

    crest.position.set(0, 0.66 - index * 0.045, -0.24 + index * 0.12)
    crest.rotation.x = -0.36
    attachMesh(crest, parent, materials.steel)
  }

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-dragon-neck-fastener-${index + 1}`, 0.045, 0.025, 0.045, index * 0.13, 0.23, -0.18)
  }
}

function createWingAssemblyPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-wing-center-keel`, 0.34, 0.14, 0.76, 0, 0.18, 0)
  createBoxDetail(scene, parent, material, `${role}-${blockId}-wing-service-cover`, 0.24, 0.055, 0.48, 0, 0.31, 0)

  for (const side of [-1, 1]) {
    const wingPlate = createExtrudedPlateFromOutline(
      scene,
      `${role}-${blockId}-swept-wing-panel-${side}`,
      [
        [side * 0.12, -0.24],
        [side * 0.74, -0.38],
        [side * 0.94, -0.07],
        [side * 0.72, 0.28],
        [side * 0.24, 0.36],
        [side * 0.04, 0.12],
      ],
      0.045,
    )
    const hinge = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-wing-root-hinge-${side}`,
      { height: 0.42, diameter: 0.06, tessellation: 12 },
      scene,
    )
    const tipMarker = MeshBuilder.CreateSphere(
      `${role}-${blockId}-wingtip-marker-light-${side}`,
      { diameter: 0.055, segments: 10 },
      scene,
    )

    wingPlate.position.y = 0.3
    hinge.position.set(side * 0.18, 0.28, 0)
    hinge.rotation.x = Math.PI / 2
    tipMarker.position.set(side * 0.9, 0.34, -0.06)
    tipMarker.metadata = { kind: 'pulse', speed: 0.012 }

    attachMesh(wingPlate, parent, material)
    attachMesh(hinge, parent, materials.steel)
    attachMesh(tipMarker, parent, materials.light)

    for (let index = 0; index < 3; index += 1) {
      const rib = MeshBuilder.CreateBox(
        `${role}-${blockId}-wing-rib-${side}-${index}`,
        { width: 0.028, height: 0.035, depth: 0.48 - index * 0.07 },
        scene,
      )

      rib.position.set(side * (0.32 + index * 0.17), 0.34, 0.02 - index * 0.04)
      rib.rotation.y = side * -0.22
      attachMesh(rib, parent, materials.steel)
    }

    for (const z of [-0.22, 0.22]) {
      const spar = MeshBuilder.CreateBox(
        `${role}-${blockId}-wing-long-spar-${side}-${z > 0 ? 'rear' : 'front'}`,
        { width: 0.58, height: 0.035, depth: 0.028 },
        scene,
      )

      spar.position.set(side * 0.48, 0.37, z)
      spar.rotation.y = side * 0.16
      attachMesh(spar, parent, materials.trim)
    }
  }

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-wing-keel-fastener-${index + 1}`, 0.055, 0.025, 0.055, 0, 0.39, index * 0.18)
  }
}

function createCrownPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  materials: TeamMaterialSet,
): void {
  const basePlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-crown-bolted-base-plate`,
    { width: 0.74, height: 0.08, depth: 0.58 },
    scene,
  )
  const outerBand = MeshBuilder.CreateTorus(
    `${role}-${blockId}-crown-machined-band`,
    { diameter: 0.58, thickness: 0.05, tessellation: 32 },
    scene,
  )
  const innerRim = MeshBuilder.CreateTorus(
    `${role}-${blockId}-crown-inner-rim`,
    { diameter: 0.44, thickness: 0.022, tessellation: 28 },
    scene,
  )

  basePlate.position.y = 0.1
  outerBand.position.y = 0.24
  outerBand.rotation.x = Math.PI / 2
  outerBand.scaling.z = 0.72
  innerRim.position.y = 0.27
  innerRim.rotation.x = Math.PI / 2
  innerRim.scaling.z = 0.62
  attachMesh(basePlate, parent, materials.trim)
  attachMesh(outerBand, parent, materials.warning)
  attachMesh(innerRim, parent, materials.steel)

  for (let index = 0; index < 7; index += 1) {
    const angle = (Math.PI * 2 * index) / 7
    const radiusX = 0.29
    const radiusZ = 0.2
    const toothHeight = index % 2 === 0 ? 0.25 : 0.18
    const tooth = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-crown-seated-tooth-${index}`,
      {
        height: toothHeight,
        diameterTop: 0.03,
        diameterBottom: 0.082,
        tessellation: 6,
      },
      scene,
    )
    const socket = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-crown-tooth-socket-${index}`,
      { height: 0.04, diameter: 0.1, tessellation: 10 },
      scene,
    )
    const jewel = MeshBuilder.CreateSphere(
      `${role}-${blockId}-crown-inset-jewel-${index}`,
      { diameter: 0.036, segments: 8 },
      scene,
    )

    tooth.position.set(Math.sin(angle) * radiusX, 0.36 + toothHeight * 0.18, Math.cos(angle) * radiusZ)
    tooth.rotation.z = -Math.sin(angle) * 0.16
    socket.position.set(Math.sin(angle) * radiusX, 0.27, Math.cos(angle) * radiusZ)
    jewel.position.set(Math.sin(angle) * (radiusX + 0.018), 0.36, Math.cos(angle) * (radiusZ + 0.012))
    attachMesh(tooth, parent, materials.warning)
    attachMesh(socket, parent, materials.steel)
    attachMesh(jewel, parent, materials.light)
  }

  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.2, 0.2]) {
      const bolt = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-crown-base-bolt-${x}-${z}`,
        { height: 0.025, diameter: 0.045, tessellation: 10 },
        scene,
      )

      bolt.position.set(x, 0.155, z)
      attachMesh(bolt, parent, materials.steel)
    }
  }

  createBoxDetail(scene, parent, material, `${role}-${blockId}-crown-front-team-plate`, 0.22, 0.035, 0.04, 0, 0.18, 0.31)
}

function createExtrudedPlateFromOutline(
  scene: Scene,
  name: string,
  outline: [number, number][],
  thickness: number,
): Mesh {
  const mesh = new Mesh(name, scene)
  const halfThickness = thickness / 2
  const positions: number[] = []
  const indices: number[] = []

  outline.forEach(([x, z]) => positions.push(x, halfThickness, z))
  outline.forEach(([x, z]) => positions.push(x, -halfThickness, z))

  for (let index = 1; index < outline.length - 1; index += 1) {
    indices.push(0, index, index + 1)
    indices.push(outline.length, outline.length + index + 1, outline.length + index)
  }

  for (let index = 0; index < outline.length; index += 1) {
    const next = (index + 1) % outline.length

    indices.push(index, next, outline.length + next)
    indices.push(index, outline.length + next, outline.length + index)
  }

  const normals: number[] = []
  const vertexData = new VertexData()

  VertexData.ComputeNormals(positions, indices, normals)
  vertexData.positions = positions
  vertexData.indices = indices
  vertexData.normals = normals
  vertexData.applyToMesh(mesh)

  return mesh
}

function createExtrudedVerticalPlateFromOutline(
  scene: Scene,
  name: string,
  outline: [number, number][],
  thickness: number,
): Mesh {
  const mesh = new Mesh(name, scene)
  const halfThickness = thickness / 2
  const positions: number[] = []
  const indices: number[] = []

  outline.forEach(([z, y]) => positions.push(halfThickness, y, z))
  outline.forEach(([z, y]) => positions.push(-halfThickness, y, z))

  for (let index = 1; index < outline.length - 1; index += 1) {
    indices.push(0, index, index + 1)
    indices.push(outline.length, outline.length + index + 1, outline.length + index)
  }

  for (let index = 0; index < outline.length; index += 1) {
    const next = (index + 1) % outline.length

    indices.push(index, outline.length + next, next)
    indices.push(index, outline.length + index, outline.length + next)
  }

  const normals: number[] = []
  const vertexData = new VertexData()

  VertexData.ComputeNormals(positions, indices, normals)
  vertexData.positions = positions
  vertexData.indices = indices
  vertexData.normals = normals
  vertexData.applyToMesh(mesh)

  return mesh
}

function createFlagPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
): void {
  const pole = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-pole`,
    { height: 0.9, diameter: 0.07, tessellation: 10 },
    scene,
  )
  const flag = MeshBuilder.CreatePlane(
    `${role}-${blockId}-flag`,
    { width: 0.46, height: 0.26 },
    scene,
  )
  const base = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-base`,
    { height: 0.08, diameter: 0.22, tessellation: 12 },
    scene,
  )
  const crossbar = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flag-crossbar`,
    { height: 0.48, diameter: 0.025, tessellation: 8 },
    scene,
  )
  const emblem = MeshBuilder.CreateBox(
    `${role}-${blockId}-flag-emblem`,
    { width: 0.16, height: 0.045, depth: 0.035 },
    scene,
  )

  pole.rotation.z = Math.PI / 2
  flag.rotation.z = Math.PI / 2
  base.rotation.z = Math.PI / 2
  crossbar.rotation.z = Math.PI / 2
  pole.position.y = 0.15
  flag.position.set(0.24, 0.56, 0)
  crossbar.position.set(0.24, 0.66, 0)
  emblem.position.set(0.24, 0.56, 0.02)

  attachMesh(base, parent, material)
  attachMesh(pole, parent, material)
  attachMesh(flag, parent, material)
  attachMesh(crossbar, parent, material)
  attachMesh(emblem, parent, material)
}
