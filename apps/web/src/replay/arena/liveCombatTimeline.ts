import type {
  ReplayEvent,
  ReplayTimeline,
} from '../../../../../packages/replay/src/index.js'
import type {
  TeamRole,
  Vector3,
} from '../../../../../packages/schemas/src/index.js'
import type { LiveCombatFeed } from '../../agent/agentSessionTypes'
import {
  compileReplayTimeline,
  type CompiledReplayTimeline,
} from '../replayMapping.js'

const MIN_LIVE_TIMELINE_DURATION_SECONDS = 6
const LIVE_TIMELINE_TRAILING_SECONDS = 1.9
const DEFAULT_LIVE_PLAYBACK_TARGET_DELAY_SECONDS = 1.2
const DEFAULT_LIVE_PLAYBACK_MIN_BUFFER_SECONDS = 0.18
const DEFAULT_LIVE_PLAYBACK_CATCH_UP_THRESHOLD_SECONDS = 2.4
const DEFAULT_LIVE_PLAYBACK_CATCH_UP_RATE = 1.35
const DEFAULT_LIVE_PLAYBACK_LATE_EVENT_LEAD_SECONDS = 0.18
const DEFAULT_LIVE_PLAYBACK_MAX_FRAME_DELTA_SECONDS = 0.12

export type LiveCombatTimeline = {
  key: string
  lastSeq: number
  latestDeltaEventTimeRange?: {
    end: number
    start: number
  }
  maxCommittedEventTime: number
  serverElapsedSeconds?: number
  serverTime: string
  timeline: CompiledReplayTimeline
}

export type LiveCombatTimelineBuffer = {
  eventsBySeq: Map<number, ReplayEvent>
  key: string
  lastSeq: number
  timeline: LiveCombatTimeline | null
}

export type LivePlaybackBufferStatus =
  | 'idle'
  | 'buffering'
  | 'playing'
  | 'catching_up'
  | 'drained'
  | 'replaying_late_events'

export type LivePlaybackPausedReason =
  | 'no_timeline'
  | 'waiting_for_events'
  | 'buffer_drained'

export type LivePlaybackBufferSnapshot = {
  bufferDepthSeconds: number
  bufferHealth: number
  key: string
  lastSeq: number
  maxCommittedEventTime: number
  pausedReason?: LivePlaybackPausedReason
  playheadTime: number
  serverElapsedSeconds?: number
  serverLagSeconds?: number
  serverTime?: string
  status: LivePlaybackBufferStatus
  targetDelaySeconds: number
}

export type LivePlaybackBuffer = {
  key: string
  lastSceneTime?: number
  lastSeq: number
  lateEventReplayCount: number
  playheadTime: number
}

export type LivePlaybackBufferOptions = Partial<{
  catchUpRate: number
  catchUpThresholdSeconds: number
  lateEventLeadSeconds: number
  maxFrameDeltaSeconds: number
  minPlayableBufferSeconds: number
  targetDelaySeconds: number
}>

export function createLiveCombatTimelineBuffer(): LiveCombatTimelineBuffer {
  return {
    eventsBySeq: new Map(),
    key: '',
    lastSeq: 0,
    timeline: null,
  }
}

export function resetLiveCombatTimelineBuffer(buffer: LiveCombatTimelineBuffer): void {
  buffer.eventsBySeq.clear()
  buffer.key = ''
  buffer.lastSeq = 0
  buffer.timeline = null
}

export function createLivePlaybackBuffer(): LivePlaybackBuffer {
  return {
    key: '',
    lastSeq: 0,
    lateEventReplayCount: 0,
    playheadTime: 0,
  }
}

export function resetLivePlaybackBuffer(buffer: LivePlaybackBuffer): void {
  buffer.key = ''
  buffer.lastSceneTime = undefined
  buffer.lastSeq = 0
  buffer.lateEventReplayCount = 0
  buffer.playheadTime = 0
}

