import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type { ArenaConfig } from '../../../../packages/schemas/src/index.js'
import {
  createPbrSceneMaterial,
  createSceneMaterial,
} from './babylonSceneUtils'
import {
  createHazardVisuals,
  updateHazards,
  type BabylonHazardVisual,
} from './babylonHazards'
import {
  createArenaLightBars,
  createBumperSegments,
  createCenterLogo,
  createFloorPlateDetails,
  createFloorSeams,
  createGlassPosts,
  createSpawnPad,
  createStaticTrapDoors,
} from './babylonArenaDecor'
import {
  createBoundaryPosts,
  createCornerMarkers,
  createGlass,
  createWall,
} from './babylonArenaStructures'
export { updateHazards }
export { createCenterSpinner } from './babylonArenaStructures'
export type { BabylonHazardVisual }

export function createArena(scene: Scene, arena: ArenaConfig): BabylonHazardVisual[] {
  const floorMaterial = createPbrSceneMaterial(scene, 'floor-pbr-mat', '#151a1a', '#020303', 0.62, 0.48)
  const seamMaterial = createSceneMaterial(scene, 'panel-mat', '#334043', '#060808', 1, 0.28)
  const wallMaterial = createSceneMaterial(scene, 'wall-mat', '#2b3134', '#050607', 1, 0.22)
  const apronMaterial = createPbrSceneMaterial(scene, 'arena-apron-pbr-mat', '#080b0d', '#010202', 0.72, 0.42)
  const glassMaterial = createSceneMaterial(scene, 'glass-mat', '#8bdfff', '#061824', 0.24, 0.5)
  const trimMaterial = createSceneMaterial(scene, 'arena-trim-mat', '#101315', '#030404')
  const warningMaterial = createSceneMaterial(scene, 'arena-warning-mat', '#d8ae33', '#4c3105', 1, 0.18)
  const redPadMaterial = createSceneMaterial(scene, 'red-pad-mat', '#8f2632', '#37080e', 0.9, 0.28)
  const bluePadMaterial = createSceneMaterial(scene, 'blue-pad-mat', '#1f5c97', '#061d34', 0.9, 0.28)
  const redLightMaterial = createSceneMaterial(scene, 'red-led-mat', '#ff5968', '#ff2438', 1, 0.1)
  const blueLightMaterial = createSceneMaterial(scene, 'blue-led-mat', '#57adff', '#167fff', 1, 0.1)
  const whiteLightMaterial = createSceneMaterial(scene, 'white-led-mat', '#dfefff', '#9bd7ff', 1, 0.1)
  const hazardMaterial = createSceneMaterial(scene, 'hazard-mat', '#f0bd3c', '#654006', 1, 0.18)
  const hatchMaterial = createSceneMaterial(scene, 'hatch-mat', '#101416', '#020303')
  const centerMaterial = createSceneMaterial(scene, 'center-mark-mat', '#5b676c', '#10161b', 0.78)

  const apron = MeshBuilder.CreateBox(
    'arena-apron',
    { width: arena.width + 1.2, height: 0.32, depth: arena.height + 1.2 },
    scene,
  )
  apron.position.y = -0.26
  apron.material = apronMaterial

  const floor = MeshBuilder.CreateBox(
    'arena-floor',
    { width: arena.width, height: 0.14, depth: arena.height },
    scene,
  )
  floor.position.y = -0.08
  floor.material = floorMaterial
  createFloorPlateDetails(scene, arena.width, arena.height, seamMaterial, trimMaterial)
  createFloorSeams(scene, arena.width, arena.height, seamMaterial)

  createWall(scene, 'north-wall', 0, arena.height / 2 + 0.03, arena.width, 0.26, wallMaterial)
  createWall(scene, 'south-wall', 0, -arena.height / 2 - 0.03, arena.width, 0.26, wallMaterial)
  createWall(scene, 'east-wall', arena.width / 2 + 0.03, 0, 0.26, arena.height, wallMaterial)
  createWall(scene, 'west-wall', -arena.width / 2 - 0.03, 0, 0.26, arena.height, wallMaterial)
  createBumperSegments(scene, arena.width, arena.height, warningMaterial, trimMaterial)
  createGlass(scene, 'north-glass', 0, arena.height / 2 - 0.14, arena.width, 0.08, glassMaterial)
  createGlass(scene, 'south-glass', 0, -arena.height / 2 + 0.14, arena.width, 0.08, glassMaterial)
  createGlass(scene, 'east-glass', arena.width / 2 - 0.14, 0, 0.08, arena.height, glassMaterial)
  createGlass(scene, 'west-glass', -arena.width / 2 + 0.14, 0, 0.08, arena.height, glassMaterial)
  createGlassPosts(scene, arena.width, arena.height, trimMaterial)
  createArenaLightBars(scene, arena.width, arena.height, redLightMaterial, blueLightMaterial, whiteLightMaterial)

  const marker = MeshBuilder.CreateTorus(
    'arena-center-mark',
    { diameter: 2.2, thickness: 0.03, tessellation: 40 },
    scene,
  )
  marker.position.y = 0.04
  marker.material = centerMaterial
  marker.rotation.x = Math.PI / 2
  createCenterLogo(scene, centerMaterial, whiteLightMaterial)

  createSpawnPad(
    scene,
    'red',
    -arena.width * 0.34,
    0,
    redPadMaterial,
    redLightMaterial,
    trimMaterial,
  )
  createSpawnPad(
    scene,
    'blue',
    arena.width * 0.34,
    0,
    bluePadMaterial,
    blueLightMaterial,
    trimMaterial,
  )
  createStaticTrapDoors(scene, arena.width, arena.height, hatchMaterial, warningMaterial, trimMaterial)

  const hazardPlates = createHazardVisuals(scene, arena)
  const arenaBoundaryPostMaterial = createSceneMaterial(scene, 'post-mat', '#171b20', '#050608')

  createBoundaryPosts(scene, arenaBoundaryPostMaterial, arena.width, arena.height)
  createCornerMarkers(scene, arena.width, arena.height, arenaBoundaryPostMaterial)
  marker.material = centerMaterial

  hazardPlates.forEach((hazard, index) => {
    if (hazard.kind === 'saw') {
      const ring = MeshBuilder.CreateTorus(
        `hazard-${index}-warning-ring`,
        { diameter: 1.55, thickness: 0.13, tessellation: 26 },
        scene,
      )
      ring.parent = hazard.mesh
      ring.material = hazardMaterial
      ring.position.y = 0.08
    }

    hazard.mesh.material = hazardMaterial
  })

  return hazardPlates
}


