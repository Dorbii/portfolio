import {
  type ArenaConfig,
  type MovementCommand,
  type NormalizedBotTactics,
  type TeamRole,
  type TurnCommand,
  type Vector3,
} from '../../schemas/src/index.js'
import type { BotStats } from './deriveStats.js'
import {
  clampPositionToArena,
  compileArenaTopology,
  hasActiveHazard,
  hazardsAtPosition,
  nearestHazardThreat,
  pathHazards,
  type CompiledArenaTopology,
} from './arenaTopology.js'

export type CommandPolicy = {
  tactics: NormalizedBotTactics
}

export type PolicyBotState = {
  role: TeamRole
  stats: BotStats
  health: number
  maxHealth: number
  hasUtilityControl: boolean
  hasWeaponControl: boolean
  weaponSlotCount?: number
  position: Vector3
  lastDamagedTick: number
  lastDealtDamageTick: number
  lastMove?: MovementCommand
  anchoredStance?: boolean
  hazardBaitControl?: boolean
  weaponReachBonus?: number
  contactDanger?: number
  controlDanger?: number
  hasBoosterUtility?: boolean
  hasRepairUtility?: boolean
  hasDroneUtility?: boolean
}

export type PolicyState = {
  bot: PolicyBotState
  opponent: PolicyBotState
  arena: ArenaConfig
}

type PolicyContext = PolicyState & {
  tick: number
  tactics: NormalizedBotTactics
  gap: number
  reach: number
  idealRange: number
  pressure: number
  healthRatio: number
  topology: CompiledArenaTopology
  inActiveHazard: boolean
}

const CONTACT_DISTANCE = 1.28

export function chooseCommand(
  policy: CommandPolicy,
  tick: number,
  state: PolicyState,
): TurnCommand {
  const policyCommand = choosePolicyCommand(policy.tactics, tick, state)
  const command: TurnCommand = {
    ...policyCommand,
    tick,
  }

  command.move = smoothContradictoryMove(state.bot.lastMove, command.move)

  return command
}

function choosePolicyCommand(
  tactics: NormalizedBotTactics,
  tick: number,
  state: PolicyState,
): TurnCommand {
  const { bot, opponent, arena } = state
  const topology = compileArenaTopology(arena)
  const gap = distance(bot.position, opponent.position)
  const reach = weaponReach(bot)
  const context: PolicyContext = {
    ...state,
    tick,
    tactics,
    gap,
    reach,
    idealRange: idealRangeFor(tactics, reach),
    pressure: pressureScore(bot, opponent),
    healthRatio: bot.health / bot.maxHealth,
    topology,
    inActiveHazard: hazardsAtPosition(topology, bot.position, 0.35).length > 0,
  }
  const command: TurnCommand = {
    tick,
    move: choosePolicyMove(context),
  }
  const weaponSlotCount = availableWeaponSlotCount(bot)

  if (weaponSlotCount >= 1) {
    command.weaponA = chooseWeaponCommand(context)
  }
  if (weaponSlotCount >= 2) {
    command.weaponB = chooseWeaponCommand(context)
  }
  if (bot.hasUtilityControl) {
    command.utility = chooseUtilityCommand(context)
  }

  return command
}

// CODEX_INTENT: expose the second weapon control slot to policy command selection.
// CODEX_RISK: behavioral
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
function availableWeaponSlotCount(bot: PolicyBotState): number {
  return Math.min(2, bot.weaponSlotCount ?? (bot.hasWeaponControl ? 1 : 0))
}

function choosePolicyMove(context: PolicyContext): MovementCommand {
  const { bot, tactics, healthRatio, inActiveHazard, topology } = context

  if (bot.stats.mobility <= 0) {
    return 'brake'
  }

  if (inActiveHazard && tactics.hazardPreference !== 'force') {
    return moveAwayFromPoint(bot, nearestHazardPoint(topology, bot.position), context.tick)
  }

  if (healthRatio <= tactics.retreatAtHealthPct) {
    return safeReactiveMove(context, kiteMove(context))
  }

  let move: MovementCommand

  switch (tactics.movementPolicy) {
    case 'hold_ground':
      move = holdGroundMove(context)
      break
    case 'close':
      move = closePolicyMove(context)
      break
    case 'kite':
      move = kiteMove(context)
      break
    case 'circle':
      move = circleMove(context)
      break
    case 'bait_hazard':
      move = baitHazardMove(context)
      break
  }

  return safeReactiveMove(context, move)
}

