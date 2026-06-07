import { PointLight } from '@babylonjs/core/Lights/pointLight'
import type { Material } from '@babylonjs/core/Materials/material'
import { PBRMetallicRoughnessMaterial } from '@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import {
  createPbrSurfaceTextures,
  type SurfacePattern,
} from '../replay/rendering/surfaceTextures'
import type { AssemblyResources } from './botAssemblyAnimation'

const ROOM_WIDTH = 10.8
const ROOM_DEPTH = 7.4
const BACK_WALL_Z = 3.55
const SIDE_WALL_X = 5.32

type AssemblyMaterials = ReturnType<typeof createAssemblyMaterials>

export function createAssemblyRoom(scene: Scene, role: TeamRole): AssemblyResources['rig'] {
  const materials = createAssemblyMaterials(scene)
  const roomMeshStart = scene.meshes.length

  createGarageShell(scene, materials)
  createWallWorkArea(scene, materials)
  createLiftBay(scene, materials)
  const rig = createOverheadGantry(scene, role, materials)
  createSideRobotArms(scene, rig, materials)
  createPartsCarts(scene, materials)
  createGarageClutter(scene, materials)
  const sparks = createWeldingSparks(scene, materials)
  mergeStaticAssemblyRoomMeshes(scene, roomMeshStart, [
    ...dynamicRigMeshes(rig),
    ...sparks.map((spark) => spark.mesh),
  ])

  return {
    ...rig,
    sparks,
  }
}

function dynamicRigMeshes(rig: Omit<AssemblyResources['rig'], 'sparks'>): AbstractMesh[] {
  return [
    rig.trolley,
    rig.hoistCable,
    rig.suspendedPanel,
    rig.leftArm,
    rig.rightArm,
    rig.leftToolHead,
    rig.rightToolHead,
    rig.leftClamp,
    rig.rightClamp,
    rig.clampRing,
  ]
}

function mergeStaticAssemblyRoomMeshes(
  scene: Scene,
  roomMeshStart: number,
  dynamicMeshes: AbstractMesh[],
): void {
  const dynamicSet = new Set(dynamicMeshes)
  const groups = new Map<string, { material: AbstractMesh['material']; meshes: Mesh[] }>()

  scene.meshes.slice(roomMeshStart).forEach((mesh) => {
    if (!(mesh instanceof Mesh) || dynamicSet.has(mesh)) {
      return
    }

    const key = mesh.material?.id ?? 'unmaterialed'
    const group = groups.get(key) ?? {
      material: mesh.material,
      meshes: [],
    }

    group.meshes.push(mesh)
    groups.set(key, group)
  })

  groups.forEach(({ material, meshes }, key) => {
    if (meshes.length < 2) {
      return
    }

    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, true)

    if (merged) {
      merged.name = `assembly-static-${key}`
      merged.material = material
    }
  })
}

function createAssemblyMaterials(scene: Scene) {
  return {
    floor: createAssemblyMaterial(scene, 'assembly-floor-mat', '#161d22', '#010203', 1, 0.48, 0.68, 'arena_floor'),
    deck: createAssemblyMaterial(scene, 'assembly-deck-mat', '#252f35', '#06080b', 1, 0.62, 0.5, 'arena_floor'),
    wall: createAssemblyMaterial(scene, 'assembly-wall-mat', '#202830', '#050608', 1, 0.3, 0.72, 'panel'),
    rail: createAssemblyMaterial(scene, 'assembly-rail-mat', '#3a4650', '#06080c', 1, 0.72, 0.42),
    trim: createAssemblyMaterial(scene, 'assembly-trim-mat', '#080a0d', '#010101', 1, 0.55, 0.48, 'trim'),
    detail: createAssemblyMaterial(scene, 'assembly-detail-mat', '#566675', '#14191d', 1, 0.6, 0.38),
    crate: createAssemblyMaterial(scene, 'assembly-crate-mat', '#6f5638', '#140d05', 1, 0.16, 0.78, 'trim'),
    crateBand: createAssemblyMaterial(scene, 'assembly-crate-band-mat', '#2c2117', '#050301', 1, 0.32, 0.62, 'trim'),
    crateLabel: createAssemblyMaterial(scene, 'assembly-crate-label-mat', '#d7c383', '#352306', 1, 0.08, 0.58),
    industrialArm: createAssemblyMaterial(scene, 'assembly-industrial-arm-mat', '#b77724', '#1e0d02', 1, 0.58, 0.44, 'warning'),
    rubber: createAssemblyMaterial(scene, 'assembly-rubber-mat', '#08090a', '#000000', 1, 0.04, 0.82, 'rubber'),
    diagnostic: createAssemblyMaterial(scene, 'assembly-diagnostic-mat', '#4dd48c', '#65ffb2', 0.88, 0.08, 0.32),
    primerPanel: createAssemblyMaterial(scene, 'assembly-primer-panel-mat', '#66717c', '#10161b', 1, 0.42, 0.58, 'panel'),
    workLight: createAssemblyMaterial(scene, 'assembly-work-light-mat', '#fff3c4', '#ffcf6d', 0.9, 0.02, 0.18),
    toolHead: createAssemblyMaterial(scene, 'assembly-tool-head-mat', '#b7c9d6', '#262f38', 1, 0.7, 0.28, 'weapon'),
    warning: createAssemblyMaterial(scene, 'assembly-warning-mat', '#d4ae42', '#2e2105', 1, 0.44, 0.46, 'warning'),
    spark: createAssemblyMaterial(scene, 'assembly-spark-mat', '#ffe8a3', '#ffba32', 0.92, 0.02, 0.12),
    glass: createAssemblyMaterial(scene, 'assembly-glass-mat', '#9ac5d6', '#153243', 0.42, 0.02, 0.16),
    copper: createAssemblyMaterial(scene, 'assembly-copper-mat', '#b46a33', '#3a1204', 1, 0.8, 0.36),
    pcb: createAssemblyMaterial(scene, 'assembly-pcb-mat', '#245b43', '#63ffad', 1, 0.22, 0.54),
  }
}

