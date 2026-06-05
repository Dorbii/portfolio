import { useEffect, useRef, useState } from 'react'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type {
  ArenaConfig,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { ReplayTimeline } from '../../../../packages/replay/src/index.js'
import {
  createArena,
  createCenterSpinner,
  updateHazards,
  type BabylonHazardVisual,
} from './babylonArena'
import {
  updateBots,
  type BotPartNodeMetadata,
} from './babylonBotPlayback'
import { createBotNode, createTeamMaterials } from './babylonPartRenderer'
import {
  createEffectPool,
  updateEffects,
  type EffectPool,
} from './babylonReplayEffects'
import { updateCamera } from './babylonReplayCamera'
import {
  buildReplayFrame,
  type CameraPreset,
} from './replayMapping'
import {
  createBotVisualProfiles,
  type BotVisualProfile,
  type ReplayBotBlueprints,
} from './replayVisualProfile'

type SceneResources = {
  engine: Engine
  scene: Scene
  camera: ArcRotateCamera
  bots: Record<TeamRole, ReturnType<typeof createBotNode>>
  botProfiles: Record<TeamRole, BotVisualProfile>
  effectPool: EffectPool
  hazards: BabylonHazardVisual[]
  centerSpinner: Mesh
}

type RendererState = {
  status: 'booting' | 'ready' | 'unavailable' | 'context_lost'
  message?: string
}

type ReplaySceneStats = {
  activeIndices: number
  activeMeshes: number
  fps: number
  materials: number
  meshes: number
  textures: number
  totalVertices: number
}

type ReplayDebugFocusOptions = {
  alpha?: number
  beta?: number
  blockId: string
  radius?: number
  role: TeamRole
  targetYOffset?: number
}

type ReplaySceneDebugApi = {
  focusPart?: (options: ReplayDebugFocusOptions) => boolean
  getStats: () => ReplaySceneStats
}

type BabylonReplaySceneProps = {
  arena: ArenaConfig
  botBlueprints: ReplayBotBlueprints
  cameraPreset: CameraPreset
  immediateCamera?: boolean
  timeline: ReplayTimeline
  time: number
}

declare global {
  interface Window {
    AgentArenaReplayDebug?: ReplaySceneDebugApi
  }
}

export function BabylonReplayScene({
  arena,
  botBlueprints,
  cameraPreset,
  immediateCamera = false,
  timeline,
  time,
}: BabylonReplaySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resourcesRef = useRef<SceneResources | null>(null)
  const [rendererState, setRendererState] = useState<RendererState>({
    status: 'booting',
  })
  const [sceneStats, setSceneStats] = useState<ReplaySceneStats | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let resources: SceneResources | null = null
    let disposed = false
    let statsFrame = 0

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
        1.05,
        Math.max(arena.width, arena.height) * 0.9,
        Vector3.Zero(),
        scene,
      )
      camera.attachControl(canvas, true)
      camera.lowerRadiusLimit = 4
      camera.upperRadiusLimit = Math.max(arena.width, arena.height) * 1.7
      camera.wheelPrecision = 28

      const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
      const key = new DirectionalLight('key', new Vector3(-0.45, -0.9, 0.4), scene)
      const fill = new DirectionalLight('fill', new Vector3(0.35, -0.75, -0.35), scene)
      const accent = new PointLight('accent', new Vector3(0, 3.8, 0), scene)
      const rim = new PointLight('rim', new Vector3(0, 1.4, 0), scene)
      const redSide = new PointLight('red-side', new Vector3(-arena.width * 0.42, 2.1, 0), scene)
      const blueSide = new PointLight('blue-side', new Vector3(arena.width * 0.42, 2.1, 0), scene)

      hemi.intensity = 0.48
      key.intensity = 1.05
      fill.intensity = 0.38
      accent.intensity = 0.58
      rim.intensity = 0.34
      redSide.intensity = 0.65
      blueSide.intensity = 0.65
      redSide.diffuse = Color3.FromHexString('#ff4356')
      blueSide.diffuse = Color3.FromHexString('#4ca9ff')
      accent.diffuse = Color3.FromHexString('#ffd36a')

      accent.position = new Vector3(0, 5.8, 0)
      rim.position = new Vector3(0, 5.1, -3)

      const teamMaterials = createTeamMaterials(scene)
      const hazards = createArena(scene, arena)
      const bots = {
        red: createBotNode(scene, botBlueprints.red, 'red', teamMaterials.red),
        blue: createBotNode(scene, botBlueprints.blue, 'blue', teamMaterials.blue),
      }
      const botProfiles = createBotVisualProfiles(botBlueprints)
      const effectPool = createEffectPool(scene)
      const centerSpinner = createCenterSpinner(scene)
      const glow = new GlowLayer('replay-glow', scene)

      glow.intensity = 0.32
      const replayDebugApi: ReplaySceneDebugApi = {
        getStats: () => createReplaySceneStats(scene, engine),
      }

      if (import.meta.env.DEV) {
        replayDebugApi.focusPart = (options) => {
          if (!resources) {
            return false
          }

          return focusReplayPart(resources, options)
        }
      }

      window.AgentArenaReplayDebug = replayDebugApi

      resources = {
        engine,
        scene,
        camera,
        bots,
        botProfiles,
        effectPool,
        hazards,
        centerSpinner,
      }
      resourcesRef.current = resources
      setRendererState({ status: 'ready' })
      setSceneStats(replayDebugApi.getStats())

      engine.runRenderLoop(() => {
        if (!disposed) {
          scene.render()
        }
      })

      let pendingStatsFrames = 10
      const refreshSceneStats = () => {
        if (!disposed) {
          if (pendingStatsFrames <= 0) {
            setSceneStats(replayDebugApi.getStats())
            return
          }

          pendingStatsFrames -= 1
          statsFrame = window.requestAnimationFrame(refreshSceneStats)
        }
      }

      statsFrame = window.requestAnimationFrame(refreshSceneStats)

      const resize = () => engine.resize()
      const handleContextLost = (event: Event) => {
        event.preventDefault()
        engine.stopRenderLoop()
        setRendererState({
          status: 'context_lost',
          message:
            'The replay canvas lost its WebGL context. Waiting for the browser to restore it.',
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
        window.cancelAnimationFrame(statsFrame)
        if (window.AgentArenaReplayDebug === replayDebugApi) {
          delete window.AgentArenaReplayDebug
        }
        resourcesRef.current = null
        resources?.scene.dispose()
        resources?.engine.dispose()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Replay renderer failed to start.'
      setRendererState({ status: 'unavailable', message })
      delete window.AgentArenaReplayDebug
      setSceneStats(null)
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
    updateBots(resources.bots, frame)
    updateEffects(resources.effectPool, frame.effects, resources.botProfiles)
    updateHazards(resources.hazards, frame)
    for (let pass = 0; pass < (immediateCamera ? 10 : 1); pass += 1) {
      updateCamera(resources.camera, cameraPreset, frame, arena)
    }
    resources.centerSpinner.rotation.y = time * 4
  }, [arena, cameraPreset, immediateCamera, timeline, time])

  return (
    <div
      className="babylon-stage"
      data-renderer-state={rendererState.status}
      data-replay-active-meshes={sceneStats?.activeMeshes}
      data-replay-fps={sceneStats?.fps.toFixed(1)}
      data-replay-materials={sceneStats?.materials}
      data-replay-meshes={sceneStats?.meshes}
      data-replay-textures={sceneStats?.textures}
      data-replay-total-vertices={sceneStats?.totalVertices}
    >
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

function createReplaySceneStats(scene: Scene, engine: Engine): ReplaySceneStats {
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

function focusReplayPart(resources: SceneResources, options: ReplayDebugFocusOptions): boolean {
  const bot = resources.bots[options.role]
  const node = bot.getChildren((candidate) => {
    const metadata = candidate.metadata as BotPartNodeMetadata | undefined

    return metadata?.kind === 'bot_part' && metadata.blockId === options.blockId
  }, true)[0] as TransformNode | undefined

  if (!node) {
    return false
  }

  const partCenter = node.getAbsolutePosition().add(new Vector3(0, options.targetYOffset ?? 0.45, 0))

  resources.camera.setTarget(partCenter)
  resources.camera.alpha = options.alpha ?? -Math.PI * 0.58
  resources.camera.beta = options.beta ?? 1.02
  resources.camera.radius = options.radius ?? 2.6

  return true
}
