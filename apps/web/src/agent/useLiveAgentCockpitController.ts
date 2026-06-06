import { useCallback, useMemo } from 'react'
import {
  createAgentInviteUrl,
  type AgentInvite,
} from './agentClient'
import {
  createCockpitBriefArtifacts,
  createCockpitDerivedState,
} from './agentCockpitViewState'
import { useAgentChatForms } from './useAgentChatForms'
import { useAgentRoleSession } from './useAgentRoleSession'

export { ROLE_STATE_POLL_MS } from './agentRolePolling'
export {
  isTerminalPhase,
  opponentLabel,
  submissionNotice,
} from './agentCockpitViewState'

export function useLiveAgentCockpitController(invite: AgentInvite) {
  const {
    claimRole,
    connectRole,
    clearRoleToken,
    client,
    lastError,
    loadState,
    notice,
    publicState,
    roleState,
    roleToken,
    setLastError,
    setNotice,
    setPublicState,
    setRoleState,
    status,
  } = useAgentRoleSession(invite)
  const agentInviteUrl = useMemo(
    () => createAgentInviteUrl(invite, window.location.origin),
    [invite],
  )
  const {
    chatKind,
    chatMessage,
    chatStatus,
    privateChatKind,
    privateChatMessage,
    privateChatStatus,
    setChatKind,
    setChatMessage,
    setPrivateChatKind,
    setPrivateChatMessage,
    submitChatMessage,
    submitPrivateChatMessage,
  } = useAgentChatForms({
    client,
    roleState,
    setLastError,
    setNotice,
    setPublicState,
    setRoleState,
  })
  const {
    externalAgentBriefMarkdown,
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
    canPostChat,
    canPostPrivateChat,
    chatLog,
    claimButtonLabel,
    connectionGuidance,
    hasPlayerKey,
    isBusy,
    matchLog,
    privateChatLog,
    refreshButtonLabel,
    roleHasChatLog,
    roleHasMatchLog,
    roleHasPrivateChatLog,
    workflow,
  } = useMemo(
    () =>
      createCockpitDerivedState({
        chatMessage,
        chatStatus,
        invite,
        lastError,
        privateChatMessage,
        privateChatStatus,
        publicState,
        roleState,
        roleToken,
        status,
      }),
    [
      chatMessage,
      chatStatus,
      invite,
      lastError,
      privateChatMessage,
      privateChatStatus,
      publicState,
      roleState,
      roleToken,
      status,
    ],
  )

  const copyExternalAgentBrief = useCallback(() => {
    return navigator.clipboard
      .writeText(externalAgentBriefMarkdown)
      .then(() => {
        setNotice('External agent brief copied.')
      })
      .catch(() => {
        setLastError({
          title: 'Clipboard copy blocked',
          message: 'Select and copy the external agent brief manually.',
        })
      })
  }, [externalAgentBriefMarkdown, setLastError, setNotice])

  return {
    agentInviteUrl,
    canClaimRole,
    canMutateRole,
    canPostChat,
    canPostPrivateChat,
    chatKind,
    chatLog,
    chatMessage,
    chatStatus,
    claimButtonLabel,
    claimRole,
    connectRole,
    clearRoleToken,
    connectionGuidance,
    copyExternalAgentBrief,
    externalAgentBriefMarkdown,
    externalAgentBriefScript,
    hasPlayerKey,
    isBusy,
    lastError,
    loadState,
    matchLog,
    notice,
    privateChatKind,
    privateChatLog,
    privateChatMessage,
    privateChatStatus,
    publicState,
    refreshButtonLabel,
    roleHasChatLog,
    roleHasMatchLog,
    roleHasPrivateChatLog,
    roleState,
    roleToken,
    setChatKind,
    setChatMessage,
    setPrivateChatKind,
    setPrivateChatMessage,
    stateScript,
    status,
    submitChatMessage,
    submitPrivateChatMessage,
    workflow,
  }
}
