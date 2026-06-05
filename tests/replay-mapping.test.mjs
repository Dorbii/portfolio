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
      blockId: 'left-wheel',
      partId: 'Wheel_Large',
      partRemainingHealth: 0,
      partMaxHealth: 12,
    },
    {
      t: 3.25,
      type: 'part_detach',
      bot: 'red',
      blockId: 'left-wheel',
      partId: 'Wheel_Large',
      position: [3.5, 0.2, 0.2],
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

const movingWeaponTimeline = createReplayTimeline({
  round: 1,
  duration: 3,
  summary: 'Red fires while crossing the center.',
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
      t: 1.5,
      type: 'weapon_fire',
      bot: 'red',
      weaponSlot: 'weaponA',
      controlCue: 'deploy',
      targetPosition: [4, 0, 0],
    },
  ],
})

const abilityTimeline = createReplayTimeline({
  round: 3,
  duration: 4,
  summary: 'Blue opens a laser lance and cuts across the lane.',
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
      position: [4, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'move',
      bot: 'blue',
      from: [4, 0, 0],
      to: [2, 0, -2],
    },
    {
      t: 1.6,
      type: 'ability',
      bot: 'blue',
      ability: 'laser_lance',
      weaponSlot: 'weaponA',
      target: 'red',
      targetPosition: [0.8, 0, -0.4],
    },
  ],
})

