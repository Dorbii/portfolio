import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeTactics } from '../.test-build/packages/catalog/src/index.js'
import {
  deriveBotStats,
  resolveCombat,
} from '../.test-build/packages/sim/src/index.js'
import { validateReplayTimeline } from '../.test-build/packages/replay/src/index.js'
import {
  createReplayBelievabilityScenarios,
  fastSprinterBlueprint,
  stationarySpinnerBlueprint,
} from './fixtures/archetypeScenarios.mjs'

const TURRET_REACH_BONUS = 2.25
const SENSOR_REACH_BONUS = 0.9
const DRONE_RANGE = 12.5
const EPSILON = 0.001

const scenarios = createReplayBelievabilityScenarios(normalizeTactics)

function runScenario(scenario) {
  return resolveCombat(scenario.input)
}

function runWithoutKeyPart(scenario) {
  const bot = scenario.withoutKeyPart.bot

  return resolveCombat({
    ...scenario.input,
    [bot]: {
      ...scenario.input[bot],
      blueprint: scenario.withoutKeyPart.blueprint,
    },
  })
}

function assertValidBoundedTimeline(result, scenarioId) {
  assert.equal(validateReplayTimeline(result.replay), true, scenarioId)
  assert.ok(result.replay.duration >= 6, scenarioId)
  assert.ok(result.replay.duration <= 600, scenarioId)
  assert.ok(result.replay.events.length > 0, scenarioId)
  assert.ok(result.replay.events.length < 4_000, scenarioId)
  assert.equal(
    result.replay.events.every(
      (event, index, events) => index === 0 || events[index - 1].t <= event.t,
    ),
    true,
    scenarioId,
  )
  assert.equal(
    result.replay.events.every(
      (event) => event.t >= 0 && event.t <= result.replay.duration,
    ),
    true,
    scenarioId,
  )
}

function moveEvents(result, bot) {
  return result.replay.events.filter(
    (event) => event.type === 'move' && event.bot === bot,
  )
}

function integerMoveEvents(result, bot) {
  return moveEvents(result, bot).filter((event) => Number.isInteger(event.t))
}

function weaponFireEvents(result, bot) {
  return result.replay.events.filter(
    (event) => event.type === 'weapon_fire' && event.bot === bot,
  )
}

function abilityEvents(result, bot, ability) {
  return result.replay.events.filter(
    (event) =>
      event.type === 'ability' &&
      event.bot === bot &&
      event.ability === ability,
  )
}

function hazardEvents(result, bot) {
  return result.replay.events.filter(
    (event) => event.type === 'hazard' && event.bot === bot,
  )
}

function movementDistance(event) {
  return distance(event.from, event.to)
}

function movementProfile(result, bot) {
  const moves = moveEvents(result, bot)

  return {
    count: moves.length,
    totalDistance: moves.reduce(
      (total, event) => total + movementDistance(event),
      0,
    ),
    xDistance: moves.reduce(
      (total, event) => total + Math.abs(event.to[0] - event.from[0]),
      0,
    ),
    zDistance: moves.reduce(
      (total, event) => total + Math.abs(event.to[2] - event.from[2]),
      0,
    ),
  }
}

function assertNoContradictoryMovement(result, bot, scenarioId) {
  const moves = integerMoveEvents(result, bot)

  for (let index = 1; index < moves.length; index += 1) {
    const previous = moves[index - 1]
    const current = moves[index]

    if (current.t !== previous.t + 1) {
      continue
    }

    const previousDx = previous.to[0] - previous.from[0]
    const previousDz = previous.to[2] - previous.from[2]
    const currentDx = current.to[0] - current.from[0]
    const currentDz = current.to[2] - current.from[2]

    assert.equal(
      areOpposedPrimaryXDeltas(previousDx, previousDz, currentDx, currentDz),
      false,
      `${scenarioId}: ${bot} flips forward/backward between ticks ${previous.t} and ${current.t}`,
    )
  }

  for (let index = 2; index < moves.length; index += 1) {
    const first = moves[index - 2]
    const middle = moves[index - 1]
    const current = moves[index]

    if (middle.t !== first.t + 1 || current.t !== middle.t + 1) {
      continue
    }

    assert.ok(
      distance(first.to, current.to) > 0.05,
      `${scenarioId}: ${bot} bounces back to the same position at tick ${current.t}`,
    )
  }
}

