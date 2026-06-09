import type {
  ActiveActionSet,
  CanonicalGameAction,
  CombatBoardAttackableCell,
  CombatBoardReachableCell,
  CombatBoardUtilityOption,
  CombatBudget,
  CombatTurnSnapshot,
  GameMasterActionKind,
  GameMasterLegalAction,
  GeneratedControls,
  GridCoord,
  MachineCapabilities,
  MachineWeaponCapability,
  MovementCommand,
  TeamRole,
  TurnCommand,
  Vector3,
  WeaponCommand,
} from '../../schemas/src/index.js'
import { combatActionId } from './actionIds.js'
import {
  arenaCellCenter,
  compileArenaTopology,
  hasArenaLineOfSight,
  pathHazards,
  worldToArenaCell,
} from './arenaTopology.js'
import {
  combatPreview,
  commandHasOffense,
  evaluateCombatCommand,
  movementCommandLabel,
  weaponFireModeRequiresEmitterBearing,
  weaponFireModeRequiresLineOfSight,
  type CombatActionLegality,
  type CombatWeaponLegalityOptions,
  type CombatLegalityContext,
} from './combatLegality.js'
import {
  gridDistance,
  isBlockedAnchorCell,
  isCellInsideArena,
  type TacticalMovementPlan,
} from './gridMovement.js'

export const COMBAT_ACTION_SCOPE = 'combat_turn'

export type CanonicalCombatActionPayload = {
  scope: typeof COMBAT_ACTION_SCOPE
  label: string
  summary: string
  command?: TurnCommand
  legality?: CombatActionLegality
  movementOverride?: BoardMovementOverride
}

export type BoardMovementOverride = {
  from: GridCoord
  to: GridCoord
  path: GridCoord[]
  mobilityCost: number
  mobilityRemaining: number
}

export type BuildCombatActionSetInput = {
  role: TeamRole
  round: number
  tick: number
  decisionVersion: number
  actionSetId: string
  createdAt: string
  catalogVersion: string
  arenaVersion: string
  expiresAt?: string
  snapshot: CombatTurnSnapshot
  controls?: GeneratedControls
  machineCapabilities?: MachineCapabilities
}

type CombatActionCandidate = {
  command: TurnCommand
  weaponOptions?: CombatWeaponLegalityOptions
  movementOverride?: BoardMovementOverride
}

export function buildCombatActionSet(input: BuildCombatActionSetInput): ActiveActionSet {
  const actions = buildCombatActions(input)

  return {
    actionSetId: input.actionSetId,
    role: input.role,
    phase: 'combat_turn',
    round: input.round,
    fightId: `fight_${input.round}`,
    turnId: `turn_${input.tick}`,
    decisionVersion: input.decisionVersion,
    catalogVersion: input.catalogVersion,
    arenaVersion: input.arenaVersion,
    createdAt: input.createdAt,
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    actions: Object.fromEntries(actions.map((action) => [action.id, action])),
  }
}

export function buildCombatActions(input: BuildCombatActionSetInput): CanonicalGameAction[] {
  const context = combatContext(input)
  const candidates = input.machineCapabilities
    ? machineCapabilityCandidates(input.tick, input.role, input.machineCapabilities, context)
    : generatedControlCandidates(input.tick, input.controls ?? { movement: ['brake'] })
  const actions = candidates
    .map((candidate) => combatActionFromCandidate(input, context, candidate))
    .filter((action): action is CanonicalGameAction => action !== undefined)

  return dedupeActions([...actions, surrenderAction(input)])
}

export function isCombatAction(action: CanonicalGameAction): boolean {
  return (action.payload as { scope?: unknown }).scope === COMBAT_ACTION_SCOPE
}

