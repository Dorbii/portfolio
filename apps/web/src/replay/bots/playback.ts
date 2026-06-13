import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { TeamRole } from '../../../../../packages/schemas/src/index.js'
import {
  createBotNode,
  type BotPartNodeMetadata,
} from '../parts'
import {
  deterministicAngle,
  toBabylonVector,
} from '../rendering/sceneUtils'
import {
  applyPartMotion,
  isPartMotionNode,
  type PartMotionMetadata,
} from '../parts/motion'
import {
  damageMaterialForRoleAndSeverity,
  isBotPartChildMaterialRole,
  type BotPartChildMaterialRole,
} from '../rendering/materials'
import type {
  BotFrameState,
  PartFrameState,
  ReplayVisualFrame,
} from '../replayMapping'

export type { BotPartNodeMetadata } from '../parts'

const basePartMaterials = new WeakMap<AbstractMesh, AbstractMesh['material']>()
const botPlaybackCaches = new WeakMap<ReturnType<typeof createBotNode>, BotPlaybackCache>()
const KNOCKOUT_COLLAPSE_DROP = 0.12
const KNOCKOUT_COLLAPSE_DURATION_SECONDS = 2
const KNOCKOUT_PART_SCATTER = 0.035

type BotPlaybackAnimatedNode = {
  metadata: PartMotionMetadata
  node: TransformNode
  partMetadata?: BotPartNodeMetadata
}

type BotPlaybackCache = {
  animatedNodes: BotPlaybackAnimatedNode[]
  partNodes: BotPlaybackPartNode[]
}

type BotPlaybackChildMaterial = {
  baseMaterial: AbstractMesh['material']
  materialRole: BotPartChildMaterialRole | null
  mesh: AbstractMesh
}

type BotPlaybackPartNode = {
  childMaterials: BotPlaybackChildMaterial[]
  metadata: BotPartNodeMetadata
  node: TransformNode
}

export function updateBots(
  bots: Record<TeamRole, ReturnType<typeof createBotNode>>,
  frame: ReplayVisualFrame,
): void {
  const roles: TeamRole[] = ['red', 'blue']

  roles.forEach((role) => {
    const bot = bots[role]
    const cache = getBotPlaybackCache(bot)
    const state = frame.bots[role]
    const knockoutProgress = knockoutProgressForRole(frame, role)
    const damagePulse = frame.effects.find(
      (effect) => effect.kind === 'damage_marker' && effect.team === role,
    )
    const flinch = damagePulse ? damagePulse.intensity : 0
    const motion = state.motion
    const stability = state.stability
    const stabilityScale = stability.pose === 'flipped' ? 0.98 : 1
    const verticalOffset = stability.heightOffset
    const driveBounce = Math.sin(frame.time * 18 + (role === 'red' ? 0 : Math.PI)) *
      0.014 *
      Math.min(1, motion.driveIntensity) *
      (1 - knockoutProgress)
    const activePositionY = Math.max(
      0.06,
      0.16 + motion.contactIntensity * 0.03 + verticalOffset + driveBounce,
    )
    const activeRotationX = -motion.lean + stability.pitch
    const activeRotationZ =
      Math.sin(frame.time * 42) * flinch * 0.14 +
      motion.drift * 0.08 +
      motion.turn * 0.1 +
      stability.roll
    const activeScale = stabilityScale * (1 + flinch * 0.035)

    bot.position = toBabylonVector(state.position)
    bot.position.y = lerp(activePositionY, 0.035, knockoutProgress)
    bot.rotation.y = state.rotationY
    bot.rotation.x = lerp(activeRotationX, -0.28, knockoutProgress)
    bot.rotation.z = lerp(activeRotationZ, role === 'red' ? -0.58 : 0.58, knockoutProgress)
    bot.scaling.setAll(lerp(activeScale, 0.94, knockoutProgress))
    updateBotPartNodes(bot, role, cache.partNodes, frame.parts[role], frame.time, knockoutProgress)

    cache.animatedNodes.forEach(({ metadata, node, partMetadata }) => {
      const weaponIntensity = weaponMotionIntensity(frame, role, partMetadata)

      applyPartMotion(
        node,
        frame.time,
        partMotionSpeedScale(metadata, motion, weaponIntensity, partMetadata),
        weaponIntensity,
      )
    })
  })
}