function areOpposedPrimaryXDeltas(leftDx, leftDz, rightDx, rightDz) {
  return (
    Math.abs(leftDx) > 0.1 &&
    Math.abs(rightDx) > 0.1 &&
    Math.abs(leftDx) > Math.abs(leftDz) * 1.2 &&
    Math.abs(rightDx) > Math.abs(rightDz) * 1.2 &&
    Math.sign(leftDx) !== Math.sign(rightDx)
  )
}

function distance(left, right) {
  return Math.hypot(left[0] - right[0], left[2] - right[2])
}

function segmentDistanceToPoint(start, end, point) {
  const dx = end[0] - start[0]
  const dz = end[2] - start[2]
  const lengthSquared = dx * dx + dz * dz

  if (lengthSquared <= 0) {
    return distance(start, point)
  }

  const t = Math.min(
    1,
    Math.max(0, ((point[0] - start[0]) * dx + (point[2] - start[2]) * dz) / lengthSquared),
  )
  const closest = [start[0] + dx * t, 0, start[2] + dz * t]

  return distance(closest, point)
}

function positionAt(result, bot, time) {
  let position

  for (const event of result.replay.events) {
    if (event.t > time + EPSILON) {
      break
    }

    if (event.type === 'spawn' && event.bot === bot) {
      position = event.position
    } else if (event.type === 'move' && event.bot === bot) {
      position = event.to
    }
  }

  assert.ok(position, `Missing ${bot} position at t=${time}`)

  return position
}

function opponentOf(bot) {
  return bot === 'red' ? 'blue' : 'red'
}

function weaponReachForBlueprint(blueprint) {
  const stats = deriveBotStats(blueprint)
  let bonus = 0

  if (blueprint.blocks.some((block) => block.partId === 'Weapon_Turret')) {
    bonus += TURRET_REACH_BONUS
  }
  if (blueprint.blocks.some((block) => block.partId === 'Utility_Sensor')) {
    bonus += SENSOR_REACH_BONUS
  }

  return 1.6 + stats.control / 16 + stats.weaponThreat / 28 + bonus
}

function assertFirstFiresHaveRangeContext(result, bot, blueprint, maxFireCount = 3) {
  const fires = weaponFireEvents(result, bot).slice(0, maxFireCount)
  const reach = weaponReachForBlueprint(blueprint)

  assert.ok(fires.length > 0, `${bot} should fire at least once`)

  for (const fire of fires) {
    const gap = distance(
      positionAt(result, bot, fire.t),
      positionAt(result, opponentOf(bot), fire.t),
    )

    assert.ok(
      gap <= reach + 0.75,
      `${bot} fires at t=${fire.t} with gap ${gap.toFixed(2)} beyond reach ${reach.toFixed(2)}`,
    )
  }
}

function assertVectorNear(actual, expected, label) {
  assert.ok(actual, label)
  assert.ok(distance(actual, expected) <= EPSILON, label)
  assert.ok(Math.abs(actual[1] - expected[1]) <= EPSILON, label)
}

test('required replay believability scenarios emit valid bounded timelines without movement bounce', () => {
  for (const scenario of Object.values(scenarios)) {
    const result = runScenario(scenario)
    const withoutKeyPart = runWithoutKeyPart(scenario)

    assertValidBoundedTimeline(result, scenario.id)
    assertValidBoundedTimeline(withoutKeyPart, `${scenario.id} without key part`)
    assertNoContradictoryMovement(result, 'red', scenario.id)
    assertNoContradictoryMovement(result, 'blue', scenario.id)
  }
})

