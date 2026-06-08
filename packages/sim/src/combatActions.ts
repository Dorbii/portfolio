import { MOVEMENT_COMMANDS } from '../../schemas/src/index.js'
import type {
  ActiveActionSet,
  CanonicalGameAction,
  CombatTurnSnapshot,
  GameMasterActionKind,
  GameMasterLegalAction,
  GeneratedControls,
  MachineCapabilities,
  MachineMovementCapability,
  MachineWeaponCapability,
  MovementCommand,
  TeamRole,
  TurnCommand,
  WeaponCommand,
} from '../../schemas/src/index.js'
import { combatActionId } from './actionIds.js'
import {
  commandHasOffense,
  evaluateCombatCommand,
  movementCommandLabel,
  type CombatWeaponLegalityOptions,
  type CombatLegalityContext,
} from './combatLegality.js'
import { machineMovementCommandSupported } from './machineMovement.js'

export const COMBAT_ACTION_SCOPE = 'combat_turn'

export type CanonicalCombatActionPayload = {
  scope: typeof COMBAT_ACTION_SCOPE
  label: string
  summary: string
  command: TurnCommand
  legality: ReturnType<typeof evaluateCombatCommand>
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
    ? machineCapabilityCandidates(input.tick, input.role, input.machineCapabilities)
    : generatedControlCandidates(input.tick, input.controls ?? { movement: ['brake'] })
  const actions = candidates
    .map((candidate) => combatActionFromCandidate(input, context, candidate))
    .filter((action): action is CanonicalGameAction => action !== undefined)

  return dedupeActions(actions)
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

function combatActionFromCandidate(
  input: BuildCombatActionSetInput,
  context: CombatLegalityContext,
  candidate: CombatActionCandidate,
): CanonicalGameAction | undefined {
  const command = candidate.command
  const legality = evaluateCombatCommand(context, command, candidate.weaponOptions)

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
      parts: actionIdPartsForCommand(command, legality.preview),
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
): CombatActionCandidate[] {
  const movement = machineMovementCommands(role, capabilities.movement)
  const weaponSlots = capabilities.weapons.slice(0, 2).map((weapon, index) => ({
    slot: index === 0 ? 'weaponA' as const : 'weaponB' as const,
    weapon,
  }))

  return [
    commandCandidate(holdCommand(tick)),
    ...movement.map((move) => commandCandidate({ tick, move })),
    ...weaponSlots.flatMap(({ slot, weapon }) => machineWeaponCommands(tick, movement, slot, weapon)),
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

function machineMovementCommands(
  role: TeamRole,
  capabilities: readonly MachineMovementCapability[],
): MovementCommand[] {
  if (capabilities.length === 0) {
    return []
  }

  return MOVEMENT_COMMANDS.filter((command) =>
    command !== 'brake' &&
    capabilities.some((capability) => machineMovementCommandSupported(role, capability, command)),
  )
}

function machineWeaponCommands(
  tick: number,
  movement: readonly MovementCommand[],
  slot: 'weaponA' | 'weaponB',
  weapon: MachineWeaponCapability,
): CombatActionCandidate[] {
  const weaponOptions = {
    weaponRange: weapon.range,
    emitterAxis: weapon.emitterAxis,
  }

  return [
    { command: { tick, [slot]: 'fire' }, weaponOptions },
    ...movement.map((move) => ({
      command: { tick, move, [slot]: 'fire' },
      weaponOptions,
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
  command: TurnCommand,
  preview: NonNullable<GameMasterLegalAction['preview']>,
): string[] {
  const finalAnchor = preview.finalPose?.anchor
  const target = preview.target

  if (command.move && command.move !== 'brake' && commandHasOffense(command)) {
    return [
      finalAnchor ? `to_${cellActionPart(finalAnchor)}` : 'move',
      target ? `target_${cellActionPart(target)}` : 'target',
      weaponActionPart(command),
    ]
  }
  if (command.move && command.move !== 'brake') {
    return [finalAnchor ? `to_${cellActionPart(finalAnchor)}` : 'move']
  }
  if (command.weaponA === 'fire' || command.weaponB === 'fire') {
    return [
      target ? `target_${cellActionPart(target)}` : 'target',
      weaponActionPart(command),
    ]
  }
  if (command.utility === 'activate') {
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
