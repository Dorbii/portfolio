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
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
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
  type PartFrameState,
  type ReplayEffectKind,
  type ReplayEffectState,
  type ReplayVisualFrame,
} from './replayMapping'

type ReplayBotBlueprints = Record<TeamRole, BotBlueprint>

type BabylonHazardVisual = {
  kind: string
  label: string
  mesh: Mesh
  baseScale: number
  spinSpeed: number
}

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

type EffectPool = Record<ReplayEffectKind, Mesh[]>

type BotVisualProfile = {
  primaryWeapon: 'net' | 'turret' | 'spinner' | 'hammer' | 'melee' | 'generic'
  hasBooster: boolean
  hasMagnet: boolean
  hasSmoke: boolean
}

type BotPartNodeMetadata = {
  kind: 'bot_part'
  blockId: string
  partId: string
  basePosition: [number, number, number]
  baseRotation: [number, number, number]
}

type WeaponEffectPartMetadata = {
  weaponEffectPart?: 'muzzle' | 'net-hoop' | 'net-strand' | 'net-weight'
  baseX?: number
  baseY?: number
}

type DroneEffectPartMetadata = {
  droneEffectPart?: 'pod' | 'rotor' | 'sensor' | 'scan' | 'trail'
  droneIndex?: number
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
    updateBots(resources, frame)
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

function createBotVisualProfiles(
  botBlueprints: ReplayBotBlueprints,
): Record<TeamRole, BotVisualProfile> {
  return {
    red: createBotVisualProfile(botBlueprints.red),
    blue: createBotVisualProfile(botBlueprints.blue),
  }
}

function createBotVisualProfile(blueprint: BotBlueprint): BotVisualProfile {
  const partIds = blueprint.blocks.map((block) => block.partId)
  const primaryWeapon = partIds.find((partId) => partId.startsWith('Weapon_'))

  return {
    primaryWeapon: classifyWeaponVisual(primaryWeapon),
    hasBooster: partIds.some((partId) => partId.includes('Booster')),
    hasMagnet: partIds.some((partId) => partId.includes('Magnet')),
    hasSmoke: partIds.some((partId) => partId.includes('Smoke')),
  }
}

function classifyWeaponVisual(partId: string | undefined): BotVisualProfile['primaryWeapon'] {
  if (!partId) {
    return 'generic'
  }

  if (partId.includes('Net')) {
    return 'net'
  }

  if (partId.includes('Turret')) {
    return 'turret'
  }

  if (partId.includes('Spinner') || partId.includes('Saw')) {
    return 'spinner'
  }

  if (partId.includes('Hammer')) {
    return 'hammer'
  }

  if (partId.includes('Flipper') || partId.includes('Grabber') || partId.includes('Ram') || partId.includes('Spear')) {
    return 'melee'
  }

  return 'generic'
}

function createArena(scene: Scene, arena: ArenaConfig): BabylonHazardVisual[] {
  const floorMaterial = createSceneMaterial(scene, 'floor-mat', '#151a1a', '#020303', 1, 0.24)
  const seamMaterial = createSceneMaterial(scene, 'panel-mat', '#334043', '#060808', 1, 0.28)
  const wallMaterial = createSceneMaterial(scene, 'wall-mat', '#2b3134', '#050607', 1, 0.22)
  const apronMaterial = createSceneMaterial(scene, 'arena-apron-mat', '#080b0d', '#010202')
  const glassMaterial = createSceneMaterial(scene, 'glass-mat', '#8bdfff', '#061824', 0.24, 0.5)
  const trimMaterial = createSceneMaterial(scene, 'arena-trim-mat', '#101315', '#030404')
  const warningMaterial = createSceneMaterial(scene, 'arena-warning-mat', '#d8ae33', '#4c3105', 1, 0.18)
  const redPadMaterial = createSceneMaterial(scene, 'red-pad-mat', '#8f2632', '#37080e', 0.9, 0.28)
  const bluePadMaterial = createSceneMaterial(scene, 'blue-pad-mat', '#1f5c97', '#061d34', 0.9, 0.28)
  const redLightMaterial = createSceneMaterial(scene, 'red-led-mat', '#ff5968', '#ff2438', 1, 0.1)
  const blueLightMaterial = createSceneMaterial(scene, 'blue-led-mat', '#57adff', '#167fff', 1, 0.1)
  const whiteLightMaterial = createSceneMaterial(scene, 'white-led-mat', '#dfefff', '#9bd7ff', 1, 0.1)
  const hazardMaterial = createSceneMaterial(scene, 'hazard-mat', '#f0bd3c', '#654006', 1, 0.18)
  const hatchMaterial = createSceneMaterial(scene, 'hatch-mat', '#101416', '#020303')
  const centerMaterial = createSceneMaterial(scene, 'center-mark-mat', '#5b676c', '#10161b', 0.78)

  const apron = MeshBuilder.CreateBox(
    'arena-apron',
    { width: arena.width + 1.2, height: 0.32, depth: arena.height + 1.2 },
    scene,
  )
  apron.position.y = -0.26
  apron.material = apronMaterial

  const floor = MeshBuilder.CreateBox(
    'arena-floor',
    { width: arena.width, height: 0.14, depth: arena.height },
    scene,
  )
  floor.position.y = -0.08
  floor.material = floorMaterial
  createFloorPlateDetails(scene, arena.width, arena.height, seamMaterial, trimMaterial)

  const seamColumns = 8
  const seamRows = 6

  for (let index = 1; index < seamColumns; index += 1) {
    const x = -arena.width / 2 + (arena.width / seamColumns) * index
    const seam = MeshBuilder.CreateBox(
      `floor-seam-x-${index}`,
      { width: 0.038, height: 0.012, depth: arena.height - 1.45 },
      scene,
    )
    seam.position.set(x, 0.007, 0)
    seam.material = seamMaterial
  }

  for (let index = 1; index < seamRows; index += 1) {
    const z = -arena.height / 2 + (arena.height / seamRows) * index
    const seam = MeshBuilder.CreateBox(
      `floor-seam-z-${index}`,
      { width: arena.width - 1.45, height: 0.012, depth: 0.038 },
      scene,
    )
    seam.position.set(0, 0.007, z)
    seam.material = seamMaterial
  }

  createWall(scene, 'north-wall', 0, arena.height / 2 + 0.03, arena.width, 0.26, wallMaterial)
  createWall(scene, 'south-wall', 0, -arena.height / 2 - 0.03, arena.width, 0.26, wallMaterial)
  createWall(scene, 'east-wall', arena.width / 2 + 0.03, 0, 0.26, arena.height, wallMaterial)
  createWall(scene, 'west-wall', -arena.width / 2 - 0.03, 0, 0.26, arena.height, wallMaterial)
  createBumperSegments(scene, arena.width, arena.height, warningMaterial, trimMaterial)
  createGlass(scene, 'north-glass', 0, arena.height / 2 - 0.14, arena.width, 0.08, glassMaterial)
  createGlass(scene, 'south-glass', 0, -arena.height / 2 + 0.14, arena.width, 0.08, glassMaterial)
  createGlass(scene, 'east-glass', arena.width / 2 - 0.14, 0, 0.08, arena.height, glassMaterial)
  createGlass(scene, 'west-glass', -arena.width / 2 + 0.14, 0, 0.08, arena.height, glassMaterial)
  createGlassPosts(scene, arena.width, arena.height, trimMaterial)
  createArenaLightBars(scene, arena.width, arena.height, redLightMaterial, blueLightMaterial, whiteLightMaterial)

  const marker = MeshBuilder.CreateTorus(
    'arena-center-mark',
    { diameter: 2.2, thickness: 0.03, tessellation: 40 },
    scene,
  )
  marker.position.y = 0.04
  marker.material = centerMaterial
  marker.rotation.x = Math.PI / 2
  createCenterLogo(scene, centerMaterial, whiteLightMaterial)

  createSpawnPad(
    scene,
    'red',
    -arena.width * 0.34,
    0,
    redPadMaterial,
    redLightMaterial,
    trimMaterial,
  )
  createSpawnPad(
    scene,
    'blue',
    arena.width * 0.34,
    0,
    bluePadMaterial,
    blueLightMaterial,
    trimMaterial,
  )
  createStaticTrapDoors(scene, arena.width, arena.height, hatchMaterial, warningMaterial, trimMaterial)

  const hazardPlates = createHazardVisuals(scene, arena)
  const arenaBoundaryPostMaterial = createSceneMaterial(scene, 'post-mat', '#171b20', '#050608')

  createBoundaryPosts(scene, arenaBoundaryPostMaterial, arena.width, arena.height)
  createCornerMarkers(scene, arena.width, arena.height, arenaBoundaryPostMaterial)
  marker.material = centerMaterial

  hazardPlates.forEach((hazard, index) => {
    if (hazard.kind === 'saw') {
      const ring = MeshBuilder.CreateTorus(
        `hazard-${index}-warning-ring`,
        { diameter: 1.55, thickness: 0.13, tessellation: 26 },
        scene,
      )
      ring.parent = hazard.mesh
      ring.material = hazardMaterial
      ring.position.y = 0.08
    }

    hazard.mesh.material = hazardMaterial
  })

  hazardPlates.forEach((hazard) => {
    hazard.mesh.position.x = hazard.mesh.position.x
    hazard.mesh.position.z = hazard.mesh.position.z
  })

  return hazardPlates
}

function createFloorPlateDetails(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  seamMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const panelWidth = arenaWidth / 4
  const panelDepth = arenaHeight / 3

  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      const x = -arenaWidth / 2 + panelWidth * (column + 0.5)
      const z = -arenaHeight / 2 + panelDepth * (row + 0.5)
      const plate = MeshBuilder.CreateBox(
        `floor-plate-${column}-${row}`,
        { width: panelWidth - 0.24, height: 0.018, depth: panelDepth - 0.24 },
        scene,
      )

      plate.position.set(x, -0.002, z)
      plate.material = column === 1 || column === 2 ? seamMaterial : trimMaterial
    }
  }

  for (let column = 0; column <= 4; column += 1) {
    for (let row = 0; row <= 3; row += 1) {
      const bolt = MeshBuilder.CreateCylinder(
        `floor-bolt-${column}-${row}`,
        { height: 0.035, diameter: 0.09, tessellation: 8 },
        scene,
      )

      bolt.position.set(
        -arenaWidth / 2 + column * panelWidth,
        0.028,
        -arenaHeight / 2 + row * panelDepth,
      )
      bolt.rotation.x = Math.PI / 2
      bolt.material = trimMaterial
    }
  }
}

