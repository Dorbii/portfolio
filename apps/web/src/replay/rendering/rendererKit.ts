import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import type { EngineOptions } from '@babylonjs/core/Engines/thinEngine'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../packages/schemas/src/index.js'

export type BabylonRendererCore = {
  camera: ArcRotateCamera
  engine: Engine
  scene: Scene
}

export type BabylonRendererStats = {
  activeIndices: number
  activeMeshes: number
  fps: number
  materials: number
  meshes: number
  textures: number
  totalVertices: number
}

type BabylonCameraConfig = {
  alpha: number
  beta: number
  lowerRadiusLimit?: number
  name: string
  radius: number
  target: Vector3
  upperRadiusLimit?: number
  wheelPrecision?: number
}

type BabylonRendererCoreOptions = {
  camera: BabylonCameraConfig
  clearColor: Color4
  environmentIntensity?: number
  engineOptions?: EngineOptions
}

export function isBabylonRendererSupported(): boolean {
  return Engine.isSupported()
}

export function createBabylonRendererCore(
  canvas: HTMLCanvasElement,
  options: BabylonRendererCoreOptions,
): BabylonRendererCore {
  const engine = new Engine(canvas, true, {
    antialias: true,
    preserveDrawingBuffer: true,
    stencil: true,
    ...options.engineOptions,
  })
  const scene = new Scene(engine)

  scene.clearColor = options.clearColor
  applyRendererEnvironment(scene, options.environmentIntensity ?? 0.42)

  const camera = new ArcRotateCamera(
    options.camera.name,
    options.camera.alpha,
    options.camera.beta,
    options.camera.radius,
    options.camera.target,
    scene,
  )

  camera.lowerRadiusLimit = options.camera.lowerRadiusLimit ?? null
  camera.upperRadiusLimit = options.camera.upperRadiusLimit ?? null
  camera.wheelPrecision = options.camera.wheelPrecision ?? camera.wheelPrecision

  return { camera, engine, scene }
}

function applyRendererEnvironment(scene: Scene, intensity: number): void {
  scene.environmentIntensity = intensity
  scene.createDefaultEnvironment({
    createGround: false,
    createSkybox: false,
    enableGroundShadow: false,
  })
}

export function disposeBabylonRendererCore(resources: BabylonRendererCore | null): void {
  resources?.scene.dispose()
  resources?.engine.dispose()
}

export function createReplayLightingPreset(scene: Scene, arenaWidth: number): void {
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  const key = new DirectionalLight('key', new Vector3(-0.45, -0.9, 0.4), scene)
  const fill = new DirectionalLight('fill', new Vector3(0.35, -0.75, -0.35), scene)
  const accent = new PointLight('accent', new Vector3(0, 3.8, 0), scene)
  const rim = new PointLight('rim', new Vector3(0, 1.4, 0), scene)
  const redSide = new PointLight('red-side', new Vector3(-arenaWidth * 0.42, 2.1, 0), scene)
  const blueSide = new PointLight('blue-side', new Vector3(arenaWidth * 0.42, 2.1, 0), scene)

  hemi.intensity = 0.22
  key.intensity = 0.92
  fill.intensity = 0.16
  accent.intensity = 0.5
  rim.intensity = 0.44
  redSide.intensity = 0.72
  blueSide.intensity = 0.72
  redSide.diffuse = Color3.FromHexString('#ff4356')
  blueSide.diffuse = Color3.FromHexString('#4ca9ff')
  accent.diffuse = Color3.FromHexString('#ffd36a')

  accent.position = new Vector3(0, 5.8, 0)
  rim.position = new Vector3(0, 5.1, -3)
}

export function createAssemblyLightingPreset(
  scene: Scene,
  role: TeamRole,
  submitted: boolean,
  teamAccent: string,
): void {
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
  teamLight.intensity = submitted ? 0.95 : 0.84
  teamLight.diffuse = Color3.FromHexString(teamAccent)
}

export function createCaptureLightingPreset(scene: Scene): void {
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  const key = new DirectionalLight('key', new Vector3(-0.45, -0.9, 0.4), scene)
  const fill = new DirectionalLight('fill', new Vector3(0.35, -0.75, -0.35), scene)
  const accent = new PointLight('accent', new Vector3(0, 4.2, 0), scene)
  const rim = new PointLight('rim', new Vector3(0, 3.4, -3), scene)
  const side = new PointLight('red-side', new Vector3(-2.8, 2.1, 1.8), scene)

  hemi.intensity = 0.78
  key.intensity = 1.32
  fill.intensity = 0.74
  accent.intensity = 0.78
  rim.intensity = 0.72
  side.intensity = 0.88
  side.diffuse = Color3.FromHexString('#ff4356')
  accent.diffuse = Color3.FromHexString('#ffd36a')
}

export function createRendererGlow(scene: Scene, name: string, intensity: number): GlowLayer {
  const glow = new GlowLayer(name, scene)

  glow.intensity = intensity

  return glow
}

export function createRendererStats(scene: Scene, engine: Engine): BabylonRendererStats {
  const fps = engine.getFps()

  return {
    activeIndices: scene.getActiveIndices(),
    activeMeshes: scene.getActiveMeshes().length,
    fps: Number.isFinite(fps) ? fps : 0,
    materials: scene.materials.length,
    meshes: scene.meshes.length,
    textures: scene.textures.length,
    totalVertices: scene.getTotalVertices(),
  }
}

export function createRendererBox(
  scene: Scene,
  name: string,
  options: Parameters<typeof MeshBuilder.CreateBox>[1],
  material?: Material,
) {
  const mesh = MeshBuilder.CreateBox(name, options, scene)

  if (material) {
    mesh.material = material
  }

  return mesh
}