function knockoutProgressForRole(frame: ReplayVisualFrame, role: TeamRole): number {
  if (frame.endState?.knockedOut !== role) {
    return 0
  }

  const knockoutEffect = frame.effects.find(
    (effect) => effect.kind === 'knockout' && effect.team === role,
  )
  const age = knockoutEffect?.age ?? 0

  return smoothstep(clamp(age / KNOCKOUT_COLLAPSE_DURATION_SECONDS, 0, 1))
}

function getBotPlaybackCache(bot: ReturnType<typeof createBotNode>): BotPlaybackCache {
  const existing = botPlaybackCaches.get(bot)

  if (existing) {
    return existing
  }

  const partNodes = (bot.getChildren((node) => {
    const metadata = node.metadata as BotPartNodeMetadata | undefined

    return metadata?.kind === 'bot_part'
  }, true) as TransformNode[]).map((node): BotPlaybackPartNode => {
    const metadata = node.metadata as BotPartNodeMetadata
    const childMaterials = node.getChildMeshes().map((mesh): BotPlaybackChildMaterial => {
      const baseMaterial = getBasePartMaterial(mesh)

      return {
        baseMaterial,
        materialRole: resolveChildMaterialRole(mesh, baseMaterial, metadata),
        mesh,
      }
    })

    return {
      childMaterials,
      metadata,
      node,
    }
  })

  const animatedNodes = (bot.getChildren((node) => {
    return isPartMotionNode(node)
  }, true) as TransformNode[]).map((node): BotPlaybackAnimatedNode => ({
    metadata: node.metadata as PartMotionMetadata,
    node,
    partMetadata: findBotPartMetadata(node),
  }))

  const cache = {
    animatedNodes,
    partNodes,
  }

  botPlaybackCaches.set(bot, cache)

  return cache
}

function partMotionSpeedScale(
  metadata: PartMotionMetadata,
  motion: BotFrameState['motion'],
  weaponIntensity: number,
  partMetadata: BotPartNodeMetadata | undefined,
): number {
  if (isDriveMotion(metadata)) {
    return clamp(0.02 + motion.driveIntensity * 1.55, 0.02, 5)
  }

  if (isWeaponMotion(metadata, partMetadata)) {
    const trackingScale = metadata.animationProfile === 'turret_track' ? 1.8 : 5.5
    const baseScale = metadata.animationProfile === 'turret_track' ? 0.25 : 0.75

    return clamp(baseScale + weaponIntensity * trackingScale + motion.contactIntensity * 1.15, 0.12, 8)
  }

  if (metadata.kind === 'thrust') {
    return clamp(0.75 + weaponIntensity * 1.6, 0.5, 3.2)
  }

  return 1
}

function isDriveMotion(metadata: PartMotionMetadata): boolean {
  return metadata.kind === 'roll' ||
    metadata.animationProfile === 'wheel_spin' ||
    metadata.animationProfile === 'tread_scroll'
}

function isWeaponMotion(
  metadata: PartMotionMetadata,
  partMetadata: BotPartNodeMetadata | undefined,
): boolean {
  const partId = partMetadata?.partId.toLowerCase() ?? ''

  return metadata.animationProfile === 'spinner_spin' ||
    metadata.animationProfile === 'hammer_swing' ||
    metadata.animationProfile === 'flipper_snap' ||
    metadata.animationProfile === 'grabber_clamp' ||
    metadata.animationProfile === 'turret_track' ||
    metadata.kind === 'actuate' ||
    (metadata.kind === 'spin' && (partId.startsWith('weapon_') || partId.startsWith('weapon.')))
}