function createBumperSegments(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  warningMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const segmentCount = 11
  const northZ = arenaHeight / 2 - 0.45
  const southZ = -arenaHeight / 2 + 0.45

  for (let index = 0; index < segmentCount; index += 1) {
    const x = -arenaWidth / 2 + 1.3 + index * ((arenaWidth - 2.6) / (segmentCount - 1))

    createRailSegment(scene, `north-bumper-${index}`, x, northZ, 0, warningMaterial, trimMaterial)
    createRailSegment(scene, `south-bumper-${index}`, x, southZ, 0, warningMaterial, trimMaterial)
  }

  const sideSegmentCount = 7

  for (let index = 0; index < sideSegmentCount; index += 1) {
    const z = -arenaHeight / 2 + 1.3 + index * ((arenaHeight - 2.6) / (sideSegmentCount - 1))

    createRailSegment(scene, `east-bumper-${index}`, arenaWidth / 2 - 0.45, z, Math.PI / 2, warningMaterial, trimMaterial)
    createRailSegment(scene, `west-bumper-${index}`, -arenaWidth / 2 + 0.45, z, Math.PI / 2, warningMaterial, trimMaterial)
  }
}

function createRailSegment(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  rotationY: number,
  warningMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const base = MeshBuilder.CreateBox(name, { width: 1.05, height: 0.3, depth: 0.18 }, scene)
  const cap = MeshBuilder.CreateBox(`${name}-cap`, { width: 1.02, height: 0.08, depth: 0.2 }, scene)

  base.position.set(x, 0.23, z)
  base.rotation.y = rotationY
  base.material = warningMaterial
  cap.position.set(x, 0.43, z)
  cap.rotation.y = rotationY
  cap.material = trimMaterial
}

function createGlassPosts(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  material: StandardMaterial,
): void {
  const postsPerLongSide = 6
  const postsPerShortSide = 4

  for (let index = 0; index <= postsPerLongSide; index += 1) {
    const x = -arenaWidth / 2 + (arenaWidth / postsPerLongSide) * index

    createGlassPost(scene, `north-glass-post-${index}`, x, arenaHeight / 2 - 0.15, material)
    createGlassPost(scene, `south-glass-post-${index}`, x, -arenaHeight / 2 + 0.15, material)
  }

  for (let index = 1; index < postsPerShortSide; index += 1) {
    const z = -arenaHeight / 2 + (arenaHeight / postsPerShortSide) * index

    createGlassPost(scene, `east-glass-post-${index}`, arenaWidth / 2 - 0.15, z, material)
    createGlassPost(scene, `west-glass-post-${index}`, -arenaWidth / 2 + 0.15, z, material)
  }
}

function createGlassPost(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  material: StandardMaterial,
): void {
  const post = MeshBuilder.CreateBox(name, { width: 0.12, height: 1.38, depth: 0.12 }, scene)

  post.position.set(x, 1.08, z)
  post.material = material
}

function createArenaLightBars(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  redMaterial: StandardMaterial,
  blueMaterial: StandardMaterial,
  whiteMaterial: StandardMaterial,
): void {
  createLightBar(scene, 'red-back-light', -arenaWidth * 0.34, arenaHeight / 2 - 0.28, 1.32, 0, redMaterial)
  createLightBar(scene, 'blue-back-light', arenaWidth * 0.34, -arenaHeight / 2 + 0.28, 1.32, 0, blueMaterial)
  createLightBar(scene, 'north-center-light', 0, arenaHeight / 2 - 0.28, 1.1, 0, whiteMaterial)
  createLightBar(scene, 'south-center-light', 0, -arenaHeight / 2 + 0.28, 1.1, 0, whiteMaterial)
  createLightBar(scene, 'east-side-light', arenaWidth / 2 - 0.28, 0, 1.1, Math.PI / 2, redMaterial)
  createLightBar(scene, 'west-side-light', -arenaWidth / 2 + 0.28, 0, 1.1, Math.PI / 2, blueMaterial)
}

function createLightBar(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  rotationY: number,
  material: StandardMaterial,
): void {
  const bar = MeshBuilder.CreateBox(name, { width, height: 0.08, depth: 0.08 }, scene)

  bar.position.set(x, 0.84, z)
  bar.rotation.y = rotationY
  bar.material = material
}

function createCenterLogo(
  scene: Scene,
  markMaterial: StandardMaterial,
  lightMaterial: StandardMaterial,
): void {
  const leftWing = MeshBuilder.CreateBox(
    'center-logo-left',
    { width: 0.72, height: 0.028, depth: 0.22 },
    scene,
  )
  const rightWing = MeshBuilder.CreateBox(
    'center-logo-right',
    { width: 0.72, height: 0.028, depth: 0.22 },
    scene,
  )
  const core = MeshBuilder.CreateBox(
    'center-logo-core',
    { width: 0.34, height: 0.03, depth: 0.68 },
    scene,
  )

  leftWing.position.set(-0.36, 0.055, 0)
  rightWing.position.set(0.36, 0.055, 0)
  core.position.set(0, 0.058, 0)
  leftWing.rotation.y = -0.34
  rightWing.rotation.y = 0.34
  leftWing.material = markMaterial
  rightWing.material = markMaterial
  core.material = lightMaterial
}

