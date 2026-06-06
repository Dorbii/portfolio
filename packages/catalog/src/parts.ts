import type {
  PartCategory,
  PartDefinition,
  PartMaterialRole,
  PartMountRole,
  PartStats,
  PartVisualDescriptor,
  PartVisualFamily,
  Vector3,
} from '../../schemas/src/index.js'
import { PART_BEHAVIORS } from '../../sim/src/partBehaviors.js'

type PartInput = {
  id: string
  category: PartCategory
  displayName: string
  cost: number
  mass: number
  durability: number
  size: Vector3
  tags?: string[]
  stats?: PartStats
  visual?: PartVisualDescriptor
  behavior?: PartDefinition['behavior']
  controls?: PartDefinition['controls']
}

function part(input: PartInput): PartDefinition {
  return {
    tags: [],
    stats: {},
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
  if (input.id.includes('Spinner')) return 'spinner'
  if (input.id.includes('Saw')) return 'saw'
  if (input.id.includes('Hammer')) return 'hammer'
  if (input.id.includes('Net')) return 'net'
  if (input.id.includes('Turret')) return 'turret'
  if (input.id.includes('Spear')) return 'spear'
  if (input.id.includes('Flipper')) return 'flipper'
  if (input.id.includes('Grabber')) return 'grabber'
  if (input.id.includes('Ram')) return 'ram'
  if (input.id.includes('Tread')) return 'tread'
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
  if (input.id.includes('Sensor')) return 'sensor'
  if (input.id.includes('RepairKit')) return 'battery'
  if (input.id.includes('Drone')) return 'drone'

  return 'body'
}

function inferMaterialRole(input: PartInput): PartMaterialRole {
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
    id: 'Style_Flag',
    category: 'style',
    displayName: 'Flag',
    cost: 3,
    mass: 1,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 3 },
  }),
  part({
    id: 'Style_DragonHead',
    category: 'style',
    displayName: 'Dragon Head',
    cost: 9,
    mass: 4,
    durability: 8,
    size: [1, 1, 1],
    stats: { style: 7, chaos: 2 },
  }),
  part({
    id: 'Style_Spikes',
    category: 'style',
    displayName: 'Style Spikes',
    cost: 6,
    mass: 2,
    durability: 8,
    size: [1, 1, 1],
    stats: { style: 4, weapon: 1 },
  }),
  part({
    id: 'Style_Wings',
    category: 'style',
    displayName: 'Wings',
    cost: 8,
    mass: 3,
    durability: 6,
    size: [2, 1, 1],
    stats: { style: 6, stability: -1 },
  }),
  part({
    id: 'Style_Neon',
    category: 'style',
    displayName: 'Neon Kit',
    cost: 7,
    mass: 1,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 5 },
  }),
  part({
    id: 'Style_Crown',
    category: 'style',
    displayName: 'Crown',
    cost: 10,
    mass: 2,
    durability: 5,
    size: [1, 1, 1],
    stats: { style: 8 },
  }),
  part({
    id: 'Style_TrashCan',
    category: 'style',
    displayName: 'Trash Can Shell',
    cost: 5,
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
