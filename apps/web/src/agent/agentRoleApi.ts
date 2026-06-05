import type {
  RoleClaimResponse,
  RolePrivateState,
  SessionPhase,
} from '../../../../packages/schemas/src/index.js'
import { createBaselineRoundPlan } from './baselineRoundPlan.js'
import type { AgentArenaClient } from './agentClient.js'
import type {
  AgentArenaRoleApi,
  AgentArenaValidAction,
} from './agentClientTypes.js'

export const TERMINAL_PHASES = new Set<SessionPhase>(['session_complete', 'expired'])

export function getValidAgentActions(
  state: RolePrivateState | null,
): AgentArenaValidAction[] {
  return [
    {
      name: 'get_contract',
      available: true,
    },
    {
      name: 'bootstrap_role',
      available: true,
    },
    {
      name: 'claim_role',
      available: !state,
      ...(state ? { reason: 'Role is already claimed in this browser.' } : {}),
    },
    {
      name: 'get_role_state',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'get_match_log',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'get_chat_log',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'get_private_chat_log',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'wait_for_state_change',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'wait_for_next_submission_window',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase) && !(state.phase === 'submission_phase' && !state.submitted)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : state.phase === 'submission_phase' && !state.submitted
            ? { reason: 'Submission window is already open.' }
            : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'get_fallback_round_plan',
      available: true,
    },
    {
      name: 'submit_fallback_round_plan',
      available: Boolean(state && state.phase === 'submission_phase' && !state.submitted && state.gold >= 72),
      ...(state?.phase !== 'submission_phase'
        ? { reason: `Round plans are not open during ${state?.phase ?? 'unclaimed'}.` }
        : state.submitted
          ? { reason: 'This role has already submitted a round plan.' }
          : state.gold < 72
            ? { reason: 'Baseline Spinner requires 72 gold.' }
            : {}),
    },
    {
      name: 'submit_round_plan',
      available: Boolean(state && state.phase === 'submission_phase' && !state.submitted),
      ...(state?.phase !== 'submission_phase'
        ? { reason: `Round plans are not open during ${state?.phase ?? 'unclaimed'}.` }
        : state.submitted
          ? { reason: 'This role has already submitted a round plan.' }
          : {}),
    },
    {
      name: 'submit_chat_message',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_private_chat_message',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
  ]
}

export function createAgentArenaRoleApi(
  client: AgentArenaClient,
  getCurrentState: () => RolePrivateState | null,
  options: {
    claimRole?: (input?: { agentName?: string }) => Promise<RoleClaimResponse>
  } = {},
): AgentArenaRoleApi {
  return {
    getContract: () => client.getContract(),
    bootstrapRole: (input) => client.bootstrapRole(input),
    claimRole: (input) => options.claimRole?.(input) ?? client.claimInviteRole(input),
    getState: () => client.getState(),
    getValidActions: async () => getValidAgentActions(getCurrentState()),
    getFallbackRoundPlan: () => createBaselineRoundPlan(),
    submitFallbackRoundPlan: () => client.submitFallbackRoundPlan(),
    submitRoundPlan: (plan) => client.submitRoundPlan(plan),
    submitChatMessage: (input) => client.submitChatMessage(input),
    submitPrivateChatMessage: (input) => client.submitPrivateChatMessage(input),
    getMatchLog: () => client.getMatchLog(),
    getChatLog: () => client.getChatLog(),
    getPrivateChatLog: () => client.getPrivateChatLog(),
    waitForStateChange: (previousStateVersion) => client.waitForStateChange(previousStateVersion),
    waitForPhase: (phase) => client.waitForPhase(phase),
    waitForNextSubmissionWindow: () => client.waitForNextSubmissionWindow(),
  }
}

declare global {
  interface Window {
    AgentArenaRole?: AgentArenaRoleApi
  }
}
