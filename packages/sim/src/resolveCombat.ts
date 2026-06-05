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
  TeamRole,
  TurnCommand,
  Vector3,
} from '../../schemas/src/index.js'
import { DEFAULT_BOT_TACTICS, getPart } from '../../catalog/src/index.js'
import { deriveBotStats, type BotStats } from './deriveStats.js'
import { chooseCommand } from './policy.js'
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
  weaponSlotCount: number
  position: Vector3
  lastDamagedTick: number
  lastDealtDamageTick: number
  lastMove?: MovementCommand
}

type RuntimePart = {
  blockId: string
  partId: string
  category: PartCategory
  hasWeaponControl: boolean
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
      hasWeaponControl: Boolean(getPart(block.partId)?.controls?.weapon),
      position: [...block.position],
      health: maxHealth,
      maxHealth,
    }
  })
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

function updateWeaponSlotState(bot: BotRuntime): void {
  bot.weaponSlotCount = countAliveWeaponSlots(bot.parts)
  bot.hasWeaponControl = bot.weaponSlotCount > 0
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

// CODEX_INTENT: resolve each fired weapon slot independently while preserving replay slot identity.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
function resolveWeapons(
  events: ReplayEvent[],
  tick: number,
  attacker: BotRuntime,
  defender: BotRuntime,
  command: TurnCommand,
  nextRandom: () => number,
): void {
  const firingSlots = WEAPON_SLOTS.filter(
    (slot, index) => index < attacker.weaponSlotCount && command[slot] === 'fire',
  )

  if (firingSlots.length === 0) {
    return
  }

  const inRange = distance(attacker.position, defender.position) <= weaponReach(attacker)

  for (const slot of firingSlots) {
    events.push({
      t: weaponFireTime(tick, slot),
      type: 'weapon_fire',
      bot: attacker.role,
      weaponSlot: slot,
    })

    if (!inRange) {
      continue
    }

    applyDamage(events, tick, attacker, defender, weaponSlotDamage(attacker, nextRandom()), 'weapon')
  }
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
    hasUtilityControl: hasControlledPart(input.red.blueprint, 'utility'),
    hasWeaponControl: redWeaponSlotCount > 0,
    weaponSlotCount: redWeaponSlotCount,
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
    hasWeaponControl: blueWeaponSlotCount > 0,
    weaponSlotCount: blueWeaponSlotCount,
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
    updateWeaponSlotState(red)
    updateWeaponSlotState(blue)

    const redCommand = chooseCommand(
      {
        tactics: input.red.tactics ?? DEFAULT_BOT_TACTICS,
        openingScript: input.red.openingScript,
      },
      tick,
      { bot: red, opponent: blue, arena },
    )
    const blueCommand = chooseCommand(
      {
        tactics: input.blue.tactics ?? DEFAULT_BOT_TACTICS,
        openingScript: input.blue.openingScript,
      },
      tick,
      { bot: blue, opponent: red, arena },
    )
    const redFrom = red.position
    const blueFrom = blue.position
    const healthBeforeTick = red.health + blue.health

    red.lastMove = redCommand.move
    blue.lastMove = blueCommand.move

    red.position = moveBot(red, redCommand, arena)
    blue.position = moveBot(blue, blueCommand, arena)

    if (!positionsEqual(redFrom, red.position)) {
      events.push({ t: tick, type: 'move', bot: 'red', from: redFrom, to: red.position })
    }
    if (!positionsEqual(blueFrom, blue.position)) {
      events.push({ t: tick, type: 'move', bot: 'blue', from: blueFrom, to: blue.position })
    }

    resolveWeapons(events, tick, red, blue, redCommand, rng)
    resolveWeapons(events, tick, blue, red, blueCommand, rng)

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
