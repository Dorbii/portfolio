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
  effectPool: EffectPool
  hazards: BabylonHazardVisual[]
  centerSpinner: Mesh
}

type EffectPool = Record<ReplayEffectKind, Mesh[]>

type RendererState = {
  status: 'booting' | 'ready' | 'unavailable' | 'context_lost'
  message?: string
}

type BabylonReplaySceneProps = {
  arena: ArenaConfig
  botBlueprints: ReplayBotBlueprints
  cameraPreset: CameraPreset
  timeline: ReplayTimeline
  time: number
}

export function BabylonReplayScene({
  arena,
  botBlueprints,
  cameraPreset,
  timeline,
  time,
}: BabylonReplaySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resourcesRef = useRef<SceneResources | null>(null)
  const [rendererState, setRendererState] = useState<RendererState>({
    status: 'booting',
  })

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    let resources: SceneResources | null = null
    let disposed = false

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

      hemi.intensity = 0.8
      key.intensity = 0.9
      fill.intensity = 0.45
      accent.intensity = 0.4
      rim.intensity = 0.25

      accent.position = new Vector3(0, 5.8, 0)
      rim.position = new Vector3(0, 5.1, -3)

      const teamMaterials = createTeamMaterials(scene)
      const hazards = createArena(scene, arena)
      const bots = {
        red: createBotNode(scene, botBlueprints.red, 'red', teamMaterials.red),
        blue: createBotNode(scene, botBlueprints.blue, 'blue', teamMaterials.blue),
      }
      const effectPool = createEffectPool(scene)
      const centerSpinner = createCenterSpinner(scene)
      const glow = new GlowLayer('replay-glow', scene)

      glow.intensity = 0.32

      resources = {
        engine,
        scene,
        camera,
        bots,
        effectPool,
        hazards,
        centerSpinner,
      }
      resourcesRef.current = resources
      setRendererState({ status: 'ready' })

      engine.runRenderLoop(() => {
        if (!disposed) {
          scene.render()
        }
      })

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
        resourcesRef.current = null
        resources?.scene.dispose()
        resources?.engine.dispose()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Replay renderer failed to start.'
      setRendererState({ status: 'unavailable', message })
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
    updateEffects(resources.effectPool, frame.effects)
    updateHazards(resources.hazards, frame)
    updateCamera(resources.camera, cameraPreset, frame, arena)
    resources.centerSpinner.rotation.y = time * 4
  }, [arena, cameraPreset, timeline, time])

  return (
    <div className="babylon-stage" data-renderer-state={rendererState.status}>
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

function createArena(scene: Scene, arena: ArenaConfig): BabylonHazardVisual[] {
  const floorMaterial = createSceneMaterial(scene, 'floor-mat', '#101716', '#030404')
  const seamMaterial = createSceneMaterial(scene, 'panel-mat', '#262f2d', '#070b0b')
  const wallMaterial = createSceneMaterial(scene, 'wall-mat', '#4a5655', '#090d0e')
  const glassMaterial = createSceneMaterial(scene, 'glass-mat', '#86d1fc', '#04101a', 0.24)
  const redPadMaterial = createSceneMaterial(scene, 'red-pad-mat', '#72232f', '#2a080d', 0.9)
  const bluePadMaterial = createSceneMaterial(scene, 'blue-pad-mat', '#1c3e65', '#061626', 0.9)
  const hazardMaterial = createSceneMaterial(scene, 'hazard-mat', '#d6ad43', '#4f330a')
  const centerMaterial = createSceneMaterial(scene, 'center-mark-mat', '#2d3940', '#06090c')

  const floor = MeshBuilder.CreateBox(
    'arena-floor',
    { width: arena.width, height: 0.14, depth: arena.height },
    scene,
  )
  floor.position.y = -0.08
  floor.material = floorMaterial

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
  createGlass(scene, 'north-glass', 0, arena.height / 2 - 0.14, arena.width, 0.08, glassMaterial)
  createGlass(scene, 'south-glass', 0, -arena.height / 2 + 0.14, arena.width, 0.08, glassMaterial)
  createGlass(scene, 'east-glass', arena.width / 2 - 0.14, 0, 0.08, arena.height, glassMaterial)
  createGlass(scene, 'west-glass', -arena.width / 2 + 0.14, 0, 0.08, arena.height, glassMaterial)

  const marker = MeshBuilder.CreateTorus(
    'arena-center-mark',
    { diameter: 2.2, thickness: 0.03, tessellation: 40 },
    scene,
  )
  marker.position.y = 0.04
  marker.material = centerMaterial

  const redPad = MeshBuilder.CreateBox(
    'red-spawn-pad',
    { width: 5.2, height: 0.036, depth: 3.4 },
    scene,
  )
  redPad.position.set(-arena.width * 0.34, 0.015, 0)
  redPad.material = redPadMaterial
  const redPadBeacon = MeshBuilder.CreateTorus(
    'red-spawn-beacon',
    { diameter: 2.6, thickness: 0.09, tessellation: 24 },
    scene,
  )

  redPadBeacon.position.set(redPad.position.x, 0.08, redPad.position.z)
  redPadBeacon.material = redPadMaterial

  const bluePad = MeshBuilder.CreateBox(
    'blue-spawn-pad',
    { width: 5.2, height: 0.036, depth: 3.4 },
    scene,
  )
  bluePad.position.set(arena.width * 0.34, 0.015, 0)
  bluePad.material = bluePadMaterial

  const bluePadBeacon = MeshBuilder.CreateTorus(
    'blue-spawn-beacon',
    { diameter: 2.6, thickness: 0.09, tessellation: 24 },
    scene,
  )
  bluePadBeacon.position.set(bluePad.position.x, 0.08, bluePad.position.z)
  bluePadBeacon.material = bluePadMaterial

  const hazardPlates = createHazardVisuals(scene, arena)
  const arenaBoundaryPostMaterial = createSceneMaterial(scene, 'post-mat', '#1b1e23', '#08090b')

  createBoundaryPosts(scene, arenaBoundaryPostMaterial, arena.width, arena.height)
  createCornerMarkers(scene, arena.width, arena.height, arenaBoundaryPostMaterial)
  marker.material = centerMaterial

  hazardPlates.forEach((hazard, index) => {
    if (hazard.kind === 'saw') {
      const ring = MeshBuilder.CreateTorus(
        `hazard-${index}-halo`,
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

function createHazardVisuals(
  scene: Scene,
  arena: ArenaConfig,
): BabylonHazardVisual[] {
  const hazards: BabylonHazardVisual[] = []

  arena.activeHazards.forEach((rawName, index) => {
    const normalized = normalizeHazard(rawName)
    const visual = buildHazardVisual(
      scene,
      `${normalized}-${index}`,
      rawName,
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
  rawName: string,
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
  spinner.material = material
  glow.material = material
  glow.position.set(0, 0.06, 0)
  glow.parent = spinner
  glow.rotation.x = Math.PI / 2

  return spinner
}

function createEffectPool(scene: Scene): EffectPool {
  const sparkMaterial = createSceneMaterial(scene, 'spark-mat', '#ffd35f', '#ff8a24')
  const smokeMaterial = createSceneMaterial(scene, 'smoke-mat', '#aeb8b4', '#151918', 0.42)
  const weaponMaterial = createSceneMaterial(scene, 'weapon-flash-mat', '#f7f2b4', '#f7c24b')
  const hazardMaterial = createSceneMaterial(scene, 'hazard-flash-mat', '#ffcc4d', '#ff751f')
  const koMaterial = createSceneMaterial(scene, 'ko-mat', '#f4eef2', '#b83342')

  return {
    weapon_fire: Array.from({ length: 6 }, (_, index) =>
      createPooledBox(scene, `weapon-effect-${index}`, weaponMaterial, [0.14, 0.14, 1.25]),
    ),
    impact: Array.from({ length: 12 }, (_, index) =>
      createPooledSphere(scene, `impact-effect-${index}`, sparkMaterial, 0.34),
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
    const bounce = Math.sin(frame.time * 18) * 0.02

    bot.position = toBabylonVector(state.position)
    bot.position.y = hit ? 0.08 + bounce : 0.16
    bot.rotation.y = state.rotationY
    bot.rotation.z = hit ? (role === 'red' ? -0.2 : 0.2) : 0

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
        mesh.position.y = 0.1 + Math.sin(frame.time * 20) * 0.06
      }
    })
  })
}

function updateEffects(pool: EffectPool, effects: ReplayEffectState[]): void {
  const used: Record<ReplayEffectKind, number> = {
    weapon_fire: 0,
    impact: 0,
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
      mesh.scaling.setAll(0.2 + effect.intensity * 1.1)
      mesh.position.y += 0.25
      mesh.rotation.y = (effect.team === 'blue' ? -1 : 1) * (Math.PI / 2 + effect.intensity * 0.45)
    }

    if (effect.kind === 'impact') {
      mesh.position.y += 0.52
      mesh.scaling.setAll(0.34 + effect.intensity * 1.2)
      mesh.rotation.y = effect.age * 7
    }

    if (effect.kind === 'smoke') {
      mesh.position.y += effect.age * 0.53
      const scale = 0.4 + effect.intensity * 0.55
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
    hazard.mesh.rotation.y += spin
    hazard.mesh.rotation.z = Math.sin(frame.time * 2 + index) * 0.02
  })
}

function hazardsMatch(left: string, right: string): boolean {
  return left.includes(right) || right.includes(left) || left === right
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
  const activeImpact = frame.effects.find((effect) => effect.kind === 'impact' && effect.age < 1.2)
  const activeHazard = frame.effects.find((effect) => effect.kind === 'hazard' && effect.age < 0.9)
  const activeKnockout = frame.effects.find((effect) => effect.kind === 'knockout')
  const target = activeImpact
    ? toBabylonVector([activeImpact.position[0], activeImpact.position[1], activeImpact.position[2]])
    : activeHazard
      ? toBabylonVector([activeHazard.position[0], activeHazard.position[1], activeHazard.position[2]])
      : midpoint

  const shake = activeImpact
    ? (1 - activeImpact.age / 1.2) * 0.5
    : activeKnockout
      ? 0.35
      : 0
  const knockoutPulse = activeKnockout?.kind === 'knockout' ? activeKnockout.age <= 1.6 : false
  const knockBack = knockoutPulse ? 0.24 : 0
  const arenaRadius = Math.max(arena.width, arena.height)

  if (preset === 'wide') {
    setCamera(
      camera,
      target,
      -Math.PI / 2.2,
      1.22,
      arenaRadius * 1.05,
      frame.time,
      shake + knockBack,
    )
  } else if (preset === 'broadcast') {
    setCamera(
      camera,
      midpoint,
      -Math.PI * 0.72,
      0.9,
      arenaRadius * 0.68,
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
      shake + knockBack * 1.3,
    )
  } else if (preset === 'cinematic') {
    setCamera(
      camera,
      activeImpact ? target : activeHazard ? target : midpoint,
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
  camera.setTarget(target.clone().add(
    new Vector3(
      Math.sin(time * 30) * shake,
      Math.sin(time * 23) * shake * 0.2,
      Math.cos(time * 30) * shake,
    ),
  ))
  camera.alpha = alpha + Math.sin(time * 9) * shake * 0.05
  camera.beta = beta + Math.cos(time * 8) * shake * 0.03
  camera.radius = Math.max(4.1, radius + shake * 0.8)
}

function createSceneMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
  alpha = 1,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.specularColor = new Color3(0.16, 0.16, 0.14)
  material.alpha = alpha

  return material
}

function toBabylonVector(vector: ReplayVector3): Vector3 {
  return new Vector3(vector[0], vector[1], vector[2])
}

function classifyHazardKind(raw: string): string {
  if (raw.includes('saw')) {
    return 'saw'
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
