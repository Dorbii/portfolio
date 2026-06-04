import type {
  BotBlueprint,
  CreateSessionResponse,
  PublicSessionState,
  RefereeAwardSelection,
  RefereeAwardsResponse,
  RelayErrorCode,
  RelayErrorResponse,
  RoleInvite,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { ReplayTimeline } from '../../../../packages/replay/src/index.js'

export const DEFAULT_ARENA_API_BASE = 'https://arena-api.dorbii.net'
export const DEFAULT_ARENA_SITE_BASE = 'https://arena.dorbii.net'
export const POLL_INTERVAL_MS = 1_500

export const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/

const SESSION_STORAGE_KEY_PREFIX = 'agent-arena:referee-console'
const TEAM_ROLE_VALUES = new Set<TeamRole>(['red', 'blue'])

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type StoredSessionSecrets = {
  sessionId: string
  apiBase: string
  refereeToken: string
  invites: RoleInvite[]
}

export type ReplayPayload = {
  timeline: ReplayTimeline
  botBlueprints: Record<TeamRole, BotBlueprint>
}

export function isTerminalPhase(phase: PublicSessionState['phase'] | undefined): boolean {
  return phase === 'session_complete' || phase === 'expired'
}

export function normalizeSessionId(value: string): string {
  return value.trim()
}

export function parseSessionIdFromLocation(): string {
  const params = new URLSearchParams(window.location.search)

  return normalizeSessionId(params.get('session') ?? params.get('sessionId') ?? '')
}

export function setSessionIdInUrl(sessionId: string) {
  const params = new URLSearchParams(window.location.search)

  params.set('session', sessionId)
  const nextSearch = params.toString()

  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`,
  )
}

export function buildInviteUrl({
  role,
  claimToken,
  sessionId,
  apiBase,
}: {
  role: TeamRole
  claimToken: string
  sessionId: string
  apiBase: string
}) {
  return `${DEFAULT_ARENA_SITE_BASE}/agent#session=${sessionId}&role=${role}&claimToken=${claimToken}&api=${apiBase}`
}

export async function createSession(apiBase: string): Promise<CreateSessionResponse> {
  return requestJson<CreateSessionResponse>(`${apiBase}/sessions`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function loadPublicSession(
  apiBase: string,
  sessionId: string,
): Promise<PublicSessionState> {
  return requestJson<PublicSessionState>(
    `${apiBase}/sessions/${encodeURIComponent(sessionId)}/public`,
  )
}

export async function loadReplayPayload(
  apiBase: string,
  sessionId: string,
): Promise<ReplayPayload> {
  const payload = await requestJson<unknown>(
    `${apiBase}/sessions/${encodeURIComponent(sessionId)}/replay`,
  )
  const replayPayload = normalizeReplayPayload(payload)

  if (!replayPayload) {
    throw new RefereeArenaApiError({
      status: 502,
      message: 'Replay payload is missing post-combat bot blueprints.',
      code: 'INVALID_REQUEST',
    })
  }

  return replayPayload
}

export async function submitRefereeAwards(
  apiBase: string,
  sessionId: string,
  refereeToken: string,
  awards: RefereeAwardSelection[],
): Promise<RefereeAwardsResponse> {
  return requestJson<RefereeAwardsResponse>(
    `${apiBase}/sessions/${encodeURIComponent(sessionId)}/referee-awards`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({ awards }),
    },
  )
}

export function toUserMessage(error: unknown): string {
  if (error instanceof RefereeArenaApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error. Check console for details.'
}

export function readStoredSession(
  storage: TokenStorage,
  apiBase: string,
  sessionId: string,
): StoredSessionSecrets | null {
  const key = storageKey(apiBase, sessionId)
  const raw = storage.getItem(key)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.sessionId === 'string' &&
      typeof parsed.apiBase === 'string' &&
      typeof parsed.refereeToken === 'string' &&
      Array.isArray(parsed.invites) &&
      parsed.invites.every(isRoleInvite)
    ) {
      return {
        sessionId: parsed.sessionId,
        apiBase: parsed.apiBase,
        refereeToken: parsed.refereeToken,
        invites: parsed.invites,
      }
    }
  } catch {
    storage.removeItem(key)
    return null
  }

  storage.removeItem(key)
  return null
}

export function writeStoredSession(
  storage: TokenStorage,
  apiBase: string,
  sessionId: string,
  data: { refereeToken: string; invites: RoleInvite[] },
) {
  const payload: StoredSessionSecrets = {
    sessionId,
    apiBase,
    refereeToken: data.refereeToken,
    invites: data.invites,
  }

  storage.setItem(storageKey(apiBase, sessionId), JSON.stringify(payload))
}

export function clearStoredSession(storage: TokenStorage, apiBase: string, sessionId: string) {
  storage.removeItem(storageKey(apiBase, sessionId))
}

export function isValidSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(normalizeSessionId(value))
}

