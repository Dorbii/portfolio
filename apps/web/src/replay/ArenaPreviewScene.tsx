import { useEffect, useRef, useState } from 'react'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { ArenaConfig } from '../../../../packages/schemas/src/index.js'
import {
  createArena,
  createCenterSpinner,
  type BabylonHazardVisual,
} from './babylonArena'
import {
  BABYLON_RENDERER_BUDGETS,
  createBabylonRendererBudgetState,
} from './babylonRendererBudgets'
import {
  createBabylonRendererCore,
  createRendererGlow,
  createRendererStats,
  createReplayLightingPreset,
  disposeBabylonRendererCore,
  isBabylonRendererSupported,
  type BabylonRendererCore,
  type BabylonRendererStats,
} from './babylonRendererKit'

type ArenaPreviewResources = BabylonRendererCore & {
  centerSpinner: Mesh
  hazards: BabylonHazardVisual[]
}

type RendererState = {
  status: 'booting' | 'ready' | 'unavailable' | 'context_lost'
  message?: string
}

type ArenaPreviewSceneProps = {
  arena: ArenaConfig
}

export function ArenaPreviewScene({ arena }: ArenaPreviewSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [rendererState, setRendererState] = useState<RendererState>({ status: 'booting' })
  const [sceneStats, setSceneStats] = useState<BabylonRendererStats | null>(null)
  const activeHazardsKey = arena.activeHazards.join('|')

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

      camera.attachControl(canvas, true)
      createReplayLightingPreset(scene, sceneArena.width)

      const hazards = createArena(scene, sceneArena)
      const centerSpinner = createCenterSpinner(scene)

      createRendererGlow(scene, 'arena-preview-glow', 0.28)

      resources = {
        ...core,
        centerSpinner,
        hazards,
      }
      setRendererState({ status: 'ready' })
      setSceneStats(createRendererStats(scene, engine))

      const render = () => {
        if (disposed || !resources) {
          return
        }

        const time = (performance.now() - start) / 1000

        resources.centerSpinner.rotation.y = time * 2.2
        for (const hazard of resources.hazards) {
          if (hazard.spinSpeed > 0) {
            hazard.mesh.rotation.y += hazard.spinSpeed
          }
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
  }, [activeHazardsKey, arena.height, arena.name, arena.width])

  const rendererBudgetState = sceneStats
    ? createBabylonRendererBudgetState(sceneStats, BABYLON_RENDERER_BUDGETS.replayPreview)
    : null

  return (
    <div
      className="babylon-stage arena-preview-stage"
      data-arena-preview-state={rendererState.status}
      data-arena-preview-hazards={activeHazardsKey}
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
