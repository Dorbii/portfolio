import { useEffect, useRef, useState } from 'react'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type {
  ArenaConfig,
  BotBlueprint,
  TeamRole,
  Vector3 as ReplayVector3,
} from '../../../../packages/schemas/src/index.js'
import type { ReplayTimeline } from '../../../../packages/replay/src/index.js'
import { createBotNode, createTeamMaterials } from './babylonPartRenderer'
import {
  buildReplayFrame,
  type CameraPreset,
  type ReplayEffectKind,
  type ReplayEffectState,
  type ReplayVisualFrame,
} from './replayMapping'

type ReplayBotBlueprints = Record<TeamRole, BotBlueprint>

type BabylonReplaySceneProps = {
  arena: ArenaConfig
  botBlueprints: ReplayBotBlueprints
  cameraPreset: CameraPreset
  timeline: ReplayTimeline
  time: number
}

type EffectPool = Record<ReplayEffectKind, Mesh[]>

type SceneResources = {
  engine: Engine
  scene: Scene
  camera: ArcRotateCamera
  bots: Record<TeamRole, ReturnType<typeof createBotNode>>
  effectPool: EffectPool
  saw: Mesh
}

type RendererState = {
  status: 'booting' | 'ready' | 'unavailable' | 'context_lost'
  message?: string
}

export function BabylonReplayScene({
  arena,
  botBlueprints,
  cameraPreset,
  timeline,
  time,
}: BabylonReplaySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resourcesRef = useRef<SceneResources | null>(null)
  const [rendererState, setRendererState] = useState<RendererState>({
    status: 'booting',
  })

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let resources: SceneResources | null = null
    let disposed = false

    try {
      if (!Engine.isSupported()) {
        setRendererState({
          status: 'unavailable',
          message: 'WebGL is not available in this browser context.',
        })

        return undefined
      }

      const engine = new Engine(canvas, true, {
        antialias: true,
        preserveDrawingBuffer: true,
        stencil: true,
      })
      const scene = new Scene(engine)
      scene.clearColor = new Color4(0.03, 0.04, 0.04, 1)

      const camera = new ArcRotateCamera(
        'replay-camera',
        -Math.PI / 2,
        1.02,
        Math.max(arena.width, arena.height) * 0.8,
        Vector3.Zero(),
        scene,
      )
      camera.attachControl(canvas, true)
      camera.lowerRadiusLimit = 4
      camera.upperRadiusLimit = Math.max(arena.width, arena.height) * 1.5
      camera.wheelPrecision = 32

      const hemi = new HemisphericLight('hemi-light', new Vector3(0, 1, 0), scene)
      hemi.intensity = 0.78

      const key = new DirectionalLight('key-light', new Vector3(-0.4, -1, 0.35), scene)
      key.intensity = 0.92

      const teamMaterials = createTeamMaterials(scene)
      createArena(scene, arena)

      const bots = {
        red: createBotNode(scene, botBlueprints.red, 'red', teamMaterials.red),
        blue: createBotNode(scene, botBlueprints.blue, 'blue', teamMaterials.blue),
      }
      const effectPool = createEffectPool(scene)
      const saw = createSaw(scene)

      resources = {
        engine,
        scene,
        camera,
        bots,
        effectPool,
        saw,
      }
      resourcesRef.current = resources
      setRendererState({ status: 'ready' })

      engine.runRenderLoop(() => {
        if (!disposed) {
          scene.render()
        }
      })

      const resize = () => engine.resize()
      const handleContextLost = (event: Event) => {
        event.preventDefault()
        engine.stopRenderLoop()
        setRendererState({
          status: 'context_lost',
          message: 'The replay canvas lost its WebGL context. Waiting for the browser to restore it.',
        })
      }
      const handleContextRestored = () => {
        if (disposed) {
          return
        }

        setRendererState({ status: 'ready' })
        engine.resize()
        engine.runRenderLoop(() => {
          if (!disposed) {
            scene.render()
          }
        })
      }

      window.addEventListener('resize', resize)
      canvas.addEventListener('webglcontextlost', handleContextLost)
      canvas.addEventListener('webglcontextrestored', handleContextRestored)

      return () => {
        disposed = true
        window.removeEventListener('resize', resize)
        canvas.removeEventListener('webglcontextlost', handleContextLost)
        canvas.removeEventListener('webglcontextrestored', handleContextRestored)
        resourcesRef.current = null
        resources?.scene.dispose()
        resources?.engine.dispose()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Replay renderer failed to start.'
      setRendererState({ status: 'unavailable', message })
      resourcesRef.current = null
      resources?.scene.dispose()
      resources?.engine.dispose()

      return undefined
    }
  }, [arena, botBlueprints])

  useEffect(() => {
    const resources = resourcesRef.current

    if (!resources) {
      return
    }

    const frame = buildReplayFrame(timeline, time)
    updateBots(resources, frame)
    updateEffects(resources.effectPool, frame.effects)
    updateCamera(resources.camera, cameraPreset, frame, arena)
    resources.saw.rotation.y = time * 5
  }, [arena, cameraPreset, timeline, time])

  return (
    <div className="babylon-stage" data-renderer-state={rendererState.status}>
      <canvas
        ref={canvasRef}
        aria-label="Babylon replay scene"
        aria-hidden={rendererState.status === 'unavailable'}
        hidden={rendererState.status === 'unavailable'}
      />
      {rendererState.status !== 'ready' && rendererState.status !== 'booting' ? (
        <div className="replay-error" role="status">
          <strong>Replay renderer unavailable</strong>
          <span>{rendererState.message}</span>
        </div>
      ) : null}
    </div>
  )
}

