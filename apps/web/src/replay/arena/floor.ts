import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'

export function createFloorPlateDetails(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  seamMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const panelWidth = arenaWidth / 4
  const panelDepth = arenaHeight / 3

  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      const x = -arenaWidth / 2 + panelWidth * (column + 0.5)
      const z = -arenaHeight / 2 + panelDepth * (row + 0.5)
      const plate = MeshBuilder.CreateBox(
        `floor-plate-${column}-${row}`,
        { width: panelWidth - 0.24, height: 0.018, depth: panelDepth - 0.24 },
        scene,
      )

      plate.position.set(x, -0.002, z)
      plate.material = column === 1 || column === 2 ? seamMaterial : trimMaterial
      createPlateCornerBolts(scene, `floor-plate-${column}-${row}`, x, z, panelWidth, panelDepth, trimMaterial)
    }
  }

  for (let column = 0; column <= 4; column += 1) {
    for (let row = 0; row <= 3; row += 1) {
      const bolt = MeshBuilder.CreateCylinder(
        `floor-bolt-${column}-${row}`,
        { height: 0.035, diameter: 0.09, tessellation: 8 },
        scene,
      )

      bolt.position.set(
        -arenaWidth / 2 + column * panelWidth,
        0.028,
        -arenaHeight / 2 + row * panelDepth,
      )
      bolt.rotation.x = Math.PI / 2
      bolt.material = trimMaterial
    }
  }

  createServiceTrenches(scene, arenaWidth, arenaHeight, seamMaterial)
  createImpactScars(scene, arenaWidth, arenaHeight, seamMaterial, trimMaterial)
}

export function createFloorSeams(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  seamMaterial: StandardMaterial,
): void {
  const seamColumns = 8
  const seamRows = 6

  for (let index = 1; index < seamColumns; index += 1) {
    const x = -arenaWidth / 2 + (arenaWidth / seamColumns) * index
    const seam = MeshBuilder.CreateBox(
      `floor-seam-x-${index}`,
      { width: 0.038, height: 0.012, depth: arenaHeight - 1.45 },
      scene,
    )
    seam.position.set(x, 0.007, 0)
    seam.material = seamMaterial
  }

  for (let index = 1; index < seamRows; index += 1) {
    const z = -arenaHeight / 2 + (arenaHeight / seamRows) * index
    const seam = MeshBuilder.CreateBox(
      `floor-seam-z-${index}`,
      { width: arenaWidth - 1.45, height: 0.012, depth: 0.038 },
      scene,
    )
    seam.position.set(0, 0.007, z)
    seam.material = seamMaterial
  }
}

function createPlateCornerBolts(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  panelWidth: number,
  panelDepth: number,
  material: StandardMaterial,
): void {
  const insetX = panelWidth * 0.36
  const insetZ = panelDepth * 0.34

  for (const [offsetX, offsetZ] of [
    [-insetX, -insetZ],
    [insetX, -insetZ],
    [-insetX, insetZ],
    [insetX, insetZ],
  ]) {
    const bolt = MeshBuilder.CreateCylinder(
      `${name}-corner-bolt-${offsetX}-${offsetZ}`,
      { height: 0.028, diameter: 0.075, tessellation: 8 },
      scene,
    )

    bolt.position.set(x + offsetX, 0.032, z + offsetZ)
    bolt.rotation.x = Math.PI / 2
    bolt.material = material
  }
}

function createServiceTrenches(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  material: StandardMaterial,
): void {
  const trenchPositions = [
    [-arenaWidth * 0.18, 0, arenaHeight * 0.5 - 2.05],
    [arenaWidth * 0.18, 0, -arenaHeight * 0.5 + 2.05],
    [0, Math.PI / 2, arenaHeight * 0.17],
    [0, Math.PI / 2, -arenaHeight * 0.17],
  ] as const

  trenchPositions.forEach(([x, rotationY, z], index) => {
    const trench = MeshBuilder.CreateBox(
      `floor-service-trench-${index}`,
      { width: 1.55, height: 0.018, depth: 0.095 },
      scene,
    )

    trench.position.set(x, 0.038, z)
    trench.rotation.y = rotationY
    trench.material = material
  })
}

function createImpactScars(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  scarMaterial: StandardMaterial,
  patchMaterial: StandardMaterial,
): void {
  const scars = [
    [-arenaWidth * 0.16, -arenaHeight * 0.08, -0.34, 1.1],
    [arenaWidth * 0.18, arenaHeight * 0.08, 0.42, 0.94],
    [-arenaWidth * 0.3, arenaHeight * 0.18, 0.2, 0.78],
    [arenaWidth * 0.31, -arenaHeight * 0.16, -0.16, 0.72],
    [0.8, 0.42, 0.74, 0.64],
    [-0.95, -0.5, -0.6, 0.58],
  ] as const

  scars.forEach(([x, z, rotationY, width], index) => {
    const scar = MeshBuilder.CreateBox(
      `floor-impact-scar-${index}`,
      { width, height: 0.016, depth: 0.045 },
      scene,
    )

    scar.position.set(x, 0.046, z)
    scar.rotation.y = rotationY
    scar.material = scarMaterial
  })

  for (let index = 0; index < 4; index += 1) {
    const patch = MeshBuilder.CreateBox(
      `floor-weld-patch-${index}`,
      { width: 0.86, height: 0.014, depth: 0.42 },
      scene,
    )
    const sign = index % 2 === 0 ? -1 : 1

    patch.position.set(sign * arenaWidth * 0.12, 0.041, (index < 2 ? -1 : 1) * arenaHeight * 0.2)
    patch.rotation.y = sign * 0.18
    patch.material = patchMaterial
  }
}
