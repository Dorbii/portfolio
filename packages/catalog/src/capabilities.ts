import type {
  AgentCatalogCapability,
  AgentCatalogGuidance,
  AgentCapabilityCandidate,
  AgentCapabilityExclusion,
  AgentFeatureGate,
  AgentSemanticCapability,
  PartDefinition,
  PartStats,
} from '../../schemas/src/index.js'
import { PART_CATALOG } from './parts.js'

type CapabilityDefinition = Readonly<{
  id: string
  label: string
  summary: string
  routingHints: readonly string[]
  preferWhen: readonly string[]
  neverUseWhen: readonly string[]
  semanticCapabilities: readonly AgentSemanticCapability[]
  requiredFeatureGateIds: readonly string[]
  match: (part: PartDefinition) => boolean
  nearMiss: (part: PartDefinition) => boolean
  executionRules: readonly string[]
  commonErrors: readonly string[]
}>

type CatalogGuidanceOptions = Readonly<{
  featureGates?: readonly AgentFeatureGate[]
}>

const MAX_CANDIDATES_PER_CAPABILITY = 8
const MAX_EXCLUSIONS_PER_CAPABILITY = 6

export const AGENT_FEATURE_GATES = [
  {
    id: 'agent.plan_context',
    label: 'Agent catalog context bundle',
    state: 'enabled',
    scope: 'agent_runtime',
    summary:
      'Agents may use catalog capability guidance as advisory loadout context before choosing a server-authored action.',
    agentGuidance:
      'Use this guidance to compare options and tradeoffs; it is not permission to ignore validation or choose an illegal loadout.',
  },
  {
    id: 'combat.game_master_actions',
    label: 'Game-master combat actions',
    state: 'enabled',
    scope: 'combat_resolution',
    summary:
      'Combat resolves from server-authored legal actions that encode movement, weapons, and utility timing.',
    agentGuidance:
      'During combat_turn, choose one actionId from the current GameMasterPacket legalActions list.',
  },
  {
    id: 'combat.movement_actions',
    label: 'Movement actions',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Blueprints with movement controls unlock server-authored movement action choices.',
    agentGuidance:
      'Movement parts expand legalActions; choose the actionId that best fits the current packet.',
  },
  {
    id: 'combat.weapon_actions',
    label: 'Weapon actions',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Weapon controls can fire during combat turns when range/readiness make the action useful.',
    agentGuidance:
      'Do not buy a weapon without enough mobility, armor, or control support to create firing windows.',
  },
  {
    id: 'combat.utility_actions',
    label: 'Utility actions',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Utility controls can activate during combat turns when the blueprint includes utility parts.',
    agentGuidance:
      'Utility parts usually need a survival or positioning plan; they rarely win alone.',
  },
  {
    id: 'combat.hazard_routing',
    label: 'Hazard routing',
    state: 'experimental',
    scope: 'combat_resolution',
    summary:
      'Hazard-aware movement guidance exists, but hazards are matchup and arena dependent.',
    agentGuidance:
      'Treat hazard plans as conditional. Prefer them when arena pressure and mobility support the bait path.',
  },
  {
    id: 'combat.behavior.wedge',
    label: 'Wedge behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Wedge bodies improve contact-control plans.',
    agentGuidance: 'Pair wedge behavior with traction and front durability.',
  },
  {
    id: 'combat.behavior.spinner',
    label: 'Spinner behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Spinner weapons create high contact threat with stability tradeoffs.',
    agentGuidance: 'Add stability, armor, or control so the spinner gets usable contact windows.',
  },
  {
    id: 'combat.behavior.net',
    label: 'Net behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Net weapons support ranged control and movement denial.',
    agentGuidance: 'Use nets to create spacing or hazard opportunities, not as raw damage.',
  },
  {
    id: 'combat.behavior.ram',
    label: 'Ram behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Ram weapons reward direct contact lanes.',
    agentGuidance: 'Ram plans need movement and enough front durability to survive entries.',
  },
  {
    id: 'combat.behavior.flipper',
    label: 'Flipper behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Flippers turn close contact into disruption and position changes.',
    agentGuidance: 'Use flippers when traction and timing can force contact.',
  },
  {
    id: 'combat.behavior.saw',
    label: 'Saw behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Saw-style weapons reward sustained close pressure.',
    agentGuidance: 'Saws need approach tools and protection against contact punishment.',
  },
  {
    id: 'combat.behavior.turret',
    label: 'Turret behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Turrets support range pressure while moving.',
    agentGuidance: 'Pair turrets with movement and sensors to keep firing lanes open.',
  },
  {
    id: 'combat.behavior.grabber',
    label: 'Grabber behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Grabbers support close control, pins, and part-targeting plans.',
    agentGuidance: 'Grabbers need traction and armor because they commit to contact.',
  },
  {
    id: 'combat.behavior.front_plate',
    label: 'Front plate behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Front plates support nose-first contact mitigation.',
    agentGuidance: 'Use front plates when the plan intentionally enters contact.',
  },
  {
    id: 'combat.behavior.spiked_armor',
    label: 'Spiked armor behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Spiked armor punishes contact-heavy opponents.',
    agentGuidance: 'Spikes are counter-pressure, not a substitute for a movement plan.',
  },
  {
    id: 'combat.behavior.reactive_armor',
    label: 'Reactive armor behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Reactive armor helps absorb and punish burst contact.',
    agentGuidance: 'Use reactive armor to survive dangerous exchanges, then add a win condition.',
  },
  {
    id: 'combat.behavior.booster',
    label: 'Booster behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Boosters support burst repositioning and hazard bait.',
    agentGuidance: 'Boosters work best with light bodies or evasive movement plans.',
  },
  {
    id: 'combat.behavior.gyro',
    label: 'Gyro behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Gyros improve stability for contact and spinner plans.',
    agentGuidance: 'Use gyro support when the weapon or chassis has stability risk.',
  },
  {
    id: 'combat.behavior.magnet',
    label: 'Magnet behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Magnets support positional control and forced movement.',
    agentGuidance: 'Magnets need range and timing; pair them with control or hazard plans.',
  },
  {
    id: 'combat.behavior.anchor',
    label: 'Anchor behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Anchors support hold-ground, pin, and utility-stack plans.',
    agentGuidance: 'Anchors reduce repositioning value, so avoid them in pure chase builds.',
  },
  {
    id: 'combat.behavior.repair_kit',
    label: 'Repair kit behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Repair kits support damage-control plans.',
    agentGuidance: 'Repair only matters if the bot can survive long enough to use it.',
  },
  {
    id: 'combat.behavior.smoke',
    label: 'Smoke behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Smoke supports evasive and disengage plans.',
    agentGuidance: 'Use smoke to reset spacing; do not treat it as damage.',
  },
  {
    id: 'combat.behavior.sensor',
    label: 'Sensor behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Sensors support range, targeting, and utility-stack plans.',
    agentGuidance: 'Sensors are support pieces; pair them with a weapon, drone, or control plan.',
  },
  {
    id: 'combat.behavior.drone_controller',
    label: 'Drone controller behavior',
    state: 'enabled',
    scope: 'combat_resolution',
    summary: 'Drone controllers support charged pressure and utility-stack plans.',
    agentGuidance: 'Protect drone controllers because they need time to become valuable.',
  },
] as const satisfies readonly AgentFeatureGate[]

