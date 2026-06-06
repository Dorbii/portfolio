import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import {
  createBotNode,
  type BotPartNodeMetadata,
} from './babylonPartRenderer'
import {
  deterministicAngle,
  toBabylonVector,
} from './babylonSceneUtils'
import { damageMaterialForSeverity } from './babylonMaterials'
import type {
  PartFrameState,
  ReplayVisualFrame,
} from './replayMapping'

export type { BotPartNodeMetadata } from './babylonPartRenderer'

const basePartMaterials = new WeakMap<AbstractMesh, AbstractMesh['material']>()

export function updateBots(
  bots: Record<TeamRole, ReturnType<typeof createBotNode>>,
  frame: ReplayVisualFrame,
): void {
  const roles: TeamRole[] = ['red', 'blue']

  roles.forEach((role) => {
    const bot = bots[role]
    const state = frame.bots[role]
    const hit = frame.endState?.knockedOut === role
    const damagePulse = frame.effects.find(
      (effect) => effect.kind === 'damage_marker' && effect.team === role,
    )
    const bounce = Math.sin(frame.time * 18) * 0.02
    const flinch = damagePulse ? damagePulse.intensity : 0
    const motion = state.motion

    bot.position = toBabylonVector(state.position)
    bot.position.y = hit ? 0.08 + bounce : 0.16 + motion.contactIntensity * 0.03
    bot.rotation.y = state.rotationY
    bot.rotation.x = hit ? 0 : -motion.lean
    bot.rotation.z = hit
      ? (role === 'red' ? -0.2 : 0.2)
      : Math.sin(frame.time * 42) * flinch * 0.14 + motion.drift * 0.08 + motion.turn * 0.1
    bot.scaling.setAll(hit ? 0.96 : 1 + flinch * 0.035)
    updateBotPartNodes(bot, role, frame.parts[role], frame.time)

    const animatedNodes = bot.getChildren((node) => {
      const metadata = node.metadata as { kind?: string } | undefined

      return (
        metadata?.kind === 'spin' ||
        metadata?.kind === 'roll' ||
        metadata?.kind === 'smoke' ||
        metadata?.kind === 'thrust' ||
        metadata?.kind === 'pulse'
      )
    }, true) as TransformNode[]

    animatedNodes.forEach((node) => {
      const metadata = node.metadata as { kind?: string; speed?: number } | undefined

      if (!metadata) {
        return
      }

      if (metadata.kind === 'spin') {
        node.rotation.y += (metadata.speed ?? 0.06) * 1.6
      }

      if (metadata.kind === 'roll') {
        node.rotation.x += (metadata.speed ?? 0.05)
      }

      if (metadata.kind === 'smoke') {
        node.position.y = 0.18 + Math.sin(frame.time * 9 + (metadata.speed ?? 0.04) * 40) * 0.08
      }

      if (metadata.kind === 'thrust') {
        const pulse = 0.82 + Math.sin(frame.time * 18) * 0.18

        node.scaling.set(1, pulse, 1)
      }

      if (metadata.kind === 'pulse') {
        const pulse = 1 + Math.sin(frame.time * 5) * (metadata.speed ?? 0.04)

        node.scaling.setAll(pulse)
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
    const damageSeverity = partDamageSeverity(state)

    node.setEnabled(true)
    applyPartMaterialState(node, metadata, damageSeverity)

    if (state?.status === 'detached' && state.detachMotion) {
      const motion = state.detachMotion
      const worldPosition = toBabylonVector(motion.position)
      const localPosition = Vector3.TransformCoordinates(worldPosition, inverseBotWorld)
      const freshBreak = Math.max(0, 1 - motion.age / 0.7) * (0.45 + motion.fractureSeverity)
      const settleSquash = motion.settled ? 0.94 : 1

      node.position.copyFrom(localPosition)
      node.rotation.set(
        baseRotation[0] + motion.rotation[0],
        baseRotation[1] + motion.rotation[1],
        baseRotation[2] + motion.rotation[2],
      )
      node.scaling.setAll(Math.max(0.02, motion.fade) * settleSquash * (1.02 + freshBreak * 0.16))
      node.setEnabled(motion.fade > 0.025)

      return
    }

    const damageTremor = damageSeverity > 0
      ? Math.sin(time * 28 + deterministicAngle(`${role}-${metadata.blockId}-damage`)) * 0.025 * damageSeverity
      : 0

    node.position.set(basePosition[0], basePosition[1] + Math.abs(damageTremor) * 0.35, basePosition[2])
    node.rotation.set(baseRotation[0], baseRotation[1], baseRotation[2] + damageTremor)
    node.scaling.setAll(1 + damageSeverity * 0.055)
  })
}

function applyPartMaterialState(
  node: TransformNode,
  metadata: BotPartNodeMetadata,
  damageSeverity: number,
): void {
  const damageMaterial = damageMaterialForSeverity(metadata.damageMaterials, damageSeverity)

  node.getChildMeshes().forEach((mesh) => {
    const baseMaterial = getBasePartMaterial(mesh)

    if (!baseMaterial || baseMaterial.name !== metadata.primaryMaterialName) {
      return
    }

    mesh.material = damageMaterial ?? baseMaterial
  })
}

function getBasePartMaterial(mesh: AbstractMesh): AbstractMesh['material'] {
  if (!basePartMaterials.has(mesh)) {
    basePartMaterials.set(mesh, mesh.material)
  }

  return basePartMaterials.get(mesh) ?? null
}

function partDamageSeverity(state: PartFrameState | undefined): number {
  if (!state || typeof state.health !== 'number') {
    return 0
  }

  if (typeof state.maxHealth === 'number' && state.maxHealth > 0) {
    return Math.min(1, Math.max(0, 1 - state.health / state.maxHealth))
  }

  return state.health <= 0 ? 1 : 0
}
