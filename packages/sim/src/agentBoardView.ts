import type {
  AgentBoardAttackAffordance,
  AgentBoardCellView,
  AgentBoardLegalActionRef,
  AgentBoardPoseView,
  AgentBoardTargetView,
  AgentBoardView,
  ArenaConfig,
  BotPose,
  CanonicalGameAction,
  CombatBotSnapshot,
  CombatBudget,
  CombatTurnSnapshot,
  GameMasterActionKind,
  GridCoord,
  MachineCapabilities,
  TeamRole,
} from '../../schemas/src/index.js'
import {
  arenaCellCenter,
  compileArenaTopology,
  hasArenaLineOfSight,
  hazardsAtPosition,
  type CompiledArenaTopology,
  worldToArenaCell,
} from './arenaTopology.js'
import {
  buildCombatPlanAffordances,
  combatActionCommand,
  combatLegalActionForPacket,
  combatActionMovementOverride,
  isCombatAction,
} from './combatActions.js'
import {
  gridDistance,
  isBlockedAnchorCell,
  isCellInsideArena,
} from './gridMovement.js'

export type BuildAgentBoardViewInput = {
  arena: ArenaConfig
  role: TeamRole
  self: CombatBotSnapshot
  opponent: CombatBotSnapshot
  actions?: readonly CanonicalGameAction[]
}

export function buildAgentBoardView(input: BuildAgentBoardViewInput): AgentBoardView {
  const topology = compileArenaTopology(input.arena)
  const selfAnchor = worldToArenaCell(topology, input.self.position)
  const opponentAnchor = worldToArenaCell(topology, input.opponent.position)
  const selfPose: BotPose = {
    anchor: cloneCell(selfAnchor),
    facing: defaultFacing(input.role),
  }
  const opponentPose: BotPose = {
    anchor: cloneCell(opponentAnchor),
    facing: defaultFacing(opponentRole(input.role)),
  }
  const actionContext = buildActionBoardContext(input.actions ?? [])
  const cells = enumerateArenaCells(input.arena).map((cell) =>
    buildBoardCell(input.arena, topology, cell, selfAnchor, opponentAnchor, actionContext),
  )

  return {
    arena: input.arena,
    grid: {
      cellSize: topology.grid.cellSize,
      ...arenaGridBounds(input.arena),
    },
    self: selfPose,
    opponent: opponentPose,
    blockedCells: cells
      .filter((cell) => cell.blocksMovement)
      .map(cellCoord),
    hazardCells: cells
      .filter((cell) => cell.hazardIds && cell.hazardIds.length > 0)
      .map(cellCoord),
    cells,
    reachablePoses: [...actionContext.poses.values()],
    attackableTargets: [...actionContext.targets.values()],
  }
}

type ActionBoardContext = {
  reachableByCell: Map<string, string[]>
  targetableByCell: Map<string, string[]>
  mobilityByCell: Map<string, AgentBoardCellMobility>
  legalByCell: Map<string, NonNullable<AgentBoardCellView['legal']>>
  poses: Map<string, AgentBoardPoseView>
  targets: Map<string, AgentBoardTargetView>
}

type AgentBoardCellMobility = {
  mobilityCost: number
  mobilityRemaining?: number
  path?: GridCoord[]
}

function buildActionBoardContext(actions: readonly CanonicalGameAction[]): ActionBoardContext {
  const context: ActionBoardContext = {
    reachableByCell: new Map(),
    targetableByCell: new Map(),
    mobilityByCell: new Map(),
    legalByCell: new Map(),
    poses: new Map(),
    targets: new Map(),
  }

  for (const action of actions) {
    if (!isCombatAction(action)) {
      continue
    }

    const publicAction = combatLegalActionForPacket(action)
    const preview = publicAction.preview
    const finalPose = preview?.finalPose

    if (!finalPose) {
      continue
    }

    const sourceCellId = cellIdFor(finalPose.anchor)
    const publicRef = legalActionRef(publicAction)
    const command = combatActionCommand(action)
    const movementOverride = combatActionMovementOverride(action)

    addActionId(context.reachableByCell, sourceCellId, action.id)
    addMobility(context.mobilityByCell, sourceCellId, {
      mobilityCost: movementOverride?.mobilityCost ?? movementCostForKind(publicAction.kind, preview),
      ...(movementOverride?.mobilityRemaining !== undefined
        ? { mobilityRemaining: movementOverride.mobilityRemaining }
        : {}),
      ...(preview.path ? { path: preview.path.map(cloneCell) } : {}),
    })
    addLegalAction(context.legalByCell, sourceCellId, publicAction.kind, publicRef, command, preview)
    addReachablePose(context.poses, action, publicAction.kind, finalPose, preview)

    if (isAttackKind(publicAction.kind) && preview.target) {
      addActionId(context.targetableByCell, cellIdFor(preview.target), action.id)
      addAttackableTarget(context.targets, preview.target, action.id, preview)
    }
  }

  return context
}

