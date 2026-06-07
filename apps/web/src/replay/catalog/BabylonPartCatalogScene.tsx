import { useEffect, useRef, useState } from 'react'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type {
  TeamIdentity,
  TeamRole,
} from '../../../../../packages/schemas/src/index.js'
import { damageMaterialForSeverity } from '../rendering/materials'
import {
  createCatalogPartNode,
  createTeamMaterials,
  type BotPartNodeMetadata,
  type TeamMaterialSet,
} from '../parts'
import {
  applyPartMotion,
  isPartMotionNode,
} from '../parts/motion'
import {
  BABYLON_RENDERER_BUDGETS,
  createBabylonRendererBudgetState,
} from '../rendering/rendererBudgets'
import {
  createBabylonRendererCore,
  createCaptureLightingPreset,
  createRendererGlow,
  createRendererStats,
  disposeBabylonRendererCore,
  isBabylonRendererSupported,
  type BabylonRendererCore,
  type BabylonRendererStats,
} from '../rendering/rendererKit'

export type PartCatalogDamagePreview = 'critical' | 'light' | 'medium' | 'none'

type BabylonPartCatalogSceneProps = {
  accentColor: string
  animate: boolean
  damagePreview: PartCatalogDamagePreview
  partId: string
  role: TeamRole
}

type RendererState = {
  status: 'booting' | 'context_lost' | 'ready' | 'unavailable'
  message?: string
}

const DAMAGE_PREVIEW_SEVERITY: Record<PartCatalogDamagePreview, number> = {
  critical: 1,
  light: 0.35,
  medium: 0.68,
  none: 0,
}

export function BabylonPartCatalogScene({
  accentColor,
  animate,
  damagePreview,
  partId,
  role,
}: BabylonPartCatalogSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [rendererState, setRendererState] = useState<RendererState>({
    status: 'booting',
  })
  const [sceneStats, setSceneStats] = useState<BabylonRendererStats | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let core: BabylonRendererCore | null = null
    let disposed = false
    let statsFrame = 0

    setRendererState({ status: 'booting' })
    setSceneStats(null)

    try {
      if (!isBabylonRendererSupported()) {
        setRendererState({
          status: 'unavailable',
          message: 'WebGL is not available in this browser context.',
        })

        return undefined
      }

      core = createBabylonRendererCore(canvas, {
        camera: {
          alpha: -Math.PI * 0.38,
          beta: 1.02,
          lowerRadiusLimit: 0.75,
          name: 'part-catalog-camera',
          radius: 2.8,
          target: new Vector3(0, 0.42, 0),
          upperRadiusLimit: 5.8,
          wheelPrecision: 42,
        },
        clearColor: new Color4(0.02, 0.025, 0.026, 1),
        environmentIntensity: 0.52,
      })

      const { camera, engine, scene } = core
      const identity = createQaTeamIdentity(role, accentColor)
      const teamMaterials = createTeamMaterials(scene, { identities: { [role]: identity } })
      const materials = teamMaterials[role]
      const partRoot = createCatalogPartNode(scene, partId, role, materials)

      camera.attachControl(canvas, true)
      camera.panningSensibility = 0
      camera.lowerBetaLimit = 0.46
      camera.upperBetaLimit = 1.36
      createCaptureLightingPreset(scene)
      createRendererGlow(scene, 'part-catalog-glow', 0.18)
      applyDamagePreview(partRoot, damagePreview)
      liftPartAboveInspectionStage(partRoot)

      const frame = framePartForInspection(partRoot, camera)
      createInspectionStage(scene, materials, frame.stageRadius)
      const animatedNodes = collectAnimatedNodes(partRoot)
      let motionElapsedSeconds = 0

      scene.onBeforeRenderObservable.add(() => {
        if (!animate) {
          return
        }

        const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.05)

        motionElapsedSeconds += deltaSeconds
        partRoot.rotation.y += deltaSeconds * 0.42
        animatePartNodes(animatedNodes, motionElapsedSeconds)
      })

      setRendererState({ status: 'ready' })
      setSceneStats(createRendererStats(scene, engine))

      engine.runRenderLoop(() => {
        if (!disposed) {
          scene.render()
        }
      })

      let pendingStatsFrames = 10
      const refreshSceneStats = () => {
        if (disposed || !core) {
          return
        }

        if (pendingStatsFrames <= 0) {
          setSceneStats(createRendererStats(core.scene, core.engine))
          return
        }

        pendingStatsFrames -= 1
        statsFrame = window.requestAnimationFrame(refreshSceneStats)
      }

      statsFrame = window.requestAnimationFrame(refreshSceneStats)

      const resize = () => engine.resize()
      const handleContextLost = (event: Event) => {
        event.preventDefault()
        engine.stopRenderLoop()
        setRendererState({
          status: 'context_lost',
          message: 'The part catalog canvas lost its WebGL context.',
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
        disposeBabylonRendererCore(core)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Part catalog renderer failed to start.'

      setRendererState({ status: 'unavailable', message })
      setSceneStats(null)
      disposeBabylonRendererCore(core)

      return undefined
    }
  }, [accentColor, animate, damagePreview, partId, role])

  const rendererBudgetState = sceneStats
    ? createBabylonRendererBudgetState(sceneStats, BABYLON_RENDERER_BUDGETS.partCatalog)
    : null

  return (
    <div
      className="part-catalog-stage"
      data-part-catalog-part-id={partId}
      data-renderer-active-meshes={sceneStats?.activeMeshes}
      data-renderer-budget-active-meshes={BABYLON_RENDERER_BUDGETS.partCatalog.activeMeshes}
      data-renderer-budget-breaches={rendererBudgetState?.breaches.join('|')}
      data-renderer-budget-materials={BABYLON_RENDERER_BUDGETS.partCatalog.materials}
      data-renderer-budget-meshes={BABYLON_RENDERER_BUDGETS.partCatalog.meshes}
      data-renderer-budget-state={rendererBudgetState?.status}
      data-renderer-budget-textures={BABYLON_RENDERER_BUDGETS.partCatalog.textures}
      data-renderer-budget-total-vertices={BABYLON_RENDERER_BUDGETS.partCatalog.totalVertices}
      data-renderer-materials={sceneStats?.materials}
      data-renderer-meshes={sceneStats?.meshes}
      data-renderer-state={rendererState.status}
      data-renderer-textures={sceneStats?.textures}
      data-renderer-total-vertices={sceneStats?.totalVertices}
    >
      <canvas
        ref={canvasRef}
        aria-label={`${partId} part catalog render`}
        aria-hidden={rendererState.status === 'unavailable'}
        hidden={rendererState.status === 'unavailable'}
      />
      {rendererState.status !== 'ready' && rendererState.status !== 'booting' ? (
        <div className="replay-error" role="status">
          <strong>Part renderer unavailable</strong>
          <span>{rendererState.message}</span>
        </div>
      ) : null}
    </div>
  )
}

