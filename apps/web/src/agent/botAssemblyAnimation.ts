import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import type { Engine } from '@babylonjs/core/Engines/engine'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type {
  BotBlueprint,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { createBotNode } from '../replay/babylonPartRenderer'
import type { TeamMaterialSet } from '../replay/babylonMaterials'

export type AssemblyResources = {
  bot?: TransformNode
  botAssemblyNodes: TransformNode[]
  botMeshes: AbstractMesh[]
  camera: ArcRotateCamera
  engine: Engine
  materials: TeamMaterialSet
  scene: Scene
  scanBar: AbstractMesh
  rig: {
    trolley: AbstractMesh
    hoistCable: AbstractMesh
    suspendedPanel: AbstractMesh
    leftArm: AbstractMesh
    rightArm: AbstractMesh
    leftToolHead: AbstractMesh
    rightToolHead: AbstractMesh
    leftClamp: AbstractMesh
    rightClamp: AbstractMesh
    clampRing: AbstractMesh
    sparks: Array<{
      mesh: AbstractMesh
      basePosition: Vector3
      phase: number
    }>
    trolleyBaseX: number
    suspendedPanelBaseY: number
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

export function attachAssemblyBot(
  resources: AssemblyResources,
  blueprint: BotBlueprint,
  role: TeamRole,
): void {
  resources.bot?.dispose(false, false)

  const bot = createBotNode(resources.scene, blueprint, role, resources.materials)

  bot.position.set(0, 0.22, -0.24)
  bot.rotation.y = role === 'red' ? -0.28 : 0.28
  bot.scaling.setAll(1.08)

  const botMeshes = bot.getChildMeshes()
  const botAssemblyNodes = bot
    .getChildren((node) => node.parent === bot)
    .filter((node): node is TransformNode => node instanceof TransformNode)

  botAssemblyNodes.forEach((node, index) => {
    const metadata = (node.metadata ?? {}) as AssemblyMetadata

    node.metadata = {
      ...metadata,
      assemblyIndex: index,
      basePosition: node.position.clone(),
      baseScaling: node.scaling.clone(),
    } satisfies AssemblyMetadata
    node.setEnabled(false)
  })

  resources.bot = bot
  resources.botAssemblyNodes = botAssemblyNodes
  resources.botMeshes = botMeshes
  resources.startedAt = performance.now()
}

export function animateAssembly(resources: AssemblyResources, submitted: boolean): void {
  const now = performance.now()
  const elapsed = (now - resources.startedAt) / 1000
  const bot = resources.bot

  resources.scanBar.position.y = 0.72 + ((elapsed * 0.5) % 1.35)
  resources.scanBar.scaling.x = 0.66 + Math.sin(elapsed * 2.1) * 0.06

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
  resources.rig.hoistCable.position.x = resources.rig.trolley.position.x
  resources.rig.suspendedPanel.position.x = resources.rig.trolley.position.x
  resources.rig.suspendedPanel.position.y = resources.rig.suspendedPanelBaseY + Math.sin(elapsed * 1.25) * 0.05
  resources.rig.suspendedPanel.rotation.y = Math.sin(elapsed * 0.85) * 0.12
  resources.rig.leftToolHead.position.x = -0.18 + Math.sin(elapsed * 1.7) * 0.08
  resources.rig.rightToolHead.position.x = 0.18 + Math.cos(elapsed * 1.55) * 0.08
  resources.rig.leftToolHead.position.y = 1.18 + Math.cos(elapsed * 1.2) * 0.04
  resources.rig.rightToolHead.position.y = 1.18 + Math.sin(elapsed * 1.28) * 0.04

  resources.rig.sparks.forEach((spark) => {
    const phase = (elapsed * 2.4 + spark.phase) % 1
    const drift = phase * phase

    spark.mesh.setEnabled(phase < 0.58 && !submitted)
    spark.mesh.position.set(
      spark.basePosition.x + Math.sin(spark.phase * 3.1) * drift * 0.26,
      spark.basePosition.y + drift * 0.42,
      spark.basePosition.z + Math.cos(spark.phase * 2.4) * drift * 0.2,
    )
    spark.mesh.scaling.setAll(1 - phase * 0.62)
  })

  if (!bot) {
    return
  }

  const readyPulse = submitted ? 0.02 : 0.045

  bot.rotation.y += submitted ? 0.002 : 0.004
  bot.position.y = 0.22 + Math.sin(elapsed * 2.2) * readyPulse

  resources.botAssemblyNodes.forEach((node) => {
    const metadata = node.metadata as AssemblyMetadata | undefined
    const index = metadata?.assemblyIndex ?? 0
    const basePosition = metadata?.basePosition ?? Vector3.Zero()
    const baseScaling = metadata?.baseScaling ?? Vector3.One()
    const progress = clamp((elapsed - index * 0.045) / 0.72, 0, 1)
    const eased = easeOutBack(progress)

    node.setEnabled(progress > 0)
    node.position.copyFrom(basePosition)
    node.position.y += (1 - progress) * (1.4 + (index % 4) * 0.18)
    node.scaling.copyFrom(baseScaling.scale(0.18 + eased * 0.82))
  })

  resources.botMeshes.forEach((mesh) => {
    const metadata = mesh.metadata as AssemblyMetadata | undefined
    if (metadata?.kind === 'spin') {
      mesh.rotation.y += (metadata.speed ?? 0.06) * (submitted ? 0.8 : 1.3)
    }

    if (metadata?.kind === 'roll') {
      mesh.rotation.x += (metadata.speed ?? 0.05) * (submitted ? 0.6 : 1)
    }
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function easeOutBack(progress: number): number {
  const clamped = clamp(progress, 0, 1)
  const overshoot = 1.70158

  return 1 + (overshoot + 1) * (clamped - 1) ** 3 + overshoot * (clamped - 1) ** 2
}
