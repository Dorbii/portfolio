import type {
  GameMasterActionSubmission,
  GameMasterPacket,
} from './types.js'

export function createExampleGameMasterPacket(): GameMasterPacket {
  return {
    sessionId: 's_example',
    role: 'red',
    phase: 'combat_turn',
    nextAction: 'choose_turn',
    round: 1,
    fightId: 'fight_1',
    turnId: 'turn_3',
    decisionVersion: 12,
    eventVersion: 21,
    actionSetId: 'red:r1:fight_1:turn_3:v12',
    instruction:
      'Choose one legal action from this packet. Inspect parameterSchema first and include parameters only when that selected action asks for them; the server validates parameters, shop rules, and budget rules.',
    board: {
      arena: {
        name: 'Compact Box',
        width: 24,
        height: 16,
        activeHazards: ['floor_saw'],
      },
      grid: {
        cellSize: 1,
        xMin: -12,
        xMax: 12,
        zMin: -8,
        zMax: 8,
      },
      self: {
        anchor: { x: 3, z: 2 },
        facing: 'east',
      },
      opponent: {
        anchor: { x: 5, z: 6 },
        facing: 'west',
      },
      blockedCells: [
        { x: 0, z: 0 },
      ],
      hazardCells: [
        { x: 1, z: 1 },
      ],
      cells: [
        {
          cellId: 'cell:5:2',
          x: 5,
          z: 2,
          inBounds: true,
          blocksMovement: false,
          blocksLineOfSight: false,
          distanceToOpponent: 4,
          lineOfSightToOpponent: true,
          reachableByActionIds: ['combat.red.r1.t3.move_and_attack.to_xp5_zp2.target_xp5_zp6.weapon_a'],
        },
        {
          cellId: 'cell:5:6',
          x: 5,
          z: 6,
          inBounds: true,
          blocksMovement: false,
          blocksLineOfSight: false,
          occupant: 'opponent',
          distanceToOpponent: 0,
          lineOfSightToOpponent: true,
          targetableByActionIds: ['combat.red.r1.t3.move_and_attack.to_xp5_zp2.target_xp5_zp6.weapon_a'],
          unavailableReasons: ['Opponent occupies this anchor cell.'],
        },
      ],
      reachablePoses: [
        {
          poseId: 'pose:5:2:east',
          anchor: { x: 5, z: 2 },
          facing: 'east',
          reachable: true,
          actionIds: ['combat.red.r1.t3.move_and_attack.to_xp5_zp2.target_xp5_zp6.weapon_a'],
          path: [
            { x: 3, z: 2 },
            { x: 4, z: 2 },
            { x: 5, z: 2 },
          ],
          distanceToOpponent: 4,
          lineOfSightToOpponent: true,
          hazardExposure: 0,
          riskTags: ['attack_available'],
        },
      ],
      attackableTargets: [
        {
          targetId: 'opponent',
          kind: 'opponent',
          cell: { x: 5, z: 6 },
          actionIds: ['combat.red.r1.t3.move_and_attack.to_xp5_zp2.target_xp5_zp6.weapon_a'],
          distance: 4,
          lineOfSight: true,
        },
      ],
    },
    legalActions: [
      {
        id: 'combat.red.r1.t3.move_and_attack.to_xp5_zp2.target_xp5_zp6.weapon_a',
        kind: 'move_and_attack',
        label: 'Move to cell (5, 2) and attack opponent at cell (5, 6)',
        summary:
          'Move to destination cell cell:5:2, then attack opponent on cell cell:5:6. 4 cells from target; line of sight clear; 0 hazard cells crossed.',
        parameterSchema: {
          type: 'object',
          required: ['destinationCellId', 'targetId', 'targetCellId'],
          properties: {
            destinationCellId: {
              type: 'string',
              label: 'Destination cell',
              summary: 'Grid cell where this movement action ends before attacking.',
              enum: ['cell:5:2'],
            },
            targetId: {
              type: 'string',
              label: 'Target',
              summary: 'Server-authored attack target.',
              enum: ['opponent'],
            },
            targetCellId: {
              type: 'string',
              label: 'Target cell',
              summary: 'Grid cell occupied by the selected target.',
              enum: ['cell:5:6'],
            },
          },
        },
        parameterExamples: [
          {
            destinationCellId: 'cell:5:2',
            targetId: 'opponent',
            targetCellId: 'cell:5:6',
          },
        ],
        preview: {
          basis: 'current_snapshot',
          outcome: 'estimated',
          path: [
            { x: 3, z: 2 },
            { x: 4, z: 2 },
            { x: 5, z: 2 },
          ],
          finalPose: {
            anchor: { x: 5, z: 2 },
            facing: 'east',
          },
          target: { x: 5, z: 6 },
          currentLineOfSight: true,
          expectedRangeIfOpponentHolds: 4,
          hazardExposure: 0,
          riskTags: ['estimated_hit'],
        },
      },
      {
        id: 'combat.red.r1.t3.hold.cell_xp3_zp2.hold',
        kind: 'hold',
        label: 'Hold at cell (3, 2)',
        summary: 'Hold position on cell cell:3:2. 4 cells from target; line of sight clear; 0 hazard cells crossed.',
      },
    ],
    submit: {
      method: 'POST',
      path: '/sessions/:sessionId/action',
      body: {
        action: 'submit_game_action',
        actionSetId: 'red:r1:fight_1:turn_3:v12',
        decisionVersion: 12,
        actionId: '<legalActions.id>',
        parameters: {},
      },
    },
  }
}

export function createExampleGameMasterActionSubmission(): GameMasterActionSubmission {
  return {
    action: 'submit_game_action',
    actionSetId: 'red:r1:fight_1:turn_3:v12',
    decisionVersion: 12,
    actionId: 'combat.red.r1.t3.move_and_attack.to_xp5_zp2.target_xp5_zp6.weapon_a',
    parameters: {
      destinationCellId: 'cell:5:2',
      targetId: 'opponent',
      targetCellId: 'cell:5:6',
    },
    publicMessage: 'Your left side is looking soft.',
  }
}

export function createExampleMountPoseActionSubmission(): GameMasterActionSubmission {
  return {
    action: 'submit_game_action',
    actionSetId: 'red:r1:loadout:propose_mount_pose:v102',
    decisionVersion: 102,
    actionId: 'loadout.red.r1.mount_pose.Laser_A.core',
    parameters: {
      parentInstanceId: 'core',
      childPartId: 'Laser_A',
      mountSurfaceId: 'core_shell',
      u: 0.37,
      v: 0.82,
      yawDegrees: 120,
      rollDegrees: 15,
    },
  }
}
