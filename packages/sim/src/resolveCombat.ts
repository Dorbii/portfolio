import {
  createReplayTimeline,
  type MoveEasing,
  type MoveEvent,
  type MoveIntent,
  type PartDetachEvent,
  type ReplayEvent,
  type ReplayTimeline,
} from '../../replay/src/index.js'
import {
  DEFAULT_ARENA_CONFIG,
  type ArenaConfig,
  type BotBlueprint,
  type CanonicalGameAction,
  type CombatBotSnapshot,
  type CombatTurnSnapshot,
  type MovementCommand,
  type NormalizedBotTactics,
  type PartCategory,
  type PartBehaviorSlot,
  type PartEffect,
  type PartMountMotion,
  type TeamRole,
  type TurnCommand,
  type Vector3,
  type ArenaHazardThreat,
  type WeaponSpec,
} from '../../schemas/src/index.js'
import { DEFAULT_BOT_TACTICS, getPart } from '../../catalog/src/index.js'
import { deriveBotStats, type BotStats } from './deriveStats.js'
import {
  PART_BEHAVIOR_IDS,
  type PartBehaviorId,
} from './partBehaviors.js'
import {
  createBotRuntimeIndex,
  findFirstAliveBehaviorPart,
  getAliveBehaviorParts,
  hasAliveBehaviorPart,
  type BotRuntimeIndex,
} from './runtimePartIndex.js'
import { compareDamageTargets } from './damagePriority.js'
import {
  chooseCommand,
  type PolicyBotState,
} from './policy.js'
import { createSeededRng } from './seededRng.js'
import {
  addRuntimeStatus,
  expireRuntimeStatuses,
  runtimeStatusExpiresAtTick,
  runtimeStatusIncomingDamageMultiplier,
  runtimeStatusMovementMultiplier,
  type RuntimeStatusEffect,
  type RuntimeStatusEffectId,
} from './statusEffects.js'
import {
  arenaCellCenter,
  clampPositionToArena,
  compileArenaTopology,
  hazardEffectKind,
  hasArenaLineOfSight,
  hazardsAtPosition,
  pathHazards,
  type CompiledArenaTopology,
} from './arenaTopology.js'
import { combatActionCommand } from './combatActions.js'
import {
  evaluateCombatCommand,
  type CombatLegalityContext,
} from './combatLegality.js'
import {
  type TacticalMovementPlan,
} from './gridMovement.js'

export type CombatantInput = {
  role: TeamRole
  blueprint: BotBlueprint
  tactics: NormalizedBotTactics
}

export type CombatResult = {
  winner: TeamRole | 'draw'
  reason: string
  damage: Record<TeamRole, number>
  remainingHealth: Record<TeamRole, number>
  partHealth: Record<TeamRole, Record<string, number>>
  stats: Record<TeamRole, BotStats>
  replay: ReplayTimeline
  log: string[]
}

export type ResolveCombatInput = {
  round: number
  seed: string
  red: Omit<CombatantInput, 'role'>
  blue: Omit<CombatantInput, 'role'>
  arena?: ArenaConfig
}

export type SubmittedCombatCommands = Record<TeamRole, readonly TurnCommand[]>
export type SubmittedGameActions = Record<TeamRole, readonly CanonicalGameAction[]>

export type SubmittedCombatResolution =
  | {
      status: 'active'
      nextTick: number
      snapshot: CombatTurnSnapshot
      replay: ReplayTimeline
      log: string[]
    }
  | {
      status: 'complete'
      nextTick: number
      snapshot: CombatTurnSnapshot
      result: CombatResult
    }

export function resolveSubmittedGameActions(
  input: ResolveCombatInput,
  actions: SubmittedGameActions,
): SubmittedCombatResolution {
  const state = createCombatRuntime(input)
  const submittedTicks = Math.min(
    actions.red.length,
    actions.blue.length,
    HARD_MAX_COMBAT_TICKS,
  )

  for (let index = 0; index < submittedTicks; index += 1) {
    const tick = index + 1

    if (applyGameActionTick(state, tick, actions.red[index], actions.blue[index]).completed) {
      return {
        status: 'complete',
        nextTick: tick,
        snapshot: createCombatSnapshot(tick, state.arena, state.red, state.blue, state.events),
        result: finalizeCombatResult(input, state),
      }
    }
  }

  const nextTick = submittedTicks + 1
  const snapshot = createCombatSnapshot(nextTick, state.arena, state.red, state.blue, state.events)
  const replay = createReplayTimeline({
    round: input.round,
    duration: partialReplayDuration(state.events, state.elapsedTicks),
    events: state.events,
    summary: `Combat turn ${nextTick} is waiting for GameMaster actions.`,
  })

  return {
    status: 'active',
    nextTick,
    snapshot,
    replay,
    log: state.log,
  }
}

function commandFromCanonicalAction(
  action: CanonicalGameAction,
  role: TeamRole,
): TurnCommand {
  if (action.role !== role) {
    throw new Error(`${role} submitted GameMaster action owned by ${action.role}.`)
  }

  const command = combatActionCommand(action)

  if (!command) {
    throw new Error(`${role} submitted non-combat GameMaster action ${action.id}.`)
  }

  return command
}

type BotRuntime = {
  role: TeamRole
  stats: BotStats
  parts: RuntimePart[]
  index: BotRuntimeIndex<RuntimePart>
  health: number
  maxHealth: number
  hasUtilityControl: boolean
  hasWeaponControl: boolean
  weaponSlotCount: number
  position: Vector3
  statuses: RuntimeStatusEffect[]
  cooldowns: Record<string, number>
  charges: Record<string, number>
  lastDamagedTick: number
  lastDealtDamageTick: number
  lastMove?: MovementCommand
}

type RuntimePart = {
  blockId: string
  partId: string
  category: PartCategory
  hasWeaponControl: boolean
  hasUtilityControl: boolean
  weaponSpec?: WeaponSpec
  mountMotion?: PartMountMotion
  signatureEffect?: PartEffect
  behaviorId?: PartBehaviorId
  behaviorSlot?: PartBehaviorSlot
  position: Vector3
  health: number
  maxHealth: number
}

type CombatRuntimeState = {
  round: number
  arena: ArenaConfig
  topology: CompiledArenaTopology
  rng: () => number
  red: BotRuntime
  blue: BotRuntime
  events: ReplayEvent[]
  log: string[]
  elapsedTicks: number
  lastDamageTick: number
  stoppedByNoDamage: boolean
}

type CombatTickResult = {
  completed: boolean
}

type PartDamageHit = {
  blockId: string
  partId: string
  damageApplied: number
  remainingHealth: number
  maxHealth: number
  broke: boolean
  position: Vector3
}

type WeaponSlot = 'weaponA' | 'weaponB'
type DetachMetadataContext = {
  cause: string
  damage: number
  sourcePosition: Vector3
  impactPosition: Vector3
}

const WEAPON_SLOTS: readonly WeaponSlot[] = ['weaponA', 'weaponB']
const NO_DAMAGE_STALEMATE_TICKS = 60
const HARD_MAX_COMBAT_TICKS = 600
const MIN_REPLAY_DURATION = 6
const REPLAY_TRAILING_SECONDS = 1
const CONTACT_DISTANCE = 1.28
const BOOSTER_COOLDOWN_TICKS = 4
const BOOSTER_MOVEMENT_MULTIPLIER = 1.35
const CONTROL_DRAG_DISTANCE = 0.9
const DRONE_COOLDOWN_TICKS = 4
const DRONE_CHARGES = 2
const DRONE_DAMAGE = 12
const DRONE_RANGE = 12.5
const SENSOR_REACH_BONUS = 0.9
const TURRET_REACH_BONUS = 2.25
const REPAIR_CHARGES = 1
const REPAIR_COOLDOWN_TICKS = 8
const REPAIR_AMOUNT = 8
const STATUS_DURATIONS: Record<RuntimeStatusEffectId, number> = {
  slowed: 3,
  anchored: 2,
  smoked: 3,
  drone_harassed: 3,
  repairing: 2,
}

const DEFAULT_ARENA: ArenaConfig = DEFAULT_ARENA_CONFIG

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function distance(left: Vector3, right: Vector3): number {
  return Math.hypot(left[0] - right[0], left[2] - right[2])
}

function normalizedFlatVector(from: Vector3, to: Vector3, fallback: Vector3 = [1, 0, 0]): Vector3 {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const length = Math.hypot(dx, dz)

  if (length <= 0) {
    return fallback
  }

  return [round(dx / length), 0, round(dz / length)]
}

function weaponReach(bot: BotRuntime): number {
  return Math.max(
    1.6 + bot.stats.control / 16 + bot.stats.weaponThreat / 28 + weaponReachBonus(bot),
    ...aliveWeaponControlParts(bot).map((part) => weaponSpecReach(part)),
  )
}

