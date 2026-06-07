import type {
  BotBlueprint,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import {
  hexLuminance,
  type LegacyTeamIdentity,
  mixHexColors,
  resolveTeamAccentHex,
} from '../shared/teamVisuals'

export type PrimaryWeaponVisual = 'net' | 'turret' | 'spinner' | 'hammer' | 'melee' | 'generic'

export type BotEffectPalette = {
  accent: string
  glow: string
  hot: string
  soft: string
}

export type BotVisualProfile = {
  effectPalette: BotEffectPalette
  primaryWeapon: PrimaryWeaponVisual
  hasBooster: boolean
  hasMagnet: boolean
  hasSmoke: boolean
}

export type ReplayBotBlueprints = Record<TeamRole, BotBlueprint>

type BotVisualProfileOptions = {
  identities?: Partial<Record<TeamRole, LegacyTeamIdentity>>
}

export const DEFAULT_BOT_EFFECT_PALETTES: Record<TeamRole, BotEffectPalette> = {
  red: createBotEffectPalette('red'),
  blue: createBotEffectPalette('blue'),
}

export function createBotVisualProfiles(
  botBlueprints: ReplayBotBlueprints,
  options: BotVisualProfileOptions = {},
): Record<TeamRole, BotVisualProfile> {
  return {
    red: createBotVisualProfile(botBlueprints.red, 'red', options.identities?.red),
    blue: createBotVisualProfile(botBlueprints.blue, 'blue', options.identities?.blue),
  }
}

export function createBotVisualProfile(
  blueprint: BotBlueprint,
  role: TeamRole = 'red',
  identity?: LegacyTeamIdentity,
): BotVisualProfile {
  const partIds = blueprint.blocks.map((block) => block.partId)
  const primaryWeapon = partIds.find((partId) => partId.startsWith('Weapon_'))

  return {
    effectPalette: createBotEffectPalette(role, identity),
    primaryWeapon: classifyWeaponVisual(primaryWeapon),
    hasBooster: partIds.some((partId) => partId.includes('Booster')),
    hasMagnet: partIds.some((partId) => partId.includes('Magnet')),
    hasSmoke: partIds.some((partId) => partId.includes('Smoke')),
  }
}

function createBotEffectPalette(
  role: TeamRole,
  identity?: LegacyTeamIdentity,
): BotEffectPalette {
  const accent = resolveTeamAccentHex(role, identity)
  const darkAccent = hexLuminance(accent) < 0.18

  return {
    accent,
    glow: mixHexColors(accent, '#ffffff', darkAccent ? 0.62 : 0.2),
    hot: mixHexColors(accent, '#ffe2a3', darkAccent ? 0.54 : 0.32),
    soft: mixHexColors(accent, '#91b6c6', darkAccent ? 0.46 : 0.28),
  }
}

export function classifyWeaponVisual(partId: string | undefined): PrimaryWeaponVisual {
  if (!partId) {
    return 'generic'
  }

  if (partId.includes('Net')) {
    return 'net'
  }

  if (partId.includes('Turret')) {
    return 'turret'
  }

  if (partId.includes('Spinner') || partId.includes('Saw')) {
    return 'spinner'
  }

  if (partId.includes('Hammer')) {
    return 'hammer'
  }

  if (partId.includes('Flipper') || partId.includes('Grabber') || partId.includes('Ram') || partId.includes('Spear')) {
    return 'melee'
  }

  return 'generic'
}
