import {
  type ArenaConfig,
  type ArenaGridCell,
  type ArenaHazardThreat,
  type ActiveActionSet,
  type CombatBotSnapshot,
  type GeneratedControls,
  type MovementCommand,
  type NormalizedBotTactics,
  type PreferredRange,
  type TeamRole,
  type TurnCommand,
  type WeaponCommand,
} from '../../../packages/schemas/src/index.js'
import {
  activeHazardTypes,
  arenaCellDistance,
  bearingBetweenCells,
  compileArenaTopology,
  distanceToNearestArenaWall,
  hasArenaLineOfSight,
  hazardsAtPosition,
  nearestHazardThreat,
  pathHazards,
  worldToArenaCell,
  type CompiledArenaTopology,
} from '../../../packages/sim/src/arenaTopology.js'
import { combatActionCommand } from '../../../packages/sim/src/combatActions.js'
import type {
  StoredCombatState,
  StoredRoleState,
  StoredSessionState,
} from './sessionTypes.js'

const WALL_PRESSURE_DISTANCE = 2.2
const HAZARD_AWARENESS_DISTANCE = 1.8
const DEFAULT_PREFERRED_RANGE: PreferredRange = 'close'
const DEFAULT_RETREAT_HEALTH_PCT = 0.2

type CombatRangeBand = 'contact' | 'close' | 'mid' | 'long'

type CombatDecisionBrief = {
  tick: number
  deadlineAt: string
  turnSeconds: number
  range: {
    distance: number
    band: CombatRangeBand
    preferred: PreferredRange
    selfWeaponReach: number
    opponentWeaponReach: number
    insideSelfWeaponReach: boolean
    insideOpponentWeaponReach: boolean
  }
  positioning: {
    selfCell: ArenaGridCell
    opponentCell: ArenaGridCell
    distanceCells: number
    bearingToOpponent: 'north' | 'south' | 'east' | 'west' | 'same_cell'
    lineOfSight: boolean
  }
  hazards: {
    active: string[]
    selfThreats: ArenaHazardThreat[]
    opponentThreats: ArenaHazardThreat[]
    threatenedLegalMoves: {
      command: MovementCommand
      targetCell: ArenaGridCell
      hazards: ArenaHazardThreat[]
    }[]
  }
  health: {
    selfPct: number
    opponentPct: number
    deltaPct: number
    retreatAtHealthPct: number
  }
  arenaPressure: {
    selfDistanceToNearestWall: number
    opponentDistanceToNearestWall: number
    selfNearWall: boolean
    opponentNearWall: boolean
    selfNearHazard: boolean
    opponentNearHazard: boolean
    selfNearCenterHazard: boolean
    opponentNearCenterHazard: boolean
    activeHazards: string[]
  }
  actionReadiness: {
    weaponA: {
      canFire: boolean
      reason: string
    }
    weaponB?: {
      canFire: boolean
      reason: string
    }
    utility?: {
      canActivate: boolean
      reason: string
    }
  }
  movementGuidance: {
    reasons: string[]
  }
  previousResolvedTurn?: {
    self?: TurnCommand
    opponent?: TurnCommand
  }
  tacticalCues: string[]
}

type InternalMovementGuidance = {
  approach: MovementCommand[]
  avoid: MovementCommand[]
  reasons: string[]
}

