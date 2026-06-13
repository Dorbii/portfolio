import type { LivePlaybackBufferSnapshot } from '../replay/arena/liveCombatTimeline'

export function formatLivePlaybackStatus(status: LivePlaybackBufferSnapshot): string {
  if (status.status === 'drained') {
    return 'Live buffer drained; waiting for committed combat events.'
  }

  if (status.status === 'buffering') {
    return 'Live buffer warming.'
  }

  if (status.status === 'catching_up') {
    return `Live buffer catching up; ${formatPlaybackSeconds(status.bufferDepthSeconds)} buffered.`
  }

  if (status.status === 'replaying_late_events') {
    return `Live buffer replaying late events; ${formatPlaybackSeconds(status.bufferDepthSeconds)} buffered.`
  }

  if (status.status === 'playing') {
    return `Live buffer playing; ${formatPlaybackSeconds(status.bufferDepthSeconds)} buffered.`
  }

  return 'Live observer state.'
}

export function formatPlaybackSeconds(value: number): string {
  return `${Math.max(0, Math.round(value * 10) / 10).toFixed(1)}s`
}
