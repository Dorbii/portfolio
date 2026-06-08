import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BotBlueprint,
  MachineDesign,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { LegacyTeamIdentity } from '../shared/teamVisuals'
import {
  animateAssembly,
  attachAssemblyBot,
  type AssemblyResources,
} from './botAssemblyAnimation'
import {
  createAssemblyResources,
  isAssemblyRendererSupported,
} from './botAssemblyRenderer'
import {
  BABYLON_RENDERER_BUDGETS,
  createBabylonRendererBudgetState,
} from '../replay/rendering/rendererBudgets'
import {
  createRendererStats,
  type BabylonRendererStats,
} from '../replay/rendering/rendererKit'

type AssemblyStatus = 'booting' | 'ready' | 'unavailable' | 'context_lost'

type BotAssemblySceneProps = {
  blueprint: BotBlueprint
  identity: LegacyTeamIdentity
  machineDesign?: MachineDesign
  role: TeamRole
  submitted: boolean
}

export function BotAssemblyScene({
  blueprint,
  identity,
  machineDesign,
  role,
  submitted,
}: BotAssemblySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resourcesRef = useRef<AssemblyResources | null>(null)
  const blueprintRef = useRef(blueprint)
  const machineDesignRef = useRef(machineDesign)
  const lastAttachedVisualKeyRef = useRef('')
  const submittedRef = useRef(submitted)
  const [status, setStatus] = useState<AssemblyStatus>('booting')
  const [message, setMessage] = useState('')
  const [sceneStats, setSceneStats] = useState<BabylonRendererStats | null>(null)
  const [attachedMeshCount, setAttachedMeshCount] = useState(0)

  useEffect(() => {
    submittedRef.current = submitted
  }, [submitted])

  useEffect(() => {
    blueprintRef.current = blueprint
  }, [blueprint])

  useEffect(() => {
    machineDesignRef.current = machineDesign
  }, [machineDesign])

  // CODEX_INTENT: prefer MachineDesign render authority for confirmed machine loadouts so cockpit previews match replay bots.
  // CODEX_RISK: behavioral
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  const attachBlueprint = useCallback(
    (
      resources: AssemblyResources,
      nextBlueprint: BotBlueprint,
      nextMachineDesign: MachineDesign | undefined,
      visualKey: string,
    ) => {
      attachAssemblyBot(resources, nextBlueprint, role, nextMachineDesign)
      lastAttachedVisualKeyRef.current = visualKey
      setAttachedMeshCount(resources.botMeshes.length)
    },
    [role],
  )

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let resources: AssemblyResources | null = null
    let disposed = false
    let statsFrame = 0

    try {
      if (!isAssemblyRendererSupported()) {
        setStatus('unavailable')
        setMessage('WebGL is not available in this browser context.')

        return undefined
      }

      resources = createAssemblyResources(canvas, role, identity, submittedRef.current)
      const activeResources = resources
      const initialMachineDesign = machineDesignRef.current

      resourcesRef.current = resources
      attachBlueprint(
        activeResources,
        blueprintRef.current,
        initialMachineDesign,
        visualAuthorityKey(blueprintRef.current, initialMachineDesign),
      )
      setStatus('ready')
      setSceneStats(createRendererStats(activeResources.scene, activeResources.engine))

      activeResources.engine.runRenderLoop(() => {
        if (disposed) {
          return
        }

        animateAssembly(activeResources, submittedRef.current)
        activeResources.scene.render()
      })

      let pendingStatsFrames = 10
      const refreshSceneStats = () => {
        if (!disposed) {
          if (pendingStatsFrames <= 0) {
            setSceneStats(createRendererStats(activeResources.scene, activeResources.engine))
            return
          }

          pendingStatsFrames -= 1
          statsFrame = window.requestAnimationFrame(refreshSceneStats)
        }
      }

      statsFrame = window.requestAnimationFrame(refreshSceneStats)

      const resize = () => activeResources.engine.resize()
      const handleContextLost = (event: Event) => {
        event.preventDefault()
        activeResources.engine.stopRenderLoop()
        setStatus('context_lost')
        setMessage('The assembly canvas lost its WebGL context.')
      }
      const handleContextRestored = () => {
        if (disposed) {
          return
        }

        setStatus('ready')
        activeResources.engine.resize()
        activeResources.engine.runRenderLoop(() => {
          if (!disposed) {
            animateAssembly(activeResources, submittedRef.current)
            activeResources.scene.render()
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
        resourcesRef.current = null
        lastAttachedVisualKeyRef.current = ''
        activeResources.scene.dispose()
        activeResources.engine.dispose()
      }
    } catch (error) {
      setStatus('unavailable')
      setMessage(error instanceof Error ? error.message : 'Assembly renderer failed to start.')
      setSceneStats(null)
      setAttachedMeshCount(0)
      resourcesRef.current = null
      lastAttachedVisualKeyRef.current = ''
      resources?.scene.dispose()
      resources?.engine.dispose()

      return undefined
    }
  }, [attachBlueprint, identity, role])

  useEffect(() => {
    const resources = resourcesRef.current

    if (!resources) {
      return
    }

    const visualKey = visualAuthorityKey(blueprint, machineDesign)

    if (lastAttachedVisualKeyRef.current === visualKey) {
      return
    }

    attachBlueprint(resources, blueprint, machineDesign, visualKey)
  }, [attachBlueprint, blueprint, machineDesign])

  const rendererBudgetState = sceneStats
    ? createBabylonRendererBudgetState(sceneStats, BABYLON_RENDERER_BUDGETS.assembly)
    : null

  return (
    <div
      className="bot-assembly-stage"
      data-renderer-active-meshes={sceneStats?.activeMeshes}
      data-renderer-budget-active-meshes={BABYLON_RENDERER_BUDGETS.assembly.activeMeshes}
      data-renderer-budget-breaches={rendererBudgetState?.breaches.join('|')}
      data-renderer-budget-materials={BABYLON_RENDERER_BUDGETS.assembly.materials}
      data-renderer-budget-meshes={BABYLON_RENDERER_BUDGETS.assembly.meshes}
      data-renderer-budget-state={rendererBudgetState?.status}
      data-renderer-budget-textures={BABYLON_RENDERER_BUDGETS.assembly.textures}
      data-renderer-budget-total-vertices={BABYLON_RENDERER_BUDGETS.assembly.totalVertices}
      data-renderer-fps={sceneStats?.fps.toFixed(1)}
      data-renderer-materials={sceneStats?.materials}
      data-renderer-meshes={sceneStats?.meshes}
      data-renderer-state={status}
      data-renderer-textures={sceneStats?.textures}
      data-renderer-total-vertices={sceneStats?.totalVertices}
      data-assembly-blueprint-blocks={blueprint.blocks.length}
      data-assembly-bot-attached={attachedMeshCount > 0 ? 'true' : 'false'}
      data-assembly-bot-meshes={attachedMeshCount}
      data-assembly-visual-authority={machineDesign ? 'machine:v1' : 'legacy-bot-blueprint'}
      data-assembly-team-color={identity.primaryColor}
    >
      <canvas
        ref={canvasRef}
        aria-label={`${identity.name} bot assembly bay`}
        aria-hidden={status === 'unavailable'}
        hidden={status === 'unavailable'}
      />
      {status === 'booting' ? (
        <div className="assembly-renderer-status" role="status">
          Renderer starting
        </div>
      ) : null}
      {status !== 'ready' && status !== 'booting' ? (
        <div className="replay-error" role="status">
          <strong>Assembly renderer unavailable</strong>
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  )
}

function visualAuthorityKey(
  blueprint: BotBlueprint,
  machineDesign: MachineDesign | undefined,
): string {
  return machineDesign
    ? `machine:${JSON.stringify(machineDesign)}`
    : `blueprint:${JSON.stringify(blueprint)}`
}
