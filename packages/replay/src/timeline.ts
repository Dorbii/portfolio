import type { ReplayEvent } from './events.js'
import { compareReplayEvents, sortReplayEvents } from './events.js'

const MAX_REPLAY_DURATION_SECONDS = 601

export type ReplayTimeline = {
  round: number
  duration: number
  events: ReplayEvent[]
  summary: string
}

export function createReplayTimeline(input: ReplayTimeline): ReplayTimeline {
  return {
    ...input,
    events: sortReplayEvents(input.events),
  }
}

export function validateReplayTimeline(timeline: ReplayTimeline): boolean {
  if (
    !Number.isFinite(timeline.duration) ||
    !Number.isInteger(timeline.round) ||
    timeline.duration <= 0 ||
    timeline.duration > MAX_REPLAY_DURATION_SECONDS ||
    timeline.round < 1
  ) {
    return false
  }

  return timeline.events.every((event, index, events) => {
    const previous = events[index - 1]

    return (
      event.t >= 0 &&
      event.t <= timeline.duration &&
      Number.isFinite(event.t) &&
      (!previous || compareReplayEvents(previous, event) <= 0)
    )
  })
}
