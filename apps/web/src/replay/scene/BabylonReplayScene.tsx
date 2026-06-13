import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type {
  ArenaConfig,
  MachineDesign,
  TeamRole,
} from '../../../../../packages/schemas/src/index.js'
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
  clampReplayTime,
  type CameraPreset,
  type CompiledReplayTimeline,
  type ReplayVisualFrame,
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

export type ReplayPlaybackStatus = {
  frame: ReplayVisualFrame
  playing: boolean
  time: number
}

type ReplayPlaybackState = {
  dirty: boolean
  lastVisualUpdateNow?: number
  playing: boolean
  previousNow?: number
  speed: number
  time: number
}

type ReplayPartDebugState = {
  role: TeamRole
  blockId: string
  partId: string
  visualAuthority?: string
  enabled: boolean
  absolutePosition: [number, number, number]
  rotationQuaternion?: [number, number, number, number]
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
  getPartDebugStates: () => ReplayPartDebugState[]
  getStats: () => ReplaySceneStats
}

type BabylonReplaySceneProps = {
  arena: ArenaConfig
  botBlueprints: ReplayBotBlueprints
  cameraPreset: CameraPreset
  immediateCamera?: boolean
  machineDesigns?: Partial<Record<TeamRole, MachineDesign>>
  onPlaybackEnd?: () => void
  onPlaybackFrame?: (status: ReplayPlaybackStatus) => void
  onRendererReady?: () => void
  playing: boolean
  seekTime: number
  seekVersion: number
  speed: number
  teamIdentities: Record<TeamRole, LegacyTeamIdentity>
  timeline: CompiledReplayTimeline
}