function weaponMotionIntensity(
  frame: ReplayVisualFrame,
  role: TeamRole,
  partMetadata: BotPartNodeMetadata | undefined,
): number {
  if (!partMetadata) {
    return 0
  }

  return frame.effects.reduce((strongest, effect) => {
    if (effect.team !== role || effect.kind !== 'weapon_fire') {
      return strongest
    }

    const sourceMatches = effect.sourceBlockId === partMetadata.blockId ||
      effect.sourcePartId === partMetadata.partId
    const fallbackWeaponMatch = !effect.sourceBlockId &&
      !effect.sourcePartId &&
      partMetadata.partId.toLowerCase().startsWith('weapon_')

    return sourceMatches || fallbackWeaponMatch
      ? Math.max(strongest, effect.intensity)
      : strongest
  }, 0)
}

function findBotPartMetadata(node: TransformNode): BotPartNodeMetadata | undefined {
  let current = node.parent

  while (current instanceof TransformNode) {
    const metadata = current.metadata as BotPartNodeMetadata | undefined

    if (metadata?.kind === 'bot_part') {
      return metadata
    }

    current = current.parent
  }

  return undefined
}

function updateBotPartNodes(
  bot: ReturnType<typeof createBotNode>,
  role: TeamRole,
  partNodes: BotPlaybackPartNode[],
  partStates: Record<string, PartFrameState>,
  time: number,
  knockoutProgress: number,
): void {
  const botWorldMatrix = bot.computeWorldMatrix(true).clone()
  const inverseBotWorld = botWorldMatrix.clone()

  inverseBotWorld.invert()

  partNodes.forEach((partNode) => {
    const { metadata, node } = partNode
    const state = partStates[metadata.blockId]
    const basePosition = metadata.basePosition
    const baseRotation = metadata.baseRotation
    const baseRotationQuaternion = metadata.baseRotationQuaternion
    const damageSeverity = Math.max(partDamageSeverity(state), knockoutProgress)

    node.setEnabled(true)
    applyPartMaterialState(partNode, damageSeverity)

    if (state?.status === 'detached' && state.detachMotion) {
      const motion = state.detachMotion
      const worldPosition = toBabylonVector(motion.position)
      const localPosition = Vector3.TransformCoordinates(worldPosition, inverseBotWorld)
      const freshBreak = Math.max(0, 1 - motion.age / 0.7) * (0.45 + motion.fractureSeverity)
      const settleSquash = motion.settled ? 0.94 : 1

      node.position.copyFrom(localPosition)
      applyNodeRotation(node, baseRotation, baseRotationQuaternion, motion.rotation)
      node.scaling.setAll(Math.max(0.02, motion.fade) * settleSquash * (1.02 + freshBreak * 0.16))
      node.setEnabled(motion.fade > 0.025)

      return
    }

    const damageTremor = damageSeverity > 0
      ? Math.sin(time * 28 + deterministicAngle(`${role}-${metadata.blockId}-damage`)) *
        0.025 *
        damageSeverity *
        (1 - knockoutProgress)
      : 0
    const activePositionY = basePosition[1] + Math.abs(damageTremor) * 0.35
    const activeScale = 1 + damageSeverity * 0.055

    if (knockoutProgress > 0) {
      const collapse = collapsedPartPose(role, metadata.blockId)

      node.position.set(
        lerp(basePosition[0], basePosition[0] + collapse.offsetX, knockoutProgress),
        lerp(
          activePositionY,
          Math.max(0.015, basePosition[1] - KNOCKOUT_COLLAPSE_DROP + collapse.offsetY),
          knockoutProgress,
        ),
        lerp(basePosition[2], basePosition[2] + collapse.offsetZ, knockoutProgress),
      )
      applyNodeRotation(node, baseRotation, baseRotationQuaternion, [
        lerp(0, collapse.rotationX, knockoutProgress),
        lerp(0, collapse.rotationY, knockoutProgress),
        lerp(damageTremor, collapse.rotationZ, knockoutProgress),
      ])
      node.scaling.setAll(lerp(activeScale, 0.9, knockoutProgress))
      return
    }

    node.position.set(basePosition[0], activePositionY, basePosition[2])
    applyNodeRotation(node, baseRotation, baseRotationQuaternion, [0, 0, damageTremor])
    node.scaling.setAll(activeScale)
  })
}

