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
  position: Vector3
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

function commandAt(plan: TurnPlan, tick: number): TurnCommand {
  return plan.commands.find((command) => command.tick === tick) ?? { tick, move: 'brake' }
}

function moveBot(bot: BotRuntime, command: TurnCommand): Vector3 {
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

  return [round(x), 0, round(z)]
}

function applyDamage(
  events: ReplayEvent[],
  tick: number,
  attacker: BotRuntime,
  defender: BotRuntime,
  baseDamage: number,
  cause: string,
): void {
  const mitigated = Math.max(1, Math.round(baseDamage - defender.stats.armor * 0.35))
  defender.health = Math.max(0, defender.health - mitigated)

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

  if (defender.health <= 0) {
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

  const reach = 1.6 + attacker.stats.control / 16 + attacker.stats.weaponThreat / 28

  if (distance(attacker.position, defender.position) > reach) {
    return
  }

  const damage =
    3 + attacker.stats.weaponThreat * 0.8 + attacker.stats.control * 0.2 + random * 5

  applyDamage(events, tick, attacker, defender, damage, 'weapon')
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
    position: [-6, 0, 0],
  }
  const blue: BotRuntime = {
    role: 'blue',
    stats: deriveBotStats(input.blue.blueprint),
    health: 0,
    position: [6, 0, 0],
  }

  red.health = red.stats.durability
  blue.health = blue.stats.durability

  const events: ReplayEvent[] = [
    { t: 0, type: 'spawn', bot: 'red', position: red.position, rotation: [0, 90, 0] },
    { t: 0, type: 'spawn', bot: 'blue', position: blue.position, rotation: [0, -90, 0] },
  ]
  const log: string[] = []

  for (let tick = 1; tick <= 5; tick += 1) {
    const redCommand = commandAt(input.red.turnPlan, tick)
    const blueCommand = commandAt(input.blue.turnPlan, tick)
    const redFrom = red.position
    const blueFrom = blue.position

    red.position = moveBot(red, redCommand)
    blue.position = moveBot(blue, blueCommand)

    events.push({ t: tick, type: 'move', bot: 'red', from: redFrom, to: red.position })
    events.push({ t: tick, type: 'move', bot: 'blue', from: blueFrom, to: blue.position })

    resolveWeapon(events, tick, red, blue, redCommand, rng())
    resolveWeapon(events, tick, blue, red, blueCommand, rng())

    if (
      distance(red.position, blue.position) < 1.1 &&
      redCommand.move === 'forward' &&
      blueCommand.move === 'forward'
    ) {
      applyDamage(events, tick, red, blue, red.stats.mass / 7 + red.stats.stability / 3, 'ram')
      applyDamage(events, tick, blue, red, blue.stats.mass / 7 + blue.stats.stability / 3, 'ram')
    }

    resolveHazard(events, tick, arena, red)
    resolveHazard(events, tick, arena, blue)

    if (red.health <= 0 || blue.health <= 0) {
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
  let winner: TeamRole | 'draw' = 'draw'
  let reason = 'Both bots survived with equivalent combat score.'

  if (red.health <= 0 && blue.health <= 0) {
    winner = damage.blue > damage.red ? 'red' : damage.red > damage.blue ? 'blue' : 'draw'
    reason = 'Both bots were knocked out; damage dealt decided the result.'
  } else if (blue.health <= 0) {
    winner = 'red'
    reason = 'Blue was knocked out.'
  } else if (red.health <= 0) {
    winner = 'blue'
    reason = 'Red was knocked out.'
  } else if (remainingHealth.red !== remainingHealth.blue) {
    winner = remainingHealth.red > remainingHealth.blue ? 'red' : 'blue'
    reason = 'Both bots survived; remaining health decided the result.'
  }

  log.push(`Round ${input.round}: ${reason}`)
  log.push(`Red damage taken: ${damage.red}. Blue damage taken: ${damage.blue}.`)

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
      duration: 6,
      events,
      summary: reason,
    }),
    log,
  }
}
