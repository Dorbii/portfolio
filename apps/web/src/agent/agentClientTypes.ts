import type {
  AgentChatMessagePostRequest,
  AgentChatMessageResponse,
  AgentBootstrapResponse,
  AgentPrivateChatMessagePostRequest,
  AgentPrivateChatMessageResponse,
  RoleClaimResponse,
  RolePrivateState,
  RoundPlanSubmission,
  RoundSubmissionResponse,
  SessionChatMessage,
  SessionLogEvent,
  SessionPhase,
} from '../../../../packages/schemas/src/index.js'
import type { createAgentContract } from '../../../../packages/schemas/src/agentContract.js'
import type { AgentInvite } from '../shared/agentInvite.js'

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
    | 'get_contract'
    | 'bootstrap_role'
    | 'claim_role'
    | 'get_role_state'
    | 'get_match_log'
    | 'get_chat_log'
    | 'get_private_chat_log'
    | 'wait_for_state_change'
    | 'wait_for_next_submission_window'
    | 'wait_for_next_action'
    | 'get_fallback_round_plan'
    | 'submit_fallback_round_plan'
    | 'submit_round_plan'
    | 'submit_chat_message'
    | 'submit_private_chat_message'
  available: boolean
  reason?: string
}

export type AgentWaitOptions = {
  pollMs?: number
  timeoutMs?: number
}

export type AgentArenaRoleApi = {
  getContract(): Promise<AgentContract>
  bootstrapRole(input?: { agentName?: string }): Promise<AgentBootstrapResponse>
  claimRole(input?: { agentName?: string }): Promise<RoleClaimResponse>
  getState(): Promise<RolePrivateState>
  getValidActions(): Promise<AgentArenaValidAction[]>
  getFallbackRoundPlan(): RoundPlanSubmission
  submitFallbackRoundPlan(): Promise<RoundSubmissionResponse>
  submitRoundPlan(
    plan: RoundPlanSubmission,
  ): Promise<RoundSubmissionResponse>
  submitChatMessage(
    input: AgentChatMessagePostRequest | string,
  ): Promise<AgentChatMessageResponse>
  submitPrivateChatMessage(
    input: AgentPrivateChatMessagePostRequest | string,
  ): Promise<AgentPrivateChatMessageResponse>
  getMatchLog(): Promise<SessionLogEvent[]>
  getChatLog(): Promise<SessionChatMessage[]>
  getPrivateChatLog(): Promise<SessionChatMessage[]>
  waitForStateChange(
    previousStateVersion?: string,
    options?: AgentWaitOptions,
  ): Promise<RolePrivateState>
  waitForPhase(phase: SessionPhase, options?: AgentWaitOptions): Promise<RolePrivateState>
  waitForNextSubmissionWindow(options?: AgentWaitOptions): Promise<RolePrivateState>
  waitForNextAction(options?: AgentWaitOptions): Promise<AgentBootstrapResponse>
}
