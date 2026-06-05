import { useEffect } from 'react'
import type {
  RolePrivateState,
  RoundSubmissionResponse,
} from '../../../../packages/schemas/src/index.js'
import {
  AgentArenaClient,
  createAgentArenaRoleApi,
  parseAgentInviteFragment,
  readStoredRoleToken,
  writeStoredRoleToken,
  type AgentArenaRoleApi,
  type AgentWaitOptions,
} from './agentClient'

export function AgentRoutePreflight() {
  useEffect(() => {
    const cleanup = installAgentRoutePreflight()

    return cleanup ?? undefined
  }, [])

  return null
}

function installAgentRoutePreflight(): (() => void) | null {
  const parseResult = parseAgentInviteFragment(window.location.hash, window.location.origin)

  if (!parseResult.ok) {
    return null
  }

  const invite = parseResult.value
  let playerKey = readStoredRoleToken(window.sessionStorage, invite)
  const client = new AgentArenaClient({
    invite,
    getRoleToken: () => playerKey,
  })
  let currentState: RolePrivateState | null = null
  const updateFromRoundResponse = (response: RoundSubmissionResponse) => {
    currentState = response.state

    return response
  }
  const baseApi = createAgentArenaRoleApi(client, () => currentState)
  const api: AgentArenaRoleApi = {
    ...baseApi,
    bootstrapRole: async (input) => {
      const response = await client.bootstrapRole(input)

      if (invite.claimToken) {
        playerKey = invite.claimToken
        writeStoredRoleToken(window.sessionStorage, invite, invite.claimToken)
      }

      currentState = response.state

      return response
    },
    claimRole: async (input) => {
      const response = await client.claimInviteRole(input)

      playerKey = response.roleToken
      writeStoredRoleToken(window.sessionStorage, invite, response.roleToken)
      currentState = response.state

      return response
    },
    getState: async () => {
      currentState = await client.getState()

      return currentState
    },
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
    waitForNextAction: async (options?: AgentWaitOptions) => {
      const response = await client.waitForNextAction(options)

      if (invite.claimToken) {
        playerKey = invite.claimToken
        writeStoredRoleToken(window.sessionStorage, invite, invite.claimToken)
      }

      currentState = response.state

      return response
    },
    waitForStateChange: async (previousStateVersion, options) => {
      currentState = await client.waitForStateChange(previousStateVersion, options)

      return currentState
    },
    waitForPhase: async (phase, options) => {
      currentState = await client.waitForPhase(phase, options)

      return currentState
    },
    waitForNextSubmissionWindow: async (options) => {
      currentState = await client.waitForNextSubmissionWindow(options)

      return currentState
    },
    submitFallbackRoundPlan: async () =>
      updateFromRoundResponse(await client.submitFallbackRoundPlan()),
    submitRoundPlan: async (plan) =>
      updateFromRoundResponse(await client.submitRoundPlan(plan)),
    submitChatMessage: async (input) => {
      const response = await client.submitChatMessage(input)

      currentState = response.state

      return response
    },
    submitPrivateChatMessage: async (input) => {
      const response = await client.submitPrivateChatMessage(input)

      currentState = response.state

      return response
    },
  }

  window.AgentArenaRole = api

  return () => {
    if (window.AgentArenaRole === api) {
      delete window.AgentArenaRole
    }
  }
}
