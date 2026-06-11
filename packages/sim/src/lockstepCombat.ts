import {
  createReplayTimeline,
  type ReplayEvent,
  type ReplayTimeline,
} from '../../replay/src/index.js'
import {
  DEFAULT_ARENA_CONFIG,
  type ArenaConfig,
  type BotBlueprint,
  type BotCombatStats,
  type CombatBotSnapshot,
  type CombatBudget,
  type CombatPlanConsumptionSummary,
  type CombatPlanStep,
  type CombatRoundPlan,
  type CombatTurnSnapshot,
  type GridCoord,
  type MachineRuntimeState,
  type MachineWeaponCapability,
  type TeamRole,
  type Vector3,
} from '../../schemas/src/index.js'
import { deriveBotStats, type BotStats } from './deriveStats.js'
import {
  arenaCellCenter,
  arenaCellDistance,
  compileArenaTopology,
  hasArenaLineOfSight,
  pathHazards,
  worldToArenaCell,
} from './arenaTopology.js'
import { advanceCombatCooldowns, deriveCombatBudget } from './combatBudget.js'
import { weaponFireModeRequiresLineOfSight } from './combatLegality.js'
import { deriveMachineCapabilities } from './machineCapabilities.js'
import {
  createBounceEvent,
  createHazardTriggerEvent,
  createPlanStepRejectedEvent,
  createPushEvent,
  createRamEvent,
  createSubstepMoveEvent,
} from './combatEventBuilders.js'
import {
  blockedPushDamage,
  choosePushWinner,
  forcedPushDestination,
} from './contactResolution.js'
import {
  isBlockedAnchorCell,
  isCellInsideArena,
  parseCellId,
  sameGridCell,
  stepToward,
} from './gridMovement.js'
import type { CombatResult, ResolveCombatInput } from './resolveCombat.js'

const LOCKSTEP_SUBSTEP_SECONDS = 0.35
const LOCKSTEP_TRAILING_SECONDS = 0.85
const HARD_MAX_LOCKSTEP_SUBSTEPS = 96
const MIN_REPLAY_DURATION = 6

export type ResolveLockstepCombatRoundInput = ResolveCombatInput & {
  roundIndex?: number
  snapshot?: CombatTurnSnapshot
  plans: Record<TeamRole, CombatRoundPlan>
  budgets?: Partial<Record<TeamRole, CombatBudget>>
  priorEvents?: ReplayEvent[]
  priorLog?: string[]
  elapsedSubsteps?: number
  machineRuntime?: Partial<Record<TeamRole, MachineRuntimeState>>
}

export type LockstepCombatRoundResolution =
  | {
      status: 'active'
      nextRound: number
      snapshot: CombatTurnSnapshot
      replay: ReplayTimeline
      log: string[]
      events: ReplayEvent[]
      elapsedSubsteps: number
      machineRuntime?: Partial<Record<TeamRole, MachineRuntimeState>>
      consumed: Record<TeamRole, CombatPlanConsumptionSummary>
    }
  | {
      status: 'complete'
      round: number
      snapshot: CombatTurnSnapshot
      result: CombatResult
      consumed: Record<TeamRole, CombatPlanConsumptionSummary>
    }

type RoleRuntime = {
  role: TeamRole
  anchor: GridCoord
  position: Vector3
  health: number
  maxHealth: number
  partHealth: Record<string, number>
  stats: BotCombatStats
  hasUtilityControl: boolean
  hasWeaponControl: boolean
  weaponSlotCount: number
  weaponReach: number
  /** Active mounted weapon capabilities; canonical combat weapon identity. */
  weapons: readonly MachineWeaponCapability[]
  statuses: string[]
  cooldowns: Record<string, number>
  charges: Record<string, number>
  budget: CombatBudget
  plan: CombatPlanStep[]
  stepIndex: number
  ended: boolean
  consumed: CombatPlanConsumptionSummary
}

type MovementAttempt = {
  role: TeamRole
  from: GridCoord
  to: GridCoord
  moved: boolean
  blocked?: boolean
  rejected?: string
}

