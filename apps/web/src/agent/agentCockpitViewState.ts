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
export const AGENT_CONTINUATION_TIMEOUT_MS = 10 * 60_000

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
  invite: AgentInvite
  lastError: UiError | null
  privateChatMessage: string
  privateChatStatus: 'idle' | 'posting'
  publicState: PublicSessionState | null
  roleState: RolePrivateState | null
  roleToken: string
  status: LoadStatus
}

export type AgentConnectionGuidance = {
  detail: string
  helperCall: string
  nextAction: string
  status: string
  tone: 'blocked' | 'idle' | 'ready' | 'working'
}

export type CockpitDerivedState = {
  canClaimRole: boolean
  canPostChat: boolean
  canPostPrivateChat: boolean
  canSubmitPlan: boolean
  chatLog: SessionChatMessage[]
  claimButtonLabel: string
  connectionGuidance: AgentConnectionGuidance
  hasPlayerKey: boolean
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
  invite,
  lastError,
  privateChatMessage,
  privateChatStatus,
  publicState,
  roleState,
  roleToken,
  status,
}: CockpitDerivedStateInput): CockpitDerivedState {
  const isBusy = status === 'claiming' || status === 'loading'
  const hasPlayerKey = Boolean(roleToken || invite.claimToken)
  const matchLog = roleState?.eventLog ?? publicState?.eventLog ?? []
  const chatLog = roleState?.chatLog ?? publicState?.chatLog ?? []
  const privateChatLog = roleState?.privateChatLog ?? []

  return {
    canClaimRole: !isBusy && Boolean(invite.claimToken) && !roleState,
    canPostChat: Boolean(
      hasPlayerKey &&
        roleState &&
        !isBusy &&
        chatStatus !== 'posting' &&
        !isTerminalPhase(roleState.phase) &&
        chatMessage.trim().length > 0,
    ),
    canPostPrivateChat: Boolean(
      hasPlayerKey &&
        roleState &&
        !isBusy &&
        privateChatStatus !== 'posting' &&
        !isTerminalPhase(roleState.phase) &&
        privateChatMessage.trim().length > 0,
    ),
    canSubmitPlan: Boolean(
      hasPlayerKey &&
        roleState &&
        !isBusy &&
        roleState.phase === 'submission_phase' &&
        !roleState.submitted,
    ),
    chatLog,
    claimButtonLabel: createClaimButtonLabel(status, roleState, hasPlayerKey, isBusy),
    connectionGuidance: createAgentConnectionGuidance({
      invite,
      lastError,
      roleState,
      roleToken,
      status,
    }),
    hasPlayerKey,
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

export function createAgentConnectionGuidance({
  invite,
  lastError,
  roleState,
  roleToken,
  status,
}: {
  invite: AgentInvite
  lastError: UiError | null
  roleState: RolePrivateState | null
  roleToken: string
  status: LoadStatus
}): AgentConnectionGuidance {
  const bootstrapCall = `await window.AgentArenaRole.bootstrapRole({ agentName: '${invite.role}-agent' })`

  if (roleState) {
    return {
      detail: `Private state loaded for round ${roleState.round}; phase ${formatLabel(roleState.phase)}.`,
      helperCall: helperCallForRoleState(roleState),
      nextAction: nextActionForRoleState(roleState),
      status: `Connected as ${capitalize(roleState.role)}`,
      tone: isTerminalPhase(roleState.phase) ? 'blocked' : 'ready',
    }
  }

  if (status === 'claiming' || status === 'loading') {
    return {
      detail: 'The page is claiming or resuming the role and loading private state.',
      helperCall: bootstrapCall,
      nextAction: 'Wait for the role state to finish loading before submitting.',
      status: 'Connecting',
      tone: 'working',
    }
  }

  if (lastError) {
    return {
      detail: `${lastError.title}: ${lastError.message}`,
      helperCall: bootstrapCall,
      nextAction: 'Run bootstrap once. If the same capability or network error repeats, report that blocker instead of retrying raw HTTP.',
      status: 'Connection needs attention',
      tone: 'blocked',
    }
  }

  if (roleToken || invite.claimToken) {
    return {
      detail: invite.claimToken
        ? 'Invite player key is present; the page can claim or resume this role.'
        : 'Stored player key is present; the page can resume this role.',
      helperCall: bootstrapCall,
      nextAction: 'Bootstrap the role, then follow the returned state and nextAction.',
      status: 'Player key available',
      tone: 'idle',
    }
  }

  return {
    detail: 'This page has no claimToken in the URL fragment and no stored player key for this session.',
    helperCall: 'Ask the referee for a refreshed invite URL.',
    nextAction: 'Open a valid invite URL before trying to submit a plan.',
    status: 'Not connected',
    tone: 'blocked',
  }
}

function nextActionForRoleState(state: RolePrivateState): string {
  if (isTerminalPhase(state.phase)) {
    return `Stop. The session is ${formatLabel(state.phase)}.`
  }

  if (state.phase === 'waiting_for_agents') {
    return 'Wait for the opponent to claim; keep polling with the bounded continuation helper.'
  }

  if (state.phase === 'submission_phase') {
    return state.submitted
      ? 'Do not resubmit this round. Keep this role thread alive until the next action is ready or the wait times out.'
      : 'Submit exactly one legal round plan for this round.'
  }

  if (state.phase === 'referee_awards') {
    return 'Wait for referee awards; keep polling with the bounded continuation helper.'
  }

  return 'Wait for the next submission window with the bounded continuation helper.'
}

function helperCallForRoleState(state: RolePrivateState): string {
  if (isTerminalPhase(state.phase)) {
    return 'await window.AgentArenaRole.getState()'
  }

  if (state.phase === 'submission_phase' && !state.submitted) {
    return 'await window.AgentArenaRole.submitRoundPlan(plan)'
  }

  if (state.phase === 'waiting_for_agents' || state.submitted || state.phase === 'referee_awards') {
    return `await window.AgentArenaRole.waitForNextAction({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })`
  }

  return `await window.AgentArenaRole.waitForNextAction({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })`
}

function createClaimButtonLabel(
  status: LoadStatus,
  roleState: RolePrivateState | null,
  hasPlayerKey: boolean,
  isBusy: boolean,
): string {
  if (isBusy) {
    return status === 'claiming' ? 'Connecting...' : 'Loading...'
  }

  if (roleState) {
    return 'Role connected'
  }

  return hasPlayerKey ? 'Connect role' : 'Claim role'
}
