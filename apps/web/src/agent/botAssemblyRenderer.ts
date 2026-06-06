import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type {
  TeamIdentity,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
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
  createCombatTeamPalette,
} from '../replay/babylonMaterials'

export function isAssemblyRendererSupported(): boolean {
  return isBabylonRendererSupported()
}

export function createAssemblyResources(
  canvas: HTMLCanvasElement,
  role: TeamRole,
  identity: TeamIdentity,
  submitted: boolean,
): AssemblyResources {
  const { camera, engine, scene } = createBabylonRendererCore(canvas, {
    camera: {
      alpha: -Math.PI * 0.46,
      beta: 0.98,
      lowerRadiusLimit: 4.9,
      name: 'assembly-camera',
      radius: 6.3,
      target: new Vector3(0, 0.58, -0.32),
      upperRadiusLimit: 7.6,
      wheelPrecision: 54,
    },
    clearColor: new Color4(0.025, 0.03, 0.035, 1),
  })

  camera.lowerAlphaLimit = camera.alpha
  camera.upperAlphaLimit = camera.alpha
  camera.lowerBetaLimit = camera.beta
  camera.upperBetaLimit = camera.beta
  camera.panningSensibility = 0
  camera.attachControl(canvas, true)
  const teamPalette = createCombatTeamPalette(role, identity)

  createAssemblyLightingPreset(scene, role, submitted, teamPalette.glow)
  const materials = createBotMaterialSet(scene, role, teamPalette)

  const scanBarMaterial = createAssemblyMaterial(scene, 'assembly-scan-mat', '#dff5ff', '#8bdfff', 0.52)
  const scanBar = createRendererBox(
    scene,
    'assembly-scan-bar',
    { width: 2.2, height: 0.026, depth: 0.06 },
    scanBarMaterial,
  )

  scanBar.position.set(0, 1.48, -0.28)

  const rig = createAssemblyRoom(scene, role)
  createRendererGlow(scene, 'assembly-glow', 0.42)

  const bayLights = createTeamBayLights(scene, teamPalette.glow)
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
    botAssemblyNodes: [],
    botMeshes: [],
    startedAt: performance.now(),
  }
}