export function combatLegalActionForPacket(action: CanonicalGameAction): GameMasterLegalAction {
  const payload = action.payload as Partial<CanonicalCombatActionPayload>
  const gridDescriptor = payload.command && payload.legality?.preview
    ? gridActionDescriptor(action.kind, payload.command, payload.legality.preview)
    : undefined

  return {
    id: action.id,
    kind: action.kind,
    label: gridDescriptor?.label ?? payload.label ?? action.id,
    summary: gridDescriptor?.summary ?? payload.summary ?? 'Server-authored combat action.',
    ...(gridDescriptor?.parameterSchema ?? action.parameterSchema
      ? { parameterSchema: gridDescriptor?.parameterSchema ?? action.parameterSchema }
      : {}),
    ...(gridDescriptor?.parameterExamples ?? action.parameterExamples
      ? { parameterExamples: gridDescriptor?.parameterExamples ?? action.parameterExamples }
      : {}),
    ...(payload.legality?.preview ? { preview: payload.legality.preview } : {}),
  }
}

export function combatActionCommand(action: CanonicalGameAction): TurnCommand | undefined {
  if (!isCombatAction(action)) {
    return undefined
  }

  const command = (action.payload as Partial<CanonicalCombatActionPayload>).command

  return command ? { ...command } : undefined
}

export function combatActionMovementOverride(action: CanonicalGameAction): BoardMovementOverride | undefined {
  if (!isCombatAction(action)) {
    return undefined
  }

  const override = (action.payload as Partial<CanonicalCombatActionPayload>).movementOverride

  return override ? cloneBoardMovementOverride(override) : undefined
}

function combatActionFromCandidate(
  input: BuildCombatActionSetInput,
  context: CombatLegalityContext,
  candidate: CombatActionCandidate,
): CanonicalGameAction | undefined {
  const command = candidate.command
  const legality = candidate.movementOverride
    ? evaluateBoardCombatCommand(context, command, candidate.movementOverride, candidate.weaponOptions)
    : evaluateCombatCommand(context, command, candidate.weaponOptions)

  if (!legality.ok) {
    return undefined
  }

  const kind = actionKindForCommand(command)
  const descriptor = gridActionDescriptor(kind, command, legality.preview)

  return {
    id: combatActionId({
      role: input.role,
      round: input.round,
      tick: input.tick,
      kind,
      parts: actionIdPartsForCommand(kind, command, legality.preview),
    }),
    kind,
    role: input.role,
    ...(descriptor.parameterSchema ? { parameterSchema: descriptor.parameterSchema } : {}),
    ...(descriptor.parameterExamples ? { parameterExamples: descriptor.parameterExamples } : {}),
    payload: {
      scope: COMBAT_ACTION_SCOPE,
      label: descriptor.label,
      summary: descriptor.summary,
      command,
      legality,
      ...(candidate.movementOverride ? { movementOverride: cloneBoardMovementOverride(candidate.movementOverride) } : {}),
    },
  }
}

function surrenderAction(input: BuildCombatActionSetInput): CanonicalGameAction {
  return {
    id: combatActionId({
      role: input.role,
      round: input.round,
      tick: input.tick,
      kind: 'surrender',
      parts: ['concede_round'],
    }),
    kind: 'surrender',
    role: input.role,
    payload: {
      scope: COMBAT_ACTION_SCOPE,
      label: 'Surrender round',
      summary: 'Concede this round immediately; the opponent wins and combat ends.',
    },
  }
}

function combatContext(input: BuildCombatActionSetInput): CombatLegalityContext {
  return {
    arena: input.snapshot.arena,
    role: input.role,
    self: input.role === 'red' ? input.snapshot.red : input.snapshot.blue,
    opponent: input.role === 'red' ? input.snapshot.blue : input.snapshot.red,
  }
}

function generatedControlCandidates(tick: number, controls: GeneratedControls): CombatActionCandidate[] {
  return [
    commandCandidate(holdCommand(tick, controls)),
    ...movementCommands(tick, controls.movement).map(commandCandidate),
    ...weaponCommands(tick, controls.weaponA, 'weaponA').map(commandCandidate),
    ...weaponCommands(tick, controls.weaponB, 'weaponB').map(commandCandidate),
    ...utilityCommands(tick, controls).map(commandCandidate),
    ...moveAndAttackCommands(tick, controls).map(commandCandidate),
  ]
}