export function advanceLivePlaybackBuffer(
  buffer: LivePlaybackBuffer,
  liveCombatTimeline: LiveCombatTimeline | null | undefined,
  sceneTime: number,
  options: LivePlaybackBufferOptions = {},
): LivePlaybackBufferSnapshot {
  const config = livePlaybackConfig(options)

  if (!liveCombatTimeline) {
    resetLivePlaybackBuffer(buffer)
    return livePlaybackSnapshot({
      buffer,
      config,
      key: '',
      maxCommittedEventTime: 0,
      pausedReason: 'no_timeline',
      status: 'idle',
    })
  }

  if (buffer.key !== liveCombatTimeline.key) {
    buffer.key = liveCombatTimeline.key
    buffer.lastSceneTime = sceneTime
    buffer.lastSeq = 0
    buffer.lateEventReplayCount = 0
    buffer.playheadTime = 0
  }

  const deltaSeconds = buffer.lastSceneTime === undefined
    ? 0
    : clamp(sceneTime - buffer.lastSceneTime, 0, config.maxFrameDeltaSeconds)
  buffer.lastSceneTime = sceneTime

  const maxCommittedEventTime = liveCombatTimeline.maxCommittedEventTime

  if (maxCommittedEventTime <= 0) {
    buffer.lastSeq = Math.max(buffer.lastSeq, liveCombatTimeline.lastSeq)
    buffer.playheadTime = 0
    return livePlaybackSnapshot({
      buffer,
      config,
      liveCombatTimeline,
      maxCommittedEventTime,
      pausedReason: 'waiting_for_events',
      status: 'buffering',
    })
  }

  const latestDeltaRange = liveCombatTimeline.latestDeltaEventTimeRange
  let status: LivePlaybackBufferStatus | undefined

  if (
    liveCombatTimeline.lastSeq > buffer.lastSeq &&
    latestDeltaRange &&
    latestDeltaRange.start < buffer.playheadTime - config.lateEventLeadSeconds
  ) {
    buffer.playheadTime = Math.max(0, latestDeltaRange.start - config.lateEventLeadSeconds)
    buffer.lateEventReplayCount += 1
    status = 'replaying_late_events'
  }

  buffer.lastSeq = Math.max(buffer.lastSeq, liveCombatTimeline.lastSeq)

  const bufferDepthBeforeAdvance = maxCommittedEventTime - buffer.playheadTime

  if (bufferDepthBeforeAdvance <= config.minPlayableBufferSeconds) {
    return livePlaybackSnapshot({
      buffer,
      config,
      liveCombatTimeline,
      maxCommittedEventTime,
      pausedReason: 'buffer_drained',
      status: 'drained',
    })
  }

  const targetPlayheadTime = Math.max(0, maxCommittedEventTime - config.targetDelaySeconds)
  const shouldCatchUp = buffer.playheadTime < targetPlayheadTime - config.catchUpThresholdSeconds
  const playbackRate = shouldCatchUp ? config.catchUpRate : 1
  const maxPlayableTime = Math.max(0, maxCommittedEventTime - config.minPlayableBufferSeconds)

  buffer.playheadTime = Math.min(
    maxPlayableTime,
    buffer.playheadTime + deltaSeconds * playbackRate,
  )

  return livePlaybackSnapshot({
    buffer,
    config,
    liveCombatTimeline,
    maxCommittedEventTime,
    status: status ?? (shouldCatchUp ? 'catching_up' : 'playing'),
  })
}

export function updateLiveCombatTimelineBuffer(
  buffer: LiveCombatTimelineBuffer,
  feed: LiveCombatFeed,
): LiveCombatTimeline | null {
  const combat = feed.combat

  if (!combat) {
    resetLiveCombatTimelineBuffer(buffer)
    return null
  }

  const key = `${feed.sessionId}|round:${feed.round}`

  if (buffer.key !== key || combat.nextSeq < buffer.lastSeq) {
    resetLiveCombatTimelineBuffer(buffer)
    buffer.key = key
  }

  let changed = false

  combat.events.forEach(({ event, seq }) => {
    if (seq <= 0) {
      return
    }

    if (!buffer.eventsBySeq.has(seq)) {
      buffer.eventsBySeq.set(seq, event)
      changed = true
    }
  })

  const nextLastSeq = Math.max(
    buffer.lastSeq,
    combat.nextSeq,
    ...combat.events.map(({ seq }) => seq),
  )

  if (nextLastSeq !== buffer.lastSeq) {
    buffer.lastSeq = nextLastSeq
    changed = true
  }

  const latestDeltaEventTimeRange = eventTimeRange(combat.events.map(({ event }) => event))
  const events = orderedBufferedEvents(buffer.eventsBySeq)

  if (events.length === 0) {
    buffer.timeline = null
    return null
  }

  if (!changed && buffer.timeline) {
    return buffer.timeline
  }

  const elapsedSeconds = serverElapsedSeconds(feed)

  buffer.timeline = {
    key,
    lastSeq: buffer.lastSeq,
    ...(latestDeltaEventTimeRange ? { latestDeltaEventTimeRange } : {}),
    maxCommittedEventTime: maxEventTime(events),
    serverTime: feed.serverTime,
    ...(elapsedSeconds !== undefined ? { serverElapsedSeconds: elapsedSeconds } : {}),
    timeline: compileReplayTimeline(createTimeline(feed, events)),
  }

  return buffer.timeline
}

function orderedBufferedEvents(eventsBySeq: Map<number, ReplayEvent>): ReplayEvent[] {
  return [...eventsBySeq.entries()]
    .sort(([leftSeq], [rightSeq]) => leftSeq - rightSeq)
    .map(([, event]) => event)
}

function eventTimeRange(events: ReplayEvent[]): { end: number; start: number } | undefined {
  const times = events
    .map((event) => event.t)
    .filter((time) => Number.isFinite(time))

  if (times.length === 0) {
    return undefined
  }

  return {
    end: Math.max(...times),
    start: Math.min(...times),
  }
}

function maxEventTime(events: ReplayEvent[]): number {
  return events.reduce(
    (latest, event) => Math.max(latest, Number.isFinite(event.t) ? event.t : 0),
    0,
  )
}