export function buildCombatDecisionBrief(
  state: StoredSessionState,
  role: StoredRoleState,
  combat: StoredCombatState,
): CombatDecisionBrief {
  const self = role.role === 'red' ? combat.snapshot.red : combat.snapshot.blue
  const opponent = role.role === 'red' ? combat.snapshot.blue : combat.snapshot.red
  const opponentRole = role.role === 'red' ? state.roles.blue : state.roles.red
  const controls = controlsForCombatDecision(state.activeActionSets?.[role.role], role.controls)
  const topology = compileArenaTopology(combat.snapshot.arena)
  const range = buildRangeDecision(combat, self, opponent)
  const positioning = buildPositioning(topology, self, opponent)
  const hazards = buildHazards(topology, controls, role.role, self, opponent)
  const health = buildHealthDecision(self, opponent)
  const arenaPressure = buildArenaPressure(combat.snapshot.arena, topology, self, opponent)
  const actionReadiness = buildActionReadiness(controls, range)
  const resolvedTurn = previousResolvedTurn(role.role, combat)
  const movementGuidance = buildMovementGuidance({
    role: role.role,
    arena: combat.snapshot.arena,
    controls,
    self,
    opponent,
    range,
    health,
    arenaPressure,
    topology,
    hazards,
    previousSelfMove: resolvedTurn?.self?.move,
  })

  return {
    tick: combat.nextTick,
    deadlineAt: combat.deadlineAt,
    turnSeconds: combat.turnSeconds,
    range,
    positioning,
    hazards,
    health,
    arenaPressure,
    actionReadiness,
    movementGuidance: {
      reasons: movementGuidance.reasons,
    },
    ...(resolvedTurn ? { previousResolvedTurn: resolvedTurn } : {}),
    tacticalCues: tacticalCues({
      role,
      opponentRole,
      range,
      positioning,
      hazards,
      health,
      arenaPressure,
      actionReadiness,
      movementGuidance,
      recentEvents: combat.snapshot.recentEvents,
    }),
  }
}

function buildPositioning(
  topology: CompiledArenaTopology,
  self: CombatBotSnapshot,
  opponent: CombatBotSnapshot,
): CombatDecisionBrief['positioning'] {
  const selfCell = worldToArenaCell(topology, self.position)
  const opponentCell = worldToArenaCell(topology, opponent.position)

  return {
    selfCell,
    opponentCell,
    distanceCells: arenaCellDistance(selfCell, opponentCell),
    bearingToOpponent: bearingBetweenCells(selfCell, opponentCell),
    lineOfSight: hasArenaLineOfSight(topology, self.position, opponent.position),
  }
}

function controlsForCombatDecision(
  actionSet: ActiveActionSet | undefined,
  fallback: GeneratedControls | undefined,
): GeneratedControls {
  if (!actionSet) {
    return fallback ?? { movement: ['brake'] }
  }

  const commands = Object.values(actionSet.actions)
    .map((action) => combatActionCommand(action))
    .filter((command): command is TurnCommand => command !== undefined)
  const movement = uniqueCommands(commands.flatMap((command) => command.move ? [command.move] : []))
  const weaponA = uniqueCommands(commands.flatMap((command) => command.weaponA ? [command.weaponA] : []))
  const weaponB = uniqueCommands(commands.flatMap((command) => command.weaponB ? [command.weaponB] : []))
  const utility = uniqueCommands(commands.flatMap((command) => command.utility ? [command.utility] : []))

  return {
    movement: movement.length > 0 ? movement : ['brake'],
    ...(weaponA.length > 0 ? { weaponA } : {}),
    ...(weaponB.length > 0 ? { weaponB } : {}),
    ...(utility.length > 0 ? { utility } : {}),
  }
}

function buildHazards(
  topology: CompiledArenaTopology,
  controls: GeneratedControls,
  role: TeamRole,
  self: CombatBotSnapshot,
  opponent: CombatBotSnapshot,
): CombatDecisionBrief['hazards'] {
  return {
    active: activeHazardTypes(topology),
    selfThreats: hazardsAtPosition(topology, self.position, HAZARD_AWARENESS_DISTANCE),
    opponentThreats: hazardsAtPosition(topology, opponent.position, HAZARD_AWARENESS_DISTANCE),
    threatenedLegalMoves: controls.movement
      .map((command) => {
        const targetPosition = projectPosition(role, self, command)
        return {
          command,
          targetCell: worldToArenaCell(topology, targetPosition),
          hazards: pathHazards(topology, self.position, targetPosition),
        }
      })
      .filter((move) => move.hazards.length > 0),
  }
}