function machineCapabilityCandidates(
  tick: number,
  role: TeamRole,
  capabilities: MachineCapabilities,
  context: CombatLegalityContext,
): CombatActionCandidate[] {
  const reachable = reachableBoardMovementOverrides(context, capabilities)
  const movement = reachable.filter((plan) => plan.mobilityCost > 0)
  const weaponSlots = capabilities.weapons.slice(0, 2).map((weapon, index) => ({
    slot: index === 0 ? 'weaponA' as const : 'weaponB' as const,
    weapon,
  }))

  return [
    commandCandidate(holdCommand(tick)),
    ...movement.map((movementOverride) => ({
      command: {
        tick,
        move: movementCommandForBoardMove(role, movementOverride.from, movementOverride.to),
      },
      movementOverride,
    })),
    ...weaponSlots.flatMap(({ slot, weapon }) =>
      machineWeaponCommands(tick, role, movement, slot, weapon),
    ),
    ...machineUtilityCommands(tick, capabilities),
  ]
}

function commandCandidate(command: TurnCommand): CombatActionCandidate {
  return { command }
}

function holdCommand(tick: number, controls?: GeneratedControls): TurnCommand {
  return {
    tick,
    move: controls?.movement.includes('brake') === false ? undefined : 'brake',
    ...(controls?.weaponA?.includes('hold') ? { weaponA: 'hold' as const } : {}),
    ...(controls?.weaponB?.includes('hold') ? { weaponB: 'hold' as const } : {}),
    ...(controls?.utility?.includes('hold') ? { utility: 'hold' as const } : {}),
  }
}

function movementCommands(tick: number, movement: readonly MovementCommand[]): TurnCommand[] {
  return movement
    .filter((command) => command !== 'brake')
    .map((move) => ({ tick, move }))
}

function weaponCommands(
  tick: number,
  commands: readonly WeaponCommand[] | undefined,
  slot: 'weaponA' | 'weaponB',
): TurnCommand[] {
  return commands?.includes('fire') ? [{ tick, [slot]: 'fire' }] : []
}

function utilityCommands(tick: number, controls: GeneratedControls): TurnCommand[] {
  return controls.utility?.includes('activate') ? [{ tick, utility: 'activate' }] : []
}

function moveAndAttackCommands(tick: number, controls: GeneratedControls): TurnCommand[] {
  const firstWeapon = controls.weaponA?.includes('fire')
    ? 'weaponA'
    : controls.weaponB?.includes('fire')
      ? 'weaponB'
      : undefined

  if (!firstWeapon) {
    return []
  }

  return controls.movement
    .filter((move) => move !== 'brake')
    .map((move) => ({ tick, move, [firstWeapon]: 'fire' }))
}

function machineWeaponCommands(
  tick: number,
  role: TeamRole,
  movement: readonly BoardMovementOverride[],
  slot: 'weaponA' | 'weaponB',
  weapon: MachineWeaponCapability,
): CombatActionCandidate[] {
  const weaponOptions = {
    weaponRange: weapon.range,
    emitterAxis: weapon.emitterAxis,
    fireMode: weapon.fireMode,
  }

  return [
    { command: { tick, [slot]: 'fire' }, weaponOptions },
    ...movement.map((movementOverride) => ({
      command: {
        tick,
        move: movementCommandForBoardMove(role, movementOverride.from, movementOverride.to),
        [slot]: 'fire',
      },
      weaponOptions,
      movementOverride,
    })),
  ]
}

function machineUtilityCommands(
  tick: number,
  capabilities: MachineCapabilities,
): CombatActionCandidate[] {
  return capabilities.utility.length > 0
    ? [commandCandidate({ tick, utility: 'activate' })]
    : []
}

