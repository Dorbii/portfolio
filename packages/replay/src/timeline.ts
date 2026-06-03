import type { ReplayEvent } from './events.js'
import { sortReplayEvents } from './events.js'

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
  if (timeline.duration <= 0 || timeline.round < 1) {
    return false
  }

  return timeline.events.every((event, index, events) => {
    const previous = events[index - 1]

    return (
      event.t >= 0 &&
      event.t <= timeline.duration &&
      (!previous || previous.t <= event.t)
    )
  })
}