function weaponSpecReach(part: RuntimePart): number {
  if (!part.weaponSpec) {
    return 0
  }

  if (part.mountMotion === 'inherits_parent_spin') {
    return part.weaponSpec.range
  }

  return part.weaponSpec.fireMode === 'direct' || part.weaponSpec.fireMode === 'arc'
    ? part.weaponSpec.range
    : 0
}

function createRuntimeParts(blueprint: BotBlueprint, stats: BotStats): RuntimePart[] {
  const rawParts = blueprint.blocks.map((block) => {
    const part = getPart(block.partId)
    const behaviorId = knownBehaviorId(part?.behavior?.id)
    const weaponSpec = effectiveWeaponSpec(part?.spec, block.mountMotion)
    const signatureEffect = block.signatureEffectActive ? part?.signatureEffect : undefined

    return {
      block,
      category: part?.category ?? 'body',
      durability: Math.max(1, part?.durability ?? 1),
      hasUtilityControl: Boolean(part?.controls?.utility || signatureEffect?.trigger === 'activated'),
      hasWeaponControl: Boolean(part?.controls?.weapon || weaponSpec),
      weaponSpec,
      mountMotion: block.mountMotion,
      signatureEffect,
      behaviorId,
      behaviorSlot: part?.behavior?.slot,
    }
  })
  const rawTotal = rawParts.reduce((total, part) => total + part.durability, 0)
  const healthScale = stats.durability / Math.max(1, rawTotal)

  return rawParts.map(({
    block,
    category,
    durability,
    hasUtilityControl,
    hasWeaponControl,
    weaponSpec,
    mountMotion,
    signatureEffect,
    behaviorId,
    behaviorSlot,
  }) => {
    const maxHealth = round(Math.max(1, durability * healthScale))

    return {
      blockId: block.id,
      partId: block.partId,
      category,
      hasWeaponControl,
      hasUtilityControl,
      weaponSpec,
      mountMotion,
      signatureEffect,
      behaviorId,
      behaviorSlot,
      position: [...block.position],
      health: maxHealth,
      maxHealth,
    }
  })
}

function knownBehaviorId(id: string | undefined): PartBehaviorId | undefined {
  if (!id) {
    return undefined
  }

  return PART_BEHAVIOR_IDS.includes(id as PartBehaviorId) ? id as PartBehaviorId : undefined
}

// CODEX_INTENT: tie weapon slot availability to live runtime weapon-control parts.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
function countAliveWeaponSlots(index: BotRuntimeIndex<RuntimePart>): number {
  return Math.min(
    WEAPON_SLOTS.length,
    index.weaponControlParts.length,
  )
}

function updateRuntimeControlState(bot: BotRuntime): void {
  bot.weaponSlotCount = countAliveWeaponSlots(bot.index)
  bot.hasWeaponControl = bot.weaponSlotCount > 0
  bot.hasUtilityControl = bot.index.utilityControlParts.length > 0
}

function refreshRuntimeIndex(bot: BotRuntime): void {
  bot.index = createBotRuntimeIndex(bot.parts)
}

function advanceRuntimeEffects(bot: BotRuntime, tick: number): void {
  bot.statuses = expireRuntimeStatuses(bot.statuses, tick)
  tickCooldowns(bot.cooldowns)
  updateRuntimeControlState(bot)
}

function tickCooldowns(cooldowns: Record<string, number>): void {
  for (const key of Object.keys(cooldowns).sort()) {
    const remaining = cooldowns[key] - 1

    if (remaining > 0) {
      cooldowns[key] = remaining
    } else {
      delete cooldowns[key]
    }
  }
}

function aliveWeaponControlParts(bot: BotRuntime): RuntimePart[] {
  return [...bot.index.weaponControlParts]
}

function aliveBehaviorParts(
  bot: BotRuntime,
  slot: PartBehaviorSlot,
  ids?: readonly PartBehaviorId[],
): RuntimePart[] {
  return getAliveBehaviorParts(bot.index, slot, ids)
}

function hasAliveBehavior(bot: BotRuntime, id: PartBehaviorId): boolean {
  return hasAliveBehaviorPart(bot.index, id)
}

function firstAliveBehaviorPart(
  bot: BotRuntime,
  ids: readonly PartBehaviorId[],
): RuntimePart | undefined {
  return findFirstAliveBehaviorPart(bot.index, ids)
}

function isReadyBehaviorPart(bot: BotRuntime, part: RuntimePart): boolean {
  const key = behaviorKey(part)

  return key !== undefined && (bot.cooldowns[key] ?? 0) <= 0 && (bot.charges[key] ?? 1) > 0
}

function firstReadyBehaviorPart(
  bot: BotRuntime,
  slot: PartBehaviorSlot,
  ids?: readonly PartBehaviorId[],
): RuntimePart | undefined {
  return aliveBehaviorParts(bot, slot, ids).find((part) => isReadyBehaviorPart(bot, part))
}

function behaviorKey(part: RuntimePart): string | undefined {
  return part.behaviorId ? `${part.blockId}:${part.behaviorId}` : undefined
}

function signatureKey(part: RuntimePart): string | undefined {
  return part.signatureEffect ? `${part.blockId}:${part.signatureEffect.id}` : undefined
}

function isReadySignaturePart(bot: BotRuntime, part: RuntimePart): boolean {
  const key = signatureKey(part)

  return key !== undefined && (bot.cooldowns[key] ?? 0) <= 0 && (bot.charges[key] ?? 1) > 0
}

function startCooldown(bot: BotRuntime, key: string, ticks: number): void {
  bot.cooldowns[key] = ticks
}

function consumeCharge(bot: BotRuntime, key: string): void {
  if (bot.charges[key] === undefined) {
    return
  }

  bot.charges[key] = Math.max(0, bot.charges[key] - 1)
}

function createInitialCharges(parts: RuntimePart[]): Record<string, number> {
  const charges: Record<string, number> = {}

  for (const part of parts) {
    const key = behaviorKey(part)

    if (key === undefined) {
      continue
    }

    if (part.behaviorId === 'repair_kit') {
      charges[key] = REPAIR_CHARGES
    }
    if (part.behaviorId === 'drone_controller') {
      charges[key] = DRONE_CHARGES
    }
  }

  for (const part of parts) {
    const key = signatureKey(part)

    if (key === undefined || part.signatureEffect?.charges === undefined) {
      continue
    }

    charges[key] = part.signatureEffect.charges
  }

  return charges
}

function policyStateFor(bot: BotRuntime): PolicyBotState {
  return {
    role: bot.role,
    stats: bot.stats,
    health: bot.health,
    maxHealth: bot.maxHealth,
    hasUtilityControl: bot.hasUtilityControl,
    hasWeaponControl: bot.hasWeaponControl,
    weaponSlotCount: bot.weaponSlotCount,
    position: bot.position,
    lastDamagedTick: bot.lastDamagedTick,
    lastDealtDamageTick: bot.lastDealtDamageTick,
    lastMove: bot.lastMove,
    anchoredStance: hasAnchoredStance(bot),
    hazardBaitControl: hasHazardBaitControl(bot),
    weaponReachBonus: weaponReachBonus(bot),
    contactDanger: contactDangerScore(bot),
    controlDanger: controlDangerScore(bot),
    hasBoosterUtility: hasAliveBehaviorPart(bot.index, 'booster'),
    hasRepairUtility: hasAliveBehaviorPart(bot.index, 'repair_kit'),
    hasDroneUtility: hasAliveBehaviorPart(bot.index, 'drone_controller'),
  }
}

function hasAnchoredStance(bot: BotRuntime): boolean {
  return (
    hasAliveBehavior(bot, 'anchor') ||
    (hasAliveBehavior(bot, 'spinner') && hasAliveBehavior(bot, 'gyro'))
  )
}

function hasHazardBaitControl(bot: BotRuntime): boolean {
  return (
    hasAliveBehavior(bot, 'booster') ||
    hasAliveBehavior(bot, 'smoke')
  )
}

function weaponReachBonus(bot: BotRuntime): number {
  let bonus = 0

  if (hasAliveBehavior(bot, 'turret')) {
    bonus += TURRET_REACH_BONUS
  }
  if (hasAliveBehavior(bot, 'sensor')) {
    bonus += SENSOR_REACH_BONUS
  }

  return bonus
}

function contactDangerScore(bot: BotRuntime): number {
  let score = 0

  if (hasAliveBehavior(bot, 'spinner')) {
    score += 1.35
  }
  if (hasAliveBehavior(bot, 'saw')) {
    score += 1.05
  }
  if (hasAliveBehavior(bot, 'ram') || hasAliveBehavior(bot, 'flipper')) {
    score += 0.65
  }
  if (hasAliveBehavior(bot, 'spiked_armor')) {
    score += 0.45
  }

  return score
}

function controlDangerScore(bot: BotRuntime): number {
  let score = bot.stats.control / 24

  if (hasAliveBehavior(bot, 'net') || hasAliveBehavior(bot, 'grabber')) {
    score += 0.85
  }
  if (hasAliveBehavior(bot, 'magnet')) {
    score += 0.65
  }

  return score
}

