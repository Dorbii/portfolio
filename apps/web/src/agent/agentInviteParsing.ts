import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { AgentInvite } from '../shared/agentInvite.js'
import type {
  AgentInviteParseResult,
  TokenStorage,
} from './agentClientTypes.js'

const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/
const TEAM_ROLE_VALUES = ['red', 'blue'] as const

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
