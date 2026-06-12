import { useMemo } from 'react'
import type { AgentInvite } from './agentClient'
import {
  createCockpitStateScript,
  createCockpitDerivedState,
} from './agentCockpitViewState'
import { useAgentRoleSession } from './useAgentRoleSession'

export { ROLE_STATE_POLL_MS } from './agentRolePolling'

export function useLiveAgentCockpitController(invite: AgentInvite) {
  const {
    connectRole,
    clearRoleToken,
    lastError,
    loadState,
    publicState,
    roleState,
    roleToken,
    status,
  } = useAgentRoleSession(invite)
  const stateScript = useMemo(
    () =>
      createCockpitStateScript({
        invite,
        publicState,
        roleState,
      }),
    [invite, publicState, roleState],
  )
  const {
    canMutateRole,
    chatLog,
    hasPlayerKey,
    isBusy,
    privateChatLog,
    refreshButtonLabel,
    roleHasChatLog,
    roleHasPrivateChatLog,
  } = useMemo(
    () =>
      createCockpitDerivedState({
        invite,
        publicState,
        roleState,
        roleToken,
        status,
      }),
    [
      invite,
      publicState,
      roleState,
      roleToken,
      status,
    ],
  )

  return {
    canMutateRole,
    chatLog,
    connectRole,
    clearRoleToken,
    hasPlayerKey,
    isBusy,
    lastError,
    loadState,
    privateChatLog,
    publicState,
    refreshButtonLabel,
    roleHasChatLog,
    roleHasPrivateChatLog,
    roleState,
    roleToken,
    stateScript,
    status,
  }
}