const droneSwarmTimeline = createReplayTimeline({
  round: 4,
  duration: 4.5,
  summary: 'Blue drops a coordinated drone swarm across the lane.',
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
      position: [4, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'move',
      bot: 'blue',
      from: [4, 0, 0],
      to: [2, 0, -2],
    },
    {
      t: 1.6,
      type: 'ability',
      bot: 'blue',
      ability: 'drone_swarm',
      weaponSlot: 'weaponA',
      target: 'red',
      targetPosition: [0.8, 0, -0.4],
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

test('replay mapping anchors weapon fire effects to the firing state', () => {
  const frame = buildReplayFrame(movingWeaponTimeline, 1.75)
  const weaponFire = frame.effects.find((effect) => effect.kind === 'weapon_fire')

  assert.ok(weaponFire)
  assert.deepEqual(weaponFire.position, [2, 0, 0])
  assert.equal(weaponFire.rotationY, Math.PI / 2)
  assert.ok(frame.bots.red.position[0] > weaponFire.position[0])
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
  assert.equal(
    validateReplayTimeline({
      round: 1,
      duration: 602,
      summary: 'Too long',
      events: [],
    }),
    false,
  )
  assert.equal(
    validateReplayTimeline({
      round: 1.5,
      duration: 2,
      summary: 'Fractional round',
      events: [],
    }),
    false,
  )
  assert.equal(
    validateReplayTimeline({
      round: 1,
      duration: 2,
      summary: 'Unsorted equal-time types',
      events: [
        {
          t: 1,
          type: 'weapon_fire',
          bot: 'red',
          weaponSlot: 'weaponA',
        },
        {
          t: 1,
          type: 'spawn',
          bot: 'red',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        },
      ],
    }),
    false,
  )
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

test('replay mapping exposes part detach only after the detach event time', () => {
  const before = buildReplayFrame(timeline, 3.2)
  const after = buildReplayFrame(timeline, 3.4)

  assert.equal(before.parts.red['left-wheel'].status, 'attached')
  assert.equal(before.parts.red['left-wheel'].health, 0)
  assert.equal(after.parts.red['left-wheel'].status, 'detached')
  assert.equal(after.parts.red['left-wheel'].blockId, 'left-wheel')
  assert.equal(after.parts.red['left-wheel'].partId, 'Wheel_Large')
  assert.deepEqual(after.parts.red['left-wheel'].detachPosition, [3.5, 0.2, 0.2])
  assert.ok(after.effects.some((effect) => effect.kind === 'part_detach' && effect.label === 'left-wheel'))
  assert.ok(after.effects.some((effect) => effect.kind === 'debris' && effect.label === 'left-wheel'))
})

test('replay mapping exposes laser_lance ability effects with deterministic placement', () => {
  const frame = buildReplayFrame(abilityTimeline, 2.1)
  const laserCore = frame.effects.find(
    (effect) => effect.kind === 'laser_lance',
  )

  assert.ok(laserCore)
  assert.ok(Math.abs(laserCore.position[0] - 2.7) < 0.1)
  assert.ok(Math.abs(laserCore.position[2] + 1.3) < 0.1)
  assert.deepEqual(laserCore.endPosition, [0.8, 0, -0.4])
  assert.equal(laserCore.label, 'laser_lance')
  assert.ok(laserCore.intensity > 0)
  assert.ok(laserCore.intensity < 1)
  assert.equal(
    frame.effects.some((effect) => effect.kind === 'weapon_fire' && effect.label === 'laser_lance'),
    false,
  )
  assert.equal(frame.effects.some((effect) => effect.kind === 'debris' && effect.label === 'laser_lance'), false)
})

test('replay mapping does not reveal laser_lance effects before ability event time', () => {
  const before = buildReplayFrame(abilityTimeline, 1.59)
  const atEvent = buildReplayFrame(abilityTimeline, 1.8)

  assert.equal(before.effects.some((effect) => effect.label === 'laser_lance'), false)
  assert.equal(atEvent.effects.some((effect) => effect.label === 'laser_lance'), true)
})

test('replay mapping does not reveal future control, ability, impact, damage, hazard, or detach cues', () => {
  const beforeControl = buildReplayFrame(movingWeaponTimeline, 1.49)
  const beforeDroneSwarm = buildReplayFrame(droneSwarmTimeline, 1.59)
  const beforeImpact = buildReplayFrame(timeline, 2.99)
  const beforeDamage = buildReplayFrame(timeline, 3.09)
  const beforeDetach = buildReplayFrame(timeline, 3.24)
  const beforeHazard = buildReplayFrame(timeline, 3.99)

  assert.equal(
    beforeControl.effects.some((effect) => effect.label === 'weaponA-deploy' || effect.kind === 'control_net'),
    false,
  )
  assert.equal(beforeDroneSwarm.effects.some((effect) => effect.kind === 'drone_swarm'), false)
  assert.equal(beforeImpact.effects.some((effect) => effect.kind === 'impact'), false)
  assert.equal(beforeImpact.effects.some((effect) => effect.kind === 'debris'), false)
  assert.equal(beforeDamage.effects.some((effect) => effect.kind === 'damage_marker'), false)
  assert.equal(
    beforeDetach.effects.some((effect) => effect.kind === 'part_detach' && effect.label === 'left-wheel'),
    false,
  )
  assert.equal(
    beforeHazard.effects.some((effect) => effect.kind === 'hazard' && effect.label === 'center saw'),
    false,
  )
})

test('replay mapping exposes drone_swarm ability effects with separate lane semantics', () => {
  const frame = buildReplayFrame(droneSwarmTimeline, 2.1)
  const droneSwarm = frame.effects.find((effect) => effect.kind === 'drone_swarm')

  assert.ok(droneSwarm)
  assert.ok(Math.abs(droneSwarm.position[0] - 2.7) < 0.1)
  assert.ok(Math.abs(droneSwarm.position[2] + 1.3) < 0.1)
  assert.deepEqual(droneSwarm.endPosition, [0.8, 0, -0.4])
  assert.equal(droneSwarm.team, 'blue')
  assert.equal(droneSwarm.label, 'drone_swarm')
  assert.equal(droneSwarm.kind, 'drone_swarm')
  assert.ok(droneSwarm.intensity > 0)
  assert.ok(droneSwarm.intensity < 1)
  assert.equal(frame.effects.every((effect) => effect.kind !== 'laser_lance'), true)
})

test('replay mapping emits a larger deploy control cue for net/control-linked weapon fire', () => {
  const frame = buildReplayFrame(movingWeaponTimeline, 2)
  const deploy = frame.effects.find((effect) => effect.label === 'weaponA-deploy')
  const cue = frame.effects.find((effect) => effect.kind === 'control_net')

  assert.ok(deploy)
  assert.ok(cue)
  assert.equal(deploy.kind, 'weapon_fire')
  assert.equal(cue.label, 'control_net')
  assert.equal(deploy.rotationY, Math.PI / 2)
  assert.equal(cue.damage, undefined)
  assert.ok(deploy.intensity >= cue.intensity)
  assert.deepEqual(cue.endPosition, [4, 0, 0])
  assert.ok(cue.intensity > 0)
  assert.ok(cue.intensity <= 1)
  assert.equal(frame.effects.some((effect) => effect.kind === 'damage_marker'), false)
  assert.deepEqual(frame.parts.red, {})
})