export function resolveLockstepCombatRound(
  input: ResolveLockstepCombatRoundInput,
): LockstepCombatRoundResolution {
  const arena = input.arena ?? input.snapshot?.arena ?? DEFAULT_ARENA_CONFIG
  const topology = compileArenaTopology(arena)
  const snapshot = input.snapshot ?? createInitialSnapshot(input, arena)
  const roundIndex = input.roundIndex ?? snapshot.tick
  const initialEvents = input.priorEvents?.length
    ? input.priorEvents.map(cloneReplayEvent)
    : spawnEventsFromSnapshot(snapshot)
  const events: ReplayEvent[] = initialEvents
  const log = [...(input.priorLog ?? [])]
  const red = createRoleRuntime('red', snapshot, input.plans.red, input.budgets?.red, activeMachineWeapons(input, 'red'))
  const blue = createRoleRuntime('blue', snapshot, input.plans.blue, input.budgets?.blue, activeMachineWeapons(input, 'blue'))
  let elapsedSubsteps = input.elapsedSubsteps ?? 0

  for (let localSubstep = 1; localSubstep <= HARD_MAX_LOCKSTEP_SUBSTEPS; localSubstep += 1) {
    if (red.ended && blue.ended) {
      break
    }

    elapsedSubsteps += 1
    const t = replayTimeForSubstep(elapsedSubsteps)
    const redAttempt = nextMovementAttempt(red, blue, arena, elapsedSubsteps, t, events)
    const blueAttempt = nextMovementAttempt(blue, red, arena, elapsedSubsteps, t, events)

    resolveMovementAttempts({
      arena,
      red,
      blue,
      redAttempt,
      blueAttempt,
      elapsedSubsteps,
      t,
      events,
    })

    triggerAttackOrUtility(red, blue, topology, elapsedSubsteps, t, events)
    triggerAttackOrUtility(blue, red, topology, elapsedSubsteps, t, events)

    red.budget = advanceCombatCooldowns(red.budget)
    blue.budget = advanceCombatCooldowns(blue.budget)

    if (red.health <= 0 || blue.health <= 0) {
      break
    }
  }

  if (!red.ended) {
    red.consumed.endedBy = 'substep_cap'
  }
  if (!blue.ended) {
    blue.consumed.endedBy = 'substep_cap'
  }

  const nextSnapshot = createSnapshotFromRuntime({
    arena,
    tick: roundIndex + 1,
    red,
    blue,
    events,
    hardMaxTicks: snapshot.hardMaxTicks,
  })
  const consumed = {
    red: red.consumed,
    blue: blue.consumed,
  }

  if (red.health <= 0 || blue.health <= 0 || nextSnapshot.tick >= snapshot.hardMaxTicks) {
    const result = finalizeLockstepCombatResult({
      input,
      snapshot: nextSnapshot,
      events,
      log,
      red,
      blue,
      elapsedSubsteps,
    })

    return {
      status: 'complete',
      round: input.round,
      snapshot: nextSnapshot,
      result,
      consumed,
    }
  }

  const replay = createReplayTimeline({
    round: input.round,
    duration: replayDuration(events, elapsedSubsteps),
    events,
    summary: `Combat round ${roundIndex + 1} is waiting for round plans.`,
  })

  log.push(`Combat round ${roundIndex}: red consumed ${red.consumed.consumedSteps}/${red.consumed.submittedSteps} steps; blue consumed ${blue.consumed.consumedSteps}/${blue.consumed.submittedSteps} steps.`)

  return {
    status: 'active',
    nextRound: roundIndex + 1,
    snapshot: nextSnapshot,
    replay,
    log,
    events,
    elapsedSubsteps,
    ...(input.machineRuntime ? { machineRuntime: input.machineRuntime } : {}),
    consumed,
  }
}

function createRoleRuntime(
  role: TeamRole,
  snapshot: CombatTurnSnapshot,
  plan: CombatRoundPlan,
  budget: CombatBudget | undefined,
  weapons: readonly MachineWeaponCapability[] = [],
): RoleRuntime {
  const bot = role === 'red' ? snapshot.red : snapshot.blue
  const anchor = worldToArenaCell(compileArenaTopology(snapshot.arena), bot.position)
  const derivedBudget = budget ?? deriveCombatBudget({ role, snapshot })

  return {
    role,
    anchor,
    position: arenaCellCenter(compileArenaTopology(snapshot.arena), anchor),
    health: bot.health,
    maxHealth: bot.maxHealth,
    partHealth: { ...bot.partHealth },
    stats: { ...bot.stats },
    hasUtilityControl: bot.hasUtilityControl,
    hasWeaponControl: bot.hasWeaponControl,
    weaponSlotCount: bot.weaponSlotCount,
    weaponReach: bot.weaponReach,
    weapons,
    statuses: [...bot.statuses],
    cooldowns: { ...bot.cooldowns },
    charges: { ...bot.charges },
    budget: { ...derivedBudget, weaponCooldowns: { ...derivedBudget.weaponCooldowns } },
    plan: plan.steps.map((step) => ({ ...step } as CombatPlanStep)),
    stepIndex: 0,
    ended: false,
    consumed: {
      submittedSteps: plan.steps.length,
      consumedSteps: 0,
      movementSpent: 0,
      actionTimeSpent: 0,
      rejectedSteps: [],
      endedBy: 'plan_exhausted',
    },
  }
}

