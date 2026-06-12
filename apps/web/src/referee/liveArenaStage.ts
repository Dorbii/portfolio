import type {
  CombatBotSnapshot,
  TeamRole,
  Vector3,
} from '../../../../packages/schemas/src/index.js'
import type { RolePrivateState } from '../agent/agentSessionTypes'
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
): LiveArenaStageState | undefined {
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