function createGarageShell(scene: Scene, materials: AssemblyMaterials): void {
  const floor = MeshBuilder.CreateBox('assembly-shell-floor', { width: ROOM_WIDTH, height: 0.14, depth: ROOM_DEPTH }, scene)
  floor.position.y = -0.13
  floor.material = materials.floor

  const bayDeck = MeshBuilder.CreateBox('assembly-service-deck', { width: 6.9, height: 0.11, depth: 4.55 }, scene)
  bayDeck.position.set(0, -0.02, -0.25)
  bayDeck.material = materials.deck

  const backWall = MeshBuilder.CreateBox('assembly-back-wall', { width: ROOM_WIDTH, height: 3.25, depth: 0.16 }, scene)
  backWall.position.set(0, 1.45, BACK_WALL_Z)
  backWall.material = materials.wall

  for (const side of [-1, 1]) {
    const sideWall = MeshBuilder.CreateBox(`assembly-side-wall-${side}`, { width: 0.16, height: 3.05, depth: ROOM_DEPTH }, scene)
    const sideCurb = MeshBuilder.CreateBox(`assembly-side-curb-${side}`, { width: 0.28, height: 0.26, depth: ROOM_DEPTH }, scene)

    sideWall.position.set(side * SIDE_WALL_X, 1.35, -0.15)
    sideCurb.position.set(side * SIDE_WALL_X, 0.02, -0.15)
    sideWall.material = materials.wall
    sideCurb.material = materials.trim
  }

  for (let index = 0; index < 9; index += 1) {
    const seam = MeshBuilder.CreateBox(`assembly-floor-plate-seam-x-${index}`, { width: 0.045, height: 0.012, depth: 4.55 }, scene)

    seam.position.set(-3.2 + index * 0.8, 0.045, -0.25)
    seam.material = materials.trim
  }

  for (let index = 0; index < 6; index += 1) {
    const seam = MeshBuilder.CreateBox(`assembly-floor-plate-seam-z-${index}`, { width: 6.9, height: 0.012, depth: 0.045 }, scene)

    seam.position.set(0, 0.048, -2.25 + index * 0.82)
    seam.material = materials.trim
  }

  for (let index = 0; index < 14; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(`assembly-floor-anchor-bolt-${index}`, { height: 0.026, diameter: 0.09, tessellation: 8 }, scene)
    const side = index % 2 === 0 ? -1 : 1

    bolt.position.set(side * 3.12, 0.08, -2.25 + Math.floor(index / 2) * 0.68)
    bolt.rotation.x = Math.PI / 2
    bolt.material = materials.detail
  }

  createAssemblyFloorGrates(scene, materials)
  createCeilingServiceStructure(scene, materials)
}

function createAssemblyFloorGrates(scene: Scene, materials: AssemblyMaterials): void {
  for (let grateIndex = 0; grateIndex < 2; grateIndex += 1) {
    const z = -1.48 + grateIndex * 2.8
    const frame = MeshBuilder.CreateBox(`assembly-floor-grate-frame-${grateIndex}`, { width: 2.05, height: 0.035, depth: 0.82 }, scene)

    frame.position.set(0, 0.225, z)
    frame.material = materials.trim

    for (let slat = 0; slat < 9; slat += 1) {
      const bar = MeshBuilder.CreateBox(`assembly-floor-grate-bar-${grateIndex}-${slat}`, { width: 0.055, height: 0.045, depth: 0.72 }, scene)

      bar.position.set(-0.82 + slat * 0.205, 0.255, z)
      bar.material = materials.rubber
    }

    for (let rail = 0; rail < 3; rail += 1) {
      const crossRail = MeshBuilder.CreateBox(`assembly-floor-grate-cross-${grateIndex}-${rail}`, { width: 1.92, height: 0.032, depth: 0.05 }, scene)

      crossRail.position.set(0, 0.272, z - 0.28 + rail * 0.28)
      crossRail.material = materials.detail
    }
  }
}

function createCeilingServiceStructure(scene: Scene, materials: AssemblyMaterials): void {
  for (let track = 0; track < 3; track += 1) {
    const z = -2.62 + track * 1.95
    for (const side of [-1, 1]) {
      const cableTray = MeshBuilder.CreateBox(`assembly-ceiling-cable-tray-${track}-${side}`, { width: 2.72, height: 0.12, depth: 0.2 }, scene)
      const frontLip = MeshBuilder.CreateBox(`assembly-ceiling-tray-front-${track}-${side}`, { width: 2.72, height: 0.045, depth: 0.05 }, scene)
      const backLip = MeshBuilder.CreateBox(`assembly-ceiling-tray-back-${track}-${side}`, { width: 2.72, height: 0.045, depth: 0.05 }, scene)
      const railX = side * 3.08

      cableTray.position.set(railX, 3.22, z)
      frontLip.position.set(railX, 3.1, z - 0.13)
      backLip.position.set(railX, 3.1, z + 0.13)
      cableTray.material = materials.trim
      frontLip.material = materials.rail
      backLip.material = materials.rail

      for (let support = 0; support < 3; support += 1) {
        const hanger = MeshBuilder.CreateBox(`assembly-ceiling-hanger-${track}-${side}-${support}`, { width: 0.07, height: 0.48, depth: 0.07 }, scene)

        hanger.position.set(railX - side * 0.78 + side * support * 0.78, 2.84, z)
        hanger.material = materials.detail
      }
    }
  }

  for (let index = 0; index < 6; index += 1) {
    const cable = MeshBuilder.CreateTorus(`assembly-hanging-service-cable-${index}`, { diameter: 0.42 + (index % 2) * 0.08, thickness: 0.025, tessellation: 18 }, scene)
    const side = index % 2 === 0 ? -1 : 1

    cable.position.set(side * (2.52 + Math.floor(index / 2) * 0.36), 2.66 - (index % 3) * 0.1, 1.65 - (index % 3) * 0.46)
    cable.rotation.x = Math.PI / 2
    cable.rotation.y = index % 2 === 0 ? 0.38 : -0.28
    cable.material = materials.rubber
  }

  for (let index = 0; index < 4; index += 1) {
    const workLight = MeshBuilder.CreateBox(`assembly-ceiling-work-light-${index}`, { width: 0.72, height: 0.045, depth: 0.1 }, scene)
    const side = index % 2 === 0 ? -1 : 1

    workLight.position.set(side * (2.18 + Math.floor(index / 2) * 0.88), 2.66, 1.92)
    workLight.material = materials.workLight
  }
}

