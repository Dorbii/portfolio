import type { TeamRole } from '../../../packages/schemas/src/index.js'
import {
  cloneJson,
  relayError,
} from './sessionSupport.js'
import type {
  SessionResult,
  StoredSessionState,
  TokenFactory,
  TokenHasher,
} from './sessionTypes.js'

export async function resetStoredRoleClaim(
  state: StoredSessionState,
  roleName: TeamRole,
  tokenFactory: TokenFactory,
  tokenHasher: TokenHasher,
): Promise<SessionResult<{ claimToken: string; observerToken: string }>> {
  const role = state.roles[roleName]

  if (role.submittedAt) {
    if (!role.submissionBaseline) {
      return relayError(
        'INVALID_REQUEST',
        `${role.role} cannot be reset because its accepted submission cannot be rolled back.`,
      )
    }

    role.gold = role.submissionBaseline.gold
    role.inventory = cloneJson(role.submissionBaseline.inventory)
  }

  const claimToken = tokenFactory(roleName, 'claim')
  const observerToken = tokenFactory(roleName, 'observer')

  role.claimTokenHash = await tokenHasher(claimToken)
  role.observerTokenHash = await tokenHasher(observerToken)
  role.roleTokenHash = undefined
  role.agentName = undefined
  role.claimedAt = undefined
  role.submittedAt = undefined
  role.controls = undefined
  role.submission = undefined
  role.normalizedSubmission = undefined
  role.submissionBaseline = undefined
  role.privateChatLog = []

  return {
    ok: true,
    value: { claimToken, observerToken },
  }
}
