import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildReplayFrame,
  clampReplayTime,
} from '../.test-build/apps/web/src/replay/replayMapping.js'
import { mockReplay } from '../.test-build/apps/web/src/mockSession.js'
import {
  createReplayTimeline,
  validateReplayTimeline,
} from '../.test-build/packages/replay/src/index.js'

const timeline = createReplayTimeline({
  round: 2,
  duration: 8,
  summary: 'Blue disables Red after a center hit.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [5, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'move',
      bot: 'red',
      from: [0, 0, 0],
      to: [4, 0, 0],
    },
    {
      t: 2,
      type: 'weapon_fire',
      bot: 'blue',
      weaponSlot: 'weaponA',
    },
    {
      t: 3,
      type: 'impact',
      attacker: 'blue',
      defender: 'red',
      damage: 14,
      position: [3.6, 0, 0.2],
    },
    {
      t: 3.1,
      type: 'damage',
      bot: 'red',
      amount: 14,
      remainingHealth: 0,
    },
    {
      t: 4,
      type: 'hazard',
      hazard: 'center saw',
      bot: 'red',
      damage: 8,
      position: [2, 0, -1],
    },
    {
      t: 5,
      type: 'knockout',
      bot: 'red',
      cause: 'drive disabled',
    },
  ],
})

test('replay mapping is deterministic for the same timeline and time', () => {
  const first = buildReplayFrame(timeline, 3.2)
  const second = buildReplayFrame(timeline, 3.2)

  assert.deepEqual(first, second)
})

test('replay mapping clamps time and interpolates active moves', () => {
  assert.equal(clampReplayTime(timeline, -4), 0)
  assert.equal(clampReplayTime(timeline, 99), timeline.duration)

  const frame = buildReplayFrame(timeline, 1.41)

  assert.ok(frame.bots.red.position[0] > 1.3)
  assert.ok(frame.bots.red.position[0] < 1.6)
  assert.equal(frame.bots.red.status, 'active')
})

test('replay mapping exposes weapon fire effects with team and slot context', () => {
  const frame = buildReplayFrame(timeline, 2.25)
  const weaponFire = frame.effects.find((effect) => effect.kind === 'weapon_fire')

  assert.ok(weaponFire)
  assert.equal(weaponFire.team, 'blue')
  assert.equal(weaponFire.label, 'weaponA')
  assert.ok(weaponFire.intensity > 0)
  assert.ok(weaponFire.intensity < 1)
})

test('replay mapping exposes impact effects and knockout end state', () => {
  const impactFrame = buildReplayFrame(timeline, 3.2)
  const endFrame = buildReplayFrame(timeline, 5.2)

  assert.ok(impactFrame.effects.some((effect) => effect.kind === 'impact'))
  assert.ok(impactFrame.effects.some((effect) => effect.kind === 'debris'))
  assert.ok(impactFrame.effects.some((effect) => effect.kind === 'damage_marker'))
  assert.ok(impactFrame.effects.some((effect) => effect.kind === 'smoke'))
  assert.equal(endFrame.bots.red.status, 'knocked_out')
  assert.deepEqual(endFrame.endState, {
    knockedOut: 'red',
    winner: 'blue',
    cause: 'drive disabled',
  })
})

test('replay mapping exposes hazard effects with damage and hazard context', () => {
  const frame = buildReplayFrame(timeline, 4.2)
  const hazard = frame.effects.find((effect) => effect.kind === 'hazard')

  assert.ok(hazard)
  assert.equal(hazard.team, 'red')
  assert.equal(hazard.label, 'center saw')
  assert.equal(hazard.damage, 8)
  assert.deepEqual(hazard.position, [2, 0, -1])
})

test('mock replay stays inside the MVP segment duration cap', () => {
  assert.ok(mockReplay.duration >= 15)
  assert.ok(mockReplay.duration <= 30)
  assert.ok(mockReplay.events.every((event) => event.t <= mockReplay.duration))
})

test('replay timeline validation rejects empty-duration and out-of-range events', () => {
  const outOfRange = createReplayTimeline({
    round: 1,
    duration: 1,
    summary: 'Out of bounds',
    events: [
      {
        t: 3,
        type: 'spawn',
        bot: 'red',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
    ],
  })

  assert.equal(
    validateReplayTimeline({
      round: 1,
      duration: 0,
      summary: 'Invalid duration',
      events: [],
    }),
    false,
  )
  assert.equal(validateReplayTimeline(outOfRange), false)
  const ordered = createReplayTimeline({
    round: 2,
    duration: 2.5,
    summary: 'Unordered',
    events: [
      {
        t: 2,
        type: 'spawn',
        bot: 'blue',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
      {
        t: 0.5,
        type: 'spawn',
        bot: 'red',
        position: [1, 0, 0],
        rotation: [0, 0, 0],
      },
    ],
  })

  assert.equal(validateReplayTimeline(ordered), true)
  assert.equal(ordered.events[0].t, 0.5)
})
