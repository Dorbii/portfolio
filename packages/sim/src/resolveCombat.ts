import {
  createReplayTimeline,
  type ReplayEvent,
  type ReplayTimeline,
} from '../../replay/src/index.js'
import type {
  ArenaConfig,
  BotBlueprint,
  TeamRole,
  TurnCommand,
  TurnPlan,
  Vector3,
} from '../../schemas/src/index.js'
import { getPart } from '../../catalog/src/index.js'
import { deriveBotStats, type BotStats } from './deriveStats.js'
import { createSeededRng } from './seededRng.js'

export type CombatantInput = {
  role: TeamRole
  blueprint: BotBlueprint
  turnPlan: TurnPlan
}

export type CombatResult = {
  winner: TeamRole | 'draw'
  reason: string
  damage: Record<TeamRole, number>
  remainingHealth: Record<TeamRole, number>
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
  health: number
  maxHealth: number
  hasUtilityControl: boolean
  hasWeaponControl: boolean
  position: Vector3
  lastDamagedTick: number
  lastDealtDamageTick: number
}

const OPENING_TICKS = 5
const NO_DAMAGE_STALEMATE_TICKS = 60
const HARD_MAX_COMBAT_TICKS = 600
const MIN_REPLAY_DURATION = OPENING_TICKS + 1
const REPLAY_TRAILING_SECONDS = 1
const CONTACT_DISTANCE = 1.1

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

function commandAt(
  plan: TurnPlan,
  tick: number,
  bot: BotRuntime,
  opponent: BotRuntime,
  arena: ArenaConfig,
): TurnCommand {
  const planned = plan.commands.find((command) => command.tick === tick)

  if (planned) {
    return planned
  }

  if (tick <= OPENING_TICKS) {
    return { tick, move: 'brake' }
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
  const recentlyDamaged = tick - bot.lastDamagedTick <= 4
  const healthRatio = bot.health / bot.maxHealth
  const wantsRange =
    bot.stats.control >= bot.stats.weaponThreat * 0.55 ||
    bot.stats.mobility > opponent.stats.mobility + 3 ||
    healthRatio < 0.34 ||
    recentlyDamaged
  const idealRange = wantsRange ? Math.max(2.4, reach * 0.82) : Math.max(0.9, reach * 0.42)
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
      recentlyDamaged,
      wantsRange,
    }),
  }

  if (bot.hasWeaponControl) {
    command.weaponA = gap <= reach * 1.08
      ? 'fire'
      : 'hold'
  }

  if (bot.hasUtilityControl && inCenterHazard) {
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
  recentlyDamaged,
  wantsRange,
}: {
  tick: number
  bot: BotRuntime
  opponent: BotRuntime
  arena: ArenaConfig
  gap: number
  idealRange: number
  inCenterHazard: boolean
  recentlyDamaged: boolean
  wantsRange: boolean
}): TurnCommand['move'] {
  if (bot.stats.mobility <= 0) {
    return 'brake'
  }

  if (inCenterHazard) {
    return moveAwayFromPoint(bot, [0, 0, 0], tick)
  }

  if (recentlyDamaged && gap < idealRange * 1.35) {
    return evadeMove(bot, opponent, arena, tick)
  }

  if (wantsRange && gap < idealRange) {
    return evadeMove(bot, opponent, arena, tick)
  }

  if (!wantsRange && centerHazardActive(arena) && gap < 2.2 && !isNearCenterHazard(opponent.position, 1.25)) {
    const shoveTarget: Vector3 = [0, 0, 0]

    return moveTowardPoint(bot, shoveTarget)
  }

  if (wantsRange && gap <= idealRange * 1.35) {
    return lateralMove(bot, opponent, tick)
  }

  return moveTowardPoint(bot, opponent.position)
}

function centerHazardActive(arena: ArenaConfig): boolean {
  return arena.activeHazards.some((hazard) => hazard.toLowerCase().includes('saw'))
}

function isNearCenterHazard(position: Vector3, radius: number): boolean {
  return Math.abs(position[0]) < radius && Math.abs(position[2]) < radius
}

