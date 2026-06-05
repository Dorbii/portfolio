const noHazardArena = {
  name: 'Believability Test Box',
  width: 24,
  height: 16,
  activeHazards: [],
}

const hazardArena = {
  name: 'Believability Hazard Box',
  width: 24,
  height: 16,
  activeHazards: ['floor_saw'],
}

export function repeatedScript(ticks, fieldsOrFactory) {
  return {
    commands: Array.from({ length: ticks }, (_, index) => {
      const tick = index + 1
      const fields =
        typeof fieldsOrFactory === 'function'
          ? fieldsOrFactory(tick)
          : fieldsOrFactory

      return { tick, ...fields }
    }),
  }
}

function block(id, partId, position, rotation = [0, 0, 0]) {
  return { id, partId, position, rotation }
}

function withoutBlock(blueprint, blockId, name) {
  return {
    ...blueprint,
    name,
    blocks: blueprint.blocks.filter((blockEntry) => blockEntry.id !== blockId),
  }
}

export const stationarySpinnerBlueprint = {
  name: 'Stationary Spinner',
  blocks: [
    block('core', 'Body_Square_Medium', [0, 0, 0]),
    block('left', 'Wheel_Tank', [-1, 0, 0], [0, 0, 90]),
    block('right', 'Wheel_Tank', [1, 0, 0], [0, 0, 90]),
    block('spinner', 'Weapon_Spinner_Large', [0, 0, 1]),
    block('gyro', 'Utility_Gyro', [-1, 0, -1]),
    block('anchor', 'Utility_Anchor', [1, 0, -1]),
    block('spikes', 'Armor_Spiked', [0, 1, 0]),
  ],
}

export const brawlerBlueprint = {
  name: 'Closing Brawler',
  blocks: [
    block('core', 'Body_Wedge', [0, 0, 0]),
    block('left', 'Wheel_Tank', [-1, 0, 0], [0, 0, 90]),
    block('right', 'Wheel_Tank', [1, 0, 0], [0, 0, 90]),
    block('ram', 'Weapon_Ram', [0, 0, 1]),
  ],
}

export const turretKiterBlueprint = {
  name: 'Turret Kiter',
  blocks: [
    block('core', 'Body_Light_Frame', [0, 0, 0]),
    block('frontLeft', 'Wheel_Omni', [-1, 0, 1], [0, 0, 90]),
    block('frontRight', 'Wheel_Omni', [1, 0, 1], [0, 0, 90]),
    block('rearLeft', 'Wheel_Omni', [-1, 0, -1], [0, 0, 90]),
    block('rearRight', 'Wheel_Omni', [1, 0, -1], [0, 0, 90]),
    block('turret', 'Weapon_Turret', [0, 0, 2]),
    block('sensor', 'Utility_Sensor', [0, 1, 0]),
  ],
}

export const fastSprinterBlueprint = {
  name: 'Fast Sprinter',
  blocks: [
    block('core', 'Body_Light_Frame', [0, 0, 0]),
    block('frontLeft', 'Wheel_Omni', [-1, 0, 1], [0, 0, 90]),
    block('frontRight', 'Wheel_Omni', [1, 0, 1], [0, 0, 90]),
    block('rearLeft', 'Wheel_Omni', [-1, 0, -1], [0, 0, 90]),
    block('rearRight', 'Wheel_Omni', [1, 0, -1], [0, 0, 90]),
  ],
}

export const netControlBlueprint = {
  name: 'Net Control',
  blocks: [
    block('core', 'Body_Square_Medium', [0, 0, 0]),
    block('left', 'Wheel_Large', [-1, 0, 0], [0, 0, 90]),
    block('right', 'Wheel_Large', [1, 0, 0], [0, 0, 90]),
    block('net', 'Weapon_Net', [0, 0, 1]),
    block('anchor', 'Utility_Anchor', [1, 0, -1]),
  ],
}

export const hazardBaitBlueprint = {
  name: 'Hazard Bait',
  blocks: [
    block('core', 'Body_Light_Frame', [0, 0, 0]),
    block('frontLeft', 'Wheel_Omni', [-1, 0, 1], [0, 0, 90]),
    block('frontRight', 'Wheel_Omni', [1, 0, 1], [0, 0, 90]),
    block('rearLeft', 'Wheel_Omni', [-1, 0, -1], [0, 0, 90]),
    block('rearRight', 'Wheel_Omni', [1, 0, -1], [0, 0, 90]),
    block('booster', 'Utility_Booster', [0, 0, -1]),
  ],
}

export const heavyTreadTankBlueprint = {
  name: 'Heavy Tread Tank',
  blocks: [
    block('core', 'Body_Heavy_Block', [0, 0, 0]),
    block('left', 'Tread_Light', [-1, 0, 0], [0, 0, 90]),
    block('right', 'Tread_Light', [1, 0, 0], [0, 0, 90]),
    block('ram', 'Weapon_Ram', [0, 0, 1]),
  ],
}

