export const BOT_STRATEGIES = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Mixed scoring across captures, Domains, economy, pressure, and cards.',
  },
  {
    id: 'random',
    label: 'Random legal',
    description: 'Seeded random legal action selection for replay coverage.',
  },
  {
    id: 'capture',
    label: 'Capture',
    description: 'Prioritizes captures and high-impact placements.',
  },
  {
    id: 'domain',
    label: 'Domain',
    description: 'Prioritizes anchors, stable Domains, and repairs.',
  },
  {
    id: 'economy',
    label: 'Economy',
    description: 'Prioritizes upkeep, gold, decrees, and card value.',
  },
  {
    id: 'pressure',
    label: 'Pressure',
    description: 'Prioritizes influence, corruption, and pressure defense.',
  },
  {
    id: 'cards',
    label: 'Cards',
    description: 'Prioritizes drafting, sets, discards, and counter-draft play.',
  },
  {
    id: 'simulation',
    label: 'Simulation eval',
    description: 'Request-only heuristic used by fixed-seed simulation batches.',
  },
]

const BOT_STRATEGY_IDS = new Set(BOT_STRATEGIES.map((strategy) => strategy.id))

const PLACEMENT_ACTION_TYPES = new Set(['PLACE_STONE', 'SPEND_REINFORCEMENT'])

const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619

export function chooseBotAction(agentRequest, options = {}) {
  const legalActions = Array.isArray(agentRequest?.legalActions)
    ? agentRequest.legalActions
    : []

  if (legalActions.length === 0) {
    return null
  }

  const strategy = normalizeStrategy(options.strategy)
  const selectableActions =
    legalActions.filter((action) => action.type !== 'SURRENDER') ?? legalActions

  if (selectableActions.length === 0) {
    return legalActions[0].id
  }

  if (strategy === 'random') {
    const rng = createSeededRng(options.seed ?? agentRequest.requestId ?? 'random')
    return selectableActions[Math.floor(rng() * selectableActions.length)]?.id ?? null
  }

  const context = createBotContext(agentRequest, strategy)
  const scored = selectableActions.map((action) => ({
    action,
    score: scoreAction(action, context),
  }))

  scored.sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id))

  return scored[0]?.action.id ?? null
}

function normalizeStrategy(strategy) {
  return BOT_STRATEGY_IDS.has(strategy) ? strategy : 'balanced'
}

function createBotContext(agentRequest, strategy) {
  const seat = agentRequest?.seat
  const activeWarnings = agentRequest?.publicState?.victory?.activeWarnings ?? []
  const threatened =
    activeWarnings.some((warning) => warning.seat === seat) ||
    activeWarnings.length > 0

  return {
    strategy,
    seat,
    threatened,
    privateCards: agentRequest?.privateState?.cards ?? null,
  }
}

function scoreAction(action, context) {
  const typeScore = scoreByType(action)
  const strategyScore = scoreByStrategy(action, context)
  const urgencyScore = scoreUrgency(action, context)

  return typeScore + strategyScore + urgencyScore + scorePlacement(action)
}

function scoreByType(action) {
  const scoreByAction = {
    PAY_UPKEEP: 64,
    DISCARD_CARD: 90,
    COUNTER_IMMEDIATE: 78,
    COUNTER_SAFE_FALLBACK: 74,
    COUNTER_SEEK_MISSING: 70,
    CASH_SET: 66,
    TARGET_BRIBE_NETWORK: 44,
    ASSIGN_INFLUENCE_PRESSURE: 40,
    PURGE_CORRUPTION: 38,
    ASSIGN_INFLUENCE_SUPPORT: 34,
    BUY_DECREE:
      30 +
      (action.preview?.decreeIncomeAfter ?? 0) +
      (action.preview?.corruptionAfter ?? 0),
    UPGRADE_DECREE:
      26 +
      (action.preview?.levelAfter ?? 1) * 4 +
      (action.preview?.corruptionAfter ?? 0),
    SPEND_COUNTER_BRIBE: 24,
    SCRAP_RUINED_DECREE: 20 + (action.preview?.goldGain ?? 0) * 3,
    CONVERT_RUINED_DECREE: 36 + (action.preview?.levelAfter ?? 1) * 4,
    DRAFT_CARD: action.payload?.fallback === 'gold' ? 18 : 42,
    PASS: 1,
  }

  if (Object.hasOwn(scoreByAction, action.type)) {
    return scoreByAction[action.type]
  }

  if (PLACEMENT_ACTION_TYPES.has(action.type)) {
    return 10
  }

  return 0
}

