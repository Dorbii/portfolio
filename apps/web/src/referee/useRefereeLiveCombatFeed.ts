import { useCallback, useEffect, useRef, useState } from 'react'
import type { LiveCombatFeed } from '../agent/agentSessionTypes.js'
import {
  createLiveCombatTimelineBuffer,
  resetLiveCombatTimelineBuffer,
  updateLiveCombatTimelineBuffer,
  type LiveCombatTimeline,
} from '../replay/arena/liveCombatTimeline'
import {
  LIVE_COMBAT_POLL_INTERVAL_MS,
  loadLiveCombatFeed,
  toUserMessage,
} from './refereeClient'

type UseRefereeLiveCombatFeedInput = {
  activeSessionId: string
  apiBase: string
  enabled: boolean
  round?: number
}

export function useRefereeLiveCombatFeed({
  activeSessionId,
  apiBase,
  enabled,
  round,
}: UseRefereeLiveCombatFeedInput): {
  liveCombatError: string
  liveCombatFeed: LiveCombatFeed | null
  liveCombatTimeline: LiveCombatTimeline | null
} {
  const [liveCombatFeed, setLiveCombatFeed] = useState<LiveCombatFeed | null>(null)
  const [liveCombatError, setLiveCombatError] = useState('')
  const [liveCombatTimeline, setLiveCombatTimeline] = useState<LiveCombatTimeline | null>(null)
  const nextSeqRef = useRef(0)
  const timelineBufferRef = useRef(createLiveCombatTimelineBuffer())
  const requestKey = enabled && activeSessionId ? `${apiBase}|${activeSessionId}|${round ?? 'round-open'}` : ''

  const loadFeed = useCallback(async () => {
    if (!requestKey) {
      return
    }

    try {
      const feed = await loadLiveCombatFeed(apiBase, activeSessionId, nextSeqRef.current)

      if (feed.sessionId !== activeSessionId) {
        return
      }

      nextSeqRef.current = feed.combat?.nextSeq ?? 0
      setLiveCombatFeed(feed)
      setLiveCombatTimeline(updateLiveCombatTimelineBuffer(timelineBufferRef.current, feed))
      setLiveCombatError('')
    } catch (error) {
      setLiveCombatError(toUserMessage(error))
    }
  }, [activeSessionId, apiBase, requestKey])

  useEffect(() => {
    nextSeqRef.current = 0
    resetLiveCombatTimelineBuffer(timelineBufferRef.current)
    setLiveCombatFeed(null)
    setLiveCombatTimeline(null)
    setLiveCombatError('')
  }, [requestKey])

  useEffect(() => {
    if (!requestKey) {
      return undefined
    }

    void loadFeed()

    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return
      }

      void loadFeed()
    }, LIVE_COMBAT_POLL_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [loadFeed, requestKey])

  return {
    liveCombatError,
    liveCombatFeed: requestKey ? liveCombatFeed : null,
    liveCombatTimeline: requestKey ? liveCombatTimeline : null,
  }
}