function reachableBoardMovementOverrides(
  context: CombatLegalityContext,
  capabilities: MachineCapabilities,
): BoardMovementOverride[] {
  const budget = machineMobilityBudget(capabilities)

  if (budget <= 0) {
    return []
  }

  const topology = compileArenaTopology(context.arena)
  const from = worldToArenaCell(topology, context.self.position)
  const queue: BoardMovementOverride[] = [{
    from: cloneCell(from),
    to: cloneCell(from),
    path: [],
    mobilityCost: 0,
    mobilityRemaining: budget,
  }]
  const reachable = new Map<string, BoardMovementOverride>([[cellKey(from), queue[0]]])
  const directions: readonly GridCoord[] = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
  ]

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]

    if (current.mobilityCost >= budget) {
      continue
    }

    for (const direction of directions) {
      const next = {
        x: current.to.x + direction.x,
        z: current.to.z + direction.z,
      }
      const key = cellKey(next)
      const cost = current.mobilityCost + 1

      if (
        reachable.has(key) ||
        !isCellInsideArena(context.arena, next) ||
        isBlockedAnchorCell(topology, next)
      ) {
        continue
      }

      const plan = {
        from: cloneCell(from),
        to: cloneCell(next),
        path: [...current.path.map(cloneCell), cloneCell(next)],
        mobilityCost: cost,
        mobilityRemaining: budget - cost,
      }

      reachable.set(key, plan)
      queue.push(plan)
    }
  }

  return [...reachable.values()].sort((left, right) =>
    left.mobilityCost - right.mobilityCost ||
    left.to.x - right.to.x ||
    left.to.z - right.to.z
  )
}

function machineMobilityBudget(capabilities: MachineCapabilities): number {
  return Math.max(
    0,
    ...capabilities.movement.map((movement) => Math.max(0, Math.floor(movement.moveBudget))),
  )
}

function movementCommandForBoardMove(
  role: TeamRole,
  from: GridCoord,
  to: GridCoord,
): MovementCommand {
  const delta = {
    x: to.x - from.x,
    z: to.z - from.z,
  }

  if (delta.x === 0 && delta.z === 0) {
    return 'brake'
  }

  const forward = role === 'red' ? 1 : -1
  const forwardDelta = delta.x * forward

  if (forwardDelta > 0 && delta.z !== 0) {
    return delta.z < 0 ? 'circle_left' : 'circle_right'
  }

  if (Math.abs(delta.x) >= Math.abs(delta.z)) {
    if (forwardDelta > 0) {
      return Math.abs(delta.x) > 1 ? 'dash_forward' : 'forward'
    }

    return Math.abs(delta.x) > 1 ? 'dash_backward' : 'backward'
  }

  return delta.z < 0 ? 'strafe_left' : 'strafe_right'
}

