import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLiveArenaFrame,
} from '../.test-build/apps/web/src/replay/arena/liveArenaFrame.js'
import {
  advanceLivePlaybackBuffer,
  createLivePlaybackBuffer,
  createLiveCombatTimelineBuffer,
  updateLiveCombatTimelineBuffer,
} from '../.test-build/apps/web/src/replay/arena/liveCombatTimeline.js'

const blueprint = { name: 'test bot', blocks: [] }
const identity = { name: 'Test Team', primaryColor: '#999999' }

function feedWithEvents(events, nextSeq = events.at(-1)?.seq ?? 0) {
  return {
    sessionId: 's_live',
    phase: 'combat_turn',
    round: 1,
    stateVersion: `v${nextSeq}`,
    serverTime: '2026-06-13T00:00:00.000Z',
    combat: {
      tick: 2,
      snapshot: {
        tick: 2,
        arena: { width: 16, height: 16, name: 'Test Arena', activeHazards: [] },
        distance: 10,
        hardMaxTicks: 100,
        recentEvents: [],
        red: {
          role: 'red',
          position: [-6, 0, 0],
          health: 20,
          maxHealth: 20,
          partHealth: {},
          statuses: [],
        },
        blue: {
          role: 'blue',
          position: [6, 0, 0],
          health: 20,
          maxHealth: 20,
          partHealth: {},
          statuses: [],
        },
        loadouts: {
          red: { blueprint, identity },
          blue: { blueprint, identity },
        },
      },
      events,
      nextSeq,
      submitted: { red: true, blue: true },
    },
  }
}

function liveArenaStage() {
  return {
    red: {
      blueprint,
      health: 20,
      identity,
      maxHealth: 20,
      partHealth: {},
      position: [-6, 0, 0],
      statuses: [],
    },
    blue: {
      blueprint,
      health: 20,
      identity,
      maxHealth: 20,
      partHealth: {},
      position: [6, 0, 0],
      statuses: [],
    },
  }
}

test('live combat timeline accumulates deltas and renders replay events over time', () => {
  const buffer = createLiveCombatTimelineBuffer()
  const first = updateLiveCombatTimelineBuffer(buffer, feedWithEvents([
    {
      seq: 1,
      event: { t: 0, type: 'spawn', bot: 'red', position: [-6, 0, 0], rotation: [0, 90, 0] },
    },
    {
      seq: 2,
      event: { t: 0, type: 'spawn', bot: 'blue', position: [6, 0, 0], rotation: [0, -90, 0] },
    },
    {
      seq: 3,
      event: {
        t: 0.35,
        type: 'move',
        bot: 'red',
        from: [-6, 0, 0],
        to: [-4, 0, 0],
        duration: 0.5,
        easing: 'linear',
      },
    },
  ], 3))
  const second = updateLiveCombatTimelineBuffer(buffer, feedWithEvents([
    {
      seq: 4,
      event: {
        t: 0.55,
        type: 'weapon_fire',
        bot: 'red',
        targetPosition: [6, 0, 0],
        weaponId: 'Weapon_Turret',
      },
    },
    {
      seq: 5,
      event: {
        t: 0.7,
        type: 'damage',
        bot: 'blue',
        amount: 5,
        remainingHealth: 15,
      },
    },
  ], 5))

  assert.equal(first?.lastSeq, 3)
  assert.equal(second?.lastSeq, 5)
  assert.equal(second?.timeline.events.length, 5)

  const movingFrame = buildLiveArenaFrame(liveArenaStage(), 0.6, second, 0.6)
  const damageFrame = buildLiveArenaFrame(liveArenaStage(), 0.8, second, 0.8)

  assert.notDeepEqual(movingFrame.bots.red.position, [-6, 0, 0])
  assert.equal(movingFrame.effects.some((effect) => effect.kind === 'weapon_fire'), true)
  assert.equal(damageFrame.bots.blue.health, 15)
  assert.equal(damageFrame.effects.some((effect) => effect.kind === 'damage_marker'), true)
})

test('live combat timeline injects snapshot spawn anchors when the feed starts mid-delta', () => {
  const buffer = createLiveCombatTimelineBuffer()
  const timeline = updateLiveCombatTimelineBuffer(buffer, feedWithEvents([
    {
      seq: 8,
      event: {
        t: 0.4,
        type: 'weapon_fire',
        bot: 'blue',
        targetPosition: [-6, 0, 0],
        weaponId: 'Weapon_Turret',
      },
    },
  ], 8))

  assert.ok(timeline)
  assert.deepEqual(timeline.timeline.events.slice(0, 2).map((event) => event.type), ['spawn', 'spawn'])

  const frame = buildLiveArenaFrame(liveArenaStage(), 0.5, timeline, 0.5)

  assert.equal(frame.bots.red.position[0], -6)
  assert.equal(frame.bots.blue.position[0], 6)
  assert.equal(frame.effects.some((effect) => effect.kind === 'weapon_fire'), true)
})

