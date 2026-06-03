import assert from 'node:assert/strict'
import test from 'node:test'

import { createMatch } from './engine.js'
import {
  createSeededActionStrategy,
  runSimulationTurn,
  simulateBatch,
  simulateMatch,
} from './simulation.js'

function stonesFromIds(assignments) {
  return Object.entries(assignments).map(([id, seat]) => {
    const [q, r] = id.split(',').map(Number)
    return { q, r, seat }
  })
}

function passFirstStrategy(agentRequest) {
  return (
    agentRequest.legalActions.find((action) => action.type === 'PASS')?.id ??
    agentRequest.legalActions[0]?.id
  )
}

test('fixed-seed replay produces a stable accepted legal-action sequence', () => {
  const options = {
    maxTurns: 12,
    matchConfig: {
      featureFlags: {
        reinforcements: true,
      },
      initialReinforcements: {
        black: 1,
        white: 1,
      },
    },
  }
  const firstReplay = simulateMatch({
    ...options,
    strategy: createSeededActionStrategy('slice-h-stable-seed'),
  })
  const secondReplay = simulateMatch({
    ...options,
    strategy: createSeededActionStrategy('slice-h-stable-seed'),
  })

  assert.deepEqual(firstReplay.acceptedActionIds, secondReplay.acceptedActionIds)
  assert.ok(firstReplay.acceptedActionIds.length > 0)
  assert.equal(firstReplay.history.every((entry) => entry.accepted), true)
})

test('simulation strategy receives only AgentRequest projections', () => {
  let callCount = 0

  const result = simulateMatch({
    maxTurns: 2,
    matchConfig: {
      featureFlags: {
        regionCards: true,
      },
    },
    strategy: (...args) => {
      callCount += 1
      assert.equal(args.length, 1)

      const [agentRequest] = args

      assert.equal(agentRequest.type, 'AGENT_REQUEST')
      assert.equal(Object.hasOwn(agentRequest, 'activeSeat'), false)
      assert.equal(Object.hasOwn(agentRequest, 'players'), false)
      assert.equal(agentRequest.publicState.cards.players.black.hand, undefined)
      assert.equal(agentRequest.publicState.cards.players.white.hand, undefined)

      return passFirstStrategy(agentRequest)
    },
  })

  assert.equal(callCount, 2)
  assert.equal(result.history.length, 2)
})

test('simulation turn advances only through submitProtocolAction validation', () => {
  const state = createMatch({ matchId: 'simulation-protocol-match' })
  const before = JSON.stringify(state)
  const step = runSimulationTurn(state, {
    strategy: passFirstStrategy,
    seatTokens: {
      black: 'bad-token',
    },
    expectedTokens: {
      black: 'good-token',
    },
  })

  assert.equal(step.result.accepted, false)
  assert.equal(step.result.reason, 'BAD_TOKEN')
  assert.equal(step.result.state, state)
  assert.equal(JSON.stringify(state), before)
  assert.equal(
    step.request.legalActions.some(
      (action) => action.id === step.submission.selectedActionId,
    ),
    true,
  )
})

