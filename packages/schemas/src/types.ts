export const TEAM_ROLES = ['red', 'blue'] as const

export type TeamRole = (typeof TEAM_ROLES)[number]

export const TEAM_LOGO_MARKS = [
  'shield',
  'bolt',
  'gear',
  'star',
  'wedge',
  'crosshair',
] as const

export type TeamLogoMark = (typeof TEAM_LOGO_MARKS)[number]

export type TeamIdentity = {
  name: string
  primaryColor: string
  logo?: {
    mark: TeamLogoMark
    initials?: string
  }
}

export type TeamEconomySummary = {
  wins: number
  losses: number
  winStreak: number
}

export const SESSION_PHASES = [
  'created',
  'waiting_for_agents',
  'round_setup',
  'submission_phase',
  'submissions_locked',
  'combat_turn',
  'combat_resolved',
  'replay_phase',
  'round_review',
  'session_complete',
  'expired',
] as const

export type SessionPhase = (typeof SESSION_PHASES)[number]

export const PART_CATEGORIES = [
  'body',
  'mobility',
  'weapon',
  'defense',
  'utility',
  'style',
] as const

export type PartCategory = (typeof PART_CATEGORIES)[number]

export type PartVisualFamily =
  | 'anchor'
  | 'ai_module'
  | 'antenna'
  | 'armor'
  | 'battery'
  | 'blade_antenna'
  | 'body'
  | 'booster'
  | 'chain_whip'
  | 'coolant_tank'
  | 'corner_guard'
  | 'drone'
  | 'drill'
  | 'energy_core'
  | 'flex_panel'
  | 'flipper'
  | 'flail'
  | 'fuel_tank'
  | 'grabber'
  | 'gyro'
  | 'hammer'
  | 'hat'
  | 'heavy_wedge'
  | 'horns'
  | 'leg'
  | 'light_bar'
  | 'magnet'
  | 'net'
  | 'radar'
  | 'ram'
  | 'rail_armor'
  | 'saw'
  | 'sensor'
  | 'shield'
  | 'shredder'
  | 'smoke'
  | 'spear'
  | 'spinner'
  | 'tail'
  | 'tread'
  | 'turret'
  | 'wedge'
  | 'wheel'

export type PartMaterialRole =
  | 'painted_armor'
  | 'raw_metal'
  | 'weapon_steel'
  | 'black_rubber'
  | 'glass_emissive'
  | 'electrical_casing'
  | 'hazard_marked'
  | 'cosmetic_shell'

export type PartMountRole =
  | 'front_mount'
  | 'rear_mount'
  | 'side_mount'
  | 'top_mount'
  | 'internal'
  | 'exposed'

export type PartVisualDescriptor = {
  detailBudget: 'low' | 'medium' | 'high'
  materialRole: PartMaterialRole
  mountRole: PartMountRole
  visualFamily: PartVisualFamily
}

export type Vector3 = [number, number, number]

export type PartStats = {
  armor?: number
  chaos?: number
  control?: number
  drive?: number
  stability?: number
  style?: number
  traction?: number
  weapon?: number
}

export type PartBehaviorSlot = Extract<PartCategory, 'body' | 'defense' | 'weapon' | 'utility'>

export type PartBehavior = {
  id: string
  slot: PartBehaviorSlot
}

export type PartDefinition = {
  id: string
  category: PartCategory
  displayName: string
  cost: number
  mass: number
  durability: number
  size: Vector3
  tags: string[]
  stats: PartStats
  visual: PartVisualDescriptor
  behavior?: PartBehavior
  controls?: {
    movement?: boolean
    utility?: boolean
    weapon?: boolean
  }
}

export type InventoryItem = {
  partId: string
  quantity: number
}

export type Purchase = {
  partId: string
  quantity: number
}

export type BlueprintBlock = {
  id: string
  partId: string
  position: Vector3
  rotation: Vector3
  label?: string
}

export type BotBlueprint = {
  name: string
  blocks: BlueprintBlock[]
  rationale?: string
}

export const MOVEMENT_COMMANDS = [
  'forward',
  'backward',
  'dash_forward',
  'dash_backward',
  'strafe_left',
  'strafe_right',
  'circle_left',
  'circle_right',
  'turn_left',
  'turn_right',
  'brake',
] as const

export type MovementCommand = (typeof MOVEMENT_COMMANDS)[number]

export const WEAPON_COMMANDS = ['fire', 'hold'] as const

export type WeaponCommand = (typeof WEAPON_COMMANDS)[number]

export const UTILITY_COMMANDS = ['activate', 'hold'] as const

export type UtilityCommand = (typeof UTILITY_COMMANDS)[number]

export type GeneratedControls = {
  movement: MovementCommand[]
  weaponA?: WeaponCommand[]
  weaponB?: WeaponCommand[]
  utility?: UtilityCommand[]
}

export type TurnCommand = {
  tick: number
  move?: MovementCommand
  weaponA?: WeaponCommand
  weaponB?: WeaponCommand
  utility?: UtilityCommand
}

export type TurnCommandSubmission = {
  action: 'submit_turn_command'
  tick: number
  move?: MovementCommand
  weaponA?: WeaponCommand
  weaponB?: WeaponCommand
  utility?: UtilityCommand
}

export const TACTIC_STYLES = [
  'balanced',
  'aggressive',
  'defensive',
  'control',
  'evasive',
] as const

export type TacticStyle = (typeof TACTIC_STYLES)[number]

export const TARGET_PRIORITIES = [
  'closest',
  'weakest',
  'strongest',
  'weapons',
  'mobility',
  'utility',
  'body',
] as const

export type TargetPriority = (typeof TARGET_PRIORITIES)[number]

export const PREFERRED_RANGES = ['contact', 'close', 'mid', 'long'] as const

