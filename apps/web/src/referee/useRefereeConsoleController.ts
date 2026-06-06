import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PublicSessionState,
  RoleInvite,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import {
  clearStoredSession,
  createSession,
  POLL_INTERVAL_MS,
  isTerminalPhase,
  isValidSessionId,
  loadPublicSession,
  normalizeSessionId,
  parseApiBaseFromLocation,
  parseSessionIdFromLocation,
  readStoredSession,
  setSessionIdInUrl,
  toUserMessage,
  writeStoredSession,
} from './refereeClient'
import { capitalize } from '../shared/format'
import {
  createRefereeAgentBriefs,
  hasInviteForRole as inviteListHasRole,
} from './refereeAgentBriefs'
import { useRefereeRoundAdvance } from './useRefereeRoundAdvance'
import { useRefereeReplayPayload } from './useRefereeReplayPayload'

type SessionLoadState = 'idle' | 'busy'

export function useRefereeConsoleController() {
  const [activeSessionId, setActiveSessionId] = useState(() => parseSessionIdFromLocation())
  const [publicSession, setPublicSession] = useState<PublicSessionState | null>(null)
  const [invites, setInvites] = useState<RoleInvite[]>([])
  const [storedRefereeToken, setStoredRefereeToken] = useState('')
  const [loadState, setLoadState] = useState<SessionLoadState>('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const sessionIdRef = useRef(activeSessionId)
  const skipNextActiveLoadRef = useRef(false)
  const apiBase = useMemo(() => parseApiBaseFromLocation(), [])
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

  const activeRefereeToken = storedRefereeToken
  const hasRefereeToken = activeRefereeToken.length > 0
  const {
    advanceRoundHint,
    advanceRoundLabel,
    canAdvanceRound,
    submitRoundAdvance,
  } = useRefereeRoundAdvance({
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
    setMessage('')
    setError('')
  }, [clearReplayState])

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
        setInvites(stored.invites)
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
      setSessionIdInUrl(response.sessionId)
      setPublicSession(response.publicState)
      setInvites(response.invites)
      setStoredRefereeToken(response.refereeToken)
      clearReplayState()
      setMessage('Session created. Keep this tab open to retain the referee capability token.')
      writeStoredSession(window.sessionStorage, apiBase, response.sessionId, {
        refereeToken: response.refereeToken,
        invites: response.invites,
        expiresAt: response.publicState.expiresAt,
      })
    } catch (createError) {
      setError(toUserMessage(createError))
    } finally {
      setLoadState('idle')
    }
  }, [apiBase, clearReplayState])

  const copyAgentBrief = useCallback((role: TeamRole, brief: string) => {
    return navigator.clipboard
      .writeText(brief)
      .then(() => {
        setMessage(`${capitalize(role)} handoff copied.`)
      })
      .catch(() => {
        setError('Clipboard copy blocked. Select and copy manually.')
      })
  }, [])

  const hasInviteForRole = useCallback(
    (role: TeamRole) => {
      return inviteListHasRole(invites, role)
    },
    [invites],
  )

  const {
    blueAgentBrief,
    blueCockpitUrl,
    blueInviteUrl,
    hasAnyInvite,
    redAgentBrief,
    redCockpitUrl,
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
  const sessionChat = publicSession?.chatLog ?? ([] as PublicSessionState['chatLog'])

  const refreshStoredSession = useCallback(() => {
    if (!activeSessionId) {
      return
    }

    try {
      clearStoredSession(window.localStorage, apiBase, activeSessionId)
    } catch {
      // Session storage is the active store; localStorage cleanup is best-effort.
    }
    clearStoredSession(window.sessionStorage, apiBase, activeSessionId)
    setStoredRefereeToken('')
    setInvites([])
    setError('')
    setMessage('Stored session token cleared. Public session refreshed.')
    void loadPublicState(activeSessionId, { silent: true })
  }, [activeSessionId, apiBase, loadPublicState])

  return {
    activeSessionId,
    advanceRoundHint,
    advanceRoundLabel,
    apiBase,
    blueAgentBrief,
    blueCockpitUrl,
    blueInviteUrl,
    canAdvanceRound,
    copyAgentBrief,
    createNewSession,
    error,
    hasAnyInvite,
    hasInviteForRole,
    hasRefereeToken,
    loadState,
    message,
    phase,
    publicSession,
    redAgentBrief,
    redCockpitUrl,
    redInviteUrl,
    refreshStoredSession,
    replayError,
    replayLoadState,
    replayPayload,
    sessionChat,
    storedRefereeToken,
    submitRoundAdvance,
  }
}
