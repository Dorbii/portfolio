import {
  cloneJson,
  rolePublicState,
} from './sessionSupport.js'
import { buildCombatDecisionBrief } from './sessionCombatDecision.js'
import {
  botDesignSnapshotToLegacyBotBlueprintProjection,
  machineDesignToLegacyBotBlueprintProjection,
} from '../../../packages/sim/src/index.js'
import type {
  GameMasterNextAction,
  GameMasterPhase,
  ReplayLifecycleStatus,
} from '../../../packages/schemas/src/index.js'
import type {
  LegacyPublicSessionState,
  LegacyRolePrivateState,
} from './sessionLegacyContracts.js'
import type {
  StoredRoleState,
  StoredSessionState,
} from './sessionTypes.js'

export function buildRolePrivateState(
  state: StoredSessionState,
  role: StoredRoleState,
): LegacyRolePrivateState {
  const opponent = role.role === 'red' ? state.roles.blue : state.roles.red
  const ownLoadout = legacyOwnLoadoutProjection(role)
  const replayAvailable = hasResolvedReplay(state)

  return cloneJson({
    sessionId: state.id,
    stateVersion: sessionStateVersion(state),
    role: role.role,
    ...(role.teamIdentity ? { identity: role.teamIdentity } : {}),
    phase: state.phase,
    round: state.round,
    expiresAt: state.expiresAt,
    gold: role.gold,
    wins: role.wins,
    losses: role.losses,
    winStreak: role.winStreak,
    inventory: role.inventory,
    ...(role.controls ? { controls: role.controls } : {}),
    submitted: Boolean(role.loadoutConfirmedAt),
    ...(ownLoadout ? { ownLoadout } : {}),
    ...(state.roundPlan ? { roundPlan: state.roundPlan } : {}),
    ...(state.combat
      ? {
          combat: {
            tick: state.combat.nextTick,
            openedAt: state.combat.openedAt,
            deadlineAt: state.combat.deadlineAt,
            turnSeconds: state.combat.turnSeconds,
            fightStartedAt: state.combat.fightStartedAt,
            fightDeadlineAt: state.combat.fightDeadlineAt,
            fightSeconds: state.combat.fightSeconds,
            cutoffReason: state.combat.cutoffReason,
            roundSeconds: state.combat.roundSeconds,
            decisionVersion: state.combat.decisionVersion,
            submitted: {
              red: Boolean(state.combat.submittedPlans?.red ?? state.combat.pending.red),
              blue: Boolean(state.combat.submittedPlans?.blue ?? state.combat.pending.blue),
            },
            mode: state.combat.mode,
            budgets: state.combat.budgets,
            submittedPlans: state.combat.submittedPlans,
            planConsumption: state.combat.planConsumption,
            lockstepEvents: state.combat.lockstepEvents,
            lockstepLog: state.combat.lockstepLog,
            elapsedSubsteps: state.combat.elapsedSubsteps,
            snapshot: state.combat.snapshot,
            self: role.role === 'red' ? state.combat.snapshot.red : state.combat.snapshot.blue,
            opponent: role.role === 'red' ? state.combat.snapshot.blue : state.combat.snapshot.red,
            decision: buildCombatDecisionBrief(state, role, state.combat),
          },
        }
      : {}),
    opponent: rolePublicState(opponent),
    replayAvailable,
    ...(state.lastResult ? { lastResult: state.lastResult } : {}),
    chatLog: state.chatLog,
    privateChatLog: role.privateChatLog,
    eventLog: state.eventLog,
  })
}

function legacyOwnLoadoutProjection(
  role: StoredRoleState,
): LegacyRolePrivateState['ownLoadout'] {
  // CODEX_INTENT: render ownLoadout from StoredDesign projections while keeping legacy display naming stable.
  // CODEX_RISK: behavioral
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  if (!role.loadoutConfirmedAt) {
    return undefined
  }

  if (role.storedDesign?.version === 'machine:v1') {
    return {
      blueprint: legacyNamedProjection(
        machineDesignToLegacyBotBlueprintProjection(role.storedDesign.machine),
        legacyProjectionNameForRole(role),
      ),
      confirmedAt: role.loadoutConfirmedAt,
      machineDesign: role.storedDesign.machine,
    }
  }

  const legacyDesign = role.storedDesign?.version === 'legacy-bot-design:v1'
    ? role.storedDesign.design
    : role.currentDesign

  return legacyDesign
    ? {
        blueprint: legacyNamedProjection(
          botDesignSnapshotToLegacyBotBlueprintProjection(legacyDesign),
          legacyProjectionNameForRole(role),
        ),
        confirmedAt: role.loadoutConfirmedAt,
      }
    : undefined
}

function legacyProjectionNameForRole(role: StoredRoleState): string | undefined {
  return role.loadoutBuildState?.legacyDraft?.name ?? role.currentDesign?.name
}

function legacyNamedProjection<T extends { name: string }>(
  projection: T,
  legacyName: string | undefined,
): T {
  return legacyName ? { ...projection, name: legacyName } : projection
}

