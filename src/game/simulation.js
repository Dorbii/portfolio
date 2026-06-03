import { BOT_STRATEGIES, chooseBotAction } from './bots.js'
import {
  createAgentRequest,
  createMatch,
  getEraForCycle,
  submitProtocolAction,
} from './engine.js'

const SEATS = ['black', 'white']
const DEFAULT_MAX_TURNS = 256
const DEFAULT_BATCH_RUNS = 4
const DEFAULT_LONG_GAME_CYCLE_THRESHOLD = 9
const BOT_STRATEGY_BY_ID = new Map(
  BOT_STRATEGIES.map((strategy) => [strategy.id, strategy]),
)

const DOMAIN_VALUE_BY_KIND = Object.freeze({
  Capital: 4,
  Mine: 3,
  Village: 2,
  Temple: 2,
  Fort: 2,
  Ruins: 1,
})

function hashSeed(seed) {
  const normalized = String(seed ?? 'hex-sovereign')
  let hash = 2166136261

  for (const char of normalized) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createMulberry32(seed) {
  let state = seed >>> 0

  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0
    let next = Math.imul(state ^ (state >>> 15), state | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function buildSeatMap(input, fallback) {
  return Object.fromEntries(
    SEATS.map((seat) => [seat, input?.[seat] ?? fallback(seat)]),
  )
}

function defaultTokenFor(seat) {
  return `simulation-${seat}-token`
}

function normalizeStrategies(options = {}) {
  const fallbackStrategy = options.strategy ?? chooseBotAction
  const archetypeOverrides = options.seatArchetypes ?? {}

  return Object.fromEntries(
    SEATS.map((seat) => {
      const choice = options.seatStrategies?.[seat] ?? fallbackStrategy
      const strategy = normalizeStrategyChoice(choice, seat, options)

      return [
        seat,
        {
          ...strategy,
          archetype: archetypeOverrides[seat] ?? strategy.archetype,
        },
      ]
    }),
  )
}

function normalizeStrategyChoice(choice, seat, options) {
  if (typeof choice === 'function') {
    return {
      chooseAction: choice,
      archetype:
        choice === chooseBotAction
          ? 'balanced'
          : choice.archetype ?? choice.strategyId ?? choice.name ?? 'custom',
    }
  }

  if (typeof choice !== 'string') {
    throw new TypeError(
      `Expected a simulation strategy function or bot strategy id for ${seat}.`,
    )
  }

  if (!BOT_STRATEGY_BY_ID.has(choice)) {
    throw new TypeError(`Unknown bot strategy id "${choice}" for ${seat}.`)
  }

  const seed = options.seed ?? 'hex-sovereign-simulation'

  return {
    archetype: choice,
    chooseAction: (agentRequest) =>
      chooseBotAction(agentRequest, {
        strategy: choice,
        seed: `${seed}:${agentRequest.matchId}:${agentRequest.requestId}:${seat}`,
      }),
  }
}

function getStrategyArchetypes(strategyPlan) {
  return Object.fromEntries(
    SEATS.map((seat) => [seat, strategyPlan[seat]?.archetype ?? 'custom']),
  )
}

function buildProtocolSubmission(agentRequest, selectedActionId, token) {
  return {
    type: 'AGENT_SUBMIT_ACTION',
    requestId: agentRequest.requestId,
    matchId: agentRequest.matchId,
    seat: agentRequest.seat,
    selectedActionId,
    token,
  }
}

function getSelectedAction(agentRequest, selectedActionId) {
  return (
    agentRequest.legalActions.find((action) => action.id === selectedActionId) ??
    null
  )
}

function createAggregateTracker() {
  return {
    requestCount: 0,
    totalLegalActions: 0,
    warningSampleCount: 0,
    warningCounts: {},
    warningSeatCounts: {},
    mandateSampleCount: 0,
    mandateCounts: {},
    mandateSeatCounts: {},
    predictionEraIds: new Set(),
    predictions: [],
  }
}

function incrementCounter(counter, key) {
  counter[key] = (counter[key] ?? 0) + 1
}

function getPublicSeatScore(publicState) {
  const scores = {
    black: 0,
    white: 0,
  }

  for (const domain of publicState.domains ?? []) {
    if (!domain.owner || !Object.hasOwn(scores, domain.owner)) continue

    scores[domain.owner] += DOMAIN_VALUE_BY_KIND[domain.anchorKind] ?? 0
    scores[domain.owner] += domain.stability ?? 0
    scores[domain.owner] += 1
  }

  for (const seat of SEATS) {
    scores[seat] += publicState.players?.[seat]?.captures ?? 0
  }

  return scores
}

export function predictWinnerFromRequest(agentRequest) {
  const victory = agentRequest.publicState.victory

  if (victory?.winner) {
    return {
      predictedWinner: victory.winner,
      basis: 'public-victory',
    }
  }

  if (victory?.warningOwner) {
    return {
      predictedWinner: victory.warningOwner,
      basis: 'warning-owner',
    }
  }

  const mandateOwners = Object.entries(victory?.mandates ?? {}).filter(
    ([, mandate]) => mandate,
  )

  if (mandateOwners.length === 1) {
    return {
      predictedWinner: mandateOwners[0][0],
      basis: 'sole-mandate',
    }
  }

  const publicScores = getPublicSeatScore(agentRequest.publicState)

  if (publicScores.black === publicScores.white) {
    return {
      predictedWinner: null,
      basis: 'tied-public-score',
      publicScores,
    }
  }

  return {
    predictedWinner:
      publicScores.black > publicScores.white ? 'black' : 'white',
    basis: 'public-score',
    publicScores,
  }
}

function recordEraPrediction(tracker, agentRequest) {
  const era = getEraForCycle(agentRequest.cycle)

  if (agentRequest.cycle !== era.cycleEnd || tracker.predictionEraIds.has(era.id)) {
    return
  }

  const prediction = predictWinnerFromRequest(agentRequest)

  tracker.predictionEraIds.add(era.id)
  tracker.predictions.push({
    eraId: era.id,
    eraLabel: era.label,
    cycle: agentRequest.cycle,
    turn: agentRequest.turn,
    seatToAct: agentRequest.seat,
    predictedWinner: prediction.predictedWinner,
    basis: prediction.basis,
    publicScores: prediction.publicScores,
  })
}

function observeRequest(tracker, agentRequest) {
  tracker.requestCount += 1
  tracker.totalLegalActions += agentRequest.legalActions.length

  const activeWarnings = agentRequest.publicState.victory?.activeWarnings ?? []

  if (activeWarnings.length > 0) {
    tracker.warningSampleCount += 1

    for (const warning of activeWarnings) {
      incrementCounter(tracker.warningCounts, warning.type)
      incrementCounter(tracker.warningSeatCounts, warning.seat)
    }
  }

  const mandates = Object.entries(agentRequest.publicState.victory?.mandates ?? {}).filter(
    ([, mandate]) => mandate,
  )

  if (mandates.length > 0) {
    tracker.mandateSampleCount += 1

    for (const [seat, mandate] of mandates) {
      incrementCounter(tracker.mandateSeatCounts, seat)
      incrementCounter(tracker.mandateCounts, mandate.type)
    }
  }

  recordEraPrediction(tracker, agentRequest)
}

function summarizeSeatChoiceCounts(seatCounts = {}) {
  const total = Object.values(seatCounts).reduce(
    (sum, count) => sum + count,
    0,
  )

  return {
    total,
    counts: { ...seatCounts },
    rates: Object.fromEntries(
      Object.entries(seatCounts).map(([choice, count]) => [
        choice,
        total === 0 ? 0 : count / total,
      ]),
    ),
  }
}

function summarizeCounterDraftChoices(cardsMetrics) {
  const seatCounts = cardsMetrics?.counterDraftChoices ?? {}
  const counts = {}

  for (const perSeatCounts of Object.values(seatCounts)) {
    for (const [choice, count] of Object.entries(perSeatCounts ?? {})) {
      counts[choice] = (counts[choice] ?? 0) + count
    }
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return {
    total,
    counts,
    rates: Object.fromEntries(
      Object.entries(counts).map(([choice, count]) => [
        choice,
        total === 0 ? 0 : count / total,
      ]),
    ),
    bySeat: Object.fromEntries(
      SEATS.map((seat) => [seat, summarizeSeatChoiceCounts(seatCounts[seat])]),
    ),
  }
}

function summarizeChoiceFrequency(choiceSummary, choiceType) {
  return {
    total: choiceSummary.total,
    count: choiceSummary.counts[choiceType] ?? 0,
    rate: choiceSummary.rates[choiceType] ?? 0,
  }
}

function finalizePredictions(predictions, actualWinner) {
  return predictions.map((prediction) => ({
    ...prediction,
    actualWinner: actualWinner ?? null,
    matchedWinner:
      actualWinner == null || prediction.predictedWinner == null
        ? null
        : prediction.predictedWinner === actualWinner,
  }))
}

function createPredictionSummary(predictions) {
  const comparable = predictions.filter(
    (prediction) =>
      prediction.actualWinner != null && prediction.predictedWinner != null,
  )
  const correct = comparable.filter((prediction) => prediction.matchedWinner).length

  return {
    total: predictions.length,
    comparable: comparable.length,
    correct,
    accuracy: comparable.length === 0 ? null : correct / comparable.length,
  }
}

function createFrequencySummary(sampleCount, counts, bySeat, requestCount) {
  return {
    sampleCount,
    rate: requestCount === 0 ? 0 : sampleCount / requestCount,
    counts,
    bySeat,
  }
}

function runSimulationTurnInternal(state, options = {}) {
  const agentRequest = createAgentRequest(state, state.activeSeat)

  if (agentRequest.legalActions.length === 0) {
    return {
      request: agentRequest,
      submission: null,
      selectedActionId: null,
      result: {
        accepted: false,
        reason: 'NO_LEGAL_ACTIONS',
        message: 'No legal actions remain.',
        state,
      },
    }
  }

  const strategies = options.strategyPlan ?? normalizeStrategies(options)
  const strategy = strategies[agentRequest.seat]
  const selectedActionId = strategy.chooseAction(agentRequest)

  if (typeof selectedActionId !== 'string') {
    throw new TypeError(
      `Expected ${agentRequest.seat} strategy to return a legal action id string.`,
    )
  }

  const selectedAction = getSelectedAction(agentRequest, selectedActionId)

  if (!selectedAction) {
    throw new Error(
      `Strategy selected illegal action ${selectedActionId} for ${agentRequest.seat}.`,
    )
  }

  const seatTokens = buildSeatMap(options.seatTokens, defaultTokenFor)
  const expectedTokens = buildSeatMap(
    options.expectedTokens,
    (seat) => seatTokens[seat],
  )
  const submission = buildProtocolSubmission(
    agentRequest,
    selectedActionId,
    seatTokens[agentRequest.seat],
  )
  const result = submitProtocolAction(state, submission, {
    expectedToken: expectedTokens[agentRequest.seat],
  })

  return {
    request: agentRequest,
    submission,
    selectedActionId,
    result,
  }
}

export function runSimulationTurn(state, options = {}) {
  return runSimulationTurnInternal(state, options)
}

export function createSeededActionStrategy(seed) {
  const nextRandom = createMulberry32(hashSeed(seed))

  function chooseSeededAction(agentRequest) {
    if (agentRequest.legalActions.length === 0) {
      return null
    }

    const sortedActionIds = agentRequest.legalActions
      .map((action) => action.id)
      .sort((left, right) => left.localeCompare(right))
    const index = Math.floor(nextRandom() * sortedActionIds.length)

    return sortedActionIds[index]
  }

  chooseSeededAction.strategyId = 'seeded-random'
  return chooseSeededAction
}

export function simulateMatch(options = {}) {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS
  const longGameCycleThreshold =
    options.longGameCycleThreshold ?? DEFAULT_LONG_GAME_CYCLE_THRESHOLD
  const tracker = createAggregateTracker()
  const strategyPlan = normalizeStrategies(options)
  const strategyArchetypes = getStrategyArchetypes(strategyPlan)
  const history = []
  const acceptedActionIds = []
  let state = createMatch(options.matchConfig ?? {})
  let endReason = 'MAX_TURNS'

  while (history.length < maxTurns) {
    const step = runSimulationTurnInternal(state, {
      ...options,
      strategyPlan,
    })

    if (step.request.legalActions.length === 0) {
      endReason = state.victory?.winner ? 'VICTORY' : 'NO_LEGAL_ACTIONS'
      break
    }

    observeRequest(tracker, step.request)

    if (!step.result.accepted) {
      throw new Error(
        `Simulation action rejected with ${step.result.reason ?? 'UNKNOWN_ERROR'}.`,
      )
    }

    const selectedAction = getSelectedAction(step.request, step.selectedActionId)

    history.push({
      turn: step.request.turn,
      cycle: step.request.cycle,
      round: step.request.round,
      seat: step.request.seat,
      requestId: step.request.requestId,
      legalActionCount: step.request.legalActions.length,
      selectedActionId: step.selectedActionId,
      actionType: selectedAction?.type ?? null,
      accepted: step.result.accepted,
    })
    acceptedActionIds.push(step.selectedActionId)
    state = step.result.state

    if (state.victory?.winner) {
      endReason = 'VICTORY'
      break
    }
  }

  if (endReason === 'MAX_TURNS' && history.length < maxTurns) {
    endReason = state.victory?.winner ? 'VICTORY' : 'NO_LEGAL_ACTIONS'
  }

  const finalRequest = createAgentRequest(state, state.activeSeat)
  const actualWinner =
    state.victory?.winner ?? finalRequest.publicState.victory?.winner ?? null
  const eraEndPredictions = finalizePredictions(tracker.predictions, actualWinner)
  const counterDraftChoices = summarizeCounterDraftChoices(
    finalRequest.publicState.cards?.metrics,
  )
  const longGame =
    endReason === 'MAX_TURNS' || state.cycle >= longGameCycleThreshold

  return {
    state,
    finalRequest,
    endReason,
    history,
    acceptedActionIds,
    eraEndPredictions,
    metrics: {
      winner: actualWinner,
      winnerArchetype: actualWinner ? strategyArchetypes[actualWinner] : null,
      winCondition:
        state.victory?.winReason ?? finalRequest.publicState.victory?.winReason ?? null,
      endCycle: state.cycle,
      era: getEraForCycle(state.cycle),
      strategyArchetypes,
      averageLegalActions:
        tracker.requestCount === 0
          ? 0
          : tracker.totalLegalActions / tracker.requestCount,
      averageCycleLength: state.cycle,
      longGame,
      longGameFrequency: longGame ? 1 : 0,
      warningFrequency: createFrequencySummary(
        tracker.warningSampleCount,
        tracker.warningCounts,
        tracker.warningSeatCounts,
        tracker.requestCount,
      ),
      mandateFrequency: createFrequencySummary(
        tracker.mandateSampleCount,
        tracker.mandateCounts,
        tracker.mandateSeatCounts,
        tracker.requestCount,
      ),
      counterDraftChoices,
      seekMissingCardFrequency: summarizeChoiceFrequency(
        counterDraftChoices,
        'COUNTER_SEEK_MISSING',
      ),
      predictionSummary: createPredictionSummary(eraEndPredictions),
    },
  }
}

function countBy(results, selectValue) {
  const counts = {}

  for (const result of results) {
    const value = selectValue(result) ?? 'UNRESOLVED'
    counts[value] = (counts[value] ?? 0) + 1
  }

  return counts
}

function average(values) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function mergeCounts(results, selectCounts) {
  const merged = {}

  for (const result of results) {
    for (const [key, count] of Object.entries(selectCounts(result) ?? {})) {
      merged[key] = (merged[key] ?? 0) + count
    }
  }

  return merged
}

function summarizeChoiceCounts(counts) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return {
    total,
    counts,
    rates: Object.fromEntries(
      Object.entries(counts).map(([choice, count]) => [
        choice,
        total === 0 ? 0 : count / total,
      ]),
    ),
  }
}

function summarizeBatchPredictions(results) {
  const totals = results.reduce(
    (summary, result) => ({
      total: summary.total + result.metrics.predictionSummary.total,
      comparable:
        summary.comparable + result.metrics.predictionSummary.comparable,
      correct: summary.correct + result.metrics.predictionSummary.correct,
    }),
    {
      total: 0,
      comparable: 0,
      correct: 0,
    },
  )

  return {
    ...totals,
    accuracy: totals.comparable === 0 ? null : totals.correct / totals.comparable,
  }
}

function summarizeBatchFrequency(results, key) {
  return {
    averageRate: average(results.map((result) => result.metrics[key].rate)),
    sampleCount: results.reduce(
      (sum, result) => sum + result.metrics[key].sampleCount,
      0,
    ),
    counts: mergeCounts(results, (result) => result.metrics[key].counts),
    bySeat: mergeCounts(results, (result) => result.metrics[key].bySeat),
  }
}

function summarizeBatchMetrics(results) {
  const endCycles = results.map((result) => result.metrics.endCycle)
  const counterDraftChoices = summarizeChoiceCounts(
    mergeCounts(results, (result) => result.metrics.counterDraftChoices.counts),
  )

  return {
    matchCount: results.length,
    winners: countBy(results, (result) => result.metrics.winner),
    winnerArchetypes: countBy(
      results,
      (result) => result.metrics.winnerArchetype,
    ),
    winConditions: countBy(results, (result) => result.metrics.winCondition),
    endCycle: {
      average: average(endCycles),
      min: endCycles.length === 0 ? 0 : Math.min(...endCycles),
      max: endCycles.length === 0 ? 0 : Math.max(...endCycles),
    },
    averageCycleLength: average(endCycles),
    eras: countBy(results, (result) => result.metrics.era.label),
    longGameFrequency: average(
      results.map((result) => (result.metrics.longGame ? 1 : 0)),
    ),
    averageLegalActions: average(
      results.map((result) => result.metrics.averageLegalActions),
    ),
    warningFrequency: summarizeBatchFrequency(results, 'warningFrequency'),
    mandateFrequency: summarizeBatchFrequency(results, 'mandateFrequency'),
    counterDraftChoices,
    seekMissingCardFrequency: summarizeChoiceFrequency(
      counterDraftChoices,
      'COUNTER_SEEK_MISSING',
    ),
    predictionSummary: summarizeBatchPredictions(results),
  }
}

export function simulateBatch(options = {}) {
  const runs = options.runs ?? DEFAULT_BATCH_RUNS
  const seed = options.seed ?? 'hex-sovereign-batch'
  const results = []

  for (let index = 0; index < runs; index += 1) {
    const matchConfig =
      typeof options.matchConfig === 'function'
        ? options.matchConfig(index)
        : options.matchConfig

    results.push(
      simulateMatch({
        ...options,
        seed: `${seed}:${index}`,
        matchConfig,
      }),
    )
  }

  return {
    results,
    metrics: summarizeBatchMetrics(results),
  }
}
