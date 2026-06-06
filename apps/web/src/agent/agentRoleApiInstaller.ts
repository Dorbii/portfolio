import type {
  AgentBootstrapResponse,
  RoleClaimResponse,
  RolePrivateState,
  RoundSubmissionResponse,
} from '../../../../packages/schemas/src/index.js'
import type { AgentInvite } from '../shared/agentInvite.js'
import type {
  AgentArenaRoleApi,
  TokenStorage,
} from './agentClientTypes.js'
import {
  createAgentArenaRoleApi,
  type AgentArenaRoleApiOptions,
  type AgentArenaRoleClient,
} from './agentRoleApi.js'
import { writeStoredRoleToken } from './agentInviteParsing.js'

export type AgentArenaRoleApiInstallerOptions = {
  client: AgentArenaRoleClient
  invite: AgentInvite
  getCurrentState: () => RolePrivateState | null
  setCurrentState: (state: RolePrivateState) => void
  setRoleToken?: (token: string) => void
  storage?: TokenStorage
  overrides?: AgentArenaRoleApiOptions
}

export function createInstalledAgentArenaRoleApi({
  client,
  getCurrentState,
  invite,
  overrides = {},
  setCurrentState,
  setRoleToken,
  storage,
}: AgentArenaRoleApiInstallerOptions): AgentArenaRoleApi {
  const storeRoleToken = (token: string) => {
    setRoleToken?.(token)

    if (storage) {
      writeStoredRoleToken(storage, invite, token)
    }
  }
  const storeInviteClaimToken = () => {
    if (invite.claimToken) {
      storeRoleToken(invite.claimToken)
    }
  }
  const updateFromBootstrapResponse = (response: AgentBootstrapResponse) => {
    setCurrentState(response.state)

    return response
  }
  const updateFromClaimResponse = (response: RoleClaimResponse) => {
    storeRoleToken(response.roleToken)
    setCurrentState(response.state)

    return response
  }
  const updateFromRoundResponse = (response: RoundSubmissionResponse) => {
    setCurrentState(response.state)

    return response
  }
  const updateCurrentState = (state: RolePrivateState) => {
    setCurrentState(state)

    return state
  }
  const baseApi = createAgentArenaRoleApi(client, getCurrentState, {
    ...overrides,
    bootstrapRole: async (input) => {
      const response = await (
        overrides.bootstrapRole?.(input) ?? client.bootstrapRole(input)
      )

      storeInviteClaimToken()

      return updateFromBootstrapResponse(response)
    },
    claimRole: async (input) => {
      const response = await (
        overrides.claimRole?.(input) ?? client.claimInviteRole(input)
      )

      return updateFromClaimResponse(response)
    },
    waitForNextAction: async (options) => {
      const response = await (
        overrides.waitForNextAction?.(options) ?? client.waitForNextAction(options)
      )

      storeInviteClaimToken()

      return updateFromBootstrapResponse(response)
    },
    waitForNextSubmissionWindow: async (options) =>
      updateCurrentState(
        await (
          overrides.waitForNextSubmissionWindow?.(options) ??
          client.waitForNextSubmissionWindow(options)
        ),
      ),
    waitForPhase: async (phase, options) =>
      updateCurrentState(
        await (
          overrides.waitForPhase?.(phase, options) ??
          client.waitForPhase(phase, options)
        ),
      ),
    waitForStateChange: async (previousStateVersion, options) =>
      updateCurrentState(
        await (
          overrides.waitForStateChange?.(previousStateVersion, options) ??
          client.waitForStateChange(previousStateVersion, options)
        ),
      ),
  })
  const api: AgentArenaRoleApi = {
    ...baseApi,
    getState: async () => updateCurrentState(await client.getState()),
    getMatchLog: async () => {
      const state = await api.getState()

      return state.eventLog
    },
    getChatLog: async () => {
      const state = await api.getState()

      return state.chatLog
    },
    getPrivateChatLog: async () => {
      const state = await api.getState()

      return state.privateChatLog
    },
    submitFallbackRoundPlan: async () =>
      updateFromRoundResponse(await client.submitFallbackRoundPlan()),
    submitRoundPlan: async (plan) =>
      updateFromRoundResponse(await client.submitRoundPlan(plan)),
    submitChatMessage: async (input) => {
      const response = await client.submitChatMessage(input)

      setCurrentState(response.state)

      return response
    },
    submitPrivateChatMessage: async (input) => {
      const response = await client.submitPrivateChatMessage(input)

      setCurrentState(response.state)

      return response
    },
  }

  return api
}

export function installAgentArenaRoleApi(
  options: AgentArenaRoleApiInstallerOptions,
): () => void {
  const api = createInstalledAgentArenaRoleApi(options)

  window.AgentArenaRole = api

  return () => {
    if (window.AgentArenaRole === api) {
      delete window.AgentArenaRole
    }
  }
}
