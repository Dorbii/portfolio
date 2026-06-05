import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'

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
  const pad = MeshBuilder.CreateBox(
    `${role}-spawn-pad`,
    { width: 5.2, height: 0.036, depth: 3.4 },
    scene,
  )
  const beacon = MeshBuilder.CreateTorus(
    `${role}-spawn-beacon`,
    { diameter: 2.6, thickness: 0.09, tessellation: 24 },
    scene,
  )

  pad.position.set(x, 0.015, z)
  pad.material = padMaterial
  beacon.position.set(x, 0.08, z)
  beacon.rotation.x = Math.PI / 2
  beacon.material = lightMaterial

  createPadFrame(scene, `${role}-spawn-frame`, x, z, 5.5, 3.7, trimMaterial)
  createFloorLightStrip(scene, `${role}-spawn-led-front`, x, z - 1.72, 2.2, 0, lightMaterial)
  createFloorLightStrip(scene, `${role}-spawn-led-back`, x, z + 1.72, 2.2, 0, lightMaterial)
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

    const handle = MeshBuilder.CreateBox(
      `static-hazard-hatch-handle-${index}`,
      { width: 0.72, height: 0.06, depth: 0.12 },
      scene,
    )

    handle.position.set(x, 0.08, z)
    handle.material = trimMaterial
  })
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
