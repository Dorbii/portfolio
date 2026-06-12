import type {
  RoleInvite,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { buildInviteUrl } from './refereeClient.js'

type RefereeAgentLinksInput = {
  activeSessionId: string
  apiBase: string
  invites: RoleInvite[]
  siteBase?: string
}

export type RefereeAgentLinks = {
  blueCockpitUrl: string
  blueInviteUrl: string
  hasAnyInvite: boolean
  redCockpitUrl: string
  redInviteUrl: string
}

export function createRefereeAgentLinks({
  activeSessionId,
  apiBase,
  invites,
  siteBase,
}: RefereeAgentLinksInput): RefereeAgentLinks {
  const redInvite = inviteForRole(invites, 'red')
  const blueInvite = inviteForRole(invites, 'blue')
  const redInviteUrl = createRoleInviteUrl(redInvite, activeSessionId, apiBase, 'agent', siteBase)
  const blueInviteUrl = createRoleInviteUrl(blueInvite, activeSessionId, apiBase, 'agent', siteBase)
  const redCockpitUrl = createRoleInviteUrl(redInvite, activeSessionId, apiBase, 'observer', siteBase)
  const blueCockpitUrl = createRoleInviteUrl(blueInvite, activeSessionId, apiBase, 'observer', siteBase)

  return {
    blueCockpitUrl,
    blueInviteUrl,
    hasAnyInvite: hasInviteForRole(invites, 'red') || hasInviteForRole(invites, 'blue'),
    redCockpitUrl,
    redInviteUrl,
  }
}

export function hasInviteForRole(invites: RoleInvite[], role: TeamRole): boolean {
  return invites.some(
    (invite) =>
      invite.role === role &&
      (tokenValue(invite.claimToken).length > 0 || tokenValue(invite.observerToken).length > 0),
  )
}

function inviteForRole(invites: RoleInvite[], role: TeamRole): RoleInvite | undefined {
  return invites.find((invite) => invite.role === role)
}

function createRoleInviteUrl(
  invite: RoleInvite | undefined,
  activeSessionId: string,
  apiBase: string,
  kind: 'agent' | 'observer',
  siteBase?: string,
): string {
  if (!invite || !activeSessionId) {
    return ''
  }

  const claimToken = tokenValue(invite.claimToken)
  const observerToken = tokenValue(invite.observerToken)
  const token = kind === 'agent' ? claimToken : observerToken || claimToken

  if (!token) {
    return ''
  }

  return buildInviteUrl({
    role: invite.role,
    ...(kind === 'observer' && observerToken
      ? { observerToken }
      : { claimToken: token }),
    sessionId: activeSessionId,
    apiBase,
    siteBase,
  })
}

function tokenValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
