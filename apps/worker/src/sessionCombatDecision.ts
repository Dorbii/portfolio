import {
  hasCenterArenaHazard,
  type ArenaConfig,
  type CombatBotSnapshot,
  type CombatRangeBand,
  type CombatTurnDecisionContext,
  type GeneratedControls,
  type MovementCommand,
  type NormalizedBotTactics,
  type PreferredRange,
  type TeamRole,
  type WeaponCommand,
} from '../../../packages/schemas/src/index.js'
import type {
  StoredCombatState,
  StoredRoleState,
  StoredSessionState,
} from './sessionTypes.js'

const WALL_PRESSURE_DISTANCE = 2.2
const CENTER_HAZARD_DISTANCE = 1.8
const DEFAULT_PREFERRED_RANGE: PreferredRange = 'close'
const DEFAULT_RETREAT_HEALTH_PCT = 0.2

export function buildCombatTurnDecisionContext(
  state: StoredSessionState,
  role: StoredRoleState,
  combat: StoredCombatState,
): CombatTurnDecisionContext {
  const self = role.role === 'red' ? combat.snapshot.red : combat.snapshot.blue
  const opponent = role.role === 'red' ? combat.snapshot.blue : combat.snapshot.red
  const opponentRole = role.role === 'red' ? state.roles.blue : state.roles.red
  const controls = role.controls ?? { movement: ['brake'] }
  const tactics = role.normalizedSubmission?.tactics
  const range = buildRangeDecision(combat, self, opponent, tactics)
  const positioning = buildPositioning(combat, self, opponent)
  const hazards = buildHazards(combat, controls, role.role, self, opponent)
  const health = buildHealthDecision(self, opponent, tactics)
  const arenaPressure = buildArenaPressure(combat, self, opponent)
  const actionReadiness = buildActionReadiness(controls, range)
  const resolvedTurn = previousResolvedTurn(role.role, combat)
  const movementOptions = buildMovementOptions({
    role: role.role,
    arena: combat.snapshot.arena,
    controls,
    self,
    opponent,
    range,
    health,
    arenaPressure,
    previousSelfMove: resolvedTurn?.self?.move,
  })

  return {
    tick: combat.nextTick,
    deadlineAt: combat.deadlineAt,
    turnSeconds: combat.turnSeconds,
    legalCommands: {
      movement: controls.movement,
      ...(controls.weaponA ? { weaponA: controls.weaponA } : {}),
      ...(controls.weaponB ? { weaponB: controls.weaponB } : {}),
      ...(controls.utility ? { utility: controls.utility } : {}),
    },
    range,
    positioning,
    hazards,
    health,
    arenaPressure,
    actionReadiness,
    movementOptions,
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
      movementOptions,
      recentEvents: combat.snapshot.recentEvents,
    }),
  }
}

function buildPositioning(
  combat: StoredCombatState,
  self: CombatBotSnapshot,
  opponent: CombatBotSnapshot,
): CombatTurnDecisionContext['positioning'] {
  const selfCell = positionToCell(combat.snapshot.arena, self.position)
  const opponentCell = positionToCell(combat.snapshot.arena, opponent.position)
  const dx = opponentCell.x - selfCell.x
  const dz = opponentCell.z - selfCell.z

  return {
    selfCell,
    opponentCell,
    distanceCells: Math.abs(dx) + Math.abs(dz),
    bearingToOpponent: bearingToOpponent(dx, dz),
    lineOfSight: hasLineOfSight(combat.snapshot.arena, self.position, opponent.position),
  }
}