function createSpawnPad(
  scene: Scene,
  role: TeamRole,
  x: number,
  z: number,
  padMaterial: StandardMaterial,
  lightMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const pad = MeshBuilder.CreateBox(
    `${role}-spawn-pad`,
    { width: 5.2, height: 0.036, depth: 3.4 },
    scene,
  )
  const beacon = MeshBuilder.CreateTorus(
    `${role}-spawn-beacon`,
    { diameter: 2.6, thickness: 0.09, tessellation: 24 },
    scene,
  )

  pad.position.set(x, 0.015, z)
  pad.material = padMaterial
  beacon.position.set(x, 0.08, z)
  beacon.rotation.x = Math.PI / 2
  beacon.material = lightMaterial

  createPadFrame(scene, `${role}-spawn-frame`, x, z, 5.5, 3.7, trimMaterial)
  createFloorLightStrip(scene, `${role}-spawn-led-front`, x, z - 1.72, 2.2, 0, lightMaterial)
  createFloorLightStrip(scene, `${role}-spawn-led-back`, x, z + 1.72, 2.2, 0, lightMaterial)
}

function createPadFrame(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  material: StandardMaterial,
): void {
  const north = MeshBuilder.CreateBox(`${name}-north`, { width, height: 0.055, depth: 0.14 }, scene)
  const south = MeshBuilder.CreateBox(`${name}-south`, { width, height: 0.055, depth: 0.14 }, scene)
  const east = MeshBuilder.CreateBox(`${name}-east`, { width: 0.14, height: 0.055, depth }, scene)
  const west = MeshBuilder.CreateBox(`${name}-west`, { width: 0.14, height: 0.055, depth }, scene)

  north.position.set(x, 0.055, z + depth / 2)
  south.position.set(x, 0.055, z - depth / 2)
  east.position.set(x + width / 2, 0.055, z)
  west.position.set(x - width / 2, 0.055, z)
  north.material = material
  south.material = material
  east.material = material
  west.material = material
}

function createFloorLightStrip(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  width: number,
  rotationY: number,
  material: StandardMaterial,
): void {
  const strip = MeshBuilder.CreateBox(name, { width, height: 0.05, depth: 0.08 }, scene)

  strip.position.set(x, 0.085, z)
  strip.rotation.y = rotationY
  strip.material = material
}

function createStaticTrapDoors(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  hatchMaterial: StandardMaterial,
  warningMaterial: StandardMaterial,
  trimMaterial: StandardMaterial,
): void {
  const trapPositions = [
    [-arenaWidth * 0.28, -arenaHeight * 0.27],
    [arenaWidth * 0.28, -arenaHeight * 0.27],
    [-arenaWidth * 0.28, arenaHeight * 0.27],
    [arenaWidth * 0.28, arenaHeight * 0.27],
  ]

  trapPositions.forEach(([x, z], index) => {
    const hatch = MeshBuilder.CreateBox(
      `static-hazard-hatch-${index}`,
      { width: 1.7, height: 0.028, depth: 1.05 },
      scene,
    )

    hatch.position.set(x, 0.03, z)
    hatch.material = hatchMaterial
    createPadFrame(scene, `static-hazard-hatch-frame-${index}`, x, z, 1.95, 1.3, warningMaterial)

    const handle = MeshBuilder.CreateBox(
      `static-hazard-hatch-handle-${index}`,
      { width: 0.72, height: 0.06, depth: 0.12 },
      scene,
    )

    handle.position.set(x, 0.08, z)
    handle.material = trimMaterial
  })
}

function createHazardVisuals(
  scene: Scene,
  arena: ArenaConfig,
): BabylonHazardVisual[] {
  const hazards: BabylonHazardVisual[] = []

  arena.activeHazards.forEach((rawName, index) => {
    const normalized = normalizeHazard(rawName)

    if (normalized.includes('corner')) {
      const cornerSlots = ['northwest', 'northeast', 'southwest', 'southeast'] as const

      cornerSlots.forEach((slot, slotIndex) => {
        const { x, z } = slotToPosition(slot, arena.width, arena.height)

        hazards.push({
          kind: 'flipper',
          label: normalized,
          mesh: createHazardPlate(
            scene,
            `hazard-${normalized}-${index}-${slotIndex}`,
            x,
            z,
            0.06,
            1.1,
            0.72,
            `${normalized} ${slot}`,
          ),
          baseScale: 1,
          spinSpeed: 0,
        })
      })

      return
    }

    const visual = buildHazardVisual(
      scene,
      `${normalized}-${index}`,
      normalized,
      arena.width,
      arena.height,
    )

    if (visual) {
      hazards.push(visual)
    }
  })

  if (hazards.length === 0) {
    return [
      {
        kind: 'saw',
        label: 'center',
        mesh: createHazardPlate(
          scene,
          'hazard-default',
          0,
          0,
          0,
          0.7,
          0.7,
          'center',
        ),
        baseScale: 1,
        spinSpeed: 0,
      },
    ]
  }

  return hazards
}

function buildHazardVisual(
  scene: Scene,
  id: string,
  normalized: string,
  arenaWidth: number,
  arenaHeight: number,
): BabylonHazardVisual | undefined {
  const kind = classifyHazardKind(normalized)
  const slot = classifyHazardSlot(normalized)
  const { x, z } = slotToPosition(slot, arenaWidth, arenaHeight)

  if (kind === 'saw') {
    const sawPlate = createHazardPlate(
      scene,
      `hazard-${id}`,
      x,
      z,
      0.06,
      0.84,
      1.05,
      `saw ${slot}`,
    )

    return {
      kind: 'saw',
      label: normalized,
      mesh: sawPlate,
      baseScale: 1,
      spinSpeed: 0.05,
    }
  }

  if (kind === 'pit') {
    const pit = createHazardPlate(
      scene,
      `hazard-${id}`,
      x,
      z,
      -0.07,
      0.76,
      0.8,
      `pit ${slot}`,
    )

    return {
      kind: 'pit',
      label: normalized,
      mesh: pit,
      baseScale: 1,
      spinSpeed: 0,
    }
  }

  if (kind === 'oil') {
    const oil = createHazardPlate(
      scene,
      `hazard-${id}`,
      x,
      z,
      0.03,
      1.02,
      1.08,
      `oil ${slot}`,
    )

    oil.metadata = { materialTint: true }

    return {
      kind: 'oil',
      label: normalized,
      mesh: oil,
      baseScale: 1,
      spinSpeed: 0,
    }
  }

  if (kind === 'magnet') {
    const magnet = MeshBuilder.CreateTorus(
      `hazard-${id}`,
      { diameter: 1.2, thickness: 0.12, tessellation: 28 },
      scene,
    )
    magnet.position.set(x, 0.07, z)

    return {
      kind: 'magnet',
      label: normalized,
      mesh: magnet,
      baseScale: 1,
      spinSpeed: 0.08,
    }
  }

  if (kind === 'flipper') {
    const flipper = createHazardPlate(
      scene,
      `hazard-${id}`,
      x,
      z,
      0.055,
      1.12,
      0.68,
      `flipper ${slot}`,
    )

    return {
      kind: 'flipper',
      label: normalized,
      mesh: flipper,
      baseScale: 1,
      spinSpeed: 0,
    }
  }

  const fallback = createHazardPlate(
    scene,
    `hazard-${id}`,
    x,
    z,
    0.05,
    0.9,
    0.9,
    `hazard ${slot}`,
  )

  return {
    kind: 'generic',
    label: normalized,
    mesh: fallback,
    baseScale: 1,
    spinSpeed: 0,
  }
}

function createHazardPlate(
  scene: Scene,
  name: string,
  x: number,
  z: number,
  yOffset: number,
  width: number,
  depth: number,
  label: string,
): Mesh {
  const plate = MeshBuilder.CreateCylinder(
    name,
    { height: 0.08, diameter: width * 1.1, tessellation: 18 },
    scene,
  )
  plate.position.set(x, yOffset, z)
  plate.rotation.z = Math.PI / 2
  plate.scaling.z = Math.max(0.2, depth / Math.max(width, 0.1))
  plate.metadata = { label }

  return plate
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
  const wall = MeshBuilder.CreateBox(name, { width, height: 0.64, depth }, scene)

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
  const glass = MeshBuilder.CreateBox(name, { width, height: 1.18, depth }, scene)

  glass.position.set(x, 1.06, z)
  glass.material = material
}