function holdGroundMove({
  bot,
  opponent,
  tactics,
  gap,
  reach,
  pressure,
  tick,
}: PolicyContext): MovementCommand {
  if (bot.anchoredStance) {
    return 'brake'
  }

  if (
    bot.hasWeaponControl &&
    tactics.aggression >= 0.55 &&
    gap > reach * 0.92 &&
    gap < reach * 2.4
  ) {
    return closeMove(bot, opponent.position, tick, pressure >= 1.12 && tactics.aggression > 0.82)
  }

  return 'brake'
}

function closePolicyMove(context: PolicyContext): MovementCommand {
  const { bot, opponent, tactics, gap, pressure, tick } = context

  if (gap <= CONTACT_DISTANCE * 1.08) {
    return tactics.aggression >= 0.78 && pressure >= 0.86 ? 'dash_forward' : 'forward'
  }

  return closeMove(
    bot,
    opponent.position,
    tick,
    tactics.aggression >= 0.7 || pressure >= 0.95,
  )
}

function kiteMove(context: PolicyContext): MovementCommand {
  const { bot, opponent, arena, gap, idealRange, tick } = context
  const edgeRecovery = edgeRecoveryMove(bot, arena)

  if (edgeRecovery) {
    return edgeRecovery
  }

  if (gap < idealRange * 0.92) {
    return evadeMove(bot, opponent, arena, tick)
  }

  if (gap > idealRange * 1.35) {
    return moveTowardPoint(bot, opponent.position)
  }

  return lateralMove(bot, opponent, tick)
}

function circleMove(context: PolicyContext): MovementCommand {
  const { bot, opponent, arena, gap, idealRange, pressure, tick } = context
  const edgeRecovery = edgeRecoveryMove(bot, arena)

  if (edgeRecovery) {
    return edgeRecovery
  }

  if (gap < CONTACT_DISTANCE * 1.18) {
    return evadeMove(bot, opponent, arena, tick)
  }

  if (gap > idealRange * 1.28) {
    return closeMove(bot, opponent.position, tick, pressure >= 1.02)
  }

  return flankingMove(bot, opponent, tick)
}

function baitHazardMove(context: PolicyContext): MovementCommand {
  const { arena, bot, opponent, gap, tick, topology } = context
  const edgeRecovery = edgeRecoveryMove(bot, arena)

  if (!hasActiveHazard(topology)) {
    return circleMove(context)
  }

  if (edgeRecovery) {
    return edgeRecovery
  }

  const hazardPoint = nearestHazardPoint(topology, bot.position)
  const selfHazardPadding = bot.hazardBaitControl ? 0.35 : 0.15

  if (hazardsAtPosition(topology, bot.position, selfHazardPadding).length > 0) {
    return moveAwayFromPoint(bot, hazardPoint, tick)
  }

  const lureRange = bot.hazardBaitControl ? 7 : 5.5

  if (hazardsAtPosition(topology, opponent.position, 0.3).length === 0 && gap < lureRange) {
    const lateralOffset = bot.hazardBaitControl ? 1.65 : 1.2
    const roleDirection = bot.role === 'red' ? 1 : -1
    const lurePoint: Vector3 = [
      bot.hazardBaitControl ? hazardPoint[0] - roleDirection * 0.8 : hazardPoint[0],
      0,
      hazardPoint[2] + (tick % 4 < 2 ? lateralOffset : -lateralOffset),
    ]
    const lureMove = bot.hazardBaitControl
      ? strafeTowardPoint(bot, lurePoint)
      : moveTowardPoint(bot, lurePoint)

    if (bot.hazardBaitControl) {
      return firstSafeMove(
        context,
        [
          lureMove,
          lateralMove(bot, opponent, tick),
          moveAwayFromPoint(bot, hazardPoint, tick),
          tick % 2 === 0 ? 'turn_left' : 'turn_right',
          'brake',
        ],
        { avoidHazards: true },
      )
    }

    return lureMove
  }

  return kiteMove(context)
}

