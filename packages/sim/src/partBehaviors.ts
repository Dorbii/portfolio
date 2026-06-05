import type { PartBehavior } from '../../schemas/src/index.js'

export const PART_BEHAVIOR_IDS = [
  'wedge',
  'spinner',
  'net',
  'ram',
  'flipper',
  'saw',
  'turret',
  'grabber',
  'front_plate',
  'spiked_armor',
  'reactive_armor',
  'booster',
  'gyro',
  'magnet',
  'anchor',
  'repair_kit',
  'smoke',
  'sensor',
  'drone_controller',
] as const

export type PartBehaviorId = (typeof PART_BEHAVIOR_IDS)[number]

export type PartBehaviorDefinition = Readonly<PartBehavior & { id: PartBehaviorId }>

type PartBehaviorCatalog = {
  readonly [Id in PartBehaviorId]: Readonly<PartBehavior & { id: Id }>
}

export const PART_BEHAVIORS = {
  wedge: { id: 'wedge', slot: 'body' },
  spinner: { id: 'spinner', slot: 'weapon' },
  net: { id: 'net', slot: 'weapon' },
  ram: { id: 'ram', slot: 'weapon' },
  flipper: { id: 'flipper', slot: 'weapon' },
  saw: { id: 'saw', slot: 'weapon' },
  turret: { id: 'turret', slot: 'weapon' },
  grabber: { id: 'grabber', slot: 'weapon' },
  front_plate: { id: 'front_plate', slot: 'defense' },
  spiked_armor: { id: 'spiked_armor', slot: 'defense' },
  reactive_armor: { id: 'reactive_armor', slot: 'defense' },
  booster: { id: 'booster', slot: 'utility' },
  gyro: { id: 'gyro', slot: 'utility' },
  magnet: { id: 'magnet', slot: 'utility' },
  anchor: { id: 'anchor', slot: 'utility' },
  repair_kit: { id: 'repair_kit', slot: 'utility' },
  smoke: { id: 'smoke', slot: 'utility' },
  sensor: { id: 'sensor', slot: 'utility' },
  drone_controller: { id: 'drone_controller', slot: 'utility' },
} as const satisfies PartBehaviorCatalog