function createWallWorkArea(scene: Scene, materials: AssemblyMaterials): void {
  for (let index = 0; index < 6; index += 1) {
    const wallPanel = MeshBuilder.CreateBox(`assembly-back-wall-panel-${index}`, { width: 1.32, height: 1.04, depth: 0.045 }, scene)

    wallPanel.position.set(-3.85 + index * 1.55, 1.55, BACK_WALL_Z - 0.1)
    wallPanel.material = index % 2 === 0 ? materials.wall : materials.trim
  }

  for (let index = 0; index < 9; index += 1) {
    const rib = MeshBuilder.CreateBox(`assembly-back-wall-rib-${index}`, { width: 0.08, height: 2.58, depth: 0.07 }, scene)

    rib.position.set(-4.55 + index * 1.14, 1.42, BACK_WALL_Z - 0.2)
    rib.material = materials.rail
  }

  for (let index = 0; index < 3; index += 1) {
    const conduit = MeshBuilder.CreateBox(`assembly-back-wall-conduit-${index}`, { width: 8.8, height: 0.055, depth: 0.075 }, scene)

    conduit.position.set(0, 2.62 - index * 0.3, BACK_WALL_Z - 0.24)
    conduit.material = materials.detail
  }

  createWorkbench(scene, 'assembly-left-workbench', -3.45, BACK_WALL_Z - 0.48, materials)
  createWorkbench(scene, 'assembly-right-workbench', 3.45, BACK_WALL_Z - 0.48, materials)
  createPegboardTools(scene, -1.8, 2.95, materials)
  createPartsShelf(scene, 1.45, 2.95, materials)
}

function createWorkbench(scene: Scene, name: string, x: number, z: number, materials: AssemblyMaterials): void {
  const top = MeshBuilder.CreateBox(`${name}-top`, { width: 2.05, height: 0.16, depth: 0.62 }, scene)
  const backRail = MeshBuilder.CreateBox(`${name}-back-rail`, { width: 2.15, height: 0.18, depth: 0.08 }, scene)

  top.position.set(x, 0.72, z)
  backRail.position.set(x, 1.05, z + 0.26)
  top.material = materials.trim
  backRail.material = materials.rail

  for (const side of [-1, 1]) {
    const legFront = MeshBuilder.CreateBox(`${name}-front-leg-${side}`, { width: 0.12, height: 0.72, depth: 0.12 }, scene)
    const legBack = MeshBuilder.CreateBox(`${name}-back-leg-${side}`, { width: 0.12, height: 0.72, depth: 0.12 }, scene)

    legFront.position.set(x + side * 0.88, 0.33, z - 0.22)
    legBack.position.set(x + side * 0.88, 0.33, z + 0.22)
    legFront.material = materials.rail
    legBack.material = materials.rail
  }

  createVacuumTube(scene, `${name}-tube-a`, x - 0.72, 0.98, z - 0.06, materials)
  createVacuumTube(scene, `${name}-tube-b`, x - 0.45, 0.98, z + 0.04, materials)
  createCircuitBoard(scene, `${name}-pcb`, x + 0.24, 0.84, z - 0.02, materials)
  createCableCoil(scene, `${name}-cable`, x + 0.78, 0.87, z, materials)
}

function createPegboardTools(scene: Scene, x: number, z: number, materials: AssemblyMaterials): void {
  const board = MeshBuilder.CreateBox('assembly-pegboard', { width: 2.25, height: 0.86, depth: 0.08 }, scene)

  board.position.set(x, 1.63, z)
  board.material = materials.trim

  for (let index = 0; index < 7; index += 1) {
    const peg = MeshBuilder.CreateCylinder(`assembly-tool-peg-${index}`, { height: 0.26, diameter: 0.032, tessellation: 8 }, scene)
    const grip = MeshBuilder.CreateBox(`assembly-tool-grip-${index}`, { width: 0.08, height: 0.24, depth: 0.05 }, scene)
    const head = MeshBuilder.CreateBox(`assembly-tool-head-${index}`, { width: 0.18, height: 0.08, depth: 0.06 }, scene)
    const toolX = x - 0.92 + index * 0.31

    peg.position.set(toolX, 1.72, z - 0.08)
    peg.rotation.x = Math.PI / 2
    grip.position.set(toolX, 1.46, z - 0.16)
    grip.rotation.z = index % 2 === 0 ? 0.2 : -0.14
    head.position.set(toolX, 1.6, z - 0.17)
    head.material = materials.toolHead
    grip.material = materials.detail
    peg.material = materials.rail
  }
}

function createPartsShelf(scene: Scene, x: number, z: number, materials: AssemblyMaterials): void {
  for (let level = 0; level < 2; level += 1) {
    const shelf = MeshBuilder.CreateBox(`assembly-parts-shelf-${level}`, { width: 2.35, height: 0.1, depth: 0.52 }, scene)

    shelf.position.set(x, 1.16 + level * 0.62, z)
    shelf.material = materials.rail
  }

  for (const side of [-1, 1]) {
    const upright = MeshBuilder.CreateBox(`assembly-parts-shelf-upright-${side}`, { width: 0.12, height: 1.42, depth: 0.12 }, scene)

    upright.position.set(x + side * 1.13, 1.45, z)
    upright.material = materials.trim
  }

  createWheelProp(scene, 'assembly-shelf-wheel-a', x - 0.78, 1.43, z - 0.05, materials)
  createWheelProp(scene, 'assembly-shelf-wheel-b', x - 0.42, 1.43, z - 0.05, materials)
  createSawBladeProp(scene, 'assembly-spare-saw', x + 0.42, 1.46, z - 0.04, materials)
  createArmorPlateProp(scene, 'assembly-shelf-armor', x + 0.83, 1.98, z - 0.03, materials)
  createBatteryBox(scene, 'assembly-shelf-battery', x - 0.72, 1.96, z - 0.02, materials)
}

