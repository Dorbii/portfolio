import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  RoleInvite,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import type { PublicSessionState } from '../agent/agentSessionTypes.js'
import {
  clearStoredSession,
  createSession,
  refereePollIntervalMs,
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
import {
  createRefereeAgentLinks,
  hasInviteForRole as inviteListHasRole,
} from './refereeAgentLinks'
import { useRefereeRoundAdvance } from './useRefereeRoundAdvance'
import { useRefereeReplayPayload } from './useRefereeReplayPayload'
import { useRefereeRoleStates } from './useRefereeRoleStates'

type SessionLoadState = 'idle' | 'busy'

export function useRefereeConsoleController() {
  const [activeSessionId, setActiveSessionId] = useState(() => parseSessionIdFromLocation())
  const [publicSession, setPublicSession] = useState<PublicSessionState | null>(null)
  const [invites, setInvites] = useState<RoleInvite[]>([])
  const [storedRefereeToken, setStoredRefereeToken] = useState('')
  const [loadState, setLoadState] = useState<SessionLoadState>('idle')
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
    replayVersion: publicSession?.replayVersion,
    round: publicSession?.round,
  })
  const {
    roleLoadState,
    roleStateError,
    roleStates,
  } = useRefereeRoleStates({
    activeSessionId,
    apiBase,
    invites,
    stateVersion: publicSession?.stateVersion,
  })

  const activeRefereeToken = storedRefereeToken
  const hasRefereeToken = activeRefereeToken.length > 0
  const completedFightCount = publicSession?.continuation.completedFightCount ?? 0
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
    setPublicSession,
    setStoredRefereeToken,
  })

  const clearSessionState = useCallback(() => {
    setPublicSession(null)
    setInvites([])
    setStoredRefereeToken('')
    clearReplayState()
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

  const pollIntervalMs = refereePollIntervalMs(publicSession)

  useEffect(() => {
    if (!activeSessionId || pollIntervalMs === undefined) {
      return
    }

    const id = window.setInterval(() => {
      if (sessionIdRef.current === activeSessionId) {
        if (document.visibilityState === 'hidden') {
          return
        }

        void loadPublicState(activeSessionId, { silent: true })
      }
    }, pollIntervalMs)

    return () => {
      window.clearInterval(id)
    }
  }, [activeSessionId, pollIntervalMs, loadPublicState])

  const createNewSession = useCallback(async () => {
    setLoadState('busy')
    setError('')

    try {
      const response = await createSession(apiBase)

      skipNextActiveLoadRef.current = true
      setActiveSessionId(response.sessionId)
      setSessionIdInUrl(response.sessionId)
      setPublicSession(response.publicState)
      setInvites(response.invites)
      setStoredRefereeToken(response.refereeToken)
      clearReplayState()
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

  const copyInviteUrl = useCallback((inviteUrl: string) => {
    return navigator.clipboard
      .writeText(inviteUrl)
      .catch(() => {
        setError('Clipboard copy blocked. Select and copy the invite URL manually.')
      })
  }, [])

  const hasInviteForRole = useCallback(
    (role: TeamRole) => {
      return inviteListHasRole(invites, role)
    },
    [invites],
  )

  const {
    blueCockpitUrl,
    blueInviteUrl,
    redCockpitUrl,
    redInviteUrl,
  } = useMemo(
    () =>
      createRefereeAgentLinks({
        activeSessionId,
        apiBase,
        invites,
        siteBase: window.location.origin,
      }),
    [activeSessionId, apiBase, invites],
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
    void loadPublicState(activeSessionId, { silent: true })
  }, [activeSessionId, apiBase, loadPublicState])

  return {
    activeSessionId,
    advanceRoundHint,
    advanceRoundLabel,
    blueCockpitUrl,
    blueInviteUrl,
    canAdvanceRound,
    copyInviteUrl,
    createNewSession,
    completionControls: {
      completedFightCount,
    },
    error,
    hasInviteForRole,
    loadState,
    phase,
    publicSession,
    redCockpitUrl,
    redInviteUrl,
    refreshStoredSession,
    replayError,
    replayLoadState,
    replayPayload,
    roleLoadState,
    roleStateError,
    roleStates,
    sessionChat,
    storedRefereeToken,
    submitRoundAdvance,
  }
}
