import type {
  AgentBootstrapResponse,
  CombatRoundPlanSubmission,
  CompactBuildActionSubmission,
  GameMasterActionResponse,
  GameMasterActionSubmission,
  GameMasterPacket,
  PostFightReflectionPostRequest,
  PostFightReflectionResponse,
} from '../../../../packages/schemas/src/index.js'
import type {
  AgentChatMessagePostRequest,
  AgentChatMessageResponse,
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
  submitAction: AgentArenaRoleApi['submitAction']
  submitBuildAction?: AgentArenaRoleApi['submitBuildAction']
  submitCombatPlan?: AgentArenaRoleApi['submitCombatPlan']
  submitChatMessage?: (
    input: AgentChatMessagePostRequest | string,
  ) => Promise<AgentChatMessageResponse>
  submitPostFightReflection: AgentArenaRoleApi['submitPostFightReflection']
  waitForGameMasterPacket: AgentArenaRoleApi['waitForGameMasterPacket']
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
      name: 'wait_for_game_master_packet',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_game_action',
      available: Boolean(state?.gameMaster?.legalActions?.length),
      ...(state
        ? state.gameMaster?.legalActions?.length
          ? {}
          : {
              reason: state.gameMaster?.phase === 'choose_loadout' && state.gameMaster?.build
                ? 'The compact build packet has no legacy legalActions; use submit_build_action.'
                : 'The current GameMasterPacket has no legacy legalActions to submit.',
            }
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_build_action',
      available: Boolean(state?.gameMaster?.phase === 'choose_loadout' && state.gameMaster?.build),
      ...(state
        ? state.gameMaster?.phase === 'choose_loadout' && state.gameMaster?.build
          ? {}
          : { reason: 'Compact build actions are only available during the build phase with packet.build present.' }
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_combat_round_plan',
      available: Boolean(state?.gameMaster?.combat && !state.gameMaster.combat.submitted),
      ...(state
        ? state.gameMaster?.combat
          ? state.gameMaster.combat.submitted
            ? { reason: 'A combat round plan is already submitted for this round.' }
            : {}
          : { reason: 'The current GameMasterPacket is not a lockstep combat planning packet.' }
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_post_fight_reflection',
      available: Boolean(state?.gameMaster?.nextAction === 'submit_reflection'),
      ...(state
        ? state.gameMaster?.nextAction === 'submit_reflection'
          ? {}
          : { reason: 'Private reflection is only available when requested by the GameMasterPacket.' }
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
  submitAction?: (
    submission: GameMasterActionSubmission,
  ) => Promise<GameMasterActionResponse>
  submitBuildAction?: (
    submission: CompactBuildActionSubmission,
  ) => Promise<GameMasterActionResponse>
  submitCombatPlan?: (
    submission: CombatRoundPlanSubmission,
  ) => Promise<GameMasterActionResponse>
  submitPostFightReflection?: (
    reflection: PostFightReflectionPostRequest,
  ) => Promise<PostFightReflectionResponse>
  waitForGameMasterPacket?: (options?: AgentWaitOptions) => Promise<GameMasterPacket>
}

export function createAgentArenaRoleApi(
  client: AgentArenaRoleClient,
  _getCurrentState: () => RolePrivateState | null,
  options: AgentArenaRoleApiOptions = {},
): AgentArenaRoleApi {
  return {
    bootstrapRole: (input) => options.bootstrapRole?.(input) ?? client.bootstrapRole(input),
    getState: () => client.getState(),
    waitForGameMasterPacket: (waitOptions) =>
      options.waitForGameMasterPacket?.(waitOptions) ??
        client.waitForGameMasterPacket(waitOptions),
    submitAction: (submission) =>
      options.submitAction?.(submission) ?? client.submitAction(submission),
    submitBuildAction: (submission) =>
      options.submitBuildAction?.(submission) ??
        client.submitBuildAction?.(submission) ??
        Promise.reject(new Error('submitBuildAction is unavailable for this client.')),
    submitCombatPlan: (submission) =>
      options.submitCombatPlan?.(submission) ??
        client.submitCombatPlan?.(submission) ??
        Promise.reject(new Error('submitCombatPlan is unavailable for this client.')),
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