function createCombatRuntime(input: ResolveCombatInput): CombatRuntimeState {
  const arena = input.arena ?? DEFAULT_ARENA
  const topology = compileArenaTopology(arena)
  const redStats = deriveBotStats(input.red.blueprint)
  const blueStats = deriveBotStats(input.blue.blueprint)
  const red = createBotRuntime('red', input.red.blueprint, redStats, [-6, 0, 0])
  const blue = createBotRuntime('blue', input.blue.blueprint, blueStats, [6, 0, 0])

  return {
    round: input.round,
    arena,
    topology,
    rng: createSeededRng(`${input.seed}:${input.round}`),
    red,
    blue,
    events: [
      { t: 0, type: 'spawn', bot: 'red', position: red.position, rotation: [0, 90, 0] },
      { t: 0, type: 'spawn', bot: 'blue', position: blue.position, rotation: [0, -90, 0] },
    ],
    log: [],
    elapsedTicks: 0,
    lastDamageTick: 0,
    stoppedByNoDamage: false,
  }
}

function createBotRuntime(
  role: TeamRole,
  blueprint: BotBlueprint,
  stats: BotStats,
  position: Vector3,
): BotRuntime {
  const parts = createRuntimeParts(blueprint, stats)
  const index = createBotRuntimeIndex(parts)
  const weaponSlotCount = countAliveWeaponSlots(index)
  const health = sumPartHealth(parts)

  return {
    role,
    stats,
    parts,
    index,
    health,
    maxHealth: health,
    hasUtilityControl: index.utilityControlParts.length > 0,
    hasWeaponControl: weaponSlotCount > 0,
    weaponSlotCount,
    position,
    statuses: [],
    cooldowns: {},
    charges: createInitialCharges(parts),
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity,
  }
}

function createCombatSnapshot(
  tick: number,
  arena: ArenaConfig,
  red: BotRuntime,
  blue: BotRuntime,
  events: readonly ReplayEvent[],
): CombatTurnSnapshot {
  return {
    tick,
    arena,
    distance: round(distance(red.position, blue.position)),
    hardMaxTicks: HARD_MAX_COMBAT_TICKS,
    recentEvents: recentEventSummaries(events),
    red: createBotSnapshot(red),
    blue: createBotSnapshot(blue),
  }
}

function createBotSnapshot(bot: BotRuntime): CombatBotSnapshot {
  return {
    role: bot.role,
    position: [...bot.position],
    health: round(bot.health),
    maxHealth: round(bot.maxHealth),
    partHealth: partHealthByBlock(bot.parts),
    stats: { ...bot.stats },
    hasUtilityControl: bot.hasUtilityControl,
    hasWeaponControl: bot.hasWeaponControl,
    weaponSlotCount: bot.weaponSlotCount,
    weaponReach: round(weaponReach(bot)),
    statuses: bot.statuses.map((status) => status.id).sort(),
    cooldowns: { ...bot.cooldowns },
    charges: { ...bot.charges },
  }
}

function recentEventSummaries(events: readonly ReplayEvent[]): string[] {
  return events
    .slice(-8)
    .map((event) => describeReplayEvent(event))
}

function describeReplayEvent(event: ReplayEvent): string {
  switch (event.type) {
    case 'spawn':
      return `${event.bot} spawned`
    case 'move':
      return `${event.bot} moved ${event.command ?? event.intent}`
    case 'weapon_fire':
      return `${event.bot} fired ${event.weaponSlot ?? 'weapon'}`
    case 'impact':
      return `${event.attacker} hit ${event.defender}`
    case 'damage':
      return `${event.bot} took ${event.amount} damage`
    case 'hazard':
      return event.damage > 0
        ? `${event.bot} took ${event.damage} hazard damage`
        : `${event.bot} triggered ${event.hazard}`
    case 'part_detach':
      return `${event.bot} lost ${event.partId}`
    case 'knockout':
      return `${event.bot} was knocked out`
    default:
      return event.type
  }
}

function sumPartHealth(parts: RuntimePart[]): number {
  return parts.reduce((total, part) => total + part.health, 0)
}

function partHealthByBlock(parts: RuntimePart[]): Record<string, number> {
  return Object.fromEntries(parts.map((part) => [part.blockId, round(part.health)]))
}

function isBotDestroyed(bot: BotRuntime): boolean {
  return bot.parts.every((part) => part.health <= 0)
}

function partWorldPosition(bot: BotRuntime, part: RuntimePart): Vector3 {
  return [
    round(bot.position[0] + part.position[0] * 0.35),
    round(0.22 + part.position[1] * 0.18),
    round(bot.position[2] + part.position[2] * 0.35),
  ]
}

function applyStatus(
  bot: BotRuntime,
  id: RuntimeStatusEffectId,
  sourcePart: RuntimePart,
  tick: number,
): void {
  const sourceKey = behaviorKey(sourcePart) ?? sourcePart.blockId

  applyStatusFromSource(bot, id, sourceKey, tick)
}

function applyStatusFromSource(
  bot: BotRuntime,
  id: RuntimeStatusEffectId,
  sourceKey: string,
  tick: number,
): boolean {
  const hadActiveStatus = bot.statuses.some(
    (status) => status.id === id && status.sourceKey === sourceKey && status.expiresAtTick > tick,
  )

  bot.statuses = addRuntimeStatus(bot.statuses, {
    id,
    sourceKey,
    appliedTick: tick,
    expiresAtTick: runtimeStatusExpiresAtTick(tick, STATUS_DURATIONS[id]),
  })

  return !hadActiveStatus
}

type MovementUtilityActivation = {
  multiplier: number
  consumed: boolean
}

function activateMovementUtility(
  bot: BotRuntime,
  command: TurnCommand,
): MovementUtilityActivation {
  if (command.utility !== 'activate') {
    return { multiplier: 1, consumed: false }
  }

  const booster = firstReadyBehaviorPart(bot, 'utility', ['booster'])
  const key = booster ? behaviorKey(booster) : undefined

  if (!booster || key === undefined) {
    return { multiplier: 1, consumed: false }
  }

  startCooldown(bot, key, BOOSTER_COOLDOWN_TICKS)

  return { multiplier: BOOSTER_MOVEMENT_MULTIPLIER, consumed: true }
}

function orderedDamageTargets(bot: BotRuntime, cause: string, tick: number): RuntimePart[] {
  return bot.parts
    .filter((part) => part.health > 0)
    .sort((left, right) => compareDamageTargets(left, right, cause, tick))
}

function applyPartDamage(bot: BotRuntime, amount: number, tick: number, cause: string): PartDamageHit[] {
  let remainingDamage = amount
  const hits: PartDamageHit[] = []

  for (const part of orderedDamageTargets(bot, cause, tick)) {
    if (remainingDamage <= 0) {
      break
    }

    const before = part.health
    const applied = Math.min(before, remainingDamage)

    part.health = round(Math.max(0, before - applied))
    remainingDamage = round(remainingDamage - applied)
    hits.push({
      blockId: part.blockId,
      partId: part.partId,
      damageApplied: round(applied),
      remainingHealth: part.health,
      maxHealth: part.maxHealth,
      broke: before > 0 && part.health <= 0,
      position: partWorldPosition(bot, part),
    })
  }

  bot.health = round(sumPartHealth(bot.parts))
  refreshRuntimeIndex(bot)

  return hits
}

function moveIntentFor(command: MovementCommand | undefined, forced = false): MoveIntent {
  if (forced) {
    return 'forced'
  }

  switch (command) {
    case 'forward':
    case 'dash_forward':
      return 'advance'
    case 'backward':
    case 'dash_backward':
      return 'retreat'
    case 'strafe_left':
    case 'strafe_right':
      return 'strafe'
    case 'circle_left':
    case 'circle_right':
      return 'circle'
    case 'turn_left':
    case 'turn_right':
      return 'turn'
    case 'brake':
    case undefined:
      return 'forced'
  }
}

function moveEasingFor(command: MovementCommand | undefined, forced = false): MoveEasing {
  if (forced) {
    return 'ease_out'
  }

  switch (command) {
    case 'dash_forward':
    case 'dash_backward':
      return 'ease_out'
    case 'turn_left':
    case 'turn_right':
    case 'circle_left':
    case 'circle_right':
      return 'ease_in_out'
    case 'brake':
    case undefined:
      return 'brake'
    case 'forward':
    case 'backward':
    case 'strafe_left':
    case 'strafe_right':
      return 'linear'
  }
}

function moveDurationFor(command: MovementCommand | undefined, forced = false): number {
  if (forced) {
    return 0.35
  }

  switch (command) {
    case 'dash_forward':
    case 'dash_backward':
      return 0.48
    case 'turn_left':
    case 'turn_right':
    case 'circle_left':
    case 'circle_right':
      return 0.72
    case 'brake':
    case undefined:
      return 0.25
    case 'forward':
    case 'backward':
    case 'strafe_left':
    case 'strafe_right':
      return 0.68
  }
}

