import {
  createReplayTimeline,
  type ReplayEvent,
  type ReplayTimeline,
} from '../../replay/src/index.js'
import type {
  ArenaConfig,
  BotBlueprint,
  NormalizedBotTactics,
  OpeningScript,
  PartCategory,
  TeamRole,
  TurnCommand,
  Vector3,
} from '../../schemas/src/index.js'
import { getPart } from '../../catalog/src/index.js'
import { deriveBotStats, type BotStats } from './deriveStats.js'
import { createSeededRng } from './seededRng.js'

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
  position: Vector3
  lastDamagedTick: number
  lastDealtDamageTick: number
}

type RuntimePart = {
  blockId: string
  partId: string
  category: PartCategory
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

const NO_DAMAGE_STALEMATE_TICKS = 60
const HARD_MAX_COMBAT_TICKS = 600
const MIN_REPLAY_DURATION = 6
const REPLAY_TRAILING_SECONDS = 1
const CONTACT_DISTANCE = 1.28

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
  return 1.6 + bot.stats.control / 16 + bot.stats.weaponThreat / 28
}

function isRunAndGunBot(bot: BotRuntime, opponent: BotRuntime): boolean {
  return (
    bot.hasWeaponControl &&
    bot.stats.mobility >= 10 &&
    bot.stats.control >= 4 &&
    bot.stats.mobility >= opponent.stats.mobility + 2
  )
}

function commandAt(
  plan: OpeningScript,
  tick: number,
  bot: BotRuntime,
  opponent: BotRuntime,
  arena: ArenaConfig,
): TurnCommand {
  const planned = plan.commands.find((command) => command.tick === tick)

  if (planned) {
    return planned
  }

  return fallbackCommand(tick, bot, opponent, arena)
}

function fallbackCommand(
  tick: number,
  bot: BotRuntime,
  opponent: BotRuntime,
  arena: ArenaConfig,
): TurnCommand {
  const gap = distance(bot.position, opponent.position)
  const reach = weaponReach(bot)
  const recentlyDamaged = tick - bot.lastDamagedTick <= 3
  const recentlyScored = tick - bot.lastDealtDamageTick <= 4
  const healthRatio = bot.health / bot.maxHealth
  const runAndGun = isRunAndGunBot(bot, opponent)
  const pressure = pressureScore(bot, opponent)
  const wantsRange =
    runAndGun ||
    healthRatio < 0.28 ||
    (recentlyDamaged && !recentlyScored && pressure < 1.05)
  const idealRange = runAndGun
    ? Math.max(2.7, reach * 0.95)
    : wantsRange
      ? Math.max(2.2, reach * 0.78)
      : Math.max(CONTACT_DISTANCE * 0.82, reach * 0.5)
  const inCenterHazard = centerHazardActive(arena) && isNearCenterHazard(bot.position, 1.55)
  const command: TurnCommand = {
    tick,
    move: chooseFallbackMove({
      tick,
      bot,
      opponent,
      arena,
      gap,
      idealRange,
      inCenterHazard,
      pressure,
      recentlyDamaged,
      recentlyScored,
      runAndGun,
      wantsRange,
    }),
  }

  if (bot.hasWeaponControl) {
    command.weaponA = gap <= reach * (runAndGun ? 1.22 : 1.14)
      ? 'fire'
      : 'hold'
  }

  if (
    bot.hasUtilityControl &&
    (inCenterHazard || gap < reach * 1.2 || (runAndGun && tick % 3 === 0))
  ) {
    command.utility = 'activate'
  }

  return command
}

