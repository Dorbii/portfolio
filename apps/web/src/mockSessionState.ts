import type {
  ArenaConfig,
  BotBlueprint,
  PublicSessionState,
  RolePrivateState,
  TeamRole,
} from '../../../packages/schemas/src/index.js'

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
    type: 'round_plan_submitted' as const,
    message: 'Both round plans locked for round 3.',
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
    kind: 'reflection' as const,
    message: 'Net control worked; next round should keep distance and add armor.',
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
      claimed: true,
      submitted: true,
    },
    blue: {
      role: 'blue',
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
  chatLog,
  eventLog,
}

export const mockRoleStates: Record<TeamRole, RolePrivateState> = {
  red: {
    sessionId: mockPublicSession.sessionId,
    stateVersion: mockPublicSession.stateVersion,
    role: 'red',
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
    ownSubmission: {
      action: 'submit_round_plan',
      schemaVersion: 2,
      purchases: [
        { partId: 'Armor_Front_Plate', quantity: 1 },
        { partId: 'Style_Neon', quantity: 1 },
      ],
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
            id: 'left-tread',
            partId: 'Tread_Heavy',
            position: [-2, 0, 0],
            rotation: [0, 0, 0],
          },
          {
            id: 'right-tread',
            partId: 'Tread_Heavy',
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
        rationale: 'Protect the spinner long enough to trade once.',
      },
      tactics: {
        style: 'aggressive',
        targetPriority: 'closest',
        preferredRange: 'close',
        movementPolicy: 'close',
        aggression: 0.8,
        retreatAtHealthPct: 0.18,
        weaponCadence: 'opportunistic',
        hazardPreference: 'avoid',
      },
      openingScript: {
        commands: [
          { tick: 1, move: 'dash_forward', weaponA: 'hold' },
          { tick: 2, move: 'circle_right', weaponA: 'fire' },
          { tick: 3, move: 'strafe_left', weaponA: 'hold' },
          { tick: 4, move: 'forward', weaponA: 'fire' },
          { tick: 5, move: 'brake', weaponA: 'hold' },
        ],
      },
      rationale: 'Force a direct exchange before Blue can kite.',
    },
    opponent: mockPublicSession.roles.blue,
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
    ownSubmission: {
      action: 'submit_round_plan',
      schemaVersion: 2,
      purchases: [
        { partId: 'Weapon_Net', quantity: 1 },
        { partId: 'Utility_Magnet', quantity: 1 },
        { partId: 'Utility_Sensor', quantity: 1 },
      ],
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
        rationale: 'Keep distance, fire net, then push disabled drive.',
      },
      tactics: {
        style: 'control',
        targetPriority: 'mobility',
        preferredRange: 'mid',
        movementPolicy: 'kite',
        aggression: 0.58,
        retreatAtHealthPct: 0.25,
        weaponCadence: 'opportunistic',
        hazardPreference: 'force',
      },
      openingScript: {
        commands: [
          { tick: 1, move: 'dash_forward', weaponA: 'hold' },
          { tick: 2, move: 'circle_left', weaponA: 'hold' },
          { tick: 3, move: 'strafe_right', weaponA: 'fire' },
          { tick: 4, move: 'dash_backward', utility: 'activate' },
          { tick: 5, move: 'circle_right', weaponA: 'fire' },
        ],
      },
      rationale: 'Run the lane, fire while sliding, and retreat before the spinner gets a clean trade.',
    },
    opponent: mockPublicSession.roles.red,
    replayAvailable: mockPublicSession.replayAvailable,
    lastResult: mockPublicSession.lastResult,
    chatLog,
    privateChatLog: privateChatLogByRole.blue,
    eventLog,
  },
}

export const mockBotBlueprints: Record<TeamRole, BotBlueprint> = {
  red: mockRoleStates.red.ownSubmission!.blueprint,
  blue: mockRoleStates.blue.ownSubmission!.blueprint,
}
