import type { AgentConnectionPacket } from '../../../../packages/schemas/src/index.js'
import type { AgentInvite } from '../shared/agentInvite.js'
import type { RolePrivateState } from './agentSessionTypes.js'
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
  const updateCurrentState = (state: RolePrivateState) => {
    setCurrentState(state)

    return state
  }
  const updateFromAgentPacket = async <T extends AgentConnectionPacket>(
    packet: T,
  ): Promise<T> => {
    try {
      const state = await client.getState()

      setCurrentState({
        ...state,
        agentPacket: state.agentPacket ?? packet,
      })
    } catch {
      const state = getCurrentState()

      if (state) {
        setCurrentState({
          ...state,
          agentPacket: packet,
        })
      }
    }

    return packet
  }
  const api = createAgentArenaRoleApi(client, getCurrentState, {
    ...overrides,
    bootstrapRole: async (input) => {
      const packet = await (
        overrides.bootstrapRole?.(input) ?? client.bootstrapRole(input)
      )

      storeInviteClaimToken()

      return updateFromAgentPacket(packet)
    },
    waitForAgentPacket: async (options) => {
      const packet = await (
        overrides.waitForAgentPacket?.(options) ??
        client.waitForAgentPacket(options)
      )

      storeInviteClaimToken()

      return updateFromAgentPacket(packet)
    },
    submitBuildAction: async (submission) => {
      const response = await (
        overrides.submitBuildAction?.(submission) ??
        client.submitBuildAction?.(submission) ??
        Promise.reject(new Error('submitBuildAction is unavailable for this client.'))
      )

      await updateFromAgentPacket(response.packet)

      return response
    },
    submitCombatPlan: async (submission) => {
      const response = await (
        overrides.submitCombatPlan?.(submission) ?? client.submitCombatPlan?.(submission)
      )

      if (!response) {
        throw new Error('submitCombatPlan is unavailable for this client.')
      }

      await updateFromAgentPacket(response.packet)

      return response
    },
    surrender: async (submission) => {
      const response = await (
        overrides.surrender?.(submission) ?? client.surrender?.(submission)
      )

      if (!response) {
        throw new Error('surrender is unavailable for this client.')
      }

      await updateFromAgentPacket(response.packet)

      return response
    },
    submitPostFightReflection: async (reflection) => {
      const response = await (
        overrides.submitPostFightReflection?.(reflection) ??
        client.submitPostFightReflection(reflection)
      )

      await updateFromAgentPacket(response.packet)

      return response
    },
    sendChatMessage: async (input) => {
      const response = await (
        overrides.sendChatMessage?.(input) ??
        client.sendChatMessage?.(input) ??
        client.submitChatMessage?.(input)
      )

      if (!response) {
        throw new Error('sendChatMessage is unavailable for this client.')
      }

      setCurrentState(response.state)

      return response
    },
  })

  return {
    ...api,
    getState: async () => updateCurrentState(await client.getState()),
  }
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
