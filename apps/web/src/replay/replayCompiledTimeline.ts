import type { ReplayEvent, ReplayTimeline } from '../../../../packages/replay/src/index.js'
import { sortReplayEvents } from '../../../../packages/replay/src/index.js'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import { getReplayEffectWindowSeconds } from './replayEffectMapping.js'
import type { IndexedReplayEvent } from './replayMappingTypes.js'

type EffectWindow = {
  end: number
  source: IndexedReplayEvent
  start: number
}

export type CompiledReplayTimeline = {
  duration: number
  events: ReplayEvent[]
  effectWindows: EffectWindow[]
  indexedEvents: IndexedReplayEvent[]
  knockoutEvents: IndexedReplayEvent[]
  roleEvents: Record<TeamRole, IndexedReplayEvent[]>
  round: number
  summary: string
  timeline: ReplayTimeline
}

const MAX_EFFECT_WINDOW_SECONDS = 1.9

export function compileReplayTimeline(timeline: ReplayTimeline): CompiledReplayTimeline {
  const events = sortReplayEvents(timeline.events)
  const indexedEvents = events.map((event, sequence) => ({ event, sequence }))
  const roleEvents: Record<TeamRole, IndexedReplayEvent[]> = {
    red: [],
    blue: [],
  }
  const effectWindows: EffectWindow[] = []
  const knockoutEvents: IndexedReplayEvent[] = []

  for (const source of indexedEvents) {
    const role = replayEventRole(source.event)

    if (role) {
      roleEvents[role].push(source)
    }

    const effectWindow = getReplayEffectWindowSeconds(source.event)

    if (effectWindow !== undefined) {
      effectWindows.push({
        end: source.event.t + effectWindow,
        source,
        start: source.event.t,
      })
    }

    if (source.event.type === 'knockout') {
      knockoutEvents.push(source)
    }
  }

  return {
    duration: timeline.duration,
    events,
    effectWindows,
    indexedEvents,
    knockoutEvents,
    roleEvents,
    round: timeline.round,
    summary: timeline.summary,
    timeline,
  }
}

export function isCompiledReplayTimeline(
  value: ReplayTimeline | CompiledReplayTimeline,
): value is CompiledReplayTimeline {
  return 'indexedEvents' in value
}

export function activeEffectEventsAt(
  timeline: CompiledReplayTimeline,
  time: number,
): IndexedReplayEvent[] {
  const recentWindowStart = time - MAX_EFFECT_WINDOW_SECONDS
  const activeWindowEvents: IndexedReplayEvent[] = []
  const activeWindowEnd = firstEffectWindowAfter(timeline.effectWindows, time)

  for (let index = activeWindowEnd - 1; index >= 0; index -= 1) {
    const window = timeline.effectWindows[index]

    if (window.start < recentWindowStart) {
      break
    }

    if (window.end >= time) {
      activeWindowEvents.push(window.source)
    }
  }

  activeWindowEvents.reverse()

  return mergeIndexedEvents(
    activeWindowEvents,
    eventsAtOrBefore(timeline.knockoutEvents, time),
  )
}

export function replayEventsAtOrBefore(
  events: IndexedReplayEvent[],
  time: number,
): IndexedReplayEvent[] {
  return events.slice(0, firstEventAfter(events, time))
}

function eventsAtOrBefore(events: IndexedReplayEvent[], time: number): IndexedReplayEvent[] {
  return events.slice(0, firstEventAfter(events, time))
}

function firstEffectWindowAfter(windows: EffectWindow[], time: number): number {
  let low = 0
  let high = windows.length

  while (low < high) {
    const mid = Math.floor((low + high) / 2)

    if (windows[mid].start <= time) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return low
}

function firstEventAfter(events: IndexedReplayEvent[], time: number): number {
  let low = 0
  let high = events.length

  while (low < high) {
    const mid = Math.floor((low + high) / 2)

    if (events[mid].event.t <= time) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return low
}

function mergeIndexedEvents(
  left: IndexedReplayEvent[],
  right: IndexedReplayEvent[],
): IndexedReplayEvent[] {
  const merged: IndexedReplayEvent[] = []
  let leftIndex = 0
  let rightIndex = 0

  while (leftIndex < left.length || rightIndex < right.length) {
    const leftEvent = left[leftIndex]
    const rightEvent = right[rightIndex]

    if (!rightEvent || (leftEvent && leftEvent.sequence <= rightEvent.sequence)) {
      merged.push(leftEvent)
      leftIndex += 1
    } else {
      merged.push(rightEvent)
      rightIndex += 1
    }
  }

  return merged
}

function replayEventRole(event: ReplayEvent): TeamRole | undefined {
  if ('bot' in event) {
    return event.bot
  }

  return undefined
}
