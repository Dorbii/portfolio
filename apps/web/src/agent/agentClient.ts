import type {
  AgentChatMessagePostRequest,
  AgentChatMessageResponse,
  AgentBootstrapResponse,
  AgentNextAction,
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
  TurnCommandPostRequest,
  TurnCommandResponse,
} from '../../../../packages/schemas/src/index.js'
import {
  createAgentInviteUrl,
  createSafeAgentHash,
  type AgentInvite,
} from '../shared/agentInvite.js'
import type {
  AgentContract,
  AgentWaitOptions,
  FetchLike,
} from './agentClientTypes.js'
import { TERMINAL_PHASES } from './agentPhases.js'

export { createAgentInviteUrl, createSafeAgentHash }
export type { AgentInvite }
export {
  createExternalAgentBrief,
  createExternalAgentBriefMarkdown,
  type ExternalAgentBrief,
  type ExternalAgentBriefInput,
} from './agentBrief.js'
export type {
  AgentArenaRoleApi,
  AgentArenaValidAction,
  AgentContract,
  AgentInviteParseResult,
  AgentWaitOptions,
} from './agentClientTypes.js'
export {
  clearStoredRoleToken,
  createAgentRoleStorageKey,
  parseAgentInviteFragment,
  readStoredRoleToken,
  writeStoredRoleToken,
} from './agentInviteParsing.js'
export {
  createAgentArenaRoleApi,
  getValidAgentActions,
  type AgentArenaRoleApiOptions,
  type AgentArenaRoleClient,
} from './agentRoleApi.js'
export {
  createInstalledAgentArenaRoleApi,
  installAgentArenaRoleApi,
  type AgentArenaRoleApiInstallerOptions,
} from './agentRoleApiInstaller.js'

const DEFAULT_WAIT_POLL_MS = 4_000
const DEFAULT_WAIT_TIMEOUT_MS = 10 * 60_000
const MIN_WAIT_POLL_MS = 1_000
const PLAYABLE_NEXT_ACTIONS = new Set<AgentNextAction>([
  'submit_round_plan',
  'submit_turn_command',
  'stop',
])

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
    globalThis.setTimeout(resolve, ms)
  })
}

function waitConfig(options: AgentWaitOptions = {}) {
  const pollMs = Math.max(MIN_WAIT_POLL_MS, options.pollMs ?? DEFAULT_WAIT_POLL_MS)
  const timeoutMs = Math.max(pollMs, options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS)

  return {
    deadline: Date.now() + timeoutMs,
    pollMs,
    timeoutMs,
  }
}

async function waitBeforePollingAgain(
  config: ReturnType<typeof waitConfig>,
  input: {
    target: string
    lastPhase?: SessionPhase
    lastNextAction?: AgentNextAction
    lastStateVersion?: string
  },
): Promise<void> {
  const remainingMs = config.deadline - Date.now()

  if (remainingMs <= 0) {
    throw new AgentArenaApiError({
      status: 408,
      message: [
        `Timed out after ${Math.ceil(config.timeoutMs / 1000)}s waiting for ${input.target}.`,
        input.lastPhase ? `Last phase: ${input.lastPhase}.` : '',
        input.lastNextAction ? `Last nextAction: ${input.lastNextAction}.` : '',
        input.lastStateVersion ? `Last stateVersion: ${input.lastStateVersion}.` : '',
      ].filter(Boolean).join(' '),
    })
  }

  await delay(Math.min(config.pollMs, remainingMs))
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

  async submitTurnCommand(
    command: TurnCommandPostRequest,
  ): Promise<TurnCommandResponse> {
    return this.requestJson<TurnCommandResponse>(
      `/sessions/${encodeURIComponent(this.invite.sessionId)}/turn-command`,
      {
        method: 'POST',
        headers: this.authorizationHeaders(),
        body: JSON.stringify(command),
      },
    )
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

  async waitForPhase(
    phase: SessionPhase,
    options?: AgentWaitOptions,
  ): Promise<RolePrivateState> {
    const config = waitConfig(options)

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

      await waitBeforePollingAgain(config, {
        target: phase,
        lastPhase: state.phase,
        lastStateVersion: state.stateVersion,
      })
    }
  }

  async waitForStateChange(
    previousStateVersion?: string,
    options?: AgentWaitOptions,
  ): Promise<RolePrivateState> {
    const baseline = previousStateVersion ?? (await this.getState()).stateVersion
    const config = waitConfig(options)

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

      await waitBeforePollingAgain(config, {
        target: 'stateVersion change',
        lastPhase: state.phase,
        lastStateVersion: state.stateVersion,
      })
    }
  }

  async waitForNextSubmissionWindow(
    options?: AgentWaitOptions,
  ): Promise<RolePrivateState> {
    const config = waitConfig(options)

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

      await waitBeforePollingAgain(config, {
        target: 'next submission window',
        lastPhase: state.phase,
        lastStateVersion: state.stateVersion,
      })
    }
  }

  async waitForNextAction(options?: AgentWaitOptions): Promise<AgentBootstrapResponse> {
    const config = waitConfig(options)

    for (;;) {
      const bootstrap = await this.bootstrapRole()

      if (PLAYABLE_NEXT_ACTIONS.has(bootstrap.nextAction)) {
        return bootstrap
      }

      await waitBeforePollingAgain(config, {
        target: 'next playable action',
        lastPhase: bootstrap.state.phase,
        lastNextAction: bootstrap.nextAction,
        lastStateVersion: bootstrap.state.stateVersion,
      })
    }
  }

  private authorizationHeaders(
    token = this.getRoleToken?.() ?? this.invite.claimToken ?? this.invite.observerToken,
  ): Headers {
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
