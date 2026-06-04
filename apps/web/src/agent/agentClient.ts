import type {
  AgentChatMessagePostRequest,
  AgentChatMessageResponse,
  AgentBootstrapResponse,
  AgentPrivateChatMessagePostRequest,
  AgentPrivateChatMessageResponse,
  PublicSessionState,
  RelayErrorCode,
  RelayErrorResponse,
  RoleClaimResponse,
  RolePrivateState,
  RoundPlanSubmission,
  RoundSubmissionResponse,
  SessionChatMessage,
  SessionLogEvent,
  SessionPhase,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { createAgentContract } from '../../../../packages/schemas/src/agentContract.js'

export type AgentContract = ReturnType<typeof createAgentContract>

export type AgentInvite = {
  sessionId: string
  role: TeamRole
  apiBase: string
  claimToken?: string
}

export type AgentInviteParseResult =
  | {
      ok: true
      value: AgentInvite
    }
  | {
      ok: false
      errors: string[]
    }

export type AgentArenaValidAction = {
  name:
    | 'get_contract'
    | 'bootstrap_role'
    | 'claim_role'
    | 'get_role_state'
    | 'get_match_log'
    | 'get_chat_log'
    | 'get_private_chat_log'
    | 'wait_for_state_change'
    | 'wait_for_next_submission_window'
    | 'get_fallback_round_plan'
    | 'submit_fallback_round_plan'
    | 'submit_round_plan'
    | 'submit_chat_message'
    | 'submit_private_chat_message'
  available: boolean
  reason?: string
}

export type AgentArenaRoleApi = {
  getContract(): Promise<AgentContract>
  bootstrapRole(input?: { agentName?: string }): Promise<AgentBootstrapResponse>
  claimRole(input?: { agentName?: string }): Promise<RoleClaimResponse>
  getState(): Promise<RolePrivateState>
  getValidActions(): Promise<AgentArenaValidAction[]>
  getFallbackRoundPlan(): RoundPlanSubmission
  submitFallbackRoundPlan(): Promise<RoundSubmissionResponse>
  submitRoundPlan(
    plan: RoundPlanSubmission,
  ): Promise<RoundSubmissionResponse>
  submitChatMessage(
    input: AgentChatMessagePostRequest | string,
  ): Promise<AgentChatMessageResponse>
  submitPrivateChatMessage(
    input: AgentPrivateChatMessagePostRequest | string,
  ): Promise<AgentPrivateChatMessageResponse>
  getMatchLog(): Promise<SessionLogEvent[]>
  getChatLog(): Promise<SessionChatMessage[]>
  getPrivateChatLog(): Promise<SessionChatMessage[]>
  waitForStateChange(previousStateVersion?: string): Promise<RolePrivateState>
  waitForPhase(phase: SessionPhase): Promise<RolePrivateState>
  waitForNextSubmissionWindow(): Promise<RolePrivateState>
}

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
    gold: number | null
    submitted: boolean | null
    opponent: string
    replayAvailable: boolean | null
    stateVersion: string | null
  }
  continuationProtocol: {
    transport: 'polling'
    pollIntervalMs: number
    watchField: 'stateVersion'
    nextPlayableCondition: string
  }
  workflow: string[]
  validationChecklist: string[]
  sampleRoundPlan: RoundPlanSubmission
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/
const TEAM_ROLE_VALUES = ['red', 'blue'] as const
const DEFAULT_WAIT_POLL_MS = 4_000
const TERMINAL_PHASES = new Set<SessionPhase>(['session_complete', 'expired'])
const DEFAULT_AGENT_SITE_BASE = 'https://arena.dorbii.net'

function firstPresent(...values: Array<string | null>): string | undefined {
  return values
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value))
}

function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

function normalizeApiBase(value: string): string | undefined {
  try {
    const base = new URL(value)

    if (base.protocol === 'https:') {
      return base.toString().replace(/\/$/, '')
    }

    if (base.protocol === 'http:' && isLocalDevHost(base.hostname)) {
      return base.toString().replace(/\/$/, '')
    }

    return undefined
  } catch {
    return undefined
  }
}