function createBoundaryPosts(
  scene: Scene,
  material: StandardMaterial,
  arenaWidth: number,
  arenaHeight: number,
): void {
  const offsets = [
    [arenaWidth / 2 - 0.9, arenaHeight / 2 - 0.9],
    [-arenaWidth / 2 + 0.9, arenaHeight / 2 - 0.9],
    [arenaWidth / 2 - 0.9, -arenaHeight / 2 + 0.9],
    [-arenaWidth / 2 + 0.9, -arenaHeight / 2 + 0.9],
  ]

  offsets.forEach(([x, z], index) => {
    const post = MeshBuilder.CreateBox(
      `arena-post-${index}`,
      { width: 0.22, height: 1.05, depth: 0.22 },
      scene,
    )

    post.position.set(x, 0.52, z)
    post.material = material
  })
}

function createCornerMarkers(
  scene: Scene,
  arenaWidth: number,
  arenaHeight: number,
  material: StandardMaterial,
): void {
  const spacing = 1
  const corners = [
    [arenaWidth / 2 - spacing, arenaHeight / 2 - spacing],
    [-arenaWidth / 2 + spacing, arenaHeight / 2 - spacing],
    [arenaWidth / 2 - spacing, -arenaHeight / 2 + spacing],
    [-arenaWidth / 2 + spacing, -arenaHeight / 2 + spacing],
  ]

  corners.forEach(([x, z], index) => {
    const marker = MeshBuilder.CreateTorus(
      `corner-marker-${index}`,
      { diameter: 1.2, thickness: 0.06, tessellation: 18 },
      scene,
    )

    marker.position.set(x, 0.08, z)
    marker.material = material
    marker.rotation.x = Math.PI / 2
  })
}

function createCenterSpinner(scene: Scene): Mesh {
  const spinner = MeshBuilder.CreateCylinder(
    'center-anim-spinner',
    { height: 0.06, diameter: 1.2, tessellation: 24 },
    scene,
  )
  const glow = MeshBuilder.CreateTorus(
    'center-anim-spinner-glow',
    { diameter: 1.28, thickness: 0.06, tessellation: 22 },
    scene,
  )
  const material = createSceneMaterial(scene, 'center-spinner-mat', '#e6b95d', '#3f2a09')
  const toothMaterial = createSceneMaterial(scene, 'center-spinner-tooth-mat', '#f2d174', '#573803')

  spinner.material = material
  glow.material = material
  glow.position.set(0, 0.06, 0)
  glow.parent = spinner
  glow.rotation.x = Math.PI / 2

  for (let index = 0; index < 8; index += 1) {
    const tooth = MeshBuilder.CreateBox(
      `center-spinner-tooth-${index}`,
      { width: 0.18, height: 0.09, depth: 0.38 },
      scene,
    )
    const angle = (Math.PI * 2 * index) / 8

    tooth.position.set(Math.cos(angle) * 0.54, 0.05, Math.sin(angle) * 0.54)
    tooth.rotation.y = angle
    tooth.parent = spinner
    tooth.material = toothMaterial
  }

  return spinner
}

function createEffectPool(scene: Scene): EffectPool {
  const sparkMaterial = createSceneMaterial(scene, 'spark-mat', '#ffd35f', '#ff8a24')
  const smokeMaterial = createSceneMaterial(scene, 'smoke-mat', '#aeb8b4', '#151918', 0.42)
  const weaponMaterial = createSceneMaterial(scene, 'weapon-flash-mat', '#f7f2b4', '#f7c24b')
  const netMaterial = createSceneMaterial(scene, 'net-flash-mat', '#f5d47a', '#9d6c12', 0.82, 0.2)
  const controlNetMaterial = createSceneMaterial(scene, 'control-net-mat', '#b8ffff', '#1cf4ff', 0.88, 0.08)
  const laserMaterial = createSceneMaterial(scene, 'laser-lance-mat', '#fff8df', '#ff34d2', 1, 0.04)
  const laserGlowMaterial = createSceneMaterial(scene, 'laser-lance-glow-mat', '#ffcf5b', '#ff4dd8', 0.5, 0.03)
  const partDetachMaterial = createSceneMaterial(scene, 'part-detach-mat', '#ffe4a8', '#ff6b2e', 0.68, 0.08)
  const debrisMaterial = createSceneMaterial(scene, 'debris-mat', '#d2d6d2', '#3a403d')
  const damageMaterial = createSceneMaterial(scene, 'damage-marker-mat', '#ff8b5d', '#ff2e2e')
  const hazardMaterial = createSceneMaterial(scene, 'hazard-flash-mat', '#ffcc4d', '#ff751f')
  const koMaterial = createSceneMaterial(scene, 'ko-mat', '#f4eef2', '#b83342')

  return {
    weapon_fire: Array.from({ length: 6 }, (_, index) =>
      createPooledWeaponEffect(scene, `weapon-effect-${index}`, weaponMaterial, netMaterial),
    ),
    control_net: Array.from({ length: 4 }, (_, index) =>
      createPooledControlNetEffect(scene, `control-net-effect-${index}`, controlNetMaterial),
    ),
    laser_lance: Array.from({ length: 3 }, (_, index) =>
      createPooledLaserLanceEffect(scene, `laser-lance-effect-${index}`, laserMaterial, laserGlowMaterial),
    ),
    drone_swarm: Array.from({ length: 3 }, (_, index) =>
      createPooledDroneSwarmEffect(scene, `drone-swarm-effect-${index}`),
    ),
    part_detach: Array.from({ length: 6 }, (_, index) =>
      createPooledTorus(scene, `part-detach-effect-${index}`, partDetachMaterial, 0.95),
    ),
    impact: Array.from({ length: 12 }, (_, index) =>
      createPooledImpactBurstEffect(scene, `impact-effect-${index}`, sparkMaterial),
    ),
    debris: Array.from({ length: 24 }, (_, index) =>
      createPooledBox(scene, `debris-effect-${index}`, debrisMaterial, [0.22, 0.1, 0.16]),
    ),
    damage_marker: Array.from({ length: 16 }, (_, index) =>
      createPooledTorus(scene, `damage-marker-effect-${index}`, damageMaterial, 1.25),
    ),
    smoke: Array.from({ length: 10 }, (_, index) =>
      createPooledSphere(scene, `smoke-effect-${index}`, smokeMaterial, 0.48),
    ),
    hazard: Array.from({ length: 4 }, (_, index) =>
      createPooledTorus(scene, `hazard-effect-${index}`, hazardMaterial, 1.1),
    ),
    knockout: Array.from({ length: 2 }, (_, index) =>
      createPooledTorus(scene, `knockout-effect-${index}`, koMaterial, 1.8),
    ),
  }
}

function createPooledControlNetEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateTorus(
    name,
    { diameter: 1.8, thickness: 0.075, tessellation: 36 },
    scene,
  )

  mesh.material = material
  mesh.rotation.x = Math.PI / 2

  for (let index = -2; index <= 2; index += 1) {
    const vertical = MeshBuilder.CreateBox(
      `${name}-vertical-${index + 2}`,
      { width: 0.035, height: 1.54, depth: 0.035 },
      scene,
    )
    const horizontal = MeshBuilder.CreateBox(
      `${name}-horizontal-${index + 2}`,
      { width: 1.54, height: 0.035, depth: 0.035 },
      scene,
    )

    vertical.position.set(index * 0.28, 0, 0)
    horizontal.position.set(0, index * 0.28, 0)
    vertical.parent = mesh
    horizontal.parent = mesh
    vertical.material = material
    horizontal.material = material
  }

  const cornerOffsets: Array<[number, number]> = [
    [-0.82, -0.82],
    [0.82, -0.82],
    [-0.82, 0.82],
    [0.82, 0.82],
  ]

  cornerOffsets.forEach(([x, z], index) => {
    const anchor = MeshBuilder.CreateSphere(
      `${name}-anchor-${index}`,
      { diameter: 0.16, segments: 10 },
      scene,
    )

    anchor.position.set(x, 0, z)
    anchor.parent = mesh
    anchor.material = material
  })

  mesh.setEnabled(false)

  return mesh
}

function createPooledLaserLanceEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  glowMaterial: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(
    name,
    { width: 0.26, height: 0.18, depth: 1 },
    scene,
  )
  const glow = MeshBuilder.CreateBox(
    `${name}-glow`,
    { width: 1.05, height: 0.44, depth: 1.04 },
    scene,
  )
  const startNode = MeshBuilder.CreateSphere(
    `${name}-start-node`,
    { diameter: 0.36, segments: 12 },
    scene,
  )
  const endNode = MeshBuilder.CreateSphere(
    `${name}-end-node`,
    { diameter: 0.42, segments: 12 },
    scene,
  )
  const hotCore = MeshBuilder.CreateBox(
    `${name}-hot-core`,
    { width: 0.08, height: 0.52, depth: 1.08 },
    scene,
  )

  mesh.material = material
  glow.material = glowMaterial
  glow.parent = mesh
  startNode.position.z = -0.5
  endNode.position.z = 0.5
  startNode.parent = mesh
  endNode.parent = mesh
  startNode.material = material
  endNode.material = material
  hotCore.parent = mesh
  hotCore.material = material
  mesh.setEnabled(false)

  return mesh
}

function createPooledDroneSwarmEffect(scene: Scene, name: string): Mesh {
  const bodyMaterial = createSceneMaterial(scene, `${name}-body-mat`, '#263238', '#071113')
  const accentMaterial = createSceneMaterial(scene, `${name}-accent-mat`, '#dfff75', '#8cff2a', 1, 0.04)
  const scanMaterial = createSceneMaterial(scene, `${name}-scan-mat`, '#e8ffb0', '#75ff47', 0.44, 0.03)
  const trailMaterial = createSceneMaterial(scene, `${name}-trail-mat`, '#b8fff0', '#4dffc3', 0.5, 0.03)
  const mesh = MeshBuilder.CreateBox(name, { width: 0.24, height: 0.16, depth: 0.24 }, scene)

  mesh.material = bodyMaterial

  for (let index = 0; index < 3; index += 1) {
    const angle = (Math.PI * 2 * index) / 3
    const x = Math.cos(angle) * 0.72
    const z = Math.sin(angle) * 0.72
    const tangent = angle + Math.PI / 2
    const pod = MeshBuilder.CreateBox(
      `${name}-pod-${index}`,
      { width: 0.54, height: 0.22, depth: 0.42 },
      scene,
    )
    const rotor = MeshBuilder.CreateTorus(
      `${name}-rotor-${index}`,
      { diameter: 0.5, thickness: 0.045, tessellation: 20 },
      scene,
    )
    const sensor = MeshBuilder.CreateSphere(
      `${name}-sensor-${index}`,
      { diameter: 0.14, segments: 8 },
      scene,
    )
    const trail = MeshBuilder.CreateBox(
      `${name}-trail-${index}`,
      { width: 0.08, height: 0.055, depth: 0.78 },
      scene,
    )

    pod.position.set(x, 0, z)
    pod.rotation.y = tangent
    pod.parent = mesh
    pod.material = bodyMaterial
    pod.metadata = { droneEffectPart: 'pod', droneIndex: index }

    rotor.position.set(x, 0.18, z)
    rotor.rotation.x = Math.PI / 2
    rotor.parent = mesh
    rotor.material = accentMaterial
    rotor.metadata = { droneEffectPart: 'rotor', droneIndex: index }

    sensor.position.set(x + Math.cos(angle) * 0.18, -0.02, z + Math.sin(angle) * 0.18)
    sensor.parent = mesh
    sensor.material = accentMaterial
    sensor.metadata = { droneEffectPart: 'sensor', droneIndex: index }

    trail.position.set(x - Math.cos(angle) * 0.32, -0.02, z - Math.sin(angle) * 0.32)
    trail.rotation.y = tangent
    trail.parent = mesh
    trail.material = trailMaterial
    trail.metadata = { droneEffectPart: 'trail', droneIndex: index }
  }

  const scanCone = MeshBuilder.CreateCylinder(
    `${name}-scan-cone`,
    { height: 1.45, diameterTop: 0.18, diameterBottom: 1.15, tessellation: 18 },
    scene,
  )
  const scanRing = MeshBuilder.CreateTorus(
    `${name}-scan-ring`,
    { diameter: 1.42, thickness: 0.055, tessellation: 30 },
    scene,
  )

  scanCone.position.y = -0.68
  scanCone.parent = mesh
  scanCone.material = scanMaterial
  scanCone.metadata = { droneEffectPart: 'scan' }
  scanRing.position.y = -1.25
  scanRing.rotation.x = Math.PI / 2
  scanRing.parent = mesh
  scanRing.material = scanMaterial
  scanRing.metadata = { droneEffectPart: 'scan' }
  mesh.setEnabled(false)

  return mesh
}

function createPooledWeaponEffect(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  netMaterial: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: 0.14, height: 0.14, depth: 1.25 }, scene)
  const muzzle = MeshBuilder.CreateTorus(
    `${name}-muzzle`,
    { diameter: 0.44, thickness: 0.04, tessellation: 18 },
    scene,
  )
  const netHoop = MeshBuilder.CreateTorus(
    `${name}-net-hoop`,
    { diameter: 1, thickness: 0.04, tessellation: 24 },
    scene,
  )

  mesh.material = material
  muzzle.material = material
  muzzle.parent = mesh
  muzzle.rotation.x = Math.PI / 2
  muzzle.position.z = 0.2
  muzzle.metadata = { weaponEffectPart: 'muzzle' }

  netHoop.material = netMaterial
  netHoop.parent = mesh
  netHoop.rotation.x = Math.PI / 2
  netHoop.position.z = 0.34
  netHoop.metadata = { weaponEffectPart: 'net-hoop', baseX: 0, baseY: 0 }

  for (let index = -2; index <= 2; index += 1) {
    const vertical = MeshBuilder.CreateBox(
      `${name}-net-vertical-${index + 2}`,
      { width: 0.035, height: 0.82, depth: 0.025 },
      scene,
    )
    const horizontal = MeshBuilder.CreateBox(
      `${name}-net-horizontal-${index + 2}`,
      { width: 0.82, height: 0.035, depth: 0.025 },
      scene,
    )

    vertical.position.set(index * 0.16, 0, 0.34)
    horizontal.position.set(0, index * 0.14, 0.34)
    vertical.parent = mesh
    horizontal.parent = mesh
    vertical.material = netMaterial
    horizontal.material = netMaterial
    vertical.metadata = { weaponEffectPart: 'net-strand', baseX: vertical.position.x, baseY: vertical.position.y }
    horizontal.metadata = { weaponEffectPart: 'net-strand', baseX: horizontal.position.x, baseY: horizontal.position.y }
  }

  const weights: Array<[number, number]> = [
    [-0.42, -0.36],
    [0.42, -0.36],
    [-0.42, 0.36],
    [0.42, 0.36],
  ]

  weights.forEach(([x, y], index) => {
    const weight = MeshBuilder.CreateSphere(
      `${name}-net-weight-${index}`,
      { diameter: 0.11, segments: 8 },
      scene,
    )

    weight.position.set(x, y, 0.34)
    weight.parent = mesh
    weight.material = netMaterial
    weight.metadata = { weaponEffectPart: 'net-weight', baseX: x, baseY: y }
  })

  mesh.setEnabled(false)

  return mesh
}

function createPooledImpactBurstEffect(scene: Scene, name: string, material: StandardMaterial): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter: 0.38, segments: 12 }, scene)

  mesh.material = material

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const spark = MeshBuilder.CreateBox(
      `${name}-spark-${index}`,
      { width: 0.07, height: 0.07, depth: 0.58 },
      scene,
    )

    spark.position.set(Math.sin(angle) * 0.26, 0, Math.cos(angle) * 0.26)
    spark.rotation.y = angle
    spark.parent = mesh
    spark.material = material
  }

  mesh.setEnabled(false)

  return mesh
}

