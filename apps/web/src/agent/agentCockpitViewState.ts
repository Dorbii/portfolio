import type {
  PublicSessionState,
  RolePrivateState,
  SessionChatMessage,
} from './agentSessionTypes.js'
import {
  AgentArenaApiError,
  getValidAgentActions,
  serializeJsonForScript,
  type AgentInvite,
} from './agentClient'
import type { UiError } from './AgentCockpitPanels'

export type LoadStatus = 'idle' | 'claiming' | 'loading' | 'ready'

type CockpitStateScriptInput = {
  invite: AgentInvite
  publicState: PublicSessionState | null
  roleState: RolePrivateState | null
}

type CockpitDerivedStateInput = {
  invite: AgentInvite
  publicState: PublicSessionState | null
  roleState: RolePrivateState | null
  roleToken: string
  status: LoadStatus
}

export type CockpitDerivedState = {
  canMutateRole: boolean
  chatLog: SessionChatMessage[]
  hasPlayerKey: boolean
  isBusy: boolean
  privateChatLog: SessionChatMessage[]
  refreshButtonLabel: string
  roleHasChatLog: boolean
  roleHasPrivateChatLog: boolean
}

export function createCockpitStateScript({
  invite,
  publicState,
  roleState,
}: CockpitStateScriptInput): string {
  return serializeJsonForScript({
    ok: Boolean(roleState),
    invite: {
      sessionId: invite.sessionId,
      role: invite.role,
      apiBase: invite.apiBase,
      claimTokenPresent: Boolean(invite.claimToken),
      observerTokenPresent: Boolean(invite.observerToken),
    },
    contractUrl: `${invite.apiBase}/agent-spec.json`,
    state: roleState,
    publicState,
    validActions: getValidAgentActions(roleState),
  })
}

export function createCockpitDerivedState({
  invite,
  publicState,
  roleState,
  roleToken,
  status,
}: CockpitDerivedStateInput): CockpitDerivedState {
  const isBusy = status === 'claiming' || status === 'loading'
  const isObserverCockpit = Boolean(invite.observerToken && !invite.claimToken)
  const hasAccessKey = Boolean(roleToken || invite.claimToken || invite.observerToken)
  const canMutateRole = Boolean(!isObserverCockpit && (roleToken || invite.claimToken))
  const chatLog = roleState?.chatLog ?? publicState?.chatLog ?? []
  const privateChatLog = roleState?.privateChatLog ?? []

  return {
    canMutateRole,
    chatLog,
    hasPlayerKey: hasAccessKey,
    isBusy,
    privateChatLog,
    refreshButtonLabel: status === 'loading' ? 'Refreshing...' : 'Refresh state',
    roleHasChatLog: chatLog.length > 0,
    roleHasPrivateChatLog: privateChatLog.length > 0,
  }
}

export function toUiError(error: unknown, title: string): UiError {
  if (error instanceof AgentArenaApiError) {
    return {
      title,
      message: error.message,
      code: error.code,
      status: error.status,
      issues: error.issues,
    }
  }

  return {
    title,
    message: error instanceof Error ? error.message : 'Unknown error.',
  }
}