function nextMovementAttempt(
  self: RoleRuntime,
  opponent: RoleRuntime,
  arena: ArenaConfig,
  substep: number,
  t: number,
  events: ReplayEvent[],
): MovementAttempt {
  const step = currentStep(self)

  if (!step) {
    markEnded(self, 'plan_exhausted')
    return holdAttempt(self)
  }

  if (step.kind === 'end_turn') {
    self.stepIndex += 1
    self.consumed.consumedSteps += 1
    markEnded(self, 'end_turn')
    return holdAttempt(self)
  }

  if (step.kind !== 'move') {
    return holdAttempt(self)
  }

  const target = parseCellId(step.cellId)

  if (!target) {
    rejectCurrentStep(self, 'invalid move cellId', substep, t, events)
    return holdAttempt(self)
  }

  if (sameGridCell(self.anchor, target)) {
    self.stepIndex += 1
    self.consumed.consumedSteps += 1
    return holdAttempt(self)
  }

  if (self.budget.movement <= 0) {
    rejectCurrentStep(self, 'movement budget exhausted', substep, t, events)
    markEnded(self, 'budget_exhausted')
    return holdAttempt(self)
  }

  const next = stepToward(self.anchor, target)
  const topology = compileArenaTopology(arena)

  if (!next || !isCellInsideArena(arena, next) || isBlockedAnchorCell(topology, next)) {
    rejectCurrentStep(self, 'movement path is blocked or outside the arena', substep, t, events)
    return holdAttempt(self)
  }

  return {
    role: self.role,
    from: cloneCell(self.anchor),
    to: next,
    moved: !sameGridCell(self.anchor, next),
    ...(sameGridCell(next, opponent.anchor) ? { blocked: true } : {}),
  }
}

function resolveMovementAttempts(input: {
  arena: ArenaConfig
  red: RoleRuntime
  blue: RoleRuntime
  redAttempt: MovementAttempt
  blueAttempt: MovementAttempt
  elapsedSubsteps: number
  t: number
  events: ReplayEvent[]
}): void {
  const { red, blue, redAttempt, blueAttempt } = input
  const redFrom = cloneCell(red.anchor)
  const blueFrom = cloneCell(blue.anchor)
  const redTo = redAttempt.to
  const blueTo = blueAttempt.to

  if (redAttempt.moved && blueAttempt.moved && sameGridCell(redTo, blueFrom) && sameGridCell(blueTo, redFrom)) {
    const damage = Math.max(1, Math.round((red.stats.mass + blue.stats.mass) / 18))
    applyDamage(red, damage, input.elapsedSubsteps, input.t, input.events)
    applyDamage(blue, damage, input.elapsedSubsteps, input.t, input.events)
    input.events.push(createRamEvent({
      t: input.t,
      substep: input.elapsedSubsteps,
      attacker: 'red',
      defender: 'blue',
      damage,
      position: midpoint(positionFor(input.arena, redTo), positionFor(input.arena, blueTo)),
      blockedBy: 'bot',
    }))
    return
  }

  if (sameGridCell(redTo, blueTo) && (redAttempt.moved || blueAttempt.moved)) {
    resolveSameCellContact(input, redAttempt, blueAttempt)
    return
  }

  if (redAttempt.moved && sameGridCell(redTo, blue.anchor) && !blueAttempt.moved) {
    resolveAttackerIntoDefender(input, red, blue, redAttempt)
    return
  }

  if (blueAttempt.moved && sameGridCell(blueTo, red.anchor) && !redAttempt.moved) {
    resolveAttackerIntoDefender(input, blue, red, blueAttempt)
    return
  }

  applyVoluntaryMove(red, redAttempt, input)
  applyVoluntaryMove(blue, blueAttempt, input)
}

