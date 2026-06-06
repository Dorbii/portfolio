import type {
  PublicSessionState,
  RoleInvite,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { createExternalAgentBriefMarkdown } from '../agent/agentClient.js'
import { buildInviteUrl } from './refereeClient.js'

type RefereeAgentBriefInput = {
  activeSessionId: string
  apiBase: string
  invites: RoleInvite[]
  publicSession: PublicSessionState | null
  siteBase?: string
}

export type RefereeAgentBriefs = {
  blueAgentBrief: string
  blueCockpitUrl: string
  blueInviteUrl: string
  hasAnyInvite: boolean
  redAgentBrief: string
  redCockpitUrl: string
  redInviteUrl: string
}

export function createRefereeAgentBriefs({
  activeSessionId,
  apiBase,
  invites,
  publicSession,
  siteBase,
}: RefereeAgentBriefInput): RefereeAgentBriefs {
  const redInvite = inviteForRole(invites, 'red')
  const blueInvite = inviteForRole(invites, 'blue')
  const redInviteUrl = createRoleInviteUrl(redInvite, activeSessionId, apiBase, 'agent', siteBase)
  const blueInviteUrl = createRoleInviteUrl(blueInvite, activeSessionId, apiBase, 'agent', siteBase)
  const redCockpitUrl = createRoleInviteUrl(redInvite, activeSessionId, apiBase, 'observer', siteBase)
  const blueCockpitUrl = createRoleInviteUrl(blueInvite, activeSessionId, apiBase, 'observer', siteBase)

  return {
    blueAgentBrief: createRoleBrief(blueInvite, blueInviteUrl, activeSessionId, apiBase, publicSession),
    blueCockpitUrl,
    blueInviteUrl,
    hasAnyInvite: hasInviteForRole(invites, 'red') || hasInviteForRole(invites, 'blue'),
    redAgentBrief: createRoleBrief(redInvite, redInviteUrl, activeSessionId, apiBase, publicSession),
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

function createRoleBrief(
  invite: RoleInvite | undefined,
  inviteUrl: string,
  activeSessionId: string,
  apiBase: string,
  publicSession: PublicSessionState | null,
): string {
  if (!invite || !inviteUrl || !activeSessionId) {
    return ''
  }

  const claimToken = tokenValue(invite.claimToken)

  if (!claimToken) {
    return ''
  }

  return createExternalAgentBriefMarkdown({
    invite: {
      sessionId: activeSessionId,
      role: invite.role,
      apiBase,
      claimToken,
    },
    inviteUrl,
    publicState: publicSession,
  })
}

function tokenValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
