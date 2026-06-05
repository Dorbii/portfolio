import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { AssemblyResources } from './botAssemblyAnimation'
import {
  createAssemblyMaterial,
  createAssemblyRoom,
  createTeamBayLights,
} from './botAssemblyRoom'

export function isAssemblyRendererSupported(): boolean {
  return Engine.isSupported()
}

export function createAssemblyResources(
  canvas: HTMLCanvasElement,
  role: TeamRole,
  submitted: boolean,
): AssemblyResources {
  const engine = new Engine(canvas, true, {
    antialias: true,
    preserveDrawingBuffer: true,
    stencil: true,
  })
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.025, 0.03, 0.035, 1)

  const camera = new ArcRotateCamera(
    'assembly-camera',
    -Math.PI * 0.58,
    1.05,
    7.4,
    new Vector3(0, 0.62, 0),
    scene,
  )
  camera.attachControl(canvas, true)
  camera.lowerRadiusLimit = 4.8
  camera.upperRadiusLimit = 10
  camera.wheelPrecision = 32

  const hemi = new HemisphericLight('assembly-hemi', new Vector3(0, 1, 0), scene)
  const key = new DirectionalLight('assembly-key', new Vector3(-0.45, -0.9, 0.35), scene)
  const rim = new PointLight('assembly-rim', new Vector3(0, 2.8, -2.8), scene)
  const teamLight = new PointLight(
    'assembly-team-light',
    new Vector3(role === 'red' ? -2.4 : 2.4, 1.8, 1.4),
    scene,
  )

  hemi.intensity = 0.45
  key.intensity = 1.15
  rim.intensity = 0.7
  teamLight.intensity = 0.95
  teamLight.diffuse = Color3.FromHexString(role === 'red' ? '#ff5c6c' : '#5c91ff')

  const scanBarMaterial = createAssemblyMaterial(scene, 'assembly-scan-mat', '#dff5ff', '#8bdfff', 0.72)
  const scanBar = MeshBuilder.CreateBox(
    'assembly-scan-bar',
    { width: 3.2, height: 0.045, depth: 0.1 },
    scene,
  )

  scanBar.position.set(0, 1.45, 0)
  scanBar.material = scanBarMaterial

  const rig = createAssemblyRoom(scene, role)
  const glow = new GlowLayer('assembly-glow', scene)
  glow.intensity = 0.42

  const bayLights = createTeamBayLights(scene, role)
  bayLights.forEach((light) => {
    light.intensity *= submitted ? 1 : 0.88
  })

  return {
    camera,
    engine,
    scene,
    rig,
    scanBar,
    botMeshes: [],
    startedAt: performance.now(),
  }
}