function createLiftBay(scene: Scene, materials: AssemblyMaterials): void {
  const lift = MeshBuilder.CreateBox('assembly-lift-platform', { width: 4.2, height: 0.16, depth: 2.75 }, scene)
  const centerPlate = MeshBuilder.CreateBox('assembly-lift-service-plate', { width: 2.8, height: 0.035, depth: 1.55 }, scene)

  lift.position.set(0, 0.08, -0.28)
  centerPlate.position.set(0, 0.18, -0.28)
  lift.material = materials.trim
  centerPlate.material = materials.deck

  for (const z of [-1.1, 1.1]) {
    const rail = MeshBuilder.CreateBox(`assembly-lift-rail-${z}`, { width: 3.75, height: 0.07, depth: 0.12 }, scene)

    rail.position.set(0, 0.24, -0.28 + z)
    rail.material = materials.warning
  }

  for (const x of [-1.86, 1.86]) {
    for (const z of [-1.02, 1.02]) {
      const jack = MeshBuilder.CreateCylinder(`assembly-lift-jack-${x}-${z}`, { height: 0.62, diameter: 0.18, tessellation: 10 }, scene)
      const pad = MeshBuilder.CreateBox(`assembly-lift-jack-pad-${x}-${z}`, { width: 0.46, height: 0.08, depth: 0.3 }, scene)

      jack.position.set(x, 0.43, -0.28 + z)
      pad.position.set(x, 0.77, -0.28 + z)
      jack.material = materials.detail
      pad.material = materials.warning
    }
  }
}

function createOverheadGantry(
  scene: Scene,
  role: TeamRole,
  materials: AssemblyMaterials,
): Omit<AssemblyResources['rig'], 'sparks'> {
  const leftColumn = MeshBuilder.CreateBox('assembly-column-left', { width: 0.24, height: 3.12, depth: 0.24 }, scene)
  const rightColumn = MeshBuilder.CreateBox('assembly-column-right', { width: 0.24, height: 3.12, depth: 0.24 }, scene)
  const beam = MeshBuilder.CreateBox('assembly-gantry-beam', { width: 5.8, height: 0.16, depth: 0.26 }, scene)
  const trolley = MeshBuilder.CreateBox('assembly-gantry-trolley', { width: 0.86, height: 0.16, depth: 0.38 }, scene)
  const hoistCable = MeshBuilder.CreateCylinder('assembly-hoist-cable', { height: 0.62, diameter: 0.03, tessellation: 8 }, scene)
  const suspendedPanel = MeshBuilder.CreateBox('assembly-suspended-armor-panel', { width: 1.18, height: 0.08, depth: 0.58 }, scene)
  const clampRing = MeshBuilder.CreateTorus('assembly-rig-tool-ring', { diameter: 1.12, thickness: 0.055, tessellation: 24 }, scene)

  leftColumn.position.set(-3.82, 1.58, 1.72)
  rightColumn.position.set(3.82, 1.58, 1.72)
  beam.position.set(0, 3.24, 1.72)
  trolley.position.set(0.08, 3.05, 1.72)
  hoistCable.position.set(0.08, 2.68, 1.72)
  suspendedPanel.position.set(0.08, 2.34, 1.72)
  suspendedPanel.rotation.z = role === 'red' ? -0.12 : 0.12
  clampRing.position.set(0, 1.78, 0.98)
  clampRing.rotation.x = Math.PI / 2

  leftColumn.material = materials.rail
  rightColumn.material = materials.rail
  beam.material = materials.trim
  trolley.material = materials.detail
  hoistCable.material = materials.trim
  suspendedPanel.material = materials.primerPanel
  clampRing.material = materials.rail

  const leftArm = MeshBuilder.CreateBox('assembly-tool-arm-left', { width: 1.65, height: 0.12, depth: 0.2 }, scene)
  const rightArm = MeshBuilder.CreateBox('assembly-tool-arm-right', { width: 1.65, height: 0.12, depth: 0.2 }, scene)
  const leftToolHead = MeshBuilder.CreateCylinder('assembly-tool-head-left', { height: 0.3, diameterTop: 0.07, diameterBottom: 0.18, tessellation: 10 }, scene)
  const rightToolHead = MeshBuilder.CreateCylinder('assembly-tool-head-right', { height: 0.3, diameterTop: 0.07, diameterBottom: 0.18, tessellation: 10 }, scene)
  const leftClamp = MeshBuilder.CreateBox('assembly-tool-clamp-left', { width: 0.34, height: 0.16, depth: 0.28 }, scene)
  const rightClamp = MeshBuilder.CreateBox('assembly-tool-clamp-right', { width: 0.34, height: 0.16, depth: 0.28 }, scene)

  leftArm.position.set(-1.95, 1.66, -0.42)
  rightArm.position.set(1.95, 1.66, -0.42)
  leftArm.rotation.z = 0.12
  rightArm.rotation.z = -0.12
  leftToolHead.position.set(-1.18, 1.24, -0.18)
  rightToolHead.position.set(1.18, 1.24, -0.18)
  leftToolHead.rotation.x = Math.PI / 2
  rightToolHead.rotation.x = Math.PI / 2
  leftClamp.position.set(-1.62, 1.2, 0.34)
  rightClamp.position.set(1.62, 1.2, 0.34)

  leftArm.material = materials.rail
  rightArm.material = materials.rail
  leftToolHead.material = materials.toolHead
  rightToolHead.material = materials.toolHead
  leftClamp.material = materials.toolHead
  rightClamp.material = materials.toolHead

  return {
    trolley,
    hoistCable,
    suspendedPanel,
    leftArm,
    rightArm,
    leftToolHead,
    rightToolHead,
    leftClamp,
    rightClamp,
    clampRing,
    trolleyBaseX: trolley.position.x,
    suspendedPanelBaseY: suspendedPanel.position.y,
    leftClampBaseY: leftClamp.position.y,
    rightClampBaseY: rightClamp.position.y,
    leftArmBaseZ: leftArm.position.z,
    rightArmBaseZ: rightArm.position.z,
  }
}

