import type {
  PublicSessionState,
  RelayErrorCode,
  RelayErrorResponse,
  RoleClaimResponse,
  RolePrivateState,
  RoundPlanSubmission,
  RoundSubmissionResponse,
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
    | 'get_role_state'
    | 'get_match_log'
    | 'submit_round_plan'
  available: boolean
  reason?: string
}

export type AgentArenaRoleApi = {
  getContract(): Promise<AgentContract>
  getState(): Promise<RolePrivateState>
  getValidActions(): Promise<AgentArenaValidAction[]>
  submitRoundPlan(
    plan: RoundPlanSubmission,
  ): Promise<RoundSubmissionResponse>
  getMatchLog(): Promise<SessionLogEvent[]>
  waitForPhase(phase: SessionPhase): Promise<RolePrivateState>
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

export function createSafeAgentHash(invite: AgentInvite): string {
  const params = new URLSearchParams()

  params.set('session', invite.sessionId)
  params.set('role', invite.role)
  params.set('api', invite.apiBase)

  return `#${params.toString()}`
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

  async getMatchLog(): Promise<SessionLogEvent[]> {
    const state = await this.getState()

    return state.eventLog
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

  private authorizationHeaders(): Headers {
    const roleToken = this.getRoleToken?.()

    if (!roleToken) {
      throw new AgentArenaApiError({
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'Role bearer token is missing. Claim the role first.',
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
      name: 'submit_round_plan',
      available: Boolean(state && state.phase === 'submission_phase' && !state.submitted),
      ...(state?.phase !== 'submission_phase'
        ? { reason: `Round plans are not open during ${state?.phase ?? 'unclaimed'}.` }
        : state.submitted
          ? { reason: 'This role has already submitted a round plan.' }
          : {}),
    },
  ]
}

export function createAgentArenaRoleApi(
  client: AgentArenaClient,
  getCurrentState: () => RolePrivateState | null,
): AgentArenaRoleApi {
  return {
    getContract: () => client.getContract(),
    getState: () => client.getState(),
    getValidActions: async () => getValidAgentActions(getCurrentState()),
    submitRoundPlan: (plan) => client.submitRoundPlan(plan),
    getMatchLog: () => client.getMatchLog(),
    waitForPhase: (phase) => client.waitForPhase(phase),
  }
}

declare global {
  interface Window {
    AgentArenaRole?: AgentArenaRoleApi
  }
}
