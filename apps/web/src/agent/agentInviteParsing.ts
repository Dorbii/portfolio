import {
  type TeamIdentity,
  type TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { AgentInvite } from '../shared/agentInvite.js'
import {
  LEGACY_TEAM_LOGO_MARKS,
  type LegacyTeamIdentity,
  type LegacyTeamLogoMark,
} from '../shared/teamVisuals.js'
import type {
  AgentInviteParseResult,
  TokenStorage,
} from './agentClientTypes.js'

const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/
const TEAM_ROLE_VALUES = ['red', 'blue'] as const
const TEAM_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const DEFAULT_TEAM_LOGO_MARK: LegacyTeamLogoMark = 'shield'

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

function isTeamLogoMark(value: unknown): value is LegacyTeamLogoMark {
  return typeof value === 'string' && LEGACY_TEAM_LOGO_MARKS.includes(value as LegacyTeamLogoMark)
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
  const observerToken = firstPresent(params.get('observerToken'), params.get('observer'))

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
      ...(observerToken ? { observerToken } : {}),
    },
  }
}

export function createAgentRoleStorageKey(invite: AgentInvite): string {
  return `agent-arena:role-token:${invite.apiBase}:${invite.sessionId}:${invite.role}`
}

export function createAgentTeamIdentityStorageKey(invite: AgentInvite): string {
  return `agent-arena:team-identity:${invite.apiBase}:${invite.sessionId}:${invite.role}`
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

export function readStoredTeamIdentity(
  storage: TokenStorage,
  invite: AgentInvite,
): LegacyTeamIdentity | undefined {
  const rawValue = firstPresent(storage.getItem(createAgentTeamIdentityStorageKey(invite)))

  if (!rawValue) {
    return undefined
  }

  try {
    return normalizeStoredTeamIdentity(JSON.parse(rawValue))
  } catch {
    return undefined
  }
}

export function writeStoredTeamIdentity(
  storage: TokenStorage,
  invite: AgentInvite,
  identity: TeamIdentity | LegacyTeamIdentity,
): LegacyTeamIdentity {
  const normalizedIdentity = normalizeStoredTeamIdentity(identity)

  storage.setItem(
    createAgentTeamIdentityStorageKey(invite),
    JSON.stringify(normalizedIdentity),
  )

  return normalizedIdentity
}

export function clearStoredTeamIdentity(
  storage: TokenStorage,
  invite: AgentInvite,
): void {
  storage.removeItem(createAgentTeamIdentityStorageKey(invite))
}

function normalizeStoredTeamIdentity(value: unknown): LegacyTeamIdentity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected team identity object.')
  }

  const identity = value as Record<string, unknown>
  const name = typeof identity.name === 'string' ? identity.name.trim() : ''
  const primaryColor = typeof identity.primaryColor === 'string'
    ? identity.primaryColor.trim().toLowerCase()
    : typeof identity.colorHex === 'string'
      ? identity.colorHex.trim().toLowerCase()
    : ''

  if (!name || !TEAM_COLOR_PATTERN.test(primaryColor)) {
    throw new Error('Invalid team identity.')
  }

  const logo = typeof identity.logo === 'object' && identity.logo !== null && !Array.isArray(identity.logo)
    ? identity.logo as Record<string, unknown>
    : null
  const logoPrompt = typeof identity.logoPrompt === 'string' && identity.logoPrompt.trim()
    ? identity.logoPrompt.trim()
    : ''
  const logoMark = isTeamLogoMark(logo?.mark)
    ? logo.mark
    : DEFAULT_TEAM_LOGO_MARK
  const initials = typeof logo?.initials === 'string' && logo.initials.trim()
    ? logo.initials.trim().slice(0, 4).toUpperCase()
    : initialsFromLogoPrompt(logoPrompt)

  return {
    name,
    primaryColor,
    logo: {
      mark: logoMark,
      ...(initials ? { initials } : {}),
    },
  }
}

function initialsFromLogoPrompt(value: string): string | undefined {
  const letters = value
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase()

  return letters || undefined
}
