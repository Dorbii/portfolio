import type {
  AgentBootstrapResponse,
  AgentConnectionPacket,
  AgentConnectionResponse,
  AgentConnectionSurrenderSubmission,
  CompactBuildActionSubmission,
  CompactCombatPlanSubmission,
  PostFightReflectionPostRequest,
  PostFightReflectionResponse,
} from '../../../../packages/schemas/src/index.js'
import type {
  AgentChatMessagePostRequest,
  AgentChatMessageResponse,
  PublicSessionState,
  RolePrivateState,
} from './agentSessionTypes.js'
import type {
  AgentArenaRoleApi,
  AgentArenaValidAction,
  AgentRoleConnectInput,
  AgentWaitOptions,
} from './agentClientTypes.js'
import { TERMINAL_PHASES } from './agentPhases.js'

export type AgentArenaRoleClient = {
  bootstrapRole: AgentArenaRoleApi['bootstrapRole']
  getState: AgentArenaRoleApi['getState']
  sendChatMessage?: AgentArenaRoleApi['sendChatMessage']
  submitBuildAction?: AgentArenaRoleApi['submitBuildAction']
  submitCombatPlan?: AgentArenaRoleApi['submitCombatPlan']
  surrender?: AgentArenaRoleApi['surrender']
  submitChatMessage?: (
    input: AgentChatMessagePostRequest | string,
  ) => Promise<AgentChatMessageResponse>
  submitPostFightReflection: AgentArenaRoleApi['submitPostFightReflection']
  waitForAgentPacket: AgentArenaRoleApi['waitForAgentPacket']
}

export function getValidAgentActions(
  state: RolePrivateState | null,
): AgentArenaValidAction[] {
  return [
    {
      name: 'bootstrap_role',
      available: true,
    },
    {
      name: 'get_role_state',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'wait_for_agent_packet',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_build_action',
      available: Boolean(state?.agentPacket?.phase === 'choose_loadout' && state.agentPacket?.nextAction === 'build_bot' && state.agentPacket?.build),
      ...(state
        ? state.agentPacket?.phase === 'choose_loadout' && state.agentPacket?.nextAction === 'build_bot' && state.agentPacket?.build
          ? {}
          : { reason: 'Compact build actions are only available during the build phase with packet.build present.' }
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_combat_plan',
      available: Boolean(state?.agentPacket?.phase === 'combat_turn' && state.agentPacket.nextAction === 'choose_turn' && state.agentPacket.combat),
      ...(state
        ? state.agentPacket?.phase === 'combat_turn' && state.agentPacket.nextAction === 'choose_turn' && state.agentPacket.combat
          ? {}
          : { reason: 'The current agent packet is not a playable combat packet.' }
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'surrender',
      available: Boolean(state?.agentPacket?.phase === 'combat_turn'),
      ...(state
        ? state.agentPacket?.phase === 'combat_turn'
          ? {}
          : { reason: 'Surrender is only available during combat.' }
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_post_fight_reflection',
      available: Boolean(state?.agentPacket?.nextAction === 'submit_reflection'),
      ...(state
        ? state.agentPacket?.nextAction === 'submit_reflection'
          ? {}
          : { reason: 'Private reflection is only available when requested by the agent packet.' }
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'send_chat_message',
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
  bootstrapRole?: (input?: AgentRoleConnectInput) => Promise<AgentBootstrapResponse>
  sendChatMessage?: (
    input: AgentChatMessagePostRequest | string,
  ) => Promise<AgentChatMessageResponse>
  submitBuildAction?: (
    submission: CompactBuildActionSubmission,
  ) => Promise<AgentConnectionResponse<PublicSessionState>>
  submitCombatPlan?: (
    submission: CompactCombatPlanSubmission,
  ) => Promise<AgentConnectionResponse<PublicSessionState>>
  surrender?: (
    submission: AgentConnectionSurrenderSubmission,
  ) => Promise<AgentConnectionResponse<PublicSessionState>>
  submitPostFightReflection?: (
    reflection: PostFightReflectionPostRequest,
  ) => Promise<PostFightReflectionResponse>
  waitForAgentPacket?: (options?: AgentWaitOptions) => Promise<AgentConnectionPacket>
}

export function createAgentArenaRoleApi(
  client: AgentArenaRoleClient,
  _getCurrentState: () => RolePrivateState | null,
  options: AgentArenaRoleApiOptions = {},
): AgentArenaRoleApi {
  return {
    bootstrapRole: (input) => options.bootstrapRole?.(input) ?? client.bootstrapRole(input),
    getState: () => client.getState(),
    waitForAgentPacket: (waitOptions) =>
      options.waitForAgentPacket?.(waitOptions) ??
        client.waitForAgentPacket(waitOptions),
    submitBuildAction: (submission) =>
      options.submitBuildAction?.(submission) ??
        client.submitBuildAction?.(submission) ??
        Promise.reject(new Error('submitBuildAction is unavailable for this client.')),
    submitCombatPlan: (submission) =>
      options.submitCombatPlan?.(submission) ??
        client.submitCombatPlan?.(submission) ??
        Promise.reject(new Error('submitCombatPlan is unavailable for this client.')),
    surrender: (submission) =>
      options.surrender?.(submission) ??
        client.surrender?.(submission) ??
        Promise.reject(new Error('surrender is unavailable for this client.')),
    submitPostFightReflection: (reflection) =>
      options.submitPostFightReflection?.(reflection) ??
        client.submitPostFightReflection(reflection),
    sendChatMessage: (input) =>
      options.sendChatMessage?.(input) ??
        client.sendChatMessage?.(input) ??
        client.submitChatMessage?.(input) ??
        Promise.reject(new Error('sendChatMessage is unavailable for this client.')),
  }
}

declare global {
  interface Window {
    AgentArenaRole?: AgentArenaRoleApi
  }
}
