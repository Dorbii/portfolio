import type {
  PublicSessionState,
  RoleInvite,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { createExternalAgentBriefMarkdown } from '../agent/agentClient'
import { buildInviteUrl } from './refereeClient'

type RefereeAgentBriefInput = {
  activeSessionId: string
  apiBase: string
  invites: RoleInvite[]
  publicSession: PublicSessionState | null
}

export type RefereeAgentBriefs = {
  blueAgentBrief: string
  blueInviteUrl: string
  hasAnyInvite: boolean
  redAgentBrief: string
  redInviteUrl: string
}

export function createRefereeAgentBriefs({
  activeSessionId,
  apiBase,
  invites,
  publicSession,
}: RefereeAgentBriefInput): RefereeAgentBriefs {
  const redInvite = inviteForRole(invites, 'red')
  const blueInvite = inviteForRole(invites, 'blue')
  const redInviteUrl = createRoleInviteUrl(redInvite, activeSessionId, apiBase)
  const blueInviteUrl = createRoleInviteUrl(blueInvite, activeSessionId, apiBase)

  return {
    blueAgentBrief: createRoleBrief(blueInvite, blueInviteUrl, activeSessionId, apiBase, publicSession),
    blueInviteUrl,
    hasAnyInvite: hasInviteForRole(invites, 'red') || hasInviteForRole(invites, 'blue'),
    redAgentBrief: createRoleBrief(redInvite, redInviteUrl, activeSessionId, apiBase, publicSession),
    redInviteUrl,
  }
}

export function hasInviteForRole(invites: RoleInvite[], role: TeamRole): boolean {
  return invites.some((invite) => invite.role === role && invite.claimToken.length > 0)
}

function inviteForRole(invites: RoleInvite[], role: TeamRole): RoleInvite | undefined {
  return invites.find((invite) => invite.role === role)
}

function createRoleInviteUrl(
  invite: RoleInvite | undefined,
  activeSessionId: string,
  apiBase: string,
): string {
  if (!invite || !activeSessionId) {
    return ''
  }

  return buildInviteUrl({
    role: invite.role,
    claimToken: invite.claimToken,
    sessionId: activeSessionId,
    apiBase,
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

  return createExternalAgentBriefMarkdown({
    invite: {
      sessionId: activeSessionId,
      role: invite.role,
      apiBase,
      claimToken: invite.claimToken,
    },
    inviteUrl,
    publicState: publicSession,
  })
}
