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
            submitted: {
              red: Boolean(state.combat.pending.red),
              blue: Boolean(state.combat.pending.blue),
            },
            snapshot: state.combat.snapshot,
            self: role.role === 'red' ? state.combat.snapshot.red : state.combat.snapshot.blue,
            opponent: role.role === 'red' ? state.combat.snapshot.blue : state.combat.snapshot.red,
            decision: buildCombatDecisionBrief(state, role, state.combat),
          },
        }
      : {}),
    opponent: rolePublicState(opponent),
    replayAvailable: Boolean(state.replay),
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
            submitted: {
              red: Boolean(state.combat.pending.red),
              blue: Boolean(state.combat.pending.blue),
            },
          },
        }
      : {}),
    gameMaster: buildGameMasterPublicSummary(state),
    replayAvailable: Boolean(state.replay),
    ...(state.lastResult ? { lastResult: state.lastResult } : {}),
    continuation: buildPublicContinuationState(state),
    chatLog: state.chatLog,
    eventLog: state.eventLog,
  })
}

export function sessionStateVersion(state: StoredSessionState): string {
  return [
    state.updatedAt,
    state.phase,
    state.round,
    state.roles.red.loadoutConfirmedAt ? 'red-loadout-confirmed' : 'red-loadout-open',
    state.roles.blue.loadoutConfirmedAt ? 'blue-loadout-confirmed' : 'blue-loadout-open',
    state.roundPlan ? `loadout-window-${state.roundPlan.deadlineAt}` : 'loadout-window-none',
    state.combat ? `combat-${state.combat.nextTick}-${state.combat.deadlineAt}` : 'combat-none',
    state.combat?.pending.red ? 'red-turn-submitted' : 'red-turn-open',
    state.combat?.pending.blue ? 'blue-turn-submitted' : 'blue-turn-open',
    state.eventLog.length,
    state.chatLog.length,
    state.reflections?.length ?? 0,
    state.sharedDebrief?.debriefId ?? 'debrief-none',
    state.championSave?.saveId ?? 'save-none',
    state.sourceChampionSave?.saveId ?? 'source-save-none',
    state.continuedSessionId ?? 'continued-none',
    state.quitAt ?? 'quit-none',
  ].join('|')
}

function buildPublicContinuationState(
  state: StoredSessionState,
): NonNullable<LegacyPublicSessionState['continuation']> {
  const save = state.championSave ?? state.sourceChampionSave
  const challengerBonusGold = state.championSave?.challengerBalance.bonusGold
    ?? state.continuationSeed?.challengerBonusGold

  return {
    completedFightCount: state.fightDossier?.fights.length ?? 0,
    ...(state.sharedDebrief ? { sharedDebrief: state.sharedDebrief } : {}),
    saved: Boolean(state.championSave),
    quit: Boolean(state.quitAt),
    ...(state.continuedSessionId ? { continuedSessionId: state.continuedSessionId } : {}),
    ...(save
      ? {
          championRole: save.championRole,
          championRecord: save.championRecord,
        }
      : {}),
    ...(challengerBonusGold !== undefined ? { challengerBonusGold } : {}),
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
      nextAction: state.lockedActions?.[roleName]
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