function resolveSameCellContact(
  input: Parameters<typeof resolveMovementAttempts>[0],
  redAttempt: MovementAttempt,
  blueAttempt: MovementAttempt,
): void {
  const contest = choosePushWinner({
    attacker: 'red',
    defender: 'blue',
    stats: { red: input.red.stats, blue: input.blue.stats },
    momentum: {
      red: redAttempt.moved ? 1 : 0,
      blue: blueAttempt.moved ? 1 : 0,
    },
  })

  if (contest.winner === 'tie') {
    const damage = Math.max(1, Math.round((input.red.stats.mass + input.blue.stats.mass) / 20))
    applyDamage(input.red, damage, input.elapsedSubsteps, input.t, input.events)
    applyDamage(input.blue, damage, input.elapsedSubsteps, input.t, input.events)
    input.events.push(createRamEvent({
      t: input.t,
      substep: input.elapsedSubsteps,
      attacker: 'red',
      defender: 'blue',
      damage,
      position: positionFor(input.arena, redAttempt.to),
      blockedBy: 'bot',
    }))
    return
  }

  const winner = contest.winner === 'red' ? input.red : input.blue
  const loser = contest.winner === 'red' ? input.blue : input.red
  const winnerAttempt = contest.winner === 'red' ? redAttempt : blueAttempt
  const loserAttempt = contest.winner === 'red' ? blueAttempt : redAttempt
  const pushTo = forcedPushDestination({
    arena: input.arena,
    defenderCell: loser.anchor,
    attackerFrom: winnerAttempt.from,
    attackerTo: winnerAttempt.to,
    occupiedCells: [winnerAttempt.to, winnerAttempt.from],
  })

  if (pushTo) {
    applyVoluntaryMove(winner, winnerAttempt, input)
    applyPushMove(winner, loser, loser.anchor, pushTo, contest.reason, input)
    if (loserAttempt.moved) {
      consumeMovementStep(loser, loserAttempt)
    }
    return
  }

  const damage = blockedPushDamage(winner.stats, loser.stats)
  applyDamage(loser, damage, input.elapsedSubsteps, input.t, input.events)
  input.events.push(createRamEvent({
    t: input.t,
    substep: input.elapsedSubsteps,
    attacker: winner.role,
    defender: loser.role,
    damage,
    position: positionFor(input.arena, winnerAttempt.to),
    blockedBy: 'wall',
  }))
  input.events.push(createBounceEvent({
    t: input.t,
    substep: input.elapsedSubsteps,
    bot: winner.role,
    from: positionFor(input.arena, winnerAttempt.to),
    to: positionFor(input.arena, winnerAttempt.from),
    cause: 'blocked_push',
  }))
  triggerHazardsForPath(
    winner,
    positionFor(input.arena, winnerAttempt.to),
    positionFor(input.arena, winnerAttempt.from),
    'bounce',
    input,
  )
  consumeMovementStep(winner, winnerAttempt)
}

function resolveAttackerIntoDefender(
  input: Parameters<typeof resolveMovementAttempts>[0],
  attacker: RoleRuntime,
  defender: RoleRuntime,
  attempt: MovementAttempt,
): void {
  const contest = choosePushWinner({
    attacker: attacker.role,
    defender: defender.role,
    stats: {
      [attacker.role]: attacker.stats,
      [defender.role]: defender.stats,
    } as Record<TeamRole, BotCombatStats>,
    momentum: { [attacker.role]: 1 },
  })

  if (contest.winner === 'tie') {
    const damage = Math.max(1, Math.round((attacker.stats.mass + defender.stats.mass) / 20))
    consumeMovementStep(attacker, attempt)
    applyDamage(attacker, damage, input.elapsedSubsteps, input.t, input.events)
    applyDamage(defender, damage, input.elapsedSubsteps, input.t, input.events)
    input.events.push(createRamEvent({
      t: input.t,
      substep: input.elapsedSubsteps,
      attacker: attacker.role,
      defender: defender.role,
      damage,
      position: positionFor(input.arena, defender.anchor),
      blockedBy: 'bot',
    }))
    input.events.push(createBounceEvent({
      t: input.t,
      substep: input.elapsedSubsteps,
      bot: attacker.role,
      from: positionFor(input.arena, attempt.to),
      to: positionFor(input.arena, attempt.from),
      cause: 'collision',
    }))
    triggerHazardsForPath(
      attacker,
      positionFor(input.arena, attempt.to),
      positionFor(input.arena, attempt.from),
      'bounce',
      input,
    )
    return
  }

  if (contest.winner === defender.role) {
    const damage = blockedPushDamage(defender.stats, attacker.stats)
    consumeMovementStep(attacker, attempt)
    applyDamage(attacker, damage, input.elapsedSubsteps, input.t, input.events)
    input.events.push(createRamEvent({
      t: input.t,
      substep: input.elapsedSubsteps,
      attacker: attacker.role,
      defender: defender.role,
      damage,
      position: positionFor(input.arena, defender.anchor),
      blockedBy: 'bot',
    }))
    input.events.push(createBounceEvent({
      t: input.t,
      substep: input.elapsedSubsteps,
      bot: attacker.role,
      from: positionFor(input.arena, attempt.to),
      to: positionFor(input.arena, attempt.from),
      cause: 'collision',
    }))
    triggerHazardsForPath(
      attacker,
      positionFor(input.arena, attempt.to),
      positionFor(input.arena, attempt.from),
      'bounce',
      input,
    )
    return
  }

  const pushTo = forcedPushDestination({
    arena: input.arena,
    defenderCell: defender.anchor,
    attackerFrom: attempt.from,
    attackerTo: attempt.to,
    occupiedCells: [attempt.to, attempt.from],
  })

  if (pushTo) {
    applyVoluntaryMove(attacker, attempt, input)
    applyPushMove(attacker, defender, defender.anchor, pushTo, contest.reason, input)
    return
  }

  const damage = blockedPushDamage(attacker.stats, defender.stats)
  consumeMovementStep(attacker, attempt)
  applyDamage(defender, damage, input.elapsedSubsteps, input.t, input.events)
  input.events.push(createRamEvent({
    t: input.t,
    substep: input.elapsedSubsteps,
    attacker: attacker.role,
    defender: defender.role,
    damage,
    position: positionFor(input.arena, defender.anchor),
    blockedBy: 'wall',
  }))
  input.events.push(createBounceEvent({
    t: input.t,
    substep: input.elapsedSubsteps,
    bot: attacker.role,
    from: positionFor(input.arena, attempt.to),
    to: positionFor(input.arena, attempt.from),
    cause: 'blocked_push',
  }))
  triggerHazardsForPath(
    attacker,
    positionFor(input.arena, attempt.to),
    positionFor(input.arena, attempt.from),
    'bounce',
    input,
  )
}

