import type {
  BotBlueprint,
  BotTactics,
  NormalizedBotTactics,
} from '../../schemas/src/index.js'
import { deriveControls } from './controls.js'

export const DEFAULT_BOT_TACTICS: NormalizedBotTactics = {
  style: 'balanced',
  targetPriority: 'closest',
  preferredRange: 'close',
  movementPolicy: 'hold_ground',
  aggression: 0.65,
  retreatAtHealthPct: 0.2,
  weaponCadence: 'opportunistic',
  hazardPreference: 'avoid',
}

export function normalizeTactics(tactics: BotTactics = {}): NormalizedBotTactics {
  return {
    ...DEFAULT_BOT_TACTICS,
    ...tactics,
  }
}

export function defaultTacticsForBlueprint(blueprint: BotBlueprint): NormalizedBotTactics {
  const controls = deriveControls(blueprint)
  const hasMovementControl = controls.movement.some((command) => command !== 'brake')

  return {
    ...DEFAULT_BOT_TACTICS,
    movementPolicy: hasMovementControl ? 'close' : 'hold_ground',
  }
}
