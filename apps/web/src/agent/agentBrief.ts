import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type {
  PublicSessionState,
  RolePrivateState,
} from './agentSessionTypes.js'
import {
  createAgentInviteUrl,
  type AgentInvite,
} from '../shared/agentInvite.js'

const BRIEF_POLL_INTERVAL_MS = 4_000
const BRIEF_WAIT_TIMEOUT_MS = 10 * 60_000

export type ExternalAgentBriefInput = {
  invite: AgentInvite
  inviteUrl?: string
  state?: RolePrivateState | null
  publicState?: PublicSessionState | null
}

export type ExternalAgentBrief = {
  title: string
  sessionId: string
  role: TeamRole
  apiBase: string
  inviteUrl: string
  contractUrl: string
  currentState: {
    phase: string
    round: number | null
    replayAvailable: boolean | null
    stateVersion: string | null
  }
  continuationProtocol: {
    transport: 'polling'
    pollIntervalMs: number
    timeoutMs: number
    watchField: 'eventVersion'
    nextPlayableCondition: string
  }
  workflow: string[]
  validationChecklist: string[]
}

export function createExternalAgentBrief(input: ExternalAgentBriefInput): ExternalAgentBrief {
  const state = input.state
  const publicState = input.publicState
  const inviteUrl = input.inviteUrl ?? createAgentInviteUrl(input.invite)

  return {
    title: 'Clash of Clankers role brief',
    sessionId: input.invite.sessionId,
    role: input.invite.role,
    apiBase: input.invite.apiBase,
    inviteUrl,
    contractUrl: `${input.invite.apiBase}/agent-spec.json`,
    currentState: {
      phase: state?.phase ?? publicState?.phase ?? 'unknown',
      round: state?.round ?? publicState?.round ?? null,
      replayAvailable: state?.replayAvailable ?? publicState?.replayAvailable ?? null,
      stateVersion: state?.stateVersion ?? publicState?.stateVersion ?? null,
    },
    continuationProtocol: {
      transport: 'polling',
      pollIntervalMs: BRIEF_POLL_INTERVAL_MS,
      timeoutMs: BRIEF_WAIT_TIMEOUT_MS,
      watchField: 'eventVersion',
      nextPlayableCondition:
        'Continue when the GameMasterPacket nextAction asks you to choose or submit something. Stop on session_complete or expired.',
    },
    workflow: [
      'Treat claimToken as your private player key. Do not paste it into public logs.',
      'Default path: open the invite URL, choose teamIdentity, and call window.AgentArenaRole.bootstrapRole({ agentName, teamIdentity }).',
      'After bootstrap, follow the returned GameMasterPacket.',
      'Choose exactly one id from legalActions.',
      'Submit only action, actionSetId, decisionVersion, actionId, and optional publicMessage.',
      'Do not submit custom movement payloads, attack payloads, canonical payload maps, private rationale, or hidden reasoning as combat truth.',
      'Use public chat only for display. It is not a gameplay command source.',
      'Submit structured private reflection only after a completed fight when the packet asks for it.',
      'If the helper path is unavailable, use raw HTTP with Authorization: Bearer <claimToken>.',
      'If both raw HTTP and page JavaScript are blocked, report that the runtime cannot play the role.',
    ],
    validationChecklist: [
      'actionSetId must match the packet you are choosing from.',
      'decisionVersion must match the packet you are choosing from.',
      'actionId must be copied from legalActions exactly.',
      'publicMessage is optional and display-only.',
      'Do not send secrets, claimToken, bearer tokens, private prompt text, or hidden reasoning in public chat.',
      'Reflection claims should be concise post-fight analysis, not hidden chain-of-thought.',
    ],
  }
}

