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
import { useRoundPlanSubmission } from './useRoundPlanSubmission'

export { ROLE_STATE_POLL_MS } from './useAgentRoleSession'
export {
  isTerminalPhase,
  opponentLabel,
  submissionNotice,
} from './agentCockpitViewState'

export function useLiveAgentCockpitController(invite: AgentInvite) {
  const {
    agentName,
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
    setAgentName,
    setLastError,
    setNotice,
    setPublicState,
    setRoleState,
    setStatus,
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
    hasLocalDraftEdits,
    setSubmissionDraft,
    setSubmissionText,
    submissionDraft,
    submissionMode,
    submissionText,
    submitRoundPlan,
    toggleSubmissionMode,
  } = useRoundPlanSubmission({
    client,
    roleState,
    setLastError,
    setNotice,
    setPublicState,
    setRoleState,
    setStatus,
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
    canPostChat,
    canPostPrivateChat,
    canSubmitPlan,
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
        hasLocalDraftEdits,
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
      hasLocalDraftEdits,
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
    agentName,
    canClaimRole,
    canPostChat,
    canPostPrivateChat,
    canSubmitPlan,
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
    hasLocalDraftEdits,
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
    setAgentName,
    setChatKind,
    setChatMessage,
    setPrivateChatKind,
    setPrivateChatMessage,
    setSubmissionDraft,
    setSubmissionText,
    stateScript,
    status,
    submitChatMessage,
    submitPrivateChatMessage,
    submitRoundPlan,
    submissionDraft,
    submissionMode,
    submissionText,
    toggleSubmissionMode,
    workflow,
  }
}
