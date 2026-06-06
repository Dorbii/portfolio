import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { AssemblyResources } from './botAssemblyAnimation'
import {
  createAssemblyMaterial,
  createAssemblyRoom,
  createTeamBayLights,
} from './botAssemblyRoom'
import {
  createAssemblyLightingPreset,
  createBabylonRendererCore,
  createRendererBox,
  createRendererGlow,
  isBabylonRendererSupported,
} from '../replay/babylonRendererKit'
import {
  createBotMaterialSet,
  DEFAULT_TEAM_PALETTES,
} from '../replay/babylonMaterials'

export function isAssemblyRendererSupported(): boolean {
  return isBabylonRendererSupported()
}

export function createAssemblyResources(
  canvas: HTMLCanvasElement,
  role: TeamRole,
  submitted: boolean,
): AssemblyResources {
  const { camera, engine, scene } = createBabylonRendererCore(canvas, {
    camera: {
      alpha: -Math.PI * 0.58,
      beta: 1.05,
      lowerRadiusLimit: 4.8,
      name: 'assembly-camera',
      radius: 7.4,
      target: new Vector3(0, 0.62, 0),
      upperRadiusLimit: 10,
      wheelPrecision: 32,
    },
    clearColor: new Color4(0.025, 0.03, 0.035, 1),
  })

  camera.attachControl(canvas, true)
  createAssemblyLightingPreset(scene, role, submitted)
  const materials = createBotMaterialSet(scene, role, DEFAULT_TEAM_PALETTES[role])

  const scanBarMaterial = createAssemblyMaterial(scene, 'assembly-scan-mat', '#dff5ff', '#8bdfff', 0.72)
  const scanBar = createRendererBox(
    scene,
    'assembly-scan-bar',
    { width: 3.2, height: 0.045, depth: 0.1 },
    scanBarMaterial,
  )

  scanBar.position.set(0, 1.45, 0)

  const rig = createAssemblyRoom(scene, role)
  createRendererGlow(scene, 'assembly-glow', 0.42)

  const bayLights = createTeamBayLights(scene, role)
  bayLights.forEach((light) => {
    light.intensity *= submitted ? 1 : 0.88
  })

  return {
    camera,
    engine,
    materials,
    scene,
    rig,
    scanBar,
    botMeshes: [],
    startedAt: performance.now(),
  }
}
