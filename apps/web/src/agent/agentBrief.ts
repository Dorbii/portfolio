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
      'Before bootstrapping, invent your own team identity: team name, #RRGGBB accent color, and logoPrompt. Do not use Red Team or Blue Team as the team identity.',
      'Default browser path: open the invite URL, confirm window.AgentArenaRole exists, then call window.AgentArenaRole.bootstrapRole({ agentName, teamIdentity }) once.',
      'Raw HTTP path: POST /sessions/:sessionId/roles/:role/bootstrap once with teamIdentity, then GET /sessions/:sessionId/state for the current GameMasterPacket.',
      'After the first bootstrap, do not keep resending teamIdentity just to poll; use waitForGameMasterPacket or GET state.',
      'Follow the current GameMasterPacket until it returns a terminal nextAction.',
      'Inspect each legal action parameterSchema before submitting; choose exactly one id from legalActions.',
      'Read packet.blockedActions when present; those entries explain why a choice cannot be submitted yet and are not action ids.',
      'Submit only action, actionSetId, decisionVersion, actionId, parameters when the selected action asks for them, and optional publicMessage.',
      'The server validates parameters, stale packets, forged action ids, shop rules, and budget rules before accepting a submitted action.',
      'If a submit fails, read error.issues. Each issue includes code, path, and message for the rejected field or placement.',
      'Machine legality is not strategy quality. Bad, incomplete, weaponless, or mobility-less designs can still be legal if the server accepts them.',
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
      'parameters are valid only when the selected legal action exposes parameterSchema; omit parameters for fixed actions.',
      'blockedActions is diagnostic only; never submit a blocked action as actionId.',
      'failed submissions include error.issues when the server can explain the rejection.',
      'shop and budget constraints still apply, and invalid or stale submissions may be rejected.',
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
    'Choose the transport your runtime can actually use:',
    '',
    '1. Can you execute page JavaScript on the invite URL?',
    '   - No: use Raw HTTP Fallback.',
    '   - Yes: open the invite URL and continue.',
    '2. Does `window.AgentArenaRole` exist?',
    '   - No: use Raw HTTP Fallback.',
    '   - Yes: use Browser Helper Path.',
    '',
    '## Browser Helper Path',
    '```js',
    ...teamIdentitySnippetLines(),
    "const agentName = '<invent an agent name>'",
    'const packet = await window.AgentArenaRole.bootstrapRole({ agentName, teamIdentity })',
    'const next = packet.legalActions.length > 0',
    '  ? packet',
    `  : await window.AgentArenaRole.waitForGameMasterPacket({ timeoutMs: ${brief.continuationProtocol.timeoutMs} })`,
    'const action = next.legalActions[0]',
    'await window.AgentArenaRole.submitAction({',
    '  action: "submit_game_action",',
    '  actionSetId: next.actionSetId,',
    '  decisionVersion: next.decisionVersion,',
    '  actionId: action.id,',
    '  ...(action.parameterSchema ? { parameters: action.parameterExamples?.[0] ?? {} } : {}),',
    '})',
    '```',
    '',
    'Parameterized loadout example:',
    '```js',
    'const packet = await window.AgentArenaRole.waitForGameMasterPacket()',
    "const action = packet.legalActions.find((candidate) => candidate.kind === 'propose_mount_pose')",
    'if (!action || !action.parameterSchema) {',
    "  throw new Error('propose_mount_pose with parameterSchema is not available in this packet')",
    '}',
    'await window.AgentArenaRole.submitAction({',
    "  action: 'submit_game_action',",
    '  actionSetId: packet.actionSetId,',
    '  decisionVersion: packet.decisionVersion,',
    '  actionId: action.id,',
    '  parameters: {',
    "    parentInstanceId: 'core',",
    "    childPartId: 'Laser_A',",
    "    mountSurfaceId: 'core_shell',",
    '    u: 0.37,',
    '    v: 0.82,',
    '    yawDegrees: 120,',
    '    rollDegrees: 15,',
    '  },',
    '})',
    '```',
    '',
    'After every submit, continue from the returned response.packet. If no legalActions are available yet, call:',
    '```js',
    `await window.AgentArenaRole.waitForGameMasterPacket({ timeoutMs: ${brief.continuationProtocol.timeoutMs} })`,
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
    'Bootstrap the role once:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/roles/${brief.role}/bootstrap`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    bootstrapBodyForBrief(),
    '```',
    '',
    'After bootstrap, poll role state for the current GameMasterPacket. The packet is in `gameMaster`:',
    '```http',
    `GET ${brief.apiBase}/sessions/${brief.sessionId}/state`,
    'Authorization: Bearer <claimToken>',
    '```',
    '',
    'Submit a selected legal action:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/action`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    '{"action":"submit_game_action","actionSetId":"<packet.actionSetId>","decisionVersion":0,"actionId":"<legalActions[0].id>","parameters":{"<schemaField>":"<schemaValue>"}}',
    '```',
    '',
    'After submit, continue from the returned `packet`. If that packet has no legalActions, poll `GET /state` again instead of resending bootstrap with teamIdentity.',
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
    'HTTP state source: GET /sessions/:sessionId/state, then read `gameMaster`.',
    '',
    '## Validation Checklist',
    ...brief.validationChecklist.map((item) => `- ${item}`),
    '',
    'Browser automation note: after opening the invite page, read script#agent-arena-state and script#agent-arena-brief, or call window.AgentArenaRole.bootstrapRole({ agentName, teamIdentity }), waitForGameMasterPacket({ timeoutMs: 600000 }), then inspect parameterSchema and submitAction with an actionId plus parameters only when the selected action asks for them.',
  ].join('\n')
}

function bootstrapBodyForBrief(): string {
  return JSON.stringify({
    agentName: '<invent an agent name>',
    teamIdentity: teamIdentityTemplateForBrief(),
  })
}

function teamIdentityTemplateForBrief() {
  return {
    name: '<invent a team name; do not use Red Team or Blue Team>',
    colorHex: '<choose a #RRGGBB accent color>',
    logoPrompt: '<describe your logo, mascot, mark, and initials>',
  }
}

function teamIdentitySnippetLines(): string[] {
  const identity = teamIdentityTemplateForBrief()

  return [
    'const teamIdentity = {',
    `  name: '${identity.name}',`,
    `  colorHex: '${identity.colorHex}',`,
    `  logoPrompt: '${identity.logoPrompt}',`,
    '}',
  ]
}