function evaluateBoardCombatCommand(
  context: CombatLegalityContext,
  command: TurnCommand,
  movementOverride: BoardMovementOverride,
  weaponOptions: CombatWeaponLegalityOptions = {},
): CombatActionLegality {
  const movement = boardMovementPlanForCombatAction(context, command, movementOverride)
  const reasons: string[] = []

  if (!sameCell(movement.from, movementOverride.from)) {
    reasons.push('Movement action was authored for a different starting cell.')
  }
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

export function boardMovementPlanForCombatAction(
  context: CombatLegalityContext,
  command: TurnCommand,
  movementOverride: BoardMovementOverride,
): TacticalMovementPlan {
  const topology = compileArenaTopology(context.arena)
  const from = worldToArenaCell(topology, context.self.position)
  const opponent = worldToArenaCell(topology, context.opponent.position)
  const fromWorld = arenaCellCenter(topology, from)
  const toWorld = arenaCellCenter(topology, movementOverride.to)
  const opponentWorld = arenaCellCenter(topology, opponent)
  const path = movementOverride.path.map(cloneCell)

  return {
    command: command.move,
    from,
    to: cloneCell(movementOverride.to),
    path,
    blocked: path.some((cell) => isBlockedAnchorCell(topology, cell)),
    outOfBounds: !isCellInsideArena(context.arena, from) ||
      !isCellInsideArena(context.arena, movementOverride.to) ||
      path.some((cell) => !isCellInsideArena(context.arena, cell)),
    hazardCells: uniqueCells(
      pathHazards(topology, fromWorld, toWorld, 0.5).map((hazard) => hazard.cell),
    ),
    lineOfSightToOpponent: hasArenaLineOfSight(topology, toWorld, opponentWorld),
    rangeToOpponent: gridDistance(movementOverride.to, opponent),
  }
}


function actionKindForCommand(command: TurnCommand): GameMasterActionKind {
  if (command.move && command.move !== 'brake' && commandHasOffense(command)) {
    return 'move_and_attack'
  }
  if (command.move && command.move !== 'brake') {
    return 'move'
  }
  if (command.weaponA === 'fire' || command.weaponB === 'fire') {
    return 'attack'
  }
  if (command.utility === 'activate') {
    return 'use_utility'
  }

  return 'hold'
}

function gridActionDescriptor(
  kind: GameMasterActionKind,
  command: TurnCommand,
  preview: NonNullable<GameMasterLegalAction['preview']>,
): Pick<GameMasterLegalAction, 'label' | 'summary' | 'parameterSchema' | 'parameterExamples'> {
  const finalAnchor = preview.finalPose?.anchor
  const target = preview.target

  if (kind === 'move' && finalAnchor) {
    const destinationCellId = cellIdFor(finalAnchor)

    return {
      label: `Move to ${cellLabel(finalAnchor)}`,
      summary: gridSummary(`Move to destination cell ${destinationCellId}.`, preview),
      parameterSchema: {
        type: 'object',
        required: ['destinationCellId'],
        properties: {
          destinationCellId: {
            type: 'string',
            label: 'Destination cell',
            summary: 'Grid cell where this movement action ends.',
            enum: [destinationCellId],
          },
        },
      },
      parameterExamples: [{ destinationCellId }],
    }
  }

  if (kind === 'attack' && target) {
    const targetCellId = cellIdFor(target)

    return {
      label: `Attack opponent at ${cellLabel(target)}`,
      summary: gridSummary(`Attack target opponent on cell ${targetCellId}.`, preview),
      parameterSchema: {
        type: 'object',
        required: ['targetId', 'targetCellId'],
        properties: {
          targetId: {
            type: 'string',
            label: 'Target',
            summary: 'Server-authored attack target.',
            enum: ['opponent'],
          },
          targetCellId: {
            type: 'string',
            label: 'Target cell',
            summary: 'Grid cell occupied by the selected target.',
            enum: [targetCellId],
          },
        },
      },
      parameterExamples: [{ targetId: 'opponent', targetCellId }],
    }
  }

  if (kind === 'move_and_attack' && finalAnchor && target) {
    const destinationCellId = cellIdFor(finalAnchor)
    const targetCellId = cellIdFor(target)

    return {
      label: `Move to ${cellLabel(finalAnchor)} and attack opponent at ${cellLabel(target)}`,
      summary: gridSummary(
        `Move to destination cell ${destinationCellId}, then attack opponent on cell ${targetCellId}.`,
        preview,
      ),
      parameterSchema: {
        type: 'object',
        required: ['destinationCellId', 'targetId', 'targetCellId'],
        properties: {
          destinationCellId: {
            type: 'string',
            label: 'Destination cell',
            summary: 'Grid cell where this movement action ends before attacking.',
            enum: [destinationCellId],
          },
          targetId: {
            type: 'string',
            label: 'Target',
            summary: 'Server-authored attack target.',
            enum: ['opponent'],
          },
          targetCellId: {
            type: 'string',
            label: 'Target cell',
            summary: 'Grid cell occupied by the selected target.',
            enum: [targetCellId],
          },
        },
      },
      parameterExamples: [{ destinationCellId, targetId: 'opponent', targetCellId }],
    }
  }

  if (kind === 'use_utility' && finalAnchor) {
    const sourceCellId = cellIdFor(finalAnchor)

    return {
      label: `Use utility at ${cellLabel(finalAnchor)}`,
      summary: gridSummary(`Use utility from source cell ${sourceCellId}.`, preview),
      parameterSchema: {
        type: 'object',
        required: ['sourceCellId'],
        properties: {
          sourceCellId: {
            type: 'string',
            label: 'Source cell',
            summary: 'Grid cell where the utility action is activated.',
            enum: [sourceCellId],
          },
        },
      },
      parameterExamples: [{ sourceCellId }],
    }
  }

  if (finalAnchor) {
    return {
      label: `Hold at ${cellLabel(finalAnchor)}`,
      summary: gridSummary(`Hold position on cell ${cellIdFor(finalAnchor)}.`, preview),
    }
  }

  return {
    label: movementCommandLabel(command.move),
    summary: 'Server-authored grid combat action.',
  }
}

function gridSummary(prefix: string, preview: NonNullable<GameMasterLegalAction['preview']>): string {
  const details = [
    preview.expectedRangeIfOpponentHolds !== undefined
      ? `${preview.expectedRangeIfOpponentHolds} cells from target`
      : undefined,
    preview.currentLineOfSight !== undefined
      ? `line of sight ${preview.currentLineOfSight ? 'clear' : 'blocked'}`
      : undefined,
    preview.hazardExposure !== undefined
      ? `${preview.hazardExposure} hazard cells crossed`
      : undefined,
  ].filter((detail): detail is string => detail !== undefined)

  return details.length > 0 ? `${prefix} ${details.join('; ')}.` : prefix
}

function actionIdPartsForCommand(
  kind: GameMasterActionKind,
  command: TurnCommand,
  preview: NonNullable<GameMasterLegalAction['preview']>,
): string[] {
  const finalAnchor = preview.finalPose?.anchor
  const target = preview.target

  if (kind === 'move_and_attack') {
    return [
      finalAnchor ? `to_${cellActionPart(finalAnchor)}` : 'move',
      target ? `target_${cellActionPart(target)}` : 'target',
      weaponActionPart(command),
    ]
  }
  if (kind === 'move') {
    return [finalAnchor ? `to_${cellActionPart(finalAnchor)}` : 'move']
  }
  if (kind === 'attack') {
    return [
      target ? `target_${cellActionPart(target)}` : 'target',
      weaponActionPart(command),
    ]
  }
  if (kind === 'use_utility') {
    return [finalAnchor ? `source_${cellActionPart(finalAnchor)}` : 'source', 'utility']
  }

  return [
    finalAnchor ? `cell_${cellActionPart(finalAnchor)}` : 'cell_current',
    'hold',
  ]
}

function weaponActionPart(command: TurnCommand): string {
  if (command.weaponA === 'fire') {
    return 'weapon_a'
  }
  if (command.weaponB === 'fire') {
    return 'weapon_b'
  }

  return 'attack'
}

function cellLabel(cell: { x: number; z: number }): string {
  return `cell (${cell.x}, ${cell.z})`
}

function cellIdFor(cell: { x: number; z: number }): string {
  return `cell:${cell.x}:${cell.z}`
}

function cellActionPart(cell: { x: number; z: number }): string {
  return `x${signedActionNumber(cell.x)}_z${signedActionNumber(cell.z)}`
}

function signedActionNumber(value: number): string {
  return value < 0 ? `n${Math.abs(value)}` : `p${value}`
}

function firesWeapon(command: TurnCommand): boolean {
  return command.weaponA === 'fire' || command.weaponB === 'fire'
}

function emitterAxisTargetsOpponent(
  context: CombatLegalityContext,
  finalAnchor: GridCoord,
  emitterAxis: Vector3,
): boolean {
  const opponent = opponentAnchor(context)
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

function opponentAnchor(context: CombatLegalityContext): GridCoord {
  return worldToArenaCell(compileArenaTopology(context.arena), context.opponent.position)
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

function uniqueCells(cells: GridCoord[]): GridCoord[] {
  const seen = new Set<string>()
  const unique: GridCoord[] = []

  for (const cell of cells) {
    const key = cellKey(cell)

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(cloneCell(cell))
    }
  }

  return unique
}

function cloneBoardMovementOverride(override: BoardMovementOverride): BoardMovementOverride {
  return {
    from: cloneCell(override.from),
    to: cloneCell(override.to),
    path: override.path.map(cloneCell),
    mobilityCost: override.mobilityCost,
    mobilityRemaining: override.mobilityRemaining,
  }
}

function cloneCell<T extends GridCoord>(cell: T): T {
  return { ...cell }
}

function sameCell(left: GridCoord, right: GridCoord): boolean {
  return left.x === right.x && left.z === right.z
}

function cellKey(cell: GridCoord): string {
  return `${cell.x},${cell.z}`
}

function dedupeActions(actions: CanonicalGameAction[]): CanonicalGameAction[] {
  const seen = new Set<string>()
  const deduped: CanonicalGameAction[] = []

  for (const action of actions) {
    if (!seen.has(action.id)) {
      seen.add(action.id)
      deduped.push(action)
    }
  }

  return deduped
}

export type BuildCombatPlanAffordancesInput = {
  role: TeamRole
  snapshot: CombatTurnSnapshot
  budget: CombatBudget
  machineCapabilities?: MachineCapabilities
}

export type CombatPlanAffordanceSet = {
  budget: CombatBudget
  reachableCells: CombatBoardReachableCell[]
  attackableCells: CombatBoardAttackableCell[]
  utilityOptions: CombatBoardUtilityOption[]
}

export function buildCombatPlanAffordances(input: BuildCombatPlanAffordancesInput): CombatPlanAffordanceSet {
  const topology = compileArenaTopology(input.snapshot.arena)
  const self = input.role === 'red' ? input.snapshot.red : input.snapshot.blue
  const opponent = input.role === 'red' ? input.snapshot.blue : input.snapshot.red
  const selfAnchor = worldToArenaCell(topology, self.position)
  const opponentAnchorCell = worldToArenaCell(topology, opponent.position)
  const reachableCells = reachableCombatPlanCells({
    snapshot: input.snapshot,
    role: input.role,
    start: selfAnchor,
    opponent: opponentAnchorCell,
    budget: input.budget,
  })
  const attackableCells = attackableCombatPlanCells({
    snapshot: input.snapshot,
    role: input.role,
    selfReachableCells: reachableCells,
    opponent: opponentAnchorCell,
    weaponSlotCount: Math.max(0, Math.min(2, self.weaponSlotCount)),
    weaponReach: Math.max(1, Math.ceil(self.weaponReach)),
    budget: input.budget,
  })
  const utilityOptions = self.hasUtilityControl && input.budget.actionTime > 0
    ? [
        {
          utilityId: 'primary_utility',
          cellId: cellIdFor(selfAnchor),
          actionTimeCost: 1,
          summary: 'Spend utility action time from the current anchor cell.',
        },
      ]
    : []

  return {
    budget: cloneCombatBudget(input.budget),
    reachableCells,
    attackableCells,
    utilityOptions,
  }
}

function reachableCombatPlanCells(input: {
  snapshot: CombatTurnSnapshot
  role: TeamRole
  start: GridCoord
  opponent: GridCoord
  budget: CombatBudget
}): CombatBoardReachableCell[] {
  const topology = compileArenaTopology(input.snapshot.arena)
  const limit = Math.max(0, Math.floor(input.budget.movement))
  const queue: Array<{ cell: GridCoord; cost: number }> = [{ cell: cloneCell(input.start), cost: 0 }]
  const bestCost = new Map<string, number>([[cellKey(input.start), 0]])

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]

    if (current.cost >= limit) {
      continue
    }

    for (const next of adjacentPlanCells(current.cell)) {
      if (!isCellInsideArena(input.snapshot.arena, next) || isBlockedAnchorCell(topology, next)) {
        continue
      }

      if (sameCell(next, input.opponent)) {
        // The plan can intentionally path into contact, but not occupy the opponent's anchor as a passive reachable cell.
        continue
      }

      const nextCost = current.cost + 1
      const key = cellKey(next)
      const prior = bestCost.get(key)

      if (prior !== undefined && prior <= nextCost) {
        continue
      }

      bestCost.set(key, nextCost)
      queue.push({ cell: next, cost: nextCost })
    }
  }

  return [...bestCost.entries()]
    .map(([key, moveCost]) => {
      const [xRaw, zRaw] = key.split(',')
      const cell = { x: Number(xRaw), z: Number(zRaw) }
      const position = arenaCellCenter(topology, cell)
      const hazards = pathHazards(topology, arenaCellCenter(topology, input.start), position, 0.5)

      return {
        cellId: cellIdFor(cell),
        x: cell.x,
        z: cell.z,
        moveCost,
        movementRemaining: Math.max(0, input.budget.movement - moveCost),
        hazard: hazards.length > 0,
        ...(hazards.length > 0 ? { hazardIds: hazards.map((hazard) => hazard.id) } : {}),
      }
    })
    .sort((left, right) => left.moveCost - right.moveCost || left.x - right.x || left.z - right.z)
}