function buildRangeDecision(
  combat: StoredCombatState,
  self: CombatBotSnapshot,
  opponent: CombatBotSnapshot,
  tactics?: NormalizedBotTactics,
): CombatDecisionBrief['range'] {
  const distance = round(combat.snapshot.distance)
  const selfWeaponReach = round(self.weaponReach)
  const opponentWeaponReach = round(opponent.weaponReach)

  return {
    distance,
    band: rangeBand(distance, selfWeaponReach, opponentWeaponReach),
    preferred: tactics?.preferredRange ?? DEFAULT_PREFERRED_RANGE,
    selfWeaponReach,
    opponentWeaponReach,
    insideSelfWeaponReach: distance <= selfWeaponReach,
    insideOpponentWeaponReach: distance <= opponentWeaponReach,
  }
}

function buildHealthDecision(
  self: CombatBotSnapshot,
  opponent: CombatBotSnapshot,
  tactics?: NormalizedBotTactics,
): CombatDecisionBrief['health'] {
  const selfPct = healthPct(self)
  const opponentPct = healthPct(opponent)

  return {
    selfPct,
    opponentPct,
    deltaPct: round(selfPct - opponentPct),
    retreatAtHealthPct: tactics?.retreatAtHealthPct ?? DEFAULT_RETREAT_HEALTH_PCT,
  }
}

function buildArenaPressure(
  arena: ArenaConfig,
  topology: CompiledArenaTopology,
  self: CombatBotSnapshot,
  opponent: CombatBotSnapshot,
): CombatDecisionBrief['arenaPressure'] {
  const selfWallDistance = distanceToNearestArenaWall(arena, self.position)
  const opponentWallDistance = distanceToNearestArenaWall(arena, opponent.position)
  const selfNearHazard = hazardsAtPosition(topology, self.position, HAZARD_AWARENESS_DISTANCE).length > 0
  const opponentNearHazard = hazardsAtPosition(topology, opponent.position, HAZARD_AWARENESS_DISTANCE).length > 0

  return {
    selfDistanceToNearestWall: selfWallDistance,
    opponentDistanceToNearestWall: opponentWallDistance,
    selfNearWall: selfWallDistance <= WALL_PRESSURE_DISTANCE,
    opponentNearWall: opponentWallDistance <= WALL_PRESSURE_DISTANCE,
    selfNearHazard,
    opponentNearHazard,
    selfNearCenterHazard: selfNearHazard,
    opponentNearCenterHazard: opponentNearHazard,
    activeHazards: activeHazardTypes(topology),
  }
}

function buildActionReadiness(
  controls: GeneratedControls,
  range: CombatDecisionBrief['range'],
): CombatDecisionBrief['actionReadiness'] {
  return {
    weaponA: weaponReadiness(controls.weaponA, range.insideSelfWeaponReach),
    ...(controls.weaponB ? { weaponB: weaponReadiness(controls.weaponB, range.insideSelfWeaponReach) } : {}),
    ...(controls.utility
      ? {
          utility: {
            canActivate: controls.utility.includes('activate'),
            reason: controls.utility.includes('activate')
              ? 'Utility activation is legal this turn; check self.cooldowns and self.charges for tactical timing.'
              : 'No utility activation command is available.',
          },
        }
      : {}),
  }
}