function createSideRobotArms(
  scene: Scene,
  rig: Omit<AssemblyResources['rig'], 'sparks'>,
  materials: AssemblyMaterials,
): void {
  for (const side of [-1, 1]) {
    const base = MeshBuilder.CreateCylinder(`assembly-robot-arm-base-${side}`, { height: 0.56, diameter: 0.72, tessellation: 18 }, scene)
    const baseCap = MeshBuilder.CreateCylinder(`assembly-robot-arm-base-cap-${side}`, { height: 0.08, diameter: 0.58, tessellation: 18 }, scene)
    const shoulder = MeshBuilder.CreateCylinder(`assembly-robot-arm-shoulder-${side}`, { height: 0.58, diameter: 0.34, tessellation: 14 }, scene)
    const shoulderPlate = MeshBuilder.CreateBox(`assembly-robot-arm-shoulder-plate-${side}`, { width: 0.52, height: 0.16, depth: 0.42 }, scene)
    const upper = MeshBuilder.CreateBox(`assembly-robot-arm-upper-${side}`, { width: 1.24, height: 0.22, depth: 0.3 }, scene)
    const upperCover = MeshBuilder.CreateBox(`assembly-robot-arm-upper-cover-${side}`, { width: 0.62, height: 0.06, depth: 0.34 }, scene)
    const elbow = MeshBuilder.CreateCylinder(`assembly-robot-arm-elbow-${side}`, { height: 0.36, diameter: 0.34, tessellation: 14 }, scene)
    const forearm = MeshBuilder.CreateBox(`assembly-robot-arm-forearm-${side}`, { width: 1.05, height: 0.18, depth: 0.26 }, scene)
    const wrist = MeshBuilder.CreateCylinder(`assembly-robot-arm-wrist-${side}`, { height: 0.24, diameter: 0.22, tessellation: 12 }, scene)
    const gripperPalm = MeshBuilder.CreateBox(`assembly-robot-arm-gripper-palm-${side}`, { width: 0.25, height: 0.16, depth: 0.24 }, scene)
    const gripperTop = MeshBuilder.CreateBox(`assembly-robot-arm-gripper-top-${side}`, { width: 0.36, height: 0.06, depth: 0.1 }, scene)
    const gripperBottom = MeshBuilder.CreateBox(`assembly-robot-arm-gripper-bottom-${side}`, { width: 0.36, height: 0.06, depth: 0.1 }, scene)

    base.position.set(side * 3.85, 0.28, 0.86)
    baseCap.position.set(side * 3.85, 0.58, 0.86)
    shoulder.position.set(side * 3.55, 0.92, 0.72)
    shoulder.rotation.z = Math.PI / 2
    shoulderPlate.position.set(side * 3.5, 0.92, 0.72)
    shoulderPlate.rotation.y = side * 0.2
    upper.position.set(side * 3.05, 1.12, 0.54)
    upper.rotation.z = side * 0.24
    upperCover.position.set(side * 3.04, 1.26, 0.5)
    upperCover.rotation.z = side * 0.24
    elbow.position.set(side * 2.55, 1.24, 0.38)
    elbow.rotation.z = Math.PI / 2
    forearm.position.set(side * 2.08, 1.2, 0.3)
    forearm.rotation.z = side * -0.16
    wrist.position.set(side * 1.52, 1.12, 0.28)
    wrist.rotation.z = Math.PI / 2
    gripperPalm.position.set(side * 1.34, 1.08, 0.26)
    gripperTop.position.set(side * 1.18, 1.15, 0.18)
    gripperBottom.position.set(side * 1.18, 1.01, 0.36)
    gripperPalm.rotation.z = side * -0.16
    gripperTop.rotation.z = side * -0.34
    gripperBottom.rotation.z = side * 0.18

    base.material = materials.industrialArm
    baseCap.material = materials.detail
    shoulder.material = materials.detail
    shoulderPlate.material = materials.industrialArm
    upper.material = materials.industrialArm
    upperCover.material = materials.warning
    elbow.material = materials.detail
    forearm.material = materials.industrialArm
    wrist.material = materials.detail
    gripperPalm.material = materials.rail
    gripperTop.material = materials.toolHead
    gripperBottom.material = materials.toolHead
  }

  rig.leftClamp.position.x = -1.68
  rig.rightClamp.position.x = 1.68
}

function createPartsCarts(scene: Scene, materials: AssemblyMaterials): void {
  createPartsCart(scene, 'assembly-left-parts-cart', -3.92, -2.22, -0.18, materials)
  createPartsCart(scene, 'assembly-right-parts-cart', 3.92, -2.22, 0.18, materials)
}

function createPartsCart(scene: Scene, name: string, x: number, z: number, rotation: number, materials: AssemblyMaterials): void {
  const deck = MeshBuilder.CreateBox(`${name}-deck`, { width: 1.35, height: 0.15, depth: 0.88 }, scene)
  const handle = MeshBuilder.CreateBox(`${name}-handle`, { width: 0.1, height: 0.78, depth: 0.1 }, scene)

  deck.position.set(x, 0.18, z)
  deck.rotation.y = rotation
  deck.material = materials.trim
  handle.position.set(x - Math.sign(x) * 0.62, 0.55, z + 0.36)
  handle.rotation.y = rotation
  handle.material = materials.rail

  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const caster = MeshBuilder.CreateCylinder(`${name}-caster-${side}-${end}`, { height: 0.08, diameter: 0.16, tessellation: 8 }, scene)

      caster.position.set(x + side * 0.48, 0.03, z + end * 0.3)
      caster.rotation.z = Math.PI / 2
      caster.material = materials.rubber
    }
  }

  createWheelProp(scene, `${name}-wheel`, x - 0.34, 0.43, z - 0.18, materials)
  createArmorPlateProp(scene, `${name}-armor`, x + 0.22, 0.4, z + 0.08, materials)
  createSawBladeProp(scene, `${name}-saw`, x + 0.46, 0.43, z - 0.14, materials)
}