const FEATURE_GATE_BY_BEHAVIOR_ID = new Map(
  AGENT_FEATURE_GATES
    .filter((gate) => gate.id.startsWith('combat.behavior.'))
    .map((gate) => [gate.id.replace('combat.behavior.', ''), gate.id]),
)

const CAPABILITY_DEFINITIONS: readonly CapabilityDefinition[] = [
  {
    id: 'movement_escape',
    label: 'Movement and escape',
    summary:
      'Find movement parts that let the agent reposition, kite, circle, or avoid bad contact lanes.',
    routingHints: ['need movement', 'move faster', 'escape', 'kite', 'circle', 'wheels'],
    preferWhen: [
      'The opponent has stronger contact damage.',
      'Your plan needs to maintain long or mid range.',
      'You need legal movement actions for live combat turns.',
    ],
    neverUseWhen: [
      'The plan intentionally anchors and wins only through contact punishment.',
      'You cannot afford both a body and enough mobility to make the blueprint legal.',
    ],
    semanticCapabilities: ['improve_lateral_escape', 'counter_rushdown'],
    requiredFeatureGateIds: ['combat.movement_actions'],
    match: (part) =>
      part.category === 'mobility' &&
      part.controls?.movement === true &&
      (stat(part, 'drive') >= 6 || stat(part, 'control') >= 2),
    nearMiss: (part) => part.category === 'mobility',
    executionRules: [
      'Buy at least one body and enough movement parts to make the blueprint connected.',
      'Movement parts unlock legal movement actionIds; the agent still chooses one current action.',
    ],
    commonErrors: [
      'Selecting a movementPolicy other than hold_ground without movement controls.',
      'Buying one fast part but no connected movement layout in the blueprint.',
    ],
  },
  {
    id: 'traction_and_pin_control',
    label: 'Traction and pin control',
    summary:
      'Find parts that improve shove trades, pins, anchoring, and close-range control.',
    routingHints: ['need traction', 'pin them', 'tankier movement', 'wedge', 'hold position'],
    preferWhen: [
      'The plan wants contact, pins, grabber pressure, or wedge bullying.',
      'The opponent is light, evasive, or vulnerable to forced contact.',
    ],
    neverUseWhen: [
      'The plan needs pure speed or long-range kiting.',
      'The opponent can punish slow direct approaches with range or hazards.',
    ],
    semanticCapabilities: ['win_shove_trades', 'counter_kiting'],
    requiredFeatureGateIds: ['combat.movement_actions'],
    match: (part) =>
      (part.category === 'mobility' && stat(part, 'traction') >= 6) ||
      part.behavior?.id === 'anchor' ||
      part.behavior?.id === 'wedge',
    nearMiss: (part) => part.category === 'mobility' || part.behavior?.id === 'anchor',
    executionRules: [
      'Pair traction with a contact win condition: ram, wedge, grabber, flipper, or front armor.',
      'Avoid slow traction-only builds if the opponent can safely kite.',
    ],
    commonErrors: [
      'Buying heavy traction without a weapon/control part that benefits from contact.',
      'Anchoring while also trying to chase a faster opponent.',
    ],
  },
  {
    id: 'range_pressure',
    label: 'Range pressure',
    summary:
      'Find weapons and support parts that create value before direct contact.',
    routingHints: ['better weapon with range', 'long range', 'turret', 'net', 'keep away'],
    preferWhen: [
      'The opponent is better in contact.',
      'Your movement or sensors can preserve a firing lane.',
      'You need to punish slow tanks before they reach you.',
    ],
    neverUseWhen: [
      'You cannot afford movement support to keep distance.',
      'The plan is a pure wedge/ram rushdown with no spacing objective.',
    ],
    semanticCapabilities: ['gain_range_pressure', 'counter_rushdown'],
    requiredFeatureGateIds: ['combat.weapon_actions'],
    match: (part) =>
      part.behavior?.id === 'turret' ||
      part.behavior?.id === 'net' ||
      part.behavior?.id === 'sensor' ||
      (part.category === 'weapon' && stat(part, 'control') >= 5),
    nearMiss: (part) => part.category === 'weapon' || part.behavior?.id === 'sensor',
    executionRules: [
      'Pair range pressure with movement or control so the opponent cannot freely close.',
      'Fire only when the current GameMasterPacket makes a weapon action legal and useful.',
    ],
    commonErrors: [
      'Buying a ranged weapon but submitting close-only movement.',
      'Treating sensor support as a weapon instead of a range enabler.',
    ],
  },
  {
    id: 'contact_damage',
    label: 'Contact damage',
    summary:
      'Find weapons that reward closing distance and winning direct exchanges.',
    routingHints: ['need damage', 'break armor', 'spinner', 'saw', 'hit harder'],
    preferWhen: [
      'Your chassis can survive contact long enough to trade.',
      'The opponent lacks control tools that can interrupt the approach.',
    ],
    neverUseWhen: [
      'Your bot has no mobility or armor plan for reaching contact.',
      'The opponent can kite indefinitely and your build lacks control.',
    ],
    semanticCapabilities: ['break_turtle', 'counter_kiting'],
    requiredFeatureGateIds: ['combat.weapon_actions'],
    match: (part) =>
      part.category === 'weapon' &&
      (stat(part, 'weapon') >= 10 ||
        part.behavior?.id === 'spinner' ||
        part.behavior?.id === 'saw'),
    nearMiss: (part) => part.category === 'weapon',
    executionRules: [
      'Add mobility, traction, armor, or control support so the weapon gets real contact windows.',
      'Use weapon fire with movement in the same turn when legal and range supports it.',
    ],
    commonErrors: [
      'Spending too much on a weapon and leaving no gold for movement or body durability.',
      'Submitting hold_fire tactics for a weapon-dependent damage plan.',
    ],
  },
  {
    id: 'survive_contact',
    label: 'Survive contact',
    summary:
      'Find bodies, armor, and support parts that help survive rushdown or high-damage trades.',
    routingHints: ['need defense', 'tankier', 'survive spinner', 'armor', 'heavy body'],
    preferWhen: [
      'The opponent has high contact damage or fast rushdown.',
      'Your key weapon/utility needs time to become valuable.',
    ],
    neverUseWhen: [
      'Extra mass would prevent your only win condition from reaching range.',
      'You are already unable to threaten the opponent after surviving.',
    ],
    semanticCapabilities: ['survive_contact', 'protect_utility_stack', 'counter_rushdown'],
    requiredFeatureGateIds: [],
    match: (part) =>
      part.category === 'defense' ||
      (part.category === 'body' && (part.durability >= 40 || stat(part, 'armor') >= 2)) ||
      part.behavior?.id === 'gyro' ||
      part.behavior?.id === 'repair_kit',
    nearMiss: (part) => part.category === 'defense' || part.category === 'body' || part.category === 'utility',
    executionRules: [
      'Use defense to buy time for a real weapon, control, or utility plan.',
      'Watch mass and drive penalties; tankier is not automatically better.',
    ],
    commonErrors: [
      'Building a tank that survives but cannot create damage or control value.',
      'Adding heavy armor that breaks a movement-heavy plan.',
    ],
  },
  {
    id: 'positional_control',
    label: 'Positional control',
    summary:
      'Find net, magnet, grabber, flipper, anchor, and wedge tools that deny opponent movement.',
    routingHints: ['control them', 'drag', 'slow', 'pin', 'force position', 'deny movement'],
    preferWhen: [
      'The opponent depends on movement, range, or approach timing.',
      'Arena hazards or walls can turn position into damage.',
    ],
    neverUseWhen: [
      'The opponent is too heavy or armored for low-damage control to matter alone.',
      'Your bot cannot survive the contact window required by the control tool.',
    ],
    semanticCapabilities: ['force_hazard_pathing', 'win_shove_trades', 'counter_kiting'],
    requiredFeatureGateIds: ['combat.weapon_actions', 'combat.utility_actions'],
    match: (part) =>
      ['net', 'magnet', 'grabber', 'flipper', 'anchor', 'wedge'].includes(
        part.behavior?.id ?? '',
      ) || stat(part, 'control') >= 7,
    nearMiss: (part) =>
      part.category === 'weapon' ||
      part.category === 'utility' ||
      part.category === 'body' ||
      part.category === 'mobility',
    executionRules: [
      'Control parts need timing and range; choose them only when the current packet exposes the right action.',
      'Pair control with damage, hazards, or part targeting so pins convert into progress.',
    ],
    commonErrors: [
      'Buying control tools but no movement/traction to create the control window.',
      'Trying to force hazards when the arena pressure packet does not support it.',
    ],
  },
  {
    id: 'hazard_bait_escape',
    label: 'Hazard bait and escape',
    summary:
      'Find evasive movement and disruption tools for baiting heavier opponents into arena hazards.',
    routingHints: ['hazard bait', 'matador', 'escape route', 'bait hazards', 'smoke'],
    preferWhen: [
      'Hazards are active and the opponent is slower or contact-focused.',
      'Your bot has enough movement to avoid becoming the hazard target.',
    ],
    neverUseWhen: [
      'Arena hazards are inactive or far from the likely fight path.',
      'The opponent has range pressure that punishes evasive loops.',
    ],
    semanticCapabilities: ['force_hazard_pathing', 'improve_lateral_escape', 'counter_rushdown'],
    requiredFeatureGateIds: ['combat.hazard_routing', 'combat.movement_actions'],
    match: (part) =>
      (part.category === 'mobility' && (stat(part, 'drive') >= 8 || stat(part, 'control') >= 2)) ||
      ['booster', 'smoke', 'magnet', 'net', 'front_plate'].includes(part.behavior?.id ?? ''),
    nearMiss: (part) =>
      part.category === 'mobility' ||
      part.category === 'utility' ||
      part.category === 'weapon' ||
      part.category === 'defense',
    executionRules: [
      'Only commit to hazard bait when arenaPressure shows a realistic hazard or wall path.',
      'Use escape tools before health drops below the retreat threshold.',
    ],
    commonErrors: [
      'Choosing bait_hazard tactics in an arena state where hazards are not active.',
      'Buying evasive tools without enough durability to survive one failed bait.',
    ],
  },
  {
    id: 'utility_stack_protection',
    label: 'Utility stack protection',
    summary:
      'Find support pieces for drone, sensor, repair, anchor, and defensive utility plans.',
    routingHints: ['protect utility', 'drone plan', 'sensor support', 'repair', 'support stack'],
    preferWhen: [
      'Your win condition needs time to charge, aim, repair, or control spacing.',
      'The opponent can rush fragile utilities early.',
    ],
    neverUseWhen: [
      'You need immediate damage and cannot afford delayed support value.',
      'The build has no body/armor budget left to protect the utility stack.',
    ],
    semanticCapabilities: ['protect_utility_stack', 'survive_contact', 'gain_range_pressure'],
    requiredFeatureGateIds: ['combat.utility_actions'],
    match: (part) =>
      ['drone_controller', 'sensor', 'repair_kit', 'anchor', 'gyro'].includes(
        part.behavior?.id ?? '',
      ) ||
      part.id === 'Armor_Cage' ||
      part.id === 'Utility_EnergyCore' ||
      part.id === 'Utility_Battery',
    nearMiss: (part) => part.category === 'utility' || part.category === 'defense',
    executionRules: [
      'Protect utility-heavy plans with armor, anchoring, or movement instead of adding support endlessly.',
      'Treat utility as a force multiplier; include a way to win exchanges.',
    ],
    commonErrors: [
      'Stacking support parts with no weapon, control, or hazard conversion.',
      'Leaving a fragile utility build exposed to immediate rushdown.',
    ],
  },
]