function scorePlacement(action) {
  if (!PLACEMENT_ACTION_TYPES.has(action.type)) {
    return 0
  }

  const q = action.payload?.q ?? 0
  const r = action.payload?.r ?? 0
  const centerBias = 4 - Math.max(Math.abs(q), Math.abs(r))
  const anchorBias = (action.preview?.adjacentAnchors?.length ?? 0) * 4
  const captureBias = (action.preview?.capturedCount ?? 0) * 16
  const reinforcementBias = action.type === 'SPEND_REINFORCEMENT' ? 1 : 0

  return centerBias + anchorBias + captureBias + reinforcementBias
}

function scoreByStrategy(action, context) {
  const strategyScoreByType = {
    capture: {
      PLACE_STONE: 8 + (action.preview?.capturedCount ?? 0) * 24,
      SPEND_REINFORCEMENT: 12 + (action.preview?.capturedCount ?? 0) * 24,
    },
    domain: {
      REPAIR_DOMAIN: 28,
      PLACE_STONE: (action.preview?.adjacentAnchors?.length ?? 0) * 12,
      SPEND_REINFORCEMENT: 8 + (action.preview?.adjacentAnchors?.length ?? 0) * 12,
      BUY_DECREE: 16,
      UPGRADE_DECREE: 14,
      CONVERT_RUINED_DECREE: 12,
    },
    economy: {
      PAY_UPKEEP: 28,
      BUY_DECREE: 26,
      UPGRADE_DECREE: 22,
      CONVERT_RUINED_DECREE: 18,
      SCRAP_RUINED_DECREE: 14,
      CASH_SET: 12,
      DRAFT_CARD: 8,
    },
    pressure: {
      TARGET_BRIBE_NETWORK: 24,
      ASSIGN_INFLUENCE_PRESSURE: 22,
      PURGE_CORRUPTION: 22,
      ASSIGN_INFLUENCE_SUPPORT: 18,
      SPEND_COUNTER_BRIBE: 16,
    },
    cards: {
      DISCARD_CARD: 28,
      CASH_SET: 26,
      COUNTER_IMMEDIATE: 22,
      COUNTER_SAFE_FALLBACK: 20,
      COUNTER_SEEK_MISSING: 18,
      DRAFT_CARD: 18,
    },
    simulation: {
      PAY_UPKEEP: 18,
      DISCARD_CARD: 18,
      CASH_SET: 14,
      REPAIR_DOMAIN: 12,
      COUNTER_IMMEDIATE: 12,
      COUNTER_SAFE_FALLBACK: 10,
      ASSIGN_INFLUENCE_PRESSURE: 10,
    },
  }

  const strategyScores = strategyScoreByType[context.strategy]

  if (!strategyScores) {
    return 0
  }

  return strategyScores[action.type] ?? 0
}

function scoreUrgency(action, context) {
  let score = 0

  if (action.type === 'REPAIR_DOMAIN') {
    score +=
      12 +
      ((action.preview?.stabilityAfter ?? 0) -
        (action.preview?.stabilityBefore ?? 0)) *
        5
  }

  if (context.threatened) {
    if (['PURGE_CORRUPTION', 'SPEND_COUNTER_BRIBE', 'REPAIR_DOMAIN'].includes(action.type)) {
      score += 24
    }

    if (action.type === 'COUNTER_IMMEDIATE') {
      score += 10
    }
  }

  if (
    context.strategy === 'simulation' &&
    !context.threatened &&
    action.type === 'COUNTER_SEEK_MISSING'
  ) {
    score -= 6
  }

  if (
    context.privateCards?.mustDiscard &&
    action.type === 'DISCARD_CARD'
  ) {
    score += 24
  }

  return score
}

function createSeededRng(seed) {
  let value = hashSeed(String(seed))

  return () => {
    value += 0x6d2b79f5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(seed) {
  let hash = FNV_OFFSET

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, FNV_PRIME)
  }

  return hash >>> 0
}