const MAX_REPLAY_FRAME_DELTA_SECONDS = 0.1
const REPLAY_SCENE_FRAME_INTERVAL_MS = 1000 / 30
const REPLAY_UI_FRAME_INTERVAL_MS = 125

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
  machineDesigns,
  onPlaybackEnd,
  onPlaybackFrame,
  onRendererReady,
  playing,
  seekTime,
  seekVersion,
  speed,
  teamIdentities,
  timeline,
}: BabylonReplaySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraPresetRef = useRef(cameraPreset)
  const immediateCameraRef = useRef(immediateCamera)
  const lastPlaybackFrameReportRef = useRef(0)
  const onPlaybackEndRef = useRef(onPlaybackEnd)
  const onPlaybackFrameRef = useRef(onPlaybackFrame)
  const onRendererReadyRef = useRef(onRendererReady)
  const playbackRef = useRef<ReplayPlaybackState>({
    dirty: true,
    playing,
    speed,
    time: clampReplayTime(timeline, seekTime),
  })
  const resourcesRef = useRef<SceneResources | null>(null)
  const seekTimeRef = useRef(seekTime)
  const timelineRef = useRef(timeline)
  const [rendererState, setRendererState] = useState<RendererState>({
    status: 'booting',
  })
  const [sceneStats, setSceneStats] = useState<ReplaySceneStats | null>(null)
  const activeHazardsKey = arena.activeHazards.join('|')
  const sceneArena = useMemo<ArenaConfig>(() => ({
    name: arena.name,
    width: arena.width,
    height: arena.height,
    activeHazards: activeHazardsKey ? activeHazardsKey.split('|') : [],
  }), [activeHazardsKey, arena.height, arena.name, arena.width])
  const sceneArenaRef = useRef(sceneArena)

  useEffect(() => {
    cameraPresetRef.current = cameraPreset
    playbackRef.current.dirty = true
  }, [cameraPreset])

  useEffect(() => {
    immediateCameraRef.current = immediateCamera
    playbackRef.current.dirty = true
  }, [immediateCamera])

  useEffect(() => {
    onPlaybackEndRef.current = onPlaybackEnd
  }, [onPlaybackEnd])

  useEffect(() => {
    onPlaybackFrameRef.current = onPlaybackFrame
  }, [onPlaybackFrame])

  useEffect(() => {
    onRendererReadyRef.current = onRendererReady
  }, [onRendererReady])

  useEffect(() => {
    playbackRef.current.playing = playing
    playbackRef.current.dirty = true

    if (!playing) {
      playbackRef.current.previousNow = undefined
    }
  }, [playing])

  useEffect(() => {
    playbackRef.current.speed = speed
    playbackRef.current.previousNow = undefined
  }, [speed])

  useEffect(() => {
    sceneArenaRef.current = sceneArena
    playbackRef.current.dirty = true
  }, [sceneArena])

  useEffect(() => {
    timelineRef.current = timeline
    playbackRef.current.time = clampReplayTime(timeline, playbackRef.current.time)
    playbackRef.current.dirty = true
  }, [timeline])

  useEffect(() => {
    seekTimeRef.current = seekTime
  }, [seekTime])

  useEffect(() => {
    const playback = playbackRef.current

    playback.time = clampReplayTime(timelineRef.current, seekTimeRef.current)
    playback.previousNow = undefined
    playback.dirty = true
  }, [seekVersion])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let resources: SceneResources | null = null
    let disposed = false
    let statsFrame = 0
    const rendererWarmupFrames = immediateCamera ? 2 : 8
    let pendingWarmupFrames = rendererWarmupFrames
    let reportedReady = false
    const reportRendererFrame = () => {
      if (reportedReady) {
        return
      }

      pendingWarmupFrames = Math.max(0, pendingWarmupFrames - 1)
      if (pendingWarmupFrames <= 0) {
        reportedReady = true
        onRendererReadyRef.current?.()
      }
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
          beta: 1.05,
          lowerRadiusLimit: 4,
          name: 'replay-camera',
          radius: Math.max(sceneArena.width, sceneArena.height) * 0.9,
          target: Vector3.Zero(),
          upperRadiusLimit: Math.max(sceneArena.width, sceneArena.height) * 1.7,
          wheelPrecision: 28,
        },
        clearColor: new Color4(0.03, 0.04, 0.04, 1),
        environmentIntensity: 0.18,
      })
      const { camera, engine, scene } = core

      configureReplayCameraControls(camera)
      camera.attachControl(canvas, true)
      createReplayLightingPreset(scene, sceneArena.width, { identities: teamIdentities })

      const teamMaterials = createTeamMaterials(scene, { identities: teamIdentities })
      const hazards = createArena(scene, sceneArena)
      const bots = {
        red: createBotNode(scene, botBlueprints.red, 'red', teamMaterials.red, machineDesigns?.red),
        blue: createBotNode(scene, botBlueprints.blue, 'blue', teamMaterials.blue, machineDesigns?.blue),
      }
      const botProfiles = createBotVisualProfiles(botBlueprints, { identities: teamIdentities })
      const effectPool = createEffectPool(scene)
      createRendererGlow(scene, 'replay-glow', 0.32)
      const getSceneStats = () => createRendererStats(scene, engine)
      let cleanupReplayDebugApi: (() => void) | undefined

      if (import.meta.env.DEV) {
        cleanupReplayDebugApi = installReplayDebugApi(
          () => resources,
          getSceneStats,
        )
      }

      resources = {
        ...core,
        bots,
        botProfiles,
        effectPool,
        hazards,
      }
      const sceneResources = resources
      resourcesRef.current = resources
      setRendererState({ status: 'ready' })
      setSceneStats(getSceneStats())
      updateReplaySceneFrame(
        sceneResources,
        buildReplayFrame(timelineRef.current, playbackRef.current.time),
        cameraPresetRef.current,
        sceneArenaRef.current,
        immediateCameraRef.current,
      )

      const render = () => {
        if (disposed) {
          return
        }

        const playback = playbackRef.current
        const now = performance.now()

        let playbackEnded = false

        if (playback.playing) {
          const previousNow = playback.previousNow ?? now
          const elapsedSeconds = Math.min(
            (now - previousNow) / 1000,
            MAX_REPLAY_FRAME_DELTA_SECONDS,
          )
          const nextTime = clampReplayTime(
            timelineRef.current,
            playback.time + elapsedSeconds * playback.speed,
          )

          playback.previousNow = now
          playback.time = nextTime

          if (nextTime >= timelineRef.current.duration) {
            playback.playing = false
            playbackEnded = true
            onPlaybackEndRef.current?.()
          }
        } else {
          playback.previousNow = undefined
        }

        const visualUpdateDue = playback.dirty || playbackEnded || (
          playback.playing &&
          (
            playback.lastVisualUpdateNow === undefined ||
            now - playback.lastVisualUpdateNow >= REPLAY_SCENE_FRAME_INTERVAL_MS
          )
        )

        if (visualUpdateDue) {
          const frame = buildReplayFrame(timelineRef.current, playback.time)
          const forcePlaybackFrameReport = !playback.playing && playback.dirty

          updateReplaySceneFrame(
            sceneResources,
            frame,
            cameraPresetRef.current,
            sceneArenaRef.current,
            immediateCameraRef.current,
          )
          publishReplayPlaybackFrame(
            frame,
            playback.playing,
            now,
            forcePlaybackFrameReport,
            lastPlaybackFrameReportRef,
            onPlaybackFrameRef.current,
          )
          playback.dirty = false
          playback.lastVisualUpdateNow = now
        }

        scene.render()
        reportRendererFrame()
      }

      engine.runRenderLoop(render)

      let pendingStatsFrames = 10
      const refreshSceneStats = () => {
        if (!disposed) {
          if (pendingStatsFrames <= 0) {
            setSceneStats(getSceneStats())
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
        pendingWarmupFrames = rendererWarmupFrames
        reportedReady = false
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
        cleanupReplayDebugApi?.()
        resourcesRef.current = null
        disposeBabylonRendererCore(resources)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Replay renderer failed to start.'
      setRendererState({ status: 'unavailable', message })
      if (import.meta.env.DEV) {
        clearReplayDebugApi()
      }
      setSceneStats(null)
      resourcesRef.current = null
      disposeBabylonRendererCore(resources)

      return undefined
    }
  }, [immediateCamera, sceneArena, botBlueprints, machineDesigns, teamIdentities])

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

