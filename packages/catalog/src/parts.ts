import type {
  ArmorSpec,
  MobilitySpec,
  PartCategory,
  PartDefinition,
  PartEffect,
  PartFootprint,
  PartMount,
  PartMaterialRole,
  PartMountRole,
  PartRarity,
  PartSpec,
  PartStats,
  PartVisualDescriptor,
  PartVisualFamily,
  PowerSpec,
  StructureSpec,
  UtilitySpec,
  Vector3,
  WeaponSpec,
} from '../../schemas/src/index.js'
import { PART_BEHAVIORS } from '../../sim/src/partBehaviors.js'

type PartInput = {
  id: string
  category: PartCategory
  displayName: string
  rarity?: PartRarity
  cost: number
  mass: number
  durability: number
  size: Vector3
  tags?: string[]
  stats?: PartStats
  footprint?: PartFootprint
  mounts?: PartMount[]
  spec?: PartSpec
  signatureEffect?: PartEffect
  mechanics?: PartEffect[]
  visual?: PartVisualDescriptor
  behavior?: PartDefinition['behavior']
  controls?: PartDefinition['controls']
}

function part(input: PartInput): PartDefinition {
  const signatureEffect = input.signatureEffect ?? inferSignatureEffect(input)
  const mechanics = input.mechanics ?? inferMechanics(input)

  return {
    tags: [],
    stats: {},
    rarity: input.rarity ?? inferRarity(input),
    footprint: input.footprint ?? inferFootprint(input),
    mounts: input.mounts ?? inferMounts(input),
    spec: input.spec ?? inferSpec(input),
    ...(signatureEffect ? { signatureEffect } : {}),
    ...(mechanics.length > 0 ? { mechanics } : {}),
    visual: input.visual ?? inferVisualDescriptor(input),
    ...input,
  }
}

function inferVisualDescriptor(input: PartInput): PartVisualDescriptor {
  return {
    detailBudget: inferDetailBudget(input),
    materialRole: inferMaterialRole(input),
    mountRole: inferMountRole(input),
    visualFamily: inferVisualFamily(input),
  }
}

function inferVisualFamily(input: PartInput): PartVisualFamily {
  if (input.id.includes('Laser')) return 'turret'
  if (input.id.includes('Shredder')) return 'shredder'
  if (input.id.includes('ChainWhip')) return 'chain_whip'
  if (input.id.includes('Drill')) return 'drill'
  if (input.id.includes('Flail')) return 'flail'
  if (input.id.includes('Spinner')) return 'spinner'
  if (input.id.includes('Saw')) return 'saw'
  if (input.id.includes('Hammer')) return 'hammer'
  if (input.id.includes('Net')) return 'net'
  if (input.id.includes('Turret')) return 'turret'
  if (input.id.includes('Spear')) return 'spear'
  if (input.id.includes('Flipper')) return 'flipper'
  if (input.id.includes('Grabber')) return 'grabber'
  if (input.id.includes('Ram')) return 'ram'
  if (input.id.includes('Rail')) return 'rail_armor'
  if (input.id.includes('CornerGuard')) return 'corner_guard'
  if (input.id.includes('FlexPanel')) return 'flex_panel'
  if (input.id.includes('HeavyWedge')) return 'heavy_wedge'
  if (input.id.includes('Tread')) return 'tread'
  if (input.id.includes('Mecanum')) return 'wheel'
  if (input.id.includes('Wheel')) return 'wheel'
  if (input.id.includes('Leg')) return 'leg'
  if (input.id.includes('Wedge')) return 'wedge'
  if (input.id.includes('Shield') || input.id.includes('Plate')) return 'shield'
  if (input.id.includes('Cage') || input.category === 'defense') return 'armor'
  if (input.id.includes('Booster')) return 'booster'
  if (input.id.includes('Gyro')) return 'gyro'
  if (input.id.includes('Magnet')) return 'magnet'
  if (input.id.includes('Anchor')) return 'anchor'
  if (input.id.includes('Smoke')) return 'smoke'
  if (input.id.includes('AIModule')) return 'ai_module'
  if (input.id.includes('Radar')) return 'radar'
  if (input.id.includes('CoolantTank')) return 'coolant_tank'
  if (input.id.includes('FuelTank')) return 'fuel_tank'
  if (input.id.includes('Sensor')) return 'sensor'
  if (input.id.includes('EnergyCore')) return 'energy_core'
  if (input.id.includes('Battery') || input.id.includes('RepairKit')) return 'battery'
  if (input.id.includes('Drone')) return 'drone'
  if (input.id.includes('LightBar')) return 'light_bar'
  if (input.id.includes('BladeAntenna')) return 'blade_antenna'
  if (input.id.includes('Antenna')) return 'antenna'
  if (input.id.includes('Horns')) return 'horns'
  if (input.id.includes('Tail')) return 'tail'
  if (input.id.includes('TopHat') || input.id.includes('CowboyHat')) return 'hat'

  return 'body'
}

