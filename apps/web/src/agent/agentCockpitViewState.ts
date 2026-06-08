import type {
  PublicSessionState,
  RolePrivateState,
  SessionChatMessage,
} from './agentSessionTypes.js'
import {
  AgentArenaApiError,
  createExternalAgentBrief,
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
  externalAgentBriefScript: string
  stateScript: string
}

type CockpitDerivedStateInput = {
  invite: AgentInvite
  lastError: UiError | null
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

export type AgentCockpitTaskKey = 'connect' | 'build' | 'turn' | 'review'

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
  canMutateRole: boolean
  chatLog: SessionChatMessage[]
  claimButtonLabel: string
  connectionGuidance: AgentConnectionGuidance
  hasPlayerKey: boolean
  isBusy: boolean
  privateChatLog: SessionChatMessage[]
  refreshButtonLabel: string
  roleHasChatLog: boolean
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
    externalAgentBriefScript: serializeJsonForScript(externalAgentBrief),
    stateScript: serializeJsonForScript({
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
  invite,
  lastError,
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
  const connectionGuidance = createAgentConnectionGuidance({
    invite,
    lastError,
    roleState,
    roleToken,
    status,
    isObserverCockpit,
  })

  return {
    canClaimRole: !isBusy && canMutateRole && Boolean(invite.claimToken) && !roleState,
    canMutateRole,
    chatLog,
    claimButtonLabel: createClaimButtonLabel(status, roleState, hasAccessKey, isBusy, isObserverCockpit),
    connectionGuidance,
    hasPlayerKey: hasAccessKey,
    isBusy,
    privateChatLog,
    refreshButtonLabel: status === 'loading' ? 'Refreshing...' : 'Refresh state',
    roleHasChatLog: chatLog.length > 0,
    roleHasPrivateChatLog: privateChatLog.length > 0,
    workflow: createAgentCockpitWorkflow({
      connectionGuidance,
      hasPlayerKey: hasAccessKey,
      isObserverCockpit,
      roleState,
      status,
    }),
  }
}

function createAgentCockpitWorkflow({
  connectionGuidance,
  hasPlayerKey,
  isObserverCockpit,
  roleState,
  status,
}: {
  connectionGuidance: AgentConnectionGuidance
  hasPlayerKey: boolean
  isObserverCockpit: boolean
  roleState: RolePrivateState | null
  status: LoadStatus
}): AgentCockpitWorkflow {
  const activeTask = getActiveCockpitTask(roleState)
  const stateLabel = getCockpitStateLabel(roleState, status, isObserverCockpit)

  return {
    activeTask,
    detail: connectionGuidance.nextAction,
    headline: getCockpitWorkflowHeadline(activeTask, roleState, hasPlayerKey, isObserverCockpit),
    helperCall: connectionGuidance.helperCall,
    stateLabel,
    steps: [
      createConnectStep(roleState, hasPlayerKey, status, activeTask),
      createPlanStep(roleState, activeTask, isObserverCockpit),
      createTurnStep(roleState, activeTask),
      createReviewStep(roleState, activeTask),
    ],
  }
}

function getCockpitStateLabel(
  roleState: RolePrivateState | null,
  status: LoadStatus,
  isObserverCockpit: boolean,
): string {
  if (!roleState) {
    if (status === 'claiming' || status === 'loading') {
      return 'Connecting'
    }

    return isObserverCockpit ? 'Observer' : 'Unclaimed'
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

  if (roleState.phase === 'combat_turn') {
    return roleState.combat?.submitted[roleState.role] ? 'Turn submitted' : 'Turn ready'
  }

  if (roleState.submitted) {
    return roleState.opponent.submitted ? 'Loadout observed' : 'Waiting'
  }

  if (roleState.phase === 'waiting_for_agents') {
    return 'Waiting'
  }

  return 'Claimed'
}

function getActiveCockpitTask(roleState: RolePrivateState | null): AgentCockpitTaskKey {
  if (!roleState || roleState.phase === 'waiting_for_agents') {
    return 'connect'
  }

  if (isTerminalPhase(roleState.phase)) {
    return 'review'
  }

  if (roleState.phase === 'submission_phase' && !roleState.submitted) {
    return 'build'
  }

  if (roleState.phase === 'combat_turn') {
    return 'turn'
  }

  return 'review'
}

function getCockpitWorkflowHeadline(
  activeTask: AgentCockpitTaskKey,
  roleState: RolePrivateState | null,
  hasPlayerKey: boolean,
  isObserverCockpit: boolean,
): string {
  if (activeTask === 'connect') {
    if (roleState?.phase === 'waiting_for_agents') {
      return 'Wait for opponent claim'
    }

    if (isObserverCockpit) {
      return 'Observe agent state'
    }

    return hasPlayerKey ? 'Connect role' : 'Claim role'
  }

  if (activeTask === 'build') {
    return roleState?.submitted ? 'Inspect confirmed loadout' : 'Waiting for loadout'
  }

  if (activeTask === 'turn') {
    return roleState?.combat?.submitted[roleState.role] ? 'Inspect submitted turn' : 'Inspect combat decision'
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

function createPlanStep(
  roleState: RolePrivateState | null,
  activeTask: AgentCockpitTaskKey,
  isObserverCockpit: boolean,
): AgentCockpitTaskStep {
  if (!roleState) {
    return {
      key: 'build',
      label: 'Loadout',
      status: 'Locked',
      tone: 'idle',
    }
  }

  if (roleState.submitted) {
    return {
      key: 'build',
      label: 'Loadout',
      status: 'Loadout confirmed',
      tone: 'complete',
    }
  }

  if (roleState.phase !== 'submission_phase') {
    return {
      key: 'build',
      label: 'Loadout',
      status: 'Waiting',
      tone: 'waiting',
    }
  }

  return {
    key: 'build',
    label: 'Loadout',
    status: isObserverCockpit ? 'Agent pending' : 'Ready',
    tone: activeTask === 'build' ? 'current' : 'complete',
  }
}

function createTurnStep(
  roleState: RolePrivateState | null,
  activeTask: AgentCockpitTaskKey,
): AgentCockpitTaskStep {
  if (!roleState) {
    return {
      key: 'turn',
      label: 'Turn',
      status: 'Locked',
      tone: 'idle',
    }
  }

  if (roleState.phase === 'round_review' || roleState.phase === 'replay_phase') {
    return {
      key: 'turn',
      label: 'Turn',
      status: 'Resolved',
      tone: 'complete',
    }
  }

  if (roleState.phase !== 'combat_turn') {
    return {
      key: 'turn',
      label: 'Turn',
      status: 'Waiting',
      tone: 'waiting',
    }
  }

  if (roleState.combat?.submitted[roleState.role]) {
    return {
      key: 'turn',
      label: 'Turn',
      status: 'Submitted',
      tone: activeTask === 'turn' ? 'current' : 'complete',
    }
  }

  return {
    key: 'turn',
    label: 'Turn',
    status: 'Ready',
    tone: activeTask === 'turn' ? 'current' : 'idle',
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
    return 'No loadout has been confirmed for this role.'
  }

  if (state.phase === 'submission_phase' && !state.opponent.submitted) {
    return `Loadout confirmed. Waiting for ${capitalize(state.opponent.role)}.`
  }

  if (state.phase === 'replay_phase') {
    return 'Both loadouts resolved. Replay data is available.'
  }

  return `Loadout confirmed. Current phase is ${formatLabel(state.phase)}.`
}

export function opponentLabel(state: RolePrivateState): string {
  return `${capitalize(state.opponent.role)} ${state.opponent.submitted ? 'submitted' : 'waiting'}`
}

export function isTerminalPhase(phase: RolePrivateState['phase'] | undefined): boolean {
  return phase === 'session_complete' || phase === 'expired'
}

export function createAgentConnectionGuidance({
  invite,
  isObserverCockpit,
  lastError,
  roleState,
  roleToken,
  status,
}: {
  invite: AgentInvite
  isObserverCockpit: boolean
  lastError: UiError | null
  roleState: RolePrivateState | null
  roleToken: string
  status: LoadStatus
}): AgentConnectionGuidance {
  const bootstrapCall = [
    "const agentName = '<invent an agent name>'",
    'const teamIdentity = await getTeamIdentityFromYourAgentState()',
    'await window.AgentArenaRole.bootstrapRole({',
    '  agentName,',
    '  teamIdentity,',
    '})',
  ].join('\n')

  if (roleState) {
    return {
      detail: `Private state loaded for round ${roleState.round}; phase ${formatLabel(roleState.phase)}.`,
      helperCall: helperCallForRoleState(roleState, isObserverCockpit),
      nextAction: nextActionForRoleState(roleState, isObserverCockpit),
      status: isObserverCockpit
        ? `${capitalize(roleState.role)} observer connected`
        : `Connected as ${capitalize(roleState.role)}`,
      tone: isTerminalPhase(roleState.phase) ? 'blocked' : 'ready',
    }
  }

  if (status === 'claiming' || status === 'loading') {
    return {
      detail: isObserverCockpit
        ? 'The page is loading read-only role state with an observer cockpit token.'
        : 'The page is claiming or resuming the role and loading private state.',
      helperCall: isObserverCockpit ? 'await window.AgentArenaRole.getState()' : bootstrapCall,
      nextAction: isObserverCockpit
        ? 'Wait for the cockpit state to finish loading before inspecting the confirmed loadout.'
        : 'Wait for the role state to finish loading before submitting.',
      status: 'Connecting',
      tone: 'working',
    }
  }

  if (lastError) {
    return {
      detail: `${lastError.title}: ${lastError.message}`,
      helperCall: isObserverCockpit ? 'await window.AgentArenaRole.getState()' : bootstrapCall,
      nextAction: isObserverCockpit
        ? 'Refresh state. If the same observer-token or network error repeats, report that blocker.'
        : 'Run bootstrap once. If the same capability or network error repeats, report that blocker instead of retrying raw HTTP.',
      status: 'Connection needs attention',
      tone: 'blocked',
    }
  }

  if (isObserverCockpit && invite.observerToken) {
    return {
      detail: 'Observer token is present; the cockpit can read role state but cannot lock actions or send chat.',
      helperCall: 'await window.AgentArenaRole.getState()',
      nextAction: 'Refresh state and inspect what the agent has submitted or what decision context it is seeing.',
      status: 'Observer key available',
      tone: 'idle',
    }
  }

  if (roleToken || invite.claimToken) {
    return {
      detail: invite.claimToken
        ? 'Invite player key is present; the page can claim or resume this role.'
        : 'Stored player key is present; the page can resume this role.',
      helperCall: bootstrapCall,
      nextAction: 'Bootstrap the role, then follow the returned GameMasterPacket.',
      status: 'Player key available',
      tone: 'idle',
    }
  }

  return {
    detail: 'This page has no claimToken in the URL fragment and no stored player key for this session.',
    helperCall: 'Ask the referee for a refreshed invite URL.',
    nextAction: 'Open a valid invite URL before trying to submit a GameMaster action.',
    status: 'Not connected',
    tone: 'blocked',
  }
}

function nextActionForRoleState(
  state: RolePrivateState,
  isObserverCockpit: boolean,
): string {
  if (isTerminalPhase(state.phase)) {
    return `Stop. The session is ${formatLabel(state.phase)}.`
  }

  if (state.phase === 'waiting_for_agents') {
    return isObserverCockpit
      ? 'Watch for both agents to connect before a GameMaster action packet opens.'
      : 'Wait for the opponent to claim; keep polling with the bounded continuation helper.'
  }

  if (state.phase === 'submission_phase') {
    if (state.submitted) {
      return isObserverCockpit
        ? 'Inspect the submitted bot, tactics, and rationale while waiting for the opponent.'
        : 'Do not resubmit this round. Keep this role thread alive until the next action is ready or the wait times out.'
    }

    return isObserverCockpit
      ? 'No accepted action yet. The agent still needs to inspect parameterSchema and choose one legal action from the current GameMasterPacket.'
      : 'Inspect gameMaster.legalActions parameterSchema, then submit one action id with parameters only when that action asks for them.'
  }

  if (state.phase === 'combat_turn') {
    if (state.combat?.submitted[state.role]) {
      return isObserverCockpit
        ? 'This agent locked a combat action. Compare pending action status with the opponent and wait for resolution.'
        : 'Wait for the opponent action or the turn deadline, then continue from the next packet.'
    }

    return isObserverCockpit
      ? `Inspect board cells for turn ${state.combat?.tick ?? '?'}; reachable cells expose the current move, attack, and utility action refs.`
      : `Choose a board cell action for turn ${state.combat?.tick ?? '?'} before the deadline; submit the referenced action id with parameters only when requested.`
  }

  if (state.phase === 'round_review') {
    return 'Wait for the referee to advance the round; keep polling for the next GameMasterPacket.'
  }

  return 'Wait for the next GameMasterPacket with legalActions.'
}

function helperCallForRoleState(
  state: RolePrivateState,
  isObserverCockpit: boolean,
): string {
  if (isObserverCockpit) {
    return 'await window.AgentArenaRole.getState()'
  }

  if (isTerminalPhase(state.phase)) {
    return 'await window.AgentArenaRole.getState()'
  }

  if (state.phase === 'submission_phase' && !state.submitted) {
    return submitActionHelperForRoleState(state)
  }

  if (state.phase === 'combat_turn') {
    if (state.combat?.submitted[state.role]) {
      return `await window.AgentArenaRole.waitForGameMasterPacket({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })`
    }

    return submitActionHelperForRoleState(state)
  }

  if (state.phase === 'waiting_for_agents' || state.submitted || state.phase === 'round_review') {
    return `await window.AgentArenaRole.waitForGameMasterPacket({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })`
  }

  return `await window.AgentArenaRole.waitForGameMasterPacket({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })`
}

function submitActionHelperForRoleState(state: RolePrivateState): string {
  const packet = state.gameMaster

  if (!packet?.actionSetId || packet.legalActions.length === 0) {
    return `const packet = await window.AgentArenaRole.waitForGameMasterPacket({ timeoutMs: ${AGENT_CONTINUATION_TIMEOUT_MS} })`
  }

  return [
    'const state = await window.AgentArenaRole.getState()',
    'const packet = state.gameMaster',
    'console.table(packet.blockedActions?.flatMap((blocked) => blocked.issues) ?? [])',
    'const action = packet.legalActions[0]',
    'await window.AgentArenaRole.submitAction({',
    "  action: 'submit_game_action',",
    '  actionSetId: packet.actionSetId,',
    '  decisionVersion: packet.decisionVersion,',
    '  actionId: action.id,',
    '  ...(action.parameterSchema ? { parameters: action.parameterExamples?.[0] ?? {} } : {}),',
    '})',
  ].join('\n')
}

function createClaimButtonLabel(
  status: LoadStatus,
  roleState: RolePrivateState | null,
  hasPlayerKey: boolean,
  isBusy: boolean,
  isObserverCockpit: boolean,
): string {
  if (isBusy) {
    return status === 'claiming' ? 'Connecting...' : 'Loading...'
  }

  if (isObserverCockpit) {
    return 'Observer view'
  }

  if (roleState) {
    return 'Role connected'
  }

  return hasPlayerKey ? 'Connect role' : 'Claim role'
}