function createPooledBox(
  scene: Scene,
  name: string,
  material: StandardMaterial,
  size: [number, number, number],
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene)

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
  const mesh = MeshBuilder.CreateTorus(name, { diameter, thickness: 0.055, tessellation: 30 }, scene)

  mesh.material = material
  mesh.setEnabled(false)

  return mesh
}

function updateBots(resources: SceneResources, frame: ReplayVisualFrame): void {
  const roles: TeamRole[] = ['red', 'blue']

  roles.forEach((role) => {
    const bot = resources.bots[role]
    const state = frame.bots[role]
    const hit = frame.endState?.knockedOut === role
    const damagePulse = frame.effects.find(
      (effect) => effect.kind === 'damage_marker' && effect.team === role,
    )
    const bounce = Math.sin(frame.time * 18) * 0.02
    const flinch = damagePulse ? damagePulse.intensity : 0

    bot.position = toBabylonVector(state.position)
    bot.position.y = hit ? 0.08 + bounce : 0.16
    bot.rotation.y = state.rotationY
    bot.rotation.z = hit
      ? (role === 'red' ? -0.2 : 0.2)
      : Math.sin(frame.time * 42) * flinch * 0.14
    bot.scaling.setAll(hit ? 0.96 : 1 + flinch * 0.035)
    updateBotPartNodes(bot, role, frame.parts[role], frame.time)

    const meshes = bot.getChildMeshes()

    meshes.forEach((mesh) => {
      const metadata = mesh.metadata as { kind?: string; speed?: number } | undefined

      if (!metadata) {
        return
      }

      if (metadata.kind === 'spin') {
        mesh.rotation.y += (metadata.speed ?? 0.06) * 1.6
      }

      if (metadata.kind === 'roll') {
        mesh.rotation.x += (metadata.speed ?? 0.05)
      }

      if (metadata.kind === 'smoke') {
        mesh.position.y = 0.18 + Math.sin(frame.time * 9 + (metadata.speed ?? 0.04) * 40) * 0.08
      }

      if (metadata.kind === 'thrust') {
        const pulse = 0.82 + Math.sin(frame.time * 18) * 0.18

        mesh.scaling.set(1, pulse, 1)
      }

      if (metadata.kind === 'pulse') {
        const pulse = 1 + Math.sin(frame.time * 5) * (metadata.speed ?? 0.04)

        mesh.scaling.setAll(pulse)
      }
    })
  })
}

function updateBotPartNodes(
  bot: ReturnType<typeof createBotNode>,
  role: TeamRole,
  partStates: Record<string, PartFrameState>,
  time: number,
): void {
  const botWorldMatrix = bot.computeWorldMatrix(true).clone()
  const inverseBotWorld = botWorldMatrix.clone()

  inverseBotWorld.invert()

  const nodes = bot.getChildren((node) => {
    const metadata = node.metadata as BotPartNodeMetadata | undefined

    return metadata?.kind === 'bot_part'
  }, true) as TransformNode[]

  nodes.forEach((node) => {
    const metadata = node.metadata as BotPartNodeMetadata
    const state = partStates[metadata.blockId]
    const basePosition = metadata.basePosition
    const baseRotation = metadata.baseRotation

    if (state?.status === 'detached' && state.detachTime !== undefined) {
      const age = Math.max(0, time - state.detachTime)
      const angle = deterministicAngle(`${role}-${metadata.blockId}`) + (role === 'red' ? 0.25 : -0.25)
      const distance = Math.min(3.4, 0.45 + age * 1.85)
      const origin = state.detachPosition
        ? toBabylonVector(state.detachPosition)
        : Vector3.TransformCoordinates(new Vector3(basePosition[0], basePosition[1], basePosition[2]), botWorldMatrix)
      const hop = Math.max(0, 0.5 + age * 1.24 - age * age * 0.38)
      const worldPosition = new Vector3(
        origin.x + Math.cos(angle) * distance,
        Math.max(0.08, origin.y + hop),
        origin.z + Math.sin(angle) * distance,
      )
      const localPosition = Vector3.TransformCoordinates(worldPosition, inverseBotWorld)
      const freshBreak = Math.max(0, 1 - age / 0.7)

      node.position.copyFrom(localPosition)
      node.rotation.set(
        baseRotation[0] + age * (1.9 + Math.abs(Math.sin(angle))),
        baseRotation[1] + age * 2.5,
        baseRotation[2] + age * (1.4 + Math.abs(Math.cos(angle))),
      )
      node.scaling.setAll(1.04 + freshBreak * 0.16)

      return
    }

    node.position.set(basePosition[0], basePosition[1], basePosition[2])
    node.rotation.set(baseRotation[0], baseRotation[1], baseRotation[2])
    node.scaling.setAll(1)
  })
}

