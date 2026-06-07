import { useEffect, useRef, useState } from 'react'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type {
  ArenaConfig,
  TeamRole,
} from '../../../../../packages/schemas/src/index.js'
import type { ReplayTimeline } from '../../../../../packages/replay/src/index.js'
import type { LegacyTeamIdentity } from '../../shared/teamVisuals'
import {
  createArena,
  updateHazards,
  type BabylonHazardVisual,
} from '../arena'
import {
  updateBots,
  type BotPartNodeMetadata,
} from '../bots/playback'
import { createBotNode, createTeamMaterials } from '../parts'
import {
  createEffectPool,
  updateEffects,
  type EffectPool,
} from '../effects/replayEffects'
import { updateCamera } from '../camera/replayCamera'
import {
  BABYLON_RENDERER_BUDGETS,
  createBabylonRendererBudgetState,
} from '../rendering/rendererBudgets'
import {
  createBabylonRendererCore,
  createRendererGlow,
  createRendererStats,
  createReplayLightingPreset,
  disposeBabylonRendererCore,
  isBabylonRendererSupported,
  type BabylonRendererCore,
  type BabylonRendererStats,
} from '../rendering/rendererKit'
import {
  buildReplayFrame,
  type CameraPreset,
} from '../replayMapping'
import {
  createBotVisualProfiles,
  type BotVisualProfile,
  type ReplayBotBlueprints,
} from '../replayVisualProfile'

type SceneResources = BabylonRendererCore & {
  bots: Record<TeamRole, ReturnType<typeof createBotNode>>
  botProfiles: Record<TeamRole, BotVisualProfile>
  effectPool: EffectPool
  hazards: BabylonHazardVisual[]
}

type RendererState = {
  status: 'booting' | 'ready' | 'unavailable' | 'context_lost'
  message?: string
}

type ReplaySceneStats = BabylonRendererStats

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
  teamIdentities: Record<TeamRole, LegacyTeamIdentity>
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
  teamIdentities,
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
      if (!isBabylonRendererSupported()) {
        setRendererState({
          status: 'unavailable',
          message: 'WebGL is not available in this browser context.',
        })

        return undefined
      }

      const core = createBabylonRendererCore(canvas, {
        camera: {
          alpha: -Math.PI / 2,
          beta: 1.05,
          lowerRadiusLimit: 4,
          name: 'replay-camera',
          radius: Math.max(arena.width, arena.height) * 0.9,
          target: Vector3.Zero(),
          upperRadiusLimit: Math.max(arena.width, arena.height) * 1.7,
          wheelPrecision: 28,
        },
        clearColor: new Color4(0.03, 0.04, 0.04, 1),
        environmentIntensity: 0.18,
      })
      const { camera, engine, scene } = core

      configureReplayCameraControls(camera)
      camera.attachControl(canvas, true)
      createReplayLightingPreset(scene, arena.width)

      const teamMaterials = createTeamMaterials(scene, { identities: teamIdentities })
      const hazards = createArena(scene, arena)
      const bots = {
        red: createBotNode(scene, botBlueprints.red, 'red', teamMaterials.red),
        blue: createBotNode(scene, botBlueprints.blue, 'blue', teamMaterials.blue),
      }
      const botProfiles = createBotVisualProfiles(botBlueprints, { identities: teamIdentities })
      const effectPool = createEffectPool(scene)
      createRendererGlow(scene, 'replay-glow', 0.32)
      const replayDebugApi: ReplaySceneDebugApi = {
        getStats: () => createRendererStats(scene, engine),
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
        ...core,
        bots,
        botProfiles,
        effectPool,
        hazards,
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
        disposeBabylonRendererCore(resources)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Replay renderer failed to start.'
      setRendererState({ status: 'unavailable', message })
      delete window.AgentArenaReplayDebug
      setSceneStats(null)
      resourcesRef.current = null
      disposeBabylonRendererCore(resources)

      return undefined
    }
  }, [arena, botBlueprints, teamIdentities])

  useEffect(() => {
    const resources = resourcesRef.current

    if (!resources) {
      return
    }

    const frame = buildReplayFrame(timeline, time)
    updateBots(resources.bots, frame)
    updateEffects(resources.effectPool, frame.effects, resources.botProfiles, resources.bots)
    updateHazards(resources.hazards, frame)
    for (let pass = 0; pass < (immediateCamera ? 10 : 1); pass += 1) {
      updateCamera(resources.camera, cameraPreset, frame, arena)
    }
  }, [arena, cameraPreset, immediateCamera, timeline, time])

  const rendererBudgetState = sceneStats
    ? createBabylonRendererBudgetState(sceneStats, BABYLON_RENDERER_BUDGETS.replayPreview)
    : null

  return (
    <div
      className="babylon-stage"
      data-renderer-state={rendererState.status}
      data-renderer-active-meshes={sceneStats?.activeMeshes}
      data-renderer-budget-active-meshes={BABYLON_RENDERER_BUDGETS.replayPreview.activeMeshes}
      data-renderer-budget-breaches={rendererBudgetState?.breaches.join('|')}
      data-renderer-budget-materials={BABYLON_RENDERER_BUDGETS.replayPreview.materials}
      data-renderer-budget-meshes={BABYLON_RENDERER_BUDGETS.replayPreview.meshes}
      data-renderer-budget-state={rendererBudgetState?.status}
      data-renderer-budget-textures={BABYLON_RENDERER_BUDGETS.replayPreview.textures}
      data-renderer-budget-total-vertices={BABYLON_RENDERER_BUDGETS.replayPreview.totalVertices}
      data-renderer-fps={sceneStats?.fps.toFixed(1)}
      data-renderer-materials={sceneStats?.materials}
      data-renderer-meshes={sceneStats?.meshes}
      data-renderer-textures={sceneStats?.textures}
      data-renderer-total-vertices={sceneStats?.totalVertices}
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

function configureReplayCameraControls(camera: BabylonRendererCore['camera']): void {
  camera.lowerBetaLimit = 0.56
  camera.upperBetaLimit = 1.26
  camera.panningSensibility = 0
}