function hasControlledPart(blueprint: BotBlueprint, control: 'utility' | 'weapon'): boolean {
  return blueprint.blocks.some((block) => Boolean(getPart(block.partId)?.controls?.[control]))
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

function moveBot(bot: BotRuntime, command: TurnCommand, arena: ArenaConfig): Vector3 {
  if (bot.stats.mobility <= 0) {
    return bot.position
  }

  const speed = Math.max(0.2, Math.min(2.2, 0.45 + bot.stats.mobility / 18))
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
  const wasAlive = defender.health > 0
  const mitigated = Math.max(1, Math.round(baseDamage - defender.stats.armor * 0.35))
  defender.health = Math.max(0, defender.health - mitigated)
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
  })

  if (wasAlive && defender.health <= 0) {
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
  bot.health = Math.max(0, bot.health - damage)
  bot.lastDamagedTick = tick
  events.push({
    t: tick + 0.35,
    type: 'hazard',
    hazard: 'floor_saw',
    bot: bot.role,
    damage,
    position: bot.position,
  })
}

export function resolveCombat(input: ResolveCombatInput): CombatResult {
  const arena = input.arena ?? DEFAULT_ARENA
  const rng = createSeededRng(`${input.seed}:${input.round}`)
  const red: BotRuntime = {
    role: 'red',
    stats: deriveBotStats(input.red.blueprint),
    health: 0,
    maxHealth: 0,
    hasUtilityControl: hasControlledPart(input.red.blueprint, 'utility'),
    hasWeaponControl: hasControlledPart(input.red.blueprint, 'weapon'),
    position: [-6, 0, 0],
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity,
  }
  const blue: BotRuntime = {
    role: 'blue',
    stats: deriveBotStats(input.blue.blueprint),
    health: 0,
    maxHealth: 0,
    hasUtilityControl: hasControlledPart(input.blue.blueprint, 'utility'),
    hasWeaponControl: hasControlledPart(input.blue.blueprint, 'weapon'),
    position: [6, 0, 0],
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity,
  }

  red.health = red.stats.durability
  blue.health = blue.stats.durability
  red.maxHealth = red.health
  blue.maxHealth = blue.health

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
    const redCommand = commandAt(input.red.turnPlan, tick, red, blue, arena)
    const blueCommand = commandAt(input.blue.turnPlan, tick, blue, red, arena)
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

    resolveWeapon(events, tick, red, blue, redCommand, rng())
    resolveWeapon(events, tick, blue, red, blueCommand, rng())

    if (
      distance(red.position, blue.position) < CONTACT_DISTANCE &&
      (isContactMove(redCommand) || isContactMove(blueCommand))
    ) {
      applyDamage(events, tick, red, blue, red.stats.mass / 7 + red.stats.stability / 3, 'ram')
      applyDamage(events, tick, blue, red, blue.stats.mass / 7 + blue.stats.stability / 3, 'ram')
    }

    resolveHazard(events, tick, arena, red)
    resolveHazard(events, tick, arena, blue)

    if (red.health + blue.health < healthBeforeTick) {
      lastDamageTick = tick
    }

    if (red.health <= 0 || blue.health <= 0) {
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
    red: round(red.stats.durability - red.health),
    blue: round(blue.stats.durability - blue.health),
  }
  const hardCapped = red.health > 0 && blue.health > 0 && elapsedTicks >= HARD_MAX_COMBAT_TICKS
  const noDamageStalemate = damage.red === 0 && damage.blue === 0
  let winner: TeamRole | 'draw' = 'draw'
  let reason = stoppedByNoDamage
    ? 'No bot took damage for a full minute; the round ended as a draw.'
    : hardCapped
      ? 'Both bots survived the hard combat safety cap with equivalent combat score.'
    : 'Both bots survived with equivalent combat score.'

  if (red.health <= 0 && blue.health <= 0) {
    winner = damage.blue > damage.red ? 'red' : damage.red > damage.blue ? 'blue' : 'draw'
    reason = winner === 'draw'
      ? 'Both bots were knocked out with equal damage.'
      : 'Both bots were knocked out; damage dealt decided the result.'
  } else if (blue.health <= 0) {
    winner = 'red'
    reason = 'Blue was knocked out.'
  } else if (red.health <= 0) {
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