function buildBoardCell(
  arena: ArenaConfig,
  topology: CompiledArenaTopology,
  cell: GridCoord,
  selfAnchor: GridCoord,
  opponentAnchor: GridCoord,
  actionContext: ActionBoardContext,
): AgentBoardCellView {
  const center = arenaCellCenter(topology, cell)
  const hazards = hazardsAtPosition(topology, center).map((hazard) => ({
    id: hazard.id,
    type: hazard.type,
    damage: hazard.damage,
  }))
  const blocksMovement = isBlockedAnchorCell(topology, cell)
  const reachableByActionIds = actionContext.reachableByCell.get(cellIdFor(cell)) ?? []
  const targetableByActionIds = actionContext.targetableByCell.get(cellIdFor(cell)) ?? []
  const mobility = actionContext.mobilityByCell.get(cellIdFor(cell))
  const legal = actionContext.legalByCell.get(cellIdFor(cell))
  const occupant = sameCell(cell, selfAnchor)
    ? 'self' as const
    : sameCell(cell, opponentAnchor)
      ? 'opponent' as const
      : undefined
  const unavailableReasons = unavailableCellReasons(cell, {
    blocksMovement,
    occupant,
    reachableByActionIds,
  })

  return {
    ...cloneCell(cell),
    cellId: cellIdFor(cell),
    inBounds: isCellInsideArena(arena, cell),
    blocksMovement,
    blocksLineOfSight: blocksMovement,
    ...(hazards.length > 0 ? {
      hazardIds: hazards.map((hazard) => hazard.id),
      hazards,
    } : {}),
    ...(occupant ? { occupant } : {}),
    distanceToOpponent: gridDistance(cell, opponentAnchor),
    lineOfSightToOpponent: hasArenaLineOfSight(
      topology,
      center,
      arenaCellCenter(topology, opponentAnchor),
    ),
    reachable: reachableByActionIds.length > 0,
    ...(mobility ? {
      mobilityCost: mobility.mobilityCost,
      ...(mobility.mobilityRemaining !== undefined ? { mobilityRemaining: mobility.mobilityRemaining } : {}),
      ...(mobility.path ? { path: mobility.path.map(cloneCell) } : {}),
    } : {}),
    ...(legal ? { legal } : {}),
    ...(reachableByActionIds.length > 0 ? { reachableByActionIds } : {}),
    ...(targetableByActionIds.length > 0 ? { targetableByActionIds } : {}),
    ...(unavailableReasons.length > 0 ? { unavailableReasons } : {}),
  }
}

function addReachablePose(
  poses: Map<string, AgentBoardPoseView>,
  action: CanonicalGameAction,
  kind: GameMasterActionKind,
  finalPose: BotPose,
  preview: NonNullable<ReturnType<typeof combatLegalActionForPacket>['preview']>,
): void {
  const poseId = poseIdFor(finalPose)
  const existing = poses.get(poseId)

  if (existing) {
    addUnique(existing.actionIds, action.id)
    existing.riskTags = uniqueStrings([
      ...(existing.riskTags ?? []),
      ...(preview.riskTags ?? []),
      ...(isAttackKind(kind) ? ['attack_available'] : []),
    ])
    return
  }

  poses.set(poseId, {
    poseId,
    anchor: cloneCell(finalPose.anchor),
    facing: finalPose.facing,
    reachable: true,
    actionIds: [action.id],
    ...(preview.path ? { path: preview.path.map(cloneCell) } : {}),
    ...(preview.expectedRangeIfOpponentHolds !== undefined
      ? { distanceToOpponent: preview.expectedRangeIfOpponentHolds }
      : {}),
    ...(preview.currentLineOfSight !== undefined ? { lineOfSightToOpponent: preview.currentLineOfSight } : {}),
    ...(preview.hazardExposure !== undefined ? { hazardExposure: preview.hazardExposure } : {}),
    ...(preview.riskTags ? { riskTags: [...preview.riskTags] } : {}),
    ...(isAttackKind(kind) ? { riskTags: uniqueStrings([...(preview.riskTags ?? []), 'attack_available']) } : {}),
  })
}

