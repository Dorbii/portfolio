import type {
  ChampionContinuationSeed,
  StoredDesign,
  TeamRole,
} from '../../../packages/schemas/src/index.js'
import {
  createInitialLoadoutBuildState,
  createInitialMachineDesign,
} from '../../../packages/sim/src/index.js'
import {
  cloneJson,
  DEFAULT_STARTING_GOLD,
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

  if (state.phase !== 'waiting_for_agents' && state.phase !== 'submission_phase') {
    return relayError(
      'PHASE_CLOSED',
      `${role.role} can be reset only before combat opens.`,
    )
  }

  const claimToken = tokenFactory(roleName, 'claim')
  const observerToken = tokenFactory(roleName, 'observer')
  const seededGold = DEFAULT_STARTING_GOLD +
    (state.continuationSeed?.challengerRole === roleName
      ? state.continuationSeed.challengerBonusGold
      : 0)

  role.claimTokenHash = await tokenHasher(claimToken)
  role.observerTokenHash = await tokenHasher(observerToken)
  role.roleTokenHash = undefined
  role.agentName = undefined
  role.teamIdentity = undefined
  role.claimedAt = undefined
  role.gold = seededGold
  role.inventory = []
  role.controls = undefined
  role.storedDesign = createStoredMachineDesign(roleName)
  role.currentDesign = undefined
  role.loadoutBuildState = undefined
  role.loadoutVersion = undefined
  role.loadoutConfirmedAt = undefined
  role.privateChatLog = []

  if (state.continuationSeed?.championRole === roleName) {
    role.storedDesign = createStoredLegacyDesign(state.continuationSeed.sourceSave.championDesign)
    role.currentDesign = cloneJson(state.continuationSeed.sourceSave.championDesign)
    role.loadoutBuildState = createLegacyLoadoutBuildState(
      roleName,
      state.continuationSeed.sourceSave.championDesign,
    )
    role.loadoutVersion = 1
  }

  return {
    ok: true,
    value: { claimToken, observerToken },
  }
}

function createStoredMachineDesign(role: TeamRole): StoredDesign {
  return {
    version: 'machine:v1',
    machine: createInitialMachineDesign(role),
  }
}

function createStoredLegacyDesign(
  design: ChampionContinuationSeed['sourceSave']['championDesign'],
): StoredDesign {
  return {
    version: 'legacy-bot-design:v1',
    design: cloneJson(design),
  }
}

function createLegacyLoadoutBuildState(
  role: TeamRole,
  design: ChampionContinuationSeed['sourceSave']['championDesign'],
) {
  const legacyDesign = cloneJson(design)

  return {
    ...createInitialLoadoutBuildState(role),
    currentDesign: {
      version: 'legacy-bot-design:v1' as const,
      design: cloneJson(legacyDesign),
    },
    legacyDraft: legacyDesign,
  }
}