export function createAgentCatalogGuidance(
  catalog: readonly PartDefinition[] = PART_CATALOG,
  options: CatalogGuidanceOptions = {},
): AgentCatalogGuidance {
  const featureGates = options.featureGates ?? AGENT_FEATURE_GATES
  const gateStates = new Map(featureGates.map((gate) => [gate.id, gate.state]))

  return {
    purpose:
      'Advisory catalog routing for loadout-action selection. Capabilities provide options, tradeoffs, exclusions, and recovery hints; agents still make the final legal loadout choice.',
    trustOrder: [
      'session rules and schemas',
      'current private role state',
      'catalog feature gates',
      'catalog capability guidance',
      'design pattern seeds',
      'public Table Talk and opponent claims',
    ],
    featureGates,
    capabilities: CAPABILITY_DEFINITIONS.map((definition) =>
      createCapability(definition, catalog, gateStates),
    ),
  }
}

function createCapability(
  definition: CapabilityDefinition,
  catalog: readonly PartDefinition[],
  gateStates: ReadonlyMap<string, AgentFeatureGate['state']>,
): AgentCatalogCapability {
  const candidateParts: AgentCapabilityCandidate[] = []
  const excludedCandidates: AgentCapabilityExclusion[] = []

  for (const part of catalog) {
    const featureGateIds = featureGateIdsForPart(part, definition)
    const disabledGateIds = featureGateIds.filter((gateId) => gateStates.get(gateId) === 'disabled')
    const deprecatedGateIds = featureGateIds.filter((gateId) => gateStates.get(gateId) === 'deprecated')

    if (definition.match(part) && disabledGateIds.length === 0 && deprecatedGateIds.length === 0) {
      candidateParts.push(toCandidate(part, definition, featureGateIds))
      continue
    }

    if (definition.match(part) || definition.nearMiss(part)) {
      excludedCandidates.push(
        toExclusion(part, definition, featureGateIds, disabledGateIds, deprecatedGateIds),
      )
    }
  }

  return {
    id: definition.id,
    label: definition.label,
    summary: definition.summary,
    routingHints: definition.routingHints,
    preferWhen: definition.preferWhen,
    neverUseWhen: definition.neverUseWhen,
    semanticCapabilities: definition.semanticCapabilities,
    requiredFeatureGateIds: definition.requiredFeatureGateIds,
    candidateParts: candidateParts
      .sort(compareCandidates)
      .slice(0, MAX_CANDIDATES_PER_CAPABILITY),
    excludedCandidates: excludedCandidates
      .filter((candidate) => candidate.reasons.length > 0)
      .sort(compareExclusions)
      .slice(0, MAX_EXCLUSIONS_PER_CAPABILITY),
    executionRules: definition.executionRules,
    commonErrors: definition.commonErrors,
  }
}