function createMoveEvent(
  t: number,
  bot: BotRuntime,
  from: Vector3,
  to: Vector3,
  command?: MovementCommand,
  forced = false,
): MoveEvent {
  return {
    t,
    type: 'move',
    bot: bot.role,
    from,
    to,
    duration: moveDurationFor(command, forced),
    easing: moveEasingFor(command, forced),
    command,
    intent: moveIntentFor(command, forced),
    facing: normalizedFlatVector(from, to, bot.role === 'red' ? [1, 0, 0] : [-1, 0, 0]),
    contactIntent: !forced && command !== undefined && isContactMove({ tick: Math.trunc(t), move: command }),
  }
}

function createDetachMetadata(
  bot: BotRuntime,
  hit: PartDamageHit,
  index: number,
  context: DetachMetadataContext,
): Pick<
  PartDetachEvent,
  'sourcePosition' | 'impactPosition' | 'impulse' | 'angularImpulse' | 'fractureSeverity' | 'damageCause'
> {
  const direction = normalizedFlatVector(context.sourcePosition, hit.position, [bot.role === 'red' ? 1 : -1, 0, 0])
  const severity = round(Math.min(1, hit.damageApplied / Math.max(1, hit.maxHealth)))
  const impulseScale = round(0.35 + severity * 1.65 + Math.min(1.2, context.damage / 18))
  const offsetX = hit.position[0] - bot.position[0]
  const offsetZ = hit.position[2] - bot.position[2]

  return {
    sourcePosition: context.sourcePosition,
    impactPosition: context.impactPosition,
    impulse: [
      round(direction[0] * impulseScale),
      round(0.28 + severity * 0.72),
      round(direction[2] * impulseScale),
    ],
    angularImpulse: [
      round(offsetZ * impulseScale * 0.3),
      round((index + 1) * (0.18 + severity * 0.42)),
      round(-offsetX * impulseScale * 0.3),
    ],
    fractureSeverity: severity,
    damageCause: context.cause,
  }
}

function emitPartDetachEvents(
  events: ReplayEvent[],
  tick: number,
  bot: BotRuntime,
  hits: PartDamageHit[],
  startTime = tick + 0.36,
  context?: DetachMetadataContext,
): void {
  hits.forEach((hit, index) => {
    if (!hit.broke) {
      return
    }

    events.push({
      t: startTime + index * 0.03,
      type: 'part_detach',
      bot: bot.role,
      blockId: hit.blockId,
      partId: hit.partId,
      position: hit.position,
      ...(context ? createDetachMetadata(bot, hit, index, context) : {}),
    })
  })
}

function movementImpactMultiplier(command: TurnCommand): number {
  switch (command.move) {
    case 'dash_forward':
      return 1.35
    case 'forward':
      return 1
    case 'turn_left':
    case 'turn_right':
      return 0.85
    case 'circle_left':
    case 'circle_right':
      return 0.78
    case 'backward':
    case 'dash_backward':
    case 'strafe_left':
    case 'strafe_right':
      return 0.65
    case 'brake':
    case undefined:
      return 0
  }
}

function contactAttackDamage(bot: BotRuntime, command: TurnCommand): number {
  const baseDamage =
    (bot.stats.mass / 7 + bot.stats.stability / 3) * movementImpactMultiplier(command)

  if (baseDamage <= 0) {
    return 0
  }

  let multiplier = 1

  if (hasAliveBehavior(bot, 'ram')) {
    multiplier += 0.45
  }
  if (hasAliveBehavior(bot, 'flipper')) {
    multiplier += 0.35
  }
  if (hasAliveBehavior(bot, 'wedge')) {
    multiplier += 0.22
  }
  if (hasAliveBehavior(bot, 'front_plate')) {
    multiplier += 0.15
  }

  return round(baseDamage * multiplier)
}

function contactRetaliationDamage(defender: BotRuntime, incomingCommand: TurnCommand): number {
  if (!isContactMove(incomingCommand)) {
    return 0
  }

  let damage = 0

  if (
    hasAliveBehavior(defender, 'spinner') &&
    (hasAliveBehavior(defender, 'anchor') || hasAliveBehavior(defender, 'gyro'))
  ) {
    damage += 4 + defender.stats.weaponThreat * 0.32 + defender.stats.stability * 0.12
  }
  if (hasAliveBehavior(defender, 'spiked_armor')) {
    damage += 3 + defender.stats.armor * 0.18 + defender.stats.weaponThreat * 0.12
  }
  if (hasAliveBehavior(defender, 'reactive_armor')) {
    damage += 3 + defender.stats.chaos * 0.45
  }
  if (damage > 0 && hasAliveBehavior(defender, 'anchor')) {
    damage *= 1.15
  }

  return round(damage)
}

function applyContactDisruption(
  attacker: BotRuntime,
  defender: BotRuntime,
  command: TurnCommand,
  tick: number,
): void {
  if (!isContactMove(command)) {
    return
  }

  const disruptionPart = firstAliveBehaviorPart(attacker, [
    'flipper',
    'grabber',
    'ram',
    'wedge',
    'front_plate',
  ])

  if (!disruptionPart) {
    return
  }

  applyStatus(
    defender,
    disruptionPart.behaviorId === 'flipper' || disruptionPart.behaviorId === 'grabber'
      ? 'anchored'
      : 'slowed',
    disruptionPart,
    tick,
  )
}

function moveBot(
  bot: BotRuntime,
  command: TurnCommand,
  arena: ArenaConfig,
  utilityMultiplier: number,
): Vector3 {
  if (bot.stats.mobility <= 0) {
    return bot.position
  }

  const statusMultiplier = runtimeStatusMovementMultiplier(bot.statuses)

  if (statusMultiplier <= 0) {
    return bot.position
  }

  const speed =
    Math.max(0.2, Math.min(2.75, 0.45 + bot.stats.mobility / 18)) *
    statusMultiplier *
    utilityMultiplier
  const direction = bot.role === 'red' ? 1 : -1
  const from = bot.position
  let x = from[0]
  let z = from[2]

  switch (command.move) {
    case 'forward':
      x += direction * speed
      break
    case 'backward':
      x -= direction * speed * 0.7
      break
    case 'dash_forward':
      x += direction * speed * 1.55
      break
    case 'dash_backward':
      x -= direction * speed * 1.25
      break
    case 'strafe_left':
      z -= speed * 1.05
      break
    case 'strafe_right':
      z += speed * 1.05
      break
    case 'circle_left':
      z -= speed * 0.95
      x += direction * speed * 0.35
      break
    case 'circle_right':
      z += speed * 0.95
      x += direction * speed * 0.35
      break
    case 'turn_left':
      z -= speed * 0.65
      x += direction * speed * 0.25
      break
    case 'turn_right':
      z += speed * 0.65
      x += direction * speed * 0.25
      break
    case 'brake':
    case undefined:
      break
  }

  return clampPositionToArena(arena, [x, 0, z])
}

function positionsEqual(left: Vector3, right: Vector3): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2]
}

function forceMoveToward(
  events: ReplayEvent[],
  tick: number,
  bot: BotRuntime,
  point: Vector3,
  arena: ArenaConfig,
  amount: number,
): void {
  const gap = distance(bot.position, point)

  if (gap <= 0) {
    return
  }

  const ratio = Math.min(1, amount / gap)
  const from = bot.position
  const to = clampPositionToArena(arena, [
    from[0] + (point[0] - from[0]) * ratio,
    0,
    from[2] + (point[2] - from[2]) * ratio,
  ])

  if (positionsEqual(from, to)) {
    return
  }

  bot.position = to
  events.push(createMoveEvent(tick + 0.22, bot, from, to, undefined, true))
}

function applyDamage(
  events: ReplayEvent[],
  tick: number,
  attacker: BotRuntime,
  defender: BotRuntime,
  baseDamage: number,
  cause: string,
): void {
  const wasAlive = !isBotDestroyed(defender)
  const statusMultiplier = runtimeStatusIncomingDamageMultiplier(defender.statuses, cause)
  const mitigated = Math.max(
    1,
    Math.round((baseDamage - defender.stats.armor * 0.35) * statusMultiplier),
  )
  const hits = applyPartDamage(defender, mitigated, tick, cause)
  const primaryHit = hits[0]

  defender.lastDamagedTick = tick
  attacker.lastDealtDamageTick = tick
  const impactPosition: Vector3 = [
    round((attacker.position[0] + defender.position[0]) / 2),
    0,
    round((attacker.position[2] + defender.position[2]) / 2),
  ]

  events.push({
    t: tick + 0.25,
    type: 'impact',
    attacker: attacker.role,
    defender: defender.role,
    damage: mitigated,
    position: impactPosition,
  })
  events.push({
    t: tick + 0.3,
    type: 'damage',
    bot: defender.role,
    amount: mitigated,
    remainingHealth: round(defender.health),
    blockId: primaryHit?.blockId,
    partId: primaryHit?.partId,
    partRemainingHealth: primaryHit?.remainingHealth,
    partMaxHealth: primaryHit?.maxHealth,
  })
  emitPartDetachEvents(events, tick, defender, hits, tick + 0.36, {
    cause,
    damage: mitigated,
    sourcePosition: attacker.position,
    impactPosition,
  })

  if (wasAlive && isBotDestroyed(defender)) {
    events.push({
      t: tick + 0.45,
      type: 'knockout',
      bot: defender.role,
      cause,
    })
  }
}