function createArena(scene: Scene, arena: ArenaConfig): void {
  const floorMaterial = createSceneMaterial(scene, 'floor-mat', '#252b29', '#050606')
  const panelMaterial = createSceneMaterial(scene, 'panel-mat', '#303835', '#070909')
  const wallMaterial = createSceneMaterial(scene, 'wall-mat', '#5e6867', '#080a0a')
  const glassMaterial = createSceneMaterial(scene, 'glass-mat', '#8fd5ff', '#06121a', 0.24)
  const redPadMaterial = createSceneMaterial(scene, 'red-pad-mat', '#64232b', '#2a080d', 0.9)
  const bluePadMaterial = createSceneMaterial(scene, 'blue-pad-mat', '#1c416b', '#061626', 0.9)
  const hazardMaterial = createSceneMaterial(scene, 'hazard-mat', '#d2a83d', '#49320a')

  const floor = MeshBuilder.CreateBox(
    'arena-floor',
    { width: arena.width, height: 0.14, depth: arena.height },
    scene,
  )
  floor.position.y = -0.08
  floor.material = floorMaterial

  const panelCount = 7

  for (let index = 1; index < panelCount; index += 1) {
    const x = -arena.width / 2 + (arena.width / panelCount) * index
    const seam = MeshBuilder.CreateBox(
      `floor-seam-x-${index}`,
      { width: 0.035, height: 0.012, depth: arena.height - 1.2 },
      scene,
    )
    seam.position.set(x, 0.006, 0)
    seam.material = panelMaterial
  }

  for (let index = 1; index < 5; index += 1) {
    const z = -arena.height / 2 + (arena.height / 5) * index
    const seam = MeshBuilder.CreateBox(
      `floor-seam-z-${index}`,
      { width: arena.width - 1.2, height: 0.012, depth: 0.035 },
      scene,
    )
    seam.position.set(0, 0.008, z)
    seam.material = panelMaterial
  }

  createWall(scene, 'north-wall', 0, arena.height / 2, arena.width, 0.28, wallMaterial)
  createWall(scene, 'south-wall', 0, -arena.height / 2, arena.width, 0.28, wallMaterial)
  createWall(scene, 'east-wall', arena.width / 2, 0, 0.28, arena.height, wallMaterial)
  createWall(scene, 'west-wall', -arena.width / 2, 0, 0.28, arena.height, wallMaterial)
  createGlass(scene, 'north-glass', 0, arena.height / 2 - 0.18, arena.width, 0.08, glassMaterial)
  createGlass(scene, 'south-glass', 0, -arena.height / 2 + 0.18, arena.width, 0.08, glassMaterial)
  createGlass(scene, 'east-glass', arena.width / 2 - 0.18, 0, 0.08, arena.height, glassMaterial)
  createGlass(scene, 'west-glass', -arena.width / 2 + 0.18, 0, 0.08, arena.height, glassMaterial)

  const redPad = MeshBuilder.CreateBox(
    'red-spawn-pad',
    { width: 4.6, height: 0.035, depth: 3.2 },
    scene,
  )
  redPad.position.set(-arena.width * 0.33, 0.015, 0)
  redPad.material = redPadMaterial

  const bluePad = MeshBuilder.CreateBox(
    'blue-spawn-pad',
    { width: 4.6, height: 0.035, depth: 3.2 },
    scene,
  )
  bluePad.position.set(arena.width * 0.33, 0.015, 0)
  bluePad.material = bluePadMaterial

  const centerMark = MeshBuilder.CreateTorus(
    'center-mark',
    { diameter: 2.3, thickness: 0.035, tessellation: 48 },
    scene,
  )
  centerMark.position.y = 0.04
  centerMark.material = hazardMaterial
}