function chooseFallbackMove({
  tick,
  bot,
  opponent,
  arena,
  gap,
  idealRange,
  inCenterHazard,
  pressure,
  recentlyDamaged,
  recentlyScored,
  runAndGun,
  wantsRange,
}: {
  tick: number
  bot: BotRuntime
  opponent: BotRuntime
  arena: ArenaConfig
  gap: number
  idealRange: number
  inCenterHazard: boolean
  pressure: number
  recentlyDamaged: boolean
  recentlyScored: boolean
  runAndGun: boolean
  wantsRange: boolean
}): TurnCommand['move'] {
  if (bot.stats.mobility <= 0) {
    return 'brake'
  }

  if (inCenterHazard) {
    return moveAwayFromPoint(bot, [0, 0, 0], tick)
  }

  if (runAndGun) {
    return runAndGunMove({ tick, bot, opponent, gap, idealRange })
  }

  if (recentlyDamaged && !recentlyScored && gap < idealRange * 1.2) {
    return evadeMove(bot, opponent, arena, tick)
  }

  if (wantsRange && gap < idealRange) {
    return evadeMove(bot, opponent, arena, tick)
  }

  if (!wantsRange && centerHazardActive(arena) && gap < 2.45 && !isNearCenterHazard(opponent.position, 1.25)) {
    const shoveTarget: Vector3 = [0, 0, 0]

    return closeMove(bot, shoveTarget, tick, true)
  }

  if (gap > idealRange * 1.55) {
    return closeMove(bot, opponent.position, tick, pressure >= 0.92)
  }

  if (gap > idealRange) {
    return tick % 3 === 0
      ? flankingMove(bot, opponent, tick)
      : closeMove(bot, opponent.position, tick, pressure >= 1)
  }

  if (gap <= CONTACT_DISTANCE * 1.15 && pressure >= 0.95) {
    return tick % 4 === 0 ? 'dash_forward' : flankingMove(bot, opponent, tick)
  }

  if (bot.hasWeaponControl && gap <= weaponReach(bot) * 1.05) {
    return tick % 2 === 0 ? flankingMove(bot, opponent, tick) : 'forward'
  }

  if (wantsRange && gap <= idealRange * 1.35) {
    return lateralMove(bot, opponent, tick)
  }

  return closeMove(bot, opponent.position, tick, pressure >= 1.08)
}

function runAndGunMove({
  tick,
  bot,
  opponent,
  gap,
  idealRange,
}: {
  tick: number
  bot: BotRuntime
  opponent: BotRuntime
  gap: number
  idealRange: number
}): TurnCommand['move'] {
  if (gap < idealRange * 0.72) {
    return 'dash_backward'
  }

  if (gap > idealRange * 1.45) {
    return 'dash_forward'
  }

  if (gap < idealRange * 0.95) {
    return tick % 2 === 0 ? 'strafe_right' : 'strafe_left'
  }

  const side = bot.position[2] - opponent.position[2]

  if (Math.abs(side) < 0.8) {
    return tick % 2 === 0 ? 'circle_right' : 'circle_left'
  }

  return side > 0 ? 'circle_left' : 'circle_right'
}

function centerHazardActive(arena: ArenaConfig): boolean {
  return arena.activeHazards.some((hazard) => hazard.toLowerCase().includes('saw'))
}

function pressureScore(bot: BotRuntime, opponent: BotRuntime): number {
  const offense =
    bot.stats.weaponThreat * 1.15 +
    bot.stats.stability * 0.36 +
    bot.stats.mass * 0.18 +
    bot.stats.mobility * 0.18
  const opponentDefense =
    opponent.stats.armor * 0.55 +
    opponent.stats.stability * 0.24 +
    opponent.stats.mobility * 0.12

  return offense / Math.max(1, opponentDefense)
}

function isNearCenterHazard(position: Vector3, radius: number): boolean {
  return Math.abs(position[0]) < radius && Math.abs(position[2]) < radius
}

function hasControlledPart(blueprint: BotBlueprint, control: 'utility' | 'weapon'): boolean {
  return blueprint.blocks.some((block) => Boolean(getPart(block.partId)?.controls?.[control]))
}

