import { PART_CATALOG } from '../../../packages/catalog/src/index.js'
import { createReplayTimeline, type ReplayTimeline } from '../../../packages/replay/src/index.js'
import type {
  ArenaConfig,
  BotBlueprint,
  PublicSessionState,
  RolePrivateState,
  TeamRole,
} from '../../../packages/schemas/src/index.js'

export type AwardOption = {
  id: string
  title: string
  gold: number
  description: string
  suggestedTeam: TeamRole
}

export const arenaConfig: ArenaConfig = {
  name: 'Foundry Box',
  width: 26,
  height: 18,
  activeHazards: ['center saw', 'corner flippers'],
}

export const mockAwards: AwardOption[] = [
  {
    id: 'style-blackout',
    title: 'Most Stylish',
    gold: 25,
    description: 'Readable silhouette, unnecessary neon, still survived.',
    suggestedTeam: 'red',
  },
  {
    id: 'counter-net',
    title: 'Best Counterbuild',
    gold: 25,
    description: 'Net timing forced a spinner to waste two weapon windows.',
    suggestedTeam: 'blue',
  },
  {
    id: 'budget-clean',
    title: 'Budget Genius',
    gold: 20,
    description: 'Banked gold without entering the round underbuilt.',
    suggestedTeam: 'red',
  },
]

export const mockReplay: ReplayTimeline = createReplayTimeline({
  round: 3,
  duration: 24,
  summary: 'Blue wins by disable after trapping Red against the west rail.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [-8, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [8, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 3,
      type: 'move',
      bot: 'blue',
      from: [8, 0, 0],
      to: [3, 0, -2],
    },
    {
      t: 7,
      type: 'weapon_fire',
      bot: 'red',
      weaponSlot: 'weaponA',
    },
    {
      t: 10,
      type: 'impact',
      attacker: 'blue',
      defender: 'red',
      damage: 18,
      position: [-2, 0, -4],
    },
    {
      t: 13,
      type: 'hazard',
      hazard: 'center saw',
      bot: 'red',
      damage: 10,
      position: [-3, 0, -3],
    },
    {
      t: 16,
      type: 'damage',
      bot: 'red',
      amount: 16,
      remainingHealth: 22,
    },
    {
      t: 22,
      type: 'knockout',
      bot: 'red',
      cause: 'drive disabled',
    },
  ],
})

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
    message: 'Combat resolved. Replay and referee awards are ready.',
  },
]

export const mockPublicSession: PublicSessionState = {
  sessionId: 's_mock_7f2',
  phase: 'referee_awards',
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
  eventLog,
}

export const mockRoleStates: Record<TeamRole, RolePrivateState> = {
  red: {
    sessionId: mockPublicSession.sessionId,
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
      movement: ['forward', 'backward', 'turn_left', 'turn_right', 'brake'],
      weaponA: ['fire', 'hold'],
      utility: ['activate', 'hold'],
    },
    submitted: true,
    ownSubmission: {
      action: 'submit_round_plan',
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
            position: [1, 0, 0],
            rotation: [0, 0, 0],
          },
        ],
        rationale: 'Protect the spinner long enough to trade once.',
      },
      turnPlan: {
        commands: [
          { tick: 1, move: 'forward', weaponA: 'hold' },
          { tick: 2, move: 'forward', weaponA: 'fire' },
          { tick: 3, move: 'turn_right', weaponA: 'hold' },
          { tick: 4, move: 'forward', weaponA: 'fire' },
          { tick: 5, move: 'brake', weaponA: 'hold' },
        ],
      },
      rationale: 'Force a direct exchange before Blue can kite.',
    },
    opponent: mockPublicSession.roles.blue,
    replayAvailable: mockPublicSession.replayAvailable,
    lastResult: mockPublicSession.lastResult,
    eventLog,
  },
  blue: {
    sessionId: mockPublicSession.sessionId,
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
      { partId: 'Armor_Light', quantity: 2 },
    ],
    controls: {
      movement: ['forward', 'backward', 'turn_left', 'turn_right', 'brake'],
      weaponA: ['fire', 'hold'],
      utility: ['activate', 'hold'],
    },
    submitted: true,
    ownSubmission: {
      action: 'submit_round_plan',
      purchases: [
        { partId: 'Weapon_Net', quantity: 1 },
        { partId: 'Utility_Magnet', quantity: 1 },
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
            position: [0, 0, 1],
            rotation: [0, 0, 0],
          },
        ],
        rationale: 'Keep distance, fire net, then push disabled drive.',
      },
      turnPlan: {
        commands: [
          { tick: 1, move: 'forward', weaponA: 'hold' },
          { tick: 2, move: 'turn_left', weaponA: 'hold' },
          { tick: 3, move: 'forward', weaponA: 'fire' },
          { tick: 4, move: 'forward', utility: 'activate' },
          { tick: 5, move: 'brake', weaponA: 'hold' },
        ],
      },
      rationale: 'Avoid the spinner until the net lands.',
    },
    opponent: mockPublicSession.roles.red,
    replayAvailable: mockPublicSession.replayAvailable,
    lastResult: mockPublicSession.lastResult,
    eventLog,
  },
}

export const visibleCatalogParts = PART_CATALOG

export const mockBotBlueprints: Record<TeamRole, BotBlueprint> = {
  red: mockRoleStates.red.ownSubmission!.blueprint,
  blue: mockRoleStates.blue.ownSubmission!.blueprint,
}