test('live playback buffer pauses at the committed edge instead of running past available events', () => {
  const timelineBuffer = createLiveCombatTimelineBuffer()
  const playbackBuffer = createLivePlaybackBuffer()
  const timeline = updateLiveCombatTimelineBuffer(timelineBuffer, feedWithEvents([
    {
      seq: 1,
      event: { t: 0, type: 'spawn', bot: 'red', position: [-6, 0, 0], rotation: [0, 90, 0] },
    },
    {
      seq: 2,
      event: { t: 0, type: 'spawn', bot: 'blue', position: [6, 0, 0], rotation: [0, -90, 0] },
    },
    {
      seq: 3,
      event: {
        t: 1,
        type: 'weapon_fire',
        bot: 'red',
        targetPosition: [6, 0, 0],
        weaponId: 'Weapon_Turret',
      },
    },
  ], 3))

  assert.ok(timeline)

  const options = { maxFrameDeltaSeconds: 10, minPlayableBufferSeconds: 0.2 }

  advanceLivePlaybackBuffer(playbackBuffer, timeline, 0, options)
  const edge = advanceLivePlaybackBuffer(playbackBuffer, timeline, 2, options)
  const drained = advanceLivePlaybackBuffer(playbackBuffer, timeline, 2.1, options)

  assert.equal(edge.playheadTime, 0.8)
  assert.equal(edge.bufferDepthSeconds, 0.2)
  assert.equal(drained.status, 'drained')
  assert.equal(drained.pausedReason, 'buffer_drained')
  assert.equal(drained.playheadTime, 0.8)
})

test('live playback buffer catches up when committed events are far ahead of the playhead', () => {
  const timelineBuffer = createLiveCombatTimelineBuffer()
  const playbackBuffer = createLivePlaybackBuffer()
  const timeline = updateLiveCombatTimelineBuffer(timelineBuffer, feedWithEvents([
    {
      seq: 1,
      event: { t: 0, type: 'spawn', bot: 'red', position: [-6, 0, 0], rotation: [0, 90, 0] },
    },
    {
      seq: 2,
      event: { t: 9, type: 'damage', bot: 'blue', amount: 1, remainingHealth: 19 },
    },
  ], 2))

  assert.ok(timeline)

  const start = advanceLivePlaybackBuffer(playbackBuffer, timeline, 0, { maxFrameDeltaSeconds: 10 })
  const catchingUp = advanceLivePlaybackBuffer(playbackBuffer, timeline, 1, { maxFrameDeltaSeconds: 10 })

  assert.equal(start.status, 'catching_up')
  assert.equal(catchingUp.status, 'catching_up')
  assert.equal(catchingUp.playheadTime, 1.35)
})

test('live playback buffer replays late-arriving committed events instead of skipping them', () => {
  const timelineBuffer = createLiveCombatTimelineBuffer()
  const playbackBuffer = createLivePlaybackBuffer()
  const firstTimeline = updateLiveCombatTimelineBuffer(timelineBuffer, feedWithEvents([
    {
      seq: 1,
      event: { t: 0, type: 'spawn', bot: 'red', position: [-6, 0, 0], rotation: [0, 90, 0] },
    },
    {
      seq: 2,
      event: {
        t: 3,
        type: 'weapon_fire',
        bot: 'red',
        targetPosition: [6, 0, 0],
        weaponId: 'Weapon_Turret',
      },
    },
  ], 2))

  assert.ok(firstTimeline)

  const options = { maxFrameDeltaSeconds: 10 }

  advanceLivePlaybackBuffer(playbackBuffer, firstTimeline, 0, options)
  const advanced = advanceLivePlaybackBuffer(playbackBuffer, firstTimeline, 2, options)

  assert.equal(advanced.playheadTime, 2)

  const secondTimeline = updateLiveCombatTimelineBuffer(timelineBuffer, feedWithEvents([
    {
      seq: 3,
      event: {
        t: 0.7,
        type: 'damage',
        bot: 'blue',
        amount: 5,
        remainingHealth: 15,
      },
    },
  ], 3))

  assert.ok(secondTimeline)

  const replayingLate = advanceLivePlaybackBuffer(playbackBuffer, secondTimeline, 2.1, options)

  assert.equal(replayingLate.status, 'replaying_late_events')
  assert.equal(replayingLate.playheadTime, 0.62)
  assert.equal(replayingLate.lastSeq, 3)
})