// CODEX_INTENT: resolve each fired weapon slot independently while preserving replay slot identity.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
function resolveWeapons(
  events: ReplayEvent[],
  tick: number,
  arena: ArenaConfig,
  attacker: BotRuntime,
  defender: BotRuntime,
  command: TurnCommand,
  nextRandom: () => number,
): void {
  if (isBotDestroyed(attacker) || isBotDestroyed(defender)) {
    return
  }

  const weaponParts = aliveWeaponControlParts(attacker)
  const firingSlots = WEAPON_SLOTS.flatMap((slot, index) => {
    const part = weaponParts[index]

    return part && command[slot] === 'fire' ? [{ slot, part }] : []
  })

  if (firingSlots.length === 0) {
    return
  }

  const topology = compileArenaTopology(arena)

  for (const { slot, part } of firingSlots) {
    if (!weaponPartCanHit(topology, attacker, defender, part)) {
      continue
    }

    const isNet = part.behaviorId === 'net'

    events.push({
      t: weaponFireTime(tick, slot),
      type: 'weapon_fire',
      bot: attacker.role,
      weaponSlot: slot,
      controlCue: isNet ? 'deploy' : undefined,
      targetPosition: defender.position,
      sourceBlockId: part.blockId,
      sourcePartId: part.partId,
      phase: isNet ? 'deploy' : 'release',
      fireMode: part.weaponSpec?.fireMode,
      style: part.behaviorId ?? part.category,
    })

    applyDamage(events, tick, attacker, defender, weaponSlotDamage(attacker, nextRandom()), 'weapon')
    applyWeaponBehavior(events, tick, arena, attacker, defender, part)
  }
}

function weaponPartCanHit(
  topology: CompiledArenaTopology,
  attacker: BotRuntime,
  defender: BotRuntime,
  part: RuntimePart,
): boolean {
  if (part.weaponSpec?.fireMode === 'sweep' && partWorldPosition(attacker, part)[1] < 0) {
    return false
  }

  const reach = Math.max(weaponReach(attacker), weaponSpecReach(part))
  const inRange = distance(attacker.position, defender.position) <= reach
  const hasLineOfSight = (
    part.mountMotion === 'inherits_parent_spin' &&
    part.weaponSpec?.fireMode === 'sweep'
  ) ||
    hasArenaLineOfSight(topology, attacker.position, defender.position)

  return inRange && hasLineOfSight
}

function applyWeaponBehavior(
  events: ReplayEvent[],
  tick: number,
  arena: ArenaConfig,
  attacker: BotRuntime,
  defender: BotRuntime,
  part: RuntimePart,
): void {
  switch (part.behaviorId) {
    case 'net':
      applyStatus(defender, 'slowed', part, tick)
      break
    case 'flipper':
      applyStatus(defender, 'anchored', part, tick)
      break
    case 'grabber':
      applyStatus(defender, 'anchored', part, tick)
      forceMoveToward(events, tick, defender, attacker.position, arena, CONTROL_DRAG_DISTANCE)
      break
    case 'spinner':
    case 'ram':
    case 'saw':
    case 'turret':
    case 'wedge':
    case 'front_plate':
    case 'spiked_armor':
    case 'reactive_armor':
    case 'booster':
    case 'gyro':
    case 'magnet':
    case 'anchor':
    case 'repair_kit':
    case 'smoke':
    case 'sensor':
    case 'drone_controller':
    case undefined:
      break
  }
}

function resolveUtilities(
  events: ReplayEvent[],
  tick: number,
  arena: ArenaConfig,
  actor: BotRuntime,
  opponent: BotRuntime,
  command: TurnCommand,
  movementUtilityConsumed: boolean,
): void {
  if (command.utility !== 'activate' || movementUtilityConsumed) {
    return
  }

  const signaturePart = chooseReadySignaturePart(actor)

  if (signaturePart && resolveSignatureUtility(events, actor, opponent, signaturePart, tick)) {
    return
  }

  const part = chooseReadyUtilityPart(actor, opponent)
  const key = part ? behaviorKey(part) : undefined

  if (!part || key === undefined) {
    return
  }

  switch (part.behaviorId) {
    case 'repair_kit':
      resolveRepairUtility(actor, part, key, tick)
      break
    case 'drone_controller':
      resolveDroneUtility(events, actor, opponent, part, key, tick)
      break
    case 'smoke':
      applyStatus(actor, 'smoked', part, tick)
      startCooldown(actor, key, 5)
      break
    case 'anchor':
      applyStatus(actor, 'anchored', part, tick)
      startCooldown(actor, key, 4)
      break
    case 'magnet':
      if (distance(actor.position, opponent.position) <= weaponReach(actor)) {
        applyStatus(opponent, 'anchored', part, tick)
        forceMoveToward(events, tick, opponent, actor.position, arena, CONTROL_DRAG_DISTANCE)
        startCooldown(actor, key, 5)
      }
      break
    case 'wedge':
    case 'spinner':
    case 'net':
    case 'ram':
    case 'flipper':
    case 'saw':
    case 'turret':
    case 'grabber':
    case 'front_plate':
    case 'spiked_armor':
    case 'reactive_armor':
    case 'gyro':
    case 'sensor':
    case 'booster':
    case undefined:
      break
  }
}

function chooseReadySignaturePart(actor: BotRuntime): RuntimePart | undefined {
  return actor.index.aliveParts.find((part) => (
    part.signatureEffect?.trigger === 'activated' &&
    isReadySignaturePart(actor, part)
  ))
}

function resolveSignatureUtility(
  events: ReplayEvent[],
  actor: BotRuntime,
  opponent: BotRuntime,
  part: RuntimePart,
  tick: number,
): boolean {
  const effect = part.signatureEffect
  const key = signatureKey(part)

  if (!effect || key === undefined) {
    return false
  }

  if (effect.id === 'fire_breath') {
    const range = numericEffectParam(effect, 'range', 4)
    const damage = numericEffectParam(effect, 'damage', 8)

    if (distance(actor.position, opponent.position) > range) {
      return false
    }

    events.push({
      t: round(tick + 0.18),
      type: 'ability',
      bot: actor.role,
      ability: 'fire_breath',
      target: opponent.role,
      targetPosition: opponent.position,
    })
    applyDamage(events, tick, actor, opponent, damage, 'fire_breath')
    startCooldown(actor, key, effect.cooldownTurns)
    consumeCharge(actor, key)

    return true
  }

  return false
}

function numericEffectParam(effect: PartEffect, key: string, fallback: number): number {
  const value = effect.params[key]

  return typeof value === 'number' ? value : fallback
}

function chooseReadyUtilityPart(
  actor: BotRuntime,
  opponent: BotRuntime,
): RuntimePart | undefined {
  const damaged = mostDamagedAlivePart(actor) !== undefined
  const magnetReady = distance(actor.position, opponent.position) <= weaponReach(actor)
  const priority: PartBehaviorId[] = [
    ...(damaged ? ['repair_kit' as const] : []),
    ...(distance(actor.position, opponent.position) <= DRONE_RANGE ? ['drone_controller' as const] : []),
    ...(magnetReady ? ['magnet' as const] : []),
    'smoke',
    'anchor',
    'gyro',
    'sensor',
  ]

  for (const id of priority) {
    const part = aliveBehaviorParts(actor, 'utility', [id]).find((candidate) =>
      isReadyBehaviorPart(actor, candidate),
    )

    if (part) {
      return part
    }
  }

  return firstReadyBehaviorPart(actor, 'utility')
}

function resolveRepairUtility(
  bot: BotRuntime,
  part: RuntimePart,
  key: string,
  tick: number,
): void {
  const target = mostDamagedAlivePart(bot)

  if (!target) {
    return
  }

  target.health = round(Math.min(target.maxHealth, target.health + REPAIR_AMOUNT))
  bot.health = round(sumPartHealth(bot.parts))
  refreshRuntimeIndex(bot)
  consumeCharge(bot, key)
  startCooldown(bot, key, REPAIR_COOLDOWN_TICKS)
  applyStatus(bot, 'repairing', part, tick)
}

