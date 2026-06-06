import { useMemo } from 'react'
import {
  createAgentInviteUrl,
  type AgentInvite,
} from './agentClient'
import {
  createCockpitBriefArtifacts,
  createCockpitDerivedState,
} from './agentCockpitViewState'
import { useAgentRoleSession } from './useAgentRoleSession'

export { ROLE_STATE_POLL_MS } from './agentRolePolling'
export {
  isTerminalPhase,
  opponentLabel,
  submissionNotice,
} from './agentCockpitViewState'

export function useLiveAgentCockpitController(invite: AgentInvite) {
  const {
    connectRole,
    clearRoleToken,
    lastError,
    loadState,
    notice,
    publicState,
    roleState,
    roleToken,
    status,
  } = useAgentRoleSession(invite)
  const agentInviteUrl = useMemo(
    () => createAgentInviteUrl(invite, window.location.origin),
    [invite],
  )
  const {
    externalAgentBriefScript,
    stateScript,
  } = useMemo(
    () =>
      createCockpitBriefArtifacts({
        agentInviteUrl,
        invite,
        publicState,
        roleState,
      }),
    [agentInviteUrl, invite, publicState, roleState],
  )
  const {
    canClaimRole,
    canMutateRole,
    chatLog,
    claimButtonLabel,
    connectionGuidance,
    hasPlayerKey,
    isBusy,
    privateChatLog,
    refreshButtonLabel,
    roleHasChatLog,
    roleHasPrivateChatLog,
    workflow,
  } = useMemo(
    () =>
      createCockpitDerivedState({
        invite,
        lastError,
        publicState,
        roleState,
        roleToken,
        status,
      }),
    [
      invite,
      lastError,
      publicState,
      roleState,
      roleToken,
      status,
    ],
  )

  return {
    canClaimRole,
    canMutateRole,
    chatLog,
    claimButtonLabel,
    connectRole,
    clearRoleToken,
    connectionGuidance,
    externalAgentBriefScript,
    hasPlayerKey,
    isBusy,
    lastError,
    loadState,
    notice,
    privateChatLog,
    publicState,
    refreshButtonLabel,
    roleHasChatLog,
    roleHasPrivateChatLog,
    roleState,
    roleToken,
    stateScript,
    status,
    workflow,
  }
}