test('stationary spinner vs brawler stays anchored and punishes contact with replay cues', () => {
  const scenario = scenarios.stationarySpinner
  const result = runScenario(scenario)
  const withoutSpinner = runWithoutKeyPart(scenario)
  const spinnerProfile = movementProfile(result, 'red')
  const brawlerProfile = movementProfile(result, 'blue')

  assert.equal(spinnerProfile.count, 0)
  assert.ok(brawlerProfile.xDistance > 10)
  assert.ok(brawlerProfile.zDistance < 0.01)
  assertFirstFiresHaveRangeContext(result, 'red', scenario.input.red.blueprint)
  assert.ok(
    result.replay.events.some(
      (event) =>
        event.type === 'impact' &&
        event.attacker === 'red' &&
        event.defender === 'blue',
    ),
  )
  assert.ok(
    result.replay.events.some(
      (event) =>
        event.type === 'damage' &&
        event.bot === 'blue' &&
        event.blockId !== undefined,
    ),
  )
  assert.ok(
    result.replay.events.some(
      (event) => event.type === 'part_detach' && event.bot === 'blue',
    ),
  )
  assert.equal(weaponFireEvents(withoutSpinner, 'red').length, 0)
  assert.ok(result.damage.blue > withoutSpinner.damage.blue * 4)
  assert.ok(result.damage.red < withoutSpinner.damage.red)
})

test('mobile low-commitment bot bends around saw and refuses spinner danger', () => {
  const result = resolveCombat({
    round: 1,
    seed: 'mobile-spinner-hazard-believability',
    red: {
      blueprint: fastSprinterBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'close',
        preferredRange: 'contact',
        aggression: 0.65,
        hazardPreference: 'avoid',
      }),
      openingScript: { commands: [] },
    },
    blue: {
      blueprint: stationarySpinnerBlueprint,
      tactics: normalizeTactics({
        movementPolicy: 'hold_ground',
        preferredRange: 'contact',
        aggression: 0.85,
        weaponCadence: 'sustained',
      }),
      openingScript: { commands: [] },
    },
    arena: {
      name: 'Mobile Hazard Avoidance',
      width: 24,
      height: 16,
      activeHazards: ['floor_saw'],
    },
  })
  const redMoves = moveEvents(result, 'red')
  const redProfile = movementProfile(result, 'red')

  assertValidBoundedTimeline(result, 'mobile spinner hazard avoidance')
  assert.equal(hazardEvents(result, 'red').length, 0)
  assert.equal(movementProfile(result, 'blue').count, 0)
  assert.ok(redMoves.length > 0)
  assert.ok(redProfile.zDistance > redProfile.xDistance)
  assert.ok(
    redMoves.every(
      (event) => segmentDistanceToPoint(event.from, event.to, [0, 0, 0]) >= 1.2,
    ),
  )
  assert.equal(result.damage.red, 0)
  assert.equal(result.damage.blue, 0)
})

test('turret kiter vs brawler preserves range, fires while moving, and needs the turret', () => {
  const scenario = scenarios.turretKiter
  const result = runScenario(scenario)
  const withoutTurret = runWithoutKeyPart(scenario)
  const kiterProfile = movementProfile(result, 'blue')
  const brawlerProfile = movementProfile(result, 'red')
  const blueMoveTicks = new Set(
    integerMoveEvents(result, 'blue').map((event) => event.t),
  )

  assert.ok(kiterProfile.count >= 10)
  assert.ok(kiterProfile.zDistance > 8)
  assert.ok(kiterProfile.totalDistance > brawlerProfile.totalDistance)
  assertFirstFiresHaveRangeContext(result, 'blue', scenario.input.blue.blueprint)
  assert.ok(
    weaponFireEvents(result, 'blue').some((event) =>
      blueMoveTicks.has(Math.trunc(event.t)),
    ),
  )
  assert.ok(
    result.replay.events.some(
      (event) =>
        event.type === 'part_detach' &&
        event.bot === 'red' &&
        event.partId === 'Weapon_Ram',
    ),
  )
  assert.equal(weaponFireEvents(withoutTurret, 'blue').length, 0)
  assert.equal(withoutTurret.damage.red, 0)
  assert.ok(result.damage.red > 50)
})

