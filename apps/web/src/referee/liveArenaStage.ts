import type {
  CombatBotSnapshot,
  TeamRole,
  Vector3,
} from '../../../../packages/schemas/src/index.js'
import type {
  LiveCombatFeed,
  PublicCombatBotSnapshot,
  PublicCombatLoadout,
  RolePrivateState,
} from '../agent/agentSessionTypes'
import {
  resolveTeamIdentity,
} from '../shared/teamVisuals'
import type {
  LiveArenaBotState,
  LiveArenaStageState,
} from '../replay/arena/liveArenaFrame'

type RefereeRoleStates = Partial<Record<TeamRole, RolePrivateState>>

const DEFAULT_LIVE_POSITIONS: Record<TeamRole, Vector3> = {
  blue: [6, 0, 0],
  red: [-6, 0, 0],
}

export function createLiveArenaStageState(
  roleStates: RefereeRoleStates,
  liveCombatFeed?: LiveCombatFeed | null,
): LiveArenaStageState | undefined {
  const feedStageState = createLiveArenaStageStateFromFeed(liveCombatFeed)

  if (feedStageState) {
    return feedStageState
  }

  const redLoadout = roleStates.red?.ownLoadout
  const blueLoadout = roleStates.blue?.ownLoadout

  if (!redLoadout || !blueLoadout) {
    return undefined
  }

  return {
    blue: createLiveArenaBotState('blue', blueLoadout, roleStates),
    red: createLiveArenaBotState('red', redLoadout, roleStates),
  }
}

function createLiveArenaStageStateFromFeed(
  liveCombatFeed: LiveCombatFeed | null | undefined,
): LiveArenaStageState | undefined {
  const snapshot = liveCombatFeed?.combat?.snapshot
  const redLoadout = snapshot?.loadouts.red
  const blueLoadout = snapshot?.loadouts.blue

  if (!snapshot || !redLoadout || !blueLoadout) {
    return undefined
  }

  return {
    blue: createLiveArenaBotStateFromFeed('blue', blueLoadout, snapshot.blue),
    red: createLiveArenaBotStateFromFeed('red', redLoadout, snapshot.red),
  }
}

function createLiveArenaBotStateFromFeed(
  role: TeamRole,
  loadout: PublicCombatLoadout,
  combat: PublicCombatBotSnapshot,
): LiveArenaBotState {
  return {
    blueprint: loadout.blueprint,
    health: combat.health,
    identity: resolveTeamIdentity(role, loadout.identity),
    machineDesign: loadout.machineDesign,
    maxHealth: combat.maxHealth,
    partHealth: combat.partHealth,
    position: combat.position,
    statuses: combat.statuses,
  }
}

function createLiveArenaBotState(
  role: TeamRole,
  loadout: NonNullable<RolePrivateState['ownLoadout']>,
  roleStates: RefereeRoleStates,
): LiveArenaBotState {
  const roleState = roleStates[role]
  const opponentRole = role === 'red' ? 'blue' : 'red'
  const opponentRoleState = roleStates[opponentRole]
  const combat = findCombatSnapshot(roleStates, role)

  return {
    blueprint: loadout.blueprint,
    health: combat?.health ?? 1,
    identity: resolveTeamIdentity(role, roleState?.identity ?? opponentRoleState?.opponent.identity),
    machineDesign: loadout.machineDesign,
    maxHealth: combat?.maxHealth ?? 1,
    partHealth: combat?.partHealth ?? {},
    position: combat?.position ?? DEFAULT_LIVE_POSITIONS[role],
    statuses: combat?.statuses ?? [],
  }
}

function findCombatSnapshot(
  roleStates: RefereeRoleStates,
  role: TeamRole,
): CombatBotSnapshot | undefined {
  return roleStates.red?.combat?.snapshot[role]
    ?? roleStates.blue?.combat?.snapshot[role]
}
