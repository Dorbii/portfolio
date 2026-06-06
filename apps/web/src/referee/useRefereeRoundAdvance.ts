import { useCallback, useMemo, useState } from 'react'
import type { PublicSessionState } from '../../../../packages/schemas/src/index.js'
import {
  advanceRound,
  toUserMessage,
  writeStoredSession,
} from './refereeClient'

type RoundAdvanceInput = {
  activeRefereeToken: string
  activeSessionId: string
  apiBase: string
  hasRefereeToken: boolean
  publicSession: PublicSessionState | null
  setError: (message: string) => void
  setPublicSession: (state: PublicSessionState) => void
  setStoredRefereeToken: (token: string) => void
}

type RoundAdvanceBlocker =
  | 'wrong_phase'
  | 'missing_token'
  | 'submitting'
  | undefined

function formatRoundAdvanceBlocker(blocker: RoundAdvanceBlocker): string | undefined {
  if (blocker === 'wrong_phase') {
    return 'Next Round is available only during Round Review.'
  }

  if (blocker === 'missing_token') {
    return 'Paste and save the referee capability token before advancing the round.'
  }

  if (blocker === 'submitting') {
    return 'Round advance is already in progress.'
  }

  return undefined
}

export function useRefereeRoundAdvance({
  activeRefereeToken,
  activeSessionId,
  apiBase,
  hasRefereeToken,
  publicSession,
  setError,
  setPublicSession,
  setStoredRefereeToken,
}: RoundAdvanceInput) {
  const [advanceState, setAdvanceState] = useState<'idle' | 'submitting'>('idle')
  const advanceBlocker = useMemo<RoundAdvanceBlocker>(() => {
    if (publicSession?.phase !== 'round_review') {
      return 'wrong_phase'
    }

    if (!hasRefereeToken) {
      return 'missing_token'
    }

    if (advanceState === 'submitting') {
      return 'submitting'
    }

    return undefined
  }, [advanceState, hasRefereeToken, publicSession?.phase])
  const canAdvanceRound = advanceBlocker === undefined
  const advanceRoundHint = formatRoundAdvanceBlocker(advanceBlocker)
  const advanceRoundLabel =
    advanceState === 'submitting'
      ? 'Advancing...'
      : advanceBlocker === 'missing_token'
        ? 'Token required'
        : 'Next Round'

  const submitRoundAdvance = useCallback(async () => {
    if (!activeSessionId) {
      setError('Load a session before advancing the round.')
      return
    }

    if (!hasRefereeToken) {
      setError('Referee token is required to advance the round.')
      return
    }

    if (publicSession?.phase !== 'round_review') {
      setError(`Round can be advanced only during round_review. Current phase: ${publicSession?.phase ?? 'unknown'}.`)
      return
    }

    setAdvanceState('submitting')
    setError('')

    try {
      const response = await advanceRound(
        apiBase,
        activeSessionId,
        activeRefereeToken,
      )

      writeStoredSession(window.sessionStorage, apiBase, activeSessionId, {
        refereeToken: activeRefereeToken,
        expiresAt: response.publicState.expiresAt,
      })
      setPublicSession(response.publicState)
      setStoredRefereeToken(activeRefereeToken)
    } catch (advanceError) {
      setError(toUserMessage(advanceError))
    } finally {
      setAdvanceState('idle')
    }
  }, [
    activeRefereeToken,
    activeSessionId,
    apiBase,
    hasRefereeToken,
    publicSession?.phase,
    setError,
    setPublicSession,
    setStoredRefereeToken,
  ])

  return {
    advanceRoundHint,
    advanceRoundLabel,
    advanceState,
    canAdvanceRound,
    submitRoundAdvance,
  }
}
