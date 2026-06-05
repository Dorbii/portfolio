import type {
  BotBlueprint,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'

export type PrimaryWeaponVisual = 'net' | 'turret' | 'spinner' | 'hammer' | 'melee' | 'generic'

export type BotVisualProfile = {
  primaryWeapon: PrimaryWeaponVisual
  hasBooster: boolean
  hasMagnet: boolean
  hasSmoke: boolean
}

export type ReplayBotBlueprints = Record<TeamRole, BotBlueprint>

export function createBotVisualProfiles(
  botBlueprints: ReplayBotBlueprints,
): Record<TeamRole, BotVisualProfile> {
  return {
    red: createBotVisualProfile(botBlueprints.red),
    blue: createBotVisualProfile(botBlueprints.blue),
  }
}

export function createBotVisualProfile(blueprint: BotBlueprint): BotVisualProfile {
  const partIds = blueprint.blocks.map((block) => block.partId)
  const primaryWeapon = partIds.find((partId) => partId.startsWith('Weapon_'))

  return {
    primaryWeapon: classifyWeaponVisual(primaryWeapon),
    hasBooster: partIds.some((partId) => partId.includes('Booster')),
    hasMagnet: partIds.some((partId) => partId.includes('Magnet')),
    hasSmoke: partIds.some((partId) => partId.includes('Smoke')),
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