function updateEffects(
  pool: EffectPool,
  effects: ReplayEffectState[],
  profiles: Record<TeamRole, BotVisualProfile>,
): void {
  const used: Record<ReplayEffectKind, number> = {
    weapon_fire: 0,
    control_net: 0,
    laser_lance: 0,
    drone_swarm: 0,
    part_detach: 0,
    impact: 0,
    debris: 0,
    damage_marker: 0,
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
      const profile = effect.team ? profiles[effect.team] : undefined
      const weaponStyle = profile?.primaryWeapon ?? 'generic'
      const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
      const heading = effect.rotationY ?? (effect.team === 'blue' ? -Math.PI / 2 : Math.PI / 2)

      mesh.visibility = 1
      mesh.position.y += 0.25
      mesh.rotation.x = 0
      mesh.rotation.y = heading
      mesh.rotation.z = 0
      setWeaponEffectMode(mesh, weaponStyle, progress)

      if (weaponStyle === 'net') {
        const travel = 0.55 + easeOutCubic(progress) * 2.55
        const lift = Math.sin(progress * Math.PI) * 0.58

        mesh.position.x += Math.sin(heading) * travel
        mesh.position.z += Math.cos(heading) * travel
        mesh.position.y += 0.42 + lift
        mesh.scaling.set(1.1 + progress * 0.54, 1.1 + progress * 0.54, 0.46 + progress * 0.55)
        mesh.rotation.z = Math.sin(effect.age * 11) * 0.18
        mesh.visibility = 0.7
      } else if (weaponStyle === 'turret') {
        mesh.scaling.set(0.42, 0.42, 0.88 + effect.intensity * 1.8)
        mesh.position.y += 0.12
        mesh.rotation.y = heading + (effect.team === 'blue' ? -1 : 1) * effect.intensity * 0.18
      } else if (weaponStyle === 'spinner') {
        mesh.scaling.set(0.34 + effect.intensity * 0.8, 0.34 + effect.intensity * 0.8, 0.62)
        mesh.rotation.z = effect.age * 14
      } else {
        mesh.scaling.setAll(0.2 + effect.intensity * 1.1)
      }
    }

    if (effect.kind === 'control_net') {
      const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
      const target = effect.endPosition ? toBabylonVector(effect.endPosition) : toBabylonVector(effect.position)

      mesh.position = target
      mesh.position.y = 0.22 + Math.sin(progress * Math.PI) * 0.16
      mesh.rotation.x = Math.PI / 2
      mesh.rotation.y = (effect.rotationY ?? 0) + effect.age * 2.8
      mesh.rotation.z = 0
      mesh.scaling.setAll(1.1 + easeOutCubic(progress) * 1.45 + effect.intensity * 0.28)
      mesh.visibility = 0.72 + effect.intensity * 0.28
    }

    if (effect.kind === 'laser_lance') {
      const start = toBabylonVector(effect.position)
      const end = effect.endPosition ? toBabylonVector(effect.endPosition) : start
      const midpoint = Vector3.Center(start, end)
      const length = Math.max(0.2, Vector3.Distance(start, end))
      const dx = end.x - start.x
      const dz = end.z - start.z
      const heading = Math.abs(dx) + Math.abs(dz) < 0.001
        ? effect.rotationY ?? 0
        : Math.atan2(dx, dz)
      const pulse = 0.24 + effect.intensity * 0.32

      mesh.position.set(midpoint.x, 0.9 + Math.sin(effect.age * 18) * 0.04, midpoint.z)
      mesh.rotation.x = 0
      mesh.rotation.y = heading
      mesh.rotation.z = Math.sin(effect.age * 22) * 0.035
      mesh.scaling.set(pulse, 0.88 + effect.intensity * 0.34, length)
      mesh.visibility = 0.76 + effect.intensity * 0.24
    }

    if (effect.kind === 'drone_swarm') {
      const start = toBabylonVector(effect.position)
      const end = effect.endPosition ? toBabylonVector(effect.endPosition) : start
      const progress = Math.min(Math.max(1 - effect.intensity, 0), 1)
      const travel = easeOutCubic(Math.min(progress / 0.62, 1))
      const position = Vector3.Lerp(start, end, travel)
      const orbit = effect.age * 4.2 + progress * Math.PI
      const pulse = 1.1 + Math.sin(effect.age * 16) * 0.06 + effect.intensity * 0.16

      mesh.position.set(position.x, 1.26 + Math.sin(progress * Math.PI) * 0.56, position.z)
      mesh.rotation.x = Math.sin(effect.age * 7) * 0.04
      mesh.rotation.y = orbit
      mesh.rotation.z = Math.cos(effect.age * 6) * 0.04
      mesh.scaling.setAll(pulse)
      mesh.visibility = 0.86 + effect.intensity * 0.14
      updateDroneSwarmParts(mesh, effect, progress)
    }

    if (effect.kind === 'part_detach') {
      mesh.position.y += 0.34
      mesh.rotation.x = Math.PI / 2
      mesh.rotation.y = effect.age * 3.2
      mesh.rotation.z = Math.sin(effect.age * 12) * 0.08
      mesh.scaling.setAll(0.82 + effect.intensity * 1.05)
      mesh.visibility = 0.28 + effect.intensity * 0.38
    }

    if (effect.kind === 'impact') {
      mesh.position.y += 0.58
      mesh.scaling.setAll(0.44 + effect.intensity * 1.35)
      mesh.rotation.y = effect.age * 7
    }

    if (effect.kind === 'debris') {
      const angle = deterministicAngle(effect.id)
      const distance = effect.age * (1.5 + (effect.damage ?? 0) / 18)
      mesh.position.x += Math.cos(angle) * distance
      mesh.position.z += Math.sin(angle) * distance
      mesh.position.y += 0.38 + effect.age * 1.2 - effect.age * effect.age * 0.28
      mesh.scaling.setAll(0.72 + effect.intensity * 0.45)
      mesh.rotation.x = effect.age * 5 + angle
      mesh.rotation.y = effect.age * 7
      mesh.rotation.z = effect.age * 3.5 + angle / 2
    }

    if (effect.kind === 'damage_marker') {
      mesh.position.y += 0.78 + effect.age * 0.35
      const pulse = 0.45 + effect.intensity * (0.72 + Math.min(effect.damage ?? 0, 18) / 36)
      mesh.scaling.setAll(pulse)
      mesh.rotation.x = Math.PI / 2
      mesh.rotation.y = effect.age * 6
    }

    if (effect.kind === 'smoke') {
      mesh.position.y += effect.age * 0.62
      const scale = 0.55 + effect.intensity * 0.72
      mesh.scaling.setAll(scale)
      mesh.position.z += Math.sin(effect.age * 12) * 0.1
    }

    if (effect.kind === 'hazard') {
      mesh.position.y = 0.12
      const pulse = 0.9 + effect.intensity * 0.9
      mesh.scaling.setAll(pulse)
      mesh.rotation.y = effect.age * 2.2
    }

    if (effect.kind === 'knockout') {
      mesh.position.y = 0.18
      const pulse = 1 + Math.min(effect.age, 3) * 0.15
      mesh.scaling.setAll(pulse)
      mesh.rotation.x = effect.age * 1.8
    }
  })
}

function updateDroneSwarmParts(mesh: Mesh, effect: ReplayEffectState, progress: number): void {
  const teamColor = effect.team === 'red'
    ? Color3.FromHexString('#ff4f5f')
    : Color3.FromHexString('#58b7ff')
  const teamGlow = effect.team === 'red'
    ? Color3.FromHexString('#ff2c42')
    : Color3.FromHexString('#1f8fff')

  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as DroneEffectPartMetadata | undefined

    if (!metadata?.droneEffectPart) {
      return
    }

    if (child.material instanceof StandardMaterial) {
      if (metadata.droneEffectPart === 'rotor' || metadata.droneEffectPart === 'sensor') {
        child.material.diffuseColor = teamColor
        child.material.emissiveColor = teamGlow
      }

      if (metadata.droneEffectPart === 'scan') {
        child.material.diffuseColor = Color3.FromHexString('#d5ff8a')
        child.material.emissiveColor = Color3.FromHexString('#6dff40')
      }
    }

    if (metadata.droneEffectPart === 'rotor') {
      child.rotation.y = effect.age * 26 + (metadata.droneIndex ?? 0) * 0.8
      child.scaling.setAll(0.86 + effect.intensity * 0.26)
    }

    if (metadata.droneEffectPart === 'pod') {
      const bob = Math.sin(effect.age * 12 + (metadata.droneIndex ?? 0) * 1.8) * 0.05

      child.position.y = bob
    }

    if (metadata.droneEffectPart === 'trail') {
      child.visibility = Math.max(0.16, effect.intensity * 0.48)
      child.scaling.set(0.82, 0.82, 0.68 + progress * 0.7)
    }

    if (metadata.droneEffectPart === 'scan') {
      const scanPulse = 0.76 + Math.sin(effect.age * 10) * 0.12 + progress * 0.36

      child.visibility = 0.2 + effect.intensity * 0.32
      child.scaling.set(scanPulse, 0.82 + effect.intensity * 0.22, scanPulse)
    }
  })
}

function setWeaponEffectMode(mesh: Mesh, mode: BotVisualProfile['primaryWeapon'], progress: number): void {
  const showNet = mode === 'net'
  const showMuzzle = mode === 'turret' || mode === 'spinner' || mode === 'generic'
  const spread = 0.78 + easeOutCubic(progress) * 0.72
  const bow = Math.sin(progress * Math.PI) * 0.14

  mesh.getChildMeshes().forEach((child) => {
    const metadata = child.metadata as WeaponEffectPartMetadata | undefined
    const part = metadata?.weaponEffectPart

    if (!part) {
      return
    }

    if (part === 'muzzle') {
      child.setEnabled(showMuzzle)
      return
    }

    child.setEnabled(showNet)

    if (!showNet) {
      return
    }

    child.position.x = (metadata.baseX ?? child.position.x) * spread
    child.position.y = (metadata.baseY ?? child.position.y) * spread
    child.position.z = 0.34 + bow

    if (part === 'net-hoop') {
      child.scaling.setAll(0.85 + progress * 0.28)
    } else if (part === 'net-weight') {
      child.scaling.setAll(1 + progress * 0.35)
    } else {
      child.scaling.setAll(0.92 + progress * 0.18)
    }
  })
}

function updateHazards(hazards: BabylonHazardVisual[], frame: ReplayVisualFrame): void {
  hazards.forEach((hazard, index) => {
    const active = frame.effects.find(
      (effect) =>
        effect.kind === 'hazard' &&
        effect.label !== undefined &&
        hazardsMatch(normalizeHazard(effect.label), hazard.label),
    )
    const pulse = active ? 1 + (1 - active.age / 0.9) * 0.3 : 1
    const spin = hazard.spinSpeed > 0 ? hazard.spinSpeed + (frame.effects.some((effect) => effect.kind === 'impact') ? 0.08 : 0) : 0

    hazard.mesh.position.y = 0.08 + (active ? active.intensity * 0.14 : 0)
    hazard.mesh.scaling.setAll(hazard.baseScale * pulse)

    if (hazard.kind === 'flipper') {
      hazard.mesh.rotation.x = active ? -active.intensity * 0.45 : 0
      hazard.mesh.rotation.z = Math.sin(frame.time * 2 + index) * 0.015
    } else {
      hazard.mesh.rotation.y += spin
      hazard.mesh.rotation.z = Math.sin(frame.time * 2 + index) * 0.02
    }
  })
}

