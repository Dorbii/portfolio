import { useEffect, useRef, useState } from 'react'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Engine } from '@babylonjs/core/Engines/engine'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Scene } from '@babylonjs/core/scene'
import type {
  BotBlueprint,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { createBotNode, createTeamMaterials } from '../replay/babylonPartRenderer'

type AssemblyStatus = 'booting' | 'ready' | 'unavailable' | 'context_lost'

type AssemblyResources = {
  bot?: TransformNode
  botMeshes: AbstractMesh[]
  camera: ArcRotateCamera
  engine: Engine
  scene: Scene
  scanBar: AbstractMesh
  startedAt: number
}

type AssemblyMetadata = {
  assemblyIndex?: number
  basePosition?: Vector3
  baseScaling?: Vector3
  kind?: string
  speed?: number
}

type BotAssemblySceneProps = {
  blueprint: BotBlueprint
  role: TeamRole
  submitted: boolean
}

export function BotAssemblyScene({
  blueprint,
  role,
  submitted,
}: BotAssemblySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resourcesRef = useRef<AssemblyResources | null>(null)
  const [status, setStatus] = useState<AssemblyStatus>('booting')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let resources: AssemblyResources | null = null
    let disposed = false

    try {
      if (!Engine.isSupported()) {
        setStatus('unavailable')
        setMessage('WebGL is not available in this browser context.')

        return undefined
      }

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

      createAssemblyRoom(scene, role)

      const scanBarMaterial = createMaterial(scene, 'assembly-scan-mat', '#dff5ff', '#8bdfff', 0.72)
      const scanBar = MeshBuilder.CreateBox(
        'assembly-scan-bar',
        { width: 3.2, height: 0.045, depth: 0.1 },
        scene,
      )

      scanBar.position.set(0, 1.45, 0)
      scanBar.material = scanBarMaterial

      const glow = new GlowLayer('assembly-glow', scene)
      glow.intensity = 0.38

      resources = {
        camera,
        engine,
        scene,
        scanBar,
        botMeshes: [],
        startedAt: performance.now(),
      }
      resourcesRef.current = resources
      setStatus('ready')

      engine.runRenderLoop(() => {
        if (disposed || !resources) {
          return
        }

        animateAssembly(resources, submitted)
        scene.render()
      })

      const resize = () => engine.resize()
      const handleContextLost = (event: Event) => {
        event.preventDefault()
        engine.stopRenderLoop()
        setStatus('context_lost')
        setMessage('The assembly canvas lost its WebGL context.')
      }
      const handleContextRestored = () => {
        if (disposed) {
          return
        }

        setStatus('ready')
        engine.resize()
        engine.runRenderLoop(() => {
          if (!disposed && resources) {
            animateAssembly(resources, submitted)
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
      setStatus('unavailable')
      setMessage(error instanceof Error ? error.message : 'Assembly renderer failed to start.')
      resourcesRef.current = null
      resources?.scene.dispose()
      resources?.engine.dispose()

      return undefined
    }
  }, [role, submitted])

  useEffect(() => {
    const resources = resourcesRef.current

    if (!resources) {
      return
    }

    resources.bot?.dispose(false, false)

    const materials = createTeamMaterials(resources.scene)
    const bot = createBotNode(resources.scene, blueprint, role, materials[role])

    bot.position.set(0, 0.16, 0)
    bot.rotation.y = role === 'red' ? -0.28 : 0.28
    bot.scaling.setAll(1.28)

    const botMeshes = bot.getChildMeshes()

    botMeshes.forEach((mesh, index) => {
      const metadata = (mesh.metadata ?? {}) as AssemblyMetadata

      mesh.metadata = {
        ...metadata,
        assemblyIndex: index,
        basePosition: mesh.position.clone(),
        baseScaling: mesh.scaling.clone(),
      } satisfies AssemblyMetadata
      mesh.setEnabled(false)
    })

    resources.bot = bot
    resources.botMeshes = botMeshes
    resources.startedAt = performance.now()
  }, [blueprint, role])

  return (
    <div className="bot-assembly-stage" data-renderer-state={status}>
      <canvas
        ref={canvasRef}
        aria-label={`${role} bot assembly bay`}
        aria-hidden={status === 'unavailable'}
        hidden={status === 'unavailable'}
      />
      {status !== 'ready' && status !== 'booting' ? (
        <div className="replay-error" role="status">
          <strong>Assembly renderer unavailable</strong>
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  )
}

function createAssemblyRoom(scene: Scene, role: TeamRole): void {
  const floorMaterial = createMaterial(scene, 'assembly-floor-mat', '#15191d', '#050608')
  const wallMaterial = createMaterial(scene, 'assembly-wall-mat', '#202832', '#07090d')
  const railMaterial = createMaterial(scene, 'assembly-rail-mat', '#313b44', '#080b0f')
  const trimMaterial = createMaterial(scene, 'assembly-trim-mat', '#0b0f13', '#020304')
  const teamMaterial = createMaterial(
    scene,
    'assembly-team-mat',
    role === 'red' ? '#9b2633' : '#1d5fa3',
    role === 'red' ? '#ff3045' : '#2d95ff',
  )
  const warningMaterial = createMaterial(scene, 'assembly-warning-mat', '#d4ae42', '#473005')

  const floor = MeshBuilder.CreateBox('assembly-floor', { width: 7.6, height: 0.16, depth: 5.2 }, scene)
  floor.position.y = -0.12
  floor.material = floorMaterial

  const backWall = MeshBuilder.CreateBox('assembly-back-wall', { width: 7.6, height: 3.2, depth: 0.16 }, scene)
  backWall.position.set(0, 1.45, 2.66)
  backWall.material = wallMaterial

  const leftWall = MeshBuilder.CreateBox('assembly-left-wall', { width: 0.16, height: 3.2, depth: 5.2 }, scene)
  const rightWall = MeshBuilder.CreateBox('assembly-right-wall', { width: 0.16, height: 3.2, depth: 5.2 }, scene)
  leftWall.position.set(-3.86, 1.45, 0)
  rightWall.position.set(3.86, 1.45, 0)
  leftWall.material = wallMaterial
  rightWall.material = wallMaterial

  const platform = MeshBuilder.CreateCylinder(
    'assembly-platform',
    { height: 0.16, diameter: 2.8, tessellation: 42 },
    scene,
  )
  platform.position.y = 0.02
  platform.material = teamMaterial

  const turntable = MeshBuilder.CreateTorus(
    'assembly-turntable-ring',
    { diameter: 3.05, thickness: 0.08, tessellation: 36 },
    scene,
  )
  turntable.position.y = 0.13
  turntable.rotation.x = Math.PI / 2
  turntable.material = warningMaterial

  for (let index = 0; index < 5; index += 1) {
    const x = -2.5 + index * 1.25
    const rail = MeshBuilder.CreateBox(
      `assembly-overhead-rail-${index}`,
      { width: 0.12, height: 0.1, depth: 4.4 },
      scene,
    )

    rail.position.set(x, 2.78, 0)
    rail.material = railMaterial
  }

  for (let index = 0; index < 4; index += 1) {
    const lamp = MeshBuilder.CreateBox(
      `assembly-lamp-${index}`,
      { width: 0.56, height: 0.06, depth: 0.12 },
      scene,
    )

    lamp.position.set(-2.1 + index * 1.4, 2.42, 2.54)
    lamp.material = trimMaterial
  }
}

function animateAssembly(resources: AssemblyResources, submitted: boolean): void {
  const now = performance.now()
  const elapsed = (now - resources.startedAt) / 1000
  const bot = resources.bot

  resources.scanBar.position.y = 0.34 + ((elapsed * 0.68) % 1.55)
  resources.scanBar.scaling.x = 0.72 + Math.sin(elapsed * 2.4) * 0.08

  if (!bot) {
    return
  }

  const readyPulse = submitted ? 0.02 : 0.045

  bot.rotation.y += submitted ? 0.002 : 0.004
  bot.position.y = 0.16 + Math.sin(elapsed * 2.2) * readyPulse

  resources.botMeshes.forEach((mesh) => {
    const metadata = mesh.metadata as AssemblyMetadata | undefined
    const index = metadata?.assemblyIndex ?? 0
    const basePosition = metadata?.basePosition ?? Vector3.Zero()
    const baseScaling = metadata?.baseScaling ?? Vector3.One()
    const progress = clamp((elapsed - index * 0.045) / 0.72, 0, 1)
    const eased = easeOutBack(progress)

    mesh.setEnabled(progress > 0)
    mesh.position.copyFrom(basePosition)
    mesh.position.y += (1 - progress) * (1.4 + (index % 4) * 0.18)
    mesh.scaling.copyFrom(baseScaling.scale(0.18 + eased * 0.82))

    if (metadata?.kind === 'spin') {
      mesh.rotation.y += (metadata.speed ?? 0.06) * (submitted ? 0.8 : 1.3)
    }

    if (metadata?.kind === 'roll') {
      mesh.rotation.x += (metadata.speed ?? 0.05) * (submitted ? 0.6 : 1)
    }
  })
}

function createMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
  alpha = 1,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.specularColor = new Color3(0.18, 0.18, 0.16)
  material.alpha = alpha
  material.backFaceCulling = alpha >= 1

  return material
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function easeOutBack(progress: number): number {
  const clamped = clamp(progress, 0, 1)
  const overshoot = 1.70158

  return 1 + (overshoot + 1) * (clamped - 1) ** 3 + overshoot * (clamped - 1) ** 2
}
