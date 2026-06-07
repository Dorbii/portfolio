import type {
  ArenaConfig,
  BotBlueprint,
  GameMasterPacket,
  TeamRole,
} from '../../../packages/schemas/src/index.js'
import type { LegacyTeamIdentity } from './shared/teamVisuals'
import type {
  PublicSessionState,
  RolePrivateState,
} from './agent/agentSessionTypes.js'

export type TeamEconomySnapshot = {
  role: TeamRole
  gold: number
  wins: number
  streak: number
  damage: number
  baseIncome: number
  interestPreview: number
}

export const arenaConfig: ArenaConfig = {
  name: 'Foundry Box',
  width: 26,
  height: 18,
  activeHazards: ['center saw', 'corner flippers'],
}

export const mockTeamEconomy: Record<TeamRole, TeamEconomySnapshot> = {
  red: {
    role: 'red',
    gold: 68,
    wins: 2,
    streak: 0,
    damage: 64,
    baseIncome: 50,
    interestPreview: 6,
  },
  blue: {
    role: 'blue',
    gold: 92,
    wins: 1,
    streak: 1,
    damage: 31,
    baseIncome: 50,
    interestPreview: 9,
  },
}

export const mockTeamIdentities: Record<TeamRole, LegacyTeamIdentity> = {
  red: {
    name: 'Crimson Circuit',
    primaryColor: '#ff5b66',
    logo: { mark: 'bolt', initials: 'CC' },
  },
  blue: {
    name: 'Ion Net',
    primaryColor: '#5b9dff',
    logo: { mark: 'crosshair', initials: 'IN' },
  },
}

const eventLog = [
  {
    at: '14:03',
    type: 'session_created' as const,
    message: 'Session s_mock_7f2 created with seed aa-2042.',
  },
  {
    at: '14:07',
    type: 'role_claimed' as const,
    message: 'Red and Blue roles are claimed.',
  },
  {
    at: '14:14',
    type: 'game_action_submitted' as const,
    message: 'Both loadouts locked for round 3.',
  },
  {
    at: '14:15',
    type: 'combat_resolved' as const,
    message: 'Combat resolved. Replay and round review are ready.',
  },
]

const chatLog = [
  {
    id: 's_mock_7f2:chat:1',
    at: '14:16',
    round: 3,
    phase: 'round_review' as const,
    role: 'blue' as const,
    agentName: 'blue-agent',
    kind: 'strategy' as const,
    message: 'Net control worked that round; expect distance again unless you force contact.',
  },
]

const privateChatLogByRole = {
  red: [
    {
      id: 's_mock_7f2:red:private-chat:1',
      at: '14:17',
      round: 3,
      phase: 'round_review' as const,
      role: 'red' as const,
      agentName: 'red-agent',
      kind: 'strategy' as const,
      message: 'Spinner traded damage but could not steer out of the trap; buy drive control next.',
    },
  ],
  blue: [
    {
      id: 's_mock_7f2:blue:private-chat:1',
      at: '14:17',
      round: 3,
      phase: 'round_review' as const,
      role: 'blue' as const,
      agentName: 'blue-agent',
      kind: 'reflection' as const,
      message: 'Net control created the win condition; keep distance and add durability.',
    },
  ],
}

const mockGameMasterPackets: Record<TeamRole, GameMasterPacket> = {
  red: {
    sessionId: 's_mock_7f2',
    role: 'red',
    phase: 'round_review',
    nextAction: 'view_replay',
    round: 3,
    fightId: 'fight_3',
    decisionVersion: 7,
    eventVersion: 4,
    instruction: 'Review the resolved fight. Submit no gameplay action until the next packet asks for one.',
    board: {
      arena: arenaConfig,
    },
    legalActions: [],
  },
  blue: {
    sessionId: 's_mock_7f2',
    role: 'blue',
    phase: 'round_review',
    nextAction: 'view_replay',
    round: 3,
    fightId: 'fight_3',
    decisionVersion: 7,
    eventVersion: 4,
    instruction: 'Review the resolved fight. Submit no gameplay action until the next packet asks for one.',
    board: {
      arena: arenaConfig,
    },
    legalActions: [],
  },
}

export const mockPublicSession: PublicSessionState = {
  sessionId: 's_mock_7f2',
  stateVersion: 'mock|round_review|3|red-submitted|blue-submitted|4',
  phase: 'round_review',
  round: 3,
  maxRounds: 7,
  expiresAt: '2026-06-03T20:00:00.000Z',
  arena: arenaConfig,
  roles: {
    red: {
      role: 'red',
      identity: mockTeamIdentities.red,
      claimed: true,
      submitted: true,
    },
    blue: {
      role: 'blue',
      identity: mockTeamIdentities.blue,
      claimed: true,
      submitted: true,
    },
  },
  replayAvailable: true,
  lastResult: {
    winner: 'blue',
    reason: 'Red drive disabled after rail trap',
    damage: {
      red: 64,
      blue: 31,
    },
    remainingHealth: {
      red: 0,
      blue: 46,
    },
  },
  continuation: {
    completedFightCount: 1,
  },
  chatLog,
  eventLog,
}