function applyVoluntaryMove(
  runtime: RoleRuntime,
  attempt: MovementAttempt,
  input: Parameters<typeof resolveMovementAttempts>[0],
): void {
  if (!attempt.moved) {
    return
  }

  const fromWorld = positionFor(input.arena, runtime.anchor)
  const toWorld = positionFor(input.arena, attempt.to)

  runtime.anchor = cloneCell(attempt.to)
  runtime.position = toWorld
  consumeMovementStep(runtime, attempt)
  input.events.push(createSubstepMoveEvent({
    t: input.t,
    substep: input.elapsedSubsteps,
    bot: runtime.role,
    from: fromWorld,
    to: toWorld,
    contactIntent: attempt.blocked,
  }))
  triggerHazardsForPath(runtime, fromWorld, toWorld, 'voluntary_move', input)
}

function applyPushMove(
  attacker: RoleRuntime,
  defender: RoleRuntime,
  from: GridCoord,
  to: GridCoord,
  reason: 'mass' | 'drive' | 'momentum' | 'tie_break',
  input: Parameters<typeof resolveMovementAttempts>[0],
): void {
  const fromWorld = positionFor(input.arena, from)
  const toWorld = positionFor(input.arena, to)

  defender.anchor = cloneCell(to)
  defender.position = toWorld
  input.events.push(createPushEvent({
    t: input.t,
    substep: input.elapsedSubsteps,
    attacker: attacker.role,
    defender: defender.role,
    from: fromWorld,
    to: toWorld,
    reason,
  }))
  triggerHazardsForPath(defender, fromWorld, toWorld, 'forced_push', input)
}

function consumeMovementStep(runtime: RoleRuntime, attempt: MovementAttempt): void {
  runtime.budget.movement = Math.max(0, runtime.budget.movement - 1)
  runtime.consumed.movementSpent += 1

  const step = currentStep(runtime)

  if (step?.kind === 'move') {
    const target = parseCellId(step.cellId)

    if (!target || sameGridCell(attempt.to, target) || runtime.budget.movement <= 0) {
      runtime.stepIndex += 1
      runtime.consumed.consumedSteps += 1
    }
  }
}