test('net control vs fast sprinter deploys only with target context and slows the sprinter', () => {
  const scenario = scenarios.netControl
  const result = runScenario(scenario)
  const withoutNet = runWithoutKeyPart(scenario)
  const deployFires = weaponFireEvents(result, 'red').filter(
    (event) => event.controlCue === 'deploy',
  )
  const firstDeploy = deployFires[0]
  const blueMovesByTick = new Map(
    integerMoveEvents(result, 'blue').map((event) => [event.t, event]),
  )
  const firstBlueDamage = result.replay.events.find(
    (event) => event.type === 'damage' && event.bot === 'blue',
  )
  const hitTick = Math.trunc(firstBlueDamage.t)
  const beforeSlow = blueMovesByTick.get(hitTick)
  const afterSlow = blueMovesByTick.get(hitTick + 1)

  assert.ok(firstDeploy)
  assertVectorNear(
    firstDeploy.targetPosition,
    positionAt(result, 'blue', firstDeploy.t),
    'net deploy should target the sprinter position',
  )
  assertFirstFiresHaveRangeContext(result, 'red', scenario.input.red.blueprint)
  assert.ok(firstBlueDamage)
  assert.ok(beforeSlow)
  assert.ok(afterSlow)
  assert.ok(movementDistance(afterSlow) < movementDistance(beforeSlow) * 0.7)
  assert.ok(
    result.replay.events.some(
      (event) =>
        event.type === 'part_detach' &&
        event.bot === 'blue' &&
        event.partId === 'Wheel_Omni',
    ),
  )
  assert.equal(
    weaponFireEvents(withoutNet, 'red').some(
      (event) => event.controlCue === 'deploy',
    ),
    false,
  )
  assert.ok(movementProfile(withoutNet, 'blue').totalDistance > movementProfile(result, 'blue').totalDistance * 3)
})

test('hazard bait vs heavy tank uses lateral lure movement and produces hazard-safe replay cues', () => {
  const scenario = scenarios.hazardBait
  const result = runScenario(scenario)
  const withoutBooster = runWithoutKeyPart(scenario)
  const baitProfile = movementProfile(result, 'red')
  const tankProfile = movementProfile(result, 'blue')
  const tankHazards = hazardEvents(result, 'blue')

  assert.ok(baitProfile.count > 20)
  assert.ok(baitProfile.zDistance > baitProfile.xDistance * 1.2)
  assert.ok(tankProfile.count > 20)
  assert.ok(tankHazards.length > 0)
  assert.ok(
    tankHazards.every(
      (event) =>
        event.hazard === 'floor_saw' &&
        event.damage > 0 &&
        Math.abs(event.position[0]) < 1.2 &&
        Math.abs(event.position[2]) < 1.2,
    ),
  )
  assert.ok(
    result.replay.events.some(
      (event) =>
        event.type === 'damage' &&
        event.bot === 'blue' &&
        event.amount > 0,
    ),
  )
  assert.equal(hazardEvents(withoutBooster, 'blue').length, 0)
  assert.ok(baitProfile.totalDistance > movementProfile(withoutBooster, 'red').totalDistance * 3)
  assert.ok(result.damage.blue > withoutBooster.damage.blue * 5)
})

test('commander drone vs spinner shows mobile command movement and charged drone ability pressure', () => {
  const scenario = scenarios.commanderDrone
  const result = runScenario(scenario)
  const withoutDrone = runWithoutKeyPart(scenario)
  const commanderProfile = movementProfile(result, 'red')
  const droneAbilities = abilityEvents(result, 'red', 'drone_swarm')

  assert.ok(commanderProfile.count > 20)
  assert.ok(commanderProfile.zDistance > commanderProfile.xDistance * 1.2)
  assert.equal(movementProfile(result, 'blue').count, 0)
  assert.deepEqual(droneAbilities.map((event) => Math.trunc(event.t)), [1, 5])

  for (const ability of droneAbilities) {
    const commanderPosition = positionAt(result, 'red', ability.t)
    const spinnerPosition = positionAt(result, 'blue', ability.t)

    assert.equal(ability.target, 'blue')
    assertVectorNear(
      ability.targetPosition,
      spinnerPosition,
      'drone swarm should target the spinner position',
    )
    assert.ok(distance(commanderPosition, spinnerPosition) <= DRONE_RANGE)
  }

  assert.ok(
    result.replay.events.some(
      (event) =>
        event.type === 'damage' &&
        event.bot === 'blue' &&
        event.partId === 'Utility_Gyro',
    ),
  )
  assert.ok(
    result.replay.events.some(
      (event) =>
        event.type === 'part_detach' &&
        event.bot === 'blue' &&
        event.partId === 'Utility_Gyro',
    ),
  )
  assert.equal(abilityEvents(withoutDrone, 'red', 'drone_swarm').length, 0)
  assert.ok(result.damage.blue > withoutDrone.damage.blue * 5)
  assert.equal(weaponFireEvents(result, 'red').length, 0)
})