function updateReplaySceneFrame(
  resources: SceneResources,
  frame: ReplayVisualFrame,
  cameraPreset: CameraPreset,
  sceneArena: ArenaConfig,
  immediateCamera: boolean,
): void {
  updateBots(resources.bots, frame)
  updateEffects(resources.effectPool, frame.effects, resources.botProfiles, resources.bots)
  updateHazards(resources.hazards, frame)

  for (let pass = 0; pass < (immediateCamera ? 10 : 1); pass += 1) {
    updateCamera(resources.camera, cameraPreset, frame, sceneArena)
  }
}

function publishReplayPlaybackFrame(
  frame: ReplayVisualFrame,
  playing: boolean,
  now: number,
  force: boolean,
  lastReportRef: MutableRefObject<number>,
  onPlaybackFrame?: (status: ReplayPlaybackStatus) => void,
): void {
  if (!onPlaybackFrame) {
    return
  }

  if (!force && playing && now - lastReportRef.current < REPLAY_UI_FRAME_INTERVAL_MS) {
    return
  }

  lastReportRef.current = now
  onPlaybackFrame({
    frame,
    playing,
    time: frame.time,
  })
}

function getReplayPartDebugStates(resources: SceneResources): ReplayPartDebugState[] {
  const states: ReplayPartDebugState[] = []

  ;(['red', 'blue'] as TeamRole[]).forEach((role) => {
    const bot = resources.bots[role]
    const nodes = bot.getChildren((candidate) => {
      const metadata = candidate.metadata as BotPartNodeMetadata | undefined

      return metadata?.kind === 'bot_part'
    }, true) as TransformNode[]

    nodes.forEach((node) => {
      const metadata = node.metadata as BotPartNodeMetadata
      const absolutePosition = node.getAbsolutePosition()
      const rotationQuaternion = node.rotationQuaternion

      states.push({
        role,
        blockId: metadata.blockId,
        partId: metadata.partId,
        visualAuthority: metadata.visualAuthority,
        enabled: node.isEnabled(),
        absolutePosition: [
          roundDebugNumber(absolutePosition.x),
          roundDebugNumber(absolutePosition.y),
          roundDebugNumber(absolutePosition.z),
        ],
        ...(rotationQuaternion ? {
          rotationQuaternion: [
            roundDebugNumber(rotationQuaternion.x),
            roundDebugNumber(rotationQuaternion.y),
            roundDebugNumber(rotationQuaternion.z),
            roundDebugNumber(rotationQuaternion.w),
          ],
        } : {}),
      })
    })
  })

  return states
}

function installReplayDebugApi(
  getResources: () => SceneResources | null,
  getStats: () => ReplaySceneStats,
): () => void {
  const replayDebugApi: ReplaySceneDebugApi = {
    focusPart: (options) => {
      const resources = getResources()

      if (!resources) {
        return false
      }

      return focusReplayPart(resources, options)
    },
    getPartDebugStates: () => {
      const resources = getResources()

      return resources ? getReplayPartDebugStates(resources) : []
    },
    getStats,
  }

  window.AgentArenaReplayDebug = replayDebugApi

  return () => clearReplayDebugApi(replayDebugApi)
}

function clearReplayDebugApi(replayDebugApi?: ReplaySceneDebugApi): void {
  if (!replayDebugApi || window.AgentArenaReplayDebug === replayDebugApi) {
    delete window.AgentArenaReplayDebug
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

function configureReplayCameraControls(camera: BabylonRendererCore['camera']): void {
  camera.lowerBetaLimit = 0.56
  camera.upperBetaLimit = 1.26
  camera.panningSensibility = 0
}

function roundDebugNumber(value: number): number {
  return Math.round(value * 1000) / 1000
}