function buildMovementGuidance(input: {
  role: TeamRole
  arena: ArenaConfig
  controls: GeneratedControls
  self: CombatBotSnapshot
  opponent: CombatBotSnapshot
  range: CombatDecisionBrief['range']
  health: CombatDecisionBrief['health']
  arenaPressure: CombatDecisionBrief['arenaPressure']
  topology: CompiledArenaTopology
  hazards: CombatDecisionBrief['hazards']
  previousSelfMove?: MovementCommand
}): InternalMovementGuidance {
  const recommended: MovementCommand[] = []
  const reasons: string[] = []
  const nearestSelfHazard = input.hazards.selfThreats[0]

  if (input.arenaPressure.selfNearWall) {
    addRecommended(recommended, commandTowardCenterX(input.role, input.self))
    addRecommended(recommended, commandTowardCenterZ(input.self))
    reasons.push('You are close to a wall; prioritize a command that increases escape space.')
  }

  if (nearestSelfHazard) {
    addRecommended(recommended, commandAwayFromPointX(input.role, input.self, nearestSelfHazard.position))
    addRecommended(recommended, commandAwayFromPointZ(input.self, nearestSelfHazard.position))
    reasons.push('You are near an active hazard; move out unless forcing a favorable trade there.')
  }

  if (input.health.selfPct <= input.health.retreatAtHealthPct) {
    addRecommended(recommended, lateralEscape(input.self, input.opponent))
    addRecommended(recommended, circleTowardOpponent(input.self, input.opponent))
    addRecommended(recommended, 'dash_backward')
    addRecommended(recommended, 'backward')
    reasons.push('Your health is below the retreat threshold; angle out before reversing into a lane.')
  } else if (input.range.insideOpponentWeaponReach && !input.range.insideSelfWeaponReach) {
    addRecommended(recommended, 'dash_backward')
    addRecommended(recommended, lateralEscape(input.self, input.opponent))
    reasons.push('Opponent reach covers you while your weapon does not; create distance or angle out.')
  } else if (shouldCloseDistance(input.range)) {
    if (input.previousSelfMove === 'dash_forward' || input.previousSelfMove === 'forward') {
      addRecommended(recommended, circleTowardOpponent(input.self, input.opponent))
    }
    addRecommended(recommended, 'dash_forward')
    addRecommended(recommended, 'forward')
    addRecommended(recommended, circleTowardOpponent(input.self, input.opponent))
    reasons.push('Current distance is outside your useful range; mix angled movement into repeated closes.')
  } else {
    addRecommended(recommended, circleTowardOpponent(input.self, input.opponent))
    addRecommended(recommended, 'strafe_left')
    addRecommended(recommended, 'strafe_right')
    addRecommended(recommended, 'brake')
    reasons.push('Range is workable; preserve angle, fire if legal, or brake if the opponent is driving into you.')
  }

  const availableRecommended = recommended.filter((command) => input.controls.movement.includes(command))
  const avoid = input.controls.movement.filter((command) =>
    shouldAvoidMovement(
      input.role,
      input.arena,
      input.topology,
      input.self,
      input.range,
      input.arenaPressure,
      command,
    ),
  )

  return {
    approach: availableRecommended.length > 0 ? uniqueCommands(availableRecommended) : ['brake'],
    avoid: uniqueCommands(avoid),
    reasons,
  }
}

