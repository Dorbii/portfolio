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
    instruction: 'Choose one legal action from this packet. Submit the actionId only.',
    legalActions: [
      {
        id: 'combat.red.r1.f1.t3.move_east_2.fire_weapon_a',
        kind: 'move_and_attack',
        label: 'Strafe east and fire weapon A',
        summary: 'Move two cells east, then fire at the opponent from the final anchor cell.',
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
        id: 'combat.red.r1.f1.t3.hold',
        kind: 'hold',
        label: 'Hold position',
        summary: 'Keep the current anchor cell and preserve action timing.',
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
      },
    },
  }
}

export function createExampleGameMasterActionSubmission(): GameMasterActionSubmission {
  return {
    action: 'submit_game_action',
    actionSetId: 'red:r1:fight_1:turn_3:v12',
    decisionVersion: 12,
    actionId: 'combat.red.r1.f1.t3.move_east_2.fire_weapon_a',
    publicMessage: 'Your left side is looking soft.',
  }
}
