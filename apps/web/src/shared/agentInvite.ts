import type { TeamRole } from '../../../../packages/schemas/src/index.js'

export const DEFAULT_AGENT_SITE_BASE = 'https://arena.dorbii.net'

export type AgentInvite = {
  sessionId: string
  role: TeamRole
  apiBase: string
  claimToken?: string
  observerToken?: string
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
  if (invite.observerToken) {
    params.set('observerToken', invite.observerToken)
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