function addAttackableTarget(
  targets: Map<string, AgentBoardTargetView>,
  cell: GridCoord,
  actionId: string,
  preview: NonNullable<ReturnType<typeof combatLegalActionForPacket>['preview']>,
): void {
  const targetId = 'opponent'
  const existing = targets.get(targetId)

  if (existing) {
    addUnique(existing.actionIds, actionId)
    return
  }

  targets.set(targetId, {
    targetId,
    kind: 'opponent',
    cell: cloneCell(cell),
    actionIds: [actionId],
    ...(preview.expectedRangeIfOpponentHolds !== undefined ? { distance: preview.expectedRangeIfOpponentHolds } : {}),
    ...(preview.currentLineOfSight !== undefined ? { lineOfSight: preview.currentLineOfSight } : {}),
  })
}

function addMobility(
  mobilityByCell: Map<string, AgentBoardCellMobility>,
  cellId: string,
  mobility: AgentBoardCellMobility,
): void {
  const existing = mobilityByCell.get(cellId)

  if (
    existing &&
    (
      existing.mobilityCost < mobility.mobilityCost ||
      (
        existing.mobilityCost === mobility.mobilityCost &&
        (existing.mobilityRemaining ?? -1) >= (mobility.mobilityRemaining ?? -1)
      )
    )
  ) {
    return
  }

  mobilityByCell.set(cellId, {
    mobilityCost: mobility.mobilityCost,
    ...(mobility.mobilityRemaining !== undefined ? { mobilityRemaining: mobility.mobilityRemaining } : {}),
    ...(mobility.path ? { path: mobility.path.map(cloneCell) } : {}),
  })
}

function addLegalAction(
  legalByCell: Map<string, NonNullable<AgentBoardCellView['legal']>>,
  cellId: string,
  kind: GameMasterActionKind,
  action: AgentBoardLegalActionRef,
  command: ReturnType<typeof combatActionCommand>,
  preview: NonNullable<ReturnType<typeof combatLegalActionForPacket>['preview']>,
): void {
  const legal = legalByCell.get(cellId) ?? {}

  if (kind === 'move') {
    legal.moveHere = action
  } else if (isAttackKind(kind) && preview.target) {
    legal.attacksFromHere = [
      ...(legal.attacksFromHere ?? []),
      attackAffordance(action, command, preview.target),
    ]
  } else if (kind === 'use_utility') {
    legal.useUtilityFromHere = action
  }

  if (legal.moveHere || legal.attacksFromHere?.length || legal.useUtilityFromHere) {
    legalByCell.set(cellId, legal)
  }
}

function legalActionRef(action: ReturnType<typeof combatLegalActionForPacket>): AgentBoardLegalActionRef {
  return {
    actionId: action.id,
    kind: action.kind,
    label: action.label,
    summary: action.summary,
    ...(action.parameterExamples?.[0] ? { parameters: action.parameterExamples[0] } : {}),
  }
}

function attackAffordance(
  action: AgentBoardLegalActionRef,
  command: ReturnType<typeof combatActionCommand>,
  target: GridCoord,
): AgentBoardAttackAffordance {
  const targetCellId = cellIdFor(target)

  return {
    ...action,
    targetId: 'opponent',
    targetCellId,
    ...(weaponSlotFor(command) ? { weaponSlot: weaponSlotFor(command) } : {}),
  }
}

function weaponSlotFor(command: ReturnType<typeof combatActionCommand>): 'weaponA' | 'weaponB' | undefined {
  if (command?.weaponA === 'fire') {
    return 'weaponA'
  }
  if (command?.weaponB === 'fire') {
    return 'weaponB'
  }

  return undefined
}

function movementCostForKind(
  kind: GameMasterActionKind,
  preview: NonNullable<ReturnType<typeof combatLegalActionForPacket>['preview']>,
): number {
  if (kind === 'hold' || kind === 'attack' || kind === 'use_utility') {
    return 0
  }

  return preview.path?.length ?? 0
}

function unavailableCellReasons(
  cell: GridCoord,
  input: {
    blocksMovement: boolean
    occupant?: 'self' | 'opponent'
    reachableByActionIds: readonly string[]
  },
): string[] {
  const reasons: string[] = []

  if (input.blocksMovement) {
    reasons.push('Cell blocks movement and line of sight.')
  }
  if (input.occupant === 'opponent') {
    reasons.push('Opponent occupies this anchor cell.')
  }
  if (input.reachableByActionIds.length === 0 && !input.blocksMovement && input.occupant !== 'opponent') {
    reasons.push('No current legal action ends on this cell.')
  }

  return reasons
}

