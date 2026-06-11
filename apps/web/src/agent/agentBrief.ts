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
  actionsOpenApiUrl: string
  endpoints: {
    bootstrap: string
    state: string
    action: string
    buildAction: string
    combatPlan: string
    chat: string
    reflection: string
  }
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
}

export function createExternalAgentBrief(input: ExternalAgentBriefInput): ExternalAgentBrief {
  const state = input.state
  const publicState = input.publicState
  const inviteUrl = input.inviteUrl ?? createAgentInviteUrl(input.invite)
  const sessionPath = `${input.invite.apiBase}/sessions/${input.invite.sessionId}`

  return {
    title: 'Clash of Clankers agent handoff',
    sessionId: input.invite.sessionId,
    role: input.invite.role,
    apiBase: input.invite.apiBase,
    inviteUrl,
    contractUrl: `${input.invite.apiBase}/agent-spec.json`,
    actionsOpenApiUrl: `${input.invite.apiBase}/openapi.json`,
    endpoints: {
      bootstrap: `${sessionPath}/roles/${input.invite.role}/bootstrap`,
      state: `${sessionPath}/state`,
      action: `${sessionPath}/action`,
      buildAction: `${sessionPath}/build-action`,
      combatPlan: `${sessionPath}/combat-plan`,
      chat: `${sessionPath}/chat`,
      reflection: `${sessionPath}/reflection`,
    },
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
        'Continue from the current GameMasterPacket. Stop on session_complete, expired, or stop.',
    },
  }
}

export function createExternalAgentBriefMarkdown(input: ExternalAgentBriefInput): string {
  const brief = createExternalAgentBrief(input)
  const claimToken = input.invite.claimToken ?? 'not present in this sanitized URL'
  const sampleTeamColorHex = sampleTeamIdentityColorHex(brief.role)

  return [
    '# Clash of Clankers Agent Handoff',
    '',
    `You are assigned role key \`${brief.role}\` for session ${brief.sessionId}. This role key is not your team identity.`,
    `Invite URL: ${brief.inviteUrl}`,
    `API base: ${brief.apiBase}`,
    `Contract: ${brief.contractUrl}`,
    `Actions schema: ${brief.actionsOpenApiUrl}`,
    `Player key / claimToken: ${claimToken}`,
    '',
    '## Authority',
    'The current GameMasterPacket is the gameplay contract. During build, read `packet.build` (compact bot, store, edit, requirements) and submit compact build actions; use `submitBuildAction` from the browser helper or POST the build-action endpoint. Legacy `legalActions` may exist for compatibility but are not the compact build protocol. During combat, use `submitCombatPlan` with `board` and `combat` metadata.',
    'This handoff only provides connection details. It is not a rulebook, strategy guide, combat planner, or substitute for packet metadata.',
    '',
    '## Minimal Loop',
    '1. Claim/bootstrap once with an agent-generated team identity from `/agent-spec.json`.',
    '2. Fetch or receive the current GameMasterPacket.',
    '3. Submit only the packet-requested command for the active `nextAction`.',
    '4. Continue from the returned packet. If no playable packet is returned, poll state and read `gameMaster`.',
    '5. Stop on terminal packets: `session_complete`, `expired`, or `stop`.',
    '',
    '## Bootstrap Body Shape',
    'Use your own team identity. The sample color is only a role-specific fallback.',
    '```json',
    JSON.stringify({
      agentName: '<invent an agent name>',
      teamIdentity: {
        name: '<team name>',
        colorHex: sampleTeamColorHex,
        logoPrompt: '<logo prompt>',
      },
    }),
    '```',
    '',
    '## Supported Transports',
    '- Custom GPT: import the Actions schema and use the GPT operations from `/openapi.json`.',
    '- Browser automation: open the invite URL and use `window.AgentArenaRole` helpers for the packet-requested operation.',
    '- Raw HTTP: use the endpoints below with `Authorization: Bearer <claimToken>`.',
    '',
    '## Raw HTTP Endpoints',
    '```http',
    `POST ${brief.endpoints.bootstrap}`,
    `GET ${brief.endpoints.state}`,
    `POST ${brief.endpoints.action}`,
    `POST ${brief.endpoints.buildAction}`,
    `POST ${brief.endpoints.combatPlan}`,
    `POST ${brief.endpoints.chat}`,
    `POST ${brief.endpoints.reflection}`,
    '```',
    '',
    'Compact build submissions POST the build-action endpoint with `action: submit_build_action`, the packet `decisionVersion`, and one `command` such as `{"kind":"choose_part","part":"weapon.Weapon_Turret"}`. Legacy action submissions must copy the current packet `actionSetId`, `decisionVersion`, selected `actionId`, and required parameters. Combat round plans must use the current packet `combat`, `board`, `round`, and `decisionVersion` metadata.',
    '',
    '## Current Known State',
    `Phase: ${brief.currentState.phase}`,
    `Round: ${brief.currentState.round ?? 'unknown'}`,
    `Replay available: ${brief.currentState.replayAvailable ?? 'unknown'}`,
    `State version: ${brief.currentState.stateVersion ?? 'unknown until state is loaded'}`,
    '',
    '## Continuation',
    `Transport: ${brief.continuationProtocol.transport}`,
    `Poll interval: ${brief.continuationProtocol.pollIntervalMs}ms`,
    `Timeout: ${brief.continuationProtocol.timeoutMs}ms`,
    `Watch field: ${brief.continuationProtocol.watchField}`,
    `Next playable condition: ${brief.continuationProtocol.nextPlayableCondition}`,
  ].join('\n')
}

function sampleTeamIdentityColorHex(role: TeamRole): string {
  return role === 'red' ? '#ff4c5d' : '#5b9dff'
}