function createRuntimeParts(blueprint: BotBlueprint, stats: BotStats): RuntimePart[] {
  const rawParts = blueprint.blocks.map((block) => {
    const part = getPart(block.partId)

    return {
      block,
      category: part?.category ?? 'body',
      durability: Math.max(1, part?.durability ?? 1),
    }
  })
  const rawTotal = rawParts.reduce((total, part) => total + part.durability, 0)
  const healthScale = stats.durability / Math.max(1, rawTotal)

  return rawParts.map(({ block, category, durability }) => {
    const maxHealth = round(Math.max(1, durability * healthScale))

    return {
      blockId: block.id,
      partId: block.partId,
      category,
      position: [...block.position],
      health: maxHealth,
      maxHealth,
    }
  })
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

function orderedDamageTargets(bot: BotRuntime, cause: string, tick: number): RuntimePart[] {
  const alive = bot.parts.filter((part) => part.health > 0)
  const priorities: PartCategory[] = cause === 'ram'
    ? ['defense', 'mobility', 'weapon', 'utility', 'style', 'body']
    : cause === 'hazard'
      ? ['mobility', 'defense', 'utility', 'weapon', 'style', 'body']
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

function evadeMove(
  bot: BotRuntime,
  opponent: BotRuntime,
  arena: ArenaConfig,
  tick: number,
): TurnCommand['move'] {
  if (centerHazardActive(arena) && !isNearCenterHazard(opponent.position, 1.35)) {
    const lurePoint: Vector3 = [0, 0, tick % 2 === 0 ? 1 : -1]

    return moveTowardPoint(bot, lurePoint)
  }

  return moveAwayFromPoint(bot, opponent.position, tick)
}

function moveTowardPoint(bot: BotRuntime, point: Vector3): TurnCommand['move'] {
  const zDelta = point[2] - bot.position[2]

  if (Math.abs(zDelta) > 0.7) {
    return zDelta < 0 ? 'turn_left' : 'turn_right'
  }

  const roleDirection = bot.role === 'red' ? 1 : -1
  const forwardDelta = (point[0] - bot.position[0]) * roleDirection

  return forwardDelta >= -0.35 ? 'forward' : 'backward'
}

function closeMove(
  bot: BotRuntime,
  point: Vector3,
  tick: number,
  urgent: boolean,
): TurnCommand['move'] {
  const move = moveTowardPoint(bot, point)

  if (move === 'forward' && urgent && bot.stats.mobility >= 5) {
    return 'dash_forward'
  }

  if (move === 'forward' && tick % 5 === 0 && bot.stats.mobility >= 8) {
    return 'dash_forward'
  }

  return move
}

function moveAwayFromPoint(
  bot: BotRuntime,
  point: Vector3,
  tick: number,
): TurnCommand['move'] {
  const awayPoint: Vector3 = [
    bot.position[0] + (bot.position[0] - point[0]),
    0,
    bot.position[2] + (bot.position[2] - point[2] || (tick % 2 === 0 ? 1 : -1)),
  ]

  return moveTowardPoint(bot, awayPoint)
}

function lateralMove(
  bot: BotRuntime,
  opponent: BotRuntime,
  tick: number,
): TurnCommand['move'] {
  const preferred = bot.role === 'red' ? -1 : 1
  const currentSide = bot.position[2] - opponent.position[2]

  if (Math.abs(currentSide) < 1.4) {
    return (tick + (preferred > 0 ? 0 : 1)) % 2 === 0 ? 'turn_right' : 'turn_left'
  }

  return currentSide > 0 ? 'turn_left' : 'turn_right'
}

function flankingMove(
  bot: BotRuntime,
  opponent: BotRuntime,
  tick: number,
): TurnCommand['move'] {
  const side = bot.position[2] - opponent.position[2]

  if (Math.abs(side) < 0.85) {
    return tick % 2 === 0 ? 'circle_right' : 'circle_left'
  }

  if (Math.abs(side) > 2.2 && tick % 3 === 0) {
    return moveTowardPoint(bot, opponent.position)
  }

  return side > 0 ? 'circle_left' : 'circle_right'
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

function moveBot(bot: BotRuntime, command: TurnCommand, arena: ArenaConfig): Vector3 {
  if (bot.stats.mobility <= 0) {
    return bot.position
  }

  const utilityBoost = command.utility === 'activate' && bot.hasUtilityControl ? 1.28 : 1
  const speed = Math.max(0.2, Math.min(2.75, 0.45 + bot.stats.mobility / 18)) * utilityBoost
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

  const xLimit = Math.max(1, arena.width / 2 - 0.85)
  const zLimit = Math.max(1, arena.height / 2 - 0.85)

  return [
    round(Math.min(Math.max(x, -xLimit), xLimit)),
    0,
    round(Math.min(Math.max(z, -zLimit), zLimit)),
  ]
}

function positionsEqual(left: Vector3, right: Vector3): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2]
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
  const mitigated = Math.max(1, Math.round(baseDamage - defender.stats.armor * 0.35))
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

function resolveWeapon(
  events: ReplayEvent[],
  tick: number,
  attacker: BotRuntime,
  defender: BotRuntime,
  command: TurnCommand,
  random: number,
): void {
  if (command.weaponA !== 'fire' && command.weaponB !== 'fire') {
    return
  }

  const slot = command.weaponA === 'fire' ? 'weaponA' : 'weaponB'
  events.push({ t: tick + 0.1, type: 'weapon_fire', bot: attacker.role, weaponSlot: slot })

  if (distance(attacker.position, defender.position) > weaponReach(attacker)) {
    return
  }

  const damage =
    3 + attacker.stats.weaponThreat * 0.8 + attacker.stats.control * 0.2 + random * 5

  applyDamage(events, tick, attacker, defender, damage, 'weapon')
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
  const red: BotRuntime = {
    role: 'red',
    stats: redStats,
    parts: redParts,
    health: sumPartHealth(redParts),
    maxHealth: sumPartHealth(redParts),
    hasUtilityControl: hasControlledPart(input.red.blueprint, 'utility'),
    hasWeaponControl: hasControlledPart(input.red.blueprint, 'weapon'),
    position: [-6, 0, 0],
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity,
  }
  const blue: BotRuntime = {
    role: 'blue',
    stats: blueStats,
    parts: blueParts,
    health: sumPartHealth(blueParts),
    maxHealth: sumPartHealth(blueParts),
    hasUtilityControl: hasControlledPart(input.blue.blueprint, 'utility'),
    hasWeaponControl: hasControlledPart(input.blue.blueprint, 'weapon'),
    position: [6, 0, 0],
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
    const redCommand = commandAt(input.red.openingScript, tick, red, blue, arena)
    const blueCommand = commandAt(input.blue.openingScript, tick, blue, red, arena)
    const redFrom = red.position
    const blueFrom = blue.position
    const healthBeforeTick = red.health + blue.health

    red.position = moveBot(red, redCommand, arena)
    blue.position = moveBot(blue, blueCommand, arena)

    if (!positionsEqual(redFrom, red.position)) {
      events.push({ t: tick, type: 'move', bot: 'red', from: redFrom, to: red.position })
    }
    if (!positionsEqual(blueFrom, blue.position)) {
      events.push({ t: tick, type: 'move', bot: 'blue', from: blueFrom, to: blue.position })
    }

    const weaponRandom = rng()

    resolveWeapon(events, tick, red, blue, redCommand, weaponRandom)
    resolveWeapon(events, tick, blue, red, blueCommand, weaponRandom)

    if (
      distance(red.position, blue.position) < CONTACT_DISTANCE &&
      (isContactMove(redCommand) || isContactMove(blueCommand))
    ) {
      const redRamDamage =
        (red.stats.mass / 7 + red.stats.stability / 3) * movementImpactMultiplier(redCommand)
      const blueRamDamage =
        (blue.stats.mass / 7 + blue.stats.stability / 3) * movementImpactMultiplier(blueCommand)

      if (redRamDamage > 0) {
        applyDamage(events, tick, red, blue, redRamDamage, 'ram')
      }
      if (blueRamDamage > 0) {
        applyDamage(events, tick, blue, red, blueRamDamage, 'ram')
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
