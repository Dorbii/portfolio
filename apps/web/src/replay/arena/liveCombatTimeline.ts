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

export type LiveCombatTimeline = {
  key: string
  lastSeq: number
  timeline: CompiledReplayTimeline
}

export type LiveCombatTimelineBuffer = {
  eventsBySeq: Map<number, ReplayEvent>
  key: string
  lastSeq: number
  timeline: LiveCombatTimeline | null
}

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

  const events = orderedBufferedEvents(buffer.eventsBySeq)

  if (events.length === 0) {
    buffer.timeline = null
    return null
  }

  if (!changed && buffer.timeline) {
    return buffer.timeline
  }

  buffer.timeline = {
    key,
    lastSeq: buffer.lastSeq,
    timeline: compileReplayTimeline(createTimeline(feed, events)),
  }

  return buffer.timeline
}

function orderedBufferedEvents(eventsBySeq: Map<number, ReplayEvent>): ReplayEvent[] {
  return [...eventsBySeq.entries()]
    .sort(([leftSeq], [rightSeq]) => leftSeq - rightSeq)
    .map(([, event]) => event)
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

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