function toCandidate(
  part: PartDefinition,
  definition: CapabilityDefinition,
  featureGateIds: readonly string[],
): AgentCapabilityCandidate {
  return {
    partId: part.id,
    displayName: part.displayName,
    category: part.category,
    cost: part.cost,
    score: capabilityScore(part, definition),
    featureGateIds,
    reasons: candidateReasons(part),
    tradeoffs: tradeoffsForPart(part),
    companionNeeds: companionNeedsForPart(part),
  }
}

function toExclusion(
  part: PartDefinition,
  definition: CapabilityDefinition,
  featureGateIds: readonly string[],
  disabledGateIds: readonly string[],
  deprecatedGateIds: readonly string[],
): AgentCapabilityExclusion {
  const reasons: string[] = []

  if (disabledGateIds.length > 0) {
    reasons.push(`feature gate disabled: ${disabledGateIds.join(', ')}`)
  }

  if (deprecatedGateIds.length > 0) {
    reasons.push(`feature gate deprecated: ${deprecatedGateIds.join(', ')}`)
  }

  if (!definition.match(part)) {
    reasons.push(...nearMissReasons(part, definition))
  }

  return {
    partId: part.id,
    displayName: part.displayName,
    category: part.category,
    cost: part.cost,
    featureGateIds,
    reasons,
  }
}