function resolveDroneUtility(
  events: ReplayEvent[],
  actor: BotRuntime,
  opponent: BotRuntime,
  part: RuntimePart,
  key: string,
  tick: number,
): void {
  if (distance(actor.position, opponent.position) > DRONE_RANGE) {
    return
  }

  events.push({
    t: tick + 0.18,
    type: 'ability',
    bot: actor.role,
    ability: 'drone_swarm',
    target: opponent.role,
    targetPosition: opponent.position,
  })
  applyStatus(opponent, 'drone_harassed', part, tick)
  applyDamage(events, tick, actor, opponent, DRONE_DAMAGE, 'drone')
  consumeCharge(actor, key)
  startCooldown(actor, key, DRONE_COOLDOWN_TICKS)
}

function mostDamagedAlivePart(bot: BotRuntime): RuntimePart | undefined {
  return bot.parts
    .filter((part) => part.health > 0 && part.health < part.maxHealth)
    .sort((left, right) => {
      const ratioDelta = left.health / left.maxHealth - right.health / right.maxHealth

      if (ratioDelta !== 0) {
        return ratioDelta
      }

      if (left.health !== right.health) {
        return left.health - right.health
      }

      return left.blockId.localeCompare(right.blockId)
    })[0]
}

function weaponFireTime(tick: number, slot: WeaponSlot): number {
  return round(tick + 0.1 + WEAPON_SLOTS.indexOf(slot) * 0.02)
}

function weaponSlotDamage(attacker: BotRuntime, random: number): number {
  const slotCount = Math.max(1, attacker.weaponSlotCount)

  return 3 + (attacker.stats.weaponThreat * 0.8 + attacker.stats.control * 0.2) / slotCount + random * 5
}

function isContactMove(command: TurnCommand): boolean {
  return command.move !== undefined && command.move !== 'brake'
}

function resolveHazards(
  events: ReplayEvent[],
  tick: number,
  arena: ArenaConfig,
  topology: CompiledArenaTopology,
  bot: BotRuntime,
): void {
  const threats = hazardsAtPosition(topology, bot.position)

  if (threats.length === 0) {
    return
  }

  threats.forEach((threat) => applyArenaHazard(events, tick, arena, threat, bot))
}

function applyArenaHazard(
  events: ReplayEvent[],
  tick: number,
  arena: ArenaConfig,
  hazard: ArenaHazardThreat,
  bot: BotRuntime,
): void {
  switch (hazardEffectKind(hazard.type)) {
    case 'saw':
      applyDamagingHazard(events, tick, hazard, bot, sawHazardDamage(bot, hazard.damage))
      applyHazardStatus(bot, 'slowed', hazard, tick)
      break
    case 'pit':
      applyDamagingHazard(events, tick, hazard, bot, pitHazardDamage(bot, hazard.damage))
      applyHazardStatus(bot, 'anchored', hazard, tick)
      break
    case 'oil':
      if (applyHazardStatus(bot, 'slowed', hazard, tick)) {
        emitHazardTrigger(events, tick, hazard, bot, 0, hazard.position)
      }
      break
    case 'magnet':
      if (applyHazardStatus(bot, 'anchored', hazard, tick)) {
        forceMoveToward(events, tick, bot, hazard.position, arena, 0.85)
        emitHazardTrigger(events, tick, hazard, bot, 0, hazard.position)
      }
      break
    case 'flipper':
      if (applyHazardStatus(bot, 'anchored', hazard, tick)) {
        forceMoveToward(events, tick, bot, [0, 0, 0], arena, 1.25)
        emitHazardTrigger(events, tick, hazard, bot, 0, hazard.position)
      }
      break
    case 'generic':
      emitHazardTrigger(events, tick, hazard, bot, 0, hazard.position)
      break
  }
}

function applyHazardStatus(
  bot: BotRuntime,
  id: RuntimeStatusEffectId,
  hazard: ArenaHazardThreat,
  tick: number,
): boolean {
  return applyStatusFromSource(bot, id, `hazard:${hazard.id}`, tick)
}

function sawHazardDamage(bot: BotRuntime, baseDamage: number): number {
  return Math.max(1, Math.round(baseDamage - bot.stats.stability * 0.12))
}

function pitHazardDamage(bot: BotRuntime, baseDamage: number): number {
  return Math.max(2, Math.round(baseDamage - bot.stats.stability * 0.1))
}

function applyDamagingHazard(
  events: ReplayEvent[],
  tick: number,
  hazard: ArenaHazardThreat,
  bot: BotRuntime,
  damage: number,
): void {
  const impactPosition: Vector3 = bot.position
  const wasAlive = !isBotDestroyed(bot)
  const hits = applyPartDamage(bot, damage, tick, 'hazard')
  const primaryHit = hits[0]

  bot.lastDamagedTick = tick
  emitHazardTrigger(events, tick, hazard, bot, damage, impactPosition)
  events.push({
    t: tick + 0.38,
    type: 'damage',
    bot: bot.role,
    amount: damage,
    remainingHealth: round(bot.health),
    blockId: primaryHit?.blockId,
    partId: primaryHit?.partId,
    partRemainingHealth: primaryHit?.remainingHealth,
    partMaxHealth: primaryHit?.maxHealth,
  })
  emitPartDetachEvents(events, tick, bot, hits, tick + 0.44, {
    cause: 'hazard',
    damage,
    sourcePosition: hazard.position,
    impactPosition,
  })

  if (wasAlive && isBotDestroyed(bot)) {
    events.push({
      t: tick + 0.52,
      type: 'knockout',
      bot: bot.role,
      cause: 'hazard',
    })
  }
}

function emitHazardTrigger(
  events: ReplayEvent[],
  tick: number,
  hazard: ArenaHazardThreat,
  bot: BotRuntime,
  damage: number,
  position: Vector3,
): void {
  events.push({
    t: tick + 0.35,
    type: 'hazard',
    hazard: hazard.type,
    bot: bot.role,
    damage,
    position,
  })
}

function effectiveWeaponSpec(
  spec: { kind: string } | undefined,
  mountMotion: PartMountMotion | undefined,
): WeaponSpec | undefined {
  if (spec?.kind !== 'weapon') {
    return undefined
  }

  const weaponSpec = spec as WeaponSpec

  if (mountMotion === 'inherits_parent_spin' && weaponSpec.fireMode === 'direct') {
    return {
      ...weaponSpec,
      fireMode: 'sweep',
    }
  }

  return weaponSpec
}

type GameActionTickIntent = {
  command: TurnCommand
  movement: TacticalMovementPlan
  movementBlocked: boolean
}

type AnchorConflict = {
  blockRed: boolean
  blockBlue: boolean
  contactRed: boolean
  contactBlue: boolean
  reason?: string
}

function applyGameActionTick(
  state: CombatRuntimeState,
  tick: number,
  redAction: CanonicalGameAction,
  blueAction: CanonicalGameAction,
): CombatTickResult {
  const { arena, events, topology, red, blue } = state

  state.elapsedTicks = tick
  advanceRuntimeEffects(red, tick)
  advanceRuntimeEffects(blue, tick)

  const healthBeforeTick = red.health + blue.health
  const redCommand = { ...commandFromCanonicalAction(redAction, 'red'), tick }
  const blueCommand = { ...commandFromCanonicalAction(blueAction, 'blue'), tick }
  const redIntent = gameActionTickIntent(state, 'red', redCommand)
  const blueIntent = gameActionTickIntent(state, 'blue', blueCommand)
  const redMovementUtility = activateMovementUtility(red, redCommand)
  const blueMovementUtility = activateMovementUtility(blue, blueCommand)
  const conflict = anchorConflictForIntents(redIntent, blueIntent)
  const redResolvedCommand = redIntent.movementBlocked || conflict.blockRed
    ? { ...redCommand, move: 'brake' as const }
    : redCommand
  const blueResolvedCommand = blueIntent.movementBlocked || conflict.blockBlue
    ? { ...blueCommand, move: 'brake' as const }
    : blueCommand

  red.lastMove = redResolvedCommand.move
  blue.lastMove = blueResolvedCommand.move

  if (redIntent.movementBlocked) {
    state.log.push(`red combat action ${redAction.id} had a blocked or out-of-bounds anchor path.`)
  }
  if (blueIntent.movementBlocked) {
    state.log.push(`blue combat action ${blueAction.id} had a blocked or out-of-bounds anchor path.`)
  }
  if (conflict.reason) {
    state.log.push(`Combat anchor conflict on tick ${tick}: ${conflict.reason}.`)
  }

  const redMoved = applyAnchorMovement(events, tick, topology, red, redResolvedCommand, redIntent)
  const blueMoved = applyAnchorMovement(events, tick, topology, blue, blueResolvedCommand, blueIntent)

  applyAnchorConflictDamage(events, tick, red, blue, redCommand, blueCommand, conflict)

  if (redMoved) {
    applyAnchorPathHazards(events, tick, arena, topology, red, redIntent.movement)
  } else {
    resolveHazards(events, tick, arena, topology, red)
  }
  if (blueMoved) {
    applyAnchorPathHazards(events, tick, arena, topology, blue, blueIntent.movement)
  } else {
    resolveHazards(events, tick, arena, topology, blue)
  }

  resolveWeapons(events, tick, arena, red, blue, redResolvedCommand, state.rng)
  resolveWeapons(events, tick, arena, blue, red, blueResolvedCommand, state.rng)
  resolveUtilities(events, tick, arena, red, blue, redResolvedCommand, redMovementUtility.consumed)
  resolveUtilities(events, tick, arena, blue, red, blueResolvedCommand, blueMovementUtility.consumed)

  if (
    !isBotDestroyed(red) &&
    !isBotDestroyed(blue) &&
    distance(red.position, blue.position) < CONTACT_DISTANCE &&
    (isContactMove(redResolvedCommand) || isContactMove(blueResolvedCommand))
  ) {
    const redRamDamage = contactAttackDamage(red, redResolvedCommand)
    const blueRamDamage = contactAttackDamage(blue, blueResolvedCommand)
    const redRetaliationDamage = contactRetaliationDamage(red, blueResolvedCommand)
    const blueRetaliationDamage = contactRetaliationDamage(blue, redResolvedCommand)

    if (redRamDamage > 0) {
      applyDamage(events, tick, red, blue, redRamDamage, 'ram')
      applyContactDisruption(red, blue, redResolvedCommand, tick)
    }
    if (blueRamDamage > 0) {
      applyDamage(events, tick, blue, red, blueRamDamage, 'ram')
      applyContactDisruption(blue, red, blueResolvedCommand, tick)
    }
    if (!isBotDestroyed(red) && !isBotDestroyed(blue) && redRetaliationDamage > 0) {
      applyDamage(events, tick, red, blue, redRetaliationDamage, 'weapon')
    }
    if (!isBotDestroyed(red) && !isBotDestroyed(blue) && blueRetaliationDamage > 0) {
      applyDamage(events, tick, blue, red, blueRetaliationDamage, 'weapon')
    }
  }

  if (red.health + blue.health < healthBeforeTick) {
    state.lastDamageTick = tick
  }

  if (isBotDestroyed(red) || isBotDestroyed(blue)) {
    return { completed: true }
  }

  if (tick - state.lastDamageTick >= NO_DAMAGE_STALEMATE_TICKS) {
    state.stoppedByNoDamage = true
    return { completed: true }
  }

  return { completed: tick >= HARD_MAX_COMBAT_TICKS }
}

