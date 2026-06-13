import type {
  AgentConnectionPacket,
  AgentConnectionSurrenderSubmission,
  CompactBuildActionSubmission,
  CompactCombatPlanSubmission,
} from './types.js'

export function createExampleAgentConnectionPacket(): AgentConnectionPacket {
  return {
    sessionId: 's_example',
    role: 'red',
    phase: 'combat_turn',
    nextAction: 'choose_turn',
    round: 3,
    fightId: 'fight_3',
    decisionVersion: 3204,
    eventVersion: 44,
    instruction:
      'Combat: read packet.combat.combat and packet.combat.board, then submit one compact combat plan.',
    resources: {
      gold: 7,
      remainingGold: 7,
      partLimitRemaining: 0,
    },
    combat: {
      v: 1,
      combat: {
        round: 3,
        decisionVersion: 3204,
        fightStartedAt: '2026-06-09T14:26:00.000Z',
        fightDeadlineAt: '2026-06-09T14:30:00.000Z',
        fightSeconds: 240,
        budget: {
          actionTime: 9,
        },
        self: {
          cell: [3, 0],
          hp: 72,
          maxHp: 100,
          mass: 44,
          armor: 12,
          stability: 8,
          movement: { xz: 9 },
          weapons: [
            {
              slot: 'weaponA',
              part: 'weapon.Weapon_Turret',
              fireMode: 'projectile',
              range: 4,
              cooldown: 0,
              actionTime: 1,
            },
          ],
        },
        opponent: {
          cell: [5, 0],
          hp: 25,
          maxHp: 90,
          mass: 37,
          armor: 8,
          stability: 6,
          movement: { xz: 6 },
          weapons: [
            {
              slot: 'weaponA',
              part: 'weapon.Weapon_Spinner_Small',
              fireMode: 'melee',
              range: 2,
              cooldown: 1,
              actionTime: 2,
            },
          ],
        },
      },
      board: {
        grid: [-6, 6, -4, 4],
        terrain: {
          hazard: [[4, 0]],
        },
      },
    },
  }
}

export function createExampleCompactBuildActionSubmission(): CompactBuildActionSubmission {
  return {
    action: 'submit_build_action',
    decisionVersion: 200,
    command: { kind: 'choose_part', part: 'weapon.Weapon_Turret' },
    publicMessage: 'Adding a turret.',
  }
}

export function createExampleCompactBuildMountSubmission(): CompactBuildActionSubmission {
  return {
    action: 'submit_build_action',
    decisionVersion: 202,
    command: { kind: 'mount_part', surface: 'core_deck', u: 0.5, v: 0.5, yaw: 0, roll: 0 },
  }
}

export function createExampleAgentConnectionSurrenderSubmission(): AgentConnectionSurrenderSubmission {
  return {
    action: 'surrender',
    decisionVersion: 3204,
    publicMessage: 'Conceding this fight.',
  }
}

export function createExampleCompactCombatPlanSubmission(): CompactCombatPlanSubmission {
  return {
    action: 'submit_combat_plan',
    decisionVersion: 3204,
    round: 3,
    steps: [
      { kind: 'move', to: [4, 0] },
      { kind: 'attack', weaponSlot: 'weaponA', target: [5, 0] },
      { kind: 'end_turn' },
    ],
    publicMessage: 'Taking the lane and forcing contact.',
  }
}
