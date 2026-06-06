import type {
  AgentBootstrapResponse,
  RoleClaimResponse,
  RolePrivateState,
  SessionPhase,
} from '../../../../packages/schemas/src/index.js'
import { createBaselineRoundPlan } from './baselineRoundPlan.js'
import type {
  AgentArenaRoleApi,
  AgentArenaValidAction,
  AgentWaitOptions,
} from './agentClientTypes.js'
import { TERMINAL_PHASES } from './agentPhases.js'

export type AgentArenaRoleClient = {
  bootstrapRole: AgentArenaRoleApi['bootstrapRole']
  claimInviteRole: AgentArenaRoleApi['claimRole']
  getChatLog: AgentArenaRoleApi['getChatLog']
  getContract: AgentArenaRoleApi['getContract']
  getMatchLog: AgentArenaRoleApi['getMatchLog']
  getPrivateChatLog: AgentArenaRoleApi['getPrivateChatLog']
  getState: AgentArenaRoleApi['getState']
  submitChatMessage: AgentArenaRoleApi['submitChatMessage']
  submitFallbackRoundPlan: AgentArenaRoleApi['submitFallbackRoundPlan']
  submitPrivateChatMessage: AgentArenaRoleApi['submitPrivateChatMessage']
  submitRoundPlan: AgentArenaRoleApi['submitRoundPlan']
  submitTurnCommand: AgentArenaRoleApi['submitTurnCommand']
  waitForNextAction: AgentArenaRoleApi['waitForNextAction']
  waitForNextSubmissionWindow: AgentArenaRoleApi['waitForNextSubmissionWindow']
  waitForPhase: AgentArenaRoleApi['waitForPhase']
  waitForStateChange: AgentArenaRoleApi['waitForStateChange']
}

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
      name: 'wait_for_next_action',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
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
      name: 'submit_turn_command',
      available: Boolean(state && state.phase === 'combat_turn' && !state.combat?.submitted[state.role]),
      ...(state?.phase !== 'combat_turn'
        ? { reason: `Combat turns are not open during ${state?.phase ?? 'unclaimed'}.` }
        : state.combat?.submitted[state.role]
          ? { reason: 'This role has already submitted the current combat turn.' }
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

export type AgentArenaRoleApiOptions = {
  bootstrapRole?: (input?: { agentName?: string }) => Promise<AgentBootstrapResponse>
  claimRole?: (input?: { agentName?: string }) => Promise<RoleClaimResponse>
  waitForNextAction?: (options?: AgentWaitOptions) => Promise<AgentBootstrapResponse>
  waitForNextSubmissionWindow?: (options?: AgentWaitOptions) => Promise<RolePrivateState>
  waitForPhase?: (phase: SessionPhase, options?: AgentWaitOptions) => Promise<RolePrivateState>
  waitForStateChange?: (
    previousStateVersion?: string,
    options?: AgentWaitOptions,
  ) => Promise<RolePrivateState>
}

export function createAgentArenaRoleApi(
  client: AgentArenaRoleClient,
  getCurrentState: () => RolePrivateState | null,
  options: AgentArenaRoleApiOptions = {},
): AgentArenaRoleApi {
  return {
    getContract: () => client.getContract(),
    bootstrapRole: (input) => options.bootstrapRole?.(input) ?? client.bootstrapRole(input),
    claimRole: (input) => options.claimRole?.(input) ?? client.claimInviteRole(input),
    getState: () => client.getState(),
    getValidActions: async () => getValidAgentActions(getCurrentState()),
    getFallbackRoundPlan: () => createBaselineRoundPlan(),
    submitFallbackRoundPlan: () => client.submitFallbackRoundPlan(),
    submitRoundPlan: (plan) => client.submitRoundPlan(plan),
    submitTurnCommand: (command) => client.submitTurnCommand(command),
    submitChatMessage: (input) => client.submitChatMessage(input),
    submitPrivateChatMessage: (input) => client.submitPrivateChatMessage(input),
    getMatchLog: () => client.getMatchLog(),
    getChatLog: () => client.getChatLog(),
    getPrivateChatLog: () => client.getPrivateChatLog(),
    waitForStateChange: (previousStateVersion, waitOptions) =>
      options.waitForStateChange?.(previousStateVersion, waitOptions) ??
        client.waitForStateChange(previousStateVersion, waitOptions),
    waitForPhase: (phase, waitOptions) =>
      options.waitForPhase?.(phase, waitOptions) ?? client.waitForPhase(phase, waitOptions),
    waitForNextSubmissionWindow: (waitOptions) =>
      options.waitForNextSubmissionWindow?.(waitOptions) ??
        client.waitForNextSubmissionWindow(waitOptions),
    waitForNextAction: (waitOptions) =>
      options.waitForNextAction?.(waitOptions) ?? client.waitForNextAction(waitOptions),
  }
}

declare global {
  interface Window {
    AgentArenaRole?: AgentArenaRoleApi
  }
}
