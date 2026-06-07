import type { GameMasterPacket } from '../../../../packages/schemas/src/index.js'
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
  const updateFromGameMasterPacket = async <T extends GameMasterPacket>(
    packet: T,
  ): Promise<T> => {
    try {
      const state = await client.getState()

      setCurrentState({
        ...state,
        gameMaster: state.gameMaster ?? packet,
      })
    } catch {
      const state = getCurrentState()

      if (state) {
        setCurrentState({
          ...state,
          gameMaster: packet,
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

      return updateFromGameMasterPacket(packet)
    },
    waitForGameMasterPacket: async (options) => {
      const packet = await (
        overrides.waitForGameMasterPacket?.(options) ??
        client.waitForGameMasterPacket(options)
      )

      storeInviteClaimToken()

      return updateFromGameMasterPacket(packet)
    },
    submitAction: async (submission) => {
      const response = await (
        overrides.submitAction?.(submission) ?? client.submitAction(submission)
      )

      await updateFromGameMasterPacket(response.packet)

      return response
    },
    submitPostFightReflection: async (reflection) => {
      const response = await (
        overrides.submitPostFightReflection?.(reflection) ??
        client.submitPostFightReflection(reflection)
      )

      await updateFromGameMasterPacket(response.packet)

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
