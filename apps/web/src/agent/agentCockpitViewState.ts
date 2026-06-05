import type {
  PublicSessionState,
  RolePrivateState,
  SessionChatMessage,
  SessionLogEvent,
} from '../../../../packages/schemas/src/index.js'
import {
  AgentArenaApiError,
  createExternalAgentBrief,
  createExternalAgentBriefMarkdown,
  getValidAgentActions,
  serializeJsonForScript,
  type AgentInvite,
} from './agentClient'
import type { UiError } from './AgentCockpitPanels'
import { capitalize, formatLabel } from '../shared/format'

export type LoadStatus = 'idle' | 'claiming' | 'loading' | 'ready'

type CockpitBriefArtifactsInput = {
  agentInviteUrl: string
  invite: AgentInvite
  publicState: PublicSessionState | null
  roleState: RolePrivateState | null
}

export type CockpitBriefArtifacts = {
  externalAgentBriefMarkdown: string
  externalAgentBriefScript: string
  stateScript: string
}

type CockpitDerivedStateInput = {
  chatMessage: string
  chatStatus: 'idle' | 'posting'
  lastError: UiError | null
  privateChatMessage: string
  privateChatStatus: 'idle' | 'posting'
  publicState: PublicSessionState | null
  roleState: RolePrivateState | null
  roleToken: string
  status: LoadStatus
}

export type CockpitDerivedState = {
  canClaimRole: boolean
  canPostChat: boolean
  canPostPrivateChat: boolean
  canSubmitPlan: boolean
  chatLog: SessionChatMessage[]
  claimButtonLabel: string
  isBusy: boolean
  matchLog: SessionLogEvent[]
  privateChatLog: SessionChatMessage[]
  refreshButtonLabel: string
  roleHasChatLog: boolean
  roleHasMatchLog: boolean
  roleHasPrivateChatLog: boolean
}

export function createCockpitBriefArtifacts({
  agentInviteUrl,
  invite,
  publicState,
  roleState,
}: CockpitBriefArtifactsInput): CockpitBriefArtifacts {
  const externalAgentBrief = createExternalAgentBrief({
    invite,
    inviteUrl: agentInviteUrl,
    state: roleState,
    publicState,
  })

  return {
    externalAgentBriefMarkdown: createExternalAgentBriefMarkdown({
      invite,
      inviteUrl: agentInviteUrl,
      state: roleState,
      publicState,
    }),
    externalAgentBriefScript: serializeJsonForScript(externalAgentBrief),
    stateScript: serializeJsonForScript({
      ok: Boolean(roleState),
      invite: {
        sessionId: invite.sessionId,
        role: invite.role,
        apiBase: invite.apiBase,
        claimTokenPresent: Boolean(invite.claimToken),
      },
      contractUrl: `${invite.apiBase}/agent-spec.json`,
      state: roleState,
      publicState,
      validActions: getValidAgentActions(roleState),
    }),
  }
}

export function createCockpitDerivedState({
  chatMessage,
  chatStatus,
  lastError,
  privateChatMessage,
  privateChatStatus,
  publicState,
  roleState,
  roleToken,
  status,
}: CockpitDerivedStateInput): CockpitDerivedState {
  const isBusy = status === 'claiming' || status === 'loading'
  const matchLog = roleState?.eventLog ?? publicState?.eventLog ?? []
  const chatLog = roleState?.chatLog ?? publicState?.chatLog ?? []
  const privateChatLog = roleState?.privateChatLog ?? []

  return {
    canClaimRole: !isBusy && (!roleToken || lastError?.code === 'INVALID_TOKEN'),
    canPostChat: Boolean(
      roleToken &&
        roleState &&
        !isBusy &&
        chatStatus !== 'posting' &&
        !isTerminalPhase(roleState.phase) &&
        chatMessage.trim().length > 0,
    ),
    canPostPrivateChat: Boolean(
      roleToken &&
        roleState &&
        !isBusy &&
        privateChatStatus !== 'posting' &&
        !isTerminalPhase(roleState.phase) &&
        privateChatMessage.trim().length > 0,
    ),
    canSubmitPlan: Boolean(roleToken) && !isBusy && !roleState?.submitted,
    chatLog,
    claimButtonLabel: createClaimButtonLabel(status, roleToken, isBusy),
    isBusy,
    matchLog,
    privateChatLog,
    refreshButtonLabel: status === 'loading' ? 'Refreshing...' : 'Refresh state',
    roleHasChatLog: chatLog.length > 0,
    roleHasMatchLog: matchLog.length > 0,
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

export function submissionNotice(state: RolePrivateState): string {
  if (!state.submitted) {
    return 'No round plan has been accepted for this role.'
  }

  if (state.phase === 'submission_phase' && !state.opponent.submitted) {
    return `Plan accepted. Waiting for ${capitalize(state.opponent.role)}.`
  }

  if (state.phase === 'replay_phase') {
    return 'Both plans resolved. Replay data is available.'
  }

  return `Plan accepted. Current phase is ${formatLabel(state.phase)}.`
}

export function opponentLabel(state: RolePrivateState): string {
  return `${capitalize(state.opponent.role)} ${state.opponent.submitted ? 'submitted' : 'waiting'}`
}

export function isTerminalPhase(phase: RolePrivateState['phase'] | undefined): boolean {
  return phase === 'session_complete' || phase === 'expired'
}

function createClaimButtonLabel(status: LoadStatus, roleToken: string, isBusy: boolean): string {
  if (isBusy) {
    return status === 'claiming' ? 'Claiming role...' : 'Loading...'
  }

  return roleToken ? 'Role token loaded' : 'Claim role'
}