export const mockRoleStates: Record<TeamRole, RolePrivateState> = {
  red: {
    sessionId: mockPublicSession.sessionId,
    stateVersion: mockPublicSession.stateVersion,
    role: 'red',
    identity: mockTeamIdentities.red,
    phase: mockPublicSession.phase,
    round: mockPublicSession.round,
    expiresAt: mockPublicSession.expiresAt,
    gold: 68,
    inventory: [
      { partId: 'Body_Square_Medium', quantity: 1 },
      { partId: 'Wheel_Large', quantity: 2 },
      { partId: 'Weapon_Spinner_Large', quantity: 1 },
      { partId: 'Armor_Front_Plate', quantity: 2 },
      { partId: 'Style_Neon', quantity: 1 },
    ],
    controls: {
      movement: [
        'forward',
        'backward',
        'dash_forward',
        'dash_backward',
        'strafe_left',
        'strafe_right',
        'circle_left',
        'circle_right',
        'turn_left',
        'turn_right',
        'brake',
      ],
      weaponA: ['fire', 'hold'],
      utility: ['activate', 'hold'],
    },
    submitted: true,
    ownLoadout: {
      confirmedAt: '14:14',
      blueprint: {
        name: 'Blackout Wedge',
        blocks: [
          {
            id: 'core',
            partId: 'Body_Square_Medium',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
          },
          {
            id: 'spinner',
            partId: 'Weapon_Spinner_Large',
            position: [0, 0, -2],
            rotation: [0, 0, 0],
          },
          {
            id: 'front-plate',
            partId: 'Armor_Front_Plate',
            position: [0, 0, -1],
            rotation: [0, 0, 0],
          },
          {
            id: 'left-wheel',
            partId: 'Wheel_Large',
            position: [-2, 0, 0],
            rotation: [0, 0, 0],
          },
          {
            id: 'right-wheel',
            partId: 'Wheel_Large',
            position: [2, 0, 0],
            rotation: [0, 0, 0],
          },
          {
            id: 'neon',
            partId: 'Style_Neon',
            position: [0, 1, 0],
            rotation: [0, 0, 0],
          },
        ],
      },
    },
    opponent: mockPublicSession.roles.blue,
    gameMaster: mockGameMasterPackets.red,
    replayAvailable: mockPublicSession.replayAvailable,
    lastResult: mockPublicSession.lastResult,
    chatLog,
    privateChatLog: privateChatLogByRole.red,
    eventLog,
  },
  blue: {
    sessionId: mockPublicSession.sessionId,
    stateVersion: mockPublicSession.stateVersion,
    role: 'blue',
    identity: mockTeamIdentities.blue,
    phase: mockPublicSession.phase,
    round: mockPublicSession.round,
    expiresAt: mockPublicSession.expiresAt,
    gold: 92,
    inventory: [
      { partId: 'Body_Rectangle_Long', quantity: 1 },
      { partId: 'Wheel_Omni', quantity: 4 },
      { partId: 'Weapon_Net', quantity: 1 },
      { partId: 'Utility_Magnet', quantity: 1 },
      { partId: 'Utility_Sensor', quantity: 1 },
      { partId: 'Armor_Light', quantity: 2 },
    ],
    controls: {
      movement: [
        'forward',
        'backward',
        'dash_forward',
        'dash_backward',
        'strafe_left',
        'strafe_right',
        'circle_left',
        'circle_right',
        'turn_left',
        'turn_right',
        'brake',
      ],
      weaponA: ['fire', 'hold'],
      utility: ['activate', 'hold'],
    },
    submitted: true,
    ownLoadout: {
      confirmedAt: '14:14',
      blueprint: {
        name: 'Snare Account',
        blocks: [
          {
            id: 'core',
            partId: 'Body_Rectangle_Long',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
          },
          {
            id: 'net',
            partId: 'Weapon_Net',
            position: [0, 1, -1],
            rotation: [0, 0, 0],
          },
          {
            id: 'magnet',
            partId: 'Utility_Magnet',
            position: [0, 0, 1],
            rotation: [0, 0, 0],
          },
          {
            id: 'sensor',
            partId: 'Utility_Sensor',
            position: [1, 1, 1],
            rotation: [0, 0, 0],
          },
          {
            id: 'booster',
            partId: 'Utility_Booster',
            position: [0, 0, 2],
            rotation: [0, 180, 0],
          },
          {
            id: 'left-wheel',
            partId: 'Wheel_Omni',
            position: [-2, 0, 0],
            rotation: [0, 0, 0],
          },
          {
            id: 'right-wheel',
            partId: 'Wheel_Omni',
            position: [2, 0, 0],
            rotation: [0, 0, 0],
          },
        ],
      },
    },
    opponent: mockPublicSession.roles.red,
    gameMaster: mockGameMasterPackets.blue,
    replayAvailable: mockPublicSession.replayAvailable,
    lastResult: mockPublicSession.lastResult,
    chatLog,
    privateChatLog: privateChatLogByRole.blue,
    eventLog,
  },
}

export const mockBotBlueprints: Record<TeamRole, BotBlueprint> = {
  red: mockRoleStates.red.ownLoadout!.blueprint,
  blue: mockRoleStates.blue.ownLoadout!.blueprint,
}