function inferMaterialRole(input: PartInput): PartMaterialRole {
  if (input.id.includes('LightBar')) return 'glass_emissive'
  if (input.category === 'mobility') return 'black_rubber'
  if (input.category === 'weapon') return 'weapon_steel'
  if (input.category === 'defense') return 'painted_armor'
  if (input.category === 'utility') return 'electrical_casing'
  if (input.category === 'style') return 'cosmetic_shell'
  if (input.id.includes('Wedge') || input.id.includes('Heavy')) return 'painted_armor'

  return 'raw_metal'
}

function inferMountRole(input: PartInput): PartMountRole {
  if (input.category === 'weapon') return 'front_mount'
  if (input.category === 'mobility') return 'side_mount'
  if (input.category === 'utility') return 'top_mount'
  if (input.category === 'defense') return 'exposed'
  if (input.category === 'style') return 'top_mount'

  return 'internal'
}

function inferDetailBudget(input: PartInput): PartVisualDescriptor['detailBudget'] {
  if (input.category === 'style') return 'low'
  if (input.cost >= 20 || input.category === 'weapon' || input.category === 'defense') {
    return 'high'
  }

  return 'medium'
}

function inferFootprint(input: PartInput): PartFootprint {
  return {
    size: input.size,
    minY: 0,
    groundContact: input.category === 'mobility' && (input.stats?.drive ?? 0) > 0
      ? 'required'
      : 'allowed',
  }
}

function inferMounts(input: PartInput): PartMount[] {
  if (input.category === 'body') {
    return [
      sideMount('side_front', ['body', 'mobility', 'weapon', 'defense', 'utility', 'style'], 'front'),
      sideMount('side_rear', ['body', 'mobility', 'weapon', 'defense', 'utility', 'style'], 'rear'),
      sideMount('side_left', ['body', 'mobility', 'weapon', 'defense', 'utility', 'style'], 'left'),
      sideMount('side_right', ['body', 'mobility', 'weapon', 'defense', 'utility', 'style'], 'right'),
      topMount(['weapon', 'defense', 'utility', 'style']),
      surfaceMount(['defense', 'utility', 'style']),
      internalMount(['utility']),
    ]
  }

  if (input.category === 'mobility') {
    return [
      sideMount('side_outer', ['defense', 'utility', 'style'], 'outer'),
      {
        id: 'rim_outer',
        kind: 'rim',
        accepts: ['weapon', 'defense', 'utility', 'style'],
        motion: 'inherits_parent_spin',
        collisionPolicy: 'allow_clip_v1',
        rotationOptions: [0, 90, 180, 270],
        sectors: ['outer_rim'],
      },
    ]
  }

  if (input.category === 'defense') {
    return [
      surfaceMount(['weapon', 'utility', 'style']),
      topMount(['utility', 'style']),
    ]
  }

  if (input.category === 'weapon') {
    return [surfaceMount(['utility', 'style'])]
  }

  if (input.category === 'utility') {
    return [surfaceMount(['style'])]
  }

  return []
}

function sideMount(id: string, accepts: PartCategory[], sector: string): PartMount {
  return {
    id,
    kind: 'side_socket',
    accepts,
    motion: 'static',
    collisionPolicy: 'reject_overlap',
    rotationOptions: [0, 90, 180, 270],
    sectors: [sector],
  }
}

function topMount(accepts: PartCategory[]): PartMount {
  return {
    id: 'top_socket',
    kind: 'top_socket',
    accepts,
    motion: 'static',
    collisionPolicy: 'allow_clip_v1',
    rotationOptions: [0, 90, 180, 270],
    sectors: ['top'],
  }
}

function surfaceMount(accepts: PartCategory[]): PartMount {
  return {
    id: 'surface',
    kind: 'surface',
    accepts,
    motion: 'static',
    collisionPolicy: 'allow_clip_v1',
    rotationOptions: [0, 90, 180, 270],
    sectors: ['surface'],
  }
}

function internalMount(accepts: PartCategory[]): PartMount {
  return {
    id: 'internal_slot',
    kind: 'internal_slot',
    accepts,
    motion: 'static',
    collisionPolicy: 'internal_only',
    rotationOptions: [0],
    sectors: ['internal'],
  }
}

function inferSpec(input: PartInput): PartSpec {
  switch (input.category) {
    case 'weapon':
      return inferWeaponSpec(input)
    case 'mobility':
      return inferMobilitySpec(input)
    case 'defense':
      return inferArmorSpec(input)
    case 'body':
      return inferStructureSpec(input)
    case 'utility':
      if (input.id.includes('Battery') || input.id.includes('EnergyCore')) {
        return inferPowerSpec(input)
      }

      return inferUtilitySpec(input)
    case 'style':
      return inferUtilitySpec(input, 'cosmetic')
  }
}