export type PreferredRange = (typeof PREFERRED_RANGES)[number]

export const MOVEMENT_POLICIES = [
  'hold_ground',
  'close',
  'kite',
  'circle',
  'bait_hazard',
] as const

export type MovementPolicy = (typeof MOVEMENT_POLICIES)[number]

export const WEAPON_CADENCES = [
  'opportunistic',
  'sustained',
  'burst',
  'hold_fire',
] as const

export type WeaponCadence = (typeof WEAPON_CADENCES)[number]

export const HAZARD_PREFERENCES = ['avoid', 'neutral', 'bait', 'force'] as const

export type HazardPreference = (typeof HAZARD_PREFERENCES)[number]

export type BotTactics = {
  style?: TacticStyle
  targetPriority?: TargetPriority
  preferredRange?: PreferredRange
  movementPolicy?: MovementPolicy
  aggression?: number
  retreatAtHealthPct?: number
  weaponCadence?: WeaponCadence
  hazardPreference?: HazardPreference
}

export type NormalizedBotTactics = Required<BotTactics>

export const AGENT_CHAT_MESSAGE_KINDS = [
  'taunt',
  'observation',
  'strategy',
  'reflection',
] as const

export const PUBLIC_AGENT_CHAT_MESSAGE_KINDS = [
  'taunt',
  'observation',
  'strategy',
] as const

export type AgentChatMessageKind = (typeof AGENT_CHAT_MESSAGE_KINDS)[number]

export type AgentChatMessageRequest = {
  message: string
  kind?: AgentChatMessageKind
}

export type RoundPlanSubmissionV2 = {
  action: 'submit_round_plan'
  schemaVersion: 2
  purchases: Purchase[]
  blueprint: BotBlueprint
  tactics: BotTactics
  rationale?: string
  chat?: AgentChatMessageRequest[]
}

export type RoundPlanSubmission = RoundPlanSubmissionV2

export type NormalizedRoundPlanSubmission = {
  action: 'submit_round_plan'
  schemaVersion: 2
  purchases: Purchase[]
  blueprint: BotBlueprint
  tactics: NormalizedBotTactics
  rationale?: string
  chat?: AgentChatMessageRequest[]
}

export type ArenaConfig = {
  name: string
  width: number
  height: number
  activeHazards: string[]
  topology?: ArenaTopologyDefinition
}

export type ArenaGridCell = {
  x: number
  z: number
}

export type ArenaGridDefinition = {
  cellSize: number
}

export type ArenaZoneShape =
  | {
      kind: 'circle'
      center: [number, number]
      radius: number
    }
  | {
      kind: 'rect'
      center: [number, number]
      size: [number, number]
    }

export type ArenaSpawnZone = {
  role: TeamRole
  shape: ArenaZoneShape
}

export type ArenaHazardDefinition = {
  id: string
  type: string
  shape: ArenaZoneShape
  damage: number
  tags?: string[]
}

export type ArenaTerrainDefinition = {
  id: string
  type: string
  shape: ArenaZoneShape
  tags?: string[]
}

export type ArenaObstacleDefinition = {
  id: string
  type: string
  shape: ArenaZoneShape
  blocksMovement: boolean
  tags?: string[]
}

export type ArenaTopologyDefinition = {
  grid: ArenaGridDefinition
  spawnZones: ArenaSpawnZone[]
  hazards: ArenaHazardDefinition[]
  terrain: ArenaTerrainDefinition[]
  obstacles: ArenaObstacleDefinition[]
}

export type ArenaHazardThreat = {
  id: string
  type: string
  cell: ArenaGridCell
  position: Vector3
  distance: number
  inside: boolean
  damage: number
}

export const DEFAULT_ARENA_CONFIG: ArenaConfig = {
  name: 'Compact Box',
  width: 24,
  height: 16,
  activeHazards: ['floor_saw'],
  topology: {
    grid: { cellSize: 1 },
    spawnZones: [
      {
        role: 'red',
        shape: { kind: 'rect', center: [-6, 0], size: [3, 3] },
      },
      {
        role: 'blue',
        shape: { kind: 'rect', center: [6, 0], size: [3, 3] },
      },
    ],
    hazards: [
      {
        id: 'floor_saw_center',
        type: 'floor_saw',
        shape: { kind: 'circle', center: [0, 0], radius: 1.2 },
        damage: 6,
        tags: ['center', 'contact_damage'],
      },
    ],
    terrain: [],
    obstacles: [],
  },
}

export type BotCombatStats = {
  armor: number
  chaos: number
  control: number
  durability: number
  footprint: number
  mass: number
  mobility: number
  stability: number
  style: number
  traction: number
  weaponThreat: number
}

export type CombatBotSnapshot = {
  role: TeamRole
  position: Vector3
  health: number
  maxHealth: number
  partHealth: Record<string, number>
  stats: BotCombatStats
  hasUtilityControl: boolean
  hasWeaponControl: boolean
  weaponSlotCount: number
  weaponReach: number
  statuses: string[]
  cooldowns: Record<string, number>
  charges: Record<string, number>
}

export type CombatTurnSnapshot = {
  tick: number
  arena: ArenaConfig
  distance: number
  hardMaxTicks: number
  recentEvents: string[]
  red: CombatBotSnapshot
  blue: CombatBotSnapshot
}

export type SessionChatMessage = {
  id: string
  at: string
  round: number
  phase: SessionPhase
  role: TeamRole
  agentName?: string
  kind: AgentChatMessageKind
  message: string
}

export type ValidationIssue = {
  code: string
  path: string
  message: string
}

export type ValidationResult =
  | {
      ok: true
    }
  | {
      ok: false
      issues: ValidationIssue[]
    }