function gameActionTickIntent(
  state: CombatRuntimeState,
  role: TeamRole,
  command: TurnCommand,
): GameActionTickIntent {
  const legality = evaluateCombatCommand(combatLegalityContextForState(state, role), command)

  return {
    command,
    movement: legality.movement,
    movementBlocked: legality.movement.blocked || legality.movement.outOfBounds,
  }
}

function combatLegalityContextForState(
  state: CombatRuntimeState,
  role: TeamRole,
): CombatLegalityContext {
  const self = role === 'red' ? state.red : state.blue
  const opponent = role === 'red' ? state.blue : state.red

  return {
    arena: state.arena,
    role,
    self: createBotSnapshot(self),
    opponent: createBotSnapshot(opponent),
  }
}

function applyAnchorMovement(
  events: ReplayEvent[],
  tick: number,
  topology: CompiledArenaTopology,
  bot: BotRuntime,
  command: TurnCommand,
  intent: GameActionTickIntent,
): boolean {
  if (!movesAnchor(intent.movement) || intent.movementBlocked || command.move === 'brake') {
    return false
  }

  const from = bot.position
  const to = arenaCellCenter(topology, intent.movement.to)

  if (positionsEqual(from, to)) {
    return false
  }

  bot.position = to
  events.push(createMoveEvent(tick, bot, from, to, command.move))

  return true
}

function applyAnchorPathHazards(
  events: ReplayEvent[],
  tick: number,
  arena: ArenaConfig,
  topology: CompiledArenaTopology,
  bot: BotRuntime,
  movement: TacticalMovementPlan,
): void {
  const from = arenaCellCenter(topology, movement.from)
  const to = arenaCellCenter(topology, movement.to)
  const hazards = pathHazards(topology, from, to, 0.5)
  const seen = new Set<string>()

  for (const hazard of hazards) {
    if (!seen.has(hazard.id)) {
      seen.add(hazard.id)
      applyArenaHazard(events, tick, arena, hazard, bot)
    }
  }
}

function anchorConflictForIntents(
  red: GameActionTickIntent,
  blue: GameActionTickIntent,
): AnchorConflict {
  const redMoving = movesAnchor(red.movement) && !red.movementBlocked
  const blueMoving = movesAnchor(blue.movement) && !blue.movementBlocked

  if (!redMoving && !blueMoving) {
    return noAnchorConflict()
  }

  const redIntoBlueAnchor = redMoving && pathHasCell(red.movement.path, blue.movement.from)
  const blueIntoRedAnchor = blueMoving && pathHasCell(blue.movement.path, red.movement.from)

  if (
    redMoving &&
    blueMoving &&
    sameAnchorCell(red.movement.to, blue.movement.to)
  ) {
    return {
      blockRed: true,
      blockBlue: true,
      contactRed: true,
      contactBlue: true,
      reason: 'both bots selected the same final anchor',
    }
  }

  if (
    redMoving &&
    blueMoving &&
    red.movement.path.some((cell) => pathHasCell(blue.movement.path, cell))
  ) {
    return {
      blockRed: true,
      blockBlue: true,
      contactRed: redIntoBlueAnchor,
      contactBlue: blueIntoRedAnchor,
      reason: 'anchor paths crossed',
    }
  }

  if (redIntoBlueAnchor && !blueMoving) {
    return {
      blockRed: true,
      blockBlue: false,
      contactRed: true,
      contactBlue: false,
      reason: 'red rammed a held blue anchor',
    }
  }

  if (blueIntoRedAnchor && !redMoving) {
    return {
      blockRed: false,
      blockBlue: true,
      contactRed: false,
      contactBlue: true,
      reason: 'blue rammed a held red anchor',
    }
  }

  if (redIntoBlueAnchor && blueIntoRedAnchor) {
    return {
      blockRed: true,
      blockBlue: true,
      contactRed: true,
      contactBlue: true,
      reason: 'bots swapped anchor paths',
    }
  }

  return noAnchorConflict()
}

function applyAnchorConflictDamage(
  events: ReplayEvent[],
  tick: number,
  red: BotRuntime,
  blue: BotRuntime,
  redCommand: TurnCommand,
  blueCommand: TurnCommand,
  conflict: AnchorConflict,
): void {
  if (!conflict.contactRed && !conflict.contactBlue) {
    return
  }

  const redRamDamage = conflict.contactRed ? contactAttackDamage(red, redCommand) : 0
  const blueRamDamage = conflict.contactBlue ? contactAttackDamage(blue, blueCommand) : 0
  const redRetaliationDamage = conflict.contactBlue ? contactRetaliationDamage(red, blueCommand) : 0
  const blueRetaliationDamage = conflict.contactRed ? contactRetaliationDamage(blue, redCommand) : 0

  if (!isBotDestroyed(red) && !isBotDestroyed(blue) && redRamDamage > 0) {
    applyDamage(events, tick, red, blue, redRamDamage, 'ram')
    applyContactDisruption(red, blue, redCommand, tick)
  }
  if (!isBotDestroyed(red) && !isBotDestroyed(blue) && blueRamDamage > 0) {
    applyDamage(events, tick, blue, red, blueRamDamage, 'ram')
    applyContactDisruption(blue, red, blueCommand, tick)
  }
  if (!isBotDestroyed(red) && !isBotDestroyed(blue) && redRetaliationDamage > 0) {
    applyDamage(events, tick, red, blue, redRetaliationDamage, 'weapon')
  }
  if (!isBotDestroyed(red) && !isBotDestroyed(blue) && blueRetaliationDamage > 0) {
    applyDamage(events, tick, blue, red, blueRetaliationDamage, 'weapon')
  }
}

function movesAnchor(movement: TacticalMovementPlan): boolean {
  return !sameAnchorCell(movement.from, movement.to)
}

function pathHasCell(
  path: readonly TacticalMovementPlan['from'][],
  cell: TacticalMovementPlan['from'],
): boolean {
  return path.some((entry) => sameAnchorCell(entry, cell))
}

function sameAnchorCell(
  left: TacticalMovementPlan['from'],
  right: TacticalMovementPlan['from'],
): boolean {
  return left.x === right.x && left.z === right.z
}

function noAnchorConflict(): AnchorConflict {
  return {
    blockRed: false,
    blockBlue: false,
    contactRed: false,
    contactBlue: false,
  }
}