function enumerateArenaCells(arena: ArenaConfig): GridCoord[] {
  const bounds = arenaGridBounds(arena)
  const cells: GridCoord[] = []

  for (let x = bounds.xMin; x <= bounds.xMax; x += 1) {
    for (let z = bounds.zMin; z <= bounds.zMax; z += 1) {
      const cell = { x, z }

      if (isCellInsideArena(arena, cell)) {
        cells.push(cell)
      }
    }
  }

  return cells
}

function arenaGridBounds(arena: ArenaConfig): {
  xMin: number
  xMax: number
  zMin: number
  zMax: number
} {
  return {
    xMin: -Math.floor(arena.width / 2),
    xMax: Math.floor(arena.width / 2),
    zMin: -Math.floor(arena.height / 2),
    zMax: Math.floor(arena.height / 2),
  }
}

function addActionId(map: Map<string, string[]>, key: string, actionId: string): void {
  const actionIds = map.get(key) ?? []

  addUnique(actionIds, actionId)
  map.set(key, actionIds)
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value)
  }
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function isAttackKind(kind: GameMasterActionKind): boolean {
  return kind === 'attack' || kind === 'move_and_attack'
}

function defaultFacing(role: TeamRole): BotPose['facing'] {
  return role === 'red' ? 'east' : 'west'
}

function opponentRole(role: TeamRole): TeamRole {
  return role === 'red' ? 'blue' : 'red'
}

function poseIdFor(pose: BotPose): string {
  return `pose:${pose.anchor.x}:${pose.anchor.z}:${pose.facing}`
}

function cellIdFor(cell: GridCoord): string {
  return `cell:${cell.x}:${cell.z}`
}

function sameCell(left: GridCoord, right: GridCoord): boolean {
  return left.x === right.x && left.z === right.z
}

function cloneCell<T extends GridCoord>(cell: T): T {
  return { ...cell }
}

function cellCoord(cell: GridCoord): GridCoord {
  return { x: cell.x, z: cell.z }
}

export type BuildCombatPlanBoardViewInput = BuildAgentBoardViewInput & {
  snapshot: CombatTurnSnapshot
  budget: CombatBudget
  machineCapabilities?: MachineCapabilities
}

export function buildCombatPlanBoardView(input: BuildCombatPlanBoardViewInput): AgentBoardView {
  const base = buildAgentBoardView(input)
  const affordances = buildCombatPlanAffordances({
    role: input.role,
    snapshot: input.snapshot,
    budget: input.budget,
    machineCapabilities: input.machineCapabilities,
  })
  const ascii = renderCombatPlanAscii(base, affordances.reachableCells.map((cell) => cell.cellId), affordances.attackableCells.map((cell) => cell.cellId))

  return {
    ...base,
    ascii,
    reachableCells: affordances.reachableCells,
    attackableCells: affordances.attackableCells,
    utilityOptions: affordances.utilityOptions,
  }
}

function renderCombatPlanAscii(
  board: AgentBoardView,
  reachableCellIds: string[],
  attackableCellIds: string[],
): string {
  const bounds = board.grid ?? arenaGridBounds(board.arena)
  const byCellId = new Map((board.cells ?? []).map((cell) => [cell.cellId, cell]))
  const reachable = new Set(reachableCellIds)
  const attackable = new Set(attackableCellIds)
  const lines: string[] = []

  for (let z = bounds.zMin; z <= bounds.zMax; z += 1) {
    let line = ''

    for (let x = bounds.xMin; x <= bounds.xMax; x += 1) {
      const cellId = cellIdFor({ x, z })
      const cell = byCellId.get(cellId)

      if (!cell?.inBounds) {
        line += ' '
        continue
      }

      if (cell.occupant === 'self') {
        line += 'S'
      } else if (cell.occupant === 'opponent') {
        line += attackable.has(cellId) ? 'T' : 'O'
      } else if (cell.blocksMovement) {
        line += '#'
      } else if (attackable.has(cellId)) {
        line += '*'
      } else if (reachable.has(cellId)) {
        line += '+'
      } else if (cell.hazardIds && cell.hazardIds.length > 0) {
        line += '!'
      } else {
        line += '.'
      }
    }

    lines.push(line)
  }

  return lines.join('\n')
}
