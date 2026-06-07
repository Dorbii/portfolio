import type {
  ActiveActionSet,
  CanonicalGameAction,
  CombatTurnSnapshot,
  GameMasterActionKind,
  GameMasterLegalAction,
  GeneratedControls,
  MovementCommand,
  TeamRole,
  TurnCommand,
  WeaponCommand,
} from '../../schemas/src/index.js'
import { combatActionId } from './actionIds.js'
import {
  commandHasOffense,
  describeRange,
  evaluateCombatCommand,
  movementCommandLabel,
  type CombatLegalityContext,
} from './combatLegality.js'

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
  const controls = input.controls ?? { movement: ['brake'] }
  const candidates: TurnCommand[] = [
    holdCommand(input.tick, controls),
    ...movementCommands(input.tick, controls.movement),
    ...weaponCommands(input.tick, controls.weaponA, 'weaponA'),
    ...weaponCommands(input.tick, controls.weaponB, 'weaponB'),
    ...utilityCommands(input.tick, controls),
    ...moveAndAttackCommands(input.tick, controls),
  ]
  const actions = candidates
    .map((command) => combatActionFromCommand(input, context, command))
    .filter((action): action is CanonicalGameAction => action !== undefined)

  return dedupeActions(actions)
}

export function isCombatAction(action: CanonicalGameAction): boolean {
  return (action.payload as { scope?: unknown }).scope === COMBAT_ACTION_SCOPE
}

export function combatLegalActionForPacket(action: CanonicalGameAction): GameMasterLegalAction {
  const payload = action.payload as Partial<CanonicalCombatActionPayload>

  return {
    id: action.id,
    kind: action.kind,
    label: payload.label ?? action.id,
    summary: payload.summary ?? 'Server-authored combat action.',
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

function combatActionFromCommand(
  input: BuildCombatActionSetInput,
  context: CombatLegalityContext,
  command: TurnCommand,
): CanonicalGameAction | undefined {
  const legality = evaluateCombatCommand(context, command)

  if (!legality.ok) {
    return undefined
  }

  const kind = actionKindForCommand(command)
  const label = labelForCommand(command)
  const summary = summaryForCommand(
    context,
    command,
    legality.preview.finalPose?.anchor ?? legality.movement.to,
  )

  return {
    id: combatActionId({
      role: input.role,
      round: input.round,
      tick: input.tick,
      kind,
      parts: actionIdPartsForCommand(command),
    }),
    kind,
    role: input.role,
    payload: {
      scope: COMBAT_ACTION_SCOPE,
      label,
      summary,
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

function holdCommand(tick: number, controls: GeneratedControls): TurnCommand {
  return {
    tick,
    move: controls.movement.includes('brake') ? 'brake' : undefined,
    ...(controls.weaponA?.includes('hold') ? { weaponA: 'hold' as const } : {}),
    ...(controls.weaponB?.includes('hold') ? { weaponB: 'hold' as const } : {}),
    ...(controls.utility?.includes('hold') ? { utility: 'hold' as const } : {}),
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

function labelForCommand(command: TurnCommand): string {
  const movement = movementCommandLabel(command.move)

  if (command.weaponA === 'fire') {
    return command.move && command.move !== 'brake' ? `${movement} and fire weapon A` : 'Fire weapon A'
  }
  if (command.weaponB === 'fire') {
    return command.move && command.move !== 'brake' ? `${movement} and fire weapon B` : 'Fire weapon B'
  }
  if (command.utility === 'activate') {
    return 'Use utility'
  }

  return movement
}

function summaryForCommand(
  context: CombatLegalityContext,
  command: TurnCommand,
  finalAnchor: { x: number; z: number },
): string {
  const range = describeRange(context, finalAnchor)

  if (command.weaponA === 'fire' || command.weaponB === 'fire') {
    return `${labelForCommand(command)} from final anchor; ${range}.`
  }
  if (command.utility === 'activate') {
    return `Activates available utility behavior from the current anchor; ${range}.`
  }

  return `${labelForCommand(command)} to tactical anchor (${finalAnchor.x}, ${finalAnchor.z}); ${range}.`
}

function actionIdPartsForCommand(command: TurnCommand): string[] {
  return [
    command.move ?? 'hold',
    command.weaponA === 'fire' ? 'fire_weapon_a' : '',
    command.weaponB === 'fire' ? 'fire_weapon_b' : '',
    command.utility === 'activate' ? 'use_utility' : '',
  ]
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