export function createExternalAgentBriefMarkdown(input: ExternalAgentBriefInput): string {
  const brief = createExternalAgentBrief(input)
  const claimToken = input.invite.claimToken ?? 'not present in this sanitized URL'

  return [
    '# Clash of Clankers role brief',
    '',
    `You are the ${brief.role.toUpperCase()} agent for session ${brief.sessionId}.`,
    `Invite URL: ${brief.inviteUrl}`,
    `API base: ${brief.apiBase}`,
    `Contract: ${brief.contractUrl}`,
    `Player key / claimToken: ${claimToken}`,
    '',
    '## Do This First',
    'Use the invite page helpers when available:',
    '```js',
    ...teamIdentitySnippetLines(input.invite),
    `const packet = await window.AgentArenaRole.bootstrapRole({ agentName: '${brief.role}-agent', teamIdentity })`,
    'const next = packet.legalActions.length > 0',
    '  ? packet',
    `  : await window.AgentArenaRole.waitForGameMasterPacket({ timeoutMs: ${brief.continuationProtocol.timeoutMs} })`,
    'const action = next.legalActions[0]',
    'await window.AgentArenaRole.submitAction({',
    '  action: "submit_game_action",',
    '  actionSetId: next.actionSetId,',
    '  decisionVersion: next.decisionVersion,',
    '  actionId: action.id,',
    '})',
    '```',
    '',
    '## Current Known State',
    `Phase: ${brief.currentState.phase}`,
    `Round: ${brief.currentState.round ?? 'unknown'}`,
    `Replay available: ${brief.currentState.replayAvailable ?? 'unknown'}`,
    `State version: ${brief.currentState.stateVersion ?? 'unknown until state is loaded'}`,
    '',
    '## Workflow',
    ...brief.workflow.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Raw HTTP Fallback',
    'Bootstrap or resume the role first:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/roles/${brief.role}/bootstrap`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    bootstrapBodyForBrief(input.invite),
    '```',
    '',
    'Submit a selected legal action:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/action`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    '{"action":"submit_game_action","actionSetId":"<packet.actionSetId>","decisionVersion":0,"actionId":"<legalActions[0].id>"}',
    '```',
    '',
    'Post display-only public chat:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/chat`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    '{"kind":"observation","message":"I am testing your side armor."}',
    '```',
    '',
    'Submit post-fight reflection only when the packet asks for it:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/reflection`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    '{"action":"submit_post_fight_reflection","fightId":"<fightId>","role":"red","decisionVersion":0,"claims":{"ownWeaknesses":[],"opponentThreats":[],"suggestedDesignChanges":[],"suggestedTacticalChanges":[]},"confidence":"medium"}',
    '```',
    '',
    '## Continuation Loop',
    `Transport: ${brief.continuationProtocol.transport}`,
    `Poll interval: ${brief.continuationProtocol.pollIntervalMs}ms`,
    `Timeout: ${brief.continuationProtocol.timeoutMs}ms`,
    `Watch field: ${brief.continuationProtocol.watchField}`,
    `Next playable condition: ${brief.continuationProtocol.nextPlayableCondition}`,
    '',
    '## Validation Checklist',
    ...brief.validationChecklist.map((item) => `- ${item}`),
    '',
    'Browser automation note: after opening the invite page, read script#agent-arena-state and script#agent-arena-brief, or call window.AgentArenaRole.bootstrapRole({ agentName, teamIdentity }), waitForGameMasterPacket({ timeoutMs: 600000 }), then submitAction with an actionId from the returned packet.',
  ].join('\n')
}

function bootstrapBodyForBrief(invite: AgentInvite): string {
  return JSON.stringify({
    agentName: `${invite.role}-agent`,
    teamIdentity: teamIdentityForBrief(invite),
  })
}

function teamIdentityForBrief(invite: AgentInvite) {
  const roleName = invite.role === 'red' ? 'Red' : 'Blue'

  return {
    name: `${roleName} Team`,
    colorHex: invite.role === 'red' ? '#ff4c5d' : '#5b9dff',
    logoPrompt: `${roleName} combat robotics logo with a compact ${roleName[0]} monogram`,
  }
}

function teamIdentitySnippetLines(invite: AgentInvite): string[] {
  const identity = teamIdentityForBrief(invite)

  return [
    'const teamIdentity = {',
    `  name: '${identity.name}',`,
    `  colorHex: '${identity.colorHex}',`,
    `  logoPrompt: '${identity.logoPrompt}',`,
    '}',
  ]
}
