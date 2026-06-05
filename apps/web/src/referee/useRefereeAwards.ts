import { useCallback, useMemo, useState } from 'react'
import type {
  PublicSessionState,
  RefereeAwardOption,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import {
  submitRefereeAwards,
  toUserMessage,
  writeStoredSession,
} from './refereeClient'
import {
  countSelectedAwards,
  countSelectedAwardsByTeam,
  createAwardSelectionPayload,
  formatAwardSubmitBlocker,
  getAwardSubmitBlocker,
  toggleAwardSelectionState,
  type AwardSelections,
} from './refereeAwardSelection'

type RefereeAwardsInput = {
  activeRefereeToken: string
  activeSessionId: string
  apiBase: string
  hasRefereeToken: boolean
  publicSession: PublicSessionState | null
  setError: (message: string) => void
  setMessage: (message: string) => void
  setPublicSession: (state: PublicSessionState) => void
  setStoredRefereeToken: (token: string) => void
}

export function useRefereeAwards({
  activeRefereeToken,
  activeSessionId,
  apiBase,
  hasRefereeToken,
  publicSession,
  setError,
  setMessage,
  setPublicSession,
  setStoredRefereeToken,
}: RefereeAwardsInput) {
  const [submitState, setSubmitState] = useState<'idle' | 'submitting'>('idle')
  const [selectedAwards, setSelectedAwards] = useState<AwardSelections>({})
  const selectedCount = useMemo(
    () => countSelectedAwards(selectedAwards),
    [selectedAwards],
  )
  const selectedForTeam = useMemo(
    () => countSelectedAwardsByTeam(selectedAwards),
    [selectedAwards],
  )
  const awardOptions = publicSession?.awardOptions ?? ([] as RefereeAwardOption[])
  const canSubmitAwards =
    publicSession?.phase === 'referee_awards' &&
    selectedCount > 0 &&
    hasRefereeToken &&
    submitState !== 'submitting'
  const awardSubmitBlocker = getAwardSubmitBlocker({
    phase: publicSession?.phase,
    selectedCount,
    hasRefereeToken,
    submitState,
  })
  const awardSubmitLabel =
    submitState === 'submitting'
      ? 'Submitting awards...'
      : awardSubmitBlocker === 'missing_token'
        ? 'Token required'
        : 'Submit awards'
  const awardSubmitHint = formatAwardSubmitBlocker(awardSubmitBlocker)

  const clearAwardSelection = useCallback(() => {
    setSelectedAwards({})
  }, [])

  const submitAwards = useCallback(async () => {
    if (!activeSessionId) {
      setError('Load a session before submitting awards.')
      return
    }

    if (!hasRefereeToken) {
      setError('Referee token is required to submit awards.')
      return
    }

    if (publicSession?.phase !== 'referee_awards') {
      setError(`Awards can be submitted only during referee_awards. Current phase: ${publicSession?.phase ?? 'unknown'}.`)
      return
    }

    const payload = createAwardSelectionPayload(selectedAwards)

    if (payload.length === 0) {
      setError('Select at least one award before submitting.')
      return
    }

    setSubmitState('submitting')
    setError('')
    setMessage('')

    try {
      const response = await submitRefereeAwards(
        apiBase,
        activeSessionId,
        activeRefereeToken,
        payload,
      )

      writeStoredSession(window.sessionStorage, apiBase, activeSessionId, {
        refereeToken: activeRefereeToken,
        expiresAt: response.publicState.expiresAt,
      })
      setPublicSession(response.publicState)
      setStoredRefereeToken(activeRefereeToken)
      clearAwardSelection()
      setMessage('Referee awards submitted.')
    } catch (awardError) {
      setError(toUserMessage(awardError))
    } finally {
      setSubmitState('idle')
    }
  }, [
    activeRefereeToken,
    activeSessionId,
    apiBase,
    clearAwardSelection,
    hasRefereeToken,
    publicSession?.phase,
    selectedAwards,
    setError,
    setMessage,
    setPublicSession,
    setStoredRefereeToken,
  ])

  const toggleAwardSelection = useCallback(
    (awardId: string, team: TeamRole) => {
      setSelectedAwards((previous) => toggleAwardSelectionState(previous, awardId, team))
    },
    [],
  )

  return {
    awardOptions,
    awardSubmitHint,
    awardSubmitLabel,
    canSubmitAwards,
    clearAwardSelection,
    selectedAwards,
    selectedCount,
    selectedForTeam,
    submitAwards,
    submitState,
    toggleAwardSelection,
  }
}
