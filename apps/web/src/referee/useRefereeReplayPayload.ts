import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadReplayPayload,
  replayPayloadRequestKey,
  toUserMessage,
  type ReplayPayload,
} from './refereeClient'

type SessionLoadState = 'idle' | 'busy'

export function useRefereeReplayPayload({
  activeSessionId,
  apiBase,
  replayAvailable,
  replayStatus,
  replayVersion,
  round,
}: {
  activeSessionId: string
  apiBase: string
  replayAvailable: boolean | undefined
  replayStatus?: 'none' | 'live_partial' | 'resolved'
  replayVersion: string | undefined
  round: number | undefined
}) {
  const [replayLoadState, setReplayLoadState] = useState<SessionLoadState>('idle')
  const [replayError, setReplayError] = useState('')
  const [replayPayload, setReplayPayload] = useState<ReplayPayload | null>(null)
  const previousReplayRequestKeyRef = useRef('')

  const clearReplayState = useCallback(() => {
    setReplayPayload(null)
    setReplayError('')
    setReplayLoadState('idle')
  }, [])

  const replayRequestKey = replayPayloadRequestKey({
    activeSessionId,
    replayAvailable,
    replayStatus,
    replayVersion,
    round,
  })

  useEffect(() => {
    if (!replayRequestKey) {
      clearReplayState()
      previousReplayRequestKeyRef.current = ''
      return
    }

    if (previousReplayRequestKeyRef.current !== replayRequestKey) {
      clearReplayState()
      previousReplayRequestKeyRef.current = replayRequestKey
    }

    let canceled = false

    setReplayLoadState('busy')
    setReplayError('')

    void loadReplayPayload(apiBase, activeSessionId)
      .then((payload) => {
        if (canceled) {
          return
        }

        setReplayPayload(payload)
        setReplayLoadState('idle')
      })
      .catch((loadError) => {
        if (canceled) {
          return
        }

        setReplayPayload(null)
        setReplayLoadState('idle')
        setReplayError(toUserMessage(loadError))
      })

    return () => {
      canceled = true
    }
  }, [activeSessionId, apiBase, clearReplayState, replayRequestKey])

  return {
    clearReplayState,
    replayError,
    replayLoadState,
    replayPayload,
  }
}
