import type {
  ChampionContinuationSeed,
  CreateSessionRequest,
  TeamRole,
} from '../../../packages/schemas/src/index.js'
import { createInitialLoadoutBuildState } from '../../../packages/sim/src/index.js'
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
  isTeamRole,
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

export type InternalCreateSessionRequest = CreateSessionRequest & {
  continuationSeed?: ChampionContinuationSeed
}

export type CreatedSessionState = {
  state: StoredSessionState
  claimTokens: Record<TeamRole, string>
  observerTokens: Record<TeamRole, string>
  refereeToken: string
  clock: Clock
  tokenFactory: TokenFactory
  tokenHasher: TokenHasher
}

export async function createInitialSessionState(
  request: InternalCreateSessionRequest = {},
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
  const observerTokens: Record<TeamRole, string> = {
    red: tokenFactory('red', 'observer'),
    blue: tokenFactory('blue', 'observer'),
  }
  const claimTokenHashes: Record<TeamRole, string> = {
    red: await tokenHasher(claimTokens.red),
    blue: await tokenHasher(claimTokens.blue),
  }
  const observerTokenHashes: Record<TeamRole, string> = {
    red: await tokenHasher(observerTokens.red),
    blue: await tokenHasher(observerTokens.blue),
  }
  const refereeToken = tokenFactory('referee', 'referee')
  const roles: StoredSessionState['roles'] = {
    red: createInitialRoleState('red', claimTokenHashes.red, observerTokenHashes.red),
    blue: createInitialRoleState('blue', claimTokenHashes.blue, observerTokenHashes.blue),
  }
  const continuationSeed = normalizeContinuationSeed(request.continuationSeed)

  if (continuationSeed) {
    const champion = roles[continuationSeed.championRole]
    const challenger = roles[continuationSeed.challengerRole]

    champion.currentDesign = cloneJson(continuationSeed.sourceSave.championDesign)
    champion.loadoutBuildState = {
      ...createInitialLoadoutBuildState(continuationSeed.championRole),
      currentDesign: cloneJson(continuationSeed.sourceSave.championDesign),
    }
    champion.loadoutVersion = 1
    challenger.gold += continuationSeed.challengerBonusGold
  }

  return {
    clock,
    tokenFactory,
    tokenHasher,
    claimTokens,
    observerTokens,
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
      roles,
      refereeTokenHash: await tokenHasher(refereeToken),
      ...(continuationSeed
        ? {
            sourceChampionSave: cloneJson(continuationSeed.sourceSave),
            continuationSeed: cloneJson(continuationSeed),
            sharedDebrief: cloneJson(continuationSeed.sharedDebrief),
          }
        : {}),
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

function normalizeContinuationSeed(value: unknown): ChampionContinuationSeed | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }

  const seed = value as Partial<ChampionContinuationSeed>

  if (
    !isTeamRole(seed.championRole) ||
    !isTeamRole(seed.challengerRole) ||
    seed.championRole === seed.challengerRole ||
    typeof seed.challengerBonusGold !== 'number' ||
    !Number.isFinite(seed.challengerBonusGold) ||
    seed.challengerBonusGold < 0 ||
    typeof seed.sourceSave !== 'object' ||
    seed.sourceSave === null ||
    typeof seed.sharedDebrief !== 'object' ||
    seed.sharedDebrief === null
  ) {
    return undefined
  }

  const sourceSave = seed.sourceSave as ChampionContinuationSeed['sourceSave']

  if (
    typeof sourceSave.saveId !== 'string' ||
    typeof sourceSave.sourceSessionId !== 'string' ||
    sourceSave.championRole !== seed.championRole ||
    typeof sourceSave.championDesign !== 'object' ||
    sourceSave.championDesign === null
  ) {
    return undefined
  }

  return {
    sourceSave: cloneJson(sourceSave),
    championRole: seed.championRole,
    challengerRole: seed.challengerRole,
    challengerBonusGold: Math.floor(seed.challengerBonusGold),
    sharedDebrief: cloneJson(seed.sharedDebrief as ChampionContinuationSeed['sharedDebrief']),
  }
}
