import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { ArenaConfig, TeamRole } from '../../../../../packages/schemas/src/index.js'
import {
  createArena,
  updateHazardsAtTime,
  type BabylonHazardVisual,
} from './index'
import {
  buildLiveArenaFrame,
  liveArenaVisualKey,
  type LiveArenaStageState,
} from './liveArenaFrame'
import {
  updateBots,
} from '../bots/playback'
import {
  createEffectPool,
  updateEffects,
  type EffectPool,
} from '../effects/replayEffects'
import {
  createBotNode,
  createTeamMaterials,
} from '../parts'
import {
  createBotVisualProfiles,
  type BotVisualProfile,
} from '../replayVisualProfile'
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
  advanceLivePlaybackBuffer,
  createLivePlaybackBuffer,
  type LiveCombatTimeline,
  type LivePlaybackBufferSnapshot,
} from './liveCombatTimeline'

type ArenaPreviewResources = BabylonRendererCore & {
  botProfiles?: Record<TeamRole, BotVisualProfile>
  bots?: Record<TeamRole, ReturnType<typeof createBotNode>>
  effectPool: EffectPool
  hazards: BabylonHazardVisual[]
}

type RendererState = {
  status: 'booting' | 'ready' | 'unavailable' | 'context_lost'
  message?: string
}

type ArenaPreviewSceneProps = {
  arena: ArenaConfig
  liveBots?: LiveArenaStageState
  liveCombatTimeline?: LiveCombatTimeline | null
  onLivePlaybackStatus?: (status: LivePlaybackBufferSnapshot | null) => void
}

