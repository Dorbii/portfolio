import type { CreateSessionRequest, TeamRole } from '../../../packages/schemas/src/index.js'
import { createInitialRoleState } from './sessionDefaults.js'
import {
  DEFAULT_ARENA,
  addMilliseconds,
  cloneJson,
  createSessionId,
  defaultClock,
  defaultTokenFactory,
  defaultTokenHasher,
  isArenaConfig,
  safeMaxRounds,
  safeText,
  safeTtlMs,
} from './sessionSupport.js'
import type {
  Clock,
  StoredSessionState,
  TokenFactory,
  TokenHasher,
} from './sessionTypes.js'

export type CreatedSessionState = {
  state: StoredSessionState
  claimTokens: Record<TeamRole, string>
  refereeToken: string
  clock: Clock
  tokenFactory: TokenFactory
  tokenHasher: TokenHasher
}

export async function createInitialSessionState(
  request: CreateSessionRequest = {},
  options: {
    clock?: Clock
    tokenFactory?: TokenFactory
    tokenHasher?: TokenHasher
  } = {},
): Promise<CreatedSessionState> {
  const clock = options.clock ?? defaultClock
  const tokenFactory = options.tokenFactory ?? defaultTokenFactory
  const tokenHasher = options.tokenHasher ?? defaultTokenHasher
  const now = clock()
  const sessionId = safeText(request.sessionId) ?? createSessionId()
  const seed = safeText(request.seed) ?? sessionId
  const arena = cloneJson(isArenaConfig(request.arena) ? request.arena : DEFAULT_ARENA)
  const claimTokens: Record<TeamRole, string> = {
    red: tokenFactory('red', 'claim'),
    blue: tokenFactory('blue', 'claim'),
  }
  const claimTokenHashes: Record<TeamRole, string> = {
    red: await tokenHasher(claimTokens.red),
    blue: await tokenHasher(claimTokens.blue),
  }
  const refereeToken = tokenFactory('referee', 'referee')

  return {
    clock,
    tokenFactory,
    tokenHasher,
    claimTokens,
    refereeToken,
    state: {
      id: sessionId,
      phase: 'waiting_for_agents',
      round: 1,
      maxRounds: safeMaxRounds(request.maxRounds),
      seed,
      arena,
      createdAt: now,
      expiresAt: addMilliseconds(now, safeTtlMs(request.ttlSeconds)),
      updatedAt: now,
      roles: {
        red: createInitialRoleState('red', claimTokenHashes.red),
        blue: createInitialRoleState('blue', claimTokenHashes.blue),
      },
      refereeTokenHash: await tokenHasher(refereeToken),
      chatLog: [],
      rateLimits: {},
      eventLog: [
        {
          at: now,
          type: 'session_created',
          message: `Session ${sessionId} opened for role claims.`,
        },
      ],
    },
  }
}
