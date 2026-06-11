import type {
  AgentBootstrapResponse,
  CombatRoundPlanSubmission,
  CompactBuildActionSubmission,
  GameMasterActionResponse,
  GameMasterActionSubmission,
  GameMasterPacket,
  PostFightReflectionPostRequest,
  PostFightReflectionResponse,
  SessionPhase,
  TeamIdentity,
} from '../../../../packages/schemas/src/index.js'
import type { createAgentContract } from '../../../../packages/schemas/src/agentContract.js'
import type { AgentInvite } from '../shared/agentInvite.js'
import type {
  AgentChatMessagePostRequest,
  AgentChatMessageResponse,
  RolePrivateState,
} from './agentSessionTypes.js'

export type AgentContract = ReturnType<typeof createAgentContract>

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type AgentInviteParseResult =
  | {
      ok: true
      value: AgentInvite
    }
  | {
      ok: false
      errors: string[]
    }

export type AgentArenaValidAction = {
  name:
    | 'bootstrap_role'
    | 'get_role_state'
    | 'wait_for_game_master_packet'
    | 'submit_game_action'
    | 'submit_build_action'
    | 'submit_combat_round_plan'
    | 'submit_post_fight_reflection'
    | 'send_chat_message'
  available: boolean
  reason?: string
}

export type AgentWaitOptions = {
  pollMs?: number
  previousEventVersion?: number
  requireLegalActions?: boolean
  timeoutMs?: number
}

export type AgentRoleConnectInput = {
  agentName?: string
  teamIdentity?: TeamIdentity
}

export type AgentArenaRoleApi = {
  bootstrapRole(input?: AgentRoleConnectInput): Promise<AgentBootstrapResponse>
  getState(): Promise<RolePrivateState>
  waitForGameMasterPacket(options?: AgentWaitOptions): Promise<GameMasterPacket>
  submitAction(
    submission: GameMasterActionSubmission,
  ): Promise<GameMasterActionResponse>
  submitBuildAction(
    submission: CompactBuildActionSubmission,
  ): Promise<GameMasterActionResponse>
  submitCombatPlan(
    submission: CombatRoundPlanSubmission,
  ): Promise<GameMasterActionResponse>
  submitPostFightReflection(
    reflection: PostFightReflectionPostRequest,
  ): Promise<PostFightReflectionResponse>
  sendChatMessage(
    input: AgentChatMessagePostRequest | string,
  ): Promise<AgentChatMessageResponse>
}

export type { SessionPhase }
