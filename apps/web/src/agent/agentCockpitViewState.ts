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
  hasLocalDraftEdits: boolean
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

export type AgentCockpitTaskKey = 'connect' | 'build' | 'submit' | 'review'

export type AgentCockpitTaskStep = {
  key: AgentCockpitTaskKey
  label: string
  status: string
  tone: 'blocked' | 'complete' | 'current' | 'idle' | 'waiting'
}

export type AgentCockpitWorkflow = {
  activeTask: AgentCockpitTaskKey
  detail: string
  headline: string
  helperCall: string
  stateLabel: string
  steps: AgentCockpitTaskStep[]
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
  workflow: AgentCockpitWorkflow
}

export function createCockpitBriefArtifacts({
  agentInviteUrl,
  invite,
  publicState,
  roleState,
}: CockpitBriefArtifactsInput): CockpitBriefArtifacts {
  const briefPublicState = getBriefPublicState(publicState)
  const externalAgentBrief = createExternalAgentBrief({
    invite,
    inviteUrl: agentInviteUrl,
    state: roleState,
    publicState: briefPublicState,
  })

  return {
    externalAgentBriefMarkdown: createExternalAgentBriefMarkdown({
      invite,
      inviteUrl: agentInviteUrl,
      state: roleState,
      publicState: briefPublicState,
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

function getBriefPublicState(publicState: PublicSessionState | null): PublicSessionState | null {
  if (!publicState) {
    return null
  }

  const roles = Object.values((publicState as { roles?: Record<string, unknown> }).roles ?? {})
  const hasOnlyUsableRoles = roles.every((role) => {
    return Boolean(
      role &&
        typeof role === 'object' &&
        typeof (role as { role?: unknown }).role === 'string',
    )
  })

  return roles.length > 0 && hasOnlyUsableRoles ? publicState : null
}

export function createCockpitDerivedState({
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
}: CockpitDerivedStateInput): CockpitDerivedState {
  const isBusy = status === 'claiming' || status === 'loading'
  const hasPlayerKey = Boolean(roleToken || invite.claimToken)
  const matchLog = roleState?.eventLog ?? publicState?.eventLog ?? []
  const chatLog = roleState?.chatLog ?? publicState?.chatLog ?? []
  const privateChatLog = roleState?.privateChatLog ?? []
  const canSubmitPlan = Boolean(
    hasPlayerKey &&
      roleState &&
      !isBusy &&
      roleState.phase === 'submission_phase' &&
      !roleState.submitted,
  )
  const connectionGuidance = createAgentConnectionGuidance({
    invite,
    lastError,
    roleState,
    roleToken,
    status,
  })

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
    canSubmitPlan,
    chatLog,
    claimButtonLabel: createClaimButtonLabel(status, roleState, hasPlayerKey, isBusy),
    connectionGuidance,
    hasPlayerKey,
    isBusy,
    matchLog,
    privateChatLog,
    refreshButtonLabel: status === 'loading' ? 'Refreshing...' : 'Refresh state',
    roleHasChatLog: chatLog.length > 0,
    roleHasMatchLog: matchLog.length > 0,
    roleHasPrivateChatLog: privateChatLog.length > 0,
    workflow: createAgentCockpitWorkflow({
      connectionGuidance,
      hasLocalDraftEdits,
      hasPlayerKey,
      roleState,
      status,
    }),
  }
}

function createAgentCockpitWorkflow({
  connectionGuidance,
  hasLocalDraftEdits,
  hasPlayerKey,
  roleState,
  status,
}: {
  connectionGuidance: AgentConnectionGuidance
  hasLocalDraftEdits: boolean
  hasPlayerKey: boolean
  roleState: RolePrivateState | null
  status: LoadStatus
}): AgentCockpitWorkflow {
  const activeTask = getActiveCockpitTask(roleState, hasLocalDraftEdits)
  const stateLabel = getCockpitStateLabel(roleState, hasLocalDraftEdits, status)

  return {
    activeTask,
    detail: connectionGuidance.nextAction,
    headline: getCockpitWorkflowHeadline(activeTask, roleState, hasPlayerKey),
    helperCall: connectionGuidance.helperCall,
    stateLabel,
    steps: [
      createConnectStep(roleState, hasPlayerKey, status, activeTask),
      createBuildStep(roleState, hasLocalDraftEdits, activeTask),
      createSubmitStep(roleState, activeTask),
      createReviewStep(roleState, activeTask),
    ],
  }
}

function getCockpitStateLabel(
  roleState: RolePrivateState | null,
  hasLocalDraftEdits: boolean,
  status: LoadStatus,
): string {
  if (!roleState) {
    return status === 'claiming' || status === 'loading' ? 'Connecting' : 'Unclaimed'
  }

  if (roleState.phase === 'expired') {
    return 'Expired'
  }

  if (roleState.phase === 'session_complete') {
    return 'Complete'
  }

  if (roleState.phase === 'round_review' || roleState.phase === 'replay_phase') {
    return 'Review'
  }

  if (roleState.submitted) {
    return roleState.opponent.submitted ? 'Submitted' : 'Waiting'
  }

  if (roleState.phase === 'waiting_for_agents') {
    return 'Waiting'
  }

  if (hasLocalDraftEdits) {
    return 'Draft'
  }

  return 'Claimed'
}

function getActiveCockpitTask(
  roleState: RolePrivateState | null,
  hasLocalDraftEdits: boolean,
): AgentCockpitTaskKey {
  if (!roleState || roleState.phase === 'waiting_for_agents') {
    return 'connect'
  }

  if (isTerminalPhase(roleState.phase)) {
    return 'review'
  }

  if (roleState.phase === 'submission_phase' && !roleState.submitted) {
    return hasLocalDraftEdits ? 'submit' : 'build'
  }

  return 'review'
}

function getCockpitWorkflowHeadline(
  activeTask: AgentCockpitTaskKey,
  roleState: RolePrivateState | null,
  hasPlayerKey: boolean,
): string {
  if (activeTask === 'connect') {
    if (roleState?.phase === 'waiting_for_agents') {
      return 'Wait for opponent claim'
    }

    return hasPlayerKey ? 'Connect role' : 'Claim role'
  }

  if (activeTask === 'build') {
    return 'Build round plan'
  }

  if (activeTask === 'submit') {
    return 'Submit round plan'
  }

  if (roleState?.phase === 'round_review' || roleState?.phase === 'replay_phase') {
    return 'Review round result'
  }

  return 'Wait for next round'
}

function createConnectStep(
  roleState: RolePrivateState | null,
  hasPlayerKey: boolean,
  status: LoadStatus,
  activeTask: AgentCockpitTaskKey,
): AgentCockpitTaskStep {
  if (roleState) {
    return {
      key: 'connect',
      label: 'Connect',
      status: roleState.phase === 'waiting_for_agents' ? 'Waiting' : 'Claimed',
      tone: roleState.phase === 'waiting_for_agents' ? 'current' : 'complete',
    }
  }

  const isConnecting = status === 'claiming' || status === 'loading'

  return {
    key: 'connect',
    label: 'Connect',
    status: isConnecting ? 'Connecting' : 'Unclaimed',
    tone: isConnecting || activeTask === 'connect' ? 'current' : hasPlayerKey ? 'idle' : 'blocked',
  }
}

function createBuildStep(
  roleState: RolePrivateState | null,
  hasLocalDraftEdits: boolean,
  activeTask: AgentCockpitTaskKey,
): AgentCockpitTaskStep {
  if (!roleState) {
    return {
      key: 'build',
      label: 'Build',
      status: 'Locked',
      tone: 'idle',
    }
  }

  if (roleState.submitted) {
    return {
      key: 'build',
      label: 'Build',
      status: 'Submitted bot',
      tone: 'complete',
    }
  }

  if (roleState.phase !== 'submission_phase') {
    return {
      key: 'build',
      label: 'Build',
      status: 'Waiting',
      tone: 'waiting',
    }
  }

  return {
    key: 'build',
    label: 'Build',
    status: hasLocalDraftEdits ? 'Draft' : 'Ready',
    tone: activeTask === 'build' ? 'current' : 'complete',
  }
}

function createSubmitStep(
  roleState: RolePrivateState | null,
  activeTask: AgentCockpitTaskKey,
): AgentCockpitTaskStep {
  if (!roleState) {
    return {
      key: 'submit',
      label: 'Submit',
      status: 'Locked',
      tone: 'idle',
    }
  }

  if (roleState.submitted) {
    return {
      key: 'submit',
      label: 'Submit',
      status: 'Submitted',
      tone: 'complete',
    }
  }

  if (roleState.phase !== 'submission_phase') {
    return {
      key: 'submit',
      label: 'Submit',
      status: 'Waiting',
      tone: 'waiting',
    }
  }

  return {
    key: 'submit',
    label: 'Submit',
    status: 'Ready',
    tone: activeTask === 'submit' ? 'current' : 'idle',
  }
}

function createReviewStep(
  roleState: RolePrivateState | null,
  activeTask: AgentCockpitTaskKey,
): AgentCockpitTaskStep {
  if (!roleState) {
    return {
      key: 'review',
      label: 'Review',
      status: 'Locked',
      tone: 'idle',
    }
  }

  if (roleState.phase === 'expired') {
    return {
      key: 'review',
      label: 'Review',
      status: 'Expired',
      tone: 'blocked',
    }
  }

  if (roleState.phase === 'session_complete') {
    return {
      key: 'review',
      label: 'Review',
      status: 'Complete',
      tone: 'complete',
    }
  }

  if (roleState.phase === 'round_review' || roleState.phase === 'replay_phase') {
    return {
      key: 'review',
      label: 'Review',
      status: 'Review',
      tone: 'current',
    }
  }

  return {
    key: 'review',
    label: 'Review',
    status: 'Waiting',
    tone: activeTask === 'review' ? 'current' : 'waiting',
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

  if (state.phase === 'round_review') {
    return 'Wait for the referee to advance the round; keep polling with the bounded continuation helper.'
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

  if (state.phase === 'waiting_for_agents' || state.submitted || state.phase === 'round_review') {
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
