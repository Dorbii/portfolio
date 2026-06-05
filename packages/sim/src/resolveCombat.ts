import {
  createReplayTimeline,
  type ReplayEvent,
  type ReplayTimeline,
} from '../../replay/src/index.js'
import type {
  ArenaConfig,
  BotBlueprint,
  MovementCommand,
  NormalizedBotTactics,
  OpeningScript,
  PartCategory,
  PartBehaviorSlot,
  TeamRole,
  TurnCommand,
  Vector3,
} from '../../schemas/src/index.js'
import { DEFAULT_BOT_TACTICS, getPart } from '../../catalog/src/index.js'
import { deriveBotStats, type BotStats } from './deriveStats.js'
import {
  PART_BEHAVIOR_IDS,
  type PartBehaviorId,
} from './partBehaviors.js'
import { chooseCommand, type PolicyBotState } from './policy.js'
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

export type CombatantInput = {
  role: TeamRole
  blueprint: BotBlueprint
  tactics: NormalizedBotTactics
  openingScript: OpeningScript
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

type BotRuntime = {
  role: TeamRole
  stats: BotStats
  parts: RuntimePart[]
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
  behaviorId?: PartBehaviorId
  behaviorSlot?: PartBehaviorSlot
  position: Vector3
  health: number
  maxHealth: number
}

type PartDamageHit = {
  blockId: string
  partId: string
  remainingHealth: number
  maxHealth: number
  broke: boolean
  position: Vector3
}

type WeaponSlot = 'weaponA' | 'weaponB'

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

const DEFAULT_ARENA: ArenaConfig = {
  name: 'Compact Box',
  width: 24,
  height: 16,
  activeHazards: ['floor_saw'],
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function distance(left: Vector3, right: Vector3): number {
  return Math.hypot(left[0] - right[0], left[2] - right[2])
}

function weaponReach(bot: BotRuntime): number {
  return 1.6 + bot.stats.control / 16 + bot.stats.weaponThreat / 28 + weaponReachBonus(bot)
}

function createRuntimeParts(blueprint: BotBlueprint, stats: BotStats): RuntimePart[] {
  const rawParts = blueprint.blocks.map((block) => {
    const part = getPart(block.partId)
    const behaviorId = knownBehaviorId(part?.behavior?.id)

    return {
      block,
      category: part?.category ?? 'body',
      durability: Math.max(1, part?.durability ?? 1),
      hasUtilityControl: Boolean(part?.controls?.utility),
      hasWeaponControl: Boolean(part?.controls?.weapon),
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
function countAliveWeaponSlots(parts: RuntimePart[]): number {
  return Math.min(
    WEAPON_SLOTS.length,
    parts.filter((part) => part.hasWeaponControl && part.health > 0).length,
  )
}

function updateRuntimeControlState(bot: BotRuntime): void {
  bot.weaponSlotCount = countAliveWeaponSlots(bot.parts)
  bot.hasWeaponControl = bot.weaponSlotCount > 0
  bot.hasUtilityControl = bot.parts.some(
    (part) => part.hasUtilityControl && part.health > 0,
  )
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
  return bot.parts.filter((part) => part.hasWeaponControl && part.health > 0)
}

function aliveBehaviorParts(
  bot: BotRuntime,
  slot: PartBehaviorSlot,
  ids?: readonly PartBehaviorId[],
): RuntimePart[] {
  return bot.parts.filter((part) => (
    part.health > 0 &&
    part.behaviorSlot === slot &&
    part.behaviorId !== undefined &&
    (ids === undefined || ids.includes(part.behaviorId))
  ))
}

function hasAliveBehavior(bot: BotRuntime, id: PartBehaviorId): boolean {
  return bot.parts.some((part) => part.health > 0 && part.behaviorId === id)
}

function firstAliveBehaviorPart(
  bot: BotRuntime,
  ids: readonly PartBehaviorId[],
): RuntimePart | undefined {
  return bot.parts.find((part) => (
    part.health > 0 &&
    part.behaviorId !== undefined &&
    ids.includes(part.behaviorId)
  ))
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

  bot.statuses = addRuntimeStatus(bot.statuses, {
    id,
    sourceKey,
    appliedTick: tick,
    expiresAtTick: runtimeStatusExpiresAtTick(tick, STATUS_DURATIONS[id]),
  })
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
  const alive = bot.parts.filter((part) => part.health > 0)
  const priorities: PartCategory[] = cause === 'ram'
    ? ['defense', 'mobility', 'weapon', 'utility', 'style', 'body']
    : cause === 'hazard'
      ? ['mobility', 'defense', 'utility', 'weapon', 'style', 'body']
      : cause === 'drone'
        ? ['utility', 'weapon', 'mobility', 'defense', 'style', 'body']
        : ['defense', 'weapon', 'mobility', 'utility', 'style', 'body']
  const categoryRank = new Map(priorities.map((category, index) => [category, index]))

  return alive.sort((left, right) => {
    const rankDelta = (categoryRank.get(left.category) ?? 99) - (categoryRank.get(right.category) ?? 99)

    if (rankDelta !== 0) {
      return rankDelta
    }

    if (left.health !== right.health) {
      return left.health - right.health
    }

    return stablePartOrder(left, tick) - stablePartOrder(right, tick)
  })
}

function stablePartOrder(part: RuntimePart, tick: number): number {
  let hash = tick

  for (let index = 0; index < part.blockId.length; index += 1) {
    hash = (hash * 33 + part.blockId.charCodeAt(index)) >>> 0
  }

  return hash
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
      remainingHealth: part.health,
      maxHealth: part.maxHealth,
      broke: before > 0 && part.health <= 0,
      position: partWorldPosition(bot, part),
    })
  }

  bot.health = round(sumPartHealth(bot.parts))

  return hits
}

function emitPartDetachEvents(
  events: ReplayEvent[],
  tick: number,
  bot: BotRuntime,
  hits: PartDamageHit[],
  startTime = tick + 0.36,
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

  return clampPosition([x, 0, z], arena)
}

function positionsEqual(left: Vector3, right: Vector3): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2]
}

function clampPosition(position: Vector3, arena: ArenaConfig): Vector3 {
  const xLimit = Math.max(1, arena.width / 2 - 0.85)
  const zLimit = Math.max(1, arena.height / 2 - 0.85)

  return [
    round(Math.min(Math.max(position[0], -xLimit), xLimit)),
    0,
    round(Math.min(Math.max(position[2], -zLimit), zLimit)),
  ]
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
  const to = clampPosition([
    from[0] + (point[0] - from[0]) * ratio,
    0,
    from[2] + (point[2] - from[2]) * ratio,
  ], arena)

  if (positionsEqual(from, to)) {
    return
  }

  bot.position = to
  events.push({ t: tick + 0.22, type: 'move', bot: bot.role, from, to })
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

  events.push({
    t: tick + 0.25,
    type: 'impact',
    attacker: attacker.role,
    defender: defender.role,
    damage: mitigated,
    position: [
      round((attacker.position[0] + defender.position[0]) / 2),
      0,
      round((attacker.position[2] + defender.position[2]) / 2),
    ],
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
  emitPartDetachEvents(events, tick, defender, hits)

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
  const weaponParts = aliveWeaponControlParts(attacker)
  const firingSlots = WEAPON_SLOTS.flatMap((slot, index) => {
    const part = weaponParts[index]

    return part && command[slot] === 'fire' ? [{ slot, part }] : []
  })

  if (firingSlots.length === 0) {
    return
  }

  const inRange = distance(attacker.position, defender.position) <= weaponReach(attacker)

  for (const { slot, part } of firingSlots) {
    const isNet = part.behaviorId === 'net'

    events.push({
      t: weaponFireTime(tick, slot),
      type: 'weapon_fire',
      bot: attacker.role,
      weaponSlot: slot,
      controlCue: isNet ? 'deploy' : undefined,
      targetPosition: isNet ? defender.position : undefined,
    })

    if (!inRange) {
      continue
    }

    applyDamage(events, tick, attacker, defender, weaponSlotDamage(attacker, nextRandom()), 'weapon')
    applyWeaponBehavior(events, tick, arena, attacker, defender, part)
  }
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

function resolveHazard(
  events: ReplayEvent[],
  tick: number,
  arena: ArenaConfig,
  bot: BotRuntime,
): void {
  if (!arena.activeHazards.includes('floor_saw')) {
    return
  }

  const nearCenter = Math.abs(bot.position[0]) < 1.2 && Math.abs(bot.position[2]) < 1.2

  if (!nearCenter) {
    return
  }

  const damage = Math.max(1, Math.round(6 - bot.stats.stability * 0.12))
  const wasAlive = !isBotDestroyed(bot)
  const hits = applyPartDamage(bot, damage, tick, 'hazard')
  const primaryHit = hits[0]

  bot.lastDamagedTick = tick
  events.push({
    t: tick + 0.35,
    type: 'hazard',
    hazard: 'floor_saw',
    bot: bot.role,
    damage,
    position: bot.position,
  })
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
  emitPartDetachEvents(events, tick, bot, hits, tick + 0.44)

  if (wasAlive && isBotDestroyed(bot)) {
    events.push({
      t: tick + 0.52,
      type: 'knockout',
      bot: bot.role,
      cause: 'hazard',
    })
  }
}

export function resolveCombat(input: ResolveCombatInput): CombatResult {
  const arena = input.arena ?? DEFAULT_ARENA
  const rng = createSeededRng(`${input.seed}:${input.round}`)
  const redStats = deriveBotStats(input.red.blueprint)
  const blueStats = deriveBotStats(input.blue.blueprint)
  const redParts = createRuntimeParts(input.red.blueprint, redStats)
  const blueParts = createRuntimeParts(input.blue.blueprint, blueStats)
  const redWeaponSlotCount = countAliveWeaponSlots(redParts)
  const blueWeaponSlotCount = countAliveWeaponSlots(blueParts)
  const red: BotRuntime = {
    role: 'red',
    stats: redStats,
    parts: redParts,
    health: sumPartHealth(redParts),
    maxHealth: sumPartHealth(redParts),
    hasUtilityControl: redParts.some((part) => part.hasUtilityControl && part.health > 0),
    hasWeaponControl: redWeaponSlotCount > 0,
    weaponSlotCount: redWeaponSlotCount,
    position: [-6, 0, 0],
    statuses: [],
    cooldowns: {},
    charges: createInitialCharges(redParts),
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity,
  }
  const blue: BotRuntime = {
    role: 'blue',
    stats: blueStats,
    parts: blueParts,
    health: sumPartHealth(blueParts),
    maxHealth: sumPartHealth(blueParts),
    hasUtilityControl: blueParts.some((part) => part.hasUtilityControl && part.health > 0),
    hasWeaponControl: blueWeaponSlotCount > 0,
    weaponSlotCount: blueWeaponSlotCount,
    position: [6, 0, 0],
    statuses: [],
    cooldowns: {},
    charges: createInitialCharges(blueParts),
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity,
  }

  const events: ReplayEvent[] = [
    { t: 0, type: 'spawn', bot: 'red', position: red.position, rotation: [0, 90, 0] },
    { t: 0, type: 'spawn', bot: 'blue', position: blue.position, rotation: [0, -90, 0] },
  ]
  const log: string[] = []
  let elapsedTicks = 0
  let lastDamageTick = 0
  let stoppedByNoDamage = false

  for (let tick = 1; tick <= HARD_MAX_COMBAT_TICKS; tick += 1) {
    elapsedTicks = tick
    advanceRuntimeEffects(red, tick)
    advanceRuntimeEffects(blue, tick)

    const redCommand = chooseCommand(
      {
        tactics: input.red.tactics ?? DEFAULT_BOT_TACTICS,
        openingScript: input.red.openingScript,
      },
      tick,
      { bot: policyStateFor(red), opponent: policyStateFor(blue), arena },
    )
    const blueCommand = chooseCommand(
      {
        tactics: input.blue.tactics ?? DEFAULT_BOT_TACTICS,
        openingScript: input.blue.openingScript,
      },
      tick,
      { bot: policyStateFor(blue), opponent: policyStateFor(red), arena },
    )
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
      events.push({ t: tick, type: 'move', bot: 'red', from: redFrom, to: red.position })
    }
    if (!positionsEqual(blueFrom, blue.position)) {
      events.push({ t: tick, type: 'move', bot: 'blue', from: blueFrom, to: blue.position })
    }

    resolveWeapons(events, tick, arena, red, blue, redCommand, rng)
    resolveWeapons(events, tick, arena, blue, red, blueCommand, rng)
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

    resolveHazard(events, tick, arena, red)
    resolveHazard(events, tick, arena, blue)

    if (red.health + blue.health < healthBeforeTick) {
      lastDamageTick = tick
    }

    if (isBotDestroyed(red) || isBotDestroyed(blue)) {
      break
    }

    if (tick - lastDamageTick >= NO_DAMAGE_STALEMATE_TICKS) {
      stoppedByNoDamage = true
      break
    }
  }

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
  const hardCapped = !redDestroyed && !blueDestroyed && elapsedTicks >= HARD_MAX_COMBAT_TICKS
  const noDamageStalemate = damage.red === 0 && damage.blue === 0
  let winner: TeamRole | 'draw' = 'draw'
  let reason = stoppedByNoDamage
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
    reason = stoppedByNoDamage
      ? 'No bot took damage for a full minute; the round ended as a draw.'
      : 'Neither bot dealt damage.'
  } else if (remainingHealth.red !== remainingHealth.blue) {
    winner = remainingHealth.red > remainingHealth.blue ? 'red' : 'blue'
    reason = stoppedByNoDamage
      ? 'No bot took damage for a full minute; remaining health decided the result.'
      : hardCapped
        ? 'Both bots survived the hard combat safety cap; remaining health decided the result.'
      : 'Both bots survived; remaining health decided the result.'
  }

  log.push(`Round ${input.round}: ${reason}`)
  log.push(`Red damage taken: ${damage.red}. Blue damage taken: ${damage.blue}.`)

  const lastEventTime = events.reduce((latest, event) => Math.max(latest, event.t), 0)
  const replayDuration = stoppedByNoDamage || hardCapped
    ? elapsedTicks
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
