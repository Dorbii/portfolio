import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PublicSessionState,
  RoleInvite,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import {
  clearStoredSession,
  createSession,
  DEFAULT_ARENA_API_BASE,
  POLL_INTERVAL_MS,
  isTerminalPhase,
  isValidSessionId,
  loadPublicSession,
  normalizeSessionId,
  parseSessionIdFromLocation,
  resetRoleClaim,
  readStoredSession,
  setSessionIdInUrl,
  toUserMessage,
  writeStoredSession,
} from './refereeClient'
import { capitalize } from '../shared/format'
import {
  createRefereeAgentBriefs,
  hasInviteForRole as inviteListHasRole,
  replaceInvite,
} from './refereeAgentBriefs'
import {
  MAX_AWARDS_PER_ROUND,
  MAX_AWARDS_PER_TEAM,
} from './refereeAwardSelection'
import { useRefereeAwards } from './useRefereeAwards'
import { useRefereeReplayPayload } from './useRefereeReplayPayload'

type SessionLoadState = 'idle' | 'busy'

export { MAX_AWARDS_PER_ROUND, MAX_AWARDS_PER_TEAM }

export function useRefereeConsoleController() {
  const [sessionInput, setSessionInput] = useState(() => parseSessionIdFromLocation())
  const [activeSessionId, setActiveSessionId] = useState(() => parseSessionIdFromLocation())
  const [publicSession, setPublicSession] = useState<PublicSessionState | null>(null)
  const [invites, setInvites] = useState<RoleInvite[]>([])
  const [storedRefereeToken, setStoredRefereeToken] = useState('')
  const [manualRefereeToken, setManualRefereeToken] = useState('')
  const [loadState, setLoadState] = useState<SessionLoadState>('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const sessionIdRef = useRef(activeSessionId)
  const skipNextActiveLoadRef = useRef(false)
  const apiBase = DEFAULT_ARENA_API_BASE
  const {
    clearReplayState,
    replayError,
    replayLoadState,
    replayPayload,
  } = useRefereeReplayPayload({
    activeSessionId,
    apiBase,
    replayAvailable: publicSession?.replayAvailable,
    round: publicSession?.round,
  })

  const activeRefereeToken = manualRefereeToken.trim() || storedRefereeToken
  const hasRefereeToken = activeRefereeToken.length > 0
  const isActiveSession = activeSessionId.length > 0
  const canRefreshRoleClaim =
    isActiveSession &&
    hasRefereeToken &&
    loadState !== 'busy' &&
    (publicSession?.phase === 'waiting_for_agents' || publicSession?.phase === 'submission_phase')
  const {
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
  } = useRefereeAwards({
    activeRefereeToken,
    activeSessionId,
    apiBase,
    hasRefereeToken,
    publicSession,
    setError,
    setMessage,
    setPublicSession,
    setStoredRefereeToken,
  })

  const clearSessionState = useCallback(() => {
    setPublicSession(null)
    setInvites([])
    setStoredRefereeToken('')
    clearReplayState()
    clearAwardSelection()
    setMessage('')
    setError('')
  }, [clearAwardSelection, clearReplayState])

  const hydrateStoredSession = useCallback(
    (sessionId: string) => {
      const normalizedSessionId = normalizeSessionId(sessionId)

      if (!normalizedSessionId) {
        return
      }

      try {
        clearStoredSession(window.localStorage, apiBase, normalizedSessionId)
      } catch {
        // Browser privacy settings can disable localStorage; sessionStorage is the active store.
      }

      const stored = readStoredSession(window.sessionStorage, apiBase, normalizedSessionId)

      if (stored) {
        setStoredRefereeToken(stored.refereeToken)
        return
      }

      setStoredRefereeToken('')
      setInvites([])
    },
    [apiBase],
  )

  const loadPublicState = useCallback(
    async (sessionId: string, options: { silent?: boolean } = {}) => {
      const normalizedSessionId = normalizeSessionId(sessionId)

      if (!isValidSessionId(normalizedSessionId)) {
        setError('Invalid session id. It should look like s_xxxx.')
        setLoadState('idle')
        return
      }

      if (!options.silent) {
        setLoadState('busy')
      }
      setError('')

      try {
        const state = await loadPublicSession(apiBase, normalizedSessionId)

        setPublicSession(state)
        if (!options.silent) {
          setMessage('Public session state loaded.')
        }
      } catch (loadError) {
        setPublicSession(null)
        setError(toUserMessage(loadError))
      } finally {
        if (!options.silent) {
          setLoadState('idle')
        }
      }
    },
    [apiBase],
  )

  const setActiveSession = useCallback(
    (sessionId: string) => {
      const normalizedSessionId = normalizeSessionId(sessionId)

      if (!normalizedSessionId) {
        clearSessionState()
        setActiveSessionId('')
        setSessionInput('')
        return
      }

      if (!isValidSessionId(normalizedSessionId)) {
        setError('Invalid session id. It should look like s_xxxx.')
        return
      }

      setError('')
      setMessage('')
      setSessionInput(normalizedSessionId)
      setSessionIdInUrl(normalizedSessionId)
      setManualRefereeToken('')
      clearAwardSelection()

      if (normalizedSessionId === activeSessionId) {
        hydrateStoredSession(normalizedSessionId)
        void loadPublicState(normalizedSessionId)
        return
      }

      setActiveSessionId(normalizedSessionId)
    },
    [
      activeSessionId,
      clearAwardSelection,
      clearSessionState,
      hydrateStoredSession,
      loadPublicState,
    ],
  )

  useEffect(() => {
    sessionIdRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    if (!activeSessionId) {
      clearSessionState()
      return
    }

    hydrateStoredSession(activeSessionId)
    if (skipNextActiveLoadRef.current) {
      skipNextActiveLoadRef.current = false
      return
    }

    void loadPublicState(activeSessionId)
  }, [activeSessionId, clearSessionState, hydrateStoredSession, loadPublicState])

  useEffect(() => {
    if (!activeSessionId || isTerminalPhase(publicSession?.phase)) {
      return
    }

    const id = window.setInterval(() => {
      if (sessionIdRef.current === activeSessionId) {
        if (document.visibilityState === 'hidden') {
          return
        }

        void loadPublicState(activeSessionId, { silent: true })
      }
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(id)
    }
  }, [activeSessionId, publicSession?.phase, loadPublicState])

  const createNewSession = useCallback(async () => {
    setLoadState('busy')
    setError('')
    setMessage('')

    try {
      const response = await createSession(apiBase)

      skipNextActiveLoadRef.current = true
      setActiveSessionId(response.sessionId)
      setSessionInput(response.sessionId)
      setSessionIdInUrl(response.sessionId)
      setPublicSession(response.publicState)
      setInvites(response.invites)
      setStoredRefereeToken(response.refereeToken)
      setManualRefereeToken('')
      clearReplayState()
      clearAwardSelection()
      setMessage('Session created. Keep this tab open to retain the referee capability token.')
      writeStoredSession(window.sessionStorage, apiBase, response.sessionId, {
        refereeToken: response.refereeToken,
        expiresAt: response.publicState.expiresAt,
      })
    } catch (createError) {
      setError(toUserMessage(createError))
    } finally {
      setLoadState('idle')
    }
  }, [apiBase, clearAwardSelection, clearReplayState])

  const copyAgentBrief = useCallback((role: TeamRole, brief: string) => {
    return navigator.clipboard
      .writeText(brief)
      .then(() => {
        setMessage(`${capitalize(role)} wake brief copied.`)
      })
      .catch(() => {
        setError('Clipboard copy blocked. Select and copy manually.')
      })
  }, [])

  const refreshRoleClaim = useCallback(
    async (role: TeamRole) => {
      if (!activeSessionId) {
        setError('Load a session before refreshing a role claim.')
        return
      }

      if (!hasRefereeToken) {
        setError('Referee token is required to refresh role claims.')
        return
      }

      if (publicSession?.phase !== 'waiting_for_agents' && publicSession?.phase !== 'submission_phase') {
        setError(
          `Role claims can be refreshed only before combat resolves. Current phase: ${publicSession?.phase ?? 'unknown'}.`,
        )
        return
      }

      setLoadState('busy')
      setError('')
      setMessage('')

      try {
        const response = await resetRoleClaim(
          apiBase,
          activeSessionId,
          activeRefereeToken,
          role,
        )
        const nextInvites = replaceInvite(invites, response.invite)

        setInvites(nextInvites)
        setPublicSession(response.publicState)
        setStoredRefereeToken(activeRefereeToken)
        writeStoredSession(window.sessionStorage, apiBase, activeSessionId, {
          refereeToken: activeRefereeToken,
          expiresAt: response.publicState.expiresAt,
        })
        clearAwardSelection()
        clearReplayState()
        setMessage(`${capitalize(role)} role reset. Share the refreshed invite.`)
      } catch (resetError) {
        setError(toUserMessage(resetError))
      } finally {
        setLoadState('idle')
      }
    },
    [
      activeRefereeToken,
      activeSessionId,
      apiBase,
      clearAwardSelection,
      hasRefereeToken,
      invites,
      clearReplayState,
      publicSession?.phase,
    ],
  )

  const hasInviteForRole = useCallback(
    (role: TeamRole) => {
      return inviteListHasRole(invites, role)
    },
    [invites],
  )

  const {
    blueAgentBrief,
    blueInviteUrl,
    hasAnyInvite,
    redAgentBrief,
    redInviteUrl,
  } = useMemo(
    () =>
      createRefereeAgentBriefs({
        activeSessionId,
        apiBase,
        invites,
        publicSession,
      }),
    [activeSessionId, apiBase, invites, publicSession],
  )

  const phase = publicSession?.phase ?? 'not_started'
  const sessionEvents = publicSession?.eventLog ?? ([] as PublicSessionState['eventLog'])
  const sessionChat = publicSession?.chatLog ?? ([] as PublicSessionState['chatLog'])

  const saveManualRefereeToken = useCallback(() => {
    if (!activeSessionId) {
      setError('Load a session before saving token.')
      return
    }

    if (!manualRefereeToken.trim()) {
      setError('Referee token cannot be blank.')
      return
    }

    if (!publicSession) {
      setError('Load public session state before saving token.')
      return
    }

    setStoredRefereeToken(manualRefereeToken.trim())
    writeStoredSession(window.sessionStorage, apiBase, activeSessionId, {
      refereeToken: manualRefereeToken.trim(),
      expiresAt: publicSession.expiresAt,
    })
    setError('')
    setMessage('Token saved for this session in this tab.')
  }, [activeSessionId, apiBase, manualRefereeToken, publicSession])

  const clearStoredRefereeToken = useCallback(() => {
    if (!activeSessionId) {
      setError('Load a session before clearing token.')
      return
    }

    clearStoredSession(window.sessionStorage, apiBase, activeSessionId)
    setStoredRefereeToken('')
    setInvites([])
    setMessage('Stored referee token cleared for this tab.')
  }, [activeSessionId, apiBase])
  return {
    activeSessionId,
    apiBase,
    awardOptions,
    awardSubmitHint,
    awardSubmitLabel,
    blueAgentBrief,
    blueInviteUrl,
    canRefreshRoleClaim,
    canSubmitAwards,
    clearStoredRefereeToken,
    copyAgentBrief,
    createNewSession,
    error,
    hasAnyInvite,
    hasInviteForRole,
    hasRefereeToken,
    isActiveSession,
    loadState,
    manualRefereeToken,
    message,
    phase,
    publicSession,
    redAgentBrief,
    redInviteUrl,
    refreshRoleClaim,
    replayError,
    replayLoadState,
    replayPayload,
    saveManualRefereeToken,
    selectedAwards,
    selectedCount,
    selectedForTeam,
    sessionChat,
    sessionEvents,
    sessionInput,
    setActiveSession,
    setManualRefereeToken,
    setSessionInput,
    storedRefereeToken,
    submitAwards,
    submitState,
    toggleAwardSelection,
  }
}
