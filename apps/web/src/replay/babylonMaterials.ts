import type { Material } from '@babylonjs/core/Materials/material'
import { PBRMetallicRoughnessMaterial } from '@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Scene } from '@babylonjs/core/scene'
import type {
  PartCategory,
  TeamIdentity,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import {
  hexLuminance,
  mixHexColors,
  resolveTeamAccentHex,
} from '../shared/teamVisuals'
import {
  createPbrSurfaceTextures,
  type SurfacePattern,
} from './babylonSurfaceTextures'

export type BotPbrMaterial = PBRMetallicRoughnessMaterial

export type CombatTeamPalette = {
  accent: string
  armor: string
  chassis: string
  glow: string
  rubber: string
  trim: string
  utility: string
  warning: string
  weapon: string
}

export type DamageMaterialSet = {
  critical: BotPbrMaterial
  light: BotPbrMaterial
  medium: BotPbrMaterial
}

export type DamageMaterialTier = keyof DamageMaterialSet

export type TeamMaterialSet = {
  chassis: BotPbrMaterial
  armor: BotPbrMaterial
  mobility: BotPbrMaterial
  weapon: BotPbrMaterial
  utility: BotPbrMaterial
  style: BotPbrMaterial
  circuit: BotPbrMaterial
  damage: DamageMaterialSet
  trim: BotPbrMaterial
  rubber: BotPbrMaterial
  steel: BotPbrMaterial
  light: BotPbrMaterial
  warning: BotPbrMaterial
}

type MaterialRecipe = {
  baseColor: string
  emissive?: string
  metallic: number
  pattern: SurfacePattern
  roughness: number
}

const DAMAGE_MEDIUM_THRESHOLD = 0.34
const DAMAGE_CRITICAL_THRESHOLD = 0.67

export const DEFAULT_TEAM_PALETTES: Record<TeamRole, CombatTeamPalette> = {
  red: {
    accent: '#9f2b27',
    armor: '#7a2926',
    chassis: '#2c3335',
    glow: '#ff4a31',
    rubber: '#171819',
    trim: '#272e30',
    utility: '#596469',
    warning: '#b7822f',
    weapon: '#87908c',
  },
  blue: {
    accent: '#235f9f',
    armor: '#254d78',
    chassis: '#2c3335',
    glow: '#4aa3ff',
    rubber: '#171819',
    trim: '#272e30',
    utility: '#596469',
    warning: '#b7822f',
    weapon: '#87908c',
  },
}

type TeamMaterialOptions = {
  identities?: Partial<Record<TeamRole, TeamIdentity>>
}

export function createTeamMaterials(
  scene: Scene,
  options: TeamMaterialOptions = {},
): Record<TeamRole, TeamMaterialSet> {
  return {
    red: createBotMaterialSet(scene, 'red', createCombatTeamPalette('red', options.identities?.red)),
    blue: createBotMaterialSet(scene, 'blue', createCombatTeamPalette('blue', options.identities?.blue)),
  }
}

export function createCombatTeamPalette(
  role: TeamRole,
  identity: TeamIdentity | null | undefined,
): CombatTeamPalette {
  const base = DEFAULT_TEAM_PALETTES[role]
  const accent = resolveTeamAccentHex(role, identity)
  const isDarkAccent = hexLuminance(accent) < 0.18

  return {
    ...base,
    accent,
    armor: mixHexColors(accent, isDarkAccent ? '#77848b' : '#20262b', isDarkAccent ? 0.46 : 0.26),
    glow: mixHexColors(accent, '#ffffff', isDarkAccent ? 0.62 : 0.18),
    trim: mixHexColors(base.trim, accent, 0.05),
    utility: mixHexColors(base.utility, accent, isDarkAccent ? 0.12 : 0.08),
    weapon: mixHexColors(base.weapon, accent, isDarkAccent ? 0.08 : 0.05),
  }
}

export function createBotMaterialSet(
  scene: Scene,
  materialPrefix: string,
  palette: CombatTeamPalette,
): TeamMaterialSet {
  return {
    chassis: createCombatMaterial(scene, `${materialPrefix}-chassis`, {
      baseColor: palette.chassis,
      metallic: 0.42,
      pattern: 'panel',
      roughness: 0.66,
    }),
    armor: createCombatMaterial(scene, `${materialPrefix}-armor`, {
      baseColor: palette.armor,
      metallic: 0.48,
      pattern: 'armor',
      roughness: 0.62,
    }),
    mobility: createCombatMaterial(scene, `${materialPrefix}-mobility`, {
      baseColor: mixHexColors(palette.chassis, '#3a4144', 0.45),
      metallic: 0.55,
      pattern: 'mobility',
      roughness: 0.68,
    }),
    weapon: createCombatMaterial(scene, `${materialPrefix}-weapon`, {
      baseColor: palette.weapon,
      metallic: 0.66,
      pattern: 'weapon',
      roughness: 0.54,
    }),
    utility: createCombatMaterial(scene, `${materialPrefix}-utility`, {
      baseColor: palette.utility,
      metallic: 0.64,
      pattern: 'utility',
      roughness: 0.54,
    }),
    style: createCombatMaterial(scene, `${materialPrefix}-style`, {
      baseColor: palette.accent,
      metallic: 0.56,
      pattern: 'style',
      roughness: 0.48,
    }),
    circuit: createPlainCombatMaterial(scene, `${materialPrefix}-circuit`, {
      baseColor: '#1f5c43',
      emissive: '#1b4a39',
      metallic: 0.28,
      roughness: 0.52,
    }),
    damage: createDamageMaterialSet(scene, materialPrefix, palette),
    trim: createCombatMaterial(scene, `${materialPrefix}-trim`, {
      baseColor: palette.trim,
      metallic: 0.46,
      pattern: 'trim',
      roughness: 0.68,
    }),
    rubber: createCombatMaterial(scene, `${materialPrefix}-rubber`, {
      baseColor: palette.rubber,
      metallic: 0,
      pattern: 'rubber',
      roughness: 0.9,
    }),
    steel: createCombatMaterial(scene, `${materialPrefix}-steel`, {
      baseColor: '#b7c0bc',
      metallic: 0.78,
      pattern: 'weapon',
      roughness: 0.36,
    }),
    light: createCombatMaterial(scene, `${materialPrefix}-light`, {
      baseColor: palette.glow,
      emissive: palette.glow,
      metallic: 0.2,
      pattern: 'light',
      roughness: 0.28,
    }),
    warning: createCombatMaterial(scene, `${materialPrefix}-warning`, {
      baseColor: palette.warning,
      emissive: '#1d1003',
      metallic: 0.72,
      pattern: 'warning',
      roughness: 0.47,
    }),
  }
}

export function materialForCategory(
  materials: TeamMaterialSet,
  category: PartCategory,
): Material {
  if (category === 'defense') {
    return materials.armor
  }

  if (category === 'mobility') {
    return materials.mobility
  }

  if (category === 'weapon') {
    return materials.weapon
  }

  if (category === 'utility') {
    return materials.utility
  }

  if (category === 'style') {
    return materials.style
  }

  return materials.chassis
}

export function damageMaterialForSeverity(
  materials: DamageMaterialSet,
  severity: number,
): BotPbrMaterial | null {
  if (severity <= 0) {
    return null
  }

  return materials[damageTierForSeverity(severity)]
}

export function damageTierForSeverity(severity: number): DamageMaterialTier {
  if (severity >= DAMAGE_CRITICAL_THRESHOLD) {
    return 'critical'
  }

  if (severity >= DAMAGE_MEDIUM_THRESHOLD) {
    return 'medium'
  }

  return 'light'
}

function createDamageMaterialSet(
  scene: Scene,
  materialPrefix: string,
  palette: CombatTeamPalette,
): DamageMaterialSet {
  return {
    light: createCombatMaterial(scene, `${materialPrefix}-damage-light`, {
      baseColor: mixHexColors(palette.armor, '#5b4a3f', 0.36),
      metallic: 0.5,
      pattern: 'damage_light',
      roughness: 0.62,
    }),
    medium: createCombatMaterial(scene, `${materialPrefix}-damage-medium`, {
      baseColor: mixHexColors(palette.armor, '#40332d', 0.58),
      emissive: '#120604',
      metallic: 0.52,
      pattern: 'damage_medium',
      roughness: 0.72,
    }),
    critical: createCombatMaterial(scene, `${materialPrefix}-damage-critical`, {
      baseColor: mixHexColors(palette.armor, '#211d1b', 0.76),
      emissive: '#351007',
      metallic: 0.54,
      pattern: 'damage_critical',
      roughness: 0.84,
    }),
  }
}

function createCombatMaterial(
  scene: Scene,
  name: string,
  recipe: MaterialRecipe,
): BotPbrMaterial {
  const material = new PBRMetallicRoughnessMaterial(name, scene)
  const textures = createPbrSurfaceTextures(scene, name, recipe)

  material.baseColor = Color3.FromHexString(recipe.baseColor)
  material.baseTexture = textures.baseTexture
  material.metallic = recipe.metallic
  material.roughness = recipe.roughness
  material.metallicRoughnessTexture = textures.metallicRoughnessTexture
  material.occlusionTexture = textures.occlusionTexture
  material.occlusionStrength = recipe.pattern === 'rubber' ? 0.42 : 0.68
  material.normalTexture = textures.normalTexture
  material.emissiveColor = Color3.FromHexString(recipe.emissive ?? '#000000')
  material.maxSimultaneousLights = 6

  if (recipe.pattern === 'light') {
    material.roughness = 0.22
  }

  return material
}

function createPlainCombatMaterial(
  scene: Scene,
  name: string,
  recipe: Omit<MaterialRecipe, 'pattern'>,
): BotPbrMaterial {
  const material = new PBRMetallicRoughnessMaterial(name, scene)

  material.baseColor = Color3.FromHexString(recipe.baseColor)
  material.emissiveColor = Color3.FromHexString(recipe.emissive ?? '#000000')
  material.metallic = recipe.metallic
  material.roughness = recipe.roughness
  material.maxSimultaneousLights = 6

  return material
}