function inferRarity(input: PartInput): PartRarity {
  return input.category === 'style' ? 'rare' : 'normal'
}

function inferSignatureEffect(input: PartInput): PartEffect | undefined {
  if (input.category !== 'style') {
    return undefined
  }

  if (input.id === 'Style_DragonHead') {
    return {
      id: 'fire_breath',
      kind: 'signature',
      trigger: 'activated',
      cooldownTurns: 4,
      charges: 2,
      target: 'area',
      params: {
        damage: 10,
        range: 4,
        arcDegrees: 70,
        fireMode: 'arc',
      },
      replayCue: 'fire_breath',
      debriefSignals: ['fire_damage', 'signature_fire_breath', 'arc_occlusion'],
    }
  }

  if (input.id === 'Style_Spikes') {
    return {
      id: 'spike_burst',
      kind: 'signature',
      trigger: 'on_hit',
      cooldownTurns: 2,
      target: 'opponent',
      params: {
        retaliationDamage: 4,
        stabilityPenalty: 1,
      },
      replayCue: 'spark_burst',
      debriefSignals: ['retaliation_damage', 'signature_spike_burst'],
    }
  }

  if (input.id === 'Style_Wings') {
    return {
      id: 'wing_buffet',
      kind: 'signature',
      trigger: 'activated',
      cooldownTurns: 3,
      charges: 2,
      target: 'movement',
      params: {
        lateralBoost: 1,
        instabilityRisk: 0.2,
      },
      replayCue: 'wing_buffet',
      debriefSignals: ['evasive_movement', 'stability_risk'],
    }
  }

  if (input.id === 'Style_Neon' || input.id === 'Style_LightBar') {
    return {
      id: input.id === 'Style_Neon' ? 'neon_blind' : 'lightbar_flash',
      kind: 'signature',
      trigger: 'activated',
      cooldownTurns: 3,
      charges: 2,
      target: 'opponent',
      params: {
        controlPenalty: 2,
        durationTurns: 1,
      },
      replayCue: 'neon_blind',
      debriefSignals: ['control_disruption', 'visual_signature'],
    }
  }

  if (input.id === 'Style_Crown') {
    return {
      id: 'crown_command',
      kind: 'signature',
      trigger: 'passive',
      cooldownTurns: 0,
      target: 'self',
      params: {
        controlBonus: 1,
        moraleSignal: 1,
      },
      replayCue: 'crown_command',
      debriefSignals: ['control_bonus', 'signature_command'],
    }
  }

  if (input.id === 'Style_TrashCan') {
    return {
      id: 'trash_shield',
      kind: 'signature',
      trigger: 'on_damage',
      cooldownTurns: 3,
      charges: 1,
      target: 'self',
      params: {
        absorbDamage: 6,
        detachChance: 0.35,
      },
      replayCue: 'trash_shield',
      debriefSignals: ['absorbed_damage', 'detached_shell'],
    }
  }

  return {
    id: 'banner_presence',
    kind: 'signature',
    trigger: 'passive',
    cooldownTurns: 0,
    target: 'self',
    params: {
      styleSignal: Math.max(1, input.stats?.style ?? 1),
    },
    replayCue: 'crown_command',
    debriefSignals: ['signature_presence'],
  }
}

function inferMechanics(input: PartInput): PartEffect[] {
  if (input.id === 'Utility_AIModule') {
    return [
      {
        id: 'tactical_assist',
        kind: 'utility',
        trigger: 'passive',
        cooldownTurns: 0,
        target: 'movement',
        params: {
          recommendedMoveBias: 1,
          externalAgentIntelligenceBonus: false,
        },
        replayCue: 'tactical_assist',
        debriefSignals: ['tactical_assist_used', 'movement_recommendation_bias'],
      },
    ]
  }

  if (input.id === 'Utility_Gyro') {
    return [
      {
        id: 'self_righting_stabilizer',
        kind: 'utility',
        trigger: 'on_flip',
        cooldownTurns: 3,
        charges: 1,
        target: 'self',
        params: {
          selfRightChance: 0.75,
          stabilityBonus: 3,
        },
        replayCue: 'self_right',
        debriefSignals: ['gyro_self_righting', 'stability_failure_prevented'],
      },
    ]
  }

  return []
}

function inferWeaponSpec(input: PartInput): WeaponSpec {
  const damage = Math.max(1, input.stats?.weapon ?? Math.round(input.durability / 4))

  return {
    kind: 'weapon',
    damage,
    range: inferWeaponRange(input),
    cooldownTurns: inferWeaponCooldown(input),
    ...(input.id.includes('Net') ? { ammo: 1 } : {}),
    fireMode: inferWeaponFireMode(input),
    precision: Math.max(0, Math.min(1, 0.45 + (input.stats?.control ?? 0) / 20)),
  }
}

