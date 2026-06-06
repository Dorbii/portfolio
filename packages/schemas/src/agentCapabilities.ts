import type {
  PartCategory,
} from './types.js'

export const AGENT_FEATURE_GATE_STATES = [
  'enabled',
  'experimental',
  'deprecated',
  'disabled',
] as const

export type AgentFeatureGateState = (typeof AGENT_FEATURE_GATE_STATES)[number]

export type AgentFeatureGateScope =
  | 'agent_runtime'
  | 'catalog_routing'
  | 'combat_resolution'
  | 'replay_reconstruction'

export type AgentFeatureGate = Readonly<{
  id: string
  label: string
  state: AgentFeatureGateState
  scope: AgentFeatureGateScope
  summary: string
  agentGuidance: string
}>

export type AgentSemanticCapability =
  | 'survive_contact'
  | 'gain_range_pressure'
  | 'improve_lateral_escape'
  | 'win_shove_trades'
  | 'force_hazard_pathing'
  | 'break_turtle'
  | 'protect_utility_stack'
  | 'counter_rushdown'
  | 'counter_kiting'

export type AgentCapabilityCandidate = Readonly<{
  partId: string
  displayName: string
  category: PartCategory
  cost: number
  score: number
  featureGateIds: readonly string[]
  reasons: readonly string[]
  tradeoffs: readonly string[]
  companionNeeds: readonly string[]
}>

export type AgentCapabilityExclusion = Readonly<{
  partId: string
  displayName: string
  category: PartCategory
  cost: number
  featureGateIds: readonly string[]
  reasons: readonly string[]
}>

export type AgentCatalogCapability = Readonly<{
  id: string
  label: string
  summary: string
  routingHints: readonly string[]
  preferWhen: readonly string[]
  neverUseWhen: readonly string[]
  semanticCapabilities: readonly AgentSemanticCapability[]
  requiredFeatureGateIds: readonly string[]
  candidateParts: readonly AgentCapabilityCandidate[]
  excludedCandidates: readonly AgentCapabilityExclusion[]
  executionRules: readonly string[]
  commonErrors: readonly string[]
}>

export type AgentCatalogGuidance = Readonly<{
  purpose: string
  trustOrder: readonly string[]
  featureGates: readonly AgentFeatureGate[]
  capabilities: readonly AgentCatalogCapability[]
}>
