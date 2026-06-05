import type {
  BotBlueprint,
  BotTactics,
  NormalizedBotTactics,
  NormalizedRoundPlanSubmission,
  OpeningScript,
  RoundPlanSubmission,
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

const EMPTY_OPENING_SCRIPT: OpeningScript = { commands: [] }

export function normalizeRoundSubmission(
  submission: RoundPlanSubmission,
): NormalizedRoundPlanSubmission {
  const common = {
    action: submission.action,
    purchases: submission.purchases.map((purchase) => ({ ...purchase })),
    blueprint: {
      ...submission.blueprint,
      blocks: submission.blueprint.blocks.map((block) => ({ ...block })),
    },
    ...(submission.rationale !== undefined ? { rationale: submission.rationale } : {}),
    ...(submission.chat !== undefined
      ? { chat: submission.chat.map((message) => ({ ...message })) }
      : {}),
  }

  if (submission.schemaVersion === 2) {
    return {
      ...common,
      schemaVersion: 2,
      tactics: normalizeTacticsForBlueprint(submission.tactics, submission.blueprint),
      openingScript: cloneOpeningScript(submission.openingScript ?? EMPTY_OPENING_SCRIPT),
    }
  }

  return {
    ...common,
    schemaVersion: 2,
    tactics: defaultTacticsForBlueprint(submission.blueprint),
    openingScript: cloneOpeningScript(submission.turnPlan),
  }
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

function normalizeTacticsForBlueprint(
  tactics: BotTactics = {},
  blueprint: BotBlueprint,
): NormalizedBotTactics {
  return {
    ...defaultTacticsForBlueprint(blueprint),
    ...tactics,
  }
}

function cloneOpeningScript(openingScript: OpeningScript): OpeningScript {
  return {
    commands: openingScript.commands.map((command) => ({ ...command })),
  }
}
