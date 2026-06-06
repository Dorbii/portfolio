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
  const floorMaterial = createPbrSceneMaterial(scene, 'floor-pbr-mat', '#141718', '#010202', 0.72, 0.82, 'arena_floor')
  const seamMaterial = createSceneMaterial(scene, 'panel-mat', '#171d1f', '#020303', 1, 0.12)
  const wallMaterial = createSceneMaterial(scene, 'wall-mat', '#202629', '#040506', 1, 0.16)
  const apronMaterial = createPbrSceneMaterial(scene, 'arena-apron-pbr-mat', '#0b0e0f', '#010202', 0.7, 0.86, 'arena_apron')
  const glassMaterial = createSceneMaterial(scene, 'glass-mat', '#8bdfff', '#061824', 0.24, 0.5)
  const trimMaterial = createSceneMaterial(scene, 'arena-trim-mat', '#080b0c', '#010202')
  const warningMaterial = createSceneMaterial(scene, 'arena-warning-mat', '#b68d25', '#352104', 1, 0.16)
  const redPadMaterial = createSceneMaterial(scene, 'red-pad-mat', '#6c1b24', '#240508', 0.78, 0.22)
  const bluePadMaterial = createSceneMaterial(scene, 'blue-pad-mat', '#164572', '#041526', 0.78, 0.22)
  const redLightMaterial = createSceneMaterial(scene, 'red-led-mat', '#ff5968', '#ff2438', 1, 0.1)
  const blueLightMaterial = createSceneMaterial(scene, 'blue-led-mat', '#57adff', '#167fff', 1, 0.1)
  const whiteLightMaterial = createSceneMaterial(scene, 'white-led-mat', '#dfefff', '#9bd7ff', 1, 0.1)
  const hazardMaterial = createSceneMaterial(scene, 'hazard-mat', '#f0bd3c', '#654006', 1, 0.18)
  const hazardPitMaterial = createSceneMaterial(scene, 'hazard-pit-mat', '#08090a', '#010101', 1, 0.08)
  const hazardOilMaterial = createSceneMaterial(scene, 'hazard-oil-mat', '#0f1518', '#11202a', 0.74, 0.35)
  const hazardMagnetMaterial = createSceneMaterial(scene, 'hazard-magnet-mat', '#45515b', '#141b22', 1, 0.18)
  const hazardFlipperMaterial = createSceneMaterial(scene, 'hazard-flipper-mat', '#9b7722', '#3e2606', 1, 0.16)
  const hatchMaterial = createSceneMaterial(scene, 'hatch-mat', '#101416', '#020303')
  const centerMaterial = createSceneMaterial(scene, 'center-mark-mat', '#30383b', '#070b0e', 0.66)

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

    const material =
      hazard.kind === 'pit'
        ? hazardPitMaterial
        : hazard.kind === 'oil'
          ? hazardOilMaterial
          : hazard.kind === 'magnet'
            ? hazardMagnetMaterial
            : hazard.kind === 'flipper'
              ? hazardFlipperMaterial
              : hazardMaterial

    hazard.mesh.material = material
    hazard.mesh.getChildMeshes(false).forEach((child) => {
      child.material = material
    })
  })

  return hazardPlates
}