function tacticalCues(input: {
  role: StoredRoleState
  opponentRole: StoredRoleState
  range: CombatDecisionBrief['range']
  positioning: CombatDecisionBrief['positioning']
  hazards: CombatDecisionBrief['hazards']
  health: CombatDecisionBrief['health']
  arenaPressure: CombatDecisionBrief['arenaPressure']
  actionReadiness: CombatDecisionBrief['actionReadiness']
  movementGuidance: InternalMovementGuidance
  recentEvents: string[]
}): string[] {
  const cues: string[] = []

  cues.push(
    'Submit exactly one command for the current combat turn; movement can be combined with weapon and utility actions.',
  )

  if (input.actionReadiness.weaponA.canFire) {
    cues.push('weaponA can fire in current range; combine it with a movement command if the angle is useful.')
  } else {
    cues.push(input.actionReadiness.weaponA.reason)
  }

  if (input.health.selfPct <= input.health.retreatAtHealthPct) {
    cues.push('Health is below your retreat threshold; prioritize survival and spacing over damage.')
  } else if (input.health.deltaPct > 0.15) {
    cues.push('You are ahead on health; do not throw the lead by driving into bad contact.')
  } else if (input.health.deltaPct < -0.15) {
    cues.push('You are behind on health; look for a range change, hazard bait, or part-targeting swing.')
  }

  if (input.arenaPressure.opponentNearWall) {
    cues.push('Opponent is near a wall; closing or control pressure can convert position into damage.')
  }

  if (input.arenaPressure.selfNearWall) {
    cues.push('You are near a wall; avoid destination cells that reduce escape space.')
  }

  if (input.hazards.selfThreats.some((threat) => threat.inside)) {
    cues.push('You are inside an active hazard shape; leave the hazard before trading damage.')
  }

  if (input.hazards.threatenedLegalMoves.length > 0) {
    cues.push(
      `Hazard-threatened destination cells: ${input.hazards.threatenedLegalMoves
        .map((move) => cellLabel(move.targetCell))
        .slice(0, 4)
        .join(', ')}.`,
    )
  }

  if (input.arenaPressure.opponentNearHazard) {
    cues.push('Opponent is near an active hazard; lateral or control pressure may keep them there.')
  }

  if (input.movementGuidance.avoid.length > 0) {
    cues.push('Some legal destinations are low value here; prefer actions whose preview improves range, line of sight, or hazard exposure.')
  }

  if (input.recentEvents.length > 0) {
    cues.push(`Recent resolved events: ${input.recentEvents.slice(-3).join(' | ')}`)
  }

  if (!input.role.loadoutConfirmedAt && input.opponentRole.loadoutConfirmedAt) {
    cues.push('You do not have a confirmed loadout for this round; prefer conservative commands until the loadout state catches up.')
  }

  return cues
}

function weaponReadiness(
  commands: WeaponCommand[] | undefined,
  inRange: boolean,
): { canFire: boolean; reason: string } {
  if (!commands?.includes('fire')) {
    return {
      canFire: false,
      reason: 'No fire command is available for this weapon slot.',
    }
  }

  if (!inRange) {
    return {
      canFire: false,
      reason: 'Weapon can fire, but current distance is outside self weapon reach.',
    }
  }

  return {
    canFire: true,
    reason: 'Weapon fire is legal and current distance is inside self weapon reach.',
  }
}

function previousResolvedTurn(
  role: TeamRole,
  combat: StoredCombatState,
): CombatDecisionBrief['previousResolvedTurn'] {
  const selfActions = combat.actions[role]
  const opponentActions = combat.actions[role === 'red' ? 'blue' : 'red']
  const self = selfActions[selfActions.length - 1]
    ? combatActionCommand(selfActions[selfActions.length - 1])
    : undefined
  const opponent = opponentActions[opponentActions.length - 1]
    ? combatActionCommand(opponentActions[opponentActions.length - 1])
    : undefined

  if (!self && !opponent) {
    return undefined
  }

  return {
    ...(self ? { self } : {}),
    ...(opponent ? { opponent } : {}),
  }
}

function rangeBand(
  distance: number,
  selfWeaponReach: number,
  opponentWeaponReach: number,
): CombatRangeBand {
  if (distance <= 1.5) {
    return 'contact'
  }

  if (distance <= Math.max(selfWeaponReach, opponentWeaponReach) + 0.75) {
    return 'close'
  }

  if (distance <= 8) {
    return 'mid'
  }

  return 'long'
}

function shouldCloseDistance(range: CombatDecisionBrief['range']): boolean {
  if (range.preferred === 'long') {
    return false
  }

  if (range.preferred === 'mid') {
    return range.band === 'long'
  }

  return !range.insideSelfWeaponReach && range.band !== 'contact'
}