function attackableCombatPlanCells(input: {
  snapshot: CombatTurnSnapshot
  role: TeamRole
  selfReachableCells: CombatBoardReachableCell[]
  opponent: GridCoord
  weaponSlotCount: number
  weaponReach: number
  budget: CombatBudget
}): CombatBoardAttackableCell[] {
  if (input.weaponSlotCount <= 0 || input.budget.actionTime <= 0) {
    return []
  }

  const topology = compileArenaTopology(input.snapshot.arena)
  const slots: Array<'weaponA' | 'weaponB'> = input.weaponSlotCount > 1 ? ['weaponA', 'weaponB'] : ['weaponA']
  const cells: CombatBoardAttackableCell[] = []
  const targetWorld = arenaCellCenter(topology, input.opponent)

  for (const reachable of input.selfReachableCells) {
    const anchor = { x: reachable.x, z: reachable.z }
    const distance = gridDistance(anchor, input.opponent)

    if (distance > input.weaponReach) {
      continue
    }

    if (!hasArenaLineOfSight(topology, arenaCellCenter(topology, anchor), targetWorld)) {
      continue
    }

    for (const slot of slots) {
      const cooldown = input.budget.weaponCooldowns[slot] ?? 0

      if (cooldown > 0) {
        continue
      }

      cells.push({
        cellId: cellIdFor(input.opponent),
        x: input.opponent.x,
        z: input.opponent.z,
        weaponSlot: slot,
        range: input.weaponReach,
        distance,
        actionTimeCost: 1,
      })
    }
  }

  return dedupeAttackableCells(cells)
}

function adjacentPlanCells(cell: GridCoord): GridCoord[] {
  return [
    { x: cell.x + 1, z: cell.z },
    { x: cell.x - 1, z: cell.z },
    { x: cell.x, z: cell.z + 1 },
    { x: cell.x, z: cell.z - 1 },
  ]
}

function dedupeAttackableCells(cells: CombatBoardAttackableCell[]): CombatBoardAttackableCell[] {
  const seen = new Set<string>()
  const deduped: CombatBoardAttackableCell[] = []

  for (const cell of cells.sort((left, right) => left.distance - right.distance || left.weaponSlot.localeCompare(right.weaponSlot))) {
    const key = `${cell.cellId}:${cell.weaponSlot}`

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(cell)
  }

  return deduped
}

function cloneCombatBudget(budget: CombatBudget): CombatBudget {
  return {
    movement: budget.movement,
    actionTime: budget.actionTime,
    weaponCooldowns: { ...budget.weaponCooldowns },
  }
}