function collapsedPartPose(role: TeamRole, blockId: string): {
  offsetX: number
  offsetY: number
  offsetZ: number
  rotationX: number
  rotationY: number
  rotationZ: number
} {
  const angle = deterministicAngle(`${role}-${blockId}-knockout-collapse`)
  const side = role === 'red' ? -1 : 1

  return {
    offsetX: Math.cos(angle) * KNOCKOUT_PART_SCATTER,
    offsetY: Math.sin(angle * 1.7) * 0.012,
    offsetZ: Math.sin(angle) * KNOCKOUT_PART_SCATTER,
    rotationX: -0.16 + Math.sin(angle * 1.3) * 0.08,
    rotationY: Math.sin(angle * 0.7) * 0.05,
    rotationZ: side * 0.2 + Math.cos(angle * 1.1) * 0.11,
  }
}

function applyNodeRotation(
  node: TransformNode,
  baseRotation: [number, number, number],
  baseRotationQuaternion: [number, number, number, number] | undefined,
  rotationOffset: [number, number, number],
): void {
  if (baseRotationQuaternion) {
    const base = Quaternion.FromArray(baseRotationQuaternion)
    const offset = Quaternion.RotationYawPitchRoll(
      rotationOffset[1],
      rotationOffset[0],
      rotationOffset[2],
    )

    node.rotationQuaternion = base.multiply(offset)
    return
  }

  node.rotation.set(
    baseRotation[0] + rotationOffset[0],
    baseRotation[1] + rotationOffset[1],
    baseRotation[2] + rotationOffset[2],
  )
}

function applyPartMaterialState(
  partNode: BotPlaybackPartNode,
  damageSeverity: number,
): void {
  partNode.childMaterials.forEach(({ baseMaterial, materialRole, mesh }) => {

    if (!baseMaterial || !materialRole) {
      return
    }

    const damageMaterial = damageMaterialForRoleAndSeverity(
      partNode.metadata.damageMaterials,
      materialRole,
      damageSeverity,
    )

    mesh.material = damageMaterial ?? baseMaterial
  })
}

function resolveChildMaterialRole(
  mesh: AbstractMesh,
  baseMaterial: AbstractMesh['material'],
  metadata: BotPartNodeMetadata,
): BotPartChildMaterialRole | null {
  if (!baseMaterial) {
    return null
  }

  const explicitRole = explicitPartMaterialRole(mesh)

  if (explicitRole) {
    return explicitRole
  }

  if (baseMaterial.name === metadata.primaryMaterialName) {
    return primaryDamageRole(metadata.visualProfile.damageProfile)
  }

  for (const role of Object.keys(metadata.roleMaterialNames) as BotPartChildMaterialRole[]) {
    if (metadata.roleMaterialNames[role].includes(baseMaterial.name)) {
      return role
    }
  }

  return null
}

function explicitPartMaterialRole(mesh: AbstractMesh): BotPartChildMaterialRole | null {
  const metadata = mesh.metadata as { partMaterialRole?: unknown } | undefined

  return isBotPartChildMaterialRole(metadata?.partMaterialRole) ? metadata.partMaterialRole : null
}

function primaryDamageRole(damageProfile: string): BotPartChildMaterialRole {
  if (damageProfile === 'scuffed_rubber') return 'rubber'
  if (damageProfile === 'emissive_led_glass') return 'glass'
  if (damageProfile === 'brushed_weapon_steel') return 'weapon_edge'
  if (damageProfile === 'scraped_style_shell') return 'trim'

  return 'damageable'
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function smoothstep(value: number): number {
  const clamped = clamp(value, 0, 1)

  return clamped * clamped * (3 - 2 * clamped)
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * clamp(progress, 0, 1)
}