function shouldAvoidMovement(
  role: TeamRole,
  arena: ArenaConfig,
  topology: CompiledArenaTopology,
  self: CombatBotSnapshot,
  range: CombatDecisionBrief['range'],
  arenaPressure: CombatDecisionBrief['arenaPressure'],
  command: MovementCommand,
): boolean {
  if (command === 'brake') {
    return range.band === 'long'
  }

  const projected = projectPosition(role, self, command)

  if (
    arenaPressure.selfNearWall &&
    distanceToNearestArenaWall(arena, projected) < arenaPressure.selfDistanceToNearestWall
  ) {
    return true
  }

  const currentThreat = nearestHazardThreat(topology, self.position)
  const projectedThreat = nearestHazardThreat(topology, projected)

  if (
    currentThreat &&
    projectedThreat &&
    currentThreat.distance <= HAZARD_AWARENESS_DISTANCE &&
    projectedThreat.distance < currentThreat.distance
  ) {
    return true
  }

  if (arenaPressure.selfNearHazard && pathHazards(topology, self.position, projected).length > 0) {
    return true
  }

  return false
}

function projectPosition(
  role: TeamRole,
  self: CombatBotSnapshot,
  command: MovementCommand,
): [number, number, number] {
  const direction = role === 'red' ? 1 : -1
  const speed = Math.max(0.2, Math.min(2.75, 0.45 + self.stats.mobility / 18))
  const [x, y, z] = self.position

  switch (command) {
    case 'forward':
      return [x + direction * speed, y, z]
    case 'backward':
      return [x - direction * speed * 0.7, y, z]
    case 'dash_forward':
      return [x + direction * speed * 1.55, y, z]
    case 'dash_backward':
      return [x - direction * speed * 1.25, y, z]
    case 'strafe_left':
      return [x, y, z - speed * 1.05]
    case 'strafe_right':
      return [x, y, z + speed * 1.05]
    case 'circle_left':
      return [x + direction * speed * 0.35, y, z - speed * 0.95]
    case 'circle_right':
      return [x + direction * speed * 0.35, y, z + speed * 0.95]
    case 'turn_left':
      return [x + direction * speed * 0.25, y, z - speed * 0.65]
    case 'turn_right':
      return [x + direction * speed * 0.25, y, z + speed * 0.65]
    case 'brake':
      return self.position
  }
}

function commandTowardCenterX(role: TeamRole, self: CombatBotSnapshot): MovementCommand {
  const x = self.position[0]

  if (role === 'red') {
    return x < 0 ? 'forward' : 'backward'
  }

  return x > 0 ? 'forward' : 'backward'
}

function commandTowardCenterZ(self: CombatBotSnapshot): MovementCommand {
  return self.position[2] > 0 ? 'strafe_left' : 'strafe_right'
}

function commandAwayFromPointX(
  role: TeamRole,
  self: CombatBotSnapshot,
  point: readonly number[],
): MovementCommand {
  const movePositiveX = self.position[0] >= point[0]

  if (role === 'red') {
    return movePositiveX ? 'forward' : 'backward'
  }

  return movePositiveX ? 'backward' : 'forward'
}

function commandAwayFromPointZ(
  self: CombatBotSnapshot,
  point: readonly number[],
): MovementCommand {
  return self.position[2] >= point[2] ? 'strafe_right' : 'strafe_left'
}

function lateralEscape(self: CombatBotSnapshot, opponent: CombatBotSnapshot): MovementCommand {
  return self.position[2] <= opponent.position[2] ? 'strafe_left' : 'strafe_right'
}

function circleTowardOpponent(self: CombatBotSnapshot, opponent: CombatBotSnapshot): MovementCommand {
  return self.position[2] <= opponent.position[2] ? 'circle_right' : 'circle_left'
}

function addRecommended(commands: MovementCommand[], command: MovementCommand): void {
  commands.push(command)
}

function uniqueCommands<T extends string>(commands: T[]): T[] {
  return [...new Set(commands)]
}

function cellLabel(cell: ArenaGridCell): string {
  return `cell (${cell.x}, ${cell.z})`
}

function healthPct(bot: CombatBotSnapshot): number {
  return round(bot.maxHealth > 0 ? bot.health / bot.maxHealth : 0)
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
