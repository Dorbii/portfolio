import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import {
  DEFAULT_BOT_EFFECT_PALETTES,
  type BotEffectPalette,
  type BotVisualProfile,
} from './replayVisualProfile'

const NEUTRAL_EFFECT_PALETTE: BotEffectPalette = {
  accent: '#f2c95c',
  glow: '#ffe7a3',
  hot: '#fff5cf',
  soft: '#c7d3d3',
}

export function resolveReplayEffectPalette(
  team: TeamRole | undefined,
  profiles: Record<TeamRole, BotVisualProfile>,
): BotEffectPalette {
  if (!team) {
    return NEUTRAL_EFFECT_PALETTE
  }

  return profiles[team]?.effectPalette ?? DEFAULT_BOT_EFFECT_PALETTES[team]
}

export function cloneStandardMaterial(
  material: StandardMaterial,
  name: string,
  alpha = material.alpha,
): StandardMaterial {
  const clone = material.clone(name)

  if (clone instanceof StandardMaterial) {
    clone.alpha = alpha
    clone.backFaceCulling = alpha >= 1
    return clone
  }

  return material
}

export function tintStandardMaterial(
  material: unknown,
  diffuse: string,
  emissive: string,
  alpha?: number,
): void {
  if (!(material instanceof StandardMaterial)) {
    return
  }

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.emissiveColor = Color3.FromHexString(emissive)

  if (alpha !== undefined) {
    material.alpha = alpha
    material.backFaceCulling = alpha >= 1
  }
}