function createGarageClutter(scene: Scene, materials: AssemblyMaterials): void {
  const crateSpecs = [
    [-4.6, 0.16, -2.94, -0.14],
    [-4.22, 0.16, -2.98, 0.08],
    [-3.86, 0.32, -2.92, 0.22],
    [-3.52, 0.16, -3.02, -0.18],
    [-4.34, 0.48, -2.68, 0.3],
  ] as const

  crateSpecs.forEach(([x, y, z, rotationY], index) => {
    createStorageCrate(scene, `assembly-part-crate-${index}`, x, y, z, rotationY, materials)
  })

  for (let index = 0; index < 4; index += 1) {
    const bumper = MeshBuilder.CreateBox(`assembly-rubber-bumper-${index}`, { width: 0.7, height: 0.13, depth: 0.16 }, scene)

    bumper.position.set(2.9 + index * 0.38, 0.17, 2.52)
    bumper.rotation.y = 0.12
    bumper.material = materials.rubber
  }

  createCableCoil(scene, 'assembly-floor-cable-a', -4.25, 0.12, 1.62, materials)
  createCableCoil(scene, 'assembly-floor-cable-b', 4.28, 0.12, 1.25, materials)
  createBatteryBox(scene, 'assembly-floor-battery', -3.72, 0.25, 1.0, materials)
  createCircuitBoard(scene, 'assembly-floor-diagnostic-pcb', 3.62, 0.26, 1.34, materials)
  createElectronicsServiceTray(scene, 'assembly-left-electronics-tray', -2.82, 0.24, 1.94, -0.18, materials)
  createElectronicsServiceTray(scene, 'assembly-right-electronics-tray', 2.78, 0.24, 1.86, 0.16, materials)
}

function createStorageCrate(
  scene: Scene,
  name: string,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  materials: AssemblyMaterials,
): void {
  const bodyWidth = 0.5
  const bodyHeight = 0.32
  const bodyDepth = 0.42
  const crate = MeshBuilder.CreateBox(`${name}-body`, { width: bodyWidth, height: bodyHeight, depth: bodyDepth }, scene)

  positionCratePart(crate, x, y, z, rotationY, 0, 0, 0)
  crate.material = materials.crate

  for (const localZ of [-bodyDepth * 0.52, bodyDepth * 0.52]) {
    const topRail = MeshBuilder.CreateBox(`${name}-top-rail-${localZ}`, { width: 0.46, height: 0.04, depth: 0.035 }, scene)
    const bottomRail = MeshBuilder.CreateBox(`${name}-bottom-rail-${localZ}`, { width: 0.46, height: 0.04, depth: 0.035 }, scene)
    const leftStile = MeshBuilder.CreateBox(`${name}-left-stile-${localZ}`, { width: 0.045, height: 0.27, depth: 0.035 }, scene)
    const rightStile = MeshBuilder.CreateBox(`${name}-right-stile-${localZ}`, { width: 0.045, height: 0.27, depth: 0.035 }, scene)
    const label = MeshBuilder.CreateBox(`${name}-label-${localZ}`, { width: 0.24, height: 0.045, depth: 0.04 }, scene)

    positionCratePart(topRail, x, y, z, rotationY, 0, 0.12, localZ)
    positionCratePart(bottomRail, x, y, z, rotationY, 0, -0.12, localZ)
    positionCratePart(leftStile, x, y, z, rotationY, -0.18, 0, localZ)
    positionCratePart(rightStile, x, y, z, rotationY, 0.18, 0, localZ)
    positionCratePart(label, x, y, z, rotationY, 0, 0.015, localZ)
    topRail.material = materials.crateBand
    bottomRail.material = materials.crateBand
    leftStile.material = materials.crateBand
    rightStile.material = materials.crateBand
    label.material = materials.crateLabel
  }

  for (const localX of [-0.2, 0.2]) {
    const corner = MeshBuilder.CreateBox(`${name}-corner-${localX}`, { width: 0.055, height: 0.35, depth: 0.06 }, scene)

    positionCratePart(corner, x, y, z, rotationY, localX, 0, 0)
    corner.material = materials.crateBand
  }

  const lidSeam = MeshBuilder.CreateBox(`${name}-lid-seam`, { width: 0.42, height: 0.028, depth: 0.06 }, scene)
  const handle = MeshBuilder.CreateBox(`${name}-handle`, { width: 0.24, height: 0.035, depth: 0.08 }, scene)

  positionCratePart(lidSeam, x, y, z, rotationY, 0, 0.18, 0)
  positionCratePart(handle, x, y, z, rotationY, 0, 0.205, 0)
  lidSeam.material = materials.crateBand
  handle.material = materials.trim
}

function positionCratePart(
  mesh: AbstractMesh,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  localX: number,
  localY: number,
  localZ: number,
): void {
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)

  mesh.position.set(x + localX * cos + localZ * sin, y + localY, z - localX * sin + localZ * cos)
  mesh.rotation.y = rotationY
}