function createQaTeamIdentity(role: TeamRole, primaryColor: string): TeamIdentity {
  return {
    name: `${role.toUpperCase()} QA`,
    primaryColor,
    logo: {
      mark: 'gear',
      initials: 'QA',
    },
  }
}

function applyDamagePreview(partRoot: TransformNode, damagePreview: PartCatalogDamagePreview): void {
  const metadata = partRoot.metadata as BotPartNodeMetadata | undefined
  const severity = DAMAGE_PREVIEW_SEVERITY[damagePreview]
  const material = metadata ? damageMaterialForSeverity(metadata.damageMaterials, severity) : null

  if (!metadata || !material) {
    return
  }

  partRoot.getChildMeshes().forEach((mesh) => {
    if (mesh.material?.name === metadata.primaryMaterialName) {
      mesh.material = material
    }
  })
}

function liftPartAboveInspectionStage(partRoot: TransformNode): void {
  partRoot.computeWorldMatrix(true)
  partRoot.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true))

  const bounds = partRoot.getHierarchyBoundingVectors(true)
  const floorClearance = 0.14

  if (bounds.min.y < floorClearance) {
    partRoot.position.y += floorClearance - bounds.min.y
  }
}

function framePartForInspection(partRoot: TransformNode, camera: BabylonRendererCore['camera']): {
  stageRadius: number
} {
  partRoot.computeWorldMatrix(true)
  partRoot.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true))

  const bounds = partRoot.getHierarchyBoundingVectors(true)
  const center = bounds.min.add(bounds.max).scale(0.5)
  const extents = bounds.max.subtract(bounds.min)
  const largestAxis = Math.max(extents.x, extents.y, extents.z, 0.9)
  const radius = Math.min(Math.max(largestAxis * 2.35, 2.1), 5.2)

  camera.setTarget(center.add(new Vector3(0, largestAxis * 0.04, 0)))
  camera.radius = radius

  return {
    stageRadius: Math.max(largestAxis * 0.86, 0.92),
  }
}

function createInspectionStage(
  scene: BabylonRendererCore['scene'],
  materials: TeamMaterialSet,
  radius: number,
): void {
  const turntable = MeshBuilder.CreateCylinder(
    'part-catalog-turntable',
    {
      diameter: radius * 1.72,
      height: 0.08,
      tessellation: 64,
    },
    scene,
  )

  turntable.position.y = 0.02
  turntable.material = materials.trim

  for (let index = -2; index <= 2; index += 1) {
    const rail = MeshBuilder.CreateBox(
      `part-catalog-stage-rail-x-${index}`,
      {
        width: radius * 1.52,
        height: 0.018,
        depth: 0.018,
      },
      scene,
    )
    const crossRail = MeshBuilder.CreateBox(
      `part-catalog-stage-rail-z-${index}`,
      {
        width: 0.018,
        height: 0.018,
        depth: radius * 1.52,
      },
      scene,
    )

    rail.position.set(0, 0.085, index * radius * 0.24)
    crossRail.position.set(index * radius * 0.24, 0.088, 0)
    rail.material = index === 0 ? materials.warning : materials.steel
    crossRail.material = index === 0 ? materials.warning : materials.steel
  }
}

function collectAnimatedNodes(partRoot: TransformNode): TransformNode[] {
  return partRoot.getChildren((node) => isPartMotionNode(node), true) as TransformNode[]
}

function animatePartNodes(nodes: TransformNode[], elapsedSeconds: number): void {
  nodes.forEach((node) => {
    applyPartMotion(node, elapsedSeconds, 1)
  })
}