function inferWeaponRange(input: PartInput): number {
  if (input.id.includes('Laser')) return 14
  if (input.id.includes('Turret') || input.id.includes('Net')) return 8
  if (input.id.includes('Spear') || input.id.includes('Drill')) return 3
  if (input.id.includes('Ram') || input.id.includes('Flipper') || input.id.includes('Grabber')) return 2

  return 4
}

function inferWeaponCooldown(input: PartInput): number {
  if (input.id.includes('Net')) return 6
  if (input.id.includes('Laser')) return 3
  if (input.id.includes('Hammer') || input.id.includes('Flipper')) return 2

  return 1
}

function inferWeaponFireMode(input: PartInput): WeaponSpec['fireMode'] {
  if (input.id.includes('Laser')) return 'direct'
  if (input.id.includes('Net') || input.id.includes('Hammer')) return 'arc'
  if (input.id.includes('Spinner') || input.id.includes('Flail') || input.id.includes('Saw')) return 'sweep'
  if (input.id.includes('Ram') || input.id.includes('Grabber') || input.id.includes('Drill')) return 'contact'

  return 'direct'
}

function inferMobilitySpec(input: PartInput): MobilitySpec {
  return {
    kind: 'mobility',
    moveBudget: Math.max(0, input.stats?.drive ?? 0),
    traction: Math.max(0, input.stats?.traction ?? 0),
    stability: Math.max(0, input.stats?.stability ?? 0),
    turnRate: Math.max(1, Math.min(10, 4 + (input.stats?.control ?? 0) + (input.stats?.drive ?? 0) / 3)),
  }
}

function inferArmorSpec(input: PartInput): ArmorSpec {
  return {
    kind: 'armor',
    armor: Math.max(1, input.stats?.armor ?? Math.round(input.durability / 5)),
    coverage: Math.max(1, Math.round(input.size[0] * input.size[2])),
  }
}

function inferStructureSpec(input: PartInput): StructureSpec {
  return {
    kind: 'structure',
    integrity: Math.max(1, input.durability),
    connectorStrength: Math.max(1, Math.round((input.stats?.stability ?? 0) + input.mass / 4)),
  }
}

function inferUtilitySpec(input: PartInput, effect = input.behavior?.id ?? 'passive'): UtilitySpec {
  return {
    kind: 'utility',
    effect,
    control: Math.max(0, input.stats?.control ?? 0),
  }
}

function inferPowerSpec(input: PartInput): PowerSpec {
  return {
    kind: 'power',
    output: Math.max(1, input.stats?.control ?? input.stats?.drive ?? 1),
    capacity: Math.max(1, input.durability + input.mass),
  }
}