function createElectronicsServiceTray(
  scene: Scene,
  name: string,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  materials: AssemblyMaterials,
): void {
  const tray = MeshBuilder.CreateBox(`${name}-tray`, { width: 1.08, height: 0.08, depth: 0.58 }, scene)
  const frontRail = MeshBuilder.CreateBox(`${name}-front-rail`, { width: 1.12, height: 0.08, depth: 0.06 }, scene)
  const rearRail = MeshBuilder.CreateBox(`${name}-rear-rail`, { width: 1.12, height: 0.08, depth: 0.06 }, scene)

  tray.position.set(x, y, z)
  frontRail.position.set(x, y + 0.07, z + 0.32)
  rearRail.position.set(x, y + 0.07, z - 0.32)
  tray.rotation.y = rotationY
  frontRail.rotation.y = rotationY
  rearRail.rotation.y = rotationY
  tray.material = materials.trim
  frontRail.material = materials.rail
  rearRail.material = materials.rail

  createCircuitBoard(scene, `${name}-large-pcb`, x - 0.22, y + 0.09, z - 0.04, materials, {
    depth: 0.46,
    rotationY,
    width: 0.72,
  })

  for (let index = 0; index < 3; index += 1) {
    createVacuumTube(scene, `${name}-tube-${index}`, x + 0.24 + index * 0.16, y + 0.12, z + 0.12, materials, {
      diameter: 0.11,
      height: 0.34,
      rotationY,
    })
  }

  createCableCoil(scene, `${name}-coiled-lead`, x + 0.33, y + 0.08, z - 0.22, materials, {
    diameter: 0.28,
    rotationY,
  })
  createWireRun(scene, `${name}-red-wire`, x - 0.36, y + 0.16, z + 0.19, rotationY, materials.warning)
  createWireRun(scene, `${name}-signal-wire`, x - 0.1, y + 0.17, z + 0.19, rotationY, materials.diagnostic)
}

function createWeldingSparks(scene: Scene, materials: AssemblyMaterials): AssemblyResources['rig']['sparks'] {
  return Array.from({ length: 14 }, (_, index) => {
    const spark = MeshBuilder.CreateSphere(`assembly-weld-spark-${index}`, { diameter: 0.045, segments: 6 }, scene)
    const basePosition = new Vector3(
      -1.36 + (index % 4) * 0.13,
      0.9 + (index % 3) * 0.08,
      0.12 + (index % 5) * 0.08,
    )

    spark.position.copyFrom(basePosition)
    spark.material = materials.spark

    return {
      mesh: spark,
      basePosition,
      phase: index * 0.37,
    }
  })
}

function createWheelProp(scene: Scene, name: string, x: number, y: number, z: number, materials: AssemblyMaterials): void {
  const tire = MeshBuilder.CreateTorus(`${name}-tire`, { diameter: 0.48, thickness: 0.1, tessellation: 18 }, scene)
  const hub = MeshBuilder.CreateCylinder(`${name}-hub`, { height: 0.12, diameter: 0.24, tessellation: 14 }, scene)

  tire.position.set(x, y, z)
  tire.rotation.y = Math.PI / 2
  hub.position.set(x, y, z)
  hub.rotation.z = Math.PI / 2
  tire.material = materials.rubber
  hub.material = materials.detail

  for (let index = 0; index < 6; index += 1) {
    const spoke = MeshBuilder.CreateBox(`${name}-spoke-${index}`, { width: 0.2, height: 0.026, depth: 0.045 }, scene)

    spoke.position.set(x, y, z)
    spoke.rotation.z = (Math.PI * index) / 3
    spoke.material = materials.rail
  }
}

function createSawBladeProp(scene: Scene, name: string, x: number, y: number, z: number, materials: AssemblyMaterials): void {
  const blade = MeshBuilder.CreateCylinder(`${name}-disc`, { height: 0.06, diameter: 0.48, tessellation: 24 }, scene)
  const hub = MeshBuilder.CreateCylinder(`${name}-hub`, { height: 0.08, diameter: 0.18, tessellation: 14 }, scene)

  blade.position.set(x, y, z)
  blade.rotation.x = Math.PI / 2
  hub.position.set(x, y + 0.01, z)
  hub.rotation.x = Math.PI / 2
  blade.material = materials.toolHead
  hub.material = materials.trim

  for (let index = 0; index < 14; index += 1) {
    const tooth = MeshBuilder.CreateBox(`${name}-tooth-${index}`, { width: 0.06, height: 0.04, depth: 0.14 }, scene)
    const angle = (Math.PI * 2 * index) / 14

    tooth.position.set(x + Math.cos(angle) * 0.27, y, z + Math.sin(angle) * 0.27)
    tooth.rotation.y = angle
    tooth.material = materials.toolHead
  }
}

function createArmorPlateProp(scene: Scene, name: string, x: number, y: number, z: number, materials: AssemblyMaterials): void {
  const plate = MeshBuilder.CreateBox(`${name}-plate`, { width: 0.64, height: 0.08, depth: 0.38 }, scene)
  const rib = MeshBuilder.CreateBox(`${name}-rib`, { width: 0.54, height: 0.04, depth: 0.05 }, scene)

  plate.position.set(x, y, z)
  plate.rotation.y = -0.28
  rib.position.set(x, y + 0.06, z)
  rib.rotation.y = -0.28
  plate.material = materials.primerPanel
  rib.material = materials.warning
}

function createBatteryBox(scene: Scene, name: string, x: number, y: number, z: number, materials: AssemblyMaterials): void {
  const pack = MeshBuilder.CreateBox(`${name}-pack`, { width: 0.5, height: 0.24, depth: 0.32 }, scene)
  const terminalA = MeshBuilder.CreateCylinder(`${name}-terminal-a`, { height: 0.08, diameter: 0.06, tessellation: 8 }, scene)
  const terminalB = MeshBuilder.CreateCylinder(`${name}-terminal-b`, { height: 0.08, diameter: 0.06, tessellation: 8 }, scene)
  const warning = MeshBuilder.CreateBox(`${name}-warning`, { width: 0.34, height: 0.035, depth: 0.06 }, scene)

  pack.position.set(x, y, z)
  terminalA.position.set(x - 0.14, y + 0.16, z - 0.08)
  terminalB.position.set(x + 0.14, y + 0.16, z - 0.08)
  warning.position.set(x, y + 0.13, z + 0.17)
  pack.material = materials.trim
  terminalA.material = materials.copper
  terminalB.material = materials.copper
  warning.material = materials.warning
}