function triggerAttackOrUtility(
  attacker: RoleRuntime,
  defender: RoleRuntime,
  topology: ReturnType<typeof compileArenaTopology>,
  substep: number,
  t: number,
  events: ReplayEvent[],
): void {
  const step = currentStep(attacker)

  if (!step || step.kind === 'move' || step.kind === 'end_turn') {
    return
  }

  if (attacker.budget.actionTime <= 0) {
    rejectCurrentStep(attacker, 'action time budget exhausted', substep, t, events)
    markEnded(attacker, 'budget_exhausted')
    return
  }

  attacker.budget.actionTime -= 1
  attacker.consumed.actionTimeSpent += 1
  attacker.stepIndex += 1
  attacker.consumed.consumedSteps += 1

  if (step.kind === 'utility') {
    events.push({
      t,
      type: 'ability',
      bot: attacker.role,
      ability: 'drone_swarm',
      target: defender.role,
      targetPosition: [...defender.position],
      turn: substep,
      substep,
    })
    return
  }

  const target = step.targetCellId ? parseCellId(step.targetCellId) : defender.anchor

  if (!target) {
    rejectConsumedStep(attacker, attacker.stepIndex - 1, 'invalid attack target cellId')
    return
  }

  // Weapon identity: step.weaponId selects the mounted weapon; legacy
  // weaponA/weaponB map to the first/second active weapon during migration.
  const selected = selectAttackWeapon(attacker, step)

  if (!selected.ok) {
    rejectConsumedStep(attacker, attacker.stepIndex - 1, selected.reason)
    return
  }

  const weapon = selected.weapon
  const cooldownKey = weapon?.partInstanceId ?? step.weaponId ?? step.weaponSlot ?? 'weaponA'

  if ((attacker.budget.weaponCooldowns[cooldownKey] ?? 0) > 0) {
    rejectConsumedStep(attacker, attacker.stepIndex - 1, `${cooldownKey} is on cooldown`)
    return
  }

  const distance = arenaCellDistance(attacker.anchor, target)
  const range = weapon ? Math.max(1, Math.ceil(weapon.range)) : Math.max(1, Math.ceil(attacker.weaponReach))
  const inRange = distance <= range
  const requiresLineOfSight = weapon ? weaponFireModeRequiresLineOfSight(weapon.fireMode) : true
  const hasLos = !requiresLineOfSight ||
    hasArenaLineOfSight(topology, attacker.position, arenaCellCenter(topology, target))

  events.push({
    t,
    type: 'weapon_fire',
    bot: attacker.role,
    ...(weapon ? { weaponId: weapon.partInstanceId } : {}),
    ...(step.weaponSlot ? { weaponSlot: step.weaponSlot } : {}),
    targetPosition: arenaCellCenter(topology, target),
    phase: 'release',
    fireMode: weapon?.fireMode ?? 'direct',
    turn: substep,
    substep,
  })

  if (!inRange || !hasLos || !sameGridCell(target, defender.anchor)) {
    events.push(createPlanStepRejectedEvent({
      t,
      substep,
      bot: attacker.role,
      stepIndex: attacker.stepIndex - 1,
      reason: !inRange ? 'attack target out of range' : !hasLos ? 'attack line of sight blocked' : 'target cell no longer contains opponent',
    }))
    return
  }

  if (weapon && weapon.cooldownTurns > 0) {
    attacker.budget.weaponCooldowns[cooldownKey] = weapon.cooldownTurns
  }

  // Damage comes from the selected weapon (zero-damage effect weapons stay
  // zero); the aggregate weaponThreat fallback only covers stats-only bots.
  const damage = weapon
    ? Math.max(0, Math.round(weapon.damage))
    : Math.max(1, Math.round(attacker.stats.weaponThreat / 6 || 2))

  events.push({
    t,
    type: 'impact',
    attacker: attacker.role,
    defender: defender.role,
    damage,
    position: [...defender.position],
    turn: substep,
    substep,
  })
  applyDamage(defender, damage, substep, t, events)
}

type SelectedAttackWeapon =
  | { ok: true; weapon?: MachineWeaponCapability }
  | { ok: false; reason: string }

function selectAttackWeapon(
  attacker: RoleRuntime,
  step: Extract<CombatPlanStep, { kind: 'attack' }>,
): SelectedAttackWeapon {
  if (step.weaponId) {
    const weapon = attacker.weapons.find((candidate) => candidate.partInstanceId === step.weaponId)

    return weapon
      ? { ok: true, weapon }
      : { ok: false, reason: `${step.weaponId} is not an active mounted weapon` }
  }

  if (attacker.weapons.length === 0) {
    // Stats-only legacy bots keep the aggregate weaponReach behavior.
    return { ok: true }
  }

  const index = step.weaponSlot === 'weaponB' ? 1 : 0
  const weapon = attacker.weapons[index]

  return weapon
    ? { ok: true, weapon }
    : { ok: false, reason: `${step.weaponSlot ?? 'weaponA'} has no active mounted weapon` }
}

function activeMachineWeapons(
  input: ResolveLockstepCombatRoundInput,
  role: TeamRole,
): readonly MachineWeaponCapability[] {
  const design = role === 'red' ? input.red.machineDesign : input.blue.machineDesign

  if (!design) {
    return []
  }

  const runtime = input.machineRuntime?.[role] ?? design.runtime

  return deriveMachineCapabilities(runtime ? { ...design, runtime } : design).weapons
}

function triggerHazardsForPath(
  runtime: RoleRuntime,
  fromWorld: Vector3,
  toWorld: Vector3,
  trigger: 'voluntary_move' | 'forced_push' | 'bounce',
  input: Parameters<typeof resolveMovementAttempts>[0],
): void {
  const topology = compileArenaTopology(input.arena)
  const hazards = pathHazards(topology, fromWorld, toWorld, 0.5)

  for (const hazard of hazards) {
    input.events.push(createHazardTriggerEvent({
      t: input.t,
      substep: input.elapsedSubsteps,
      hazard: hazard.id,
      bot: runtime.role,
      damage: hazard.damage,
      position: hazard.position,
      trigger,
    }))

    if (hazard.damage > 0) {
      applyDamage(runtime, hazard.damage, input.elapsedSubsteps, input.t, input.events)
    }
  }
}