export const commanderDroneBlueprint = {
  name: 'Mobile Commander Drone',
  blocks: [
    block('core', 'Body_Light_Frame', [0, 0, 0]),
    block('frontLeft', 'Wheel_Omni', [-1, 0, 1], [0, 0, 90]),
    block('frontRight', 'Wheel_Omni', [1, 0, 1], [0, 0, 90]),
    block('rearLeft', 'Wheel_Omni', [-1, 0, -1], [0, 0, 90]),
    block('rearRight', 'Wheel_Omni', [1, 0, -1], [0, 0, 90]),
    block('drone', 'Utility_DroneController', [0, 0, 1]),
    block('sensor', 'Utility_Sensor', [0, 1, 0]),
  ],
}

export function createReplayBelievabilityScenarios(normalizeTactics) {
  const emptyScript = { commands: [] }

  return {
    stationarySpinner: {
      id: 'stationary spinner vs brawler',
      keyPart: { bot: 'red', blockId: 'spinner' },
      input: {
        round: 1,
        seed: 'stationary-spinner-believability',
        red: {
          blueprint: stationarySpinnerBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'hold_ground',
            preferredRange: 'contact',
            aggression: 0.85,
            weaponCadence: 'sustained',
          }),
          openingScript: emptyScript,
        },
        blue: {
          blueprint: brawlerBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'close',
            preferredRange: 'contact',
            aggression: 0.9,
            weaponCadence: 'sustained',
          }),
          openingScript: emptyScript,
        },
        arena: noHazardArena,
      },
      withoutKeyPart: {
        bot: 'red',
        blueprint: withoutBlock(
          stationarySpinnerBlueprint,
          'spinner',
          'Anchored Shell',
        ),
      },
    },
    turretKiter: {
      id: 'kiter turret vs brawler',
      keyPart: { bot: 'blue', blockId: 'turret' },
      input: {
        round: 1,
        seed: 'turret-kiter-believability',
        red: {
          blueprint: brawlerBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'close',
            preferredRange: 'contact',
            aggression: 0.9,
            weaponCadence: 'sustained',
          }),
          openingScript: emptyScript,
        },
        blue: {
          blueprint: turretKiterBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'kite',
            preferredRange: 'long',
            aggression: 0.55,
            weaponCadence: 'sustained',
          }),
          openingScript: emptyScript,
        },
        arena: noHazardArena,
      },
      withoutKeyPart: {
        bot: 'blue',
        blueprint: withoutBlock(turretKiterBlueprint, 'turret', 'Sensor Runner'),
      },
    },
    netControl: {
      id: 'net control vs fast sprinter',
      keyPart: { bot: 'red', blockId: 'net' },
      input: {
        round: 1,
        seed: 'net-control-believability',
        red: {
          blueprint: netControlBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'close',
            preferredRange: 'close',
            aggression: 0.6,
            weaponCadence: 'sustained',
          }),
          openingScript: repeatedScript(14, { move: 'forward' }),
        },
        blue: {
          blueprint: fastSprinterBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'close',
            preferredRange: 'contact',
            aggression: 0.85,
          }),
          openingScript: repeatedScript(14, { move: 'forward' }),
        },
        arena: noHazardArena,
      },
      withoutKeyPart: {
        bot: 'red',
        blueprint: withoutBlock(netControlBlueprint, 'net', 'Grabber Control'),
      },
    },
    hazardBait: {
      id: 'hazard bait vs heavy tank',
      keyPart: { bot: 'red', blockId: 'booster' },
      input: {
        round: 1,
        seed: 'hazard-bait-believability',
        red: {
          blueprint: hazardBaitBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'bait_hazard',
            preferredRange: 'close',
            aggression: 0.35,
            hazardPreference: 'bait',
          }),
          openingScript: emptyScript,
        },
        blue: {
          blueprint: heavyTreadTankBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'close',
            preferredRange: 'contact',
            aggression: 0.9,
            weaponCadence: 'sustained',
          }),
          openingScript: emptyScript,
        },
        arena: hazardArena,
      },
      withoutKeyPart: {
        bot: 'red',
        blueprint: withoutBlock(hazardBaitBlueprint, 'booster', 'Plain Hazard Runner'),
      },
    },
    commanderDrone: {
      id: 'commander drone vs spinner',
      keyPart: { bot: 'red', blockId: 'drone' },
      input: {
        round: 1,
        seed: 'commander-drone-believability',
        red: {
          blueprint: commanderDroneBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'circle',
            preferredRange: 'mid',
            aggression: 0.5,
          }),
          openingScript: repeatedScript(10, { utility: 'activate' }),
        },
        blue: {
          blueprint: stationarySpinnerBlueprint,
          tactics: normalizeTactics({
            movementPolicy: 'hold_ground',
            preferredRange: 'contact',
            aggression: 0.85,
            weaponCadence: 'sustained',
          }),
          openingScript: emptyScript,
        },
        arena: noHazardArena,
      },
      withoutKeyPart: {
        bot: 'red',
        blueprint: withoutBlock(commanderDroneBlueprint, 'drone', 'Sensor Skirmisher'),
      },
    },
  }
}
