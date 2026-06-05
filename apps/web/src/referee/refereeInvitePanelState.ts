import type { RolePublicState } from '../../../../packages/schemas/src/index.js'

export type InvitePanelMode = 'claimed' | 'unavailable' | 'unclaimed'

export function getInvitePanelMode({
  hasInvite,
  roleState,
}: {
  hasInvite: boolean
  roleState?: Pick<RolePublicState, 'claimed'> | null
}): InvitePanelMode {
  if (roleState?.claimed) {
    return 'claimed'
  }

  if (hasInvite) {
    return 'unclaimed'
  }

  return 'unavailable'
}