function applyCombatTick(
  state: CombatRuntimeState,
  tick: number,
  redCommand: TurnCommand,
  blueCommand: TurnCommand,
): CombatTickResult {
  const { arena, events, topology, red, blue } = state

  state.elapsedTicks = tick
  advanceRuntimeEffects(red, tick)
  advanceRuntimeEffects(blue, tick)

  const redFrom = red.position
  const blueFrom = blue.position
  const healthBeforeTick = red.health + blue.health
  const redMovementUtility = activateMovementUtility(red, redCommand)
  const blueMovementUtility = activateMovementUtility(blue, blueCommand)

  red.lastMove = redCommand.move
  blue.lastMove = blueCommand.move

  red.position = moveBot(red, redCommand, arena, redMovementUtility.multiplier)
  blue.position = moveBot(blue, blueCommand, arena, blueMovementUtility.multiplier)

  if (!positionsEqual(redFrom, red.position)) {
    events.push(createMoveEvent(tick, red, redFrom, red.position, redCommand.move))
  }
  if (!positionsEqual(blueFrom, blue.position)) {
    events.push(createMoveEvent(tick, blue, blueFrom, blue.position, blueCommand.move))
  }

  resolveWeapons(events, tick, arena, red, blue, redCommand, state.rng)
  resolveWeapons(events, tick, arena, blue, red, blueCommand, state.rng)
  resolveUtilities(events, tick, arena, red, blue, redCommand, redMovementUtility.consumed)
  resolveUtilities(events, tick, arena, blue, red, blueCommand, blueMovementUtility.consumed)

  if (
    !isBotDestroyed(red) &&
    !isBotDestroyed(blue) &&
    distance(red.position, blue.position) < CONTACT_DISTANCE &&
    (isContactMove(redCommand) || isContactMove(blueCommand))
  ) {
    const redRamDamage = contactAttackDamage(red, redCommand)
    const blueRamDamage = contactAttackDamage(blue, blueCommand)
    const redRetaliationDamage = contactRetaliationDamage(red, blueCommand)
    const blueRetaliationDamage = contactRetaliationDamage(blue, redCommand)

    if (redRamDamage > 0) {
      applyDamage(events, tick, red, blue, redRamDamage, 'ram')
      applyContactDisruption(red, blue, redCommand, tick)
    }
    if (blueRamDamage > 0) {
      applyDamage(events, tick, blue, red, blueRamDamage, 'ram')
      applyContactDisruption(blue, red, blueCommand, tick)
    }
    if (!isBotDestroyed(red) && !isBotDestroyed(blue) && redRetaliationDamage > 0) {
      applyDamage(events, tick, red, blue, redRetaliationDamage, 'weapon')
    }
    if (!isBotDestroyed(red) && !isBotDestroyed(blue) && blueRetaliationDamage > 0) {
      applyDamage(events, tick, blue, red, blueRetaliationDamage, 'weapon')
    }
  }

  resolveHazards(events, tick, arena, topology, red)
  resolveHazards(events, tick, arena, topology, blue)

  if (red.health + blue.health < healthBeforeTick) {
    state.lastDamageTick = tick
  }

  if (isBotDestroyed(red) || isBotDestroyed(blue)) {
    return { completed: true }
  }

  if (tick - state.lastDamageTick >= NO_DAMAGE_STALEMATE_TICKS) {
    state.stoppedByNoDamage = true
    return { completed: true }
  }

  return { completed: tick >= HARD_MAX_COMBAT_TICKS }
}

export function resolveCombat(input: ResolveCombatInput): CombatResult {
  const state = createCombatRuntime(input)
  const redPolicy = { tactics: input.red.tactics ?? DEFAULT_BOT_TACTICS }
  const bluePolicy = { tactics: input.blue.tactics ?? DEFAULT_BOT_TACTICS }

  for (let tick = 1; tick <= HARD_MAX_COMBAT_TICKS; tick += 1) {
    const redCommand = chooseCommand(
      redPolicy,
      tick,
      { bot: policyStateFor(state.red), opponent: policyStateFor(state.blue), arena: state.arena },
    )
    const blueCommand = chooseCommand(
      bluePolicy,
      tick,
      { bot: policyStateFor(state.blue), opponent: policyStateFor(state.red), arena: state.arena },
    )

    if (applyCombatTick(state, tick, redCommand, blueCommand).completed) {
      break
    }
  }

  return finalizeCombatResult(input, state)
}

export function resolveSubmittedCombat(
  input: ResolveCombatInput,
  commands: SubmittedCombatCommands,
): SubmittedCombatResolution {
  const state = createCombatRuntime(input)
  const submittedTicks = Math.min(
    commands.red.length,
    commands.blue.length,
    HARD_MAX_COMBAT_TICKS,
  )

  for (let index = 0; index < submittedTicks; index += 1) {
    const tick = index + 1
    const redCommand = { ...commands.red[index], tick }
    const blueCommand = { ...commands.blue[index], tick }

    if (applyCombatTick(state, tick, redCommand, blueCommand).completed) {
      return {
        status: 'complete',
        nextTick: tick,
        snapshot: createCombatSnapshot(tick, state.arena, state.red, state.blue, state.events),
        result: finalizeCombatResult(input, state),
      }
    }
  }

  const nextTick = submittedTicks + 1
  const snapshot = createCombatSnapshot(nextTick, state.arena, state.red, state.blue, state.events)
  const replay = createReplayTimeline({
    round: input.round,
    duration: partialReplayDuration(state.events, state.elapsedTicks),
    events: state.events,
    summary: `Combat turn ${nextTick} is waiting for agent commands.`,
  })

  return {
    status: 'active',
    nextTick,
    snapshot,
    replay,
    log: state.log,
  }
}

function finalizeCombatResult(
  input: ResolveCombatInput,
  state: CombatRuntimeState,
): CombatResult {
  const { red, blue, events, log } = state
  const remainingHealth = {
    red: round(red.health),
    blue: round(blue.health),
  }
  const damage = {
    red: round(red.maxHealth - red.health),
    blue: round(blue.maxHealth - blue.health),
  }
  const redDestroyed = isBotDestroyed(red)
  const blueDestroyed = isBotDestroyed(blue)
  const hardCapped = !redDestroyed && !blueDestroyed && state.elapsedTicks >= HARD_MAX_COMBAT_TICKS
  const noDamageStalemate = damage.red === 0 && damage.blue === 0
  let winner: TeamRole | 'draw' = 'draw'
  let reason = state.stoppedByNoDamage
    ? 'No bot took damage for a full minute; the round ended as a draw.'
    : hardCapped
      ? 'Both bots survived the hard combat safety cap with equivalent combat score.'
    : 'Both bots survived with equivalent combat score.'

  if (redDestroyed && blueDestroyed) {
    winner = damage.blue > damage.red ? 'red' : damage.red > damage.blue ? 'blue' : 'draw'
    reason = winner === 'draw'
      ? 'Both bots were knocked out with equal damage.'
      : 'Both bots were knocked out; damage dealt decided the result.'
  } else if (blueDestroyed) {
    winner = 'red'
    reason = 'Blue was knocked out.'
  } else if (redDestroyed) {
    winner = 'blue'
    reason = 'Red was knocked out.'
  } else if (noDamageStalemate) {
    winner = 'draw'
    reason = state.stoppedByNoDamage
      ? 'No bot took damage for a full minute; the round ended as a draw.'
      : 'Neither bot dealt damage.'
  } else if (remainingHealth.red !== remainingHealth.blue) {
    winner = remainingHealth.red > remainingHealth.blue ? 'red' : 'blue'
    reason = state.stoppedByNoDamage
      ? 'No bot took damage for a full minute; remaining health decided the result.'
      : hardCapped
        ? 'Both bots survived the hard combat safety cap; remaining health decided the result.'
      : 'Both bots survived; remaining health decided the result.'
  }

  log.push(`Round ${input.round}: ${reason}`)
  log.push(`Red damage taken: ${damage.red}. Blue damage taken: ${damage.blue}.`)

  const lastEventTime = events.reduce((latest, event) => Math.max(latest, event.t), 0)
  const replayDuration = state.stoppedByNoDamage || hardCapped
    ? Math.min(
        HARD_MAX_COMBAT_TICKS + REPLAY_TRAILING_SECONDS,
        Math.max(state.elapsedTicks, round(lastEventTime + REPLAY_TRAILING_SECONDS)),
      )
    : Math.max(MIN_REPLAY_DURATION, round(lastEventTime + REPLAY_TRAILING_SECONDS))

  return {
    winner,
    reason,
    damage,
    remainingHealth,
    partHealth: {
      red: partHealthByBlock(red.parts),
      blue: partHealthByBlock(blue.parts),
    },
    stats: {
      red: red.stats,
      blue: blue.stats,
    },
    replay: createReplayTimeline({
      round: input.round,
      duration: replayDuration,
      events,
      summary: reason,
    }),
    log,
  }
}

function partialReplayDuration(events: ReplayEvent[], elapsedTicks: number): number {
  const lastEventTime = events.reduce((latest, event) => Math.max(latest, event.t), 0)

  return Math.max(MIN_REPLAY_DURATION, elapsedTicks, round(lastEventTime + REPLAY_TRAILING_SECONDS))
}