function chooseWeaponCommand({
  bot,
  tactics,
  gap,
  reach,
  tick,
}: PolicyContext): TurnCommand['weaponA'] {
  if (tactics.weaponCadence === 'hold_fire') {
    return 'hold'
  }

  const inRange = gap <= reach

  if (!inRange) {
    return 'hold'
  }

  switch (tactics.weaponCadence) {
    case 'sustained':
      return 'fire'
    case 'burst':
      return tick % 4 <= 1 ? 'fire' : 'hold'
    case 'opportunistic':
      return gap <= reach * (bot.stats.control >= 6 ? 1 : 0.92) || tick % 2 === 0
        ? 'fire'
        : 'hold'
  }
}

function chooseUtilityCommand({
  bot,
  tactics,
  gap,
  idealRange,
  healthRatio,
  inActiveHazard,
  topology,
  tick,
}: PolicyContext): TurnCommand['utility'] {
  if (inActiveHazard) {
    return 'activate'
  }

  if (tactics.movementPolicy === 'kite' && gap < idealRange * 0.85) {
    return 'activate'
  }

  if (bot.hasBoosterUtility && tactics.movementPolicy === 'close') {
    return tick % 4 === 1 ? 'activate' : 'hold'
  }

  if (bot.hasRepairUtility && healthRatio < 0.96) {
    return 'activate'
  }

  if (bot.hasDroneUtility) {
    return tick % 4 === 1 ? 'activate' : 'hold'
  }

  if (tactics.movementPolicy === 'bait_hazard' && hasActiveHazard(topology)) {
    return tick % 3 === 0 ? 'activate' : 'hold'
  }

  if (tactics.movementPolicy === 'hold_ground' && bot.hasWeaponControl && gap <= idealRange) {
    return 'activate'
  }

  return 'hold'
}

function idealRangeFor(tactics: NormalizedBotTactics, reach: number): number {
  switch (tactics.preferredRange) {
    case 'contact':
      return Math.max(CONTACT_DISTANCE * 0.95, reach * 0.78)
    case 'close':
      return Math.max(2.05, reach * 1.02)
    case 'mid':
      return Math.max(3.35, reach * 1.34)
    case 'long':
      return Math.max(4.75, reach * 1.68)
  }
}

function smoothContradictoryMove(
  lastMove: MovementCommand | undefined,
  nextMove: MovementCommand | undefined,
): MovementCommand | undefined {
  if (
    lastMove === undefined ||
    nextMove === undefined ||
    nextMove === 'brake' ||
    !areContradictoryMoves(lastMove, nextMove)
  ) {
    return nextMove
  }

  return 'brake'
}

function areContradictoryMoves(left: MovementCommand, right: MovementCommand): boolean {
  return (
    (isForwardMove(left) && isBackwardMove(right)) ||
    (isBackwardMove(left) && isForwardMove(right)) ||
    (left === 'strafe_left' && right === 'strafe_right') ||
    (left === 'strafe_right' && right === 'strafe_left')
  )
}

function isForwardMove(move: MovementCommand): boolean {
  return move === 'forward' || move === 'dash_forward'
}

function isBackwardMove(move: MovementCommand): boolean {
  return move === 'backward' || move === 'dash_backward'
}

function distance(left: Vector3, right: Vector3): number {
  return Math.hypot(left[0] - right[0], left[2] - right[2])
}

function weaponReach(bot: PolicyBotState): number {
  return 1.6 + bot.stats.control / 16 + bot.stats.weaponThreat / 28 + (bot.weaponReachBonus ?? 0)
}