function featureGateIdsForPart(
  part: PartDefinition,
  definition: CapabilityDefinition,
): readonly string[] {
  const gateIds = new Set(definition.requiredFeatureGateIds)

  if (part.behavior) {
    const behaviorGateId = FEATURE_GATE_BY_BEHAVIOR_ID.get(part.behavior.id)

    if (behaviorGateId) {
      gateIds.add(behaviorGateId)
    }
  }

  if (part.controls?.movement) gateIds.add('combat.movement_actions')
  if (part.controls?.weapon) gateIds.add('combat.weapon_actions')
  if (part.controls?.utility) gateIds.add('combat.utility_actions')

  return [...gateIds].sort()
}

function candidateReasons(part: PartDefinition): readonly string[] {
  const reasons: string[] = []

  if (part.controls?.movement) reasons.push('unlocks movement actions')
  if (part.controls?.weapon) reasons.push('unlocks weapon actions')
  if (part.controls?.utility) reasons.push('unlocks utility actions')
  if (part.behavior) reasons.push(`uses ${part.behavior.id} combat behavior`)

  for (const [key, value] of sortedStats(part.stats)) {
    if (Math.abs(value) >= 4) {
      reasons.push(`${key} ${value >= 0 ? '+' : ''}${value}`)
    }
  }

  if (part.durability >= 34) reasons.push(`high durability ${part.durability}`)

  return reasons.length > 0 ? reasons : ['low-cost supporting part']
}

