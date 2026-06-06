import type {
  PublicSessionState,
  RolePrivateState,
} from '../../../packages/schemas/src/index.js'
import {
  cloneJson,
  rolePublicState,
} from './sessionSupport.js'
import { buildCombatTurnDecisionContext } from './sessionCombatDecision.js'
import type {
  StoredRoleState,
  StoredSessionState,
} from './sessionTypes.js'

export function buildRolePrivateState(
  state: StoredSessionState,
  role: StoredRoleState,
): RolePrivateState {
  const opponent = role.role === 'red' ? state.roles.blue : state.roles.red

  return cloneJson({
    sessionId: state.id,
    stateVersion: sessionStateVersion(state),
    role: role.role,
    phase: state.phase,
    round: state.round,
    expiresAt: state.expiresAt,
    gold: role.gold,
    wins: role.wins,
    losses: role.losses,
    winStreak: role.winStreak,
    inventory: role.inventory,
    ...(role.controls ? { controls: role.controls } : {}),
    submitted: Boolean(role.submittedAt),
    ...(role.submission ? { ownSubmission: role.submission } : {}),
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
            decision: buildCombatTurnDecisionContext(state, role, state.combat),
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

export function buildPublicSessionState(state: StoredSessionState): PublicSessionState {
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
    replayAvailable: Boolean(state.replay),
    ...(state.lastResult ? { lastResult: state.lastResult } : {}),
    chatLog: state.chatLog,
    eventLog: state.eventLog,
  })
}

export function sessionStateVersion(state: StoredSessionState): string {
  return [
    state.updatedAt,
    state.phase,
    state.round,
    state.roles.red.submittedAt ? 'red-submitted' : 'red-open',
    state.roles.blue.submittedAt ? 'blue-submitted' : 'blue-open',
    state.roundPlan ? `round-plan-${state.roundPlan.deadlineAt}` : 'round-plan-none',
    state.combat ? `combat-${state.combat.nextTick}-${state.combat.deadlineAt}` : 'combat-none',
    state.combat?.pending.red ? 'red-turn-submitted' : 'red-turn-open',
    state.combat?.pending.blue ? 'blue-turn-submitted' : 'blue-turn-open',
    state.eventLog.length,
    state.chatLog.length,
  ].join('|')
}