function applyDamage(
  target: RoleRuntime,
  amount: number,
  substep: number,
  t: number,
  events: ReplayEvent[],
): void {
  const damage = Math.max(0, Math.round(amount))

  if (damage <= 0) {
    return
  }

  target.health = Math.max(0, round(target.health - damage))
  events.push({
    t,
    type: 'damage',
    bot: target.role,
    amount: damage,
    remainingHealth: target.health,
    turn: substep,
    substep,
  })

  if (target.health <= 0) {
    events.push({
      t: t + 0.05,
      type: 'knockout',
      bot: target.role,
      cause: 'combat_round_plan',
      turn: substep,
      substep,
    })
  }
}

function rejectCurrentStep(
  runtime: RoleRuntime,
  reason: string,
  substep: number,
  t: number,
  events: ReplayEvent[],
): void {
  rejectConsumedStep(runtime, runtime.stepIndex, reason)
  events.push(createPlanStepRejectedEvent({
    t,
    substep,
    bot: runtime.role,
    stepIndex: runtime.stepIndex,
    reason,
  }))
  runtime.stepIndex += 1
  runtime.consumed.consumedSteps += 1
}

function rejectConsumedStep(runtime: RoleRuntime, index: number, reason: string): void {
  runtime.consumed.rejectedSteps.push({ index, reason })
}

function markEnded(runtime: RoleRuntime, endedBy: CombatPlanConsumptionSummary['endedBy']): void {
  runtime.ended = true
  runtime.consumed.endedBy = endedBy
}

function currentStep(runtime: RoleRuntime): CombatPlanStep | undefined {
  return runtime.ended ? undefined : runtime.plan[runtime.stepIndex]
}

function holdAttempt(runtime: RoleRuntime): MovementAttempt {
  return {
    role: runtime.role,
    from: cloneCell(runtime.anchor),
    to: cloneCell(runtime.anchor),
    moved: false,
  }
}

function createSnapshotFromRuntime(input: {
  arena: ArenaConfig
  tick: number
  hardMaxTicks: number
  red: RoleRuntime
  blue: RoleRuntime
  events: readonly ReplayEvent[]
}): CombatTurnSnapshot {
  return {
    tick: input.tick,
    arena: input.arena,
    distance: round(Math.hypot(input.red.position[0] - input.blue.position[0], input.red.position[2] - input.blue.position[2])),
    hardMaxTicks: input.hardMaxTicks,
    recentEvents: input.events.slice(-8).map(describeReplayEvent),
    red: botSnapshotFromRuntime(input.red),
    blue: botSnapshotFromRuntime(input.blue),
  }
}

function botSnapshotFromRuntime(runtime: RoleRuntime): CombatBotSnapshot {
  return {
    role: runtime.role,
    position: [...runtime.position],
    health: round(runtime.health),
    maxHealth: round(runtime.maxHealth),
    partHealth: { ...runtime.partHealth },
    stats: { ...runtime.stats },
    hasUtilityControl: runtime.hasUtilityControl,
    hasWeaponControl: runtime.hasWeaponControl,
    weaponSlotCount: runtime.weaponSlotCount,
    weaponReach: runtime.weaponReach,
    statuses: [...runtime.statuses],
    cooldowns: { ...runtime.budget.weaponCooldowns },
    charges: { ...runtime.charges },
  }
}

function createInitialSnapshot(input: ResolveCombatInput, arena: ArenaConfig): CombatTurnSnapshot {
  const red = createInitialBotSnapshot('red', input.red.blueprint, [-6, 0, 0])
  const blue = createInitialBotSnapshot('blue', input.blue.blueprint, [6, 0, 0])

  return {
    tick: 1,
    arena,
    distance: 12,
    hardMaxTicks: 600,
    recentEvents: [],
    red,
    blue,
  }
}

function createInitialBotSnapshot(
  role: TeamRole,
  blueprint: BotBlueprint,
  position: Vector3,
): CombatBotSnapshot {
  const stats = deriveBotStats(blueprint)
  const partHealth = Object.fromEntries(
    blueprint.blocks.map((block) => [block.id, Math.max(1, Math.round(stats.durability / Math.max(1, blueprint.blocks.length)))]),
  )
  const health = Math.max(1, Object.values(partHealth).reduce((sum, value) => sum + value, 0))

  return {
    role,
    position,
    health,
    maxHealth: health,
    partHealth,
    stats: stats as unknown as BotCombatStats,
    hasUtilityControl: false,
    hasWeaponControl: stats.weaponThreat > 0,
    weaponSlotCount: stats.weaponThreat > 0 ? 1 : 0,
    weaponReach: Math.max(1, Math.round(1 + stats.weaponThreat / 10)),
    statuses: [],
    cooldowns: {},
    charges: {},
  }
}

