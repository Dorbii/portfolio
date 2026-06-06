import type { RoundPlanSubmissionV2 } from './types.js'

const EXAMPLE_SPINNER_PURCHASES = [
  { partId: 'Body_Square_Medium', quantity: 1 },
  { partId: 'Wheel_Large', quantity: 2 },
  { partId: 'Weapon_Spinner_Small', quantity: 1 },
] as const

const EXAMPLE_SPINNER_BLOCKS = [
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

const EXAMPLE_SPINNER_RATIONALE =
  'A compact legal example that buys a body, mobility, and one weapon inside the first-round budget.'

export function createExampleRoundPlan(): RoundPlanSubmissionV2 {
  return {
    action: 'submit_round_plan',
    schemaVersion: 2,
    purchases: EXAMPLE_SPINNER_PURCHASES.map((purchase) => ({ ...purchase })),
    blueprint: {
      name: 'Example Spinner',
      blocks: EXAMPLE_SPINNER_BLOCKS.map((block) => ({
        ...block,
        position: [...block.position],
        rotation: [...block.rotation],
      })),
    },
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
    rationale: EXAMPLE_SPINNER_RATIONALE,
  }
}

export function createExampleRoundPlanV2(): RoundPlanSubmissionV2 {
  return {
    ...createExampleRoundPlan(),
    chat: [
      {
        kind: 'strategy',
        message:
          'Opening with a compact spinner; if it loses trades, next round should add armor or control.',
      },
    ],
  }
}
