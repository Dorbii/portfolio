import { useCallback, useEffect, useRef, useState } from 'react'
import type { LiveCombatFeed } from '../agent/agentSessionTypes.js'
import {
  LIVE_COMBAT_POLL_INTERVAL_MS,
  loadLiveCombatFeed,
  toUserMessage,
} from './refereeClient'

type UseRefereeLiveCombatFeedInput = {
  activeSessionId: string
  apiBase: string
  enabled: boolean
}

export function useRefereeLiveCombatFeed({
  activeSessionId,
  apiBase,
  enabled,
}: UseRefereeLiveCombatFeedInput): {
  liveCombatError: string
  liveCombatFeed: LiveCombatFeed | null
} {
  const [liveCombatFeed, setLiveCombatFeed] = useState<LiveCombatFeed | null>(null)
  const [liveCombatError, setLiveCombatError] = useState('')
  const nextSeqRef = useRef(0)
  const requestKey = enabled && activeSessionId ? `${apiBase}|${activeSessionId}` : ''

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
      setLiveCombatError('')
    } catch (error) {
      setLiveCombatError(toUserMessage(error))
    }
  }, [activeSessionId, apiBase, requestKey])

  useEffect(() => {
    nextSeqRef.current = 0
    setLiveCombatFeed(null)
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
  }
}