function buildHazards(
  combat: StoredCombatState,
  controls: GeneratedControls,
  role: TeamRole,
  self: CombatBotSnapshot,
  opponent: CombatBotSnapshot,
): CombatTurnDecisionContext['hazards'] {
  const arena = combat.snapshot.arena

  return {
    active: arena.activeHazards,
    selfThreats: hazardThreatsAt(arena, self.position),
    opponentThreats: hazardThreatsAt(arena, opponent.position),
    threatenedLegalMoves: controls.movement
      .map((command) => {
        const targetPosition = projectPosition(role, self, command)
        return {
          command,
          targetCell: positionToCell(arena, targetPosition),
          hazards: hazardThreatsAt(arena, targetPosition),
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
): CombatTurnDecisionContext['range'] {
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
): CombatTurnDecisionContext['health'] {
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
  combat: StoredCombatState,
  self: CombatBotSnapshot,
  opponent: CombatBotSnapshot,
): CombatTurnDecisionContext['arenaPressure'] {
  const activeHazards = combat.snapshot.arena.activeHazards

  return {
    selfDistanceToNearestWall: distanceToNearestWall(combat, self),
    opponentDistanceToNearestWall: distanceToNearestWall(combat, opponent),
    selfNearWall: distanceToNearestWall(combat, self) <= WALL_PRESSURE_DISTANCE,
    opponentNearWall: distanceToNearestWall(combat, opponent) <= WALL_PRESSURE_DISTANCE,
    selfNearCenterHazard: nearCenterHazard(activeHazards, self),
    opponentNearCenterHazard: nearCenterHazard(activeHazards, opponent),
    activeHazards,
  }
}

function buildActionReadiness(
  controls: GeneratedControls,
  range: CombatTurnDecisionContext['range'],
): CombatTurnDecisionContext['actionReadiness'] {
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

function buildMovementOptions(input: {
  role: TeamRole
  arena: ArenaConfig
  controls: GeneratedControls
  self: CombatBotSnapshot
  opponent: CombatBotSnapshot
  range: CombatTurnDecisionContext['range']
  health: CombatTurnDecisionContext['health']
  arenaPressure: CombatTurnDecisionContext['arenaPressure']
  previousSelfMove?: MovementCommand
}): CombatTurnDecisionContext['movementOptions'] {
  const recommended: MovementCommand[] = []
  const reasons: string[] = []

  if (input.arenaPressure.selfNearWall) {
    addRecommended(recommended, commandTowardCenterX(input.role, input.self))
    addRecommended(recommended, commandTowardCenterZ(input.self))
    reasons.push('You are close to a wall; prioritize a command that increases escape space.')
  }

  if (input.arenaPressure.selfNearCenterHazard) {
    addRecommended(recommended, commandAwayFromCenterX(input.role, input.self))
    addRecommended(recommended, commandAwayFromCenterZ(input.self))
    reasons.push('You are near the active center hazard; move out unless forcing a trade there.')
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
    shouldAvoidMovement(input.role, input.arena, input.self, input.range, input.arenaPressure, command),
  )

  return {
    recommended: availableRecommended.length > 0 ? uniqueCommands(availableRecommended) : ['brake'],
    avoid: uniqueCommands(avoid),
    reasons,
  }
}

function tacticalCues(input: {
  role: StoredRoleState
  opponentRole: StoredRoleState
  range: CombatTurnDecisionContext['range']
  positioning: CombatTurnDecisionContext['positioning']
  hazards: CombatTurnDecisionContext['hazards']
  health: CombatTurnDecisionContext['health']
  arenaPressure: CombatTurnDecisionContext['arenaPressure']
  actionReadiness: CombatTurnDecisionContext['actionReadiness']
  movementOptions: CombatTurnDecisionContext['movementOptions']
  recentEvents: string[]
}): string[] {
  const cues: string[] = []

  cues.push(
    'Submit exactly one command for the current combat tick; movement can be combined with weapon and utility actions.',
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
    cues.push('You are near a wall; avoid commands that reduce escape space.')
  }

  if (input.hazards.selfThreats.some((threat) => threat.inside)) {
    cues.push('You are inside an active hazard shape; leave the hazard before trading damage.')
  }

  if (input.hazards.threatenedLegalMoves.length > 0) {
    cues.push(
      `Hazard-threatened legal moves: ${input.hazards.threatenedLegalMoves
        .map((move) => move.command)
        .slice(0, 4)
        .join(', ')}.`,
    )
  }

  if (input.arenaPressure.opponentNearCenterHazard) {
    cues.push('Opponent is near the center hazard; lateral pressure may keep them there.')
  }

  if (input.movementOptions.avoid.length > 0) {
    cues.push(`Avoid low-value movement here: ${input.movementOptions.avoid.join(', ')}.`)
  }

  if (input.recentEvents.length > 0) {
    cues.push(`Recent resolved events: ${input.recentEvents.slice(-3).join(' | ')}`)
  }

  if (!input.role.normalizedSubmission && input.opponentRole.submittedAt) {
    cues.push('You do not have a normalized plan for this round; submit a legal round plan before combat decisions matter.')
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
): CombatTurnDecisionContext['previousResolvedTurn'] {
  const selfCommands = combat.commands[role]
  const opponentCommands = combat.commands[role === 'red' ? 'blue' : 'red']
  const self = selfCommands[selfCommands.length - 1]
  const opponent = opponentCommands[opponentCommands.length - 1]

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

function shouldCloseDistance(range: CombatTurnDecisionContext['range']): boolean {
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
  self: CombatBotSnapshot,
  range: CombatTurnDecisionContext['range'],
  arenaPressure: CombatTurnDecisionContext['arenaPressure'],
  command: MovementCommand,
): boolean {
  if (command === 'brake') {
    return range.band === 'long'
  }

  const projected = projectPosition(role, self, command)

  if (
    arenaPressure.selfNearWall &&
    distanceToNearestWallForPosition(arena, projected) < arenaPressure.selfDistanceToNearestWall
  ) {
    return true
  }

  if (arenaPressure.selfNearCenterHazard && centerDistance(projected) < centerDistance(self.position)) {
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

function commandAwayFromCenterX(role: TeamRole, self: CombatBotSnapshot): MovementCommand {
  const x = self.position[0]

  if (role === 'red') {
    return x >= 0 ? 'forward' : 'backward'
  }

  return x <= 0 ? 'forward' : 'backward'
}

function commandTowardCenterZ(self: CombatBotSnapshot): MovementCommand {
  return self.position[2] > 0 ? 'strafe_left' : 'strafe_right'
}

function commandAwayFromCenterZ(self: CombatBotSnapshot): MovementCommand {
  return self.position[2] >= 0 ? 'strafe_right' : 'strafe_left'
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

function uniqueCommands(commands: MovementCommand[]): MovementCommand[] {
  return [...new Set(commands)]
}

function distanceToNearestWall(
  combat: StoredCombatState,
  bot: CombatBotSnapshot,
): number {
  const [x, , z] = bot.position
  const halfWidth = combat.snapshot.arena.width / 2
  const halfHeight = combat.snapshot.arena.height / 2

  return round(Math.min(halfWidth - Math.abs(x), halfHeight - Math.abs(z)))
}

function distanceToNearestWallForPosition(
  arena: ArenaConfig,
  position: [number, number, number],
): number {
  const [x, , z] = position
  const halfWidth = arena.width / 2
  const halfHeight = arena.height / 2

  return round(Math.min(halfWidth - Math.abs(x), halfHeight - Math.abs(z)))
}

function positionToCell(
  arena: ArenaConfig,
  position: readonly number[],
): { x: number; z: number } {
  const cellSize = arena.topology?.grid.cellSize ?? 1

  return {
    x: Math.round(position[0] / cellSize),
    z: Math.round(position[2] / cellSize),
  }
}

function bearingToOpponent(
  dx: number,
  dz: number,
): CombatTurnDecisionContext['positioning']['bearingToOpponent'] {
  if (dx === 0 && dz === 0) {
    return 'same_cell'
  }

  if (Math.abs(dx) >= Math.abs(dz)) {
    return dx > 0 ? 'east' : 'west'
  }

  return dz > 0 ? 'south' : 'north'
}

function hasLineOfSight(
  arena: ArenaConfig,
  self: readonly number[],
  opponent: readonly number[],
): boolean {
  const blockingObstacles = arena.topology?.obstacles.filter((obstacle) => obstacle.blocksMovement) ?? []

  return !blockingObstacles.some((obstacle) => shapeNearSegment(obstacle.shape, self, opponent))
}

function hazardThreatsAt(
  arena: ArenaConfig,
  position: readonly number[],
): CombatTurnDecisionContext['hazards']['selfThreats'] {
  const activeHazards = new Set(arena.activeHazards)
  const hazards = arena.topology?.hazards ?? []

  return hazards
    .filter((hazard) => activeHazards.has(hazard.id) || activeHazards.has(hazard.type))
    .map((hazard) => {
      const distance = round(distanceToShape(hazard.shape, position))

      return {
        id: hazard.id,
        type: hazard.type,
        cell: positionToCell(arena, shapeCenter(hazard.shape)),
        distance,
        inside: distance === 0,
        damage: hazard.damage,
      }
    })
    .filter((threat) => threat.inside || threat.distance <= CENTER_HAZARD_DISTANCE)
}

function shapeNearSegment(
  shape: NonNullable<ArenaConfig['topology']>['obstacles'][number]['shape'],
  start: readonly number[],
  end: readonly number[],
): boolean {
  const center = shapeCenter(shape)
  const closest = closestPointOnSegment(center, start, end)

  return distanceToShape(shape, closest) === 0
}

function closestPointOnSegment(
  point: readonly number[],
  start: readonly number[],
  end: readonly number[],
): [number, number, number] {
  const startX = start[0]
  const startZ = start[2]
  const endX = end[0]
  const endZ = end[2]
  const dx = endX - startX
  const dz = endZ - startZ
  const lengthSquared = dx * dx + dz * dz

  if (lengthSquared === 0) {
    return [startX, 0, startZ]
  }

  const t = Math.max(0, Math.min(1, ((point[0] - startX) * dx + (point[2] - startZ) * dz) / lengthSquared))

  return [startX + t * dx, 0, startZ + t * dz]
}

function distanceToShape(
  shape: NonNullable<ArenaConfig['topology']>['hazards'][number]['shape'],
  position: readonly number[],
): number {
  const x = position[0]
  const z = position[2]

  if (shape.kind === 'circle') {
    return Math.max(0, Math.hypot(x - shape.center[0], z - shape.center[1]) - shape.radius)
  }

  const halfWidth = shape.size[0] / 2
  const halfHeight = shape.size[1] / 2
  const dx = Math.max(Math.abs(x - shape.center[0]) - halfWidth, 0)
  const dz = Math.max(Math.abs(z - shape.center[1]) - halfHeight, 0)

  return Math.hypot(dx, dz)
}

function shapeCenter(
  shape: NonNullable<ArenaConfig['topology']>['hazards'][number]['shape'],
): [number, number, number] {
  return [shape.center[0], 0, shape.center[1]]
}

function centerDistance(position: readonly number[]): number {
  return Math.hypot(position[0], position[2])
}

function nearCenterHazard(activeHazards: string[], bot: CombatBotSnapshot): boolean {
  return (
    hasCenterArenaHazard(activeHazards) &&
    Math.abs(bot.position[0]) <= CENTER_HAZARD_DISTANCE &&
    Math.abs(bot.position[2]) <= CENTER_HAZARD_DISTANCE
  )
}

function healthPct(bot: CombatBotSnapshot): number {
  return round(bot.maxHealth > 0 ? bot.health / bot.maxHealth : 0)
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
