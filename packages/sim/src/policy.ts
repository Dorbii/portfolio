import type {
  ArenaConfig,
  MovementCommand,
  NormalizedBotTactics,
  OpeningScript,
  TeamRole,
  TurnCommand,
  Vector3,
} from '../../schemas/src/index.js'
import type { BotStats } from './deriveStats.js'

export type CommandPolicy = {
  tactics: NormalizedBotTactics
  openingScript: OpeningScript
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
  inCenterHazard: boolean
}

const CONTACT_DISTANCE = 1.28

export function chooseCommand(
  policy: CommandPolicy,
  tick: number,
  state: PolicyState,
): TurnCommand {
  const policyCommand = choosePolicyCommand(policy.tactics, tick, state)
  const scripted = policy.openingScript.commands.find((command) => command.tick === tick)
  const scriptedFields = definedScriptedFields(scripted)
  const command: TurnCommand = {
    ...policyCommand,
    ...scriptedFields,
    tick,
  }

  if (scriptedFields.move === undefined) {
    command.move = smoothContradictoryMove(state.bot.lastMove, command.move)
  }

  return command
}

function definedScriptedFields(command: TurnCommand | undefined): Omit<
  Partial<TurnCommand>,
  'tick'
> {
  const fields: Omit<Partial<TurnCommand>, 'tick'> = {}

  if (command?.move !== undefined) {
    fields.move = command.move
  }
  if (command?.weaponA !== undefined) {
    fields.weaponA = command.weaponA
  }
  if (command?.weaponB !== undefined) {
    fields.weaponB = command.weaponB
  }
  if (command?.utility !== undefined) {
    fields.utility = command.utility
  }

  return fields
}

function choosePolicyCommand(
  tactics: NormalizedBotTactics,
  tick: number,
  state: PolicyState,
): TurnCommand {
  const { bot, opponent, arena } = state
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
    inCenterHazard: centerHazardActive(arena) && isNearCenterHazard(bot.position, 1.55),
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
  const { bot, tactics, healthRatio, inCenterHazard } = context

  if (bot.stats.mobility <= 0) {
    return 'brake'
  }

  if (inCenterHazard && tactics.hazardPreference !== 'force') {
    return moveAwayFromPoint(bot, [0, 0, 0], context.tick)
  }

  if (healthRatio <= tactics.retreatAtHealthPct) {
    return kiteMove(context)
  }

  switch (tactics.movementPolicy) {
    case 'hold_ground':
      return holdGroundMove(context)
    case 'close':
      return closePolicyMove(context)
    case 'kite':
      return kiteMove(context)
    case 'circle':
      return circleMove(context)
    case 'bait_hazard':
      return baitHazardMove(context)
  }
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
  const { arena, bot, opponent, gap, tick } = context
  const edgeRecovery = edgeRecoveryMove(bot, arena)

  if (!centerHazardActive(arena)) {
    return circleMove(context)
  }

  if (edgeRecovery) {
    return edgeRecovery
  }

  if (isNearCenterHazard(bot.position, 1.35)) {
    return moveAwayFromPoint(bot, [0, 0, 0], tick)
  }

  const lureRange = bot.hazardBaitControl ? 7 : 5.5

  if (!isNearCenterHazard(opponent.position, 1.5) && gap < lureRange) {
    const lateralOffset = bot.hazardBaitControl ? 0.85 : 1.2
    const lurePoint: Vector3 = [0, 0, tick % 4 < 2 ? lateralOffset : -lateralOffset]

    return moveTowardPoint(bot, lurePoint)
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
  arena,
  bot,
  tactics,
  gap,
  idealRange,
  inCenterHazard,
  tick,
}: PolicyContext): TurnCommand['utility'] {
  if (inCenterHazard) {
    return 'activate'
  }

  if (tactics.movementPolicy === 'kite' && gap < idealRange * 0.85) {
    return 'activate'
  }

  if (tactics.movementPolicy === 'bait_hazard' && centerHazardActive(arena)) {
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

function centerHazardActive(arena: ArenaConfig): boolean {
  return arena.activeHazards.some((hazard) => hazard.toLowerCase().includes('saw'))
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

function isNearCenterHazard(position: Vector3, radius: number): boolean {
  return Math.abs(position[0]) < radius && Math.abs(position[2]) < radius
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

  if (centerHazardActive(arena) && !isNearCenterHazard(opponent.position, 1.35)) {
    const lurePoint: Vector3 = [0, 0, tick % 2 === 0 ? 1 : -1]

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
