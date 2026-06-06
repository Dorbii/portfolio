import type {
  RoundPlanSubmissionV1,
  RoundPlanSubmissionV2,
  TurnCommand,
} from './types.js'

const BASELINE_SPINNER_PURCHASES = [
  { partId: 'Body_Square_Medium', quantity: 1 },
  { partId: 'Wheel_Large', quantity: 2 },
  { partId: 'Weapon_Spinner_Small', quantity: 1 },
] as const

const BASELINE_SPINNER_BLOCKS = [
  {
    id: 'core',
    partId: 'Body_Square_Medium',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  },
  {
    id: 'leftWheel',
    partId: 'Wheel_Large',
    position: [-1, 0, 0],
    rotation: [0, 0, 90],
  },
  {
    id: 'rightWheel',
    partId: 'Wheel_Large',
    position: [1, 0, 0],
    rotation: [0, 0, 90],
  },
  {
    id: 'spinner',
    partId: 'Weapon_Spinner_Small',
    position: [0, 0, 1],
    rotation: [0, 0, 0],
  },
] as const

const BASELINE_SPINNER_COMMANDS = [
  { tick: 1, move: 'dash_forward', weaponA: 'hold' },
  { tick: 2, move: 'circle_left', weaponA: 'fire' },
  { tick: 3, move: 'strafe_right', weaponA: 'hold' },
  { tick: 4, move: 'dash_backward', weaponA: 'fire' },
  { tick: 5, move: 'circle_right', weaponA: 'hold' },
] as const satisfies readonly TurnCommand[]

const BASELINE_SPINNER_RATIONALE =
  'A compact legal opener that buys a body, mobility, and one weapon inside the first-round budget.'

export function createBaselineRoundPlan(): RoundPlanSubmissionV1 {
  return {
    action: 'submit_round_plan',
    purchases: BASELINE_SPINNER_PURCHASES.map((purchase) => ({ ...purchase })),
    blueprint: {
      name: 'Baseline Spinner',
      blocks: BASELINE_SPINNER_BLOCKS.map((block) => ({
        ...block,
        position: [...block.position],
        rotation: [...block.rotation],
      })),
    },
    turnPlan: {
      commands: BASELINE_SPINNER_COMMANDS.map((command) => ({ ...command })),
    },
    rationale: BASELINE_SPINNER_RATIONALE,
  }
}

export function createBaselineRoundPlanV2Example(): RoundPlanSubmissionV2 {
  const baseline = createBaselineRoundPlan()

  return {
    action: 'submit_round_plan',
    schemaVersion: 2,
    purchases: baseline.purchases,
    blueprint: baseline.blueprint,
    tactics: {
      style: 'aggressive',
      targetPriority: 'closest',
      preferredRange: 'close',
      movementPolicy: 'close',
      aggression: 0.8,
      retreatAtHealthPct: 0.15,
      weaponCadence: 'opportunistic',
      hazardPreference: 'avoid',
    },
    openingScript: baseline.turnPlan,
    chat: [
      {
        kind: 'strategy',
        message:
          'Opening with a compact spinner; if it loses trades, next round should add armor or control.',
      },
    ],
    rationale: baseline.rationale,
  }
}

export function createLegacyBaselineRoundPlanExample(): RoundPlanSubmissionV1 {
  const baseline = createBaselineRoundPlan()

  return {
    ...baseline,
    blueprint: {
      ...baseline.blueprint,
      name: 'Legacy Baseline Spinner',
    },
    rationale: 'Legacy v1 shape remains valid for existing agents.',
  }
}