test('simulation reports winner, frequencies, counter-draft rates, and era-end predictions', () => {
  const result = simulateMatch({
    maxTurns: 18,
    longGameCycleThreshold: 2,
    matchConfig: {
      featureFlags: {
        income: true,
        stability: true,
        regionCards: true,
        setCashIns: true,
        counterDraft: true,
        victoryWarnings: true,
        mandates: true,
      },
      initialStones: stonesFromIds({
        '-2,3': 'white',
        '-1,2': 'white',
        '0,-3': 'white',
        '1,-4': 'white',
        '0,-1': 'white',
        '1,-1': 'white',
        '1,1': 'black',
        '2,0': 'black',
        '-1,-1': 'black',
        '-2,-1': 'black',
      }),
      initialCardState: {
        players: {
          black: {
            revealedSets: [
              {
                id: 'revealed-iron',
                owner: 'black',
                setType: 'MATCHING_REGION',
                regionId: 'iron-basin',
                cycle: 1,
                strength: 1,
              },
              {
                id: 'revealed-temple',
                owner: 'black',
                setType: 'MATCHING_REGION',
                regionId: 'temple-coast',
                cycle: 1,
                strength: 1,
              },
            ],
          },
        },
      },
      initialCards: {
        black: [
          { id: 'central-1', regionId: 'central-plain' },
          { id: 'central-2', regionId: 'central-plain' },
          { id: 'central-3', regionId: 'central-plain' },
        ],
        white: [
          { id: 'white-ash-1', regionId: 'ash-marsh' },
          { id: 'white-ash-2', regionId: 'ash-marsh' },
        ],
      },
    },
    seatArchetypes: {
      black: 'military-test',
      white: 'counter-test',
    },
    strategy: (agentRequest) => {
      if (agentRequest.seat === 'black') {
        const cashSet = agentRequest.legalActions.find(
          (action) => action.type === 'CASH_SET',
        )
        if (cashSet) return cashSet.id
      }

      if (agentRequest.seat === 'white') {
        const seekMissing = agentRequest.legalActions.find(
          (action) => action.type === 'COUNTER_SEEK_MISSING',
        )
        if (seekMissing) return seekMissing.id
      }

      return passFirstStrategy(agentRequest)
    },
  })

  assert.equal(result.endReason, 'VICTORY')
  assert.equal(result.metrics.winner, 'black')
  assert.equal(result.metrics.winnerArchetype, 'military-test')
  assert.equal(result.metrics.winCondition, 'MILITARY_MANDATE')
  assert.equal(result.metrics.endCycle, 3)
  assert.equal(result.metrics.era.id, 2)
  assert.equal(result.metrics.averageCycleLength, 3)
  assert.equal(Number.isFinite(result.metrics.averageLegalActions), true)
  assert.equal(result.metrics.longGame, true)
  assert.equal(result.metrics.longGameFrequency, 1)
  assert.equal(result.metrics.warningFrequency.sampleCount, 8)
  assert.equal(result.metrics.warningFrequency.rate, 8 / 18)
  assert.equal(result.metrics.warningFrequency.counts.MILITARY_MANDATE, 8)
  assert.equal(result.metrics.mandateFrequency.sampleCount, 17)
  assert.equal(result.metrics.mandateFrequency.rate, 17 / 18)
  assert.equal(result.metrics.mandateFrequency.counts.MILITARY_MANDATE, 17)
  assert.equal(result.metrics.counterDraftChoices.total, 1)
  assert.equal(result.metrics.counterDraftChoices.counts.COUNTER_SEEK_MISSING, 1)
  assert.equal(result.metrics.counterDraftChoices.rates.COUNTER_SEEK_MISSING, 1)
  assert.equal(result.metrics.seekMissingCardFrequency.count, 1)
  assert.equal(result.metrics.seekMissingCardFrequency.rate, 1)
  assert.equal(result.history[0].actionType, 'CASH_SET')
  assert.equal(result.history[1].actionType, 'COUNTER_SEEK_MISSING')
  assert.equal(result.eraEndPredictions.length, 1)
  assert.equal(result.eraEndPredictions[0].cycle, 2)
  assert.equal(result.eraEndPredictions[0].predictedWinner, 'black')
  assert.equal(result.eraEndPredictions[0].basis, 'warning-owner')
  assert.equal(result.eraEndPredictions[0].actualWinner, 'black')
  assert.equal(result.eraEndPredictions[0].matchedWinner, true)
  assert.equal(result.metrics.predictionSummary.comparable, 1)
  assert.equal(result.metrics.predictionSummary.correct, 1)
  assert.equal(result.metrics.predictionSummary.accuracy, 1)
})

test('simulation batches aggregate source balance contract fields', () => {
  const batch = simulateBatch({
    runs: 3,
    seed: 'slice-h-batch',
    maxTurns: 6,
    strategy: 'random',
    matchConfig: {
      featureFlags: {
        reinforcements: true,
        victoryWarnings: true,
        mandates: true,
      },
    },
  })

  assert.equal(batch.results.length, 3)
  assert.equal(batch.metrics.matchCount, 3)
  assert.equal(Number.isFinite(batch.metrics.endCycle.average), true)
  assert.equal(Number.isFinite(batch.metrics.averageCycleLength), true)
  assert.equal(Number.isFinite(batch.metrics.averageLegalActions), true)
  assert.equal(Number.isFinite(batch.metrics.longGameFrequency), true)
  assert.equal(typeof batch.metrics.winners, 'object')
  assert.equal(typeof batch.metrics.winnerArchetypes, 'object')
  assert.equal(typeof batch.metrics.winConditions, 'object')
  assert.equal(typeof batch.metrics.eras, 'object')
  assert.equal(typeof batch.metrics.warningFrequency.counts, 'object')
  assert.equal(typeof batch.metrics.mandateFrequency.counts, 'object')
  assert.equal(typeof batch.metrics.counterDraftChoices.rates, 'object')
  assert.equal(
    Number.isFinite(batch.metrics.seekMissingCardFrequency.rate),
    true,
  )
  assert.equal(
    batch.results[0].acceptedActionIds.join('|'),
    simulateBatch({
      runs: 1,
      seed: 'slice-h-batch',
      maxTurns: 6,
      strategy: 'random',
      matchConfig: {
        featureFlags: {
          reinforcements: true,
          victoryWarnings: true,
          mandates: true,
        },
      },
    }).results[0].acceptedActionIds.join('|'),
  )
})