function serverElapsedSeconds(feed: LiveCombatFeed): number | undefined {
  const startedAt = feed.fightClock?.startedAt

  if (!startedAt) {
    return undefined
  }

  const serverMs = Date.parse(feed.serverTime)
  const startedMs = Date.parse(startedAt)

  if (!Number.isFinite(serverMs) || !Number.isFinite(startedMs) || serverMs < startedMs) {
    return undefined
  }

  return round((serverMs - startedMs) / 1000)
}

function livePlaybackConfig(options: LivePlaybackBufferOptions): Required<LivePlaybackBufferOptions> {
  return {
    catchUpRate: positiveOr(options.catchUpRate, DEFAULT_LIVE_PLAYBACK_CATCH_UP_RATE),
    catchUpThresholdSeconds: nonNegativeOr(
      options.catchUpThresholdSeconds,
      DEFAULT_LIVE_PLAYBACK_CATCH_UP_THRESHOLD_SECONDS,
    ),
    lateEventLeadSeconds: nonNegativeOr(
      options.lateEventLeadSeconds,
      DEFAULT_LIVE_PLAYBACK_LATE_EVENT_LEAD_SECONDS,
    ),
    maxFrameDeltaSeconds: positiveOr(
      options.maxFrameDeltaSeconds,
      DEFAULT_LIVE_PLAYBACK_MAX_FRAME_DELTA_SECONDS,
    ),
    minPlayableBufferSeconds: nonNegativeOr(
      options.minPlayableBufferSeconds,
      DEFAULT_LIVE_PLAYBACK_MIN_BUFFER_SECONDS,
    ),
    targetDelaySeconds: positiveOr(
      options.targetDelaySeconds,
      DEFAULT_LIVE_PLAYBACK_TARGET_DELAY_SECONDS,
    ),
  }
}

function livePlaybackSnapshot({
  buffer,
  config,
  key,
  liveCombatTimeline,
  maxCommittedEventTime,
  pausedReason,
  status,
}: {
  buffer: LivePlaybackBuffer
  config: Required<LivePlaybackBufferOptions>
  key?: string
  liveCombatTimeline?: LiveCombatTimeline
  maxCommittedEventTime: number
  pausedReason?: LivePlaybackPausedReason
  status: LivePlaybackBufferStatus
}): LivePlaybackBufferSnapshot {
  const bufferDepthSeconds = Math.max(0, maxCommittedEventTime - buffer.playheadTime)
  const serverElapsed = liveCombatTimeline?.serverElapsedSeconds
  const serverLagSeconds = serverElapsed === undefined
    ? undefined
    : Math.max(0, round(serverElapsed - buffer.playheadTime))

  return {
    bufferDepthSeconds: round(bufferDepthSeconds),
    bufferHealth: round(clamp(bufferDepthSeconds / config.targetDelaySeconds, 0, 1)),
    key: key ?? liveCombatTimeline?.key ?? buffer.key,
    lastSeq: buffer.lastSeq,
    maxCommittedEventTime: round(maxCommittedEventTime),
    ...(pausedReason ? { pausedReason } : {}),
    playheadTime: round(buffer.playheadTime),
    ...(serverElapsed !== undefined ? { serverElapsedSeconds: serverElapsed } : {}),
    ...(serverLagSeconds !== undefined ? { serverLagSeconds } : {}),
    ...(liveCombatTimeline?.serverTime ? { serverTime: liveCombatTimeline.serverTime } : {}),
    status,
    targetDelaySeconds: config.targetDelaySeconds,
  }
}

function createTimeline(feed: LiveCombatFeed, events: ReplayEvent[]): ReplayTimeline {
  const snapshot = feed.combat?.snapshot
  const anchoredEvents = snapshot
    ? withSnapshotSpawnAnchors(snapshot.red.position, snapshot.blue.position, events)
    : events
  const lastEventTime = anchoredEvents.reduce(
    (latest, event) => Math.max(latest, event.t),
    0,
  )

  return {
    round: feed.round,
    duration: Math.max(
      MIN_LIVE_TIMELINE_DURATION_SECONDS,
      round(lastEventTime + LIVE_TIMELINE_TRAILING_SECONDS),
    ),
    events: anchoredEvents,
    summary: `Live combat ${feed.sessionId} round ${feed.round}`,
  }
}

function withSnapshotSpawnAnchors(
  redPosition: Vector3,
  bluePosition: Vector3,
  events: ReplayEvent[],
): ReplayEvent[] {
  const rolesWithSpawn = new Set<TeamRole>()

  events.forEach((event) => {
    if (event.type === 'spawn') {
      rolesWithSpawn.add(event.bot)
    }
  })

  return [
    ...(!rolesWithSpawn.has('red') ? [spawnEvent('red', redPosition)] : []),
    ...(!rolesWithSpawn.has('blue') ? [spawnEvent('blue', bluePosition)] : []),
    ...events,
  ]
}

function spawnEvent(role: TeamRole, position: Vector3): ReplayEvent {
  return {
    t: 0,
    type: 'spawn',
    bot: role,
    position: [...position],
    rotation: role === 'red' ? [0, 90, 0] : [0, -90, 0],
  }
}

function positiveOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback
}

function nonNegativeOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