function finalizeLockstepCombatResult(input: {
  input: ResolveLockstepCombatRoundInput
  snapshot: CombatTurnSnapshot
  events: ReplayEvent[]
  log: string[]
  red: RoleRuntime
  blue: RoleRuntime
  elapsedSubsteps: number
}): CombatResult {
  const redDamage = round(input.red.maxHealth - input.red.health)
  const blueDamage = round(input.blue.maxHealth - input.blue.health)
  const redDead = input.red.health <= 0
  const blueDead = input.blue.health <= 0
  let winner: TeamRole | 'draw' = 'draw'
  let reason = 'Both bots survived the lockstep combat safety cap.'

  if (redDead && blueDead) {
    winner = blueDamage > redDamage ? 'red' : redDamage > blueDamage ? 'blue' : 'draw'
    reason = winner === 'draw'
      ? 'Both bots were knocked out with equal damage.'
      : 'Both bots were knocked out; damage dealt decided the result.'
  } else if (redDead) {
    winner = 'blue'
    reason = 'Red was knocked out.'
  } else if (blueDead) {
    winner = 'red'
    reason = 'Blue was knocked out.'
  } else if (input.red.health !== input.blue.health) {
    winner = input.red.health > input.blue.health ? 'red' : 'blue'
    reason = 'Lockstep combat reached the hard round cap; remaining health decided the result.'
  }

  input.log.push(`Round ${input.input.round}: ${reason}`)
  input.log.push(`Red damage taken: ${redDamage}. Blue damage taken: ${blueDamage}.`)

  return {
    winner,
    reason,
    damage: { red: redDamage, blue: blueDamage },
    remainingHealth: {
      red: round(input.red.health),
      blue: round(input.blue.health),
    },
    partHealth: {
      red: { ...input.red.partHealth },
      blue: { ...input.blue.partHealth },
    },
    stats: {
      red: input.red.stats as BotStats,
      blue: input.blue.stats as BotStats,
    },
    replay: createReplayTimeline({
      round: input.input.round,
      duration: replayDuration(input.events, input.elapsedSubsteps),
      events: input.events,
      summary: reason,
    }),
    log: input.log,
    ...(input.input.machineRuntime ? { machineRuntime: input.input.machineRuntime } : {}),
  }
}

function spawnEventsFromSnapshot(snapshot: CombatTurnSnapshot): ReplayEvent[] {
  return [
    { t: 0, type: 'spawn', bot: 'red', position: [...snapshot.red.position], rotation: [0, 90, 0] },
    { t: 0, type: 'spawn', bot: 'blue', position: [...snapshot.blue.position], rotation: [0, -90, 0] },
  ]
}

function describeReplayEvent(event: ReplayEvent): string {
  switch (event.type) {
    case 'spawn':
      return `${event.bot} spawned`
    case 'move':
      return `${event.bot} moved`
    case 'push':
      return `${event.attacker} pushed ${event.defender}`
    case 'ram':
      return `${event.attacker} rammed ${event.defender}`
    case 'bounce':
      return `${event.bot} bounced`
    case 'hazard_trigger':
      return `${event.bot} triggered ${event.hazard}`
    case 'weapon_fire':
      return `${event.bot} fired ${event.weaponSlot}`
    case 'impact':
      return `${event.attacker} hit ${event.defender}`
    case 'damage':
      return `${event.bot} took ${event.amount} damage`
    case 'knockout':
      return `${event.bot} was knocked out`
    default:
      return event.type
  }
}

function positionFor(arena: ArenaConfig, cell: GridCoord): Vector3 {
  return arenaCellCenter(compileArenaTopology(arena), cell)
}

function midpoint(left: Vector3, right: Vector3): Vector3 {
  return [round((left[0] + right[0]) / 2), 0, round((left[2] + right[2]) / 2)]
}

function replayTimeForSubstep(substep: number): number {
  return round(0.35 + Math.max(0, substep - 1) * LOCKSTEP_SUBSTEP_SECONDS)
}

function replayDuration(events: ReplayEvent[], elapsedSubsteps: number): number {
  const lastEventTime = events.reduce((latest, event) => Math.max(latest, event.t), 0)

  return Math.max(MIN_REPLAY_DURATION, round(Math.max(lastEventTime, replayTimeForSubstep(elapsedSubsteps)) + LOCKSTEP_TRAILING_SECONDS))
}

function cloneReplayEvent<T extends ReplayEvent>(event: T): T {
  return JSON.parse(JSON.stringify(event)) as T
}

function cloneCell(cell: GridCoord): GridCoord {
  return { x: cell.x, z: cell.z }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
