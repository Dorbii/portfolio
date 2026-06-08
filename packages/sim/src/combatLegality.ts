import type {
  ArenaConfig,
  CombatBotSnapshot,
  GameMasterLegalAction,
  GridCoord,
  MachineWeaponCapability,
  MovementCommand,
  TeamRole,
  TurnCommand,
  Vector3,
} from '../../schemas/src/index.js'
import {
  gridDistance,
  tacticalMovementPlan,
  type TacticalMovementPlan,
} from './gridMovement.js'

export type CombatLegalityContext = {
  arena: ArenaConfig
  role: TeamRole
  self: CombatBotSnapshot
  opponent: CombatBotSnapshot
}

export type CombatActionLegality = {
  ok: boolean
  reasons: string[]
  preview: NonNullable<GameMasterLegalAction['preview']>
  movement: TacticalMovementPlan
}

export type CombatWeaponLegalityOptions = {
  weaponRange?: number
  emitterAxis?: Vector3
  fireMode?: MachineWeaponCapability['fireMode']
}

export function evaluateCombatCommand(
  context: CombatLegalityContext,
  command: TurnCommand,
  weaponOptions: CombatWeaponLegalityOptions = {},
): CombatActionLegality {
  const movement = tacticalMovementPlan({
    arena: context.arena,
    role: context.role,
    from: context.self.position,
    opponent: context.opponent.position,
    command: command.move,
  })
  const reasons: string[] = []

  if (movement.outOfBounds) {
    reasons.push('Movement path leaves arena bounds.')
  }
  if (movement.blocked) {
    reasons.push('Movement path crosses a blocked anchor cell.')
  }
  if (
    firesWeapon(command) &&
    weaponFireModeRequiresLineOfSight(weaponOptions.fireMode) &&
    !movement.lineOfSightToOpponent
  ) {
    reasons.push('Target is not in line of sight from final anchor cell.')
  }
  if (
    firesWeapon(command) &&
    weaponOptions.emitterAxis &&
    weaponFireModeRequiresEmitterBearing(weaponOptions.fireMode) &&
    !emitterAxisTargetsOpponent(context, movement.to, weaponOptions.emitterAxis)
  ) {
    reasons.push('Weapon emitter axis cannot bear on the opponent from final anchor cell.')
  }
  if (firesWeapon(command) && movement.rangeToOpponent > Math.ceil(weaponOptions.weaponRange ?? context.self.weaponReach)) {
    reasons.push('Target is out of weapon range from final anchor cell.')
  }

  return {
    ok: reasons.length === 0,
    reasons,
    movement,
    preview: combatPreview(context, command, movement),
  }
}

export function combatPreview(
  context: CombatLegalityContext,
  command: TurnCommand,
  movement = tacticalMovementPlan({
    arena: context.arena,
    role: context.role,
    from: context.self.position,
    opponent: context.opponent.position,
    command: command.move,
  }),
): NonNullable<GameMasterLegalAction['preview']> {
  const riskTags: string[] = []
  const opponentAnchor = tacticalMovementPlan({
    arena: context.arena,
    role: opponentRole(context.role),
    from: context.opponent.position,
    opponent: context.self.position,
    command: 'brake',
  }).from

  if (sameCell(movement.to, opponentAnchor)) {
    riskTags.push('occupied_anchor_conflict')
  }
  if (movement.hazardCells.length > 0) {
    riskTags.push('hazard_exposure')
  }
  if (movement.blocked) {
    riskTags.push('blocked_path')
  }
  if (movement.outOfBounds) {
    riskTags.push('arena_bounds')
  }

  return {
    basis: 'current_snapshot',
    outcome: 'estimated',
    path: movement.path.map(cloneCell),
    finalPose: {
      anchor: cloneCell(movement.to),
      facing: context.role === 'red' ? 'east' : 'west',
    },
    target: cloneCell(opponentAnchor),
    currentLineOfSight: movement.lineOfSightToOpponent,
    expectedRangeIfOpponentHolds: movement.rangeToOpponent,
    hazardExposure: movement.hazardCells.length,
    ...(riskTags.length > 0 ? { riskTags } : {}),
  }
}

export function commandHasOffense(command: TurnCommand): boolean {
  return firesWeapon(command) || command.utility === 'activate'
}

export function weaponFireModeRequiresLineOfSight(
  fireMode: MachineWeaponCapability['fireMode'] | undefined,
): boolean {
  return fireMode !== 'sweep'
}

export function weaponFireModeRequiresEmitterBearing(
  fireMode: MachineWeaponCapability['fireMode'] | undefined,
): boolean {
  return fireMode !== 'sweep'
}

export function movementCommandLabel(command?: MovementCommand): string {
  switch (command) {
    case 'forward':
      return 'Advance'
    case 'backward':
      return 'Reverse'
    case 'dash_forward':
      return 'Dash forward'
    case 'dash_backward':
      return 'Dash backward'
    case 'strafe_left':
      return 'Strafe left'
    case 'strafe_right':
      return 'Strafe right'
    case 'circle_left':
      return 'Circle left'
    case 'circle_right':
      return 'Circle right'
    case 'turn_left':
      return 'Turn left'
    case 'turn_right':
      return 'Turn right'
    case 'brake':
    case undefined:
      return 'Hold position'
  }
}

export function describeRange(context: CombatLegalityContext, finalAnchor: GridCoord): string {
  const opponent = tacticalMovementPlan({
    arena: context.arena,
    role: opponentRole(context.role),
    from: context.opponent.position,
    opponent: context.self.position,
    command: 'brake',
  }).from

  return `${gridDistance(finalAnchor, opponent)} cells from target`
}

function firesWeapon(command: TurnCommand): boolean {
  return command.weaponA === 'fire' || command.weaponB === 'fire'
}

function emitterAxisTargetsOpponent(
  context: CombatLegalityContext,
  finalAnchor: GridCoord,
  emitterAxis: Vector3,
): boolean {
  const opponent = tacticalMovementPlan({
    arena: context.arena,
    role: opponentRole(context.role),
    from: context.opponent.position,
    opponent: context.self.position,
    command: 'brake',
  }).from
  const target = normalizePlanarVector({
    x: opponent.x - finalAnchor.x,
    z: opponent.z - finalAnchor.z,
  })

  if (!target) {
    return true
  }

  const emitter = normalizePlanarVector({
    x: emitterAxis[0],
    z: emitterAxis[2],
  })

  if (!emitter) {
    return false
  }

  return emitter.x * target.x + emitter.z * target.z >= 0.65
}

function normalizePlanarVector(vector: GridCoord): GridCoord | undefined {
  const length = Math.hypot(vector.x, vector.z)

  if (length === 0) {
    return undefined
  }

  return {
    x: vector.x / length,
    z: vector.z / length,
  }
}

function opponentRole(role: TeamRole): TeamRole {
  return role === 'red' ? 'blue' : 'red'
}

function sameCell(left: GridCoord, right: GridCoord): boolean {
  return left.x === right.x && left.z === right.z
}

function cloneCell(cell: GridCoord): GridCoord {
  return { x: cell.x, z: cell.z }
}
