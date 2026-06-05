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