export function buildPublicSessionState(state: StoredSessionState): LegacyPublicSessionState {
  const replayAvailable = hasResolvedReplay(state)

  return cloneJson({
    sessionId: state.id,
    stateVersion: sessionStateVersion(state),
    phase: state.phase,
    round: state.round,
    maxRounds: state.maxRounds,
    expiresAt: state.expiresAt,
    arena: state.arena,
    roles: {
      red: rolePublicState(state.roles.red),
      blue: rolePublicState(state.roles.blue),
    },
    ...(state.roundPlan ? { roundPlan: state.roundPlan } : {}),
    ...(state.combat
      ? {
          combat: {
            tick: state.combat.nextTick,
            openedAt: state.combat.openedAt,
            deadlineAt: state.combat.deadlineAt,
            turnSeconds: state.combat.turnSeconds,
            fightStartedAt: state.combat.fightStartedAt,
            fightDeadlineAt: state.combat.fightDeadlineAt,
            fightSeconds: state.combat.fightSeconds,
            cutoffReason: state.combat.cutoffReason,
            roundSeconds: state.combat.roundSeconds,
            decisionVersion: state.combat.decisionVersion,
            submitted: {
              red: Boolean(state.combat.submittedPlans?.red ?? state.combat.pending.red),
              blue: Boolean(state.combat.submittedPlans?.blue ?? state.combat.pending.blue),
            },
            mode: state.combat.mode,
            budgets: state.combat.budgets,
            planConsumption: state.combat.planConsumption,
          },
        }
      : {}),
    gameMaster: buildGameMasterPublicSummary(state),
    replayStatus: replayStatus(state),
    replayAvailable,
    ...(replayAvailable ? { replayVersion: replayVersion(state) } : {}),
    ...(state.lastResult ? { lastResult: state.lastResult } : {}),
    continuation: buildPublicContinuationState(state),
    chatLog: state.chatLog,
    eventLog: state.eventLog,
  })
}

export function replayVersion(state: StoredSessionState): string | undefined {
  const replay = state.replay

  if (!replay || !hasResolvedReplay(state)) {
    return undefined
  }

  const lastEvent = replay.events.at(-1)
  const lastEventMarker = lastEvent ? `${lastEvent.t}:${lastEvent.type}` : 'none'
  const resultMarker = state.lastResult
    ? `${state.lastResult.winner}:${state.lastResult.reason}`
    : 'result-open'

  return [
    'replay',
    replay.round,
    replay.duration,
    replay.events.length,
    lastEventMarker,
    resultMarker,
  ].join('|')
}

export function replayStatus(state: StoredSessionState): ReplayLifecycleStatus {
  if (state.combat) {
    return 'live_partial'
  }

  if (state.replay) {
    return 'resolved'
  }

  return 'none'
}

export function hasResolvedReplay(state: StoredSessionState): boolean {
  return Boolean(state.replay && !state.combat)
}

export function sessionStateVersion(state: StoredSessionState): string {
  return [
    state.updatedAt,
    state.phase,
    state.round,
    state.roles.red.loadoutConfirmedAt ? 'red-loadout-confirmed' : 'red-loadout-open',
    state.roles.blue.loadoutConfirmedAt ? 'blue-loadout-confirmed' : 'blue-loadout-open',
    state.roundPlan ? `loadout-window-${state.roundPlan.deadlineAt}` : 'loadout-window-none',
    state.combat
      ? `combat-${state.combat.nextTick}-${state.combat.deadlineAt}-${state.combat.fightDeadlineAt ?? 'fight-deadline-none'}`
      : 'combat-none',
    state.combat?.submittedPlans?.red || state.combat?.pending.red ? 'red-turn-submitted' : 'red-turn-open',
    state.combat?.submittedPlans?.blue || state.combat?.pending.blue ? 'blue-turn-submitted' : 'blue-turn-open',
    state.eventLog.length,
    state.chatLog.length,
    state.reflections?.length ?? 0,
    state.sharedDebrief?.debriefId ?? 'debrief-none',
    state.sourceChampionSave?.saveId ?? 'source-save-none',
  ].join('|')
}

function buildPublicContinuationState(
  state: StoredSessionState,
): NonNullable<LegacyPublicSessionState['continuation']> {
  return {
    completedFightCount: state.fightDossier?.fights.length ?? 0,
    ...(state.sharedDebrief ? { sharedDebrief: state.sharedDebrief } : {}),
  }
}

function buildGameMasterPublicSummary(
  state: StoredSessionState,
): LegacyPublicSessionState['gameMaster'] {
  const summaries: NonNullable<LegacyPublicSessionState['gameMaster']> = {}

  for (const roleName of ['red', 'blue'] as const) {
    const activeSet = state.activeActionSets?.[roleName]

    if (!activeSet) {
      continue
    }

    summaries[roleName] = {
      phase: activeSet.phase,
      nextAction: state.lockedActions?.[roleName] || state.combat?.submittedPlans?.[roleName]
        ? nextActionAfterLock(activeSet.phase)
        : nextActionForPhase(activeSet.phase),
      decisionVersion: activeSet.decisionVersion,
      eventVersion: state.eventLog.length + state.chatLog.length,
      actionSetId: activeSet.actionSetId,
    }
  }

  return Object.keys(summaries).length > 0 ? summaries : undefined
}

function nextActionForPhase(phase: GameMasterPhase): GameMasterNextAction {
  return phase === 'combat_turn' ? 'choose_turn' : 'build_bot'
}

function nextActionAfterLock(phase: GameMasterPhase): GameMasterNextAction {
  return phase === 'combat_turn' ? 'wait_for_opponent_turn' : 'wait_for_opponent_loadout'
}
