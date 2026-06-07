import type {
  BotBlueprint,
  RelayErrorCode,
  RelayErrorResponse,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { LegacyTeamIdentity } from '../shared/teamVisuals'
import type {
  AdvanceRoundResponse,
  CreateSessionResponse,
  PublicSessionState,
  RoleInvite,
  RoleResetResponse,
} from '../agent/agentSessionTypes.js'
import type { ReplayTimeline } from '../../../../packages/replay/src/index.js'
import {
  DEFAULT_AGENT_SITE_BASE,
  createAgentInviteUrl,
} from '../shared/agentInvite.js'

export const DEFAULT_ARENA_API_BASE = 'https://arena-api.dorbii.net'
export const DEFAULT_ARENA_SITE_BASE = DEFAULT_AGENT_SITE_BASE
export const POLL_INTERVAL_MS = 10_000

export const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/

const SESSION_STORAGE_KEY_PREFIX = 'agent-arena:referee-console'

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type StoredSessionSecrets = {
  sessionId: string
  apiBase: string
  refereeToken: string
  invites: RoleInvite[]
  expiresAt: string
}

export type ReplayPayload = {
  timeline: ReplayTimeline
  teamIdentities: Record<TeamRole, LegacyTeamIdentity>
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

export function parseApiBaseFromLocation(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_ARENA_API_BASE
  }

  const params = new URLSearchParams(window.location.search)
  const apiBase = normalizeApiBase(params.get('api') ?? '')

  return apiBase ?? DEFAULT_ARENA_API_BASE
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
  observerToken,
  sessionId,
  apiBase,
  siteBase,
}: {
  role: TeamRole
  claimToken?: string
  observerToken?: string
  sessionId: string
  apiBase: string
  siteBase?: string
}) {
  return createAgentInviteUrl({
    role,
    ...(claimToken ? { claimToken } : {}),
    observerToken,
    sessionId,
    apiBase,
  }, siteBase)
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
      message: 'Replay payload is missing post-combat bot blueprints or team identities.',
      code: 'INVALID_REQUEST',
    })
  }

  return replayPayload
}

export async function advanceRound(
  apiBase: string,
  sessionId: string,
  refereeToken: string,
): Promise<AdvanceRoundResponse> {
  return requestJson<AdvanceRoundResponse>(
    `${apiBase}/sessions/${encodeURIComponent(sessionId)}/advance-round`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({}),
    },
  )
}

export async function resetRoleClaim(
  apiBase: string,
  sessionId: string,
  refereeToken: string,
  role: TeamRole,
): Promise<RoleResetResponse> {
  return requestJson<RoleResetResponse>(
    `${apiBase}/sessions/${encodeURIComponent(sessionId)}/reset-role`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({ role }),
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
      typeof parsed.expiresAt === 'string'
    ) {
      const expiresAtMs = Date.parse(parsed.expiresAt)

      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        storage.removeItem(key)
        return null
      }

      return {
        sessionId: parsed.sessionId,
        apiBase: parsed.apiBase,
        refereeToken: parsed.refereeToken,
        invites: normalizeStoredInvites(parsed.invites),
        expiresAt: parsed.expiresAt,
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
  data: { refereeToken: string; expiresAt: string; invites?: RoleInvite[] },
) {
  const existingSession = data.invites ? null : readStoredSession(storage, apiBase, sessionId)
  const payload: StoredSessionSecrets = {
    sessionId,
    apiBase,
    refereeToken: data.refereeToken,
    invites: data.invites ? normalizeStoredInvites(data.invites) : existingSession?.invites ?? [],
    expiresAt: data.expiresAt,
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

function normalizeApiBase(value: string): string | undefined {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  try {
    const url = new URL(trimmed)

    if (url.protocol === 'https:' || (url.protocol === 'http:' && isLocalHost(url.hostname))) {
      return url.toString().replace(/\/$/, '')
    }
  } catch {
    return undefined
  }

  return undefined
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

function normalizeStoredInvites(value: unknown): RoleInvite[] {
  if (!Array.isArray(value)) {
    return []
  }

  const byRole = new Map<TeamRole, RoleInvite>()

  for (const entry of value) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      (entry as { role?: unknown }).role !== undefined &&
      ((entry as { role?: unknown }).role === 'red' || (entry as { role?: unknown }).role === 'blue') &&
      typeof (entry as { claimToken?: unknown }).claimToken === 'string' &&
      (entry as { claimToken: string }).claimToken.length > 0
    ) {
      const invite = entry as RoleInvite

      byRole.set(invite.role, {
        role: invite.role,
        claimToken: invite.claimToken,
        observerToken: typeof invite.observerToken === 'string' ? invite.observerToken : '',
        claimPath: typeof invite.claimPath === 'string' ? invite.claimPath : '',
      })
    }
  }

  return (['red', 'blue'] as TeamRole[])
    .map((role) => byRole.get(role))
    .filter((invite): invite is RoleInvite => invite !== undefined)
}

function normalizeReplayPayload(value: unknown): ReplayPayload | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }

  const payload = value as Record<string, unknown>
  const botBlueprints = payload.botBlueprints as Record<string, unknown> | undefined
  const teamIdentities = payload.teamIdentities as Record<string, unknown> | undefined
  const hasBlueprints =
    typeof botBlueprints === 'object' &&
    botBlueprints !== null &&
    typeof botBlueprints.red === 'object' &&
    botBlueprints.red !== null &&
    typeof botBlueprints.blue === 'object' &&
    botBlueprints.blue !== null
  const hasTeamIdentities =
    typeof teamIdentities === 'object' &&
    teamIdentities !== null &&
    hasTeamIdentityShape(teamIdentities.red) &&
    hasTeamIdentityShape(teamIdentities.blue)

  if (!hasBlueprints || !hasTeamIdentities) {
    return undefined
  }

  if (
    typeof payload.timeline === 'object' &&
    payload.timeline !== null &&
    hasReplayTimelineShape(payload.timeline)
  ) {
    return {
      timeline: payload.timeline as ReplayTimeline,
      teamIdentities: teamIdentities as Record<TeamRole, LegacyTeamIdentity>,
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
      teamIdentities: teamIdentities as Record<TeamRole, LegacyTeamIdentity>,
      botBlueprints: botBlueprints as Record<TeamRole, BotBlueprint>,
    }
  }

  return undefined
}

function hasTeamIdentityShape(value: unknown): value is LegacyTeamIdentity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const identity = value as Record<string, unknown>

  return (
    typeof identity.name === 'string' &&
    identity.name.trim().length > 0 &&
    typeof identity.primaryColor === 'string' &&
    /^#[0-9a-f]{6}$/i.test(identity.primaryColor.trim())
  )
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