function tradeoffsForPart(part: PartDefinition): readonly string[] {
  const tradeoffs: string[] = []

  if (part.cost >= 30) tradeoffs.push('expensive early purchase')
  if (part.mass >= 12) tradeoffs.push('adds meaningful mass')
  if (part.durability <= 12) tradeoffs.push('fragile if exposed')
  if (stat(part, 'drive') < 0) tradeoffs.push('reduces drive')
  if (stat(part, 'stability') < 0) tradeoffs.push('reduces stability')
  if (part.category === 'style') tradeoffs.push('mostly identity unless paired with a real plan')

  return tradeoffs
}

function companionNeedsForPart(part: PartDefinition): readonly string[] {
  if (part.category === 'weapon') {
    return ['movement or control to create range', 'armor or stability to survive trades']
  }

  if (part.category === 'mobility') {
    return ['connected body layout', 'weapon, utility, or hazard plan that uses the movement']
  }

  if (part.category === 'defense') {
    return ['damage, control, or utility win condition']
  }

  if (part.category === 'utility') {
    return ['timing from the current GameMasterPacket', 'protection if the utility is fragile']
  }

  if (part.category === 'body') {
    return ['mobility controls unless intentionally anchoring', 'at least one way to create value']
  }

  return ['legal blueprint connection and a real combat purpose']
}

