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

export type ReplayLifecycleStatus = 'none' | 'live_partial' | 'resolved'

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
  | 'crown'
  | 'drone'
  | 'dragon_head'
  | 'drill'
  | 'energy_core'
  | 'flex_panel'
  | 'flipper'
  | 'flail'
  | 'flag'
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
  | 'neon'
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
  | 'spikes'
  | 'tail'
  | 'tread'
  | 'trash_can'
  | 'turret'
  | 'wedge'
  | 'wheel'
  | 'wings'

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

export type PartVisualQualityStatus = 'blockout' | 'upgraded' | 'hero'

export type PartVisualDescriptor = {
  animationProfile?: string
  damageProfile?: string
  detailBudget: 'low' | 'medium' | 'high'
  materialRole: PartMaterialRole
  mountRole: PartMountRole
  qualityStatus?: PartVisualQualityStatus
  referenceIds?: string[]
  renderProfile?: string
  textureProfile?: string
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

export type MountSurfaceKind = 'panel' | 'sphere'

export type PanelMountSurface = {
  id: string
  kind: 'panel'
  accepts: PartCategory[]
  center: Vector3
  size: [number, number]
  normal: Vector3
  uAxis: Vector3
  vAxis: Vector3
}

export type SphereMountSurface = {
  id: string
  kind: 'sphere'
  accepts: PartCategory[]
  center: Vector3
  radius: number
}

export type MountSurface = PanelMountSurface | SphereMountSurface

export type MountPoseInput = {
  surface: MountSurface
  partCategory: PartCategory
  u: number
  v: number
  yawDegrees?: number
  rollDegrees?: number
}

export type MountPoseParameters = {
  u: number
  v: number
  yawDegrees: number
  rollDegrees: number
}

export type OrientationBasis = {
  right: Vector3
  up: Vector3
  forward: Vector3
}

export type MachineCapabilityLocalAxis = 'right' | 'up' | 'forward'

export type MachineMovementCapabilityMode =
  | 'normal_wheel'
  | 'omni_wheel'
  | 'mecanum_wheel'
  | 'tank_tread'
  | 'articulated_leg'

export type MachineWeaponCapabilityMode = 'fixed_emitter' | 'turret_emitter'

export type MachineUtilityCapabilityMode = 'activated_utility'

export type MachinePartCapabilityDefinition = {
  movement?: {
    mode: MachineMovementCapabilityMode
    driveAxis: MachineCapabilityLocalAxis
    lateralAxis?: MachineCapabilityLocalAxis
  }
  weapon?: {
    mode: MachineWeaponCapabilityMode
    emitterAxis: MachineCapabilityLocalAxis
  }
  utility?: {
    mode: MachineUtilityCapabilityMode
  }
}

export type ResolvedMountPose = {
  surfaceId: string
  surfaceKind: MountSurfaceKind
  partCategory: PartCategory
  parameters: MountPoseParameters
  position: Vector3
  surfaceNormal: Vector3
  orientation: OrientationBasis
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
  mountSurfaces: MountSurface[]
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
  machineCapabilities?: MachinePartCapabilityDefinition
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

export type Transform3D = {
  position: Vector3
  rotation: Vector3
  scale?: Vector3
  orientation?: OrientationBasis
}

export type MachinePartSource = 'system_core' | 'catalog_part'

export type MachineCoreDefinition = {
  id: string
  displayName: string
  cost: 0
  systemOwned: true
  inventoryItem: false
  catalogPart: false
  immutable: true
  mountSurfaces: MountSurface[]
}

export type MachinePartInstance = {
  instanceId: string
  definitionId: string
  source: MachinePartSource
  transform: Transform3D
  immutable?: boolean
}

export type MachineAttachment = {
  parentInstanceId: string
  childInstanceId: string
  mountId?: string
  transform: Transform3D
}

export type MachineRuntimeState = {
  healthByInstanceId: Record<string, number>
  detachedInstanceIds?: string[]
  disabledInstanceIds?: string[]
  orientationByInstanceId?: Record<string, OrientationBasis>
}

export type MachineDesign = {
  name: string
  rootInstanceId: string
  parts: MachinePartInstance[]
  attachments: MachineAttachment[]
  runtime?: MachineRuntimeState
}

export type MachineCapabilityOrientationSource =
  | 'transform_orientation'
  | 'runtime_orientation'
  | 'inherited_runtime_orientation'

export type MachineMovementCapability = {
  kind: MachineMovementCapabilityMode
  partInstanceId: string
  partId: string
  driveAxis: Vector3
  lateralAxis?: Vector3
  diagonalAxes?: Vector3[]
  moveBudget: number
  traction: number
  stability: number
  turnRate: number
  orientationSource: MachineCapabilityOrientationSource
}

export type MachineWeaponCapability = {
  kind: MachineWeaponCapabilityMode
  partInstanceId: string
  partId: string
  emitterAxis: Vector3
  damage: number
  range: number
  cooldownTurns: number
  fireMode: WeaponSpec['fireMode']
  precision: number
  orientationSource: MachineCapabilityOrientationSource
}

export type MachineUtilityCapability = {
  kind: MachineUtilityCapabilityMode
  partInstanceId: string
  partId: string
  control: number
}

export type MachineInactivePartReason =
  | 'detached'
  | 'disabled'
  | 'destroyed'
  | 'missing_catalog_definition'
  | 'missing_orientation_basis'

export type MachineInactivePartCapability = {
  partInstanceId: string
  definitionId: string
  partId?: string
  reason: MachineInactivePartReason
}

export type MachineCapabilities = {
  movement: MachineMovementCapability[]
  weapons: MachineWeaponCapability[]
  utility: MachineUtilityCapability[]
  inactiveParts: MachineInactivePartCapability[]
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

export const COMBAT_PLAN_STEP_KINDS = [
  'move',
  'attack',
  'utility',
  'end_turn',
] as const

export type CombatPlanStepKind = (typeof COMBAT_PLAN_STEP_KINDS)[number]

/** Temporary compatibility: first two mounted weapons map to weaponA/weaponB. */
export type LegacyCombatWeaponSlot = 'weaponA' | 'weaponB'

/** @deprecated weaponA/weaponB is migration compatibility; use mounted weapon IDs. */
export type CombatWeaponSlot = LegacyCombatWeaponSlot

export type CombatPlanStep =
  | {
      kind: 'move'
      cellId: string
    }
  | {
      kind: 'attack'
      /** Mounted weapon instance ID; the canonical combat weapon identity. */
      weaponId?: string
      /** Temporary compatibility: resolves to the nth active weapon. */
      weaponSlot?: LegacyCombatWeaponSlot
      targetCellId?: string
    }
  | {
      kind: 'utility'
      utilityId?: string
      cellId?: string
    }
  | {
      kind: 'end_turn'
    }

export type CombatBudget = {
  movement: number
  actionTime: number
  weaponCooldowns: Record<string, number>
}

export type CombatRoundPlan = {
  role: TeamRole
  round: number
  decisionVersion: number
  steps: CombatPlanStep[]
  submittedAt: string
}

export type CombatRoundPlanSubmission = {
  action: 'submit_combat_round_plan'
  decisionVersion: number
  round: number
  steps: CombatPlanStep[]
  publicMessage?: string
}

export type CombatPlanConsumptionSummary = {
  submittedSteps: number
  consumedSteps: number
  movementSpent: number
  actionTimeSpent: number
  rejectedSteps: Array<{
    index: number
    reason: string
  }>
  endedBy: 'end_turn' | 'budget_exhausted' | 'plan_exhausted' | 'substep_cap'
}

export type CombatBoardReachableCell = GridCoord & {
  cellId: string
  moveCost: number
  movementRemaining?: number
  hazard: boolean
  hazardIds?: string[]
  path?: GridCoord[]
}

export type CombatBoardAttackableCell = GridCoord & {
  cellId: string
  weaponSlot: CombatWeaponSlot
  range: number
  distance: number
  actionTimeCost?: number
  lineOfSight?: boolean
}

export type CombatBoardUtilityOption = {
  utilityId: string
  label?: string
  cellId?: string
  actionTimeCost?: number
}

export type CombatRoundPacketView = {
  round: number
  decisionVersion: number
  deadlineAt: string
  fightStartedAt?: string
  fightDeadlineAt?: string
  fightSeconds?: number
  cutoffReason?: 'fight_wall_clock_expired'
  submitted: boolean
  opponentSubmitted: boolean
  budget: CombatBudget
  self: {
    hp: number
    maxHp: number
    mass?: number
    drive?: number
    weaponReach?: number
    anchor: GridCoord
  }
  opponent: {
    hp: number
    maxHp: number
    mass?: number
    drive?: number
    weaponReach?: number
    anchor: GridCoord
  }
  submittedPlan?: CombatRoundPlan
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
  'propose_mount_pose',
  'choose_mount',
  'choose_rotation',
  'buy_part',
  'place_part',
  'remove_part',
  'remove_subtree',
  'move_part',
  'rotate_part',
  'cancel_build_selection',
  'confirm_loadout',
  'move',
  'attack',
  'move_and_attack',
  'use_utility',
  'hold',
  'surrender',
  'ready',
] as const

export type GameMasterActionKind = (typeof GAME_MASTER_ACTION_KINDS)[number]

export const GAME_MASTER_ACTION_PARAMETER_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
] as const

export type GameMasterActionParameterType = (typeof GAME_MASTER_ACTION_PARAMETER_TYPES)[number]

export type GameMasterActionParameterValue = string | number | boolean

export type GameMasterActionParameterDefinition = {
  type: GameMasterActionParameterType
  label?: string
  summary?: string
  enum?: GameMasterActionParameterValue[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  normalization?: 'degrees'
}

export type GameMasterActionParameterSchema = {
  type: 'object'
  properties: Record<string, GameMasterActionParameterDefinition>
  required?: string[]
}

export type GameMasterActionParameters = Record<string, unknown>

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
  grid?: {
    cellSize: number
    xMin: number
    xMax: number
    zMin: number
    zMax: number
  }
  ascii?: string
  self?: BotPose
  opponent?: BotPose
  blockedCells?: GridCoord[]
  hazardCells?: GridCoord[]
  cells?: AgentBoardCellView[]
  reachableCells?: CombatBoardReachableCell[]
  attackableCells?: CombatBoardAttackableCell[]
  utilityOptions?: CombatBoardUtilityOption[]
  reachablePoses?: AgentBoardPoseView[]
  attackableTargets?: AgentBoardTargetView[]
  [key: string]: unknown
}

export type AgentBoardLegalActionRef = {
  actionId: string
  kind: GameMasterActionKind
  label?: string
  summary?: string
  parameters?: GameMasterActionParameters
}

export type AgentBoardAttackAffordance = AgentBoardLegalActionRef & {
  targetId: 'opponent'
  targetCellId: string
  weaponSlot?: 'weaponA' | 'weaponB'
}

export type AgentBoardCellLegalView = {
  moveHere?: AgentBoardLegalActionRef
  attacksFromHere?: AgentBoardAttackAffordance[]
  useUtilityFromHere?: AgentBoardLegalActionRef
}

export type AgentBoardCellView = GridCoord & {
  cellId: string
  inBounds: boolean
  blocksMovement: boolean
  blocksLineOfSight: boolean
  hazardIds?: string[]
  hazards?: Array<{
    id: string
    type: string
    damage: number
  }>
  occupant?: 'self' | 'opponent'
  distanceToOpponent?: number
  lineOfSightToOpponent?: boolean
  reachable?: boolean
  mobilityCost?: number
  mobilityRemaining?: number
  path?: GridCoord[]
  legal?: AgentBoardCellLegalView
  reachableByActionIds?: string[]
  targetableByActionIds?: string[]
  unavailableReasons?: string[]
}

export type AgentBoardPoseView = {
  poseId: string
  anchor: GridCoord
  facing: BotPose['facing']
  reachable: true
  actionIds: string[]
  path?: GridCoord[]
  distanceToOpponent?: number
  lineOfSightToOpponent?: boolean
  hazardExposure?: number
  riskTags?: string[]
}

export type AgentBoardTargetView = {
  targetId: string
  kind: 'opponent'
  cell: GridCoord
  actionIds: string[]
  distance?: number
  lineOfSight?: boolean
}

export type AgentVisibleCombatState = {
  self: BotCombatState
  opponent: BotCombatState
  turn?: number
  [key: string]: unknown
}

export type GameMasterReviewResultSummary = {
  winner: TeamRole | 'draw'
  reason: string
  damage: Record<TeamRole, number>
  remainingHealth: Record<TeamRole, number>
}

export const LOADOUT_BUILD_STEPS = [
  'choose_part',
  'choose_attach_target',
  'propose_mount_pose',
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
  /** Legacy grid-mount continuation state for legacy-bot-design:v1 only. Remove with that compatibility path. */
  selectedMount?: string
  selectedMountKind?: PartMountKind
  selectedMountMotion?: PartMountMotion
  selectedMountCollisionPolicy?: PartCollisionPolicy
  /** Legacy grid-mount continuation state for legacy-bot-design:v1 only. Remove with that compatibility path. */
  selectedMountSector?: string
  /** Legacy grid-mount continuation state for legacy-bot-design:v1 only. Remove with that compatibility path. */
  selectedAttachCell?: GridCoord
  /** Legacy grid-mount continuation state for legacy-bot-design:v1 only. Remove with that compatibility path. */
  selectedRotation?: number
  currentDesign: StoredDesign
  legacyDraft?: BotDesignSnapshot
  pendingMoveRestore?: {
    storedDesign: StoredDesign
    legacyDraft: BotDesignSnapshot
  }
  /** Store offer slots consumed by successful placements this round. */
  consumedOfferSlotIds?: string[]
  /** Internal slot id tracked while an offer part is selected mid-placement. */
  selectedOfferSlotId?: string
  /** Whether the selected part came from the reusable foundation or a one-purchase offer. */
  selectedPartSource?: 'foundation' | 'offer'
}

export type SubmitInstruction = {
  method: 'POST'
  path: string
  body: GameMasterActionSubmission | CombatRoundPlanSubmission
}

export type GameMasterLegalAction = {
  id: string
  kind: GameMasterActionKind
  label: string
  summary: string
  catalogDigest?: string
  catalogRefs?: string[]
  requirements?: string[]
  parameterSchema?: GameMasterActionParameterSchema
  parameterExamples?: GameMasterActionParameters[]
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

export type GameMasterBlockedAction = {
  kind: GameMasterActionKind
  label: string
  summary: string
  issues: ValidationIssue[]
  catalogRefs?: string[]
  requirements?: string[]
}

export type GameMasterReviewMetadata = {
  fightId: string
  result?: GameMasterReviewResultSummary
  reflection: {
    required: boolean
    submitted: boolean
    opponentSubmitted: boolean
  }
  debrief: {
    available: boolean
    debriefId?: string
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
  combat?: CombatRoundPacketView
  visibleState?: AgentVisibleCombatState
  legalActions: GameMasterLegalAction[]
  blockedActions?: GameMasterBlockedAction[]
  review?: GameMasterReviewMetadata
  sharedDebrief?: SharedDebrief
  submit?: SubmitInstruction
  /** Compact build protocol view; present during choose_loadout. */
  build?: CompactBuildPacket
  /** Compact combat protocol view; present during combat_turn. */
  combatCompact?: CompactCombatPacket
}

export type GameMasterActionSubmission = {
  action: 'submit_game_action'
  actionSetId: string
  decisionVersion: number
  actionId: string
  parameters?: GameMasterActionParameters
  publicMessage?: string
}

export type CanonicalGameAction = {
  id: string
  kind: GameMasterActionKind
  role: TeamRole
  parameterSchema?: GameMasterActionParameterSchema
  parameterExamples?: GameMasterActionParameters[]
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
  blockedActions?: GameMasterBlockedAction[]
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

export type StoredDesign =
  | { version: 'machine:v1'; machine: MachineDesign }
  | { version: 'legacy-bot-design:v1'; design: BotDesignSnapshot }

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

// ---------------------------------------------------------------------------
// Compact agent protocol (slice 1): compact state in, compact intent out.
// External part IDs in compact payloads use category-prefixed aliases
// (weapon.Weapon_Turret); canonical catalog IDs remain unchanged internally.
// ---------------------------------------------------------------------------

export type CompactPartStatus = 'ok' | 'disabled' | 'detached' | 'destroyed'

export type CompactBuildStep =
  | 'choose_part'
  | 'choose_attach_target'
  | 'mount_part'

export type CompactBuildPartRow = [
  id: string,
  part: string,
  parent: string | null,
  hp: number,
  maxHp: number,
]

export type CompactStorePart = {
  part: string
  cost: number
  mass: number
  hp: number
  weapon?: {
    fireMode: string
    range: number
    damage: number
    cooldown?: number
    effect?: string
  }
  mobility?: {
    mode: string
    moveBudget: number
    traction?: number
    stability?: number
  }
  armor?: number
  utility?: { effect: string }
  style?: number
}

export type CompactBotSummary = {
  hp: number
  maxHp: number
  mass: number
  armor: number
  stability: number
  movement: Partial<Record<'x' | 'z' | 'xz', number>>
  weapons: Array<{
    id: string
    part: string
    fireMode: string
    range: number
    damage: number
    cooldown: number
  }>
  utility: Array<{
    id: string
    part: string
    effect: string
  }>
}

export type CompactBuildPacket = {
  v: 1
  phase: 'build'
  round: number
  decisionVersion: number
  buildDigest?: string
  step: CompactBuildStep
  budget: {
    gold: number
    parts: number
  }
  bot: {
    mode: 'new' | 'existing'
    summary: CompactBotSummary
    partSchema: ['id', 'part', 'parent', 'hp', 'maxHp']
    parts: CompactBuildPartRow[]
  }
  store?: {
    foundation: CompactStorePart[]
    offers: CompactStorePart[]
  }
  edit?: {
    confirm: boolean
    cancel?: boolean
    remove: Array<{ id: string; refund: number }>
    removeSubtree: Array<{ id: string; refund: number; parts: number }>
    move: string[]
    rotate: Array<{ id: string; rot: number[] }>
  }
  selected?:
    | { mode: 'new_part'; part: string; canonicalPartId: string; target?: string }
    | {
        mode: 'moving_existing_part'
        id: string
        part: string
        canonicalPartId: string
        target?: string
      }
  targets?: string[]
  mountSchema?: ['surface', 'u', 'v', 'yaw', 'roll']
  mounts?: Array<[surface: string, u: number, v: number, yaw: number, roll: number]>
  requirements?: {
    confirm_loadout: {
      ok: boolean
      missing: string[]
      issues: ValidationIssue[]
    }
  }
  issues?: ValidationIssue[]
}

export type CompactCombatWeapon = {
  id?: string
  slot?: 'weaponA' | 'weaponB'
  part?: string
  fireMode: string
  range: number
  cooldown: number
  actionTime: number
  facing?: [x: number, z: number]
  dynamicFacing?: boolean
}

export type CompactCombatBot = {
  cell: [x: number, z: number]
  hp: number
  maxHp: number
  mass: number
  armor: number
  stability: number
  movement: Partial<Record<'x' | 'z' | 'xz', number>>
  weapons: CompactCombatWeapon[]
}

export type CompactCombatPacket = {
  v: 1
  combat: {
    round: number
    decisionVersion: number
    fightStartedAt?: string
    fightDeadlineAt?: string
    fightSeconds?: number
    cutoffReason?: 'fight_wall_clock_expired'
    budget: {
      actionTime: number
    }
    self: CompactCombatBot
    opponent: CompactCombatBot
  }
  board: {
    grid: [xMin: number, xMax: number, zMin: number, zMax: number]
    terrain: {
      hazard?: Array<[x: number, z: number]>
      wall?: Array<[x: number, z: number]>
      smoke?: Array<[x: number, z: number]>
    }
  }
}

export type CompactBuildAction =
  | { kind: 'choose_part'; part: string }
  | { kind: 'remove_part'; id: string }
  | { kind: 'remove_subtree'; id: string }
  | { kind: 'move_part'; id: string }
  | { kind: 'rotate_part'; id: string; rot: number }
  | { kind: 'cancel_build_selection' }
  | { kind: 'confirm_loadout' }
  | { kind: 'choose_attach_target'; target: string }
  | {
      kind: 'mount_part'
      surface: string
      u: number
      v: number
      yaw?: number
      roll?: number
    }

export type CompactBuildActionSubmission = {
  action: 'submit_build_action'
  decisionVersion: number
  buildDigest?: string
  step?: CompactBuildStep
  command: CompactBuildAction
  publicMessage?: string
}

export type CompactCombatPlanStep =
  | { kind: 'move'; to: [x: number, z: number] }
  | {
      kind: 'attack'
      weapon?: string
      weaponSlot?: 'weaponA' | 'weaponB'
      target: [x: number, z: number]
    }
  | { kind: 'utility'; utility?: string; at?: [x: number, z: number] }
  | { kind: 'end_turn' }

export type CompactCombatPlanSubmission = {
  action: 'submit_combat_plan'
  decisionVersion: number
  round: number
  steps: CompactCombatPlanStep[]
  publicMessage?: string
}