function createWall(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  material: StandardMaterial,
): void {
  const wall = MeshBuilder.CreateBox(name, { width, height: 0.72, depth }, scene)

  wall.position.set(x, 0.34, z)
  wall.material = material
}

function createGlass(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  material: StandardMaterial,
): void {
  const glass = MeshBuilder.CreateBox(name, { width, height: 1.25, depth }, scene)

  glass.position.set(x, 1.06, z)
  glass.material = material
}

function createSaw(scene: Scene): Mesh {
  const material = createSceneMaterial(scene, 'saw-mat', '#f0c24a', '#4d3107')
  const saw = MeshBuilder.CreateCylinder(
    'center-saw',
    { height: 0.08, diameter: 1.3, tessellation: 16 },
    scene,
  )

  saw.position.y = 0.08
  saw.material = material

  return saw
}

function createEffectPool(scene: Scene): EffectPool {
  const sparkMaterial = createSceneMaterial(scene, 'spark-mat', '#ffd35f', '#ff8a24')
  const smokeMaterial = createSceneMaterial(scene, 'smoke-mat', '#aeb8b4', '#151918', 0.42)
  const weaponMaterial = createSceneMaterial(scene, 'weapon-flash-mat', '#f7f2b4', '#f7c24b')
  const hazardMaterial = createSceneMaterial(scene, 'hazard-flash-mat', '#ffcc4d', '#ff751f')
  const koMaterial = createSceneMaterial(scene, 'ko-mat', '#f4eef2', '#b83342')

  return {
    weapon_fire: Array.from({ length: 4 }, (_, index) =>
      createPooledBox(scene, `weapon-effect-${index}`, weaponMaterial, [0.18, 0.18, 1.2]),
    ),
    impact: Array.from({ length: 8 }, (_, index) =>
      createPooledSphere(scene, `impact-effect-${index}`, sparkMaterial, 0.34),
    ),
    smoke: Array.from({ length: 8 }, (_, index) =>
      createPooledSphere(scene, `smoke-effect-${index}`, smokeMaterial, 0.5),
    ),
    hazard: Array.from({ length: 4 }, (_, index) =>
      createPooledTorus(scene, `hazard-effect-${index}`, hazardMaterial, 1.2),
    ),
    knockout: Array.from({ length: 2 }, (_, index) =>
      createPooledTorus(scene, `knockout-effect-${index}`, koMaterial, 1.9),
    ),
  }
}

function createPooledBox(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  size: [number, number, number],
): Mesh {
  const mesh = MeshBuilder.CreateBox(
    name,
    { width: size[0], height: size[1], depth: size[2] },
    scene,
  )

  mesh.material = material
  mesh.setEnabled(false)

  return mesh
}

function createPooledSphere(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  diameter: number,
): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 12 }, scene)

  mesh.material = material
  mesh.setEnabled(false)

  return mesh
}