function storageKey(apiBase: string, sessionId: string): string {
  return `${SESSION_STORAGE_KEY_PREFIX}:${apiBase}:${sessionId}`
}

function isRoleInvite(value: unknown): value is RoleInvite {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const invite = value as Record<string, unknown>

  return (
    typeof invite.role === 'string' &&
    TEAM_ROLE_VALUES.has(invite.role as TeamRole) &&
    typeof invite.claimToken === 'string' &&
    invite.claimToken.length > 0 &&
    typeof invite.claimPath === 'string'
  )
}

function normalizeReplayPayload(value: unknown): ReplayPayload | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }

  const payload = value as Record<string, unknown>
  const botBlueprints = payload.botBlueprints as Record<string, unknown> | undefined
  const hasBlueprints =
    typeof botBlueprints === 'object' &&
    botBlueprints !== null &&
    typeof botBlueprints.red === 'object' &&
    botBlueprints.red !== null &&
    typeof botBlueprints.blue === 'object' &&
    botBlueprints.blue !== null

  if (!hasBlueprints) {
    return undefined
  }

  if (
    typeof payload.timeline === 'object' &&
    payload.timeline !== null &&
    hasReplayTimelineShape(payload.timeline)
  ) {
    return {
      timeline: payload.timeline as ReplayTimeline,
      botBlueprints: botBlueprints as Record<TeamRole, BotBlueprint>,
    }
  }

  if (hasReplayTimelineShape(payload)) {
    return {
      timeline: {
        round: payload.round,
        duration: payload.duration,
        events: payload.events,
        summary: payload.summary,
      } as ReplayTimeline,
      botBlueprints: botBlueprints as Record<TeamRole, BotBlueprint>,
    }
  }

  return undefined
}

function hasReplayTimelineShape(value: unknown): value is ReplayTimeline {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const timeline = value as Record<string, unknown>

  return (
    typeof timeline.round === 'number' &&
    typeof timeline.duration === 'number' &&
    typeof timeline.summary === 'string' &&
    Array.isArray(timeline.events)
  )
}

export async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: headersWithJson(init.headers),
  })
  const payload = await readResponseJson(response)

  if (!response.ok) {
    if (isRelayErrorResponse(payload)) {
      throw new RefereeArenaApiError({
        status: response.status,
        message: payload.error.message,
        code: payload.error.code,
        issues: payload.error.issues,
      })
    }

    throw new RefereeArenaApiError({
      status: response.status,
      message: `Request failed with HTTP ${response.status}.`,
      code: 'INVALID_REQUEST',
    })
  }

  return payload as T
}

function headersWithJson(headers?: HeadersInit): Headers {
  const output = new Headers(headers)

  if (!output.has('content-type')) {
    output.set('content-type', 'application/json')
  }

  return output
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isRelayErrorResponse(value: unknown): value is RelayErrorResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const candidate = value as {
    ok?: unknown
    error?: unknown
  }

  return (
    candidate.ok === false &&
    typeof candidate.error === 'object' &&
    candidate.error !== null &&
    !Array.isArray(candidate.error) &&
    typeof (candidate.error as { code?: unknown }).code === 'string' &&
    typeof (candidate.error as { message?: unknown }).message === 'string'
  )
}

class RefereeArenaApiError extends Error {
  readonly status: number
  readonly code: RelayErrorCode
  readonly issues?: RelayErrorResponse['error']['issues']

  constructor(input: {
    status: number
    message: string
    code: RelayErrorCode
    issues?: RelayErrorResponse['error']['issues']
  }) {
    super(input.message)
    this.name = 'RefereeArenaApiError'
    this.status = input.status
    this.code = input.code
    this.issues = input.issues
  }
}

export { RefereeArenaApiError }
