import type { RoundPlanSubmission } from '../../../../packages/schemas/src/index.js'

export function createBaselineRoundPlan(): RoundPlanSubmission {
  return {
    action: 'submit_round_plan',
    purchases: [
      { partId: 'Body_Square_Medium', quantity: 1 },
      { partId: 'Wheel_Large', quantity: 2 },
      { partId: 'Weapon_Spinner_Small', quantity: 1 },
    ],
    blueprint: {
      name: 'Baseline Spinner',
      blocks: [
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
      ],
    },
    turnPlan: {
      commands: [
        { tick: 1, move: 'dash_forward', weaponA: 'hold' },
        { tick: 2, move: 'circle_left', weaponA: 'fire' },
        { tick: 3, move: 'strafe_right', weaponA: 'hold' },
        { tick: 4, move: 'dash_backward', weaponA: 'fire' },
        { tick: 5, move: 'circle_right', weaponA: 'hold' },
      ],
    },
    rationale:
      'A compact legal opener that buys a body, mobility, and one weapon inside the first-round budget.',
  }
}
