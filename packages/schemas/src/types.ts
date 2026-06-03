export const TEAM_ROLES = ['red', 'blue'] as const

export type TeamRole = (typeof TEAM_ROLES)[number]

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
  'combat_resolved',
  'replay_phase',
  'referee_awards',
  'apply_awards',
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

export type RefereeAwardOption = {
  id: string
  title: string
  description: string
  gold: number
}

export type RefereeAwardSelection = {
  awardId: string
  targetTeam: TeamRole
}

export type AppliedRefereeAward = RefereeAwardSelection & {
  round: number
  title: string
  gold: number
}

export const REFEREE_AWARD_OPTION_COUNT = 3
export const MAX_REFEREE_AWARDS_PER_ROUND = 2
export const MAX_REFEREE_AWARDS_PER_TEAM_PER_ROUND = 1

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

export type TurnPlan = {
  commands: TurnCommand[]
}

export type RoundPlanSubmission = {
  action: 'submit_round_plan'
  purchases: Purchase[]
  blueprint: BotBlueprint
  turnPlan: TurnPlan
  rationale?: string
}

export type ArenaConfig = {
  name: string
  width: number
  height: number
  activeHazards: string[]
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