function nearMissReasons(
  part: PartDefinition,
  definition: CapabilityDefinition,
): readonly string[] {
  if (part.category === 'style') {
    return ['style value does not directly satisfy this capability']
  }

  const reasons: string[] = []

  if (definition.requiredFeatureGateIds.includes('combat.movement_actions') && !part.controls?.movement) {
    reasons.push('does not unlock movement actions')
  }

  if (definition.requiredFeatureGateIds.includes('combat.weapon_actions') && !part.controls?.weapon) {
    reasons.push('does not unlock weapon actions')
  }

  if (definition.requiredFeatureGateIds.includes('combat.utility_actions') && !part.controls?.utility) {
    reasons.push('does not unlock utility actions')
  }

  if (part.cost >= 30) reasons.push('cost is high for a supporting route')
  if (part.durability <= 10) reasons.push('too fragile for this role by itself')

  return reasons.length > 0 ? reasons : ['adjacent part, but weaker match than selected candidates']
}

function capabilityScore(part: PartDefinition, definition: CapabilityDefinition): number {
  const behaviorScore = part.behavior ? 8 : 0
  const controlScore =
    (part.controls?.movement ? 5 : 0) +
    (part.controls?.weapon ? 5 : 0) +
    (part.controls?.utility ? 4 : 0)
  const statScore = stat(part, 'weapon') + stat(part, 'control') + stat(part, 'drive') +
    stat(part, 'traction') + stat(part, 'armor') + stat(part, 'stability')
  const roleBonus = definition.nearMiss(part) ? 4 : 0

  return Math.round((behaviorScore + controlScore + statScore + roleBonus) * 10) / 10
}

function compareCandidates(
  left: AgentCapabilityCandidate,
  right: AgentCapabilityCandidate,
): number {
  return right.score - left.score || left.cost - right.cost || left.partId.localeCompare(right.partId)
}

function compareExclusions(
  left: AgentCapabilityExclusion,
  right: AgentCapabilityExclusion,
): number {
  return left.cost - right.cost || left.partId.localeCompare(right.partId)
}

function stat(part: PartDefinition, key: keyof PartStats): number {
  return part.stats[key] ?? 0
}

function sortedStats(stats: PartStats): readonly [keyof PartStats, number][] {
  return Object.entries(stats).sort(([left], [right]) => left.localeCompare(right)) as [
    keyof PartStats,
    number,
  ][]
}
