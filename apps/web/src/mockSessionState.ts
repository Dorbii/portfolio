import type {
  ArenaConfig,
  BotBlueprint,
  TeamRole,
} from '../../../packages/schemas/src/index.js'
import type { LegacyTeamIdentity } from './shared/teamVisuals'

export const arenaConfig: ArenaConfig = {
  name: 'Foundry Box',
  width: 26,
  height: 18,
  activeHazards: ['center saw', 'corner flippers'],
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

const redBotBlueprint: BotBlueprint = {
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
}

const blueBotBlueprint: BotBlueprint = {
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
}

export const mockBotBlueprints: Record<TeamRole, BotBlueprint> = {
  red: redBotBlueprint,
  blue: blueBotBlueprint,
}

export const stress64BotBlueprints: Record<TeamRole, BotBlueprint> = {
  red: {
    name: 'Crimson Stress Turret',
    blocks: [
      {
        id: 'core',
        partId: 'Body_Square_Medium',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
      {
        id: 'red-stress-08',
        partId: 'Weapon_Turret',
        position: [0, 1, 2],
        rotation: [0, 0, 0],
      },
    ],
  },
  blue: {
    name: 'Ion Stress Turret',
    blocks: [
      {
        id: 'core',
        partId: 'Body_Square_Medium',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
      {
        id: 'blue-stress-08',
        partId: 'Weapon_Turret',
        position: [0, 1, 2],
        rotation: [0, 0, 0],
      },
    ],
  },
}