function createPooledTorus(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  diameter: number,
): Mesh {
  const mesh = MeshBuilder.CreateTorus(
    name,
    { diameter, thickness: 0.055, tessellation: 32 },
    scene,
  )

  mesh.material = material
  mesh.setEnabled(false)

  return mesh
}

function updateBots(resources: SceneResources, frame: ReplayVisualFrame): void {
  const roles: TeamRole[] = ['red', 'blue']

  roles.forEach((role) => {
    const bot = resources.bots[role]
    const state = frame.bots[role]

    bot.position = toBabylonVector(state.position)
    bot.position.y = state.status === 'knocked_out' ? 0.08 : 0.16
    bot.rotation.y = state.rotationY
    bot.rotation.z = state.status === 'knocked_out' ? (role === 'red' ? -0.18 : 0.18) : 0
  })
}

function updateEffects(pool: EffectPool, effects: ReplayEffectState[]): void {
  const used: Record<ReplayEffectKind, number> = {
    weapon_fire: 0,
    impact: 0,
    smoke: 0,
    hazard: 0,
    knockout: 0,
  }

  Object.values(pool).flat().forEach((mesh) => mesh.setEnabled(false))

  effects.forEach((effect) => {
    const mesh = pool[effect.kind][used[effect.kind]]

    if (!mesh) {
      return
    }

    used[effect.kind] += 1
    mesh.setEnabled(true)
    mesh.position = toBabylonVector(effect.position)

    if (effect.kind === 'weapon_fire') {
      const direction = effect.team === 'blue' ? -1 : 1
      mesh.position.x += direction * 0.66
      mesh.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2
      mesh.scaling.set(1, 1, Math.max(0.2, effect.intensity))
    }

    if (effect.kind === 'impact') {
      mesh.position.y += 0.5
      mesh.scaling.setAll(0.45 + effect.intensity * 1.4)
    }

    if (effect.kind === 'smoke') {
      mesh.position.y += effect.age * 0.46
      mesh.scaling.setAll(0.42 + effect.age * 0.68)
    }

    if (effect.kind === 'hazard') {
      mesh.position.y = 0.1
      mesh.scaling.setAll(0.8 + effect.intensity * 1.1)
    }

    if (effect.kind === 'knockout') {
      mesh.position.y = 0.18
      mesh.scaling.setAll(1 + Math.min(effect.age, 3) * 0.12)
    }
  })
}

function updateCamera(
  camera: ArcRotateCamera,
  preset: CameraPreset,
  frame: ReplayVisualFrame,
  arena: ArenaConfig,
): void {
  const red = toBabylonVector(frame.bots.red.position)
  const blue = toBabylonVector(frame.bots.blue.position)
  const midpoint = Vector3.Center(red, blue)
  const impact = frame.effects.find((effect) => effect.kind === 'impact')
  const target = impact ? toBabylonVector(impact.position) : midpoint
  const arenaRadius = Math.max(arena.width, arena.height)

  if (preset === 'wide') {
    setCamera(camera, Vector3.Zero(), -Math.PI / 2, 1.02, arenaRadius * 0.86)
  } else if (preset === 'broadcast') {
    setCamera(camera, midpoint, -Math.PI * 0.68, 1.05, arenaRadius * 0.62)
  } else if (preset === 'red_follow') {
    setCamera(camera, red, -Math.PI * 0.56, 0.94, 7.4)
  } else if (preset === 'blue_follow') {
    setCamera(camera, blue, -Math.PI * 0.44, 0.94, 7.4)
  } else {
    setCamera(camera, target, -Math.PI * 0.5, 0.82, 8.6)
  }
}

function setCamera(
  camera: ArcRotateCamera,
  target: Vector3,
  alpha: number,
  beta: number,
  radius: number,
): void {
  camera.setTarget(target)
  camera.alpha = alpha
  camera.beta = beta
  camera.radius = radius
}

function createSceneMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
  alpha = 1,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.specularColor = new Color3(0.16, 0.16, 0.14)
  material.alpha = alpha

  return material
}

function toBabylonVector(vector: ReplayVector3): Vector3 {
  return new Vector3(vector[0], vector[1], vector[2])
}
