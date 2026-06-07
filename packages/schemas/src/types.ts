export const TEAM_ROLES = ['red', 'blue'] as const

export type TeamRole = (typeof TEAM_ROLES)[number]

export const TEAM_LOGO_ASSET_KINDS = [
  'image_url',
  'data_url',
  'asset_id',
] as const

export type TeamLogoAssetKind = (typeof TEAM_LOGO_ASSET_KINDS)[number]

export type TeamLogoAsset = {
  kind: TeamLogoAssetKind
  url?: string
  dataUrl?: string
  assetId?: string
  altText?: string
}

export type TeamIdentity = {
  name: string
  colorHex: string
  logoPrompt?: string
  logoAsset?: TeamLogoAsset
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
  | 'armor'
  | 'battery'
  | 'body'
  | 'booster'
  | 'drone'
  | 'drill'
  | 'energy_core'
  | 'flipper'
  | 'flail'
  | 'grabber'
  | 'gyro'
  | 'hammer'
  | 'leg'
  | 'light_bar'
  | 'magnet'
  | 'net'
  | 'ram'
  | 'saw'
  | 'sensor'
  | 'shield'
  | 'smoke'
  | 'spear'
  | 'spinner'
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

export type PartFootprint = {
  size: Vector3
  minY: number
  groundContact: 'required' | 'allowed' | 'none'
}

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

export type PartRarity = 'normal' | 'rare' | 'epic' | 'legendary'

export type PartMountKind =
  | 'side_socket'
  | 'top_socket'
  | 'surface'
  | 'sphere'
  | 'rim'
  | 'internal_slot'

export type PartMountMotion =
  | 'static'
  | 'inherits_parent_spin'
  | 'inherits_parent_swing'

export type PartCollisionPolicy =
  | 'allow_clip_v1'
  | 'reject_overlap'
  | 'internal_only'

export type PartMount = {
  id: string
  kind: PartMountKind
  accepts: PartCategory[]
  motion: PartMountMotion
  collisionPolicy: PartCollisionPolicy
  rotationOptions: number[]
  sectors?: string[]
}

export type WeaponSpec = {
  kind: 'weapon'
  damage: number
  range: number
  cooldownTurns: number
  ammo?: number
  fireMode: 'direct' | 'arc' | 'sweep' | 'contact'
  precision: number
}

export type MobilitySpec = {
  kind: 'mobility'
  moveBudget: number
  traction: number
  stability: number
  turnRate: number
}

export type ArmorSpec = {
  kind: 'armor'
  armor: number
  coverage: number
}

export type StructureSpec = {
  kind: 'structure'
  integrity: number
  connectorStrength: number
}

export type UtilitySpec = {
  kind: 'utility'
  effect: string
  control: number
}

export type PowerSpec = {
  kind: 'power'
  output: number
  capacity: number
}

export type PartSpec =
  | WeaponSpec
  | MobilitySpec
  | ArmorSpec
  | StructureSpec
  | UtilitySpec
  | PowerSpec

export type PartEffectTrigger = 'activated' | 'on_hit' | 'on_damage' | 'on_flip' | 'passive'

export type PartEffectTarget = 'self' | 'opponent' | 'area' | 'movement' | 'weapon'

export type PartReplayCue = 'fire_breath' | 'spark_burst' | 'wing_buffet' | 'neon_blind' | 'crown_command' | 'trash_shield' | 'self_right' | 'tactical_assist'

export type PartEffect = {
  id: string
  kind: 'signature' | 'utility'
  trigger: PartEffectTrigger
  cooldownTurns: number
  charges?: number
  target: PartEffectTarget
  params: Record<string, number | string | boolean>
  replayCue?: PartReplayCue
  debriefSignals: string[]
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
  rarity: PartRarity
  cost: number
  mass: number
  durability: number
  size: Vector3
  tags: string[]
  stats: PartStats
  footprint: PartFootprint
  mounts: PartMount[]
  spec: PartSpec
  signatureEffect?: PartEffect
  mechanics?: PartEffect[]
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
  parentInstanceId?: string
  mountId?: string
  mountKind?: PartMountKind
  mountMotion?: PartMountMotion
  mountCollisionPolicy?: PartCollisionPolicy
  mountSector?: string
  signatureEffectActive?: boolean
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

export type GridCoord = {
  x: number
  z: number
}

export type BotPose = {
  anchor: GridCoord
  facing: 'north' | 'south' | 'east' | 'west'
}

export const GAME_MASTER_PHASES = [
  'wait_for_opponent_claim',
  'choose_loadout',
  'wait_for_opponent_loadout',
  'combat_turn',
  'wait_for_opponent_turn',
  'replay_phase',
  'round_review',
  'session_complete',
  'expired',
] as const

export type GameMasterPhase = (typeof GAME_MASTER_PHASES)[number]

export const GAME_MASTER_NEXT_ACTIONS = [
  'claim_role',
  'build_bot',
  'choose_turn',
  'submit_reflection',
  'wait_for_opponent_claim',
  'wait_for_opponent_loadout',
  'wait_for_opponent_turn',
  'wait_for_debrief',
  'view_replay',
  'session_complete',
  'stop',
] as const

export type GameMasterNextAction = (typeof GAME_MASTER_NEXT_ACTIONS)[number]

export const GAME_MASTER_ACTION_KINDS = [
  'select_loadout',
  'choose_part',
  'choose_attach_target',
  'choose_mount',
  'choose_rotation',
  'buy_part',
  'place_part',
  'remove_part',
  'remove_subtree',
  'move_part',
  'rotate_part',
  'confirm_loadout',
  'move',
  'attack',
  'move_and_attack',
  'use_utility',
  'hold',
  'ready',
] as const

export type GameMasterActionKind = (typeof GAME_MASTER_ACTION_KINDS)[number]

export type AgentResourcesView = {
  gold?: number
  remainingGold?: number
  partLimitRemaining?: number
  [key: string]: unknown
}

export type CatalogSnapshotView = {
  version: string
  digest?: string
  parts: PartDefinition[] | Record<string, unknown>
  [key: string]: unknown
}

export type CatalogStoreSlotKind =
  | 'weapon'
  | 'utility'
  | 'armor'
  | 'advanced_mobility'
  | 'wildcard'

export type CatalogStoreSlot = {
  id: string
  kind: CatalogStoreSlotKind
  partId: string
}

export type CatalogStoreView = {
  id: string
  seed: string
  role: TeamRole
  foundationPartIds: string[]
  slots: CatalogStoreSlot[]
  offeredPartIds: string[]
}

export type AgentBoardView = {
  arena: ArenaConfig
  self?: BotPose
  opponent?: BotPose
  blockedCells?: GridCoord[]
  hazardCells?: GridCoord[]
  [key: string]: unknown
}

export type AgentVisibleCombatState = {
  self: BotCombatState
  opponent: BotCombatState
  turn?: number
  [key: string]: unknown
}

export const LOADOUT_BUILD_STEPS = [
  'choose_part',
  'choose_attach_target',
  'choose_mount',
  'choose_rotation',
  'ready_to_confirm',
] as const

export type LoadoutBuildStep = (typeof LOADOUT_BUILD_STEPS)[number]

export type LoadoutBuildState = {
  step: LoadoutBuildStep
  catalogVersion: string
  selectedPartId?: string
  selectedMovingPartId?: string
  selectedAttachTargetId?: string
  selectedMount?: string
  selectedMountKind?: PartMountKind
  selectedMountMotion?: PartMountMotion
  selectedMountCollisionPolicy?: PartCollisionPolicy
  selectedMountSector?: string
  selectedAttachCell?: GridCoord
  selectedRotation?: number
  currentDesign: BotDesignSnapshot
}

export type SubmitInstruction = {
  method: 'POST'
  path: string
  body: {
    action: 'submit_game_action'
    actionSetId: string
    decisionVersion: number
    actionId: string
    publicMessage?: string
  }
}

export type GameMasterLegalAction = {
  id: string
  kind: GameMasterActionKind
  label: string
  summary: string
  catalogDigest?: string
  catalogRefs?: string[]
  requirements?: string[]
  preview?: {
    basis: 'current_snapshot'
    outcome: 'estimated' | 'guaranteed'
    path?: GridCoord[]
    finalPose?: BotPose
    target?: GridCoord
    currentLineOfSight?: boolean
    expectedRangeIfOpponentHolds?: number
    hazardExposure?: number
    riskTags?: string[]
  }
}

export type GameMasterPacket = {
  sessionId: string
  role: TeamRole
  phase: GameMasterPhase
  nextAction: GameMasterNextAction
  round: number
  fightId?: string
  turnId?: string
  decisionVersion: number
  eventVersion: number
  actionSetId?: string
  catalogDigest?: string
  instruction: string
  resources?: AgentResourcesView
  catalog?: CatalogSnapshotView
  store?: CatalogStoreView
  buildState?: LoadoutBuildState
  board?: AgentBoardView
  visibleState?: AgentVisibleCombatState
  legalActions: GameMasterLegalAction[]
  sharedDebrief?: SharedDebrief
  submit?: SubmitInstruction
}

export type GameMasterActionSubmission = {
  action: 'submit_game_action'
  actionSetId: string
  decisionVersion: number
  actionId: string
  publicMessage?: string
}

export type CanonicalGameAction = {
  id: string
  kind: GameMasterActionKind
  role: TeamRole
  payload: Record<string, unknown>
}

export type ActiveActionSet = {
  actionSetId: string
  role: TeamRole
  phase: GameMasterPhase
  round: number
  fightId?: string
  turnId?: string
  decisionVersion: number
  catalogVersion: string
  catalogDigest?: string
  arenaVersion: string
  catalogStore?: CatalogStoreView
  createdAt: string
  expiresAt?: string
  actions: Record<string, CanonicalGameAction>
  locked?: {
    actionId: string
    submittedAt: string
    requestHash: string
  }
}

export type BotPartSnapshot = {
  instanceId: string
  partId: string
  cell?: GridCoord
  rotation?: number
  parentInstanceId?: string
  mountId?: string
  mountKind?: PartMountKind
  mountMotion?: PartMountMotion
  mountCollisionPolicy?: PartCollisionPolicy
  mountSector?: string
  signatureEffectActive?: boolean
  health?: number
  detached?: boolean
}

export type BotDesignSnapshot = {
  name: string
  parts: BotPartSnapshot[]
  rootInstanceId?: string
  activeSignaturePartInstanceId?: string
}

export type BotCombatState = {
  pose?: BotPose
  health: number
  maxHealth: number
  parts?: BotPartSnapshot[]
  statuses?: string[]
}

export type BotDetailedSnapshot = BotDesignSnapshot & {
  combat: BotCombatState
}

export type PostFightAgentReflection = {
  action: 'submit_post_fight_reflection'
  fightId: string
  role: TeamRole
  decisionVersion: number
  claims: {
    perceivedWinReason?: string
    perceivedLossReason?: string
    ownWeaknesses: string[]
    opponentThreats: string[]
    suggestedDesignChanges: string[]
    suggestedTacticalChanges: string[]
  }
  confidence: 'low' | 'medium' | 'high'
}

export type DebriefEvidence = {
  type: string
  summary: string
  value?: number | string | boolean
  source?: string
}

export type SharedDebrief = {
  debriefId: string
  sourceSessionId: string
  fightIds: string[]
  summary: string
  championImprovementHints: string[]
  challengerCounterplayHints: string[]
  evidence: DebriefEvidence[]
}

export type WeaponUseStats = {
  weaponId: string
  activations: number
  hits: number
  damage: number
}

export type HazardExposureStats = {
  role: TeamRole
  hazardId: string
  exposureCount: number
  damage: number
}

export type MovementStats = {
  cellsMoved: number
  hazardsCrossed: number
  finalPose?: BotPose
}

export type FightKeyEvent = {
  at: number
  type: string
  summary: string
}

export type FightDossier = {
  sessionId: string
  fights: Array<{
    fightId: string
    winner: TeamRole | 'draw'
    reason: string
    duration: number
    replayTimelineId?: string
    bots: Record<TeamRole, BotDetailedSnapshot>
    stats: {
      damageDealt: Record<TeamRole, number>
      damageTaken: Record<TeamRole, number>
      damageByPart: Record<TeamRole, Record<string, number>>
      weaponUse: Record<TeamRole, WeaponUseStats[]>
      hazardsTriggered: HazardExposureStats[]
      movement: Record<TeamRole, MovementStats>
      disabledParts: Record<TeamRole, string[]>
    }
    keyEvents: FightKeyEvent[]
  }>
}

export type ChampionRecord = {
  wins: number
  consecutiveWins: number
  losses: number
  sourceSessionIds: string[]
}

export type ChallengerBalanceGrant = {
  role: TeamRole
  bonusGold: number
  reason: string
}

export type ChampionContinuationSave = {
  saveId: string
  sourceSessionId: string
  championRole: TeamRole
  championTeamIdentity: TeamIdentity
  championDesign: BotDesignSnapshot
  championFinalState: BotCombatState
  championRecord: ChampionRecord
  fightDossier: FightDossier
  sharedDebrief: SharedDebrief
  challengerBalance: ChallengerBalanceGrant
  createdAt: string
}

export type ChampionContinuationSeed = {
  sourceSave: ChampionContinuationSave
  championRole: TeamRole
  challengerRole: TeamRole
  challengerBonusGold: number
  sharedDebrief: SharedDebrief
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
