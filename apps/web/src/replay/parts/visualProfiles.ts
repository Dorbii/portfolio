import {
  getPart,
} from '../../../../../packages/catalog/src/index.js'
import type {
  PartDefinition,
  PartMaterialRole,
  PartVisualQualityStatus,
} from '../../../../../packages/schemas/src/index.js'

export const PART_TEXTURE_PROFILES = [
  'painted_chipped_armor',
  'brushed_weapon_steel',
  'scuffed_rubber',
  'dirty_electrical_casing',
  'emissive_led_glass',
  'burnt_critical_metal',
  'scraped_style_shell',
] as const

export type PartTextureProfileId = (typeof PART_TEXTURE_PROFILES)[number]
export type PartDamageProfileId = PartTextureProfileId

export const DEFAULT_RENDER_PROFILE = 'body_body_v1'
export const DEFAULT_TEXTURE_PROFILE: PartTextureProfileId = 'painted_chipped_armor'
export const DEFAULT_DAMAGE_PROFILE: PartDamageProfileId = 'painted_chipped_armor'
export const DEFAULT_ANIMATION_PROFILE = 'none'

export type ResolvedPartVisualProfile = {
  part?: PartDefinition
  renderProfile: string
  textureProfile: PartTextureProfileId
  damageProfile: PartDamageProfileId
  animationProfile: string
  referenceIds: string[]
  qualityStatus: PartVisualQualityStatus
}

const TEXTURE_PROFILE_BY_MATERIAL_ROLE: Record<PartMaterialRole, PartTextureProfileId> = {
  black_rubber: 'scuffed_rubber',
  cosmetic_shell: 'scraped_style_shell',
  electrical_casing: 'dirty_electrical_casing',
  glass_emissive: 'emissive_led_glass',
  hazard_marked: 'painted_chipped_armor',
  painted_armor: 'painted_chipped_armor',
  raw_metal: 'brushed_weapon_steel',
  weapon_steel: 'brushed_weapon_steel',
}

const DAMAGE_PROFILE_BY_MATERIAL_ROLE: Record<PartMaterialRole, PartDamageProfileId> = {
  black_rubber: 'scuffed_rubber',
  cosmetic_shell: 'scraped_style_shell',
  electrical_casing: 'dirty_electrical_casing',
  glass_emissive: 'emissive_led_glass',
  hazard_marked: 'burnt_critical_metal',
  painted_armor: 'painted_chipped_armor',
  raw_metal: 'burnt_critical_metal',
  weapon_steel: 'brushed_weapon_steel',
}

const PART_TEXTURE_PROFILE_SET = new Set<string>(PART_TEXTURE_PROFILES)

export function resolvePartVisualProfile(partOrId: PartDefinition | string | undefined): ResolvedPartVisualProfile {
  const part = typeof partOrId === 'string'
    ? getPart(partOrId)
    : partOrId
  const visual = part?.visual

  return {
    part,
    renderProfile: visual?.renderProfile ?? DEFAULT_RENDER_PROFILE,
    textureProfile: resolvePartTextureProfile(part),
    damageProfile: resolvePartDamageProfile(part),
    animationProfile: visual?.animationProfile ?? DEFAULT_ANIMATION_PROFILE,
    referenceIds: visual?.referenceIds ?? [],
    qualityStatus: visual?.qualityStatus ?? 'blockout',
  }
}

export function resolvePartRenderProfile(partOrId: PartDefinition | string | undefined): string {
  return resolvePartVisualProfile(partOrId).renderProfile
}

export function resolvePartTextureProfile(partOrId: PartDefinition | string | undefined): PartTextureProfileId {
  const part = typeof partOrId === 'string'
    ? getPart(partOrId)
    : partOrId
  const candidate = part?.visual.textureProfile

  if (isPartTextureProfile(candidate)) {
    return candidate
  }

  return part ? TEXTURE_PROFILE_BY_MATERIAL_ROLE[part.visual.materialRole] : DEFAULT_TEXTURE_PROFILE
}

export function resolvePartDamageProfile(partOrId: PartDefinition | string | undefined): PartDamageProfileId {
  const part = typeof partOrId === 'string'
    ? getPart(partOrId)
    : partOrId
  const candidate = part?.visual.damageProfile

  if (isPartTextureProfile(candidate)) {
    return candidate
  }

  return part ? DAMAGE_PROFILE_BY_MATERIAL_ROLE[part.visual.materialRole] : DEFAULT_DAMAGE_PROFILE
}

export function resolvePartAnimationProfile(partOrId: PartDefinition | string | undefined): string {
  return resolvePartVisualProfile(partOrId).animationProfile
}

export function isPartTextureProfile(value: unknown): value is PartTextureProfileId {
  return typeof value === 'string' && PART_TEXTURE_PROFILE_SET.has(value)
}
