import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../packages/schemas/src/index.js'

export function createCenterLogo(
  scene: Scene,
  markMaterial: StandardMaterial,
  lightMaterial: StandardMaterial,
): void {
  const leftWing = MeshBuilder.CreateBox(
    'center-logo-left',
    { width: 0.72, height: 0.028, depth: 0.22 },
    scene,
  )
  const rightWing = MeshBuilder.CreateBox(
    'center-logo-right',
    { width: 0.72, height: 0.028, depth: 0.22 },
    scene,
  )
  const core = MeshBuilder.CreateBox(
    'center-logo-core',
    { width: 0.34, height: 0.03, depth: 0.68 },
    scene,
  )

  leftWing.position.set(-0.36, 0.055, 0)
  rightWing.position.set(0.36, 0.055, 0)
  core.position.set(0, 0.058, 0)
  leftWing.rotation.y = -0.34
  rightWing.rotation.y = 0.34
  leftWing.material = markMaterial
  rightWing.material = markMaterial
  core.material = lightMaterial
}

export function createSpawnPad(
  scene: Scene,
  role: TeamRole,
  x: number,
  z: number,
  padMaterial: StandardMaterial,
  lightMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const side = role === 'red' ? -1 : 1
  const pad = MeshBuilder.CreateBox(
    `${role}-spawn-pad`,
    { width: 5.2, height: 0.036, depth: 3.4 },
    scene,
  )

  pad.position.set(x, 0.015, z)
  pad.material = padMaterial

  createPadFrame(scene, `${role}-spawn-frame`, x, z, 5.5, 3.7, trimMaterial)
  createStartClampRails(scene, `${role}-spawn-clamp`, x, z, side, trimMaterial)
  createStagingStops(scene, `${role}-spawn-stop`, x, z, side, trimMaterial)
  createPadServiceDetails(scene, `${role}-spawn-service`, x, z, side, trimMaterial)
  createFloorLightStrip(scene, `${role}-spawn-led-front`, x, z - 1.72, 2.2, 0, lightMaterial)
  createFloorLightStrip(scene, `${role}-spawn-led-back`, x, z + 1.72, 2.2, 0, lightMaterial)
  createFloorLightStrip(scene, `${role}-spawn-led-side-a`, x - side * 2.52, z - 0.92, 0.95, Math.PI / 2, lightMaterial)
  createFloorLightStrip(scene, `${role}-spawn-led-side-b`, x - side * 2.52, z + 0.92, 0.95, Math.PI / 2, lightMaterial)
}

export function createStaticTrapDoors(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  hatchMaterial: StandardMaterial,
  warningMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const trapPositions = [
    [-arenaWidth * 0.28, -arenaHeight * 0.27],
    [arenaWidth * 0.28, -arenaHeight * 0.27],
    [-arenaWidth * 0.28, arenaHeight * 0.27],
    [arenaWidth * 0.28, arenaHeight * 0.27],
  ]

  trapPositions.forEach(([x, z], index) => {
    const hatch = MeshBuilder.CreateBox(
      `static-hazard-hatch-${index}`,
      { width: 1.7, height: 0.028, depth: 1.05 },
      scene,
    )

    hatch.position.set(x, 0.03, z)
    hatch.material = hatchMaterial
    createPadFrame(scene, `static-hazard-hatch-frame-${index}`, x, z, 1.95, 1.3, warningMaterial)
    createHatchHinge(scene, `static-hazard-hatch-hinge-${index}`, x, z + 0.5, trimMaterial)
    createHatchLatch(scene, `static-hazard-hatch-latch-${index}`, x, z - 0.44, trimMaterial)

    const handle = MeshBuilder.CreateBox(
      `static-hazard-hatch-handle-${index}`,
      { width: 0.72, height: 0.06, depth: 0.12 },
      scene,
    )

    handle.position.set(x, 0.08, z)
    handle.material = trimMaterial
  })
}

function createStartClampRails(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  side: number,
  material: StandardMaterial,
): void {
  for (const offsetZ of [-0.94, 0.94]) {
    const rail = MeshBuilder.CreateBox(
      `${name}-rail-${offsetZ}`,
      { width: 3.55, height: 0.08, depth: 0.12 },
      scene,
    )
    const bracket = MeshBuilder.CreateBox(
      `${name}-bracket-${offsetZ}`,
      { width: 0.34, height: 0.16, depth: 0.32 },
      scene,
    )

    rail.position.set(x + side * 0.18, 0.11, z + offsetZ)
    bracket.position.set(x - side * 1.58, 0.13, z + offsetZ)
    rail.material = material
    bracket.material = material
  }
}

function createStagingStops(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  side: number,
  material: StandardMaterial,
): void {
  for (const offsetZ of [-1.2, 1.2]) {
    const stop = MeshBuilder.CreateBox(
      `${name}-${offsetZ}`,
      { width: 0.42, height: 0.16, depth: 0.32 },
      scene,
    )

    stop.position.set(x - side * 2.04, 0.13, z + offsetZ)
    stop.rotation.y = side * 0.24
    stop.material = material
  }
}

function createPadServiceDetails(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  side: number,
  material: StandardMaterial,
): void {
  const cableSlot = MeshBuilder.CreateBox(
    `${name}-cable-slot`,
    { width: 0.72, height: 0.04, depth: 0.11 },
    scene,
  )

  cableSlot.position.set(x + side * 1.8, 0.085, z)
  cableSlot.material = material

  for (let index = 0; index < 4; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${name}-bolt-${index}`,
      { height: 0.035, diameter: 0.1, tessellation: 8 },
      scene,
    )
    const offsetX = index < 2 ? -2.2 : 2.2
    const offsetZ = index % 2 === 0 ? -1.42 : 1.42

    bolt.position.set(x + offsetX, 0.09, z + offsetZ)
    bolt.rotation.x = Math.PI / 2
    bolt.material = material
  }
}

function createHatchHinge(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  material: StandardMaterial,
): void {
  const hinge = MeshBuilder.CreateCylinder(
    name,
    { height: 1.4, diameter: 0.08, tessellation: 10 },
    scene,
  )

  hinge.position.set(x, 0.08, z)
  hinge.rotation.z = Math.PI / 2
  hinge.material = material
}

function createHatchLatch(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  material: StandardMaterial,
): void {
  const latch = MeshBuilder.CreateBox(name, { width: 0.38, height: 0.055, depth: 0.12 }, scene)

  latch.position.set(x, 0.086, z)
  latch.material = material
}

function createPadFrame(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  material: StandardMaterial,
): void {
  const north = MeshBuilder.CreateBox(`${name}-north`, { width, height: 0.055, depth: 0.14 }, scene)
  const south = MeshBuilder.CreateBox(`${name}-south`, { width, height: 0.055, depth: 0.14 }, scene)
  const east = MeshBuilder.CreateBox(`${name}-east`, { width: 0.14, height: 0.055, depth }, scene)
  const west = MeshBuilder.CreateBox(`${name}-west`, { width: 0.14, height: 0.055, depth }, scene)

  north.position.set(x, 0.055, z + depth / 2)
  south.position.set(x, 0.055, z - depth / 2)
  east.position.set(x + width / 2, 0.055, z)
  west.position.set(x - width / 2, 0.055, z)
  north.material = material
  south.material = material
  east.material = material
  west.material = material
}

function createFloorLightStrip(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  rotationY: number,
  material: StandardMaterial,
): void {
  const strip = MeshBuilder.CreateBox(name, { width, height: 0.05, depth: 0.08 }, scene)

  strip.position.set(x, 0.085, z)
  strip.rotation.y = rotationY
  strip.material = material
}
