import {
  TEAM_ROLES,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import type {
  RoleBearerAuth,
  StoredRoleState,
  StoredSessionState,
  TokenHasher,
} from './sessionTypes.js'

export async function findRoleAuthByToken(
  state: StoredSessionState,
  tokenHasher: TokenHasher,
  roleToken: string,
  options: { allowUnclaimedClaimKey?: boolean } = {},
): Promise<RoleBearerAuth | undefined> {
  return findAnyRoleBearer(state, tokenHasher, roleToken, {
    allowObserver: true,
    allowUnclaimedClaimKey: options.allowUnclaimedClaimKey ?? false,
  })
}

export async function findRoleBearer(
  state: StoredSessionState,
  tokenHasher: TokenHasher,
  roleName: TeamRole,
  token: string,
  options: { allowObserver?: boolean; allowUnclaimedClaimKey: boolean },
): Promise<RoleBearerAuth | undefined> {
  if (!token.trim()) {
    return undefined
  }

  const tokenHash = await tokenHasher(token)

  return matchRoleBearer(state.roles[roleName], tokenHash, options)
}

export async function hasRefereeCapabilityToken(
  state: StoredSessionState,
  tokenHasher: TokenHasher,
  refereeToken: string,
): Promise<boolean> {
  if (!refereeToken.trim() || !state.refereeTokenHash) {
    return false
  }

  return (await tokenHasher(refereeToken)) === state.refereeTokenHash
}

async function findAnyRoleBearer(
  state: StoredSessionState,
  tokenHasher: TokenHasher,
  roleToken: string,
  options: { allowObserver: boolean; allowUnclaimedClaimKey?: boolean },
): Promise<RoleBearerAuth | undefined> {
  if (!roleToken.trim()) {
    return undefined
  }

  const roleTokenHash = await tokenHasher(roleToken)

  for (const roleName of TEAM_ROLES) {
    const auth = matchRoleBearer(state.roles[roleName], roleTokenHash, {
      allowObserver: options.allowObserver,
      allowUnclaimedClaimKey: options.allowUnclaimedClaimKey ?? false,
    })

    if (auth) {
      return auth
    }
  }

  return undefined
}

function matchRoleBearer(
  role: StoredRoleState,
  tokenHash: string,
  options: { allowObserver?: boolean; allowUnclaimedClaimKey: boolean },
): RoleBearerAuth | undefined {
  if (role.roleTokenHash === tokenHash) {
    return { role, scope: 'agent' }
  }

  if ((role.claimedAt || options.allowUnclaimedClaimKey) && role.claimTokenHash === tokenHash) {
    return { role, scope: 'agent' }
  }

  if (options.allowObserver && role.observerTokenHash === tokenHash) {
    return { role, scope: 'observer' }
  }

  return undefined
}