export const PART_CATALOG: PartDefinition[] = [
  part({
    id: 'Body_Square_Small',
    category: 'body',
    displayName: 'Small Square Core',
    cost: 14,
    mass: 10,
    durability: 28,
    size: [1, 1, 1],
    stats: { stability: 4 },
  }),
  part({
    id: 'Body_Square_Medium',
    category: 'body',
    displayName: 'Medium Square Core',
    cost: 22,
    mass: 16,
    durability: 42,
    size: [2, 1, 2],
    stats: { stability: 7 },
  }),
  part({
    id: 'Body_Square_Large',
    category: 'body',
    displayName: 'Large Square Core',
    cost: 34,
    mass: 26,
    durability: 62,
    size: [3, 1, 3],
    stats: { stability: 10 },
  }),
  part({
    id: 'Body_Rectangle_Long',
    category: 'body',
    displayName: 'Long Rectangle Chassis',
    cost: 28,
    mass: 22,
    durability: 48,
    size: [4, 1, 2],
    stats: { stability: 8, drive: -1 },
  }),
  part({
    id: 'Body_Cylinder_Small',
    category: 'body',
    displayName: 'Small Cylinder Core',
    cost: 18,
    mass: 12,
    durability: 32,
    size: [1, 1, 1],
    stats: { chaos: 2, stability: 3 },
  }),
  part({
    id: 'Body_Cylinder_Large',
    category: 'body',
    displayName: 'Large Cylinder Core',
    cost: 32,
    mass: 24,
    durability: 58,
    size: [2, 2, 2],
    stats: { chaos: 3, stability: 6 },
  }),
  part({
    id: 'Body_Wedge',
    category: 'body',
    displayName: 'Wedge Chassis',
    cost: 20,
    mass: 14,
    durability: 36,
    size: [2, 1, 2],
    stats: { stability: 6, control: 2 },
    behavior: PART_BEHAVIORS.wedge,
  }),
  part({
    id: 'Body_Heavy_Block',
    category: 'body',
    displayName: 'Heavy Block Core',
    cost: 30,
    mass: 34,
    durability: 76,
    size: [2, 2, 2],
    stats: { armor: 2, stability: 12, drive: -2 },
  }),
  part({
    id: 'Body_Light_Frame',
    category: 'body',
    displayName: 'Light Frame',
    cost: 16,
    mass: 8,
    durability: 22,
    size: [2, 1, 2],
    stats: { drive: 2, stability: 2 },
  }),
  part({
    id: 'Frame_Strut',
    category: 'body',
    displayName: 'Frame Strut',
    cost: 4,
    mass: 2,
    durability: 10,
    size: [1, 1, 1],
    tags: ['structural', 'filler', 'connector'],
    stats: { stability: 1 },
    visual: {
      detailBudget: 'medium',
      materialRole: 'raw_metal',
      mountRole: 'exposed',
      visualFamily: 'body',
    },
  }),
  part({
    id: 'Mount_Plate',
    category: 'body',
    displayName: 'Mount Plate',
    cost: 5,
    mass: 3,
    durability: 14,
    size: [1, 1, 1],
    tags: ['structural', 'filler', 'mount'],
    stats: { stability: 1 },
    visual: {
      detailBudget: 'medium',
      materialRole: 'raw_metal',
      mountRole: 'top_mount',
      visualFamily: 'shield',
    },
  }),
  part({
    id: 'Spacer_Block',
    category: 'body',
    displayName: 'Spacer Block',
    cost: 3,
    mass: 2,
    durability: 8,
    size: [1, 1, 1],
    tags: ['structural', 'filler', 'spacer'],
    stats: { stability: 1 },
    visual: {
      detailBudget: 'low',
      materialRole: 'raw_metal',
      mountRole: 'exposed',
      visualFamily: 'body',
    },
  }),
  part({
    id: 'Wheel_Small',
    category: 'mobility',
    displayName: 'Small Wheel',
    cost: 6,
    mass: 2,
    durability: 8,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 7, traction: 2 },
  }),
  part({
    id: 'Wheel_Medium',
    category: 'mobility',
    displayName: 'Medium Wheel',
    cost: 9,
    mass: 4,
    durability: 14,
    size: [1.5, 1, 1],
    controls: { movement: true },
    stats: { drive: 6, traction: 4, stability: 1 },
  }),
  part({
    id: 'Wheel_Large',
    category: 'mobility',
    displayName: 'Large Wheel',
    cost: 12,
    mass: 7,
    durability: 20,
    size: [2, 1, 1],
    controls: { movement: true },
    stats: { drive: 5, traction: 6, stability: 2 },
  }),
  part({
    id: 'Wheel_Tank',
    category: 'mobility',
    displayName: 'Tank Wheel',
    cost: 14,
    mass: 9,
    durability: 24,
    size: [2, 1, 1],
    controls: { movement: true },
    stats: { drive: 4, traction: 9, stability: 4 },
  }),
  part({
    id: 'Wheel_Omni',
    category: 'mobility',
    displayName: 'Omni Wheel',
    cost: 14,
    mass: 4,
    durability: 10,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 9, traction: 3, control: 2, chaos: 1 },
  }),
  part({
    id: 'Wheel_Mecanum',
    category: 'mobility',
    displayName: 'Mecanum Wheel',
    cost: 16,
    mass: 5,
    durability: 12,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 8, traction: 3, control: 4, chaos: 2 },
  }),
  part({
    id: 'Wheel_Spiked',
    category: 'mobility',
    displayName: 'Spiked Wheel',
    cost: 13,
    mass: 6,
    durability: 16,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 5, traction: 7, weapon: 2, chaos: 1 },
  }),
  part({
    id: 'Tread_Light',
    category: 'mobility',
    displayName: 'Light Tread',
    cost: 14,
    mass: 8,
    durability: 22,
    size: [2, 1, 1],
    controls: { movement: true },
    stats: { drive: 5, traction: 9, stability: 4 },
  }),
  part({
    id: 'Tread_Heavy',
    category: 'mobility',
    displayName: 'Heavy Tread',
    cost: 20,
    mass: 14,
    durability: 36,
    size: [2, 2, 1],
    controls: { movement: true },
    stats: { drive: 3, traction: 13, stability: 7 },
  }),
  part({
    id: 'Leg_Spring',
    category: 'mobility',
    displayName: 'Spring Leg',
    cost: 10,
    mass: 4,
    durability: 10,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 5, traction: 2, chaos: 3 },
  }),
  part({
    id: 'Skid_Plate',
    category: 'mobility',
    displayName: 'Skid Plate',
    cost: 5,
    mass: 3,
    durability: 14,
    size: [2, 1, 1],
    stats: { traction: 1, armor: 1 },
  }),
  part({
    id: 'Weapon_Spinner_Small',
    category: 'weapon',
    displayName: 'Small Spinner',
    cost: 28,
    mass: 9,
    durability: 18,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 11, chaos: 3 },
    behavior: PART_BEHAVIORS.spinner,
  }),
  part({
    id: 'Weapon_Spinner_Large',
    category: 'weapon',
    displayName: 'Large Spinner',
    cost: 44,
    mass: 18,
    durability: 28,
    size: [2, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 18, chaos: 5, stability: -2 },
    behavior: PART_BEHAVIORS.spinner,
  }),
  part({
    id: 'Weapon_Hammer',
    category: 'weapon',
    displayName: 'Hammer',
    cost: 32,
    mass: 14,
    durability: 24,
    size: [1, 2, 1],
    controls: { weapon: true },
    stats: { weapon: 13, chaos: 2 },
  }),
  part({
    id: 'Weapon_Flipper',
    category: 'weapon',
    displayName: 'Flipper',
    cost: 30,
    mass: 10,
    durability: 22,
    size: [2, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 8, control: 8, stability: 1 },
    behavior: PART_BEHAVIORS.flipper,
  }),
  part({
    id: 'Weapon_Saw',
    category: 'weapon',
    displayName: 'Saw',
    cost: 26,
    mass: 8,
    durability: 16,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 10, control: 2 },
    behavior: PART_BEHAVIORS.saw,
  }),
  part({
    id: 'Weapon_Drill',
    category: 'weapon',
    displayName: 'Armor Drill',
    cost: 34,
    mass: 11,
    durability: 20,
    size: [1, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 12, control: 3, stability: -1 },
    behavior: PART_BEHAVIORS.saw,
  }),
  part({
    id: 'Weapon_Flail',
    category: 'weapon',
    displayName: 'Chain Flail',
    cost: 36,
    mass: 13,
    durability: 18,
    size: [1, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 14, chaos: 5, control: -1 },
    behavior: PART_BEHAVIORS.spinner,
  }),
  part({
    id: 'Weapon_ChainWhip',
    category: 'weapon',
    displayName: 'Chain Whip',
    cost: 24,
    mass: 7,
    durability: 12,
    size: [1, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 9, chaos: 5, control: -2 },
    behavior: PART_BEHAVIORS.spinner,
  }),
  part({
    id: 'Weapon_Shredder',
    category: 'weapon',
    displayName: 'Shredder Drum',
    cost: 42,
    mass: 16,
    durability: 24,
    size: [2, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 16, chaos: 6, control: -1, stability: -1 },
    behavior: PART_BEHAVIORS.spinner,
  }),
  part({
    id: 'Weapon_Net',
    category: 'weapon',
    displayName: 'Net Launcher',
    cost: 30,
    mass: 7,
    durability: 12,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 4, control: 12 },
    behavior: PART_BEHAVIORS.net,
  }),
  part({
    id: 'Weapon_Turret',
    category: 'weapon',
    displayName: 'Turret',
    cost: 38,
    mass: 13,
    durability: 20,
    size: [1, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 12, control: 5 },
    behavior: PART_BEHAVIORS.turret,
  }),
  part({
    id: 'Weapon_Laser',
    category: 'weapon',
    displayName: 'Laser Lance',
    cost: 36,
    mass: 8,
    durability: 14,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 9, control: 7 },
    spec: {
      kind: 'weapon',
      damage: 13,
      range: 14,
      cooldownTurns: 3,
      fireMode: 'direct',
      precision: 0.82,
    },
  }),
  part({
    id: 'Weapon_Spear',
    category: 'weapon',
    displayName: 'Spear',
    cost: 20,
    mass: 6,
    durability: 14,
    size: [1, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 7, control: 3 },
  }),
  part({
    id: 'Weapon_Grabber',
    category: 'weapon',
    displayName: 'Grabber',
    cost: 24,
    mass: 9,
    durability: 18,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 5, control: 9 },
    behavior: PART_BEHAVIORS.grabber,
  }),
  part({
    id: 'Weapon_Ram',
    category: 'weapon',
    displayName: 'Ram Plate',
    cost: 18,
    mass: 10,
    durability: 24,
    size: [2, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 6, armor: 2, stability: 2 },
    behavior: PART_BEHAVIORS.ram,
  }),
  part({
    id: 'Armor_Light',
    category: 'defense',
    displayName: 'Light Armor',
    cost: 8,
    mass: 4,
    durability: 18,
    size: [1, 1, 1],
    stats: { armor: 4 },
  }),
  part({
    id: 'Armor_Heavy',
    category: 'defense',
    displayName: 'Heavy Armor',
    cost: 16,
    mass: 12,
    durability: 34,
    size: [1, 1, 1],
    stats: { armor: 9, drive: -1 },
  }),
  part({
    id: 'Armor_Spiked',
    category: 'defense',
    displayName: 'Spiked Armor',
    cost: 14,
    mass: 8,
    durability: 24,
    size: [1, 1, 1],
    stats: { armor: 5, weapon: 2, chaos: 1 },
    behavior: PART_BEHAVIORS.spiked_armor,
  }),
  part({
    id: 'Armor_Front_Plate',
    category: 'defense',
    displayName: 'Front Plate',
    cost: 10,
    mass: 6,
    durability: 22,
    size: [2, 1, 1],
    stats: { armor: 5, control: 1 },
    behavior: PART_BEHAVIORS.front_plate,
  }),
  part({
    id: 'Armor_Cage',
    category: 'defense',
    displayName: 'Cage',
    cost: 18,
    mass: 10,
    durability: 30,
    size: [2, 2, 2],
    stats: { armor: 7, stability: 2 },
  }),
  part({
    id: 'Armor_Shield',
    category: 'defense',
    displayName: 'Shield',
    cost: 15,
    mass: 8,
    durability: 26,
    size: [2, 1, 1],
    stats: { armor: 7, control: 2 },
  }),
  part({
    id: 'Armor_Tile',
    category: 'defense',
    displayName: 'Armor Tile',
    cost: 6,
    mass: 3,
    durability: 16,
    size: [1, 1, 1],
    tags: ['structural', 'filler', 'armor'],
    stats: { armor: 3 },
    visual: {
      detailBudget: 'medium',
      materialRole: 'painted_armor',
      mountRole: 'exposed',
      visualFamily: 'armor',
    },
  }),
  part({
    id: 'Armor_Reactive',
    category: 'defense',
    displayName: 'Reactive Armor',
    cost: 22,
    mass: 9,
    durability: 24,
    size: [1, 1, 1],
    stats: { armor: 6, chaos: 4 },
    behavior: PART_BEHAVIORS.reactive_armor,
  }),
  part({
    id: 'Armor_Rail',
    category: 'defense',
    displayName: 'Rail Armor',
    cost: 12,
    mass: 7,
    durability: 24,
    size: [2, 1, 1],
    stats: { armor: 4, control: 2 },
  }),
  part({
    id: 'Armor_CornerGuard',
    category: 'defense',
    displayName: 'Corner Guard',
    cost: 9,
    mass: 5,
    durability: 20,
    size: [1, 1, 1],
    stats: { armor: 4, stability: 1 },
  }),
  part({
    id: 'Armor_FlexPanel',
    category: 'defense',
    displayName: 'Flex Panel',
    cost: 13,
    mass: 6,
    durability: 18,
    size: [2, 1, 1],
    stats: { armor: 4, chaos: 1 },
  }),
  part({
    id: 'Armor_HeavyWedge',
    category: 'defense',
    displayName: 'Heavy Wedge Armor',
    cost: 18,
    mass: 11,
    durability: 32,
    size: [2, 1, 1],
    stats: { armor: 7, control: 2, drive: -1 },
    behavior: PART_BEHAVIORS.front_plate,
  }),
  part({
    id: 'Utility_Booster',
    category: 'utility',
    displayName: 'Booster',
    cost: 18,
    mass: 5,
    durability: 10,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { drive: 5, chaos: 2 },
    behavior: PART_BEHAVIORS.booster,
  }),
  part({
    id: 'Utility_Gyro',
    category: 'utility',
    displayName: 'Gyro',
    cost: 16,
    mass: 5,
    durability: 12,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { stability: 8 },
    behavior: PART_BEHAVIORS.gyro,
  }),
  part({
    id: 'Utility_EnergyCore',
    category: 'utility',
    displayName: 'Energy Core',
    cost: 24,
    mass: 5,
    durability: 12,
    size: [1, 1, 1],
    stats: { control: 2, drive: 1, stability: 2 },
  }),
  part({
    id: 'Utility_Battery',
    category: 'utility',
    displayName: 'Battery Pack',
    cost: 12,
    mass: 5,
    durability: 12,
    size: [1, 1, 1],
    stats: { stability: 2, control: 1 },
  }),
  part({
    id: 'Utility_CoolantTank',
    category: 'utility',
    displayName: 'Coolant Tank',
    cost: 14,
    mass: 5,
    durability: 11,
    size: [1, 1, 1],
    stats: { stability: 2, weapon: 1 },
  }),
  part({
    id: 'Utility_FuelTank',
    category: 'utility',
    displayName: 'Fuel Tank',
    cost: 12,
    mass: 6,
    durability: 9,
    size: [1, 1, 1],
    stats: { drive: 2, chaos: 2 },
  }),
  part({
    id: 'Utility_AIModule',
    category: 'utility',
    displayName: 'AI Module',
    cost: 26,
    mass: 3,
    durability: 8,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 7, chaos: 1 },
    behavior: PART_BEHAVIORS.sensor,
  }),
  part({
    id: 'Utility_Magnet',
    category: 'utility',
    displayName: 'Magnet',
    cost: 20,
    mass: 8,
    durability: 14,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 7, chaos: 1 },
    behavior: PART_BEHAVIORS.magnet,
  }),
  part({
    id: 'Utility_Anchor',
    category: 'utility',
    displayName: 'Anchor',
    cost: 12,
    mass: 9,
    durability: 16,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { traction: 8, stability: 4, drive: -2 },
    behavior: PART_BEHAVIORS.anchor,
  }),
  part({
    id: 'Utility_RepairKit',
    category: 'utility',
    displayName: 'Repair Kit',
    cost: 22,
    mass: 4,
    durability: 8,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { armor: 1 },
    behavior: PART_BEHAVIORS.repair_kit,
  }),
  part({
    id: 'Utility_Smoke',
    category: 'utility',
    displayName: 'Smoke Emitter',
    cost: 14,
    mass: 3,
    durability: 8,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 3, chaos: 4 },
    behavior: PART_BEHAVIORS.smoke,
  }),
  part({
    id: 'Utility_Sensor',
    category: 'utility',
    displayName: 'Sensor',
    cost: 10,
    mass: 2,
    durability: 8,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 4 },
    behavior: PART_BEHAVIORS.sensor,
  }),
  part({
    id: 'Utility_Radar',
    category: 'utility',
    displayName: 'Radar Dish',
    cost: 18,
    mass: 4,
    durability: 10,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 6 },
    behavior: PART_BEHAVIORS.sensor,
  }),
  part({
    id: 'Utility_DroneController',
    category: 'utility',
    displayName: 'Drone Controller',
    cost: 28,
    mass: 6,
    durability: 12,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 6, chaos: 2 },
    behavior: PART_BEHAVIORS.drone_controller,
  }),
  part({
    id: 'Counterweight',
    category: 'utility',
    displayName: 'Counterweight',
    cost: 5,
    mass: 10,
    durability: 18,
    size: [1, 1, 1],
    tags: ['structural', 'filler', 'ballast'],
    stats: { stability: 3, drive: -1 },
    visual: {
      detailBudget: 'low',
      materialRole: 'raw_metal',
      mountRole: 'internal',
      visualFamily: 'body',
    },
  }),
  part({
    id: 'Style_Flag',
    category: 'style',
    displayName: 'Flag',
    cost: 12,
    mass: 1,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 3 },
  }),
  part({
    id: 'Style_Antenna',
    category: 'style',
    displayName: 'Antenna',
    cost: 3,
    mass: 1,
    durability: 3,
    size: [1, 1, 1],
    stats: { style: 2, control: 1 },
  }),
  part({
    id: 'Style_BladeAntenna',
    category: 'style',
    displayName: 'Blade Antenna',
    cost: 4,
    mass: 1,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 3, control: 1 },
  }),
  part({
    id: 'Style_DragonHead',
    category: 'style',
    displayName: 'Dragon Head',
    cost: 24,
    mass: 4,
    durability: 8,
    size: [1, 1, 1],
    stats: { style: 7, chaos: 2 },
  }),
  part({
    id: 'Style_Spikes',
    category: 'style',
    displayName: 'Style Spikes',
    cost: 16,
    mass: 2,
    durability: 8,
    size: [1, 1, 1],
    stats: { style: 4, weapon: 1 },
  }),
  part({
    id: 'Style_Horns',
    category: 'style',
    displayName: 'Horns',
    cost: 6,
    mass: 2,
    durability: 6,
    size: [1, 1, 1],
    stats: { style: 4, chaos: 1 },
  }),
  part({
    id: 'Style_Tail',
    category: 'style',
    displayName: 'Tail',
    cost: 7,
    mass: 3,
    durability: 6,
    size: [1, 1, 1],
    stats: { style: 4, chaos: 1, stability: -1 },
  }),
  part({
    id: 'Style_Wings',
    category: 'style',
    displayName: 'Wings',
    cost: 18,
    mass: 3,
    durability: 6,
    size: [2, 1, 1],
    stats: { style: 6, stability: -1 },
  }),
  part({
    id: 'Style_Neon',
    category: 'style',
    displayName: 'Neon Kit',
    cost: 16,
    mass: 1,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 5 },
  }),
  part({
    id: 'Style_LightBar',
    category: 'style',
    displayName: 'Light Bar',
    cost: 15,
    mass: 1,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 4, control: 1 },
  }),
  part({
    id: 'Style_TopHat',
    category: 'style',
    displayName: 'Top Hat',
    cost: 5,
    mass: 2,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 5 },
  }),
  part({
    id: 'Style_CowboyHat',
    category: 'style',
    displayName: 'Cowboy Hat',
    cost: 5,
    mass: 2,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 5, chaos: 1 },
  }),
  part({
    id: 'Style_Crown',
    category: 'style',
    displayName: 'Crown',
    cost: 22,
    mass: 2,
    durability: 5,
    size: [1, 1, 1],
    stats: { style: 8 },
  }),
  part({
    id: 'Style_TrashCan',
    category: 'style',
    displayName: 'Trash Can Shell',
    cost: 14,
    mass: 5,
    durability: 10,
    size: [1, 1, 1],
    stats: { style: 4, armor: 1, chaos: 2 },
  }),
]

export const PART_BY_ID = new Map(
  PART_CATALOG.map((definition) => [definition.id, definition]),
)

export function getPart(partId: string): PartDefinition | undefined {
  return PART_BY_ID.get(partId)
}
