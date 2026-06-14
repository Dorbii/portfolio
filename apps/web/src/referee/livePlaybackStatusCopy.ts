import type { LivePlaybackBufferSnapshot } from '../replay/arena/liveCombatTimeline'

export function formatLivePlaybackStatusLabel(status: LivePlaybackBufferSnapshot): string {
  if (status.status === 'playing' || status.status === 'catching_up' || status.status === 'replaying_late_events') {
    return 'Playing confirmed combat'
  }

  if (status.status === 'drained') {
    return 'Caught up; next decision pending'
  }

  if (status.status === 'buffering') {
    return 'Waiting on agents'
  }

  return 'Waiting on agents'
}

export function formatLivePlaybackStatus(status: LivePlaybackBufferSnapshot): string {
  if (status.status === 'drained') {
    return 'Caught up; next decision pending.'
  }

  if (status.status === 'buffering') {
    return 'Waiting on agents.'
  }

  if (status.status === 'catching_up') {
    return `Playing confirmed combat; ${formatPlaybackSeconds(status.bufferDepthSeconds)} buffered.`
  }

  if (status.status === 'replaying_late_events') {
    return `Playing confirmed combat; ${formatPlaybackSeconds(status.bufferDepthSeconds)} buffered.`
  }

  if (status.status === 'playing') {
    return `Playing confirmed combat; ${formatPlaybackSeconds(status.bufferDepthSeconds)} buffered.`
  }

  return 'Waiting on agents.'
}

export function formatPlaybackSeconds(value: number): string {
  return `${Math.max(0, Math.round(value * 10) / 10).toFixed(1)}s`
}