export function ArenaPreviewScene({
  arena,
  liveBots,
  liveCombatTimeline,
  onLivePlaybackStatus,
}: ArenaPreviewSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const liveBotsRef = useRef<LiveArenaStageState | undefined>(liveBots)
  const liveCombatTimelineRef = useRef<LiveCombatTimeline | null | undefined>(liveCombatTimeline)
  const livePlaybackBufferRef = useRef(createLivePlaybackBuffer())
  const onLivePlaybackStatusRef = useRef(onLivePlaybackStatus)
  const lastLivePlaybackStatusKeyRef = useRef('')
  const [rendererState, setRendererState] = useState<RendererState>({ status: 'booting' })
  const [livePlaybackStatus, setLivePlaybackStatus] = useState<LivePlaybackBufferSnapshot | null>(null)
  const [sceneStats, setSceneStats] = useState<BabylonRendererStats | null>(null)
  const activeHazardsKey = arena.activeHazards.join('|')
  const liveBotsKey = liveArenaVisualKey(liveBots)

  useEffect(() => {
    liveBotsRef.current = liveBots
  }, [liveBots])

  useEffect(() => {
    liveCombatTimelineRef.current = liveCombatTimeline
  }, [liveCombatTimeline])

  useEffect(() => {
    onLivePlaybackStatusRef.current = onLivePlaybackStatus
  }, [onLivePlaybackStatus])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let resources: ArenaPreviewResources | null = null
    let disposed = false
    let statsFrame = 0
    let start = performance.now()
    const sceneArena = {
      name: arena.name,
      width: arena.width,
      height: arena.height,
      activeHazards: activeHazardsKey ? activeHazardsKey.split('|') : [],
    }

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
          beta: 1.02,
          lowerRadiusLimit: 4,
          name: 'arena-preview-camera',
          radius: Math.max(sceneArena.width, sceneArena.height) * 0.92,
          target: Vector3.Zero(),
          upperRadiusLimit: Math.max(sceneArena.width, sceneArena.height) * 1.55,
          wheelPrecision: 30,
        },
        clearColor: new Color4(0.025, 0.032, 0.035, 1),
        environmentIntensity: 0.2,
      })
      const { camera, engine, scene } = core
      const initialLiveBots = liveBotsRef.current

      camera.attachControl(canvas, true)
      createReplayLightingPreset(scene, sceneArena.width, {
        identities: initialLiveBots
          ? {
              blue: initialLiveBots.blue.identity,
              red: initialLiveBots.red.identity,
            }
          : undefined,
      })

      const hazards = createArena(scene, sceneArena)
      const teamMaterials = initialLiveBots
        ? createTeamMaterials(scene, {
            identities: {
              blue: initialLiveBots.blue.identity,
              red: initialLiveBots.red.identity,
            },
          })
        : undefined
      const botProfiles = initialLiveBots
        ? createBotVisualProfiles({
            blue: initialLiveBots.blue.blueprint,
            red: initialLiveBots.red.blueprint,
          }, {
            identities: {
              blue: initialLiveBots.blue.identity,
              red: initialLiveBots.red.identity,
            },
          })
        : undefined
      const bots = initialLiveBots && teamMaterials
        ? {
            blue: createBotNode(
              scene,
              initialLiveBots.blue.blueprint,
              'blue',
              teamMaterials.blue,
              initialLiveBots.blue.machineDesign,
            ),
            red: createBotNode(
              scene,
              initialLiveBots.red.blueprint,
              'red',
              teamMaterials.red,
              initialLiveBots.red.machineDesign,
            ),
          }
        : undefined
      const effectPool = createEffectPool(scene)

      createRendererGlow(scene, 'arena-preview-glow', 0.28)

      resources = {
        ...core,
        botProfiles,
        bots,
        effectPool,
        hazards,
      }
      setRendererState({ status: 'ready' })
      setSceneStats(createRendererStats(scene, engine))

      const render = () => {
        if (disposed || !resources) {
          return
        }

        const time = (performance.now() - start) / 1000

        updateHazardsAtTime(resources.hazards, time)
        const currentLiveBots = liveBotsRef.current

        if (resources.bots && currentLiveBots) {
          const currentTimeline = liveCombatTimelineRef.current
          const playbackStatus = advanceLivePlaybackBuffer(
            livePlaybackBufferRef.current,
            currentTimeline,
            time,
          )
          const frame = buildLiveArenaFrame(currentLiveBots, time, currentTimeline, playbackStatus.playheadTime)

          updateBots(resources.bots, frame)
          if (resources.botProfiles) {
            updateEffects(resources.effectPool, frame.effects, resources.botProfiles, resources.bots)
          }
          publishLivePlaybackStatus(
            playbackStatus,
            lastLivePlaybackStatusKeyRef,
            setLivePlaybackStatus,
            onLivePlaybackStatusRef.current,
          )
        }

        resources.scene.render()
      }

      engine.runRenderLoop(render)

      let pendingStatsFrames = 10
      const refreshSceneStats = () => {
        if (!disposed) {
          if (pendingStatsFrames <= 0) {
            setSceneStats(createRendererStats(scene, engine))
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
          message: 'The arena canvas lost its WebGL context. Waiting for restore.',
        })
      }
      const handleContextRestored = () => {
        if (disposed) {
          return
        }

        start = performance.now()
        setRendererState({ status: 'ready' })
        engine.resize()
        engine.runRenderLoop(render)
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
        disposeBabylonRendererCore(resources)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Arena renderer failed to start.'

      setRendererState({ status: 'unavailable', message })
      setSceneStats(null)
      disposeBabylonRendererCore(resources)

      return undefined
    }
  }, [activeHazardsKey, arena.height, arena.name, arena.width, liveBotsKey])

  const rendererBudgetState = sceneStats
    ? createBabylonRendererBudgetState(sceneStats, BABYLON_RENDERER_BUDGETS.replayPreview)
    : null

  return (
    <div
      className="babylon-stage arena-preview-stage"
      data-arena-preview-live-bots={liveBots ? 'true' : 'false'}
      data-arena-preview-state={rendererState.status}
      data-arena-preview-hazards={activeHazardsKey}
      data-live-playback-buffer-depth={livePlaybackStatus?.bufferDepthSeconds}
      data-live-playback-buffer-health={livePlaybackStatus?.bufferHealth}
      data-live-playback-last-seq={livePlaybackStatus?.lastSeq}
      data-live-playback-max-committed={livePlaybackStatus?.maxCommittedEventTime}
      data-live-playback-paused-reason={livePlaybackStatus?.pausedReason}
      data-live-playback-playhead={livePlaybackStatus?.playheadTime}
      data-live-playback-server-lag={livePlaybackStatus?.serverLagSeconds}
      data-live-playback-status={livePlaybackStatus?.status}
      data-live-playback-target-delay={livePlaybackStatus?.targetDelaySeconds}
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
      data-renderer-state={rendererState.status}
      data-renderer-textures={sceneStats?.textures}
      data-renderer-total-vertices={sceneStats?.totalVertices}
    >
      <canvas
        ref={canvasRef}
        aria-hidden={rendererState.status === 'unavailable'}
        aria-label="Babylon arena preview"
        hidden={rendererState.status === 'unavailable'}
      />
      {rendererState.status !== 'ready' && rendererState.status !== 'booting' ? (
        <div className="replay-error" role="status">
          <strong>Arena renderer unavailable</strong>
          <span>{rendererState.message}</span>
        </div>
      ) : null}
    </div>
  )
}

function publishLivePlaybackStatus(
  status: LivePlaybackBufferSnapshot,
  lastStatusKeyRef: MutableRefObject<string>,
  setLivePlaybackStatus: Dispatch<SetStateAction<LivePlaybackBufferSnapshot | null>>,
  onLivePlaybackStatus: ((status: LivePlaybackBufferSnapshot | null) => void) | undefined,
): void {
  const statusKey = livePlaybackStatusKey(status)

  if (lastStatusKeyRef.current === statusKey) {
    return
  }

  lastStatusKeyRef.current = statusKey
  setLivePlaybackStatus(status)
  onLivePlaybackStatus?.(status)
}

function livePlaybackStatusKey(status: LivePlaybackBufferSnapshot): string {
  return [
    status.key,
    status.status,
    status.pausedReason ?? 'none',
    status.lastSeq,
    roundForStatusKey(status.playheadTime),
    roundForStatusKey(status.bufferDepthSeconds),
    roundForStatusKey(status.serverLagSeconds ?? 0),
  ].join('|')
}

function roundForStatusKey(value: number): number {
  return Math.round(value * 4) / 4
}
