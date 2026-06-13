import type {
  AgentBootstrapResponse,
  AgentConnectionPacket,
  AgentConnectionResponse,
  AgentConnectionSurrenderSubmission,
  CompactCombatPlanSubmission,
  CompactBuildActionSubmission,
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
  PublicSessionState,
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
    | 'wait_for_agent_packet'
    | 'submit_build_action'
    | 'submit_combat_plan'
    | 'surrender'
    | 'submit_post_fight_reflection'
    | 'send_chat_message'
  available: boolean
  reason?: string
}

export type AgentWaitOptions = {
  pollMs?: number
  previousEventVersion?: number
  timeoutMs?: number
}

export type AgentRoleConnectInput = {
  agentName?: string
  teamIdentity?: TeamIdentity
}

export type AgentArenaRoleApi = {
  bootstrapRole(input?: AgentRoleConnectInput): Promise<AgentBootstrapResponse>
  getState(): Promise<RolePrivateState>
  waitForAgentPacket(options?: AgentWaitOptions): Promise<AgentConnectionPacket>
  submitBuildAction(
    submission: CompactBuildActionSubmission,
  ): Promise<AgentConnectionResponse<PublicSessionState>>
  submitCombatPlan(
    submission: CompactCombatPlanSubmission,
  ): Promise<AgentConnectionResponse<PublicSessionState>>
  surrender(
    submission: AgentConnectionSurrenderSubmission,
  ): Promise<AgentConnectionResponse<PublicSessionState>>
  submitPostFightReflection(
    reflection: PostFightReflectionPostRequest,
  ): Promise<PostFightReflectionResponse>
  sendChatMessage(
    input: AgentChatMessagePostRequest | string,
  ): Promise<AgentChatMessageResponse>
}

export type { SessionPhase }