function pressureScore(bot: PolicyBotState, opponent: PolicyBotState): number {
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

function safeReactiveMove(
  context: PolicyContext,
  move: MovementCommand,
): MovementCommand {
  const hazardMove = saferHazardMove(context, move)

  if (hazardMove !== move) {
    return hazardMove
  }

  return saferOpponentDangerMove(context, move)
}

function saferHazardMove(
  context: PolicyContext,
  move: MovementCommand,
): MovementCommand {
  const { bot, tactics, tick, topology } = context

  if (
    tactics.hazardPreference === 'force' ||
    !shouldAvoidProjectedHazard(context) ||
    !hasActiveHazard(topology) ||
    !movePathTouchesHazard(context, move)
  ) {
    return move
  }

  const hazardPoint = nearestHazardPoint(topology, bot.position)

  return firstSafeMove(
    context,
    [
      moveAwayFromPoint(bot, hazardPoint, tick),
      lateralMove(bot, context.opponent, tick),
      tick % 2 === 0 ? 'turn_left' : 'turn_right',
      'backward',
      'dash_backward',
      'brake',
    ],
    { avoidHazards: true },
  )
}

function saferOpponentDangerMove(
  context: PolicyContext,
  move: MovementCommand,
): MovementCommand {
  const { bot, opponent, tactics, gap, tick } = context
  const opponentDanger = (opponent.contactDanger ?? 0) + (opponent.controlDanger ?? 0) * 0.55
  const isLowCommitment =
    tactics.aggression < 0.82 &&
    bot.stats.weaponThreat <= opponent.stats.weaponThreat * 0.65
  const nextGap = projectedGap(bot, opponent, move, context.arena)
  const isClosing = nextGap < gap - 0.05
  const entersDangerRange = nextGap <= CONTACT_DISTANCE * 2.45

  if (
    tactics.hazardPreference === 'force' ||
    opponentDanger < 1.05 ||
    (gap > CONTACT_DISTANCE * 2.45 && !entersDangerRange) ||
    !isLowCommitment ||
    !isClosing
  ) {
    return move
  }

  return firstSafeMove(
    context,
    [
      lateralMove(bot, opponent, tick),
      evadeMove(bot, opponent, context.arena, tick),
      tick % 2 === 0 ? 'circle_left' : 'circle_right',
      'brake',
    ],
    { avoidOpponentDanger: true },
  )
}

function firstSafeMove(
  context: PolicyContext,
  moves: MovementCommand[],
  options: {
    avoidHazards?: boolean
    avoidOpponentDanger?: boolean
  },
): MovementCommand {
  const { arena, bot, opponent, gap } = context

  for (const move of uniqueMoves(moves)) {
    if (options.avoidHazards && movePathTouchesHazard(context, move)) {
      continue
    }
    if (
      options.avoidOpponentDanger &&
      projectedGap(bot, opponent, move, arena) < gap - 0.05
    ) {
      continue
    }

    return move
  }

  return 'brake'
}

function uniqueMoves(moves: MovementCommand[]): MovementCommand[] {
  return [...new Set(moves)]
}

function shouldAvoidProjectedHazard({
  bot,
  opponent,
  tactics,
}: PolicyContext): boolean {
  if (tactics.hazardPreference === 'bait' && bot.hazardBaitControl) {
    return true
  }

  return (
    tactics.hazardPreference === 'avoid' &&
    (tactics.aggression < 0.82 ||
      bot.stats.weaponThreat <= opponent.stats.weaponThreat * 0.45)
  )
}

function movePathTouchesHazard(context: PolicyContext, move: MovementCommand): boolean {
  const { arena, bot, topology } = context
  const projected = projectMove(bot, move, arena)

  return pathHazards(topology, bot.position, projected).length > 0
}

function projectedGap(
  bot: PolicyBotState,
  opponent: PolicyBotState,
  move: MovementCommand,
  arena: ArenaConfig,
): number {
  return distance(projectMove(bot, move, arena), opponent.position)
}

function projectMove(
  bot: PolicyBotState,
  move: MovementCommand,
  arena: ArenaConfig,
): Vector3 {
  const speed = Math.max(0.2, Math.min(2.75, 0.45 + bot.stats.mobility / 18))
  const direction = bot.role === 'red' ? 1 : -1
  let x = bot.position[0]
  let z = bot.position[2]

  switch (move) {
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
      break
  }

  return clampPositionToArena(arena, [x, 0, z])
}

function evadeMove(
  bot: PolicyBotState,
  opponent: PolicyBotState,
  arena: ArenaConfig,
  tick: number,
): MovementCommand {
  const edgeRecovery = edgeRecoveryMove(bot, arena)

  if (edgeRecovery) {
    return edgeRecovery
  }

  const topology = compileArenaTopology(arena)

  if (
    hasActiveHazard(topology) &&
    hazardsAtPosition(topology, opponent.position, 0.3).length === 0
  ) {
    const hazardPoint = nearestHazardPoint(topology, bot.position)
    const lurePoint: Vector3 = [
      hazardPoint[0],
      0,
      hazardPoint[2] + (tick % 2 === 0 ? 1 : -1),
    ]

    return moveTowardPoint(bot, lurePoint)
  }

  return moveAwayFromPoint(bot, opponent.position, tick)
}

function edgeRecoveryMove(
  bot: PolicyBotState,
  arena: ArenaConfig,
): MovementCommand | undefined {
  const xLimit = Math.max(1, arena.width / 2 - 0.85)
  const zLimit = Math.max(1, arena.height / 2 - 0.85)

  if (Math.abs(bot.position[0]) >= xLimit - 0.1) {
    return moveTowardPoint(bot, [0, 0, bot.position[2]])
  }

  if (Math.abs(bot.position[2]) >= zLimit - 0.1) {
    return moveTowardPoint(bot, [bot.position[0], 0, 0])
  }

  return undefined
}

function moveTowardPoint(bot: PolicyBotState, point: Vector3): MovementCommand {
  const zDelta = point[2] - bot.position[2]

  if (Math.abs(zDelta) > 0.7) {
    return zDelta < 0 ? 'turn_left' : 'turn_right'
  }

  const roleDirection = bot.role === 'red' ? 1 : -1
  const forwardDelta = (point[0] - bot.position[0]) * roleDirection

  return forwardDelta >= -0.35 ? 'forward' : 'backward'
}

function strafeTowardPoint(bot: PolicyBotState, point: Vector3): MovementCommand {
  const zDelta = point[2] - bot.position[2]

  if (Math.abs(zDelta) > 0.35) {
    return zDelta < 0 ? 'strafe_left' : 'strafe_right'
  }

  return moveTowardPoint(bot, point)
}

function closeMove(
  bot: PolicyBotState,
  point: Vector3,
  tick: number,
  urgent: boolean,
): MovementCommand {
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
  bot: PolicyBotState,
  point: Vector3,
  tick: number,
): MovementCommand {
  const awayPoint: Vector3 = [
    bot.position[0] + (bot.position[0] - point[0]),
    0,
    bot.position[2] + (bot.position[2] - point[2] || (tick % 2 === 0 ? 1 : -1)),
  ]

  return moveTowardPoint(bot, awayPoint)
}

function lateralMove(
  bot: PolicyBotState,
  opponent: PolicyBotState,
  tick: number,
): MovementCommand {
  const preferred = bot.role === 'red' ? -1 : 1
  const currentSide = bot.position[2] - opponent.position[2]

  if (Math.abs(currentSide) < 1.4) {
    return (tick + (preferred > 0 ? 0 : 1)) % 2 === 0 ? 'turn_right' : 'turn_left'
  }

  return currentSide > 0 ? 'turn_left' : 'turn_right'
}

function flankingMove(
  bot: PolicyBotState,
  opponent: PolicyBotState,
  tick: number,
): MovementCommand {
  const side = bot.position[2] - opponent.position[2]

  if (Math.abs(side) < 0.85) {
    return tick % 2 === 0 ? 'circle_right' : 'circle_left'
  }

  if (Math.abs(side) > 2.2 && tick % 3 === 0) {
    return moveTowardPoint(bot, opponent.position)
  }

  return side > 0 ? 'circle_left' : 'circle_right'
}

function nearestHazardPoint(
  topology: CompiledArenaTopology,
  position: Vector3,
): Vector3 {
  const threat = nearestHazardThreat(topology, position)

  return threat?.position ?? [0, 0, 0]
}
