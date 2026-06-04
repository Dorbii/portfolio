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
  rig: {
    trolley: AbstractMesh
    leftArm: AbstractMesh
    rightArm: AbstractMesh
    leftClamp: AbstractMesh
    rightClamp: AbstractMesh
    clampRing: AbstractMesh
    trolleyBaseX: number
    leftClampBaseY: number
    rightClampBaseY: number
    leftArmBaseZ: number
    rightArmBaseZ: number
  }
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

      const scanBarMaterial = createMaterial(scene, 'assembly-scan-mat', '#dff5ff', '#8bdfff', 0.72)
      const scanBar = MeshBuilder.CreateBox(
        'assembly-scan-bar',
        { width: 3.2, height: 0.045, depth: 0.1 },
        scene,
      )

      scanBar.position.set(0, 1.45, 0)
      scanBar.material = scanBarMaterial

      const rig = createAssemblyRoom(scene, role)

      const glow = new GlowLayer('assembly-glow', scene)
      glow.intensity = 0.42

      const bayLights = createTeamBayLights(scene, role)
      bayLights.forEach((light) => {
        light.intensity *= submitted ? 1 : 0.88
      })

      resources = {
        camera,
        engine,
        scene,
        rig,
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

function createAssemblyRoom(scene: Scene, role: TeamRole): AssemblyResources['rig'] {
  const teamPrimary = role === 'red' ? '#fc4f5d' : '#5eb2ff'
  const teamAccent = role === 'red' ? '#ff2e44' : '#338eff'
  const floorMaterial = createMaterial(scene, 'assembly-floor-mat', '#171d24', '#06070c')
  const pitMaterial = createMaterial(scene, 'assembly-pit-mat', '#212a33', '#0a0c11')
  const wallMaterial = createMaterial(scene, 'assembly-wall-mat', '#1f272f', '#090a0c')
  const railMaterial = createMaterial(scene, 'assembly-rail-mat', '#333f4a', '#090b10')
  const trimMaterial = createMaterial(scene, 'assembly-trim-mat', '#0b0d12', '#020203')
  const detailMaterial = createMaterial(scene, 'assembly-detail-mat', '#4c5d6d', '#1a1f24')
  const teamMaterial = createMaterial(scene, 'assembly-team-mat', teamPrimary, teamAccent)
  const warningMaterial = createMaterial(scene, 'assembly-warning-mat', '#d4ae42', '#473005')

  const shell = MeshBuilder.CreateBox('assembly-shell-floor', { width: 8, height: 0.14, depth: 5.8 }, scene)
  shell.position.y = -0.13
  shell.material = floorMaterial

  const pitDeck = MeshBuilder.CreateBox('assembly-pit-deck', { width: 5.4, height: 0.12, depth: 3.45 }, scene)
  pitDeck.position.set(0, -0.025, -0.1)
  pitDeck.material = pitMaterial

  for (let index = 0; index < 7; index += 1) {
    const marker = MeshBuilder.CreateBox(`assembly-floor-rail-${index}`, { width: 0.06, height: 0.01, depth: 3.45 }, scene)

    marker.position.set(-2.4 + index * 0.8, -0.02, -0.1)
    marker.material = detailMaterial
  }

  const backWall = MeshBuilder.CreateBox('assembly-back-wall', { width: 8, height: 2.8, depth: 0.14 }, scene)
  backWall.position.set(0, 1.1, 2.77)
  backWall.material = wallMaterial

  const leftWall = MeshBuilder.CreateBox('assembly-left-wall', { width: 0.14, height: 2.8, depth: 5.8 }, scene)
  const rightWall = MeshBuilder.CreateBox('assembly-right-wall', { width: 0.14, height: 2.8, depth: 5.8 }, scene)
  leftWall.position.set(-3.93, 1.1, -0.02)
  rightWall.position.set(3.93, 1.1, -0.02)
  leftWall.material = wallMaterial
  rightWall.material = wallMaterial

  const pitWallLeft = MeshBuilder.CreateBox('assembly-pit-wall-left', { width: 0.1, height: 1.1, depth: 3.45 }, scene)
  const pitWallRight = MeshBuilder.CreateBox('assembly-pit-wall-right', { width: 0.1, height: 1.1, depth: 3.45 }, scene)
  pitWallLeft.position.set(-2.65, 0.44, -0.1)
  pitWallRight.position.set(2.65, 0.44, -0.1)
  pitWallLeft.material = wallMaterial
  pitWallRight.material = wallMaterial

  const stationDeck = MeshBuilder.CreateCylinder('assembly-station-deck', { height: 0.08, diameter: 2.9, tessellation: 18 }, scene)
  stationDeck.position.y = 0.04
  stationDeck.material = teamMaterial

  const ring = MeshBuilder.CreateTorus('assembly-cradle-ring', { diameter: 3.0, thickness: 0.08, tessellation: 28 }, scene)
  ring.position.y = 0.14
  ring.rotation.x = Math.PI / 2
  ring.material = warningMaterial

  const cradlePostL = MeshBuilder.CreateCylinder(
    'assembly-cradle-post-l',
    { height: 0.48, diameterTop: 0.18, diameterBottom: 0.26, tessellation: 10 },
    scene,
  )
  const cradlePostR = MeshBuilder.CreateCylinder(
    'assembly-cradle-post-r',
    { height: 0.48, diameterTop: 0.18, diameterBottom: 0.26, tessellation: 10 },
    scene,
  )
  cradlePostL.position.set(-1.15, 0.24, 0)
  cradlePostR.position.set(1.15, 0.24, 0)
  cradlePostL.material = detailMaterial
  cradlePostR.material = detailMaterial

  const clampRing = MeshBuilder.CreateTorus('assembly-rig-clamp-ring', { diameter: 1.8, thickness: 0.1, tessellation: 24 }, scene)
  clampRing.position.y = 0.54
  clampRing.rotation.x = Math.PI / 2
  clampRing.material = trimMaterial

  const leftColumn = MeshBuilder.CreateBox('assembly-column-left', { width: 0.24, height: 2.5, depth: 0.24 }, scene)
  const rightColumn = MeshBuilder.CreateBox('assembly-column-right', { width: 0.24, height: 2.5, depth: 0.24 }, scene)
  leftColumn.position.set(-2.82, 0.98, -0.45)
  rightColumn.position.set(2.82, 0.98, -0.45)
  leftColumn.material = railMaterial
  rightColumn.material = railMaterial

  const beam = MeshBuilder.CreateBox('assembly-gantry-beam', { width: 5.6, height: 0.18, depth: 0.28 }, scene)
  beam.position.set(0, 2.72, -0.45)
  beam.material = trimMaterial

  const trolley = MeshBuilder.CreateBox(
    'assembly-gantry-trolley',
    { width: 1.0, height: 0.16, depth: 0.42 },
    scene,
  )
  trolley.position.set(0.08, 2.66, -0.45)
  trolley.material = detailMaterial

  const leftRigArm = MeshBuilder.CreateBox(
    'assembly-tool-arm-left',
    { width: 2.1, height: 0.12, depth: 0.22 },
    scene,
  )
  const rightRigArm = MeshBuilder.CreateBox(
    'assembly-tool-arm-right',
    { width: 2.1, height: 0.12, depth: 0.22 },
    scene,
  )
  leftRigArm.position.set(-0.95, 1.92, 0.42)
  rightRigArm.position.set(0.95, 1.92, 0.42)
  leftRigArm.rotation.z = 0.11
  rightRigArm.rotation.z = -0.11
  leftRigArm.material = railMaterial
  rightRigArm.material = railMaterial

  const leftClamp = MeshBuilder.CreateBox('assembly-tool-clamp-left', { width: 0.34, height: 0.18, depth: 0.3 }, scene)
  const rightClamp = MeshBuilder.CreateBox('assembly-tool-clamp-right', { width: 0.34, height: 0.18, depth: 0.3 }, scene)
  leftClamp.position.set(-0.55, 1.42, 1.12)
  rightClamp.position.set(0.55, 1.42, 1.12)
  leftClamp.material = teamMaterial
  rightClamp.material = teamMaterial

  const overheadRails = MeshBuilder.CreateBox('assembly-gantry-rails', { width: 5.6, height: 0.06, depth: 0.06 }, scene)
  overheadRails.position.set(0, 2.34, 0.32)
  overheadRails.material = detailMaterial

  for (let index = 0; index < 4; index += 1) {
    const monitor = MeshBuilder.CreateBox(`assembly-control-node-${index}`, { width: 0.26, height: 0.2, depth: 0.12 }, scene)

    monitor.position.set(-2.06 + index * 1.37, 1.85, 2.24)
    monitor.rotation.y = -0.5
    monitor.material = index % 2 === 0 ? teamMaterial : trimMaterial
  }

  const supportPanel = MeshBuilder.CreateBox('assembly-support-panel', { width: 1.05, height: 0.5, depth: 0.16 }, scene)
  supportPanel.position.set(2.96, 0.86, -1.76)
  supportPanel.material = detailMaterial

  const ventStack = MeshBuilder.CreateCylinder(
    'assembly-vent-stack',
    { height: 0.86, diameterTop: 0.28, diameterBottom: 0.45, tessellation: 10 },
    scene,
  )
  ventStack.position.set(-2.8, 0.7, 0.6)
  ventStack.material = trimMaterial

  for (let index = 0; index < 3; index += 1) {
    const beam = MeshBuilder.CreateBox(
      `assembly-floor-beam-${index}`,
      { width: 0.06, height: 1.12, depth: 0.06 },
      scene,
    )

    beam.position.set(-2.65 + index * 2.65, 0.42, -1.6)
    beam.material = trimMaterial
  }

  return {
    trolley,
    leftArm: leftRigArm,
    rightArm: rightRigArm,
    leftClamp,
    rightClamp,
    clampRing,
    trolleyBaseX: trolley.position.x,
    leftClampBaseY: leftClamp.position.y,
    rightClampBaseY: rightClamp.position.y,
    leftArmBaseZ: leftRigArm.position.z,
    rightArmBaseZ: rightRigArm.position.z,
  }
}

function createTeamBayLights(scene: Scene, role: TeamRole): PointLight[] {
  const teamColor = role === 'red' ? '#ff5c6c' : '#5c91ff'
  const portLight = new PointLight(
    'assembly-team-port-light',
    new Vector3(-1.9, 1.95, 2.0),
    scene,
  )
  const starboardLight = new PointLight(
    'assembly-team-starboard-light',
    new Vector3(1.9, 1.95, 2.0),
    scene,
  )
  const overheadLight = new PointLight(
    'assembly-team-overhead-light',
    new Vector3(0, 2.65, -0.6),
    scene,
  )

  portLight.intensity = 0.5
  starboardLight.intensity = 0.5
  overheadLight.intensity = 0.4

  portLight.diffuse = Color3.FromHexString(teamColor)
  starboardLight.diffuse = Color3.FromHexString(teamColor)
  overheadLight.diffuse = Color3.FromHexString(role === 'red' ? '#ff6f7f' : '#6ca6ff')

  return [portLight, starboardLight, overheadLight]
}

function animateAssembly(resources: AssemblyResources, submitted: boolean): void {
  const now = performance.now()
  const elapsed = (now - resources.startedAt) / 1000
  const bot = resources.bot

  resources.scanBar.position.y = 0.34 + ((elapsed * 0.68) % 1.55)
  resources.scanBar.scaling.x = 0.72 + Math.sin(elapsed * 2.4) * 0.08

  const scan = submitted ? 0.9 : 0.7
  const rigSweep = Math.sin(elapsed * (submitted ? 1 : 1.45))
  const busSpeed = elapsed * 0.22

  resources.rig.trolley.position.x = resources.rig.trolleyBaseX + rigSweep * 0.45
  resources.rig.leftArm.rotation.z = 0.12 + Math.sin(busSpeed) * 0.04
  resources.rig.rightArm.rotation.z = -0.12 + Math.cos(busSpeed * 0.92) * 0.04
  resources.rig.leftClamp.position.y = resources.rig.leftClampBaseY + Math.sin(elapsed * 1.6 + 0.9) * 0.08
  resources.rig.rightClamp.position.y = resources.rig.rightClampBaseY + Math.sin(elapsed * 1.6) * 0.08
  resources.rig.clampRing.rotation.y += 0.0022 + 0.0009 * scan
  resources.rig.leftArm.position.z = resources.rig.leftArmBaseZ + Math.cos(busSpeed) * 0.08
  resources.rig.rightArm.position.z = resources.rig.rightArmBaseZ + Math.sin(busSpeed) * 0.08

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