function createCircuitBoard(
  scene: Scene,
  name: string,
  x: number,
  y: number,
  z: number,
  materials: AssemblyMaterials,
  options: { depth?: number; rotationY?: number; width?: number } = {},
): void {
  const boardWidth = options.width ?? 0.5
  const boardDepth = options.depth ?? 0.36
  const rotationY = options.rotationY ?? 0
  const board = MeshBuilder.CreateBox(`${name}-board`, { width: boardWidth, height: 0.035, depth: boardDepth }, scene)

  board.position.set(x, y, z)
  board.rotation.y = rotationY
  board.material = materials.pcb

  for (let index = 0; index < 6; index += 1) {
    const chip = MeshBuilder.CreateBox(`${name}-chip-${index}`, { width: 0.08, height: 0.045, depth: 0.08 }, scene)

    chip.position.set(x - boardWidth * 0.36 + index * boardWidth * 0.14, y + 0.05, z + (index % 2 === 0 ? -boardDepth * 0.22 : boardDepth * 0.22))
    chip.rotation.y = rotationY
    chip.material = materials.trim
  }

  for (let index = -1; index <= 1; index += 1) {
    const trace = MeshBuilder.CreateBox(`${name}-trace-${index + 1}`, { width: 0.035, height: 0.02, depth: boardDepth * 0.76 }, scene)

    trace.position.set(x + index * boardWidth * 0.22, y + 0.045, z)
    trace.rotation.y = rotationY
    trace.material = index === 0 ? materials.diagnostic : materials.copper
  }

  for (let index = 0; index < 4; index += 1) {
    const pin = MeshBuilder.CreateCylinder(`${name}-edge-pin-${index}`, { height: 0.055, diameter: 0.035, tessellation: 8 }, scene)

    pin.position.set(x - boardWidth * 0.32 + index * boardWidth * 0.21, y + 0.07, z + boardDepth * 0.44)
    pin.rotation.y = rotationY
    pin.material = materials.copper
  }
}

function createVacuumTube(
  scene: Scene,
  name: string,
  x: number,
  y: number,
  z: number,
  materials: AssemblyMaterials,
  options: { diameter?: number; height?: number; rotationY?: number } = {},
): void {
  const height = options.height ?? 0.36
  const diameter = options.diameter ?? 0.12
  const rotationY = options.rotationY ?? 0
  const glass = MeshBuilder.CreateCylinder(`${name}-glass`, { height, diameter, tessellation: 14 }, scene)
  const cap = MeshBuilder.CreateCylinder(`${name}-cap`, { height: 0.06, diameter: diameter * 1.14, tessellation: 12 }, scene)
  const filament = MeshBuilder.CreateCylinder(`${name}-filament`, { height: height * 0.72, diameter: diameter * 0.22, tessellation: 8 }, scene)

  glass.position.set(x, y + height * 0.5, z)
  cap.position.set(x, y + 0.02, z)
  filament.position.set(x, y + height * 0.5, z)
  glass.rotation.y = rotationY
  cap.rotation.y = rotationY
  filament.rotation.y = rotationY
  glass.material = materials.glass
  cap.material = materials.trim
  filament.material = materials.copper
}

function createCableCoil(
  scene: Scene,
  name: string,
  x: number,
  y: number,
  z: number,
  materials: AssemblyMaterials,
  options: { diameter?: number; rotationY?: number } = {},
): void {
  const diameter = options.diameter ?? 0.36
  const rotationY = options.rotationY ?? 0

  for (let index = 0; index < 3; index += 1) {
    const loop = MeshBuilder.CreateTorus(`${name}-loop-${index}`, { diameter: diameter + index * 0.08, thickness: 0.026, tessellation: 18 }, scene)

    loop.position.set(x, y + index * 0.018, z)
    loop.rotation.x = Math.PI / 2
    loop.rotation.y = rotationY
    loop.material = materials.rubber
  }
}

function createWireRun(
  scene: Scene,
  name: string,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  material: Material,
): void {
  const run = MeshBuilder.CreateBox(`${name}-run`, { width: 0.52, height: 0.03, depth: 0.035 }, scene)
  const plug = MeshBuilder.CreateBox(`${name}-plug`, { width: 0.12, height: 0.06, depth: 0.08 }, scene)

  run.position.set(x, y, z)
  plug.position.set(x + 0.3, y + 0.015, z)
  run.rotation.y = rotationY
  plug.rotation.y = rotationY
  run.material = material
  plug.material = material
}

export function createTeamBayLights(scene: Scene, teamAccent: string): PointLight[] {
  const portLight = new PointLight(
    'assembly-team-port-light',
    new Vector3(-3.1, 2.25, 2.35),
    scene,
  )
  const starboardLight = new PointLight(
    'assembly-team-starboard-light',
    new Vector3(3.1, 2.25, 2.35),
    scene,
  )
  const overheadLight = new PointLight(
    'assembly-team-overhead-light',
    new Vector3(0, 3.2, -1.1),
    scene,
  )

  portLight.intensity = 0.55
  starboardLight.intensity = 0.55
  overheadLight.intensity = 0.45

  portLight.diffuse = Color3.FromHexString(teamAccent)
  starboardLight.diffuse = Color3.FromHexString(teamAccent)
  overheadLight.diffuse = Color3.FromHexString(teamAccent)

  return [portLight, starboardLight, overheadLight]
}

export function createAssemblyMaterial(
  scene: Scene,
  name: string,
  base: string,
  emissive: string,
  alpha = 1,
  metallic = 0.45,
  roughness = 0.48,
  pattern?: SurfacePattern,
): PBRMetallicRoughnessMaterial {
  const material = new PBRMetallicRoughnessMaterial(name, scene)

  material.baseColor = Color3.FromHexString(base)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.metallic = metallic
  material.roughness = roughness
  material.alpha = alpha
  material.backFaceCulling = alpha >= 1
  material.maxSimultaneousLights = 6

  if (pattern) {
    const textures = createPbrSurfaceTextures(scene, name, {
      baseColor: base,
      metallic,
      pattern,
      roughness,
    })

    material.baseTexture = textures.baseTexture
    material.metallicRoughnessTexture = textures.metallicRoughnessTexture
    material.normalTexture = textures.normalTexture
    material.occlusionTexture = textures.occlusionTexture
    material.occlusionStrength = pattern === 'arena_floor' ? 0.72 : 0.56
  }

  return material
}