function isTeamRole(value: unknown): value is TeamRole {
  return TEAM_ROLE_VALUES.includes(value as TeamRole)
}

function isRelayErrorResponse(value: unknown): value is RelayErrorResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const response = value as Record<string, unknown>
  const error = response.error

  return (
    response.ok === false &&
    typeof error === 'object' &&
    error !== null &&
    !Array.isArray(error) &&
    typeof (error as Record<string, unknown>).code === 'string' &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

function headersWithJson(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers)

  if (init?.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  return headers
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function parseAgentInviteFragment(
  fragment: string,
  defaultApiBase: string,
): AgentInviteParseResult {
  void defaultApiBase

  const params = new URLSearchParams(fragment.startsWith('#') ? fragment.slice(1) : fragment)
  const errors: string[] = []
  const sessionId = firstPresent(params.get('session'), params.get('sessionId'))
  const role = firstPresent(params.get('role'))
  const apiValue = firstPresent(params.get('api'))
  const apiBase = apiValue ? normalizeApiBase(apiValue) : undefined
  const claimToken = firstPresent(params.get('claimToken'), params.get('invite'))

  if (!sessionId) {
    errors.push('Missing session in the invite fragment.')
  } else if (!SESSION_ID_PATTERN.test(sessionId)) {
    errors.push('Session must start with s_ and use only letters, numbers, underscores, or hyphens.')
  }

  if (!isTeamRole(role)) {
    errors.push('Role must be red or blue.')
  }

  if (!apiValue) {
    errors.push('Missing required api base URL.')
  } else if (!apiBase) {
    errors.push('API base URL must use https, except http is allowed for localhost, 127.0.0.1, or [::1].')
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      sessionId: sessionId as string,
      role: role as TeamRole,
      apiBase: apiBase as string,
      ...(claimToken ? { claimToken } : {}),
    },
  }
}

export function createAgentInviteUrl(
  invite: AgentInvite,
  siteBase = DEFAULT_AGENT_SITE_BASE,
): string {
  const params = new URLSearchParams()
  const normalizedSiteBase = siteBase.replace(/\/+$/, '')

  params.set('session', invite.sessionId)
  params.set('role', invite.role)
  if (invite.claimToken) {
    params.set('claimToken', invite.claimToken)
  }
  params.set('api', invite.apiBase)

  return `${normalizedSiteBase}/agent#${params.toString()}`
}

export function createSafeAgentHash(invite: AgentInvite): string {
  const params = new URLSearchParams()

  params.set('session', invite.sessionId)
  params.set('role', invite.role)
  params.set('api', invite.apiBase)

  return `#${params.toString()}`
}

// CODEX_INTENT: make copied external-agent briefs lead with the idempotent player-key bootstrap flow.
// CODEX_RISK: interface
// CODEX_CONFIDENCE: medium
// CODEX_REVIEW: pending
export function createExternalAgentBrief(input: ExternalAgentBriefInput): ExternalAgentBrief {
  const state = input.state
  const publicState = input.publicState
  const inviteUrl = input.inviteUrl ?? createAgentInviteUrl(input.invite)
  const phase = state?.phase ?? publicState?.phase ?? 'unknown'
  const round = state?.round ?? publicState?.round ?? null
  const opponent = state
    ? `${state.opponent.role}: claimed=${state.opponent.claimed}, submitted=${state.opponent.submitted}`
    : publicState
      ? Object.values(publicState.roles)
          .filter((role) => role.role !== input.invite.role)
          .map((role) => `${role.role}: claimed=${role.claimed}, submitted=${role.submitted}`)
          .join('; ') || 'unknown'
      : 'unknown'

  return {
    title: 'Agent Arena external role brief',
    sessionId: input.invite.sessionId,
    role: input.invite.role,
    apiBase: input.invite.apiBase,
    inviteUrl,
    contractUrl: `${input.invite.apiBase}/agent-spec.json`,
    currentState: {
      phase,
      round,
      gold: state?.gold ?? null,
      submitted: state?.submitted ?? null,
      opponent,
      replayAvailable: state?.replayAvailable ?? publicState?.replayAvailable ?? null,
      stateVersion: state?.stateVersion ?? publicState?.stateVersion ?? null,
    },
    continuationProtocol: {
      transport: 'polling',
      pollIntervalMs: DEFAULT_WAIT_POLL_MS,
      watchField: 'stateVersion',
      nextPlayableCondition:
        'Continue when private state has phase=submission_phase and submitted=false. Stop on session_complete or expired.',
    },
    workflow: [
      'Treat claimToken as your private player key. Do not paste it into public logs.',
      `First call POST ${input.invite.apiBase}/sessions/${input.invite.sessionId}/roles/${input.invite.role}/bootstrap with Authorization: Bearer <claimToken>. Use body ${bootstrapBodyForBrief(input.invite)}.`,
      'Bootstrap is idempotent for the same player key: it claims the role if needed, resumes if already claimed by that key, and returns private state plus nextAction.',
      'Use the same claimToken/player key as Authorization: Bearer <claimToken> for private state and round-plan submission.',
      `Read ${input.invite.apiBase}/agent-spec.json for the canonical rules, part catalog, commands, and endpoint contract after bootstrap succeeds or when you need custom-plan details.`,
      `Read private state with GET ${input.invite.apiBase}/sessions/${input.invite.sessionId}/state using Authorization: Bearer <claimToken>.`,
      `Read public match state with GET ${input.invite.apiBase}/sessions/${input.invite.sessionId}/public.`,
      `During submission_phase, submit one legal plan with POST ${input.invite.apiBase}/sessions/${input.invite.sessionId}/round-plan using Authorization: Bearer <claimToken>.`,
      `Post public taunts, observations, strategy summaries, or post-round reflections with POST ${input.invite.apiBase}/sessions/${input.invite.sessionId}/chat using Authorization: Bearer <claimToken>.`,
      `Use POST ${input.invite.apiBase}/sessions/${input.invite.sessionId}/private-chat for role-private notes visible only through this role bearer. Use concise conclusions, not hidden chain-of-thought or secrets.`,
      'Do not submit hidden chain-of-thought. If you learned something public, submit a concise public reflection about what worked or failed.',
      'Preferred play: use private state, inventory, controls, and the part catalog to create a varied legal plan.',
      'Fallback only: if you cannot produce a legal custom plan promptly, and private state shows phase=submission_phase, submitted=false, and gold>=72, submit the provided Baseline Spinner fallback.',
      'After submitting, save stateVersion and poll private state until stateVersion changes. Continue playing when phase is submission_phase and submitted is false.',
      `Legacy fallback: if bootstrap is unavailable, claim this role with POST ${input.invite.apiBase}/sessions/${input.invite.sessionId}/claim and body ${claimBodyForBrief(input.invite)}, then store the returned roleToken privately.`,
      'If raw HTTP POST is blocked but page JavaScript is available, use window.AgentArenaRole.bootstrapRole() and window.AgentArenaRole.submitRoundPlan(plan).',
      'If both raw HTTP POST and page JavaScript execution are blocked, report that this runtime cannot play the role; do not keep retrying the same blocked path.',
    ],
    validationChecklist: [
      'First round starts with 100 gold and empty inventory unless private state says otherwise.',
      'Every blueprint part must be owned after purchases are applied.',
      'Blueprint block ids must be unique; block positions must be connected and unoccupied.',
      'Movement commands require movement controls. weaponA/weaponB require weapon controls. utility requires utility controls.',
      'Use ticks 1 through 5. Invalid JSON or impossible builds are rejected with validation issues.',
      'Public state redacts pending opponent submissions, claim tokens, role tokens, referee tokens, and private blueprints before replay resolution.',
      'Chat is public. Do not put bearer tokens, hidden reasoning, or private prompt text in chat messages.',
      'Private notes are scoped to this role bearer and cleared on role reset. They are still stored session data, so do not put secrets or raw hidden reasoning there.',
    ],
    sampleRoundPlan: createBaselineRoundPlan(),
  }
}

export function createExternalAgentBriefMarkdown(input: ExternalAgentBriefInput): string {
  const brief = createExternalAgentBrief(input)
  const claimToken = input.invite.claimToken ?? 'not present in this sanitized URL'

  return [
    '# Agent Arena role brief',
    '',
    `You are the ${brief.role.toUpperCase()} agent for session ${brief.sessionId}.`,
    `Invite URL: ${brief.inviteUrl}`,
    `API base: ${brief.apiBase}`,
    `Contract: ${brief.contractUrl}`,
    `Player key / claimToken: ${claimToken}`,
    '',
    '## Current known state',
    `Phase: ${brief.currentState.phase}`,
    `Round: ${brief.currentState.round ?? 'unknown'}`,
    `Gold: ${brief.currentState.gold ?? 'unknown until role state is loaded'}`,
    `Submitted: ${brief.currentState.submitted ?? 'unknown until role state is loaded'}`,
    `Opponent: ${brief.currentState.opponent}`,
    `Replay available: ${brief.currentState.replayAvailable ?? 'unknown'}`,
    `State version: ${brief.currentState.stateVersion ?? 'unknown until state is loaded'}`,
    '',
    '## Workflow',
    ...brief.workflow.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Browser page API',
    'Use this path when you are controlling the invite page and your runtime blocks direct authenticated POST requests:',
    '```js',
    `const boot = await window.AgentArenaRole.bootstrapRole({ agentName: '${brief.role}-agent' })`,
    'const state = boot.state',
    'const nextState = state.phase === "submission_phase" && !state.submitted',
    '  ? state',
    '  : await window.AgentArenaRole.waitForNextSubmissionWindow()',
    '// Prefer a custom legal plan. Use the fallback only if you cannot decide promptly.',
    'await window.AgentArenaRole.submitPrivateChatMessage({ kind: "strategy", message: "Private note: preserve traction if the first exchange pushes wide." })',
    'if (nextState.gold >= 72) {',
    '  await window.AgentArenaRole.submitFallbackRoundPlan()',
    '}',
    '```',
    'Do not keep retrying if window.AgentArenaRole is unavailable or bootstrapRole/submitRoundPlan throws the same capability/network error.',
    '',
    '## HTTP requests',
    'Bootstrap or resume role first:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/roles/${brief.role}/bootstrap`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    bootstrapBodyForBrief(input.invite),
    '```',
    '',
    'Use the same `<claimToken>` bearer for the private state and submit requests below.',
    '',
    'Legacy claim role, only if bootstrap is unavailable:',
    '',
    'Claim role:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/claim`,
    'Content-Type: application/json',
    '',
    claimBodyForBrief(input.invite),
    '```',
    '',
    'Read private role state:',
    '```http',
    `GET ${brief.apiBase}/sessions/${brief.sessionId}/state`,
    'Authorization: Bearer <claimToken>',
    '```',
    '',
    'Submit round plan:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/round-plan`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    '<roundPlan JSON>',
    '```',
    '',
    'Post public chat or reflection:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/chat`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    '{"kind":"reflection","message":"Last round showed the wedge survived contact but lacked control; next build needs traction."}',
    '```',
    'Do not submit hidden chain-of-thought or secrets. Chat is public session data.',
    '',
    'Post private role notes:',
    '```http',
    `POST ${brief.apiBase}/sessions/${brief.sessionId}/private-chat`,
    'Authorization: Bearer <claimToken>',
    'Content-Type: application/json',
    '',
    '{"kind":"strategy","message":"Private note: armor worked, but next plan needs more turning control."}',
    '```',
    'Private notes are visible only through this role bearer and are cleared if the referee resets the role. Do not store secrets or raw hidden reasoning.',
    '',
    '## Continuation loop',
    `Transport: ${brief.continuationProtocol.transport}`,
    `Poll interval: ${brief.continuationProtocol.pollIntervalMs}ms`,
    `Watch field: ${brief.continuationProtocol.watchField}`,
    `Next playable condition: ${brief.continuationProtocol.nextPlayableCondition}`,
    '',
    'Algorithm:',
    '1. After bootstrapping or submitting, keep the latest private stateVersion.',
    `2. Poll GET ${brief.apiBase}/sessions/${brief.sessionId}/state with Authorization: Bearer <claimToken>.`,
    '3. If stateVersion is unchanged, wait and poll again.',
    '4. If phase is submission_phase and submitted is false, it is your turn to submit the next round plan.',
    '5. If phase is referee_awards, replay_phase, combat_resolved, or submissions_locked, keep waiting.',
    '6. If phase is session_complete or expired, stop playing.',
    '',
    'Browser helper, if you are already claimed in the cockpit:',
    '```js',
    'const nextState = await window.AgentArenaRole.waitForNextSubmissionWindow()',
    '```',
    '',
    '## Validation checklist',
    ...brief.validationChecklist.map((item) => `- ${item}`),
    '',
    '## Fallback round plan',
    'This is not the preferred strategy. Use it only when you cannot produce a legal custom plan promptly, the role has not submitted, and private state shows at least 72 gold.',
    '```json',
    JSON.stringify(brief.sampleRoundPlan, null, 2),
    '```',
    '',
    'Browser automation note: after opening the invite page, read script#agent-arena-state and script#agent-arena-brief, or call window.AgentArenaRole.bootstrapRole(), getState(), waitForNextSubmissionWindow(), and submitRoundPlan(plan).',
  ].join('\n')
}

function claimBodyForBrief(invite: AgentInvite): string {
  return JSON.stringify({
    role: invite.role,
    claimToken: invite.claimToken ?? '<claimToken from invite URL>',
    agentName: `${invite.role}-agent`,
  })
}

function bootstrapBodyForBrief(invite: AgentInvite): string {
  return JSON.stringify({
    agentName: `${invite.role}-agent`,
  })
}

export function createBaselineRoundPlan(): RoundPlanSubmission {
  return {
    action: 'submit_round_plan',
    purchases: [
      { partId: 'Body_Square_Medium', quantity: 1 },
      { partId: 'Wheel_Large', quantity: 2 },
      { partId: 'Weapon_Spinner_Small', quantity: 1 },
    ],
    blueprint: {
      name: 'Baseline Spinner',
      blocks: [
        {
          id: 'core',
          partId: 'Body_Square_Medium',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        },
        {
          id: 'leftWheel',
          partId: 'Wheel_Large',
          position: [-1, 0, 0],
          rotation: [0, 0, 90],
        },
        {
          id: 'rightWheel',
          partId: 'Wheel_Large',
          position: [1, 0, 0],
          rotation: [0, 0, 90],
        },
        {
          id: 'spinner',
          partId: 'Weapon_Spinner_Small',
          position: [0, 0, 1],
          rotation: [0, 0, 0],
        },
      ],
    },
    turnPlan: {
      commands: [
        { tick: 1, move: 'dash_forward', weaponA: 'hold' },
        { tick: 2, move: 'circle_left', weaponA: 'fire' },
        { tick: 3, move: 'strafe_right', weaponA: 'hold' },
        { tick: 4, move: 'dash_backward', weaponA: 'fire' },
        { tick: 5, move: 'circle_right', weaponA: 'hold' },
      ],
    },
    rationale:
      'A compact legal opener that buys a body, mobility, and one weapon inside the first-round budget.',
  }
}

export function createAgentRoleStorageKey(invite: AgentInvite): string {
  return `agent-arena:role-token:${invite.apiBase}:${invite.sessionId}:${invite.role}`
}

export function readStoredRoleToken(
  storage: TokenStorage,
  invite: AgentInvite,
): string | undefined {
  return firstPresent(storage.getItem(createAgentRoleStorageKey(invite)))
}

export function writeStoredRoleToken(
  storage: TokenStorage,
  invite: AgentInvite,
  roleToken: string,
): void {
  storage.setItem(createAgentRoleStorageKey(invite), roleToken)
}

export function clearStoredRoleToken(
  storage: TokenStorage,
  invite: AgentInvite,
): void {
  storage.removeItem(createAgentRoleStorageKey(invite))
}

export function serializeJsonForScript(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c')
}

export class AgentArenaApiError extends Error {
  readonly status: number

  readonly code?: RelayErrorCode

  readonly issues?: RelayErrorResponse['error']['issues']

  constructor(input: {
    status: number
    message: string
    code?: RelayErrorCode
    issues?: RelayErrorResponse['error']['issues']
  }) {
    super(input.message)
    this.name = 'AgentArenaApiError'
    this.status = input.status
    this.code = input.code
    this.issues = input.issues
  }
}

export class AgentArenaClient {
  private readonly invite: AgentInvite

  private readonly fetchImpl: FetchLike

  private readonly getRoleToken?: () => string | undefined

  constructor(input: {
    invite: AgentInvite
    fetchImpl?: FetchLike
    getRoleToken?: () => string | undefined
  }) {
    this.invite = input.invite
    this.fetchImpl = input.fetchImpl ?? fetch.bind(globalThis)
    this.getRoleToken = input.getRoleToken
  }

  async getContract(): Promise<AgentContract> {
    return this.requestJson<AgentContract>('/agent-spec.json')
  }

  async claimRole(input: {
    claimToken: string
    agentName?: string
  }): Promise<RoleClaimResponse> {
    return this.requestJson<RoleClaimResponse>(
      `/sessions/${encodeURIComponent(this.invite.sessionId)}/claim`,
      {
        method: 'POST',
        body: JSON.stringify({
          role: this.invite.role,
          claimToken: input.claimToken,
          ...(input.agentName?.trim() ? { agentName: input.agentName.trim() } : {}),
        }),
      },
    )
  }

  async claimInviteRole(input: {
    agentName?: string
  } = {}): Promise<RoleClaimResponse> {
    if (!this.invite.claimToken) {
      throw new AgentArenaApiError({
        status: 400,
        code: 'INVALID_TOKEN',
        message: 'Claim token is missing from this invite URL. Ask the referee for a refreshed invite.',
      })
    }

    return this.claimRole({
      claimToken: this.invite.claimToken,
      agentName: input.agentName,
    })
  }

  async bootstrapRole(input: {
    agentName?: string
    playerKey?: string
  } = {}): Promise<AgentBootstrapResponse> {
    const playerKey = input.playerKey ?? this.invite.claimToken ?? this.getRoleToken?.()

    if (!playerKey) {
      throw new AgentArenaApiError({
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'Player key is missing. Use an invite with claimToken or a stored role token.',
      })
    }

    return this.requestJson<AgentBootstrapResponse>(
      `/sessions/${encodeURIComponent(this.invite.sessionId)}/roles/${this.invite.role}/bootstrap`,
      {
        method: 'POST',
        headers: this.authorizationHeaders(playerKey),
        body: JSON.stringify({
          ...(input.agentName?.trim() ? { agentName: input.agentName.trim() } : {}),
        }),
      },
    )
  }

  async getPublicState(): Promise<PublicSessionState> {
    return this.requestJson<PublicSessionState>(
      `/sessions/${encodeURIComponent(this.invite.sessionId)}/public`,
    )
  }

  async getState(): Promise<RolePrivateState> {
    return this.requestJson<RolePrivateState>(
      `/sessions/${encodeURIComponent(this.invite.sessionId)}/state`,
      {
        headers: this.authorizationHeaders(),
      },
    )
  }

  async submitRoundPlan(
    plan: RoundPlanSubmission,
  ): Promise<RoundSubmissionResponse> {
    return this.requestJson<RoundSubmissionResponse>(
      `/sessions/${encodeURIComponent(this.invite.sessionId)}/round-plan`,
      {
        method: 'POST',
        headers: this.authorizationHeaders(),
        body: JSON.stringify(plan),
      },
    )
  }

  async submitFallbackRoundPlan(): Promise<RoundSubmissionResponse> {
    return this.submitRoundPlan(createBaselineRoundPlan())
  }

  async submitChatMessage(
    input: AgentChatMessagePostRequest | string,
  ): Promise<AgentChatMessageResponse> {
    return this.requestJson<AgentChatMessageResponse>(
      `/sessions/${encodeURIComponent(this.invite.sessionId)}/chat`,
      {
        method: 'POST',
        headers: this.authorizationHeaders(),
        body: JSON.stringify(typeof input === 'string' ? { message: input } : input),
      },
    )
  }

  async submitPrivateChatMessage(
    input: AgentPrivateChatMessagePostRequest | string,
  ): Promise<AgentPrivateChatMessageResponse> {
    return this.requestJson<AgentPrivateChatMessageResponse>(
      `/sessions/${encodeURIComponent(this.invite.sessionId)}/private-chat`,
      {
        method: 'POST',
        headers: this.authorizationHeaders(),
        body: JSON.stringify(typeof input === 'string' ? { message: input } : input),
      },
    )
  }

  async getMatchLog(): Promise<SessionLogEvent[]> {
    const state = await this.getState()

    return state.eventLog
  }

  async getChatLog(): Promise<SessionChatMessage[]> {
    const state = await this.getState()

    return state.chatLog
  }

  async getPrivateChatLog(): Promise<SessionChatMessage[]> {
    const state = await this.getState()

    return state.privateChatLog
  }

  async waitForPhase(phase: SessionPhase): Promise<RolePrivateState> {
    for (;;) {
      const state = await this.getState()

      if (state.phase === phase) {
        return state
      }

      if (TERMINAL_PHASES.has(state.phase)) {
        throw new AgentArenaApiError({
          status: 409,
          code: state.phase === 'expired' ? 'SESSION_EXPIRED' : 'PHASE_CLOSED',
          message: `Session reached ${state.phase} before ${phase}.`,
        })
      }

      await delay(DEFAULT_WAIT_POLL_MS)
    }
  }

  async waitForStateChange(previousStateVersion?: string): Promise<RolePrivateState> {
    const baseline = previousStateVersion ?? (await this.getState()).stateVersion

    for (;;) {
      const state = await this.getState()

      if (state.stateVersion !== baseline) {
        return state
      }

      if (TERMINAL_PHASES.has(state.phase)) {
        throw new AgentArenaApiError({
          status: 409,
          code: state.phase === 'expired' ? 'SESSION_EXPIRED' : 'PHASE_CLOSED',
          message: `Session reached ${state.phase} without a later state change.`,
        })
      }

      await delay(DEFAULT_WAIT_POLL_MS)
    }
  }

  async waitForNextSubmissionWindow(): Promise<RolePrivateState> {
    for (;;) {
      const state = await this.getState()

      if (state.phase === 'submission_phase' && !state.submitted) {
        return state
      }

      if (TERMINAL_PHASES.has(state.phase)) {
        throw new AgentArenaApiError({
          status: 409,
          code: state.phase === 'expired' ? 'SESSION_EXPIRED' : 'PHASE_CLOSED',
          message: `Session reached ${state.phase} before another submission window opened.`,
        })
      }

      await delay(DEFAULT_WAIT_POLL_MS)
    }
  }

  private authorizationHeaders(token = this.getRoleToken?.() ?? this.invite.claimToken): Headers {
    const roleToken = token

    if (!roleToken) {
      throw new AgentArenaApiError({
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'Role bearer token or invite player key is missing. Bootstrap or claim the role first.',
      })
    }

    const headers = new Headers()

    headers.set('authorization', `Bearer ${roleToken}`)

    return headers
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.invite.apiBase}${path}`, {
      ...init,
      headers: headersWithJson(init),
    })
    const payload = await readResponseJson(response)

    if (!response.ok) {
      if (isRelayErrorResponse(payload)) {
        throw new AgentArenaApiError({
          status: response.status,
          code: payload.error.code,
          message: payload.error.message,
          issues: payload.error.issues,
        })
      }

      throw new AgentArenaApiError({
        status: response.status,
        message: `Request failed with HTTP ${response.status}.`,
      })
    }

    return payload as T
  }
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await response.text()

  if (text.trim().length === 0) {
    return {}
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export function getValidAgentActions(
  state: RolePrivateState | null,
): AgentArenaValidAction[] {
  return [
    {
      name: 'get_contract',
      available: true,
    },
    {
      name: 'bootstrap_role',
      available: true,
    },
    {
      name: 'claim_role',
      available: !state,
      ...(state ? { reason: 'Role is already claimed in this browser.' } : {}),
    },
    {
      name: 'get_role_state',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'get_match_log',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'get_chat_log',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'get_private_chat_log',
      available: Boolean(state),
      ...(state ? {} : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'wait_for_state_change',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'wait_for_next_submission_window',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase) && !(state.phase === 'submission_phase' && !state.submitted)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : state.phase === 'submission_phase' && !state.submitted
            ? { reason: 'Submission window is already open.' }
            : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'get_fallback_round_plan',
      available: true,
    },
    {
      name: 'submit_fallback_round_plan',
      available: Boolean(state && state.phase === 'submission_phase' && !state.submitted && state.gold >= 72),
      ...(state?.phase !== 'submission_phase'
        ? { reason: `Round plans are not open during ${state?.phase ?? 'unclaimed'}.` }
        : state.submitted
          ? { reason: 'This role has already submitted a round plan.' }
          : state.gold < 72
            ? { reason: 'Baseline Spinner requires 72 gold.' }
            : {}),
    },
    {
      name: 'submit_round_plan',
      available: Boolean(state && state.phase === 'submission_phase' && !state.submitted),
      ...(state?.phase !== 'submission_phase'
        ? { reason: `Round plans are not open during ${state?.phase ?? 'unclaimed'}.` }
        : state.submitted
          ? { reason: 'This role has already submitted a round plan.' }
          : {}),
    },
    {
      name: 'submit_chat_message',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
    {
      name: 'submit_private_chat_message',
      available: Boolean(state && !TERMINAL_PHASES.has(state.phase)),
      ...(state
        ? TERMINAL_PHASES.has(state.phase)
          ? { reason: `Session is terminal: ${state.phase}.` }
          : {}
        : { reason: 'Role has not been claimed in this browser.' }),
    },
  ]
}

export function createAgentArenaRoleApi(
  client: AgentArenaClient,
  getCurrentState: () => RolePrivateState | null,
  options: {
    claimRole?: (input?: { agentName?: string }) => Promise<RoleClaimResponse>
  } = {},
): AgentArenaRoleApi {
  return {
    getContract: () => client.getContract(),
    bootstrapRole: (input) => client.bootstrapRole(input),
    claimRole: (input) => options.claimRole?.(input) ?? client.claimInviteRole(input),
    getState: () => client.getState(),
    getValidActions: async () => getValidAgentActions(getCurrentState()),
    getFallbackRoundPlan: () => createBaselineRoundPlan(),
    submitFallbackRoundPlan: () => client.submitFallbackRoundPlan(),
    submitRoundPlan: (plan) => client.submitRoundPlan(plan),
    submitChatMessage: (input) => client.submitChatMessage(input),
    submitPrivateChatMessage: (input) => client.submitPrivateChatMessage(input),
    getMatchLog: () => client.getMatchLog(),
    getChatLog: () => client.getChatLog(),
    getPrivateChatLog: () => client.getPrivateChatLog(),
    waitForStateChange: (previousStateVersion) => client.waitForStateChange(previousStateVersion),
    waitForPhase: (phase) => client.waitForPhase(phase),
    waitForNextSubmissionWindow: () => client.waitForNextSubmissionWindow(),
  }
}

declare global {
  interface Window {
    AgentArenaRole?: AgentArenaRoleApi
  }
}