function hazardsMatch(left: string, right: string): boolean {
  return left.includes(right) || right.includes(left) || left === right
}

function deterministicAngle(value: string): number {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return (hash % 6283) / 1000
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
  const activePartDetach = findLatestReplayEffect(frame.effects, (effect) =>
    effect.kind === 'part_detach' && effect.age < 1.35,
  )
  const activeImpact = findLatestReplayEffect(frame.effects, (effect) => effect.kind === 'impact' && effect.age < 1.2)
  const activeHazard = findLatestReplayEffect(frame.effects, (effect) => effect.kind === 'hazard' && effect.age < 0.9)
  const activeAbility = findLatestReplayEffect(
    frame.effects,
    (effect) =>
      (effect.kind === 'laser_lance' || effect.kind === 'control_net' || effect.kind === 'drone_swarm') &&
      effect.age < 1.2,
  )
  const activeKnockout = findLatestReplayEffect(frame.effects, (effect) => effect.kind === 'knockout')
  const target = activePartDetach
    ? toBabylonVector(activePartDetach.position)
    : activeImpact
    ? toBabylonVector([activeImpact.position[0], activeImpact.position[1], activeImpact.position[2]])
    : activeHazard
      ? toBabylonVector([activeHazard.position[0], activeHazard.position[1], activeHazard.position[2]])
      : activeAbility
        ? abilityCameraTarget(activeAbility)
      : midpoint

  const shake = activeImpact
    ? (1 - activeImpact.age / 1.2) * 0.5
    : activePartDetach
      ? activePartDetach.intensity * 0.24
    : activeKnockout
      ? 0.35
      : activeAbility
        ? activeAbility.intensity * 0.18
        : 0
  const knockoutPulse = activeKnockout?.kind === 'knockout' ? activeKnockout.age <= 1.6 : false
  const knockBack = knockoutPulse ? 0.24 : 0
  const arenaRadius = Math.max(arena.width, arena.height)

  if (preset === 'wide') {
    setCamera(
      camera,
      Vector3.Zero(),
      -Math.PI / 2.2,
      1.22,
      arenaRadius * 1.18,
      frame.time,
      shake + knockBack,
    )
  } else if (preset === 'broadcast') {
    setCamera(
      camera,
      Vector3.Center(midpoint, Vector3.Zero()),
      -Math.PI * 0.72,
      0.9,
      arenaRadius * 0.94,
      frame.time,
      shake + knockBack,
    )
  } else if (preset === 'impact') {
    setCamera(
      camera,
      target,
      -Math.PI * 0.62,
      0.79,
      Math.max(5.4, arenaRadius * 0.44),
      frame.time,
      shake + knockBack * 1.3 + (activePartDetach ? 0.1 : 0),
    )
  } else if (preset === 'cinematic') {
    setCamera(
      camera,
      activePartDetach ? target : activeImpact ? target : activeHazard ? target : midpoint,
      -Math.PI * 0.58,
      0.72,
      Math.max(6.2, arenaRadius * 0.52),
      frame.time,
      shake + 0.1,
    )
  } else if (preset === 'red_follow') {
    setCamera(camera, red, -Math.PI * 0.58, 1.08, 7.2, frame.time, shake * 0.7)
  } else if (preset === 'blue_follow') {
    setCamera(camera, blue, -Math.PI * 0.58, 1.08, 7.2, frame.time, shake * 0.7)
  } else {
    setCamera(camera, midpoint, -Math.PI * 0.65, 0.9, 8, frame.time, shake)
  }
}

function setCamera(
  camera: ArcRotateCamera,
  target: Vector3,
  alpha: number,
  beta: number,
  radius: number,
  time: number,
  shake: number,
): void {
  const desiredTarget = target.clone().add(
    new Vector3(
      Math.sin(time * 30) * shake,
      Math.sin(time * 23) * shake * 0.2,
      Math.cos(time * 30) * shake,
    ),
  )
  const desiredAlpha = alpha + Math.sin(time * 9) * shake * 0.05
  const desiredBeta = beta + Math.cos(time * 8) * shake * 0.03
  const desiredRadius = Math.max(4.1, radius + shake * 0.8)
  const settle = shake > 0 ? 0.36 : 0.2

  camera.setTarget(Vector3.Lerp(camera.getTarget(), desiredTarget, settle))
  camera.alpha = lerpAngle(camera.alpha, desiredAlpha, settle)
  camera.beta = lerpNumber(camera.beta, desiredBeta, settle)
  camera.radius = lerpNumber(camera.radius, desiredRadius, settle)
}

function abilityCameraTarget(effect: ReplayEffectState): Vector3 {
  if (!effect.endPosition) {
    return toBabylonVector(effect.position)
  }

  return Vector3.Center(toBabylonVector(effect.position), toBabylonVector(effect.endPosition))
}

function findLatestReplayEffect(
  effects: ReplayEffectState[],
  predicate: (effect: ReplayEffectState) => boolean,
): ReplayEffectState | undefined {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index]

    if (predicate(effect)) {
      return effect
    }
  }

  return undefined
}

function lerpNumber(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function lerpAngle(from: number, to: number, amount: number): number {
  let delta = to - from

  while (delta > Math.PI) {
    delta -= Math.PI * 2
  }

  while (delta < -Math.PI) {
    delta += Math.PI * 2
  }

  return from + delta * amount
}

function easeOutCubic(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1)

  return 1 - (1 - clamped) ** 3
}

function createSceneMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
  alpha = 1,
  specular = 0.16,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.specularColor = new Color3(specular, specular, Math.max(0.12, specular * 0.82))
  material.alpha = alpha
  material.backFaceCulling = alpha >= 1

  return material
}

function toBabylonVector(vector: ReplayVector3): Vector3 {
  return new Vector3(vector[0], vector[1], vector[2])
}

function classifyHazardKind(raw: string): string {
  if (raw.includes('saw')) {
    return 'saw'
  }

  if (raw.includes('flipper')) {
    return 'flipper'
  }

  if (raw.includes('pit')) {
    return 'pit'
  }

  if (raw.includes('oil')) {
    return 'oil'
  }

  if (raw.includes('magnet')) {
    return 'magnet'
  }

  return 'generic'
}

function classifyHazardSlot(raw: string): string {
  if (raw.includes('north')) {
    return 'north'
  }

  if (raw.includes('south')) {
    return 'south'
  }

  if (raw.includes('east')) {
    return 'east'
  }

  if (raw.includes('west')) {
    return 'west'
  }

  if (raw.includes('red')) {
    return 'red'
  }

  if (raw.includes('blue')) {
    return 'blue'
  }

  return 'center'
}

function slotToPosition(slot: string, arenaWidth: number, arenaHeight: number): { x: number; z: number } {
  if (slot === 'northwest') {
    return { x: -arenaWidth * 0.34, z: arenaHeight * 0.28 }
  }

  if (slot === 'northeast') {
    return { x: arenaWidth * 0.34, z: arenaHeight * 0.28 }
  }

  if (slot === 'southwest') {
    return { x: -arenaWidth * 0.34, z: -arenaHeight * 0.28 }
  }

  if (slot === 'southeast') {
    return { x: arenaWidth * 0.34, z: -arenaHeight * 0.28 }
  }

  if (slot === 'north') {
    return { x: 0, z: arenaHeight * 0.26 }
  }

  if (slot === 'south') {
    return { x: 0, z: -arenaHeight * 0.26 }
  }

  if (slot === 'east') {
    return { x: arenaWidth * 0.33, z: 0 }
  }

  if (slot === 'west') {
    return { x: -arenaWidth * 0.33, z: 0 }
  }

  if (slot === 'red') {
    return { x: -arenaWidth * 0.2, z: 0 }
  }

  if (slot === 'blue') {
    return { x: arenaWidth * 0.2, z: 0 }
  }

  return { x: 0, z: 0 }
}

function normalizeHazard(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
